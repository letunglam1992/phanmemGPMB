/**
 * Nhớ trạng thái danh sách hộ của từng dự án trong phiên làm việc (không lưu xuống kho): bộ lọc, vị trí cuộn, thứ tự hộ
 * theo bộ lọc đang áp dụng, hộ vừa làm — để hồ sơ hộ chuyển "Hộ trước / Hộ tiếp theo" theo đúng danh sách đang lọc và
 * "Xong hộ này → Danh sách hộ" trở về đúng chỗ, tô sáng hộ vừa làm.
 */
export interface NhoDsHo {
  loc: string;
  locTt: string;
  locDot: string;
  locPc: string;
  locPl: string;
  /** Vị trí cuộn của khung nội dung (px). */
  cuon: number;
  /** Mã (id) hộ theo thứ tự danh sách đang lọc. */
  thuTu: string[];
  /** Hộ vừa làm (tô sáng khi quay lại danh sách). */
  vuaLam?: string;
}

const NHO = new Map<string, NhoDsHo>();
const MAC_DINH: NhoDsHo = { loc: "", locTt: "", locDot: "", locPc: "", locPl: "", cuon: 0, thuTu: [] };

export const layNhoDsHo = (duAnId: string): NhoDsHo => NHO.get(duAnId) ?? MAC_DINH;

export function ghiNhoDsHo(duAnId: string, p: Partial<NhoDsHo>) {
  NHO.set(duAnId, { ...layNhoDsHo(duAnId), ...p });
}

/** Khung cuộn của nội dung trang (thanh cuộn bên phải). */
export const khungNoiDung = (): HTMLElement | null => document.querySelector<HTMLElement>(".noi-dung");

/**
 * Hộ trước / tiếp theo của một hộ: theo thứ tự danh sách đang lọc đã nhớ; hộ không có trong danh sách lọc (mở từ nơi
 * khác) → theo thứ tự tất cả hộ của dự án.
 */
export function hoKeBen(duAnId: string, hoId: string, tatCa: string[]): { truoc?: string; sau?: string; viTri: number; tong: number; theoLoc: boolean } {
  const conLai = new Set(tatCa);
  const loc = layNhoDsHo(duAnId).thuTu.filter((id) => conLai.has(id));
  const theoLoc = loc.includes(hoId);
  const ds = theoLoc ? loc : tatCa;
  const i = ds.indexOf(hoId);
  return { truoc: i > 0 ? ds[i - 1] : undefined, sau: i >= 0 ? ds[i + 1] : undefined, viTri: i + 1, tong: ds.length, theoLoc };
}
