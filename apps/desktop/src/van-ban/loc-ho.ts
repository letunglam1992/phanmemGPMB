/** Chuỗi so khớp khi lọc hộ: bỏ dấu, khoảng trắng, gạch, số 0 đầu ("HO80" khớp "HO-080", "ho 80"). */
export const chuanTimHo = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(^|\D)0+(?=\d)/g, "$1");
export const khopLocHo = (loc: string, h: { ma: string; ten: string }) => !loc.trim() || chuanTimHo(`${h.ma} ${h.ten}`).includes(chuanTimHo(loc)) || `${h.ma} ${h.ten}`.toLowerCase().includes(loc.trim().toLowerCase());
