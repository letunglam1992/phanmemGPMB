/**
 * 1.0.10 — Bản dùng thử và mã kích hoạt.
 *
 * - Dùng thử: tạo được 1 dự án (dự án mẫu ẩn danh không tính), đủ chức năng.
 * - Mỗi máy (hoặc máy chủ mạng nội bộ) có "Mã cài đặt" ngẫu nhiên, lưu ở cài đặt chung (không đi theo bản sao lưu).
 * - Mã kích hoạt do tác giả cấp: nội dung JSON (tên đơn vị, mã cài đặt, số dự án tối đa hoặc không giới hạn, hạn dùng tùy
 *   chọn) ký ECDSA P-256 / SHA-256 bằng khóa riêng của tác giả (không có trong kho mã); phần mềm chỉ có khóa công khai để kiểm.
 * - Hết hạn hoặc mã sai: trở về mức dùng thử — dự án đã có vẫn xem, sửa, xuất được; chỉ chặn thêm dự án vượt mức.
 */
import type { DuAn } from "./mo-hinh";
import { KHOA_CONG_GIAY_PHEP } from "./giay-phep-khoa";
import { MA_CHAN } from "./giay-phep-chan";

export const KHOA_MA_CAI_DAT = "maCaiDat";
export const KHOA_GIAY_PHEP = "giayPhep";
export const SO_DU_AN_DUNG_THU = 1;
export const SU_KIEN_GIOI_HAN = "gpmb-gioi-han-du-an";

export interface NoiDungGiayPhep {
  v: 1;
  donVi: string;
  maCaiDat: string;
  /** null = không giới hạn */
  soDuAn: number | null;
  /** YYYY-MM-DD, null = không thời hạn */
  hetHan: string | null;
  /** Ngày cấp YYYY-MM-DD */
  cap: string;
}

export type TrangThaiGiayPhep =
  | { loai: "DUNG_THU"; gioiHan: number }
  | { loai: "HOP_LE"; gioiHan: number; gp: NoiDungGiayPhep }
  | { loai: "HET_HAN" | "SAI_MAY" | "BI_CHAN"; gioiHan: number; gp: NoiDungGiayPhep }
  | { loai: "SAI"; gioiHan: number; loi: string };

const CHU = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho khỏi nhầm khi đọc qua điện thoại

/** Mã cài đặt mới: 16 ký tự, nhóm 4 (vd. K7QM-3XPA-W9RT-2HDN). */
export function taoMaCaiDat(ngauNhien: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const b = ngauNhien(16);
  const s = [...b].map((x) => CHU[x % CHU.length]).join("");
  return s.match(/.{4}/g)!.join("-");
}

const chuanMa = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

const b64u = {
  ma: (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  giai: (s: string) => {
    const t = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  },
};

const THUAT_TOAN = { name: "ECDSA", namedCurve: "P-256" } as const;
const KY = { name: "ECDSA", hash: "SHA-256" } as const;

/** Ký nội dung bằng khóa riêng (JWK) — công cụ cấp mã của tác giả và kiểm thử dùng. */
export async function kyGiayPhep(nd: NoiDungGiayPhep, khoaRieng: JsonWebKey): Promise<string> {
  const k = await crypto.subtle.importKey("jwk", khoaRieng, THUAT_TOAN, false, ["sign"]);
  const than = new TextEncoder().encode(JSON.stringify(nd));
  const ky = new Uint8Array(await crypto.subtle.sign(KY, k, than));
  return `GPMB1.${b64u.ma(than)}.${b64u.ma(ky)}`;
}

/** Kiểm chữ ký, đọc nội dung mã kích hoạt; ném lỗi tiếng Việt nếu sai. */
export async function docGiayPhep(ma: string, khoaCong: JsonWebKey = KHOA_CONG_GIAY_PHEP): Promise<NoiDungGiayPhep> {
  const [dau, than, ky] = ma.trim().replace(/\s+/g, "").split(".");
  if (dau !== "GPMB1" || !than || !ky) throw new Error("Mã kích hoạt không đúng dạng (bắt đầu bằng GPMB1.)");
  let byteThan: Uint8Array<ArrayBuffer>, byteKy: Uint8Array<ArrayBuffer>;
  try {
    byteThan = b64u.giai(than);
    byteKy = b64u.giai(ky);
  } catch {
    throw new Error("Mã kích hoạt bị thiếu hoặc sai ký tự — chép lại đủ cả mã");
  }
  const k = await crypto.subtle.importKey("jwk", khoaCong, THUAT_TOAN, false, ["verify"]);
  if (!(await crypto.subtle.verify(KY, k, byteKy, byteThan))) throw new Error("Mã kích hoạt không hợp lệ (sai chữ ký) — liên hệ tác giả để được cấp lại");
  const nd = JSON.parse(new TextDecoder().decode(byteThan)) as NoiDungGiayPhep;
  if (nd.v !== 1 || typeof nd.maCaiDat !== "string" || typeof nd.donVi !== "string") throw new Error("Mã kích hoạt không đúng phiên bản");
  return nd;
}

/** 1.0.12: mã băm SHA-256 (hex) của mã kích hoạt (bỏ khoảng trắng) — dùng cho danh sách chặn. */
export async function bamMa(ma: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ma.trim().replace(/\s+/g, "")));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Danh sách mã bị chặn đi kèm mỗi bản phần mềm (mã đã cấp lại cho máy mới khi đơn vị thay máy). */
export const MA_BI_CHAN: ReadonlySet<string> = new Set(MA_CHAN.map((x) => x.toLowerCase()));

