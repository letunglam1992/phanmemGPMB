/**
 * Bản nháp hồ sơ đang sửa chưa lưu (P0-1) — chỉ giữ trong bộ nhớ của phiên làm việc (không ghi đĩa, tránh để lại
 * thông tin cá nhân ngoài kho dữ liệu). Giữ được khi một vùng giao diện gặp lỗi, khi chuyển màn rồi quay lại.
 */
import type { Ho } from "./mo-hinh";

const banNhap = new Map<string, { h: Ho; luc: string }>();

export const layBanNhap = (hoId: string) => banNhap.get(hoId) ?? null;
export const ghiBanNhap = (h: Ho) => void banNhap.set(h.id, { h, luc: new Date().toISOString() });
export const xoaBanNhap = (hoId: string) => void banNhap.delete(hoId);
