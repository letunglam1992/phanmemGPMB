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
 * (tọa độ VN-2000, số phần tử khớp số khai báo từng khối). Kiểu phần tử chưa kiểm chứng (3D, ...) được đọc là "KHAC"
 * kèm cảnh báo — không đoán.
 *
 * Bổ sung 0.9.0 (kiểm chứng trên 3 tệp bản đồ V8i người dùng cung cấp, đọc tại chỗ, không lưu vào kho):
 *  - Cung tròn 2D (kiểu 16): @104 góc đầu, @112 góc quét (radian), @120/@128 bán trục chính/phụ, @136 góc xoay, @144 tâm.
 *  - Ô dùng chung (shared cell): định nghĩa (kiểu 34) nằm trong kho phi mô hình "Dgn^Nm", các thành phần theo sau (cờ 0x40);
 *    tên ô ở liên kết thuộc tính mã 0x56D2 (uint32 độ dài @+8, chữ @+12). Bản sao (kiểu 35) trong mô hình: ma trận xoay,
 *    tỷ lệ 3×3 theo hàng @160, gốc @232; tọa độ thế giới = gốc + ma trận × (tọa độ cục bộ − gốc định nghĩa).
 *    Phạm vi (range) lưu trong bản sao trùng khít phạm vi các thành phần của định nghĩa — dùng để đối chiếu.
 *  - Kích thước (kiểu 33): điểm định vị là các bản ghi 48 byte từ @304 (x, y, z …) đến vùng thuộc tính. MicroStation tự dựng
 *    đường kích thước, mũi tên, giá trị khi hiển thị (không lưu trong tệp) → vẽ đoạn nối các điểm định vị và ghi chiều dài
 *    đo được (m, 2 chữ số thập phân). Vị trí đường kích thước (độ lệch so với điểm định vị) chưa đọc.
 */
import { unzlibSync } from "fflate";
import { docCfb } from "./cfb.js";
import type { Diem, KetQuaDocDgn, PhanTu, PhanTuChu, PhanTuHinh, PhanTuPhuc } from "./dgn.js";
import { LoiDgn, xapXiCung } from "./dgn.js";

const MO_HINH = "Dgn-Md/#000000";

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

/** Đổi tọa độ lưu (UOR) → điểm theo đơn vị chính; với thành phần ô dùng chung đã gồm phép biến đổi của bản sao. */
type Bien = (x: number, y: number) => Diem;
interface NguCanh {
  bien: Bien;
  heSo: number;
  /** Tỷ lệ, góc xoay (độ) của bản sao ô dùng chung — 1 và 0 ở mô hình. */
  tyLe: number;
  xoayDo: number;
}

/** Tên ô dùng chung trong vùng thuộc tính (liên kết mã 0x56D2). */
function tenO(z: Uint8Array, dv: DataView, p: number, dai: number): string | null {
  for (let q = p + Math.min(2 * dv.getUint32(p + 8, true), dai); q + 12 <= p + dai; q += 2)
    if (z[q + 1] === 0x10 && z[q + 2] === 0xd2 && z[q + 3] === 0x56) {
      const n = dv.getUint32(q + 8, true);
      if (n > 0 && n < 256 && q + 12 + n <= p + dai) return String.fromCharCode(...z.subarray(q + 12, q + 12 + n));
    }
  return null;
}

