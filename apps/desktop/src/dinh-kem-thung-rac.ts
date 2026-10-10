/**
 * Thùng rác tệp đính kèm, tài liệu dự án: "Xóa" chỉ đánh dấu (giữ nguyên nội dung tệp, vẫn có trong bản sao lưu) → khôi phục
 * được; "Xóa hẳn" mới bỏ nội dung (quyền XOA_HAN — Quản trị). Ghi nhật ký ở nơi gọi.
 */
import type { DinhKem, Kho } from "./kho";

/** Tệp đang dùng: chưa xóa và là bản hiện hành (bản cũ đã được thay — xem dinh-kem-phien-ban.ts). */
export const conDung = (x: DinhKem) => !x.daXoa && !x.thayBoi;
/** Tệp trong thùng rác. */
export const trongThungRac = (x: DinhKem) => !!x.daXoa;

export async function xoaMemTep(kho: Kho, x: DinhKem, nguoi: string): Promise<void> {
  const b = await kho.docDinhKem(x.id);
  if (!b) throw new Error("Không còn nội dung tệp này");
  await kho.ghiLo({ dinhKem: [{ meta: { ...x, daXoa: { luc: new Date().toISOString(), nguoi } }, bytes: b }] });
}

export async function khoiPhucTep(kho: Kho, x: DinhKem): Promise<void> {
  const b = await kho.docDinhKem(x.id);
  if (!b) throw new Error("Không còn nội dung tệp này");
  const { daXoa: _bo, ...meta } = x;
  await kho.ghiLo({ dinhKem: [{ meta, bytes: b }] });
}

export const xoaHanTep = (kho: Kho, x: DinhKem) => kho.ghiLo({ dinhKem: [{ meta: x, bytes: null }] });
