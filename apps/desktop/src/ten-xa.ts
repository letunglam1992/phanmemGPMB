/**
 * 1.3.6: chuẩn hóa tên xã, phường theo danh mục (danh-muc-xa.json) để so khớp — cùng một xã ghi lệch
 * ("Chiềng Mung", "xã Chiềng Mung", "UBND xã Chiềng Mung", thừa dấu cách, khác hoa thường, gõ không dấu)
 * đều về một tên trong danh mục. Tên không có trong danh mục (hoặc khớp nhiều tên) giữ nguyên, chỉ gọn dấu cách.
 */
import DANH_MUC_XA from "./danh-muc-xa.json";

const gon = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
const loi = (s: string) => gon(s).toLowerCase().replace(/^ubnd\s+/, "").replace(/^(xã|phường|thị trấn)\s+/, "");
const khongDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

function bang(f: (s: string) => string) {
  const m = new Map<string, string[]>();
  for (const x of DANH_MUC_XA as string[]) {
    const k = f(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}
const THEO_DAU = bang(loi);
const THEO_KHONG_DAU = bang((s) => khongDau(loi(s)));

export function chuanTenXa(s: string | undefined | null): string {
  const g = gon(s ?? "");
  if (!g) return "";
  const k = loi(g);
  // "Phường X"/"Xã X" ghi rõ loại đơn vị thì ưu tiên đúng loại
  const loai = /^(ubnd\s+)?(xã|phường)\s/i.exec(g)?.[2]?.toLowerCase();
  const chon = (ds?: string[]) => {
    if (!ds?.length) return undefined;
    const dung = loai ? ds.filter((x) => x.toLowerCase().startsWith(loai)) : ds;
    return dung.length === 1 ? dung[0] : ds.length === 1 ? ds[0] : undefined;
  };
  return chon(THEO_DAU.get(k)) ?? chon(THEO_KHONG_DAU.get(khongDau(k))) ?? g;
}

/** Hai cách ghi có cùng là một xã, phường không. */
export const cungXa = (a: string | undefined | null, b: string | undefined | null) => chuanTenXa(a) === chuanTenXa(b);
