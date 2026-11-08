/**
 * 1.3.5 — số tờ bản đồ của thửa: điền một lần. Gợi ý khi thêm thửa, điền cho thửa còn trống: số tờ thửa trước của hộ →
 * số tờ dùng nhiều nhất trong dự án → số tờ nhập cho tệp bản đồ của dự án.
 */
import type { DuAn, Ho } from "./mo-hinh";

export function soToGoiY(duAn: Pick<DuAn, "banDo">, hos: Ho[], h?: Ho): string {
  const cuaHo = (h?.thua ?? []).map((t) => t.soTo.trim()).filter(Boolean);
  if (cuaHo.length) return cuaHo[cuaHo.length - 1]!;
  const dem = new Map<string, number>();
  for (const x of hos) for (const t of x.thua) if (t.soTo.trim()) dem.set(t.soTo.trim(), (dem.get(t.soTo.trim()) ?? 0) + 1);
  const nhieu = [...dem].sort((a, b) => b[1] - a[1])[0];
  return nhieu?.[0] ?? duAn.banDo?.soTo?.trim() ?? "";
}

/** Số thửa còn trống số tờ. */
export const soThuaTrongTo = (hos: Ho[]) => hos.reduce((s, h) => s + h.thua.filter((t) => !t.soTo.trim()).length, 0);

/** Điền số tờ cho các thửa còn trống; trả hồ sơ có thay đổi (giữ nguyên thửa đã có số tờ). */
export function dienSoToTrong(hos: Ho[], soTo: string): Ho[] {
  const v = soTo.trim();
  if (!v) return [];
  return hos.filter((h) => h.thua.some((t) => !t.soTo.trim())).map((h) => ({ ...h, thua: h.thua.map((t) => (t.soTo.trim() ? t : { ...t, soTo: v })) }));
}