/** Đọc một phần tử hình học (dùng chung cho mô hình và định nghĩa ô dùng chung). */
function docHinh(z: Uint8Array, dv: DataView, p: number, dai: number, coSo: Omit<PhanTuHinh, "loai" | "diem">, nc: NguCanh, dem3d: { n: number }): PhanTu {
  const kieu = coSo.kieu;
  const cuoiHinh = Math.min(2 * dv.getUint32(p + 8, true), dai); // hết phần hình học, trước vùng thuộc tính
  const dinh = (q: number): Diem => nc.bien(dv.getFloat64(p + q, true), dv.getFloat64(p + q + 8, true));
  if (kieu === 3 || kieu === 4 || kieu === 6) {
    const dau = kieu === 3 ? 104 : 112;
    const n = kieu === 3 ? 2 : dv.getUint32(p + 104, true);
    const buoc = n > 0 ? (cuoiHinh - dau) / n : 0;
    if (buoc === 16) {
      const diem: Diem[] = [];
      for (let i = 0; i < n; i++) diem.push(dinh(dau + i * 16));
      return { ...coSo, loai: kieu === 3 ? "DUONG" : kieu === 4 ? "DUONG_GAP" : "VUNG", diem } as PhanTuHinh;
    }
    if (buoc === 24) dem3d.n++;
    return { ...coSo, loai: "KHAC" };
  }
  if ((kieu === 12 || kieu === 14) && dai >= 108) {
    const soThanhPhan = dv.getUint32(p + 104, true);
    return { ...coSo, loai: kieu === 12 ? "CHUOI_PHUC" : "VUNG_PHUC", soThanhPhan, thanhPhan: [], diem: [] } as PhanTuPhuc;
  }
  if ((kieu === 15 && cuoiHinh >= 144) || (kieu === 16 && cuoiHinh >= 160)) {
    // Elip: @104 bán trục chính, @112 phụ, @120 góc xoay, @128 tâm. Cung: @104 góc đầu, @112 góc quét, @120, @128 bán trục,
    // @136 góc xoay, @144 tâm (radian; đơn vị lưu). Tính điểm theo đơn vị lưu rồi mới biến đổi — đúng cả khi ô bị xoay, co giãn.
    const o = kieu === 15 ? 104 : 120;
    const a = dv.getFloat64(p + o, true), b = dv.getFloat64(p + o + 8, true), xoay = dv.getFloat64(p + o + 16, true);
    const cx = dv.getFloat64(p + o + 24, true), cy = dv.getFloat64(p + o + 32, true);
    let batDau = 0, quet = 2 * Math.PI;
    if (kieu === 16) {
      batDau = dv.getFloat64(p + 104, true);
      quet = dv.getFloat64(p + 112, true);
      // Góc quét rất nhỏ (≤ 1/360000 độ — đơn vị góc của V7) gặp ở ký hiệu vòng tròn chuyển từ V7: MicroStation vẽ đủ vòng
      if (Math.abs(quet) < 1e-7) quet = 2 * Math.PI;
    }
    const lech = xapXiCung({ x: cx, y: cy }, a, b, (xoay * 180) / Math.PI, (batDau * 180) / Math.PI, (quet * 180) / Math.PI);
    return { ...coSo, loai: kieu === 15 ? "ELIP" : "CUNG", diem: lech.map((d) => nc.bien(d.x, d.y)) } as PhanTuHinh;
  }
  if (kieu === 17 && dai >= 176) {
    // Chữ 2D: gốc @152; dữ liệu chữ bắt đầu bằng dấu FF FE (FE 01 = chữ 8 bit, vd. TCVN3) hoặc FF FD (UTF-16);
    // uint16 @110 = số byte dữ liệu chữ tính từ dấu
    const soByte = dv.getUint16(p + 110, true);
    let tuDau = -1;
    for (let q = p + 164; q <= p + 176 && q + 1 < p + dai; q++)
      if (z[q] === 0xff && (z[q + 1] === 0xfe || z[q + 1] === 0xfd)) {
        tuDau = q;
        break;
      }
    if (tuDau < 0 && soByte > 0 && 170 + soByte <= cuoiHinh) {
      // Chữ 8 bit không có dấu FF FE (tệp MicroStation V8i thông thường, vd. bản đồ khu đất, trích đo): dữ liệu chữ
      // tại @170 (sau 2 byte 0), uint16 @110 = số byte. Kiểm chứng trên tệp người dùng cung cấp.
      // Chiều cao @112 chỉ dùng để hiển thị (tỷ lệ 1/100 đơn vị lưu — đối chiếu bằng mắt với kích thước thửa).
      const byteChu = z.slice(p + 170, p + 170 + soByte);
      const ket = byteChu.indexOf(0);
      const chuoi = String.fromCharCode(...byteChu.slice(0, ket >= 0 ? ket : byteChu.length));
      if (chuoi === "Pattern Control Element") return { ...coSo, loai: "KHAC" }; // phần tử điều khiển mẫu tô, không phải nhãn
      return { ...coSo, loai: "CHU", goc: dinh(152), byteChu: ket >= 0 ? byteChu.slice(0, ket) : byteChu, chieuCao: ((dv.getFloat64(p + 112, true) * nc.heSo) / 100) * nc.tyLe, gocXoay: nc.xoayDo, font: z[p + 104]! } as PhanTuChu;
    }
    if (tuDau < 0 || soByte < 4) return { ...coSo, loai: "KHAC" }; // phần tử điều khiển (vd. "Pattern Control Element"), không phải nhãn
    const tamBit = z[tuDau + 1] === 0xfe && z[tuDau + 2] === 1;
    const noiDung = z.subarray(tamBit ? tuDau + 4 : tuDau + 2, Math.min(tuDau + soByte, p + dai));
    const chu: PhanTuChu = { ...coSo, loai: "CHU", goc: dinh(152), byteChu: new Uint8Array(0), chieuCao: 0, gocXoay: nc.xoayDo, font: z[p + 105]! };
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
    return chu;
  }
  return { ...coSo, loai: "KHAC" };
}

