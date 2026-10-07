/** Tìm kiếm không phân biệt hoa thường, dấu tiếng Việt (tìm chung Ctrl + K, danh sách hồ sơ). */
/** Chuẩn hóa để tìm không phân biệt hoa thường, dấu. */
export const khongDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Hồ sơ khớp từ khóa: mã, tên, địa chỉ, số định danh, số tờ/thửa ("5/85", "tờ 5 thửa 85"), tên dự án. */
export function khopTuKhoa(x: { h: { ma: string; ten: string; diaChi: string; soDinhDanh: string; thua: { soTo: string; soThua: string }[] }; duAnTen: string }, tuKhoa: string): boolean {
  const q = khongDau(tuKhoa.trim());
  if (!q) return true;
  const chuoi = khongDau([x.h.ma, x.h.ten, x.h.diaChi, x.h.soDinhDanh, x.duAnTen, ...x.h.thua.map((t) => `${t.soTo}/${t.soThua} to ${t.soTo} thua ${t.soThua}`)].join(" | "));
  return q.split(/\s+/).every((tu) => chuoi.includes(tu));
}


/** "5/85", "tờ 5 thửa 85", "t5 th85" → { to, thua } (so khớp đúng số, bỏ số 0 đầu); khác → null. */
export function docToThua(q: string): { to: string; thua: string } | null {
  const k = khongDau(q.trim());
  const a = /^(\d+)\s*\/\s*(\d+)$/.exec(k) ?? /^(?:to|t)\s*(\d+)\s*,?\s*(?:thua|th)\s*(\d+)$/.exec(k);
  if (a) return { to: String(Number(a[1])), thua: String(Number(a[2])) };
  const b = /^(?:thua|th)\s*(\d+)\s*,?\s*(?:to|t)\s*(\d+)$/.exec(k);
  return b ? { to: String(Number(b[2])), thua: String(Number(b[1])) } : null;
}
const soChuan = (s: string) => (/^\d+$/.test(s.trim()) ? String(Number(s.trim())) : s.trim());

type HoTim = { ma: string; ten: string; diaChi: string; soDinhDanh: string; thua: { id?: string; soTo: string; soThua: string; loaiDat?: string; dienTichThuHoi?: string; lyTrinh?: import("./ly-trinh").LyTrinh }[] };

/**
 * Tìm chung (Ctrl + K, 1.0.4): tờ/thửa so đúng số (5/85 không ra 15/85, 5/850); số định danh từ 4 chữ số khớp phần
 * đầu hoặc cuối; lý trình (Km1+200) ra thửa có đoạn chứa điểm đó; còn lại như khopTuKhoa. Trả lý do khớp để hiện.
 */
export function timHo(h: HoTim, tuKhoa: string, duAnTen = ""): { khop: boolean; lyDo?: string; thuaId?: string } {
  const q = tuKhoa.trim();
  if (!q) return { khop: true };
  const tt = docToThua(q);
  if (tt) {
    const t = h.thua.find((x) => soChuan(x.soTo) === tt.to && soChuan(x.soThua) === tt.thua);
    return t ? { khop: true, lyDo: `Thửa ${t.soThua} tờ ${t.soTo}${t.loaiDat ? ` · ${t.loaiDat}` : ""}`, thuaId: t.id } : { khop: false };
  }
  const so = q.replace(/[\s.]/g, "");
  if (/^\d{4,12}$/.test(so) && h.soDinhDanh) {
    const dd = h.soDinhDanh.replace(/\D/g, "");
    if (dd.startsWith(so) || dd.endsWith(so)) return { khop: true, lyDo: `Số định danh …${dd.slice(-4)}` };
  }
  if (/^\s*(?:km\s*)?\d+\s*\+\s*\d/i.test(q)) {
    const m = docDiemTim(q);
    if (m !== null) {
      const t = h.thua.find((x) => x.lyTrinh && m >= x.lyTrinh.tu && m <= (x.lyTrinh.den ?? x.lyTrinh.tu));
      return t ? { khop: true, lyDo: `Thửa ${t.soThua} tờ ${t.soTo} · lý trình chứa ${q.trim()}`, thuaId: t.id } : { khop: false };
    }
  }
  return { khop: khopTuKhoa({ h, duAnTen }, q) };
}
const docDiemTim = (q: string) => {
  const a = /^\s*(?:km\s*)?(\d{1,4})\s*\+\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*$/i.exec(q);
  return a ? Number(a[1]) * 1000 + Number(a[2]!.replace(",", ".")) : null;
};
