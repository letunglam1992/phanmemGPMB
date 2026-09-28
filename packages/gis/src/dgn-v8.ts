/**
 * Bộ đọc tệp MicroStation DGN V8 (V8, V8i, CONNECT lưu dạng V8) — chỉ đọc hình học phục vụ nhận dạng thửa.
 *
 * Tệp V8 là tệp ghép OLE (cfb.ts). Mô hình mặc định nằm ở kho "Dgn-Md/#000000":
 *  - "Dgn~Mh": phần đầu mô hình (đơn vị, gốc toàn cục), nén zlib;
 *  - "Dgn^G/$n": các khối phần tử đồ họa; mỗi khối = 16 byte đầu (uint32 số phần tử) + dữ liệu nén zlib.
 * Mỗi phần tử: byte 0 kiểu (như V7), byte 3 bit 0x40 = thành phần của phần tử phức, uint32 @4 số từ 16 bit
 * theo sau (độ dài = 4 + 2 × số từ), uint32 @8 vị trí vùng thuộc tính (từ 16 bit), uint32 @12 mã lớp;
 * tọa độ là số thực IEEE theo đơn vị UOR, tương đối với gốc toàn cục.
 *
 * Cấu trúc được xác định từ tệp mẫu gCadas (V8i SELECTseries 3) người dùng cung cấp và đối chiếu kết quả
 * (tọa độ VN-2000, số phần tử khớp số khai báo từng khối). Kiểu phần tử chưa kiểm chứng (cung tròn, 3D) được
 * đọc là "KHAC" kèm cảnh báo — không đoán.
 */
import { unzlibSync } from "fflate";
import { docCfb } from "./cfb.js";
import type { Diem, KetQuaDocDgn, PhanTu, PhanTuChu, PhanTuHinh, PhanTuPhuc } from "./dgn.js";
import { LoiDgn } from "./dgn.js";

const MO_HINH = "Dgn-Md/#000000";
const SO_DOAN_ELIP = 36;

/** Giải nén một khối; thêm 4 byte 0 vì độ dài khai báo của phần tử cuối khối tính cả 4 byte kết thúc không được lưu. */
function giaiNen(b: Uint8Array): Uint8Array {
  try {
    const z = unzlibSync(b);
    const out = new Uint8Array(z.length + 4);
    out.set(z);
    return out;
  } catch {
    throw new LoiDgn("Không giải nén được dữ liệu phần tử DGN V8 (tệp hỏng hoặc định dạng khác).");
  }
}

/** Duyệt phần tử trong một khối đã giải nén (bắt đầu sau 4 byte đầu khối). */
function* phanTuTrong(z: Uint8Array, batDau: number): Generator<{ p: number; dai: number }> {
  const dv = new DataView(z.buffer, z.byteOffset, z.byteLength);
  let p = batDau;
  while (p + 8 <= z.length) {
    const dai = 4 + 2 * dv.getUint32(p + 4, true);
    if (dai < 8 || p + dai > z.length) return;
    yield { p, dai };
    p += dai;
  }
}