/** Gộp thành phần vào chuỗi/vùng phức (giống bộ đọc V7). Trả về phần tử cần đưa ra, hoặc null nếu đã gộp. */
function taoBoGom() {
  let phuc: PhanTuPhuc | null = null;
  let conLai = 0;
  return (pt: PhanTu): PhanTu | null => {
    if (pt.laThanhPhan && phuc && conLai > 0) {
      conLai--;
      if (pt.loai === "DUONG" || pt.loai === "DUONG_GAP" || pt.loai === "VUNG" || pt.loai === "ELIP" || pt.loai === "CUNG") {
        phuc.thanhPhan.push(pt);
        for (const q of pt.diem) {
          const cuoi = phuc.diem[phuc.diem.length - 1];
          if (!cuoi || cuoi.x !== q.x || cuoi.y !== q.y) phuc.diem.push(q);
        }
      }
      if (conLai === 0) phuc = null;
      return null;
    }
    if (pt.loai === "CHUOI_PHUC" || pt.loai === "VUNG_PHUC") {
      phuc = pt;
      conLai = pt.soThanhPhan;
    } else if (!pt.laThanhPhan) {
      phuc = null;
      conLai = 0;
    }
    return pt;
  };
}

interface DinhNghiaO {
  z: Uint8Array;
  dv: DataView;
  /** Vị trí các thành phần trong khối. */
  thanhPhan: { p: number; dai: number }[];
  gocX: number;
  gocY: number;
}

