/**
 * 1.1.0 (D3) — Mốc bàn giao đất trên thực địa cho người được giao đất, cho thuê đất (chủ đầu tư) sau giải phóng mặt bằng
 * (Mẫu số 06 Phụ lục NĐ 102/2024/NĐ-CP — mẫu T23 của phần mềm). Ghi tự động khi tạo T23 (ngày ký, bên nhận, diện tích, quyết định
 * giao đất) hoặc cán bộ ghi tay; dùng cho Tổng quan dự án, báo cáo tiến độ, gói gửi tỉnh. Phần mềm chỉ ghi nhận mốc, không đặt
 * thời hạn bàn giao (văn bản không quy định số ngày).
 */
import type { DuAn } from "./mo-hinh";

export interface BanGiaoThucDia {
  id: string;
  /** Ngày lập biên bản bàn giao (ISO) */
  ngay: string;
  /** Đợt thu hồi (dự án có đợt); trống = cả dự án */
  dotId?: string;
  benNhan: string;
  /** Diện tích bàn giao (m², chuỗi số như người dùng nhập/biểu) */
  dienTich?: string;
  /** Quyết định giao đất/cho thuê đất (số, ngày) */
  qdGiaoDat?: string;
  ghiChu?: string;
}

export const CAN_CU_BAN_GIAO_THUC_DIA = "Mẫu số 06 Phụ lục NĐ 102/2024/NĐ-CP";

/** Thêm mốc; cùng đợt và cùng ngày thì thay bản cũ (tạo lại biên bản). */
export function ghiBanGiaoThucDia(duAn: DuAn, m: Omit<BanGiaoThucDia, "id"> & { id?: string }): DuAn {
  const ds = (duAn.banGiaoThucDia ?? []).filter((x) => x.id !== m.id && !(x.ngay === m.ngay && (x.dotId ?? "") === (m.dotId ?? "")));
  const moi: BanGiaoThucDia = { ...m, id: m.id ?? `bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
  return { ...duAn, banGiaoThucDia: [...ds, moi].sort((a, b) => a.ngay.localeCompare(b.ngay)) };
}

export const xoaBanGiaoThucDia = (duAn: DuAn, id: string): DuAn => ({ ...duAn, banGiaoThucDia: (duAn.banGiaoThucDia ?? []).filter((x) => x.id !== id) });

/** Mốc mới nhất (của đợt `dotId` nếu có; không truyền = mọi đợt). */
export function mocBanGiaoMoiNhat(duAn: DuAn, dotId?: string): BanGiaoThucDia | undefined {
  const ds = (duAn.banGiaoThucDia ?? []).filter((x) => dotId === undefined || (x.dotId ?? "") === dotId);
  return ds.length ? ds.reduce((a, b) => (b.ngay > a.ngay ? b : a)) : undefined;
}
