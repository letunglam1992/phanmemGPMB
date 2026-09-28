import { laCfb } from "./cfb.js";
import { docDgnV8 } from "./dgn-v8.js";

/**
 * Bộ đọc tệp MicroStation DGN phiên bản 7 (ISFF), 2D và 3D. Tệp V8/V8i chuyển sang dgn-v8.ts.
 *
 * Chỉ đọc; không ghi. Cấu trúc bản ghi theo đặc tả ISFF (Intergraph Standard File
 * Format) — cùng cách đọc với trình điều khiển DGN của GDAL, dùng để đối chiếu kết quả.
 *
 * Tọa độ nội bộ (UOR, số nguyên 32 bit) được đổi sang đơn vị chính (master unit)
 * theo TCB: x = x_uor / (UOR/SU × SU/MU) − gốc_x.
 */

export type LoaiPhanTu =
  | "DUONG" // 3: đoạn thẳng
  | "DUONG_GAP" // 4: đường gấp khúc
  | "VUNG" // 6: vùng khép kín
  | "CHUOI_PHUC" // 12: chuỗi phức (đầu)
  | "VUNG_PHUC" // 14: vùng phức (đầu)
  | "ELIP" // 15
  | "CUNG" // 16
  | "CHU" // 17
  | "KHAC";

export interface Diem {
  x: number;
  y: number;
}

interface PhanTuCoSo {
  /** Số thứ tự bản ghi trong tệp (bắt đầu 0), dùng truy vết. */
  stt: number;
  /** Mã kiểu gốc theo ISFF. */
  kieu: number;
  loai: LoaiPhanTu;
  lop: number;
  mau: number;
  netDay: number;
  kieuNet: number;
  /** Thuộc phần tử phức (thành phần của chuỗi/vùng phức). */
  laThanhPhan: boolean;
}

export interface PhanTuHinh extends PhanTuCoSo {
  loai: "DUONG" | "DUONG_GAP" | "VUNG" | "ELIP" | "CUNG";
  diem: Diem[];
}

export interface PhanTuPhuc extends PhanTuCoSo {
  loai: "CHUOI_PHUC" | "VUNG_PHUC";
  soThanhPhan: number;
  /** Các thành phần hình học (đã gắn khi đọc). */
  thanhPhan: PhanTuHinh[];
  diem: Diem[];
}

export interface PhanTuChu extends PhanTuCoSo {
  loai: "CHU";
  goc: Diem;
  /** Chuỗi byte gốc (8 bit). Giải mã bằng bảng mã phù hợp, ví dụ TCVN3. */
  byteChu: Uint8Array;
  /** Chữ Unicode 16 bit (khi tệp lưu dạng 0xFF 0xFD), nếu có. */
  chuUnicode?: string;
  chieuCao: number;
  gocXoay: number;
  font: number;
  /** stt của nút chữ (text node, kiểu 7) chứa dòng chữ này, nếu có. Thứ tự dòng = thứ tự trong tệp. */
  nut?: number;
}

export interface PhanTuKhac extends PhanTuCoSo {
  loai: "KHAC";
}

export type PhanTu = PhanTuHinh | PhanTuPhuc | PhanTuChu | PhanTuKhac;

export interface ThongTinTcb {
  soChieu: 2 | 3;
  suTrenMu: number;
  uorTrenSu: number;
  donViChinh: string;
  donViPhu: string;
  gocX: number;
  gocY: number;
  heSo: number;
}

export interface KetQuaDocDgn {
  tcb: ThongTinTcb;
  phanTu: PhanTu[];
  /** Bảng màu (256 màu, "#rrggbb") nếu tệp có; không có thì null. */
  bangMau: string[] | null;
  canhBao: string[];
}

export class LoiDgn extends Error {}


/** int32 "middle-endian" của DGN V7: 2 từ 16 bit, từ cao trước, mỗi từ little-endian. */
function int32(dv: DataView, o: number): number {
  const hi = dv.getUint16(o, true);
  const lo = dv.getUint16(o + 2, true);
  return ((hi << 16) | lo) | 0;
}

