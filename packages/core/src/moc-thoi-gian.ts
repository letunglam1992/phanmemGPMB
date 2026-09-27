/**
 * Chọn mức theo mốc thời gian đúng như văn bản ghi "trước", "từ", "sau", "đến trước".
 * Khoảng không phủ kín (vd. đúng ngày 01/7/2014 ở k3.2 Đ6 QĐ 14/2026) được phát hiện
 * tự động và trả về các mức liền kề để người dùng chọn (QD-12).
 */
export interface KhoangThoiGian<T> {
  /** ISO yyyy-mm-dd; bỏ trống = không giới hạn dưới */
  tu?: string;
  baoGomTu?: boolean;
  /** ISO yyyy-mm-dd hoặc "TB" (ngày thông báo thu hồi đất); bỏ trống = không giới hạn trên */
  den?: string;
  baoGomDen?: boolean;
  giaTri: T;
  moTa: string;
}

export type KetQuaMoc<T> =
  | { loai: "KHOP"; khoang: KhoangThoiGian<T> }
  | { loai: "KHOANG_TRONG"; lienKe: KhoangThoiGian<T>[] }
  | { loai: "NGOAI_PHAM_VI" };

function trong<T>(ngay: string, k: KhoangThoiGian<T>, ngayTB?: string): boolean {
  const den = k.den === "TB" ? ngayTB : k.den;
  if (k.den === "TB" && !ngayTB) return false;
  if (k.tu && (k.baoGomTu ? ngay < k.tu : ngay <= k.tu)) return false;
  if (den && (k.baoGomDen ? ngay > den : ngay >= den)) return false;
  return true;
}

export function chonTheoMoc<T>(ngay: string, cacKhoang: KhoangThoiGian<T>[], ngayTB?: string): KetQuaMoc<T> {
  const khop = cacKhoang.find((k) => trong(ngay, k, ngayTB));
  if (khop) return { loai: "KHOP", khoang: khop };
  if (ngayTB && ngay >= ngayTB) return { loai: "NGOAI_PHAM_VI" };
  // ngày rơi vào khe giữa hai khoảng: trả về khoảng kết thúc tại ngày đó và khoảng bắt đầu tại ngày đó
  const lienKe = cacKhoang.filter((k) => k.den === ngay || k.tu === ngay);
  return lienKe.length ? { loai: "KHOANG_TRONG", lienKe } : { loai: "NGOAI_PHAM_VI" };
}
