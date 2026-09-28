import Decimal from "decimal.js";

// Độ chính xác cao cho số trung gian; chỉ làm tròn theo quy tắc nghiệp vụ.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type SoVao = Decimal.Value;
export const D = (v: SoVao) => new Decimal(v);

/** KHONG: không làm tròn (VM-36 — người dùng chọn theo dự án). */
export type CachLamTron = "NUA_LEN" | "XUONG" | "LEN" | "KHONG";

const MODE: Record<Exclude<CachLamTron, "KHONG">, Decimal.Rounding> = {
  NUA_LEN: Decimal.ROUND_HALF_UP,
  XUONG: Decimal.ROUND_DOWN,
  LEN: Decimal.ROUND_UP,
};

/** QD-03: diện tích làm tròn 2 chữ số thập phân. */
export function lamTronDienTich(v: SoVao, cach: CachLamTron = "NUA_LEN"): Decimal {
  return cach === "KHONG" ? D(v) : D(v).toDecimalPlaces(2, MODE[cach]);
}

/** QD-03: tiền làm tròn đến bội số `buoc` (mặc định 1.000 đồng), chỉ dùng ở cấp hộ. */
export function lamTronTien(v: SoVao, buoc: SoVao = 1000, cach: CachLamTron = "NUA_LEN"): Decimal {
  if (cach === "KHONG") return D(v);
  const b = D(buoc);
  return D(v).div(b).toDecimalPlaces(0, MODE[cach]).mul(b);
}

/** Định dạng số kiểu Việt Nam: 1.234.567,89 */
export function dinhDang(v: SoVao, soLe = 0): string {
  const [nguyen, le] = D(v).toFixed(soLe).split(".");
  const am = nguyen!.startsWith("-");
  const tuyetDoi = am ? nguyen!.slice(1) : nguyen!;
  const nhom = tuyetDoi.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (am ? "-" : "") + nhom + (le ? "," + le : "");
}
