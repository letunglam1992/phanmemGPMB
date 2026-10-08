/** Dữ liệu chính sách, đơn giá (đọc từ policy/ — đã trích xuất và đối chiếu, docs/07). */
import type { BoChinhSach } from "@gpmb/core";
import goi from "../../../policy/goi/sonla-2026-03-31.json";
import goi64 from "../../../policy/goi/sonla-2026-10-06.json";
import qd32 from "../../../policy/nguon/qd32-2025-don-gia-nha-cong-trinh.json";
import pl8 from "../../../policy/nguon/qd106-2025-pl8-cay-trong-thuy-san.json";
import pl5 from "../../../policy/nguon/qd106-2025-pl5-di-doi-vat-nuoi.json";

export const BO_CHINH_SACH: Record<string, BoChinhSach> = {
  "sonla-2026-03-31": goi as unknown as BoChinhSach,
  /** QĐ 64/2026/QĐ-UBND (hiệu lực 06/10/2026): hệ số chuyển đổi nghề theo tổ, thôn; k11 Đ6 QĐ 14/2026 sửa đổi */
  "sonla-2026-10-06": goi64 as unknown as BoChinhSach,
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
}

let bangGia: Promise<BangGiaDat> | null = null;
/** Bảng giá đất NQ 152 (~2 MB) nạp khi cần. */
export function napBangGiaDat(): Promise<BangGiaDat> {
  bangGia ??= import("../../../policy/nguon/nq152-2025-bang-gia-dat.json").then((m) => (m.default ?? m) as unknown as BangGiaDat);
  return bangGia;
}

/** Danh mục 75 xã, phường (NQ 152) — bản rút gọn nạp sẵn để chọn địa bàn. */
export { default as DANH_MUC_XA } from "./danh-muc-xa.json";
