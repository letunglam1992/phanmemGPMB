/**
 * Mã hồ sơ (P0-3). Mẫu mã do người dùng đặt theo dự án (QD-24, người dùng chốt 28/9/2026): chuỗi bất kỳ, dãy dấu "#"
 * cuối cùng là chỗ đánh số (số dấu # = số chữ số tối thiểu). Ví dụ "H###" → H001; "CM-2026-####" → CM-2026-0001;
 * "TH/##/CB" → TH/01/CB. Không có "#" thì số nối vào cuối.
 * Mã không phân biệt hoa thường, bỏ khoảng trắng hai đầu khi so trùng. Hồ sơ trong thùng rác vẫn giữ mã (không dùng lại).
 */
import type { DuAn, Ho } from "./mo-hinh";

export const MAU_MA_MAC_DINH = "H###";

export const chuanMa = (ma: string) => ma.trim().toUpperCase();

function tachMau(mau: string): { dau: string; cuoi: string; soChu: number } {
  const m = /^(.*?)(#+)([^#]*)$/.exec(mau.trim() || MAU_MA_MAC_DINH);
  return m ? { dau: m[1]!, cuoi: m[3]!, soChu: m[2]!.length } : { dau: mau.trim(), cuoi: "", soChu: 1 };
}

export const mauMaCua = (duAn: Pick<DuAn, "mauMaHo"> | null | undefined) => duAn?.mauMaHo?.trim() || MAU_MA_MAC_DINH;

export function taoMa(mau: string, so: number): string {
  const { dau, cuoi, soChu } = tachMau(mau);
  return `${dau}${String(so).padStart(soChu, "0")}${cuoi}`;
}

/** Số lớn nhất đang dùng theo mẫu (mã khác mẫu không tính). */
function soLonNhat(maDs: Iterable<string>, mau: string): number {
  const { dau, cuoi } = tachMau(mau);
  const thoat = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${thoat(chuanMa(dau))}(\\d+)${thoat(chuanMa(cuoi))}$`);
  let max = 0;
  for (const ma of maDs) {
    const m = re.exec(chuanMa(ma));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

/** Mã kế tiếp = số lớn nhất theo mẫu + 1, bỏ qua mã đã dùng (kể cả hồ sơ đã xóa mềm). */
export function maHoTiepTheo(dsMa: Iterable<string>, mau: string): string {
  const daDung = new Set([...dsMa].map(chuanMa));
  let so = soLonNhat(daDung, mau) + 1;
  while (daDung.has(chuanMa(taoMa(mau, so)))) so++;
  return taoMa(mau, so);
}

/** Bộ sinh nhiều mã liên tiếp (tạo hàng loạt từ bản đồ, nhập Excel). */
export function boSinhMa(dsMa: Iterable<string>, mau: string): () => string {
  const daDung = new Set([...dsMa].map(chuanMa));
  return () => {
    const m = maHoTiepTheo(daDung, mau);
    daDung.add(chuanMa(m));
    return m;
  };
}

/** Hồ sơ khác trong dự án đã dùng mã này (null nếu không trùng). */
export function hoTrungMa<T extends Pick<Ho, "id" | "ma">>(dsHo: T[], ma: string, boQuaId?: string): T | null {
  const k = chuanMa(ma);
  return k ? dsHo.find((h) => h.id !== boQuaId && chuanMa(h.ma) === k) ?? null : null;
}

/** Các nhóm mã trùng trong dữ liệu hiện có (dữ liệu cũ) — để cảnh báo, không tự đổi. */
export function nhomMaTrung(dsHo: Pick<Ho, "id" | "ma" | "ten">[]): { ma: string; ho: Pick<Ho, "id" | "ma" | "ten">[] }[] {
  const m = new Map<string, Pick<Ho, "id" | "ma" | "ten">[]>();
  for (const h of dsHo) {
    const k = chuanMa(h.ma);
    if (!k) continue;
    m.set(k, [...(m.get(k) ?? []), h]);
  }
  return [...m].filter(([, ds]) => ds.length > 1).map(([ma, ho]) => ({ ma, ho }));
}

/** Kiểm tra mẫu mã người dùng nhập. */
export function loiMauMa(mau: string): string | null {
  const s = mau.trim();
  if (!s) return null;
  if (s.length > 30) return "Mẫu mã dài quá 30 ký tự";
  if (/[\\/:*?"<>|]/.test(s.replace(/\//g, ""))) return "Mẫu mã có ký tự không dùng được trong tên tệp (\\ : * ? \" < > |)";
  if ((s.match(/#+/g) ?? []).length > 1) return 'Chỉ dùng một dãy "#" làm chỗ đánh số';
  return null;
}
