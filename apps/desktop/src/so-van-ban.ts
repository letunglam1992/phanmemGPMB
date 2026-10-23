/**
 * 1.2.0 (C1) — Sổ văn bản đi của đơn vị: mọi văn bản có số tạo từ phần mềm (mọi dự án) ghi vào một sổ chung (cài đặt
 * "soVanBanDi"); mạng nội bộ: máy chủ ghi trong một khóa CSDL (`POST /api/so-van-ban`) nên hai máy trạm cấp cùng lúc không ghi đè.
 * Số trùng (cùng ký hiệu, cùng năm) vẫn ghi — văn bản đã tạo — nhưng báo để văn thư kiểm tra. Gợi ý số tiếp theo = số lớn nhất
 * đã cấp cùng ký hiệu trong năm + 1 (đơn vị dùng sổ khác, đánh số khác thì nhập tay).
 */
import type { MauVanBan } from "./van-ban/danh-muc";

export interface VanBanDi {
  /** Số thứ tự (phần số trước "/"); không phải số thì null */
  so: number | null;
  kyHieu: string;
  soDayDu: string;
  /** Ngày ký (ISO) */
  ngay: string;
  ma: string;
  tenMau: string;
  duAnId: string;
  duAnTen: string;
  /** Mã hộ (văn bản của hộ) */
  hoMa?: string;
  nguoi?: string;
  luc?: string;
}

export interface SoVanBanDi {
  ds: VanBanDi[];
}

export interface KetQuaCapSo {
  ds: VanBanDi[];
  trung: { soDayDu: string; daCap: VanBanDi }[];
}

export const KHOA_SO_VB = "soVanBanDi";

/** Ký hiệu văn bản của mẫu: theo ghi lại của mẫu; mẫu không ghi lại thì theo loại văn bản; biên bản không có số → "". */
export function kyHieuMau(mau: Pick<MauVanBan, "ghiLai" | "ten" | "coQuan">, kyHieuPhong = ""): string {
  if (mau.coQuan === "BIEN_BAN") return "";
  if (mau.ghiLai?.kyHieu) return mau.ghiLai.kyHieu.replace("{ky_hieu_phong}", kyHieuPhong);
  const t = mau.ten.toLowerCase();
  if (t.startsWith("quyết định")) return "QĐ-UBND";
  if (t.startsWith("thông báo")) return "TB-UBND";
  if (t.startsWith("kế hoạch")) return "KH-UBND";
  if (t.startsWith("tờ trình")) return kyHieuPhong ? `TTr-${kyHieuPhong}` : "";
  if (t.startsWith("báo cáo")) return kyHieuPhong ? `BC-${kyHieuPhong}` : "";
  return "";
}

const khoaTrung = (x: Pick<VanBanDi, "so" | "kyHieu" | "ngay">) => (x.so === null ? null : `${x.kyHieu}|${x.ngay.slice(0, 4)}|${x.so}`);

/** Số tiếp theo của ký hiệu trong năm (theo ngày ký; trống = năm hiện tại). */
export function soTiepTheo(so: SoVanBanDi | null, kyHieu: string, ngay: string): number {
  const nam = (ngay || new Date().toISOString()).slice(0, 4);
  const ds = (so?.ds ?? []).filter((x) => x.kyHieu === kyHieu && x.ngay.slice(0, 4) === nam && x.so !== null);
  return ds.reduce((m, x) => Math.max(m, x.so!), 0) + 1;
}

/** Văn bản đã cấp trùng số (cùng ký hiệu, năm). */
export function timTrung(so: SoVanBanDi | null, x: Pick<VanBanDi, "so" | "kyHieu" | "ngay">): VanBanDi | undefined {
  const k = khoaTrung(x);
  return k ? (so?.ds ?? []).find((y) => khoaTrung(y) === k) : undefined;
}

/** Ghi vào sổ (máy đơn; máy chủ làm cùng việc ở `cap_so`). */
export function ghiVaoSo(cu: SoVanBanDi | null, moi: VanBanDi[], nguoi: string, luc = new Date().toISOString()): { so: SoVanBanDi; kq: KetQuaCapSo } {
  const ds = [...(cu?.ds ?? [])];
  const kq: KetQuaCapSo = { ds: [], trung: [] };
  for (const x of moi) {
    const t = timTrung({ ds }, x);
    if (t) kq.trung.push({ soDayDu: x.soDayDu, daCap: t });
    const ghi = { ...x, nguoi, luc };
    ds.push(ghi);
    kq.ds.push(ghi);
  }
  return { so: { ds }, kq };
}

/** Tách "15" / "15/TB-UBND" → số thứ tự. */
export const soThuTu = (s: string): number | null => {
  const m = /^\s*(\d{1,6})\s*(\/|$)/.exec(s);
  return m ? Number(m[1]) : null;
};

/** 1.2.0 (C1) — văn bản soạn ngoài phần mềm, văn thư ghi tay vào sổ (mã "NGOAI"). */
export const MA_NGOAI = "NGOAI";

/** Dựng dòng sổ cho văn bản ghi tay: số "15" hoặc "15/TB-UBND" (ký hiệu trong số được ưu tiên). */
export function vanBanGhiTay(p: { so: string; kyHieu: string; ngay: string; trichYeu: string; duAn: { id: string; ten: string } }): VanBanDi | string {
  const so = p.so.trim();
  const tach = /^(\d{1,6})\s*\/\s*(.+)$/.exec(so);
  const kyHieu = (tach ? tach[2]! : p.kyHieu).trim();
  const n = soThuTu(so);
  if (n === null) return "Số văn bản phải bắt đầu bằng số thứ tự (vd. 15 hoặc 15/TB-UBND)";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.ngay)) return "Chưa nhập ngày ký";
  if (!p.trichYeu.trim()) return "Chưa nhập trích yếu";
  return { so: n, kyHieu, soDayDu: kyHieu ? `${n}/${kyHieu}` : String(n), ngay: p.ngay, ma: MA_NGOAI, tenMau: p.trichYeu.trim(), duAnId: p.duAn.id, duAnTen: p.duAn.ten };
}

