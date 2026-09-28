/**
 * Tự động sao lưu định kỳ (bản cài Windows): tạo tệp .gpmb như sao lưu thủ công, vỏ ứng dụng ghi vào
 * thư mục trên máy (mặc định Documents\GPMB Son La\Sao luu) và chỉ giữ N bản mới nhất.
 * Không gửi dữ liệu ra ngoài. Trong trình duyệt (bản chạy thử) không có chức năng này.
 */
import type { Kho } from "./kho";
import { maHoaBanSaoLuu, taoBanSaoLuu } from "./sao-luu";
import { LoiMaHoa, type CachMaHoa, type KhoaKhoiPhuc } from "./ma-hoa";

/** Cài đặt: khóa khôi phục (khóa công khai + khóa bí mật đã mã hóa bằng mật khẩu khôi phục) — ma-hoa.ts. */
export const KHOA_KHOI_PHUC = "khoaKhoiPhuc";

export const KHOA_TU_DONG = "tuDongSaoLuu";

export interface CaiDatTuDong {
  bat: boolean;
  /** Chu kỳ (ngày). */
  soNgay: number;
  giuLai: number;
  /** "" = thư mục mặc định. */
  thuMuc: string;
  lanCuoi?: string;
  tepCuoi?: string;
  loiCuoi?: string;
  /** Lần thử gần nhất (để không thử lại liên tục khi lỗi — chờ 6 giờ). */
  thuLuc?: string;
}

export const MAC_DINH_TU_DONG: CaiDatTuDong = { bat: true, soNgay: 1, giuLai: 10, thuMuc: "" };

export const coVoWindows = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function goi<T>(lenh: string, thamSo?: Record<string, unknown> | Uint8Array, headers?: Record<string, string>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(lenh, thamSo as never, headers ? { headers } : undefined);
}

/** Windows DPAPI qua vỏ Rust (chỉ bản cài Windows). */
export const dpapiBoc = async (b: Uint8Array) => new Uint8Array(await goi<ArrayBuffer>("dpapi_boc", b));
export const dpapiMo = async (b: Uint8Array) => new Uint8Array(await goi<ArrayBuffer>("dpapi_mo", b));

/**
 * Cách mã hóa không cần người nhập mật khẩu (sao lưu tự động, bản sao lưu trước khi khôi phục / xóa hẳn dự án):
 * khóa khôi phục (nếu quản trị đã đặt) + DPAPI của Windows. Không có cách nào → báo lỗi, không ghi tệp không mã hóa.
 */
export async function cachTuDong(kho: Kho): Promise<CachMaHoa> {
  const khoiPhuc = await kho.docCaiDat<KhoaKhoiPhuc>(KHOA_KHOI_PHUC);
  const dpapi = coVoWindows() ? dpapiBoc : null;
  if (!khoiPhuc && !dpapi) throw new LoiMaHoa("Chưa đặt mật khẩu khôi phục (Cài đặt chung → Tự động sao lưu) — không tạo bản sao lưu không mã hóa");
  return { khoiPhuc, dpapi };
}
/** Cách mở tệp trên máy này (DPAPI) — dùng kèm mật khẩu người nhập. */
export const dpapiMoNeuCo = () => (coVoWindows() ? dpapiMo : null);

export const thuMucSaoLuu = (rieng: string) => goi<string>("thu_muc_sao_luu", { rieng });
export const moThuMucSaoLuu = (rieng: string) => goi<void>("mo_thu_muc_sao_luu", { rieng });

/** Đến hạn sao lưu tự động chưa (lanCuoi + soNgay ngày ≤ bây giờ). */
export function denHan(c: CaiDatTuDong, bayGio = new Date()): boolean {
  if (!c.bat) return false;
  if (c.loiCuoi && c.thuLuc && bayGio.getTime() - Date.parse(c.thuLuc) < 6 * 3600000) return false;
  if (!c.lanCuoi) return true;
  return bayGio.getTime() - Date.parse(c.lanCuoi) >= c.soNgay * 86400000 - 60_000;
}

export const tenTepTuDong = (luc: string) => `GPMB-tu-dong_${luc.slice(0, 19).replace(/[-:]/g, "").replace("T", "_")}.gpmb`;

/** Tạo và ghi một bản sao lưu tự động; trả về cài đặt đã cập nhật (lần cuối / lỗi). */
export async function saoLuuTuDong(kho: Kho, c: CaiDatTuDong): Promise<CaiDatTuDong> {
  const luc = new Date().toISOString();
  try {
    // Mã hóa (P0-5): khóa khôi phục + DPAPI; không có cách nào → lỗi, không ghi tệp rõ
    const bytes = await maHoaBanSaoLuu(await taoBanSaoLuu(kho), await cachTuDong(kho));
    const tep = await goi<string>("ghi_sao_luu", bytes, {
      "ten-tep": tenTepTuDong(luc),
      "giu-lai": String(c.giuLai),
      "thu-muc": encodeURIComponent(c.thuMuc),
    });
    return { ...c, lanCuoi: luc, thuLuc: luc, tepCuoi: tep, loiCuoi: undefined };
  } catch (e) {
    return { ...c, thuLuc: luc, loiCuoi: `${luc.slice(0, 16).replace("T", " ")}: ${String((e as Error)?.message ?? e)}` };
  }
}
