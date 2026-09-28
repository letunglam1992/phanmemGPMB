/**
 * Kho dữ liệu qua máy chủ mạng nội bộ (docs/11). Mọi yêu cầu đi qua vỏ ứng dụng (lệnh goi_may_chu)
 * bằng HTTPS ghim vân tay chứng chỉ. Máy chủ kiểm tra lại quyền và quy tắc nghiệp vụ; kho này chỉ
 * chuyển tiếp, giữ phiên bản bản ghi để phát hiện xung đột khi hai người cùng sửa.
 */
import type { Kho } from "./kho";
import type { DuAn, Ho } from "./mo-hinh";
import type { NguoiDung } from "./tai-khoan";
import type { DongNhatKy } from "./nhat-ky";

export interface KetNoi {
  /** IP[:cổng] của máy chủ, vd. 192.168.1.10:47800 */
  diaChi: string;
  /** Vân tay SHA-256 chứng chỉ máy chủ (AB:CD:…). */
  vanTay: string;
}

export interface TraLoi {
  ma: number;
  meta: string;
  than: Uint8Array;
}

export type GuiYeuCau = (phuongThuc: string, duongDan: string, o?: { token?: string; than?: Uint8Array; meta?: string }) => Promise<TraLoi>;

/** Lỗi do máy chủ trả về (mã HTTP + thông báo tiếng Việt). */
export class LoiMayChu extends Error {
  constructor(
    public ma: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ThayDoi {
  seq: number;
  loai: string;
  id: string;
  duAnId: string | null;
  boi: string;
  luc: string;
}

export interface KhoMang extends Kho {
  mang: true;
  ketNoi: KetNoi;
  trangThai(): Promise<{ coTaiKhoan: boolean; phienBan: string }>;
  dangNhap(ten: string, matKhau: string): Promise<NguoiDung>;
  khoiTao(u: NguoiDung): Promise<NguoiDung>;
  dangXuat(): Promise<void>;
  /** Đổi mật khẩu của chính mình: `moi` đã băm ở máy trạm; máy chủ kiểm tra mật khẩu cũ. */
  doiMatKhau(moi: NguoiDung, matKhauCu: string): Promise<NguoiDung>;
  thayDoi(sau: number | null): Promise<{ seq: number; ds: ThayDoi[] }>;
  coPhien(): boolean;
}

export const laKhoMang = (k: Kho): k is KhoMang => (k as Partial<KhoMang>).mang === true;

const MA = new TextEncoder();
const GIAI = new TextDecoder();

/** Gửi qua vỏ Tauri (lệnh goi_may_chu). */
export function guiQuaVo(k: KetNoi): GuiYeuCau {
  return async (phuongThuc, duongDan, o = {}) => {
    const { invoke } = await import("@tauri-apps/api/core");
    const headers: Record<string, string> = { "x-dia-chi": k.diaChi, "x-van-tay": k.vanTay, "x-phuong-thuc": phuongThuc, "x-duong-dan": duongDan };
    if (o.token) headers["x-token"] = o.token;
    if (o.meta) headers["x-meta"] = o.meta;
    const r = await invoke<ArrayBuffer>("goi_may_chu", o.than ?? new Uint8Array(), { headers });
    const b = new Uint8Array(r);
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const ma = dv.getUint16(0);
    const n = dv.getUint32(2);
    return { ma, meta: GIAI.decode(b.subarray(6, 6 + n)), than: b.subarray(6 + n) };
  };
}

export function taoKhoMang(ketNoi: KetNoi, gui: GuiYeuCau = guiQuaVo(ketNoi)): KhoMang {
  let token: string | undefined;
  const phienBan = new Map<string, number>();

  async function goi(pt: string, dd: string, o: { json?: unknown; than?: Uint8Array; meta?: string; cho404?: boolean } = {}): Promise<TraLoi> {
    const than = o.json !== undefined ? MA.encode(JSON.stringify(o.json)) : o.than;
    const r = await gui(pt, dd, { token, than, meta: o.meta });
    if (r.ma >= 200 && r.ma < 300) return r;
    if (r.ma === 404 && o.cho404) return r;
    let tb = `Máy chủ trả lỗi ${r.ma}`;
    try {
      tb = (JSON.parse(GIAI.decode(r.than)) as { loi?: string }).loi ?? tb;
    } catch {
      /* thân không phải JSON */
    }
    if (r.ma === 401) token = undefined;
    throw new LoiMayChu(r.ma, tb);
  }
  const json = async <T>(pt: string, dd: string, o?: Parameters<typeof goi>[2]): Promise<T> => JSON.parse(GIAI.decode((await goi(pt, dd, o)).than)) as T;
  const ma = encodeURIComponent;

  async function dsBanGhi<T extends { id: string }>(loai: string, dd: string): Promise<T[]> {
    const ds = await json<{ duLieu: T; phienBan: number }[]>("GET", dd);
    for (const x of ds) phienBan.set(`${loai}:${x.duLieu.id}`, x.phienBan);
    return ds.map((x) => x.duLieu);
  }
  async function luuBanGhi(loai: string, dd: string, d: { id: string }) {
    const k = `${loai}:${d.id}`;
    const r = await json<{ phienBan: number }>("PUT", dd, { json: { duLieu: d, phienBanTruoc: phienBan.get(k) ?? null } });
    phienBan.set(k, r.phienBan);
  }
  const dsTep = (loai: string) => json<string[]>("GET", `/api/tep/${loai}`);

  return {
    mang: true,
    ketNoi,
    coPhien: () => !!token,
    trangThai: () => json("GET", "/api/trang-thai"),
    async dangNhap(ten, matKhau) {
      const r = await json<{ token: string; nguoiDung: NguoiDung }>("POST", "/api/dang-nhap", { json: { ten, matKhau } });
      token = r.token;
      return r.nguoiDung;
    },
    async khoiTao(u) {
      const r = await json<{ token: string; nguoiDung: NguoiDung }>("POST", "/api/khoi-tao", { json: u });
      token = r.token;
      return r.nguoiDung;
    },
    async dangXuat() {
      try {
        await goi("POST", "/api/dang-xuat");
      } finally {
        token = undefined;
      }
    },
    doiMatKhau: (moi, matKhauCu) => json("POST", "/api/doi-mat-khau", { json: { matKhauCu, moi: { muoi: moi.muoi, vongLap: moi.vongLap, bam: moi.bam } } }),
    thayDoi: (sau) => json("GET", `/api/thay-doi${sau === null ? "" : `?sau=${sau}`}`),

    dsDuAn: () => dsBanGhi<DuAn>("duAn", "/api/du-an"),
    luuDuAn: (d) => luuBanGhi("duAn", `/api/du-an/${ma(d.id)}`, d),
    async xoaDuAn(id) {
      await goi("DELETE", `/api/du-an/${ma(id)}`);
    },
    dsHo: (duAnId) => dsBanGhi<Ho>("ho", `/api/ho?duAn=${ma(duAnId)}`),
    luuHo: (h) => luuBanGhi("ho", `/api/ho/${ma(h.id)}`, h),
    async xoaHo(id) {
      await goi("DELETE", `/api/ho/${ma(id)}`);
    },
    async luuBanDo(duAnId, bytes) {
      await goi("PUT", `/api/tep/banDo/${ma(duAnId)}`, { than: bytes, meta: ma("{}") });
    },
    async docBanDo(duAnId) {
      const r = await goi("GET", `/api/tep/banDo/${ma(duAnId)}`, { cho404: true });
      return r.ma === 404 ? null : r.than;
    },
    async xoaBanDo(duAnId) {
      await goi("DELETE", `/api/tep/banDo/${ma(duAnId)}`);
    },
    async luuMau(m, bytes, tenTep) {
      await goi("PUT", `/api/tep/mau/${ma(m)}`, { than: bytes, meta: ma(JSON.stringify({ tenTep, luc: new Date().toISOString() })) });
    },
    async docMau(m) {
      const r = await goi("GET", `/api/tep/mau/${ma(m)}`, { cho404: true });
      if (r.ma === 404) return null;
      const meta = JSON.parse(decodeURIComponent(r.meta || "%7B%7D")) as { tenTep?: string; luc?: string };
      return { bytes: r.than, tenTep: meta.tenTep ?? `${m}.docx`, luc: meta.luc ?? "" };
    },
    async xoaMau(m) {
      await goi("DELETE", `/api/tep/mau/${ma(m)}`);
    },
    dsMauTuy: () => dsTep("mau"),
    dsBanDo: () => dsTep("banDo"),
    async xoaTatCa() {
      await goi("POST", "/api/xoa-tat-ca");
      phienBan.clear();
    },
    dsNguoiDung: () => json<NguoiDung[]>("GET", "/api/nguoi-dung"),
    async luuNguoiDung(u) {
      await goi("PUT", `/api/nguoi-dung/${ma(u.ten)}`, { json: u });
    },
    ghiNhatKy: (e) => json<DongNhatKy>("POST", "/api/nhat-ky", { json: { hanhDong: e.hanhDong, chiTiet: e.chiTiet ?? "" } }),
    dsNhatKy: () => json<DongNhatKy[]>("GET", "/api/nhat-ky"),
    async docCaiDat<T>(khoa: string) {
      return json<T | null>("GET", `/api/cai-dat/${ma(khoa)}`);
    },
    async luuCaiDat(khoa, giaTri) {
      await goi("PUT", `/api/cai-dat/${ma(khoa)}`, { json: giaTri });
    },
  };
}

// ---------------- Chế độ kết nối của từng máy ----------------

export type CheDoMang = { cheDo: "MAY_DON" } | { cheDo: "MAY_CHU"; cong: number } | { cheDo: "MAY_TRAM"; ketNoi: KetNoi };
const KHOA_CHE_DO = "gpmb-ket-noi";
export const CONG_MAC_DINH = 47800;

export function docCheDo(): CheDoMang {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA_CHE_DO) ?? "null") as CheDoMang | null;
    if (v && (v.cheDo === "MAY_DON" || v.cheDo === "MAY_CHU" || v.cheDo === "MAY_TRAM")) return v;
  } catch {
    /* bỏ qua */
  }
  return { cheDo: "MAY_DON" };
}

export function ghiCheDo(c: CheDoMang) {
  localStorage.setItem(KHOA_CHE_DO, JSON.stringify(c));
}

/** Chuẩn hóa địa chỉ nhập tay: thêm cổng mặc định nếu thiếu. */
export function chuanDiaChi(s: string): string | null {
  const t = s.trim();
  const m = /^(\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)(?::(\d{1,5}))?$/.exec(t);
  if (!m) return null;
  const cong = m[2] ? Number(m[2]) : CONG_MAC_DINH;
  if (cong < 1 || cong > 65535) return null;
  return `${m[1]}:${cong}`;
}
