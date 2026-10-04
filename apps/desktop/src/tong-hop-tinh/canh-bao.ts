/**
 * Cảnh báo xã, phường lâu chưa gửi số liệu lên tỉnh (docs/21). Số ngày ngưỡng do cấp tỉnh tự đặt (không có mốc mặc định);
 * để trống = tắt cảnh báo. Hai nguồn:
 *   - gói đã nhận: thời điểm số liệu (lúc xã xuất gói) quá ngưỡng;
 *   - cổng Cloudflare: xã đã được cấp mã nhưng quá ngưỡng chưa gửi lên cổng, hoặc chưa gửi lần nào (tính từ ngày cấp mã).
 */
export interface ChamGui {
  ten: string;
  nguon: "GOI" | "CONG";
  /** ISO thời điểm lần gửi / số liệu gần nhất; null = chưa gửi lần nào */
  lanCuoi: string | null;
  /** Số ngày kể từ lần gửi gần nhất (hoặc từ ngày cấp mã nếu chưa gửi) */
  soNgay: number;
}

const NGAY = 86_400_000;
export const soNgayTu = (iso: string, bayGio: Date) => Math.max(0, Math.floor((bayGio.getTime() - new Date(iso).getTime()) / NGAY));

export const KHOA_NGUONG = "gpmb-tinh-nguong-cham-gui";
export function docNguong(): number | null {
  try {
    const n = Number(localStorage.getItem(KHOA_NGUONG));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
export function ghiNguong(n: number | null) {
  try {
    if (n && n > 0) localStorage.setItem(KHOA_NGUONG, String(Math.floor(n)));
    else localStorage.removeItem(KHOA_NGUONG);
  } catch {
    /* bỏ qua */
  }
}

export function dsChamGui(
  goi: { donViGui: string; thongTin: { luc: string } }[],
  xaCong: { ten: string; taoLuc: string; goiCuoi?: string; thuHoi?: string }[],
  nguong: number | null,
  bayGio: Date,
): ChamGui[] {
  if (!nguong) return [];
  const out: ChamGui[] = [];
  for (const g of goi) {
    const n = soNgayTu(g.thongTin.luc, bayGio);
    if (n > nguong) out.push({ ten: g.donViGui, nguon: "GOI", lanCuoi: g.thongTin.luc, soNgay: n });
  }
  for (const x of xaCong) {
    if (x.thuHoi) continue;
    const n = soNgayTu(x.goiCuoi ?? x.taoLuc, bayGio);
    if (n > nguong) out.push({ ten: x.ten, nguon: "CONG", lanCuoi: x.goiCuoi ?? null, soNgay: n });
  }
  return out.sort((a, b) => b.soNgay - a.soNgay);
}

const ngayVN = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
export const moTaCham = (c: ChamGui) =>
  c.lanCuoi
    ? `${c.nguon === "CONG" ? "lần gửi lên cổng gần nhất" : "số liệu gửi gần nhất"} ngày ${ngayVN(c.lanCuoi)} (${c.soNgay} ngày)`
    : `chưa gửi số liệu lên cổng lần nào (cấp mã ${c.soNgay} ngày trước)`;
