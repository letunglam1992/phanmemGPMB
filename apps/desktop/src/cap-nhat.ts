/**
 * Cập nhật phần mềm (bản cài Windows): kiểm tra bản mới trên GitHub Releases, tải, kiểm chữ ký, cài đè — dữ liệu giữ nguyên.
 * Thao tác thật do vỏ Rust (`cap_nhat_kiem_tra`, `cap_nhat_cai_dat`); giao diện chỉ gọi lệnh. Chạy trong trình duyệt: không có.
 */
import { coVoWindows } from "./tu-dong-sao-luu";

export interface BanMoi {
  phien_ban: string;
  hien_tai: string;
  ngay: string | null;
  ghi_chu: string | null;
}
export interface KetQuaKiemTra {
  /** false: bản cài chưa gắn khóa ký → chưa bật cập nhật trong phần mềm */
  san_sang: boolean;
  hien_tai: string;
  ban_moi: BanMoi | null;
}

const KHOA = "gpmb-cap-nhat";
export interface CaiDatCapNhat {
  /** Tự kiểm tra khi mở phần mềm (tối đa 1 lần/ngày) */
  tuDong: boolean;
  lanCuoi?: string;
  /** Phiên bản người dùng chọn "Để sau" — không nhắc lại bản này */
  boQua?: string;
}
export const docCaiDat = (): CaiDatCapNhat => {
  try {
    return { tuDong: true, ...(JSON.parse(localStorage.getItem(KHOA) ?? "{}") as Partial<CaiDatCapNhat>) };
  } catch {
    return { tuDong: true };
  }
};
export const ghiCaiDat = (c: CaiDatCapNhat) => {
  try {
    localStorage.setItem(KHOA, JSON.stringify(c));
  } catch {
    /* bỏ qua */
  }
};

/** Đến lúc tự kiểm tra: bật tự động, đang chạy bản cài, lần cuối cách ≥ 20 giờ. */
export function denLucKiemTra(c: CaiDatCapNhat, bayGio = Date.now()): boolean {
  if (!c.tuDong || !coVoWindows()) return false;
  return !c.lanCuoi || bayGio - Date.parse(c.lanCuoi) >= 20 * 3600 * 1000;
}

export const coCapNhat = () => coVoWindows();

export async function kiemTraCapNhat(): Promise<KetQuaKiemTra> {
  const { invoke } = await import("@tauri-apps/api/core");
  const kq = await invoke<KetQuaKiemTra>("cap_nhat_kiem_tra");
  ghiCaiDat({ ...docCaiDat(), lanCuoi: new Date().toISOString() });
  return kq;
}

/** Tải và cài bản đã kiểm tra; `tienDo(phần trăm | null)`. Thành công thì phần mềm tự khởi động lại (không trả về). */
export async function caiDatCapNhat(tienDo: (pt: number | null, daTai: number) => void): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  const { listen } = await import("@tauri-apps/api/event");
  const bo = await listen<{ da_tai: number; tong: number | null }>("cap-nhat-tien-do", (e) => tienDo(e.payload.tong ? Math.min(100, Math.round((e.payload.da_tai / e.payload.tong) * 100)) : null, e.payload.da_tai));
  try {
    await invoke("cap_nhat_cai_dat");
  } finally {
    bo();
  }
}
