/**
 * 1.0.11 — Những thay đổi theo phiên bản (docs/nhung-thay-doi.md, mỗi phiên bản một mục "## X.Y.Z").
 * Ghi chú phát hành (latest.json) chứa vài mục gần nhất — phần mềm chỉ hiện các mục mới hơn bản đang dùng.
 */
export interface MucThayDoi {
  pb: string;
  dong: string[];
}

/** So sánh phiên bản X.Y.Z (âm: a < b). */
export function soPhienBan(a: string, b: string): number {
  const x = a.split(".").map((s) => parseInt(s, 10) || 0);
  const y = b.split(".").map((s) => parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** Tách các mục "## X.Y.Z"; mỗi gạch đầu dòng (kể cả dòng nối tiếp thụt lề) là một dòng. Văn bản không có mục → null. */
export function tachThayDoi(md: string): MucThayDoi[] | null {
  const muc: MucThayDoi[] = [];
  for (const k of md.replace(/\r\n?/g, "\n").split(/^## /m).slice(1)) {
    const [dau = "", ...than] = k.split("\n");
    const pb = dau.trim();
    if (!/^\d+\.\d+\.\d+$/.test(pb)) continue;
    const dong: string[] = [];
    for (const l of than) {
      if (/^\s*[-*] /.test(l)) dong.push(l.replace(/^\s*[-*] /, "").trim());
      else if (l.trim() && dong.length) dong[dong.length - 1] += " " + l.trim();
      else if (l.trim()) dong.push(l.trim());
    }
    muc.push({ pb, dong: dong.map((d) => d.replace(/\*\*/g, "")) });
  }
  return muc.length ? muc : null;
}

/** Các mục mới hơn bản đang dùng (đến bản mới), mới nhất trước. */
export const mucMoiHon = (muc: MucThayDoi[], hienTai: string, banMoi?: string) =>
  muc.filter((m) => soPhienBan(m.pb, hienTai) > 0 && (!banMoi || soPhienBan(m.pb, banMoi) <= 0)).sort((a, b) => soPhienBan(b.pb, a.pb));
