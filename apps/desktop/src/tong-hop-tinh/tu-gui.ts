/**
 * Cài đặt gửi tỉnh của đơn vị cấp xã và tự động gửi định kỳ lên cổng (docs/21). Chu kỳ (số ngày) do đơn vị tự đặt — không
 * có mặc định. Nội dung gửi theo lựa chọn đã lưu ở thẻ "Gửi lên tỉnh" (dự án bỏ ra, kèm tệp đính kèm, kèm bản đồ); dự án mới
 * thêm sau tự được gửi.
 */
import type { Kho } from "../kho";
import { KHOA_CD_GUI, KHOA_CD_KHOA_TINH, KHOA_CD_KY, LoiGoiTinh, taoGoiTinh, taoKhoaKy, type KhoaCongKhaiTinh, type KhoaKy } from "./goi-tinh";
import { guiGoiLenCong, type CauHinhCong } from "./cong-tinh";

export interface CaiDatGui {
  /** Mã nhận diện bộ dữ liệu gửi (cố định theo kho) */
  maGui: string;
  ten: string;
  lanGui?: { luc: string; cach: string };
  /** Dự án KHÔNG gửi (dự án mới thêm sau mặc định được gửi) */
  boQua?: string[];
  kemTep?: boolean;
  kemBanDo?: boolean;
  tuDong?: { bat: boolean; soNgay: number };
  /** Lần tự gửi không thành công gần nhất (thử lại sau 1 giờ) */
  loiTuGui?: { luc: string; loi: string };
}

const NGAY = 86_400_000;
/** Sự kiện yêu cầu kiểm tra tự gửi ngay (vừa bật / đổi chu kỳ). */
export const SU_KIEN_TU_GUI = "gpmb-tu-gui-kiem-tra";
const THU_LAI_SAU = 3_600_000;

/** Thời điểm tự gửi tiếp theo (null: chưa bật / chưa đặt chu kỳ). Chưa gửi lần nào: đến hạn ngay. */
export function lanTuGuiTiep(cd: CaiDatGui | null): Date | null {
  if (!cd?.tuDong?.bat || !(cd.tuDong.soNgay >= 1)) return null;
  return cd.lanGui ? new Date(new Date(cd.lanGui.luc).getTime() + cd.tuDong.soNgay * NGAY) : new Date(0);
}
export function denHanTuGui(cd: CaiDatGui | null, bayGio: Date): boolean {
  const tiep = lanTuGuiTiep(cd);
  if (!tiep || tiep.getTime() > bayGio.getTime()) return false;
  return !cd!.loiTuGui || bayGio.getTime() - new Date(cd!.loiTuGui.luc).getTime() >= THU_LAI_SAU;
}

export async function layKhoaKy(kho: Kho): Promise<KhoaKy> {
  let ky = await kho.docCaiDat<KhoaKy>(KHOA_CD_KY);
  if (!ky) {
    ky = await taoKhoaKy();
    await kho.luuCaiDat(KHOA_CD_KY, ky);
  }
  return ky;
}

/** Tạo gói theo cài đặt gửi đã lưu (dự án đang dùng, trừ dự án bỏ ra). */
export async function taoGoiTheoCaiDat(kho: Kho, cd: CaiDatGui, o: { ungDung: string; nguoiXuat: string; khoaTinh?: KhoaCongKhaiTinh | null }) {
  const khoaTinh = o.khoaTinh ?? (await kho.docCaiDat<KhoaCongKhaiTinh>(KHOA_CD_KHOA_TINH));
  if (!khoaTinh) throw new LoiGoiTinh("Chưa có khóa của tỉnh");
  const bo = new Set(cd.boQua ?? []);
  const duAnIds = (await kho.dsDuAn()).filter((d) => !d.daXoa && !bo.has(d.id)).map((d) => d.id);
  return taoGoiTinh(kho, { khoaTinh, khoaKy: await layKhoaKy(kho), maGui: cd.maGui, donViGui: cd.ten, duAnIds, kemDinhKem: cd.kemTep ?? true, kemBanDo: cd.kemBanDo ?? true, ungDung: o.ungDung, nguoiXuat: o.nguoiXuat });
}

/**
 * Tự gửi lên cổng nếu đến hạn. Trả về null nếu chưa đến hạn / chưa đủ điều kiện; ngược lại kết quả (đã ghi lại lần gửi
 * hoặc lỗi vào cài đặt).
 */
export async function tuGuiNeuDenHan(kho: Kho, cong: CauHinhCong, o: { ungDung: string; nguoiXuat: string; bayGio?: Date }): Promise<{ ok: boolean; chiTiet: string } | null> {
  const cd = await kho.docCaiDat<CaiDatGui>(KHOA_CD_GUI);
  const bayGio = o.bayGio ?? new Date();
  if (!cd || !cd.ten.trim() || !denHanTuGui(cd, bayGio)) return null;
  try {
    const g = await taoGoiTheoCaiDat(kho, cd, o);
    const r = await guiGoiLenCong(cong, g.bytes);
    const { loiTuGui: _bo, ...con } = cd;
    await kho.luuCaiDat(KHOA_CD_GUI, { ...con, lanGui: { luc: r.luc, cach: "tự động – cổng Cloudflare" } });
    return { ok: true, chiTiet: `${g.thongTin.soDuAn} dự án, ${g.thongTin.soHo} hồ sơ · ${(r.kichThuoc / 1048576).toFixed(1)} MB` };
  } catch (e) {
    const loi = String((e as Error)?.message ?? e);
    await kho.luuCaiDat(KHOA_CD_GUI, { ...cd, loiTuGui: { luc: bayGio.toISOString(), loi } });
    return { ok: false, chiTiet: loi };
  }
}
