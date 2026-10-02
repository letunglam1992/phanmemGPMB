/**
 * Ràng buộc khi xóa (P0-4) — không để mất phương án, chứng từ chi trả. Dùng ở giao diện; máy chủ mạng nội bộ kiểm lại
 * cùng quy tắc (may_chu.rs `kiem_tra_xoa_ho`).
 * - Hộ có trong bản phương án đã chốt / đã phê duyệt (chưa hủy) → không xóa; hủy bản phương án (có lý do) hoặc lập bản điều chỉnh.
 * - Hộ đã có đợt chi trả (chưa hủy) → không xóa.
 * - Dự án có bản phương án đã phê duyệt hoặc có hộ đã chi trả → không xóa.
 * Xóa là xóa mềm (vào thùng rác, khôi phục được); xóa hẳn chỉ Quản trị, sau THOI_HAN_THUNG_RAC ngày (QD-25).
 */
import { dotHieuLuc } from "./chi-tra";
import type { DuAn, Ho } from "./mo-hinh";

export const THOI_HAN_THUNG_RAC = 30;

export interface DauXoa {
  luc: string;
  nguoi: string;
  lyDo: string;
}

export function lyDoKhongXoaHo(duAn: DuAn | undefined, h: Ho): string[] {
  const ly: string[] = [];
  for (const p of duAn?.phuongAn ?? []) {
    if (p.trangThai === "DA_HUY" || !p.ho.some((x) => x.hoId === h.id)) continue;
    ly.push(`có trong bản phương án số ${p.so} ${p.trangThai === "DA_PHE_DUYET" ? `đã phê duyệt${p.pheDuyet?.so ? ` (${p.pheDuyet.so})` : ""}` : "đã chốt"}`);
  }
  const chi = dotHieuLuc(h.chiTra).length;
  if (chi) ly.push(`đã ghi ${chi} đợt chi trả`);
  return ly;
}

export function lyDoKhongXoaDuAn(duAn: DuAn, dsHo: Ho[]): string[] {
  const ly: string[] = [];
  const duyet = (duAn.phuongAn ?? []).filter((p) => p.trangThai === "DA_PHE_DUYET");
  if (duyet.length) ly.push(`có ${duyet.length} bản phương án đã phê duyệt`);
  const daChi = dsHo.filter((h) => !h.daXoa && dotHieuLuc(h.chiTra).length);
  if (daChi.length) ly.push(`${daChi.length} hộ đã ghi chi trả`);
  return ly;
}

/** Số ngày đã nằm trong thùng rác. */
export const soNgayTrongThungRac = (d: DauXoa, bayGio = new Date()) => Math.floor((bayGio.getTime() - new Date(d.luc).getTime()) / 86_400_000);
export const duocXoaHan = (d: DauXoa, bayGio = new Date()) => soNgayTrongThungRac(d, bayGio) >= THOI_HAN_THUNG_RAC;
