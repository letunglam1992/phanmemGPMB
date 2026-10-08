/**
 * 1.0.6 — Ý kiến của người có đất về dự thảo phương án và đối thoại (điểm a khoản 3 Điều 87 Luật Đất đai 2024):
 * - sau niêm yết 30 ngày, tổ chức lấy ý kiến bằng họp trực tiếp (không tham gia có lý do chính đáng thì gửi văn bản);
 *   biên bản ghi rõ số ý kiến đồng ý, không đồng ý, ý kiến khác;
 * - trong thời hạn 60 ngày kể từ ngày tổ chức lấy ý kiến, tổ chức đối thoại nếu còn ý kiến không đồng ý.
 * Phần mềm chỉ ghi nhận, đếm, nhắc hạn — không kết luận ý kiến đúng sai.
 */
import { hanChot, laNgayLamViec, type LichLamViec } from "./lich-lam-viec";
import type { Ho } from "./mo-hinh";

export type LoaiYKien = "DONG_Y" | "KHONG_DONG_Y" | "KHAC";
export const TEN_Y_KIEN: Record<LoaiYKien, string> = { DONG_Y: "Đồng ý", KHONG_DONG_Y: "Không đồng ý", KHAC: "Ý kiến khác" };

export interface LanDoiThoai {
  ngay: string;
  /** Số, ngày biên bản đối thoại */
  bienBan?: string;
  ketQua: "THONG_NHAT" | "CON_Y_KIEN";
  /** Nội dung tiếp thu, giải trình */
  noiDung?: string;
}
export interface YKienPA {
  /** Trống = chưa ghi ý kiến (mới ghi ngày lấy ý kiến) */
  loai?: LoaiYKien;
  /** Ngày tổ chức lấy ý kiến (họp trực tiếp) — mốc tính 60 ngày đối thoại */
  ngayLay?: string;
  hinhThuc?: "HOP" | "VAN_BAN";
  noiDung?: string;
  doiThoai?: LanDoiThoai[];
}

export const CAN_CU_DOI_THOAI = "điểm a khoản 3 Điều 87 Luật Đất đai 2024";
export const SO_NGAY_DOI_THOAI = 60;

/** Hạn tổ chức đối thoại: 60 ngày kể từ ngày lấy ý kiến; ngày cuối là ngày nghỉ → ngày làm việc tiếp theo (k5 Đ148 BLDS). */
export function hanDoiThoai(ngayLay: string, lich: LichLamViec): string {
  let hc = hanChot(ngayLay, SO_NGAY_DOI_THOAI, "N", lich);
  while (!laNgayLamViec(hc, lich)) hc = hanChot(hc, 1, "N", lich);
  return hc;
}

export type TrangThaiDoiThoai = "CHUA_GHI" | "KHONG_CAN" | "CAN_DOI_THOAI" | "QUA_HAN" | "DA_THONG_NHAT" | "CON_Y_KIEN";
export const TEN_TT_DOI_THOAI: Record<TrangThaiDoiThoai, string> = {
  CHUA_GHI: "Chưa ghi ý kiến",
  KHONG_CAN: "Không phải đối thoại",
  CAN_DOI_THOAI: "Cần đối thoại",
  QUA_HAN: "Quá hạn đối thoại",
  DA_THONG_NHAT: "Đã đối thoại, thống nhất",
  CON_Y_KIEN: "Đã đối thoại, còn ý kiến",
};

export function trangThaiDoiThoai(y: YKienPA | undefined, homNay: string, lich: LichLamViec): { tt: TrangThaiDoiThoai; han?: string } {
  if (!y?.loai) return { tt: "CHUA_GHI" };
  if (y.loai !== "KHONG_DONG_Y") return { tt: "KHONG_CAN" };
  const han = y.ngayLay ? hanDoiThoai(y.ngayLay, lich) : undefined;
  const cuoi = [...(y.doiThoai ?? [])].filter((d) => d.ngay).sort((a, b) => a.ngay.localeCompare(b.ngay)).pop();
  if (cuoi) return { tt: cuoi.ketQua === "THONG_NHAT" ? "DA_THONG_NHAT" : "CON_Y_KIEN", han };
  return { tt: han && homNay > han ? "QUA_HAN" : "CAN_DOI_THOAI", han };
}

/** Đếm ý kiến theo loại (biên bản lấy ý kiến — mẫu 08). */
export function demYKien(ds: Pick<Ho, "yKienPA">[]): { dongY: number; khongDongY: number; khac: number; chuaGhi: number } {
  const r = { dongY: 0, khongDongY: 0, khac: 0, chuaGhi: 0 };
  for (const h of ds) {
    const l = h.yKienPA?.loai;
    if (l === "DONG_Y") r.dongY++;
    else if (l === "KHONG_DONG_Y") r.khongDongY++;
    else if (l === "KHAC") r.khac++;
    else r.chuaGhi++;
  }
  return r;
}