/** Đọc các khối phần tử của một kho (mô hình hoặc phi mô hình), theo thứ tự số khối. */
function* khoiCua(tep: ReturnType<typeof docCfb>, tienTo: string): Generator<{ khai: number; z: Uint8Array; dv: DataView }> {
  const ds = tep.dsLuong.filter((s) => s.startsWith(tienTo)).sort((a, b) => Number(a.split("$").pop()) - Number(b.split("$").pop()));
  for (const s of ds) {
    const b = tep.doc(s)!;
    if (b.length <= 16) continue;
    const khai = new DataView(b.buffer, b.byteOffset, 4).getUint32(0, true);
    const z = giaiNen(b.subarray(16));
    yield { khai, z, dv: new DataView(z.buffer, z.byteOffset, z.byteLength) };
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
  const doi: Bien = (x, y) => ({ x: (x - gocX) * heSo, y: (y - gocY) * heSo });
  const mo: NguCanh = { bien: doi, heSo, tyLe: 1, xoayDo: 0 };

  // Định nghĩa ô dùng chung (kiểu 34) trong kho phi mô hình, theo tên
  const dinhNghia = new Map<string, DinhNghiaO>();
  try {
    for (const { z, dv } of khoiCua(tep, "Dgn^Nm/$")) {
      let dn: DinhNghiaO | null = null;
      for (const { p, dai } of phanTuTrong(z, 4)) {
        const kieu = z[p]! & 0x7f;
        const laThanhPhan = (z[p + 3]! & 0x40) !== 0;
        if (kieu === 34 && !laThanhPhan) {
          const ten = tenO(z, dv, p, dai);
          dn = ten && dai >= 248 ? { z, dv, thanhPhan: [], gocX: dv.getFloat64(p + 232, true), gocY: dv.getFloat64(p + 240, true) } : null;
          if (dn && ten) dinhNghia.set(ten, dn);
        } else if (dn && laThanhPhan) dn.thanhPhan.push({ p, dai });
        else dn = null;
      }
    }
  } catch {
    canhBao.push("Không đọc được định nghĩa ô dùng chung (kho phi mô hình) — ký hiệu dạng ô dùng chung không hiển thị.");
  }

  // Khối phần tử đồ họa theo thứ tự số
  if (!tep.dsLuong.some((s) => s.startsWith(`${MO_HINH}/Dgn^G/$`))) throw new LoiDgn("Tệp DGN V8 không có phần tử đồ họa trong mô hình mặc định.");

  const phanTu: PhanTu[] = [];
  const dem3d = { n: 0 };
  let stt = 0;
  let nut: number | null = null;
  let lechKhai = 0;
  let soO = 0, oThieu = 0, soKichThuoc = 0, oLech = 0, ktLech = 0;
  /** Khoảng cách xa nhất (m) cho phép giữa điểm định vị của kích thước và điểm đầu — vượt → cấu trúc chưa kiểm chứng, bỏ. */
  const KT_TOI_DA = 500;
  const tenThieu = new Set<string>();

  /** Dựng thành phần của ô dùng chung theo phép biến đổi của bản sao (đệ quy khi định nghĩa chứa ô khác). */
  const dungO = (ten: string, bienCha: Bien, tyLeCha: number, xoayCha: number, m: number[], ox: number, oy: number, lop: number, sau: number, ra: PhanTu[]): Bien | null => {
    const dn = dinhNghia.get(ten);
    if (!dn) {
      oThieu++;
      tenThieu.add(ten);
      return null;
    }
    const [a, b, d, e] = m as [number, number, number, number];
    const bien: Bien = (x, y) => bienCha(ox + a * (x - dn.gocX) + b * (y - dn.gocY), oy + d * (x - dn.gocX) + e * (y - dn.gocY));
    const nc: NguCanh = { bien, heSo, tyLe: tyLeCha * Math.hypot(a, d), xoayDo: xoayCha + (Math.atan2(d, a) * 180) / Math.PI };
    const gom = taoBoGom();
    for (const { p, dai } of dn.thanhPhan) {
      const kieu = dn.z[p]! & 0x7f;
      if (kieu === 35 && dai >= 256 && sau < 4) {
        const con = tenO(dn.z, dn.dv, p, dai);
        const f = (q: number) => dn.dv.getFloat64(p + q, true);
        if (con) dungO(con, bien, nc.tyLe, nc.xoayDo, [f(160), f(168), f(184), f(192)], f(232), f(240), lop, sau + 1, ra);
        continue;
      }
      // Thành phần của định nghĩa đều mang cờ 0x40; chỉ phần tử con của chuỗi/vùng phức lồng trong định nghĩa được gộp
      const pt = docHinh(dn.z, dn.dv, p, dai, { stt: stt++, kieu, lop, mau: 0, netDay: 0, kieuNet: 0, laThanhPhan: true, oDungChung: ten }, nc, dem3d);
      const kq = gom(pt);
      if (kq && kq.loai !== "KHAC") ra.push(kq);
    }
    return bien;
  };

  for (const { khai, z, dv } of khoiCua(tep, `${MO_HINH}/Dgn^G/$`)) {
    let soDoc = 0;
    const gom = taoBoGom();
    for (const { p, dai } of phanTuTrong(z, 4)) {
      soDoc++;
      const kieu = z[p]! & 0x7f;
      const laThanhPhan = (z[p + 3]! & 0x40) !== 0;
      const lop = dai >= 16 ? dv.getUint32(p + 12, true) : 0;
      const coSo = { stt: stt++, kieu, lop, mau: 0, netDay: 0, kieuNet: 0, laThanhPhan };

      if (kieu === 35 && dai >= 256) {
        // Bản sao ô dùng chung: ma trận 3×3 theo hàng @160, gốc @232
        const ten = tenO(z, dv, p, dai);
        const f = (q: number) => dv.getFloat64(p + q, true);
        soO++;
        if (ten) {
          // Kiểm hợp lệ: mọi điểm thành phần phải nằm trong phạm vi của bản sao (phạm vi cục bộ @112…@152 × tỷ lệ) quanh
          // gốc; lệch xa (cấu trúc bản sao khác mẫu đã kiểm chứng) → bỏ cả ô, không vẽ đường kéo dài.
          const ra: PhanTu[] = [];
          const bien = dungO(ten, doi, 1, 0, [f(160), f(168), f(184), f(192)], f(232), f(240), lop, 0, ra);
          if (bien) {
            // tâm phạm vi cục bộ đã biến đổi; bán kính = nửa đường chéo phạm vi × tỷ lệ, nới 50% + 2 m
            const tam = bien((f(112) + f(136)) / 2, (f(120) + f(144)) / 2);
            const cheo = Math.hypot(f(136) - f(112), f(144) - f(120)) * heSo * Math.hypot(f(160), f(184));
            const banKinh = (Number.isFinite(cheo) && cheo > 0 && cheo < 10000 ? cheo / 2 : 300) * 1.5 + 2;
            const trong = (d: Diem) => Number.isFinite(d.x) && Number.isFinite(d.y) && Math.hypot(d.x - tam.x, d.y - tam.y) <= banKinh;
            let bo = 0;
            for (const e of ra) {
              if (e.loai === "CHU" ? trong(e.goc) : "diem" in e ? e.diem.every(trong) : true) phanTu.push(e);
              else bo++;
            }
            if (bo) oLech++;
          }
        } else oThieu++;
        nut = null;
        continue;
      }
      if (kieu === 33) {
        // Kích thước: điểm định vị (bản ghi 48 byte) từ @304 đến vùng thuộc tính
        const cuoi = Math.min(2 * dv.getUint32(p + 8, true), dai);
        const diem: Diem[] = [];
        // Bản ghi điểm định vị 48 byte (x, y, z, …, dấu FF FF tại byte 40). Sau các điểm có thể có khối khác (tệp TD_73:
        // khối 40 byte bắt đầu "14 0C") — không phải điểm; đọc nhầm thành điểm (≈ 0) sinh đường dọc kéo dài (lỗi 0.9.0).
        for (let q = 304; q + 48 <= cuoi && z[p + q + 40] === 0xff && z[p + q + 41] === 0xff; q += 48) diem.push(doi(dv.getFloat64(p + q, true), dv.getFloat64(p + q + 8, true)));
        // Kích thước nhiều điểm có thể lưu điểm sau dạng độ lệch (chưa kiểm chứng) → chỉ nhận khi mọi điểm gần điểm đầu
        const hopLe = diem.length >= 2 && diem.every((d) => Number.isFinite(d.x) && Number.isFinite(d.y) && Math.hypot(d.x - diem[0]!.x, d.y - diem[0]!.y) <= KT_TOI_DA);
        if (diem.length >= 2 && !hopLe) ktLech++;
        if (hopLe) {
          soKichThuoc++;
          let dai2 = 0;
          for (let i = 1; i < diem.length; i++) dai2 += Math.hypot(diem[i]!.x - diem[i - 1]!.x, diem[i]!.y - diem[i - 1]!.y);
          phanTu.push({ ...coSo, loai: diem.length === 2 ? "DUONG" : "DUONG_GAP", diem, kichThuoc: dai2 } as PhanTuHinh);
          const [d0, d1] = [diem[0]!, diem[diem.length - 1]!];
          let goc = (Math.atan2(d1.y - d0.y, d1.x - d0.x) * 180) / Math.PI;
          if (goc > 90) goc -= 180;
          if (goc < -90) goc += 180;
          const cao = cuoi >= 200 ? dv.getFloat64(p + 192, true) * heSo : 0;
          phanTu.push({ ...coSo, stt: stt++, loai: "CHU", goc: { x: (d0.x + d1.x) / 2, y: (d0.y + d1.y) / 2 }, byteChu: new Uint8Array(0), chuUnicode: dai2.toFixed(2).replace(".", ","), chieuCao: cao > 0 && cao < 50 ? cao : 1, gocXoay: goc, font: 0, kichThuoc: dai2 } as PhanTuChu);
        } else phanTu.push({ ...coSo, loai: "KHAC" });
        nut = null;
        continue;
      }

      const pt = docHinh(z, dv, p, dai, coSo, mo, dem3d);
      // Dòng chữ thuộc nút chữ (kiểu 7), vd. nút thuộc tính thửa của gCadas
      if (kieu === 7) nut = coSo.stt;
      else if (!laThanhPhan) nut = null;
      else if (pt.loai === "CHU" && nut !== null) pt.nut = nut;
      const kq = gom(pt);
      if (kq) phanTu.push(kq);
    }
    if (soDoc !== khai) lechKhai += Math.abs(khai - soDoc);
  }

  if (lechKhai) canhBao.push(`Số phần tử đọc được lệch ${lechKhai} so với số khai báo trong tệp — kiểm tra lại bản đồ.`);
  if (dem3d.n) canhBao.push(`${dem3d.n} phần tử 3D chưa được hỗ trợ (bản đồ địa chính thường là 2D) — đã bỏ qua.`);
  if (soO) canhBao.push(`Đã dựng ${soO - oThieu}/${soO} ô dùng chung (ký hiệu) từ ${dinhNghia.size} định nghĩa trong tệp${tenThieu.size ? `; thiếu định nghĩa: ${[...tenThieu].slice(0, 5).join(", ")}` : ""}.`);
  if (oLech) canhBao.push(`${oLech} ô dùng chung có thành phần nằm ngoài phạm vi của ô (cấu trúc chưa kiểm chứng) — bỏ các thành phần đó để tránh vẽ sai (đường kéo dài).`);
  if (ktLech) canhBao.push(`${ktLech} kích thước có điểm định vị cách điểm đầu hơn ${KT_TOI_DA} m (cấu trúc chưa kiểm chứng) — không vẽ.`);
  if (soKichThuoc) canhBao.push(`${soKichThuoc} kích thước: vẽ đoạn nối các điểm định vị kèm chiều dài đo được (m); vị trí đường kích thước, mũi tên theo kiểu kích thước của MicroStation không được dựng lại.`);
  canhBao.push("Tệp DGN V8 (MicroStation V8/V8i): đọc mô hình mặc định; tham chiếu ngoài (reference) không được đọc.");

  return {
    tcb: { soChieu: 2, suTrenMu: 1, uorTrenSu: uor, donViChinh: "m", donViPhu: "", gocX: gocX * heSo, gocY: gocY * heSo, heSo },
    phanTu,
    bangMau: null,
    canhBao,
  };
}
