/**
 * 1.0.7 — Lịch sử phiên bản tệp đính kèm, tài liệu dự án: "Tải bản mới" thay tệp đang dùng bằng tệp mới nhưng GIỮ bản cũ
 * (đánh dấu `thayBoi`, cùng nhóm `nhomPb`), xem lại, tải về, khôi phục được. Bản cũ vẫn có trong bản sao lưu; không tính
 * vào số tệp, không gửi trong gói tỉnh. Ghi nhật ký ở nơi gọi.
 */
import type { DinhKem, Kho } from "./kho";
import { taoId } from "./mo-hinh";

export const nhomCua = (x: DinhKem) => x.nhomPb ?? x.id;

/** Các bản trước của tệp `x` (cùng nhóm, đã được thay), mới nhất trước. */
export function banTruoc(ds: DinhKem[], x: DinhKem): DinhKem[] {
  const n = nhomCua(x);
  return ds.filter((y) => y.id !== x.id && y.thayBoi && !y.daXoa && nhomCua(y) === n).sort((a, b) => b.luc.localeCompare(a.luc));
}

/** Thông tin bản mới thay cho `cu` (giữ hồ sơ, bước, nhóm, số hiệu; ghi chú mới nếu có). */
export function metaBanMoi(cu: DinhKem, tep: { ten: string; loai: string; kichThuoc: number }, nguoi: string, ghiChu?: string, luc = new Date().toISOString()): { moi: DinhKem; cu: DinhKem } {
  const nhomPb = nhomCua(cu);
  const { daXoa: _x, thayBoi: _t, ghiChu: gcCu, ...giu } = cu;
  const moi: DinhKem = { ...giu, id: taoId(), nhomPb, ten: tep.ten, loai: tep.loai, kichThuoc: tep.kichThuoc, luc, nguoi, ...(ghiChu?.trim() ? { ghiChu: ghiChu.trim() } : gcCu ? { ghiChu: gcCu } : {}) };
  return { moi, cu: { ...cu, nhomPb, thayBoi: { id: moi.id, luc, nguoi } } };
}

export async function thayTep(kho: Kho, cu: DinhKem, tep: { ten: string; loai: string; bytes: Uint8Array }, nguoi: string, ghiChu?: string): Promise<DinhKem> {
  const bCu = await kho.docDinhKem(cu.id);
  if (!bCu) throw new Error("Không còn nội dung tệp đang dùng");
  const r = metaBanMoi(cu, { ten: tep.ten, loai: tep.loai, kichThuoc: tep.bytes.length }, nguoi, ghiChu);
  await kho.ghiLo({ dinhKem: [{ meta: r.cu, bytes: bCu }, { meta: r.moi, bytes: tep.bytes }] });
  return r.moi;
}

/** Khôi phục bản cũ `ban` thành bản đang dùng; bản đang dùng của nhóm trở thành bản trước. */
export function metaKhoiPhuc(ds: DinhKem[], ban: DinhKem, nguoi: string, luc = new Date().toISOString()): { ban: DinhKem; hienTai?: DinhKem } {
  const n = nhomCua(ban);
  const ht = ds.find((y) => y.id !== ban.id && !y.thayBoi && !y.daXoa && nhomCua(y) === n);
  const { thayBoi: _t, ...moi } = ban;
  return { ban: { ...moi, nhomPb: n }, hienTai: ht ? { ...ht, nhomPb: n, thayBoi: { id: ban.id, luc, nguoi } } : undefined };
}

export async function khoiPhucBan(kho: Kho, ds: DinhKem[], ban: DinhKem, nguoi: string): Promise<void> {
  const r = metaKhoiPhuc(ds, ban, nguoi);
  const lo: { meta: DinhKem; bytes: Uint8Array }[] = [];
  for (const m of [r.ban, r.hienTai]) {
    if (!m) continue;
    const b = await kho.docDinhKem(m.id);
    if (!b) throw new Error(`Không còn nội dung tệp "${m.ten}"`);
    lo.push({ meta: m, bytes: b });
  }
  await kho.ghiLo({ dinhKem: lo });
}

/**
 * Xóa hẳn tệp đang dùng (đã ở thùng rác) mà còn bản trước: "DUA_LEN" — bản trước gần nhất thành bản đang dùng (các bản
 * cũ hơn vẫn là bản trước của nó); "CA_NHOM" — xóa hẳn cả các bản trước. Không còn bản trước thì chỉ xóa tệp này.
 */
export async function xoaHanCoPhienBan(kho: Kho, ds: DinhKem[], x: DinhKem, cach: "DUA_LEN" | "CA_NHOM"): Promise<DinhKem | null> {
  const truoc = banTruoc(ds, x);
  if (cach === "CA_NHOM" || !truoc.length) {
    await kho.ghiLo({ dinhKem: [x, ...truoc].map((m) => ({ meta: m, bytes: null })) });
    return null;
  }
  const len = truoc[0]!;
  const b = await kho.docDinhKem(len.id);
  if (!b) throw new Error(`Không còn nội dung tệp "${len.ten}"`);
  const { thayBoi: _t, ...moi } = len;
  await kho.ghiLo({ dinhKem: [{ meta: x, bytes: null }, { meta: moi, bytes: b }] });
  return moi;
}
