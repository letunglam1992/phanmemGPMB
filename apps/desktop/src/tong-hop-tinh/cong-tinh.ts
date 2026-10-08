/**
 * Cổng tổng hợp cấp tỉnh trên Cloudflare (phương án 2 mức b, docs/21): Worker + R2 do cấp tỉnh tự triển khai
 * (tools/cong-tinh). Cổng chỉ nhận và trả lại gói .gpmbtinh ĐÃ MÃ HÓA bằng khóa công khai của tỉnh — Cloudflare và người
 * quản trị cổng không đọc được hồ sơ. Xác thực bằng mã truy cập: mỗi xã một mã (do tỉnh cấp, thu hồi được), tỉnh dùng mã
 * quản trị. Bản cài gọi qua vỏ Rust (`goi_cong_tinh`), mã truy cập lưu trên máy được mã hóa DPAPI.
 */
import { coVoWindows, dpapiBoc, dpapiMo } from "../tu-dong-sao-luu";

export interface CauHinhCong {
  diaChi: string;
  /** Mã truy cập (bản cài: mã hóa DPAPI, base64) */
  ma: string;
  maHoa?: boolean;
}
export type VaiTroCong = "XA" | "TINH";
const KHOA: Record<VaiTroCong, string> = { XA: "gpmb-cong-tinh-xa", TINH: "gpmb-cong-tinh-quan-tri" };
/** Gói tối đa gửi qua cổng (giới hạn thân yêu cầu của Cloudflare Workers gói miễn phí: 100 MB). */
export const TOI_DA_GOI_CONG = 95 * 1024 * 1024;

export class LoiCong extends Error {
  constructor(public ma: number, thongBao: string) {
    super(thongBao);
  }
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Chuẩn hóa địa chỉ cổng: bỏ "/" cuối; chỉ nhận https:// (http://localhost, 127.0.0.1 để thử nghiệm). */
export function chuanDiaChi(s: string): string {
  const d = s.trim().replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[\w./-]*)?$/i.test(d) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(d)) throw new LoiCong(0, "Địa chỉ cổng phải có dạng https://ten-cong.ten-tai-khoan.workers.dev");
  return d;
}

export function docCauHinhCong(vt: VaiTroCong): CauHinhCong | null {
  try {
    const c = JSON.parse(localStorage.getItem(KHOA[vt]) ?? "null") as CauHinhCong | null;
    return c?.diaChi ? c : null;
  } catch {
    return null;
  }
}
export async function luuCauHinhCong(vt: VaiTroCong, diaChi: string, maRo: string): Promise<CauHinhCong> {
  const c: CauHinhCong = { diaChi: chuanDiaChi(diaChi), ma: maRo.trim() };
  if (!/^[\w.-]{16,200}$/.test(c.ma)) throw new LoiCong(0, "Mã truy cập không hợp lệ (dán đúng mã được cấp, không có khoảng trắng)");
  if (coVoWindows()) Object.assign(c, { ma: b64(await dpapiBoc(new TextEncoder().encode(c.ma))), maHoa: true });
  localStorage.setItem(KHOA[vt], JSON.stringify(c));
  return c;
}
export function xoaCauHinhCong(vt: VaiTroCong) {
  try {
    localStorage.removeItem(KHOA[vt]);
  } catch {
    /* bỏ qua */
  }
}
const maRo = async (c: CauHinhCong) => (c.maHoa ? new TextDecoder().decode(await dpapiMo(tuB64(c.ma))) : c.ma);

async function goi(c: CauHinhCong, phuongThuc: string, duongDan: string, than?: Uint8Array): Promise<{ ma: number; than: Uint8Array }> {
  const url = `${c.diaChi}${duongDan}`;
  const token = await maRo(c);
  let r: { ma: number; than: Uint8Array };
  if (coVoWindows()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const b = new Uint8Array(await invoke<ArrayBuffer>("goi_cong_tinh", than ?? new Uint8Array(), { headers: { "x-url": url, "x-phuong-thuc": phuongThuc, "x-token": token } }));
    r = { ma: (b[0]! << 8) | b[1]!, than: b.subarray(2) };
  } else {
    let f: Response;
    try {
      f = await fetch(url, { method: phuongThuc, headers: { authorization: `Bearer ${token}`, ...(than ? { "content-type": "application/octet-stream" } : {}) }, body: than as BodyInit | undefined });
    } catch (e) {
      throw new LoiCong(0, `Không kết nối được cổng (kiểm tra Internet, địa chỉ cổng): ${(e as Error).message}`);
    }
    r = { ma: f.status, than: new Uint8Array(await f.arrayBuffer()) };
  }
  if (r.ma >= 400) {
    let tb = "";
    try {
      tb = (JSON.parse(new TextDecoder().decode(r.than)) as { loi?: string }).loi ?? "";
    } catch {
      /* không phải JSON */
    }
    throw new LoiCong(r.ma, tb || (r.ma === 401 ? "Mã truy cập không đúng hoặc đã bị thu hồi" : r.ma === 404 ? "Không tìm thấy (kiểm tra địa chỉ cổng)" : r.ma === 413 ? "Gói quá lớn so với giới hạn của cổng" : `Cổng trả lỗi ${r.ma}`));
  }
  return r;
}
const json = async <T,>(p: Promise<{ than: Uint8Array }>) => JSON.parse(new TextDecoder().decode((await p).than)) as T;