/** Số thực VAX D-float (8 byte, thứ tự từ 16 bit đảo) → IEEE double. */
export function vaxDouble(dv: DataView, o: number): number {
  const b0 = dv.getUint8(o + 1);
  const b1 = dv.getUint8(o);
  const b2 = dv.getUint8(o + 3);
  const b3 = dv.getUint8(o + 2);
  const b4 = dv.getUint8(o + 5);
  const b5 = dv.getUint8(o + 4);
  const b6 = dv.getUint8(o + 7);
  const b7 = dv.getUint8(o + 6);
  const dau = b0 >> 7;
  const mu = ((b0 & 0x7f) << 1) | (b1 >> 7);
  if (mu === 0) return 0;
  // Phần định trị 55 bit (bit ẩn 0.1xxx); giá trị = 0.1m × 2^(mu−128)
  let dinhTri = (b1 & 0x7f) / 128;
  let chia = 128 * 256;
  for (const b of [b2, b3, b4, b5, b6, b7]) {
    dinhTri += b / chia;
    chia *= 256;
  }
  const giaTri = (0.5 + dinhTri / 2) * Math.pow(2, mu - 128);
  return dau ? -giaTri : giaTri;
}

const LOAI: Record<number, LoaiPhanTu> = {
  3: "DUONG",
  4: "DUONG_GAP",
  6: "VUNG",
  12: "CHUOI_PHUC",
  14: "VUNG_PHUC",
  15: "ELIP",
  16: "CUNG",
  17: "CHU",
};

/** Số điểm dùng để xấp xỉ elip/cung khi vẽ và tính toán. */
const SO_DOAN_CUNG = 36;

function xapXiCung(
  tam: Diem,
  a: number,
  b: number,
  xoayDo: number,
  batDauDo: number,
  quetDo: number,
): Diem[] {
  const r = (xoayDo * Math.PI) / 180;
  const n = Math.max(4, Math.ceil((SO_DOAN_CUNG * Math.abs(quetDo)) / 360));
  const out: Diem[] = [];
  for (let i = 0; i <= n; i++) {
    const t = ((batDauDo + (quetDo * i) / n) * Math.PI) / 180;
    const ex = a * Math.cos(t);
    const ey = b * Math.sin(t);
    out.push({ x: tam.x + ex * Math.cos(r) - ey * Math.sin(r), y: tam.y + ex * Math.sin(r) + ey * Math.cos(r) });
  }
  return out;
}

