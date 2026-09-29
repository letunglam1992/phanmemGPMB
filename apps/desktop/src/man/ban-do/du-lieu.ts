import { CAU_HINH_MAC_DINH, docDgn, dungThua, goiYCauHinh, type CauHinhLop, type KetQuaDocDgn, type KetQuaDungThua } from "@gpmb/gis";
import { type DuAn } from "../../mo-hinh";

export interface DuLieuBanDo {
  ban: KetQuaDocDgn;
  kq: KetQuaDungThua;
  pham: { minX: number; minY: number; maxX: number; maxY: number };
  /** Cấu hình lớp đã dùng để dựng thửa */
  cauHinh: CauHinhLop;
  /** true: cấu hình do phần mềm gợi ý (cán bộ chưa chốt) */
  laGoiY: boolean;
  ghiChuGoiY: string[];
}

/**
 * Bộ nhớ đệm bản đồ đã dựng, theo dự án. Gắn với lần nạp (`ngayNhap`): nạp tệp khác, xóa bản đồ,
 * hoặc máy khác (mạng nội bộ) nạp bản đồ mới thì bản đệm cũ không còn được dùng.
 */
export const boNho = new Map<string, { ngayNhap: string; d: DuLieuBanDo }>();

export function layDem(duAn: DuAn): DuLieuBanDo | null {
  const c = boNho.get(duAn.id);
  return c && duAn.banDo && c.ngayNhap === duAn.banDo.ngayNhap ? c.d : null;
}

export const TEN_CO: Record<string, string> = {
  THIEU_SO_THUA: "Thiếu số thửa",
  NHIEU_SO_THUA: "Nhiều số thửa",
  THIEU_SO_TO: "Thiếu số tờ",
  NHIEU_SO_TO: "Nhiều số tờ",
  THIEU_DIEN_TICH_GHI: "Thiếu nhãn DT",
  LECH_DIEN_TICH: "Lệch DT > 5%",
  THIEU_LOAI_DAT: "Thiếu loại đất",
  NHIEU_CHU: "Nhiều chủ",
  THIEU_CHU: "Thiếu chủ",
};

/** Đọc tệp và dựng thửa; không có cấu hình đã chốt thì dùng cấu hình gợi ý từ cấu trúc tệp. */
export function phanTich(bytes: Uint8Array, daChot?: CauHinhLop): DuLieuBanDo {
  const ban = docDgn(bytes);
  const goiY = daChot ? null : goiYCauHinh(ban, CAU_HINH_MAC_DINH);
  const cauHinh = daChot ?? goiY!.cauHinh;
  return dungLai(ban, cauHinh, !daChot, goiY?.ghiChu ?? []);
}

export function dungLai(ban: KetQuaDocDgn, cauHinh: CauHinhLop, laGoiY: boolean, ghiChuGoiY: string[]): DuLieuBanDo {
  const kq = dungThua(ban, cauHinh);
  const pham = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const t of kq.thua)
    for (const d of t.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  for (const v of kq.vungGpmb)
    for (const d of v.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  // Không dựng được thửa/vùng nào (sai cấu hình lớp): lấy phạm vi theo mọi phần tử hình để vẫn vẽ được nền
  if (!Number.isFinite(pham.minX))
    for (const e of ban.phanTu)
      if ("diem" in e)
        for (const d of e.diem) {
          pham.minX = Math.min(pham.minX, d.x);
          pham.minY = Math.min(pham.minY, d.y);
          pham.maxX = Math.max(pham.maxX, d.x);
          pham.maxY = Math.max(pham.maxY, d.y);
        }
  if (!Number.isFinite(pham.minX)) Object.assign(pham, { minX: 0, minY: 0, maxX: 1, maxY: 1 });
  if (pham.maxX - pham.minX < 1e-6) pham.maxX = pham.minX + 1;
  if (pham.maxY - pham.minY < 1e-6) pham.maxY = pham.minY + 1;
  return { ban, kq, pham, cauHinh, laGoiY, ghiChuGoiY };
}