export function docDgnV8(u8: Uint8Array): KetQuaDocDgn {
  const tep = docCfb(u8);
  const canhBao: string[] = [];

  // Đơn vị, gốc toàn cục: phần tử kiểu 66 (đầu mô hình) trong "Dgn~Mh"
  const mh = tep.doc(`${MO_HINH}/Dgn~Mh`);
  if (!mh) throw new LoiDgn("Tệp DGN V8 không có mô hình mặc định (Dgn-Md/#000000).");
  const zmh = giaiNen(mh);
  const dvMh = new DataView(zmh.buffer, zmh.byteOffset, zmh.byteLength);
  let uor = 0, gocX = 0, gocY = 0, tyLe1 = 1, tyLe2 = 1;
  for (let p = 0; p + 128 <= zmh.length; p += 4) {
    // Phần tử đầu mô hình (kiểu 66); khai báo độ dài có thể dài hơn luồng vài byte nên chỉ cần đủ 128 byte đầu
    if (zmh[p] === 0x42 && zmh[p + 1] === 0 && dvMh.getUint32(p + 4, true) > 60) {
      tyLe1 = dvMh.getFloat64(p + 80, true);
      tyLe2 = dvMh.getFloat64(p + 88, true);
      uor = dvMh.getFloat64(p + 96, true);
      gocX = dvMh.getFloat64(p + 112, true);
      gocY = dvMh.getFloat64(p + 120, true);
      break;
    }
  }
  if (!(uor > 0) || !Number.isFinite(gocX) || !Number.isFinite(gocY)) {
    throw new LoiDgn("Không đọc được đơn vị đo (UOR) trong phần đầu mô hình DGN V8.");
  }
  if (tyLe1 !== 1 || tyLe2 !== 1)
    canhBao.push(`Đơn vị chính khác đơn vị lưu (tỷ lệ ${tyLe1}/${tyLe2}) — tọa độ tính theo đơn vị lưu; kiểm tra diện tích với số liệu trích đo.`);
  const heSo = 1 / uor;
  const doi = (x: number, y: number): Diem => ({ x: (x - gocX) * heSo, y: (y - gocY) * heSo });

  // Các khối phần tử đồ họa theo thứ tự số
  const khoi = tep.dsLuong
    .filter((s) => s.startsWith(`${MO_HINH}/Dgn^G/$`))
    .sort((a, b) => Number(a.split("$").pop()) - Number(b.split("$").pop()));
  if (!khoi.length) throw new LoiDgn("Tệp DGN V8 không có phần tử đồ họa trong mô hình mặc định.");

  const phanTu: PhanTu[] = [];
  const dem3d = { n: 0 };
  const chuaHoTro = new Map<number, number>();
  let stt = 0;
  let phuc: PhanTuPhuc | null = null;
  let conLai = 0;
  let nut: number | null = null;
  let lechKhai = 0;

  for (const s of khoi) {
    const b = tep.doc(s)!;
    if (b.length <= 16) continue;
    const khai = new DataView(b.buffer, b.byteOffset, 4).getUint32(0, true);
    const z = giaiNen(b.subarray(16));
    const dv = new DataView(z.buffer, z.byteOffset, z.byteLength);
    let soDoc = 0;
    for (const { p, dai } of phanTuTrong(z, 4)) {
      soDoc++;
      const kieu = z[p]! & 0x7f;
      const laThanhPhan = (z[p + 3]! & 0x40) !== 0;
      const lop = dai >= 16 ? dv.getUint32(p + 12, true) : 0;
      const cuoiHinh = Math.min(2 * dv.getUint32(p + 8, true), dai); // hết phần hình học, trước vùng thuộc tính
      const coSo = { stt: stt++, kieu, lop, mau: 0, netDay: 0, kieuNet: 0, laThanhPhan };
      const dinh = (q: number): Diem => doi(dv.getFloat64(p + q, true), dv.getFloat64(p + q + 8, true));
      let pt: PhanTu;

      if (kieu === 3 || kieu === 4 || kieu === 6) {
        const dau = kieu === 3 ? 104 : 112;
        const n = kieu === 3 ? 2 : dv.getUint32(p + 104, true);
        const buoc = n > 0 ? (cuoiHinh - dau) / n : 0;
        if (buoc === 16) {
          const diem: Diem[] = [];
          for (let i = 0; i < n; i++) diem.push(dinh(dau + i * 16));
          pt = { ...coSo, loai: kieu === 3 ? "DUONG" : kieu === 4 ? "DUONG_GAP" : "VUNG", diem } as PhanTuHinh;
        } else {
          if (buoc === 24) dem3d.n++;
          pt = { ...coSo, loai: "KHAC" };
        }
      } else if ((kieu === 12 || kieu === 14) && dai >= 108) {
        const soThanhPhan = dv.getUint32(p + 104, true);
        const ph: PhanTuPhuc = { ...coSo, loai: kieu === 12 ? "CHUOI_PHUC" : "VUNG_PHUC", soThanhPhan, thanhPhan: [], diem: [] };
        pt = ph;
        phuc = ph;
        conLai = soThanhPhan;
      } else if (kieu === 15 && cuoiHinh >= 144) {
        const a = dv.getFloat64(p + 104, true) * heSo;
        const bb = dv.getFloat64(p + 112, true) * heSo;
        const xoay = dv.getFloat64(p + 120, true); // radian
        const tam = dinh(128);
        const diem: Diem[] = [];
        for (let i = 0; i <= SO_DOAN_ELIP; i++) {
          const t = (2 * Math.PI * i) / SO_DOAN_ELIP;
          const ex = a * Math.cos(t), ey = bb * Math.sin(t);
          diem.push({ x: tam.x + ex * Math.cos(xoay) - ey * Math.sin(xoay), y: tam.y + ex * Math.sin(xoay) + ey * Math.cos(xoay) });
        }
        pt = { ...coSo, loai: "ELIP", diem };
      } else if (kieu === 17 && dai >= 176) {
        // Chữ 2D: gốc @152; dữ liệu chữ bắt đầu bằng dấu FF FE (FE 01 = chữ 8 bit, vd. TCVN3) hoặc FF FD (UTF-16);
        // uint16 @110 = số byte dữ liệu chữ tính từ dấu
        const soByte = dv.getUint16(p + 110, true);
        let tuDau = -1;
        for (let q = p + 164; q <= p + 176 && q + 1 < p + dai; q++)
          if (z[q] === 0xff && (z[q + 1] === 0xfe || z[q + 1] === 0xfd)) {
            tuDau = q;
            break;
          }
        if (tuDau < 0 || soByte < 4) {
          pt = { ...coSo, loai: "KHAC" }; // phần tử điều khiển (vd. "Pattern Control Element"), không phải nhãn
        } else {
          const tamBit = z[tuDau + 1] === 0xfe && z[tuDau + 2] === 1;
          const noiDung = z.subarray(tamBit ? tuDau + 4 : tuDau + 2, Math.min(tuDau + soByte, p + dai));
          const chu: PhanTuChu = { ...coSo, loai: "CHU", goc: dinh(152), byteChu: new Uint8Array(0), chieuCao: 0, gocXoay: 0, font: z[p + 105]! };
          if (tamBit) {
            const ket = noiDung.indexOf(0);
            chu.byteChu = noiDung.slice(0, ket >= 0 ? ket : noiDung.length);
          } else {
            let x = "";
            for (let k = 0; k + 1 < noiDung.length; k += 2) {
              const c = noiDung[k]! | (noiDung[k + 1]! << 8);
              if (!c) break;
              x += String.fromCharCode(c);
            }
            chu.chuUnicode = x;
          }
          pt = chu;
        }
      } else {
        if (kieu === 16) chuaHoTro.set(16, (chuaHoTro.get(16) ?? 0) + 1);
        pt = { ...coSo, loai: "KHAC" };
      }

      // Dòng chữ thuộc nút chữ (kiểu 7), vd. nút thuộc tính thửa của gCadas
      if (kieu === 7) nut = coSo.stt;
      else if (!laThanhPhan) nut = null;
      else if (pt.loai === "CHU" && nut !== null) pt.nut = nut;

      // Gộp thành phần vào chuỗi/vùng phức (giống bộ đọc V7)
      if (laThanhPhan && phuc && conLai > 0 && pt !== phuc) {
        conLai--;
        if (pt.loai === "DUONG" || pt.loai === "DUONG_GAP" || pt.loai === "VUNG" || pt.loai === "ELIP") {
          phuc.thanhPhan.push(pt);
          for (const q of pt.diem) {
            const cuoi = phuc.diem[phuc.diem.length - 1];
            if (!cuoi || cuoi.x !== q.x || cuoi.y !== q.y) phuc.diem.push(q);
          }
        }
        if (conLai === 0) phuc = null;
        continue;
      }
      if (!laThanhPhan && pt !== phuc) {
        phuc = null;
        conLai = 0;
      }
      phanTu.push(pt);
    }
    if (soDoc !== khai) lechKhai += Math.abs(khai - soDoc);
  }

  if (lechKhai) canhBao.push(`Số phần tử đọc được lệch ${lechKhai} so với số khai báo trong tệp — kiểm tra lại bản đồ.`);
  if (dem3d.n) canhBao.push(`${dem3d.n} phần tử 3D chưa được hỗ trợ (bản đồ địa chính thường là 2D) — đã bỏ qua.`);
  if (chuaHoTro.get(16)) canhBao.push(`${chuaHoTro.get(16)} cung tròn (kiểu 16) chưa được hỗ trợ ở DGN V8 — đã bỏ qua.`);
  canhBao.push("Tệp DGN V8 (MicroStation V8/V8i): đọc mô hình mặc định; ô dùng chung, tham chiếu ngoài (reference) không được đọc.");

  return {
    tcb: { soChieu: 2, suTrenMu: 1, uorTrenSu: uor, donViChinh: "m", donViPhu: "", gocX: gocX * heSo, gocY: gocY * heSo, heSo },
    phanTu,
    bangMau: null,
    canhBao,
  };
}
