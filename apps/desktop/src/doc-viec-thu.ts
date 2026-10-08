/** Đọc danh sách việc cần thử trên máy thật từ docs/22 (dùng chung cho tools/tao-viec-thu.mjs, không import gì). */
export interface NhomThu {
  ten: string;
  viec: string[];
}

/** Đọc các nhóm "### A…" và dòng "- [ ] …" (bỏ ký hiệu Markdown đậm, mã). */
export function docViecThu(md: string): NhomThu[] {
  const ra: NhomThu[] = [];
  let cur: NhomThu | null = null;
  for (const dong of md.split(/\r?\n/)) {
    const h = /^###\s+(A\d*\..*)$/.exec(dong);
    if (h) {
      cur = { ten: h[1]!.trim(), viec: [] };
      ra.push(cur);
      continue;
    }
    if (/^#{1,3}\s/.test(dong)) {
      cur = null;
      continue;
    }
    const v = /^- \[ \]\s+(.*)$/.exec(dong);
    if (cur && v) cur.viec.push(v[1]!.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim());
  }
  return ra.filter((n) => n.viec.length);
}
