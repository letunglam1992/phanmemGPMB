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

