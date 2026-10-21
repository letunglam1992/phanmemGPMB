/**
 * 1.0.20 (B1) — Sổ theo dõi khiếu nại, kiến nghị của hộ trong bồi thường, hỗ trợ, tái định cư.
 * Thời hạn theo Luật Khiếu nại 2011 và Nghị định 124/2020/NĐ-CP:
 * - thụ lý (1.0.21): 10 ngày làm việc kể từ ngày nhận được khiếu nại thuộc thẩm quyền (khoản 1 Điều 16 NĐ 124/2020);
 *   đơn nhận từ 01/7/2026: 07 ngày làm việc (Điều 27, khoản 1 Điều 36 Luật Khiếu nại sửa bởi điểm b khoản 15 Điều 2 Luật
 *   136/2025/QH15; khoản 1 Điều 16 NĐ 124 sửa bởi Điều 10 NĐ 155/2026/NĐ-CP — cùng hiệu lực 01/7/2026);
 * - giải quyết lần đầu (Điều 28): ≤ 30 ngày kể từ ngày thụ lý, vụ việc phức tạp ≤ 45 ngày; vùng sâu, vùng xa đi lại
 *   khó khăn ≤ 45 ngày, phức tạp ≤ 60 ngày;
 * - giải quyết lần hai (Điều 37): ≤ 45 ngày, phức tạp ≤ 60 ngày; vùng sâu, vùng xa ≤ 60 ngày, phức tạp ≤ 70 ngày.
 * "Phức tạp", "vùng sâu, vùng xa" do cán bộ đánh dấu (phần mềm không tự xác định). Kiến nghị, phản ánh không thuộc Luật
 * Khiếu nại → hạn do đơn vị nhập kèm căn cứ (không có thì không tính hạn). Hạn đếm theo ngày như câu chữ của Luật; ngày
 * thứ nhất là ngày liền sau ngày mốc (Điều 147 BLDS 2015), ngày cuối là ngày nghỉ thì sang ngày làm việc tiếp theo (k5 Đ148). Phần mềm ghi nhận, nhắc hạn — không kết luận đúng sai.
 */
import { hanChot, hanChotNgay, type LichLamViec } from "./lich-lam-viec";
import type { Ho } from "./mo-hinh";

export type LoaiDon = "KHIEU_NAI" | "KIEN_NGHI";
export const TEN_LOAI_DON: Record<LoaiDon, string> = { KHIEU_NAI: "Khiếu nại", KIEN_NGHI: "Kiến nghị, phản ánh" };

export type KetQuaDon = "DUNG" | "DUNG_MOT_PHAN" | "SAI" | "RUT" | "TRA_LOI";
export const TEN_KET_QUA_DON: Record<KetQuaDon, string> = {
  DUNG: "Khiếu nại đúng",
  DUNG_MOT_PHAN: "Đúng một phần",
  SAI: "Khiếu nại sai",
  RUT: "Rút đơn (đình chỉ)",
  TRA_LOI: "Đã trả lời, giải thích",
};

export interface DonKhieuNai {
  id: string;
  loai: LoaiDon;
  /** Khiếu nại: lần giải quyết (1 hoặc 2) */
  lan?: 1 | 2;
  ngayNhan: string;
  ngayThuLy?: string;
  /** Quyết định, hành vi bị khiếu nại / nội dung kiến nghị */
  doiTuong?: string;
  noiDung: string;
  /** Người, cơ quan có thẩm quyền giải quyết */
  coQuan?: string;
  phucTap?: boolean;
  vungKhoKhan?: boolean;
  /** Kiến nghị: số ngày trả lời do đơn vị nhập, kèm căn cứ */
  hanNhap?: { soNgay: number; canCu: string };
  /** Kết quả: số, ngày quyết định giải quyết / văn bản trả lời */
  soVb?: string;
  ngayVb?: string;
  ketQua?: KetQuaDon;
  ghiChu?: string;
  nguoiGhi?: string;
}

/** Ngày NĐ 155/2026/NĐ-CP có hiệu lực (khoản 1 Điều 21) — thụ lý rút từ 10 xuống 07 ngày làm việc. */
export const NGAY_HL_ND155 = "2026-07-01";
/** Số ngày làm việc để thụ lý theo ngày nhận đơn (khoản 1 Điều 16 NĐ 124/2020/NĐ-CP, sửa bởi Điều 10 NĐ 155/2026/NĐ-CP). */
export const soNgayThuLy = (ngayNhan: string) => (ngayNhan >= NGAY_HL_ND155 ? 7 : 10);
export const CAN_CU_THU_LY = (lan: 1 | 2, ngayNhan = "") =>
  ngayNhan >= NGAY_HL_ND155
    ? `k1 Điều 16 NĐ 124/2020/NĐ-CP (sửa bởi Điều 10 NĐ 155/2026/NĐ-CP); ${lan === 1 ? "Điều 27" : "khoản 1 Điều 36"} Luật Khiếu nại (sửa bởi Luật 136/2025/QH15)`
    : `k1 Điều 16 NĐ 124/2020/NĐ-CP; Điều ${lan === 1 ? 27 : 36} Luật Khiếu nại 2011`;
