/**
 * Ngày làm việc (VM-25). Nguyên tắc: phần mềm KHÔNG tự suy lịch âm, ngày nghỉ bù, hoán đổi —
 * cán bộ nhập danh mục ngày nghỉ lễ, Tết và ngày làm bù theo thông báo hằng năm của cơ quan có thẩm quyền.
 * Thiếu danh mục của năm nào thì hạn năm đó chỉ trừ thứ Bảy, Chủ nhật và có cảnh báo.
 *
 * Quy ước tính hạn: "trong n ngày/ngày làm việc kể từ ngày X" → ngày thứ nhất là ngày liền sau X;
 * hạn chót là ngày thứ n (cách tính thời hạn của Bộ luật Dân sự 2015, Điều 147).
 */
export interface NgayDacBiet {
  ngay: string; // ISO yyyy-mm-dd
  ten: string;
}

export interface LichLamViec {
  /** Ngày nghỉ lễ, Tết, nghỉ bù (rơi vào ngày thường). */
  nghi: NgayDacBiet[];
  /** Thứ Bảy/Chủ nhật phải đi làm bù (hoán đổi). */
  lamBu: NgayDacBiet[];
  /** Các năm cán bộ đã xác nhận nhập đủ danh mục. */
  namDaDu: number[];
}

export const LICH_TRONG: LichLamViec = { nghi: [], lamBu: [], namDaDu: [] };

/** Ngày lễ cố định theo dương lịch (khoản 1 Điều 112 Bộ luật Lao động 2019) — gợi ý, cán bộ kiểm tra. */
export const LE_DUONG_LICH_CO_DINH: { thangNgay: string; ten: string }[] = [
  { thangNgay: "01-01", ten: "Tết Dương lịch" },
  { thangNgay: "04-30", ten: "Ngày Chiến thắng" },
  { thangNgay: "05-01", ten: "Ngày Quốc tế lao động" },
  { thangNgay: "09-02", ten: "Quốc khánh" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const tuIso = (s: string) => new Date(`${s}T00:00:00Z`);
const cong1 = (s: string, n = 1) => {
  const d = tuIso(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

export function laNgayLamViec(ngay: string, lich: LichLamViec): boolean {
  if (lich.lamBu.some((x) => x.ngay === ngay)) return true;
  const thu = tuIso(ngay).getUTCDay();
  if (thu === 0 || thu === 6) return false;
  return !lich.nghi.some((x) => x.ngay === ngay);
}

/** Hạn chót: n ngày (loai "N") hoặc n ngày làm việc ("NLV") kể từ ngày mốc. */
export function hanChot(moc: string, n: number, loai: "N" | "NLV", lich: LichLamViec): string {
  if (loai === "N") return cong1(moc, n);
  let d = moc;
  let dem = 0;
  while (dem < n) {
    d = cong1(d);
    if (laNgayLamViec(d, lich)) dem++;
  }
  return d;
}

/** Số ngày làm việc từ sau `tu` đến hết `den` (âm nếu den trước tu). */
export function soNgayLamViec(tu: string, den: string, lich: LichLamViec): number {
  if (den === tu) return 0;
  const dau = den > tu ? 1 : -1;
  let d = tu;
  let dem = 0;
  while (d !== den) {
    d = cong1(d, dau);
    if (laNgayLamViec(d, lich)) dem += dau;
  }
  return dem;
}

/** Các năm trong khoảng [tu, den] chưa được xác nhận nhập đủ danh mục ngày nghỉ. */
export function namThieuLich(tu: string, den: string, lich: LichLamViec): number[] {
  const out: number[] = [];
  for (let y = Number(tu.slice(0, 4)); y <= Number(den.slice(0, 4)); y++) if (!lich.namDaDu.includes(y)) out.push(y);
  return out;
}