/** Trạng thái theo mã kích hoạt đã lưu, mã cài đặt của máy và ngày hôm nay (YYYY-MM-DD). */
export async function trangThaiGiayPhep(ma: string | null | undefined, maCaiDat: string | null | undefined, homNay: string, khoaCong: JsonWebKey = KHOA_CONG_GIAY_PHEP, chan: ReadonlySet<string> = MA_BI_CHAN): Promise<TrangThaiGiayPhep> {
  if (!ma) return { loai: "DUNG_THU", gioiHan: SO_DU_AN_DUNG_THU };
  let gp: NoiDungGiayPhep;
  try {
    gp = await docGiayPhep(ma, khoaCong);
  } catch (e) {
    return { loai: "SAI", gioiHan: SO_DU_AN_DUNG_THU, loi: (e as Error).message };
  }
  if (!maCaiDat || chuanMa(gp.maCaiDat) !== chuanMa(maCaiDat)) return { loai: "SAI_MAY", gioiHan: SO_DU_AN_DUNG_THU, gp };
  if (chan.size && chan.has(await bamMa(ma))) return { loai: "BI_CHAN", gioiHan: SO_DU_AN_DUNG_THU, gp };
  if (gp.hetHan && homNay > gp.hetHan) return { loai: "HET_HAN", gioiHan: SO_DU_AN_DUNG_THU, gp };
  return { loai: "HOP_LE", gioiHan: gp.soDuAn ?? Infinity, gp };
}

/** Dự án mẫu ẩn danh (nút "Nạp dữ liệu mẫu") — không tính vào giới hạn. */
export const laDuAnMau = (d: DuAn) => d.mau === true || /\(dữ liệu ẩn danh\)\s*$/.test(d.ten);

/** Số dự án đang tính vào giới hạn: chưa xóa (thùng rác không tính), không phải dự án mẫu. */
export const demDuAnTinh = (ds: DuAn[]) => ds.filter((d) => !d.daXoa && !laDuAnMau(d)).length;

/**
 * Có thêm được `them` dự án (không phải mẫu) không. Trả về null nếu được, không thì câu báo.
 */
export function kiemThemDuAn(ds: DuAn[], them: number, tt: TrangThaiGiayPhep): string | null {
  if (them <= 0) return null;
  const co = demDuAnTinh(ds);
  if (co + them <= tt.gioiHan) return null;
  const muc =
    tt.loai === "HOP_LE"
      ? `Mã kích hoạt cho phép ${tt.gioiHan} dự án`
      : tt.loai === "HET_HAN"
        ? `Mã kích hoạt đã hết hạn ngày ${tt.gp.hetHan!.split("-").reverse().join("/")} — trở về mức dùng thử ${SO_DU_AN_DUNG_THU} dự án`
        : `Bản dùng thử dùng được ${SO_DU_AN_DUNG_THU} dự án`;
  return `${muc}; đang có ${co} dự án (không tính dự án mẫu, dự án trong thùng rác).`;
}

/** Báo cho giao diện mở hộp "Dùng thêm dự án" (UngDung lắng nghe). */
export function baoGioiHan(noiDung: string) {
  window.dispatchEvent(new CustomEvent(SU_KIEN_GIOI_HAN, { detail: noiDung }));
}

export const moTaGiayPhep = (tt: TrangThaiGiayPhep): string => {
  const ngay = (s: string) => s.split("-").reverse().join("/");
  switch (tt.loai) {
    case "DUNG_THU":
      return `Bản dùng thử — ${SO_DU_AN_DUNG_THU} dự án`;
    case "HOP_LE":
      return `Đã kích hoạt cho ${tt.gp.donVi} — ${tt.gp.soDuAn === null ? "không giới hạn dự án" : `${tt.gp.soDuAn} dự án`}${tt.gp.hetHan ? `, đến ${ngay(tt.gp.hetHan)}` : ", không thời hạn"}`;
    case "HET_HAN":
      return `Mã kích hoạt của ${tt.gp.donVi} đã hết hạn ngày ${ngay(tt.gp.hetHan!)} — đang ở mức dùng thử`;
    case "BI_CHAN":
      return `Mã kích hoạt của ${tt.gp.donVi} đã được thay bằng mã cấp lại cho máy khác — đang ở mức dùng thử; liên hệ tác giả nếu cần`;
    case "SAI_MAY":
      return `Mã kích hoạt cấp cho máy khác (mã cài đặt ${tt.gp.maCaiDat}) — đang ở mức dùng thử`;
    case "SAI":
      return `Mã kích hoạt không dùng được: ${tt.loi}`;
  }
};