export function docDgn(duLieu: ArrayBuffer | Uint8Array): KetQuaDocDgn {
  const u8 = duLieu instanceof Uint8Array ? duLieu : new Uint8Array(duLieu);
  if (laCfb(u8)) return docDgnV8(u8); // MicroStation V8 / V8i (tệp ghép OLE)
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const canhBao: string[] = [];
  const phanTu: PhanTu[] = [];
  let tcb: ThongTinTcb | null = null;
  let bangMau: string[] | null = null;
  let phucHienTai: PhanTuPhuc | null = null;
  let conLaiPhuc = 0;
  let nutHienTai: number | null = null;
  let soDinhNghia = 0;

  if (u8.byteLength < 4) throw new LoiDgn("Tệp quá ngắn, không phải DGN.");
  const dau0 = dv.getUint8(0);
  const dau1 = dv.getUint8(1);
  if (!((dau0 === 0x08 || dau0 === 0xc8) && dau1 === 0x09)) {
    throw new LoiDgn(
      "Không nhận dạng được tệp DGN: không phải DGN V7 (thiếu bản ghi TCB đầu tệp) cũng không phải DGN V8 (tệp ghép OLE).",
    );
  }

  let o = 0;
  let stt = 0;
  // Hàm đổi tọa độ; trước khi đọc TCB dùng hệ số 1.
  let heSo = 1;
  let gocX = 0;
  let gocY = 0;
  let soChieu: 2 | 3 = 2;
  const doiDiem = (x: number, y: number): Diem => ({ x: x * heSo - gocX, y: y * heSo - gocY });

  while (o + 4 <= u8.byteLength) {
    if (dv.getUint8(o) === 0xff && dv.getUint8(o + 1) === 0xff) break; // hết tệp
    const b0 = dv.getUint8(o);
    const b1 = dv.getUint8(o + 1);
    const soTu = dv.getUint16(o + 2, true);
    const dai = 4 + soTu * 2;
    if (o + dai > u8.byteLength) {
      canhBao.push(`Bản ghi ${stt} bị cắt cụt ở cuối tệp (byte ${o}).`);
      break;
    }
    const lop = b0 & 0x3f;
    const laThanhPhan = (b0 & 0x80) !== 0;
    const kieu = b1 & 0x7f;
    const daXoa = (b1 & 0x80) !== 0;
    const e = o;
    o += dai;
    const sttHienTai = stt++;
    if (daXoa) continue;

    if (kieu === 9 && tcb === null) {
      if (dai < 1264) throw new LoiDgn("Bản ghi TCB không đủ độ dài.");
      soChieu = (dv.getUint8(e + 1214) & 0x40) !== 0 ? 3 : 2;
      const suTrenMu = int32(dv, e + 1112);
      const uorTrenSu = int32(dv, e + 1116);
      const donViChinh = String.fromCharCode(dv.getUint8(e + 1120), dv.getUint8(e + 1121)).replace(/\0/g, "");
      const donViPhu = String.fromCharCode(dv.getUint8(e + 1122), dv.getUint8(e + 1123)).replace(/\0/g, "");
      if (suTrenMu !== 0 && uorTrenSu !== 0) heSo = 1 / (suTrenMu * uorTrenSu);
      else canhBao.push("TCB không có đơn vị đo; dùng hệ số 1.");
      gocX = vaxDouble(dv, e + 1240) * heSo;
      gocY = vaxDouble(dv, e + 1248) * heSo;
      tcb = { soChieu, suTrenMu, uorTrenSu, donViChinh, donViPhu, gocX, gocY, heSo };
      continue;
    }

    if (kieu === 34) {
      // Định nghĩa ô dùng chung (shared cell definition): thành phần theo sau được giữ như
      // phần tử thường (cùng cách xử lý với GDAL); phần tử ngoài vùng bản đồ do người dùng lọc.
      soDinhNghia++;
      continue;
    }

    if (kieu === 5 && lop === 1 && dai >= 806) {
      // Bảng màu: 256 × RGB bắt đầu từ byte 38 (màu 0 = nền)
      bangMau = [];
      for (let i = 0; i < 256; i++) {
        const p = e + 38 + i * 3;
        const hex = (n: number) => n.toString(16).padStart(2, "0");
        bangMau.push(`#${hex(dv.getUint8(p))}${hex(dv.getUint8(p + 1))}${hex(dv.getUint8(p + 2))}`);
      }
      continue;
    }

    const loai = LOAI[kieu] ?? "KHAC";
    // Phần tử đồ họa có header 36 byte (thuộc tính hiển thị từ byte 34)
    const coHienThi = dai >= 36;
    const kieuNetDay = coHienThi ? dv.getUint8(e + 34) : 0;
    const coSo = {
      stt: sttHienTai,
      kieu,
      lop,
      mau: coHienThi ? dv.getUint8(e + 35) : 0,
      netDay: kieuNetDay >> 3,
      kieuNet: kieuNetDay & 0x07,
      laThanhPhan,
    };
    const buoc = soChieu === 3 ? 12 : 8;
    const docDinh = (p: number): Diem => doiDiem(int32(dv, p), int32(dv, p + 4));

    let pt: PhanTu;
    switch (loai) {
      case "DUONG": {
        pt = { ...coSo, loai, diem: [docDinh(e + 36), docDinh(e + 36 + buoc)] };
        break;
      }
      case "DUONG_GAP":
      case "VUNG": {
        const n = dv.getUint16(e + 36, true);
        const diem: Diem[] = [];
        for (let i = 0; i < n; i++) {
          const p = e + 38 + i * buoc;
          if (p + buoc > e + dai) {
            canhBao.push(`Phần tử ${sttHienTai}: số đỉnh khai báo ${n} vượt độ dài bản ghi.`);
            break;
          }
          diem.push(docDinh(p));
        }
        pt = { ...coSo, loai, diem };
        break;
      }
      case "CHUOI_PHUC":
      case "VUNG_PHUC": {
        const soThanhPhan = dv.getUint16(e + 38, true);
        const phuc: PhanTuPhuc = { ...coSo, loai, soThanhPhan, thanhPhan: [], diem: [] };
        pt = phuc;
        phucHienTai = phuc;
        conLaiPhuc = soThanhPhan;
        break;
      }
      case "ELIP":
      case "CUNG": {
        let a: number, b: number, xoay: number, tam: Diem, batDau = 0, quet = 360;
        if (loai === "ELIP") {
          a = vaxDouble(dv, e + 36) * heSo;
          b = vaxDouble(dv, e + 44) * heSo;
          if (soChieu === 2) {
            xoay = int32(dv, e + 52) / 360000;
            tam = doiDiem(vaxDouble(dv, e + 56), vaxDouble(dv, e + 64));
          } else {
            xoay = 0; // 3D dùng quaternion; hiếm gặp trong bản đồ địa chính
            tam = doiDiem(vaxDouble(dv, e + 68), vaxDouble(dv, e + 76));
          }
        } else {
          batDau = int32(dv, e + 36) / 360000;
          const q = int32(dv, e + 40);
          // Góc quét dùng dấu-độ lớn (bit cao là dấu)
          quet = (q & 0x80000000 ? -(q & 0x7fffffff) : q) / 360000;
          if (quet === 0) quet = 360;
          a = vaxDouble(dv, e + 44) * heSo;
          b = vaxDouble(dv, e + 52) * heSo;
          if (soChieu === 2) {
            xoay = int32(dv, e + 60) / 360000;
            tam = doiDiem(vaxDouble(dv, e + 64), vaxDouble(dv, e + 72));
          } else {
            xoay = 0;
            tam = doiDiem(vaxDouble(dv, e + 76), vaxDouble(dv, e + 84));
          }
        }
        pt = { ...coSo, loai, diem: xapXiCung(tam, a, b, xoay, batDau, quet) };
        break;
      }
      case "CHU": {
        const font = dv.getUint8(e + 36);
        let chieuCao: number, xoay: number, goc: Diem, n: number, p: number;
        if (soChieu === 2) {
          chieuCao = (int32(dv, e + 42) * heSo * 6) / 1000;
          xoay = int32(dv, e + 46) / 360000;
          goc = docDinh(e + 50);
          n = dv.getUint8(e + 58);
          p = e + 60;
        } else {
          chieuCao = (int32(dv, e + 42) * heSo * 6) / 1000;
          xoay = 0;
          goc = docDinh(e + 62);
          n = dv.getUint8(e + 74);
          p = e + 76;
        }
        n = Math.min(n, e + dai - p);
        const byteChu = u8.slice(p, p + n);
        const chu: PhanTuChu = { ...coSo, loai, goc, byteChu, chieuCao, gocXoay: xoay, font };
        if (n >= 2 && byteChu[0] === 0xff && byteChu[1] === 0xfd) {
          let s = "";
          for (let i = 2; i + 1 < n; i += 2) s += String.fromCharCode(dv.getUint16(p + i, true));
          chu.chuUnicode = s;
        }
        pt = chu;
        break;
      }
      default:
        pt = { ...coSo, loai: "KHAC" };
    }

    if (kieu === 7) nutHienTai = sttHienTai;
    else if (!laThanhPhan) nutHienTai = null;
    else if (pt.loai === "CHU" && nutHienTai !== null) pt.nut = nutHienTai;

    if (laThanhPhan && phucHienTai && conLaiPhuc > 0 && pt !== phucHienTai) {
      conLaiPhuc--;
      if (pt.loai === "DUONG" || pt.loai === "DUONG_GAP" || pt.loai === "CUNG" || pt.loai === "VUNG" || pt.loai === "ELIP") {
        phucHienTai.thanhPhan.push(pt);
        const d = phucHienTai.diem;
        for (const q of pt.diem) {
          const cuoi = d[d.length - 1];
          if (!cuoi || cuoi.x !== q.x || cuoi.y !== q.y) d.push(q);
        }
      }
      if (conLaiPhuc === 0) phucHienTai = null;
      continue; // thành phần đã gộp vào phần tử phức
    }
    if (!laThanhPhan && pt !== phucHienTai) {
      phucHienTai = null;
      conLaiPhuc = 0;
    }
    phanTu.push(pt);
  }

  if (!tcb) throw new LoiDgn("Không đọc được TCB.");
  if (soDinhNghia > 0)
    canhBao.push(`Tệp có ${soDinhNghia} định nghĩa ô dùng chung (shared cell); ô dùng chung đặt trên bản vẽ (kiểu 35) chưa được hiển thị.`);
  return { tcb, phanTu, bangMau, canhBao };
}
