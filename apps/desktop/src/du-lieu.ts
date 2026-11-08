/** Dữ liệu chính sách, đơn giá (đọc từ policy/ — đã trích xuất và đối chiếu, docs/07). */
import type { BoChinhSach } from "@gpmb/core";
import goi from "../../../policy/goi/sonla-2026-03-31.json";
import qd32 from "../../../policy/nguon/qd32-2025-don-gia-nha-cong-trinh.json";
import pl8 from "../../../policy/nguon/qd106-2025-pl8-cay-trong-thuy-san.json";
import pl5 from "../../../policy/nguon/qd106-2025-pl5-di-doi-vat-nuoi.json";
import { bangGiaTheoNgay, homNay, type SuaDoiBangGia } from "./bang-gia-theo-ngay";

export const BO_CHINH_SACH: Record<string, BoChinhSach> = {
  "sonla-2026-03-31": goi as unknown as BoChinhSach,
};

export interface DongDonGia {
  nguon: "QĐ32" | "PL VIII" | "PL V";
  ma: string;
  nhom: string;
  ten: string;
  donVi: string;
  donGia: number;
  matDo: number | null;
  trang: number;
}

type Qd32 = { phu_luc: string; tt: string; stt_trong_o: number; nhom: string; nhom_con?: string; ten: string; don_vi: string; don_gia: number; trang: number };
type Pl = { phu_luc: string; bieu: string | null; ma: string; nhom: string; ten: string; don_vi: string; don_gia: number; mat_do_toi_da: number | null; trang: number };

export const DON_GIA: DongDonGia[] = [
  ...(qd32 as Qd32[]).map((r) => ({
    nguon: "QĐ32" as const,
    ma: `QĐ32/PL-${r.phu_luc}/${r.tt}/${r.stt_trong_o}`,
    nhom: [r.nhom, r.nhom_con].filter(Boolean).join(" › "),
    ten: r.ten,
    donVi: r.don_vi.replace(/^đồng\//i, ""),
    donGia: r.don_gia,
    matDo: null,
    trang: r.trang,
  })),
  ...(pl8 as Pl[]).map((r) => ({
    nguon: "PL VIII" as const,
    ma: `PL VIII/B${r.bieu}/${r.ma}`,
    nhom: r.nhom,
    ten: r.ten,
    donVi: r.don_vi.replace(/^đồng\//i, ""),
    donGia: r.don_gia,
    matDo: r.mat_do_toi_da,
    trang: r.trang,
  })),
  ...(pl5 as Pl[]).map((r) => ({
    nguon: "PL V" as const,
    ma: `PL V/${r.ma}`,
    nhom: r.nhom,
    ten: r.ten,
    donVi: r.don_vi,
    donGia: r.don_gia,
    matDo: null,
    trang: r.trang,
  })),
];

export interface BangGiaDat {
  van_ban: string;
  danh_muc_xa: string[];
  dat_nong_nghiep: { bang: string; stt: number; xa: string; loai_dat: string; gia: number }[];
  dat_o: DongGiaTuyen[];
  dat_tmdv: DongGiaTuyen[];
  dat_skc: DongGiaTuyen[];
  dat_kcn_ccn: { bang: string; loai_dat: string; ten: string; xa: string; gia: number }[];
  /** Có khi bảng đã áp văn bản sửa đổi theo thời điểm định giá (bang-gia-theo-ngay.ts). */
  ap_dung?: { ngay: string; van_ban: string[] };
  /** Các tuyến đã bị bãi bỏ tại thời điểm `ap_dung.ngay` (Phụ lục V NQ 28/2026…), để tra lại. */
  da_bai_bo?: DongGiaTuyen[];
}
export interface DongGiaTuyen {
  bang: string;
  loai_dat: string;
  xa: string;
  stt: string;
  nhom: string;
  tuyen: string;
  vt: (number | null)[];
  canh_bao: string[];
  /** Văn bản quy định dòng (trống = NQ 152/2025/NQ-HĐND). */
  van_ban?: string;
  /** Căn cứ dòng bổ sung (vd. Phụ lục I NQ 28/2026, dòng n). */
  can_cu?: string;
  ghi_chu?: string;
  /** Các thay đổi đã áp (đổi tên, bổ sung, bãi bỏ) kèm căn cứ. */
  thay_doi?: string[];
}

let bangGia: Promise<BangGiaDat> | null = null;
let suaDoi: Promise<SuaDoiBangGia[]> | null = null;
const theoNgay = new Map<string, Promise<BangGiaDat>>();
/** Bảng giá đất NQ 152 gốc (~2 MB) nạp khi cần — chưa áp sửa đổi. */
export function napBangGiaDatGoc(): Promise<BangGiaDat> {
  bangGia ??= import("../../../policy/nguon/nq152-2025-bang-gia-dat.json").then((m) => (m.default ?? m) as unknown as BangGiaDat);
  return bangGia;
}
/** Các nghị quyết sửa đổi Bảng giá đất (hiện có NQ 28/2026/NQ-HĐND). */
export function napSuaDoiBangGia(): Promise<SuaDoiBangGia[]> {
  suaDoi ??= import("../../../policy/nguon/nq28-2026-sua-doi-bang-gia-dat.json").then((m) => [(m.default ?? m) as unknown as SuaDoiBangGia]);
  return suaDoi;
}
/**
 * Bảng giá đất áp dụng tại thời điểm định giá `ngay` (ISO; mặc định hôm nay): NQ 152 + các sửa đổi đã có hiệu lực
 * (NQ 28/2026 từ 01/11/2026). Phương án đã duyệt trước ngày hiệu lực: chọn ngày phê duyệt để tra đúng bảng cũ.
 */
export async function napBangGiaDat(ngay: string = homNay()): Promise<BangGiaDat> {
  const [goc, sd] = await Promise.all([napBangGiaDatGoc(), napSuaDoiBangGia()]);
  const moc = sd.map((s) => s.hieu_luc_tu).filter((t) => ngay >= t).sort().pop() ?? "";
  if (!theoNgay.has(moc)) theoNgay.set(moc, Promise.resolve(bangGiaTheoNgay(goc, sd, ngay)));
  const bg = await theoNgay.get(moc)!;
  return bg.ap_dung?.ngay === ngay ? bg : { ...bg, ap_dung: { ngay, van_ban: bg.ap_dung?.van_ban ?? [goc.van_ban] } };
}

/** Danh mục 75 xã, phường (NQ 152) — bản rút gọn nạp sẵn để chọn địa bàn. */
export { default as DANH_MUC_XA } from "./danh-muc-xa.json";