export interface TrangThaiCong {
  vaiTro: VaiTroCong;
  ma?: string;
  ten?: string;
}
export interface GoiTrenCong {
  ma: string;
  ten: string;
  luc: string;
  kichThuoc: number;
}
export interface XaTrenCong {
  ma: string;
  ten: string;
  taoLuc: string;
  thuHoi?: string;
  goiCuoi?: string;
}

export const kiemTraCong = (c: CauHinhCong) => json<TrangThaiCong>(goi(c, "GET", "/api/trang-thai"));
export async function guiGoiLenCong(c: CauHinhCong, bytes: Uint8Array): Promise<{ luc: string; kichThuoc: number }> {
  if (bytes.length > TOI_DA_GOI_CONG) throw new LoiCong(413, `Gói ${(bytes.length / 1048576).toFixed(1)} MB vượt giới hạn gửi qua cổng (95 MB) — bỏ tệp đính kèm hoặc bản đồ, hoặc gửi tệp bằng cách khác`);
  return json(goi(c, "PUT", "/api/goi", bytes));
}
export const dsGoiTrenCong = (c: CauHinhCong) => json<GoiTrenCong[]>(goi(c, "GET", "/api/goi"));
export const taiGoiTuCong = async (c: CauHinhCong, ma: string) => (await goi(c, "GET", `/api/goi/${encodeURIComponent(ma)}`)).than;
/** 1.0.5: các bản cổng đang giữ của một xã (tối đa 5, cũ → mới). Cổng bản cũ → LoiCong 404. */
export const dsBanTrenCong = (c: CauHinhCong, ma: string) => json<{ id: string; luc: string; kichThuoc: number }[]>(goi(c, "GET", `/api/goi/${encodeURIComponent(ma)}/ban`));
export const taiBanTuCong = async (c: CauHinhCong, ma: string, id: string) => (await goi(c, "GET", `/api/goi/${encodeURIComponent(ma)}/ban/${encodeURIComponent(id)}`)).than;
export const dsXaTrenCong = (c: CauHinhCong) => json<XaTrenCong[]>(goi(c, "GET", "/api/xa"));
export const capMaXa = (c: CauHinhCong, ma: string, ten: string) => json<{ ma: string; token: string }>(goi(c, "POST", "/api/xa", new TextEncoder().encode(JSON.stringify({ ma, ten }))));
/** 1.0.5: danh sách dự án liên xã trên cổng (tỉnh đưa lên, xã đọc). Cổng bản cũ (chưa có API) → LoiCong 404. */
export interface TuyenTrenCong {
  ma: string;
  ten: string;
  chuDauTu: string;
  dsXa: string[];
  ghiChu?: string;
}
export const dsTuyenTrenCong = (c: CauHinhCong) => json<{ luc: string | null; tuyen: TuyenTrenCong[] }>(goi(c, "GET", "/api/tuyen"));
export const guiTuyenLenCong = (c: CauHinhCong, ds: TuyenTrenCong[]) =>
  json<{ soTuyen: number; luc: string }>(goi(c, "PUT", "/api/tuyen", new TextEncoder().encode(JSON.stringify(ds.map(({ ma, ten, chuDauTu, dsXa, ghiChu }) => ({ ma, ten, chuDauTu, dsXa, ...(ghiChu ? { ghiChu } : {}) }))))));
export const thuHoiXa = (c: CauHinhCong, ma: string) => json<{ ok: true }>(goi(c, "DELETE", `/api/xa/${encodeURIComponent(ma)}`));

/** Mã đơn vị trên cổng: chữ thường không dấu, số, gạch ngang (vd. "chieng-mung"). */
export const maTuTen = (ten: string) =>
  ten.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/^(xa|phuong|ubnd( xa| phuong)?)\s+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