export const CAN_CU_GIAI_QUYET = (lan: 1 | 2) => `Điều ${lan === 1 ? 28 : 37} Luật Khiếu nại 2011`;

/** Số ngày giải quyết theo Điều 28 (lần 1) / Điều 37 (lần 2) Luật Khiếu nại 2011. */
export function soNgayGiaiQuyet(lan: 1 | 2, phucTap: boolean, vungKhoKhan: boolean): number {
  const bang = lan === 1 ? [30, 45, 45, 60] : [45, 60, 60, 70];
  return bang[(vungKhoKhan ? 2 : 0) + (phucTap ? 1 : 0)]!;
}

export type TrangThaiDon = "CHO_THU_LY" | "QUA_HAN_THU_LY" | "DANG_GIAI_QUYET" | "SAP_HET" | "QUA_HAN" | "DA_GIAI_QUYET" | "KHONG_TINH_HAN";
export const TEN_TT_DON: Record<TrangThaiDon, string> = {
  CHO_THU_LY: "Chờ thụ lý",
  QUA_HAN_THU_LY: "Quá hạn thụ lý",
  DANG_GIAI_QUYET: "Đang giải quyết",
  SAP_HET: "Sắp hết hạn",
  QUA_HAN: "Quá hạn giải quyết",
  DA_GIAI_QUYET: "Đã giải quyết",
  KHONG_TINH_HAN: "Không tính hạn (thiếu căn cứ)",
};

export interface HanDon {
  tt: TrangThaiDon;
  /** Hạn thụ lý (khiếu nại chưa thụ lý) hoặc hạn giải quyết / trả lời */
  han?: string;
  soNgay?: number;
  canCu?: string;
  /** Số ngày còn lại (≥ 0) hoặc số ngày đã quá (< 0) tính đến hôm nay */
  conLai?: number;
}

const soNgay = (tu: string, den: string) => Math.round((Date.parse(den) - Date.parse(tu)) / 86400000);
/** Còn ≤ 5 ngày thì nhắc "sắp hết hạn". */
export const NGAY_NHAC_DON = 5;

export function hanDon(d: DonKhieuNai, homNay: string, lich: LichLamViec): HanDon {
  if (d.ketQua) return { tt: "DA_GIAI_QUYET" };
  if (d.loai === "KIEN_NGHI") {
    if (!d.hanNhap?.soNgay || !d.hanNhap.canCu.trim()) return { tt: "KHONG_TINH_HAN" };
    const han = hanChotNgay(d.ngayNhan, d.hanNhap.soNgay, lich);
    const conLai = soNgay(homNay, han);
    return { tt: conLai < 0 ? "QUA_HAN" : conLai <= NGAY_NHAC_DON ? "SAP_HET" : "DANG_GIAI_QUYET", han, soNgay: d.hanNhap.soNgay, canCu: d.hanNhap.canCu, conLai };
  }
  const lan = d.lan ?? 1;
  if (!d.ngayThuLy) {
    const n = soNgayThuLy(d.ngayNhan);
    const han = hanChot(d.ngayNhan, n, "NLV", lich);
    const conLai = soNgay(homNay, han);
    return { tt: conLai < 0 ? "QUA_HAN_THU_LY" : "CHO_THU_LY", han, soNgay: n, canCu: CAN_CU_THU_LY(lan, d.ngayNhan), conLai };
  }
  const n = soNgayGiaiQuyet(lan, !!d.phucTap, !!d.vungKhoKhan);
  const han = hanChotNgay(d.ngayThuLy, n, lich);
  const conLai = soNgay(homNay, han);
  return { tt: conLai < 0 ? "QUA_HAN" : conLai <= NGAY_NHAC_DON ? "SAP_HET" : "DANG_GIAI_QUYET", han, soNgay: n, canCu: CAN_CU_GIAI_QUYET(lan), conLai };
}

/** Đơn chưa có kết quả của hộ */
export const donDangMo = (h: Ho) => (h.khieuNai ?? []).filter((d) => !d.ketQua);

export interface ThongKeDon {
  tong: number;
  dangGiaiQuyet: number;
  quaHan: number;
  daGiaiQuyet: number;
  soHo: number;
}

export function thongKeDon(hos: Ho[], homNay: string, lich: LichLamViec): ThongKeDon {
  const tk: ThongKeDon = { tong: 0, dangGiaiQuyet: 0, quaHan: 0, daGiaiQuyet: 0, soHo: 0 };
  for (const h of hos) {
    const ds = h.khieuNai ?? [];
    if (ds.length) tk.soHo++;
    for (const d of ds) {
      tk.tong++;
      const t = hanDon(d, homNay, lich).tt;
      if (t === "DA_GIAI_QUYET") tk.daGiaiQuyet++;
      else {
        tk.dangGiaiQuyet++;
        if (t === "QUA_HAN" || t === "QUA_HAN_THU_LY") tk.quaHan++;
      }
    }
  }
  return tk;
}
