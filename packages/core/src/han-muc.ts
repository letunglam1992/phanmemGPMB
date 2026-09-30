/**
 * Hạn mức theo Phụ lục I QĐ 106/2025/QĐ-UBND (nguyên văn: policy/nguon/qd106-2025-phu-luc-1.md):
 * - Điều 3, 4: hạn mức công nhận đất ở (khoản 5 Điều 141 LĐĐ) — dùng cho khoản 1, 2 Điều 8, khoản 1 Điều 9, khoản 1 Điều 10 NĐ 88;
 * - Điều 5, 6: hạn mức giao đất ở tại nông thôn / đô thị (khoản 2 Điều 195, khoản 2 Điều 196 LĐĐ) — khoản 3 Điều 8, khoản 2 Điều 9;
 * - Điều 7: hạn mức giao đất nông nghiệp đối với đất tự khai hoang (khoản 4 Điều 139 LĐĐ) — đoạn 2 khoản 2 Điều 12 NĐ 88.
 * Vị trí thửa do cán bộ chọn; hàm chỉ tra bảng, không suy đoán vị trí.
 */
import type { BoChinhSach } from "./chinh-sach";
import type { CanCu } from "./types";

/**
 * TRUNG_TAM – tại xã: trung tâm xã theo quy hoạch được duyệt hoặc tiếp giáp quốc lộ, đường tỉnh; tại phường: giáp quốc lộ,
 * đường tỉnh, đường giao thông (hiện trạng hoặc quy hoạch) rộng từ 13 m trở lên.
 * DUONG_XA – tại xã: chỉ tiếp giáp đường xã (Điều 3, 4: thuộc điểm a; Điều 5: thuộc khoản 2 "vị trí còn lại").
 * CON_LAI – các vị trí còn lại.
 */
export type ViTriHanMuc = "TRUNG_TAM" | "DUONG_XA" | "CON_LAI";

export const TEN_VI_TRI_HAN_MUC: Record<"XA" | "PHUONG", Partial<Record<ViTriHanMuc, string>>> = {
  XA: {
    TRUNG_TAM: "Trung tâm xã theo quy hoạch được duyệt; tiếp giáp quốc lộ, đường tỉnh",
    DUONG_XA: "Tiếp giáp đường xã (không thuộc trường hợp trên)",
    CON_LAI: "Vị trí còn lại",
  },
  PHUONG: {
    TRUNG_TAM: "Giáp quốc lộ, đường tỉnh; đường giao thông hiện trạng hoặc quy hoạch rộng từ 13 m trở lên",
    CON_LAI: "Vị trí còn lại",
  },
};

/** Tên đơn vị hành chính bắt đầu bằng "Phường" → địa bàn phường; còn lại là xã (Sơn La không có thị trấn sau sắp xếp 2025). */
export const laPhuong = (xa: string) => /^phường\b/i.test(xa.trim());

export interface KetQuaHanMuc {
  m2: string;
  canCu: CanCu[];
  /** Mô tả ngắn: "Điều 3 Phụ lục I QĐ 106/2025/QĐ-UBND, tại xã, điểm a khoản 1". */
  moTa: string;
}

const moTaCc = (c: CanCu[], them: string) => `${c.map((x) => `${x.viTri} ${x.vanBan}`).join("; ")}${them ? `, ${them}` : ""}`;

/**
 * Hạn mức đất ở theo Phụ lục I. loai CONG_NHAN: ngày sử dụng trước 18/12/1980 → Điều 3; đến trước 15/10/1993 → Điều 4;
 * từ 15/10/1993 trở về sau không có hạn mức công nhận theo Điều 3, 4 (trả null). loai GIAO: Điều 5 (xã) / Điều 6 (phường).
 */
export function hanMucDatOPl1(cs: BoChinhSach, p: { loai: "CONG_NHAN" | "GIAO"; ngaySuDung: string; xa: string; viTri: ViTriHanMuc }): KetQuaHanMuc | null {
  const h = cs.hanMucPl1;
  if (!h) return null;
  const phuong = laPhuong(p.xa);
  const vt = phuong && p.viTri === "DUONG_XA" ? "CON_LAI" : p.viTri;
  if (p.loai === "CONG_NHAN") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.ngaySuDung) || p.ngaySuDung >= "1993-10-15") return null;
    const truoc1980 = p.ngaySuDung < "1980-12-18";
    const b = truoc1980 ? h.congNhanTruoc1980 : h.congNhanTruoc1993;
    const m2 = phuong ? b.phuong[vt as "TRUNG_TAM" | "CON_LAI"] : b.xa[vt];
    const diem = vt === "CON_LAI" ? "b" : "a";
    return { m2, canCu: b.canCu, moTa: moTaCc(b.canCu, `điểm ${diem} khoản ${phuong ? 2 : 1} (tại ${phuong ? "phường" : "xã"})`) };
  }
  if (phuong) {
    const b = h.giaoDoThi;
    return { m2: b[vt as "TRUNG_TAM" | "CON_LAI"], canCu: b.canCu, moTa: moTaCc(b.canCu, `điểm ${vt === "TRUNG_TAM" ? "a" : "b"} khoản 1`) };
  }
  const b = h.giaoNongThon;
  return { m2: b[vt], canCu: b.canCu, moTa: moTaCc(b.canCu, `khoản ${vt === "TRUNG_TAM" ? 1 : 2}`) };
}

const HANG_NAM = ["LUC", "LUK", "LUN", "BHK", "NHK", "HNK", "NTS"];

/**
 * Hạn mức giao đất nông nghiệp đối với đất tự khai hoang (khoản 1 Điều 7 Phụ lục I). Đất rừng đặc dụng và loại đất khác
 * không có trong Điều 7 → null (cán bộ nhập kèm căn cứ). Đất rừng sản xuất chỉ áp dụng khi là rừng trồng — kèm lưu ý.
 */
export function hanMucKhaiHoangPl1(cs: BoChinhSach, p: { loaiDat: string; xa: string }): (KetQuaHanMuc & { luuY?: string }) | null {
  const h = cs.hanMucPl1?.khaiHoang;
  if (!h) return null;
  const ma = p.loaiDat.trim().toUpperCase();
  const phuong = laPhuong(p.xa);
  const noi = phuong ? "phường" : "xã";
  if (HANG_NAM.includes(ma)) return { m2: h.hangNamNts, canCu: h.canCu, moTa: moTaCc(h.canCu, "điểm a") };
  if (ma === "CLN") return { m2: phuong ? h.lauNam.phuong : h.lauNam.xa, canCu: h.canCu, moTa: moTaCc(h.canCu, `điểm b (tại ${noi})`) };
  if (ma === "RSX" || ma === "RPH")
    return { m2: phuong ? h.rung.phuong : h.rung.xa, canCu: h.canCu, moTa: moTaCc(h.canCu, `điểm c (tại ${noi})`), ...(ma === "RSX" ? { luuY: "Điểm c khoản 1 Điều 7 chỉ áp dụng cho đất rừng sản xuất là rừng trồng — cán bộ xác nhận" } : {}) };
  return null;
}
