/**
 * Hoàn tác lần đổi bước gần nhất (0.9.27): bước chung 1–4 của dự án / đợt thu hồi và tiến độ của từng hộ (các thao tác
 * lưu ngay: gửi duyệt, xác nhận xong, không áp dụng, giải quyết vướng mắc…). Giữ trong phiên làm việc (tắt phần mềm thì
 * mất), mỗi đối tượng một lần gần nhất. Chỉ hoàn tác khi các bước đã đổi chưa bị sửa tiếp — tránh ghi đè thay đổi của
 * người khác; quy tắc gửi – duyệt vẫn áp dụng khi lưu (máy chủ kiểm lại).
 */
import type { BuocHo } from "./mo-hinh";

export type TienDo = Record<string, BuocHo | undefined>;

export interface LanDoiBuoc {
  /** "chung:<duAnId>:<dotId>" hoặc "ho:<hoId>" */
  khoa: string;
  moTa: string;
  luc: string;
  truoc: TienDo;
  sau: TienDo;
}

const lan = new Map<string, LanDoiBuoc>();
const giong = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Các bước khác nhau giữa trước và sau. */
export const buocDoi = (l: Pick<LanDoiBuoc, "truoc" | "sau">) => [...new Set([...Object.keys(l.truoc), ...Object.keys(l.sau)])].filter((ma) => !giong(l.truoc[ma], l.sau[ma]));

/** Ghi nhận một lần đổi (bỏ qua nếu không có bước nào đổi). */
export function ghiLanDoi(khoa: string, moTa: string, truoc: TienDo, sau: TienDo): LanDoiBuoc | undefined {
  const l: LanDoiBuoc = { khoa, moTa, luc: new Date().toISOString(), truoc: structuredClone(truoc), sau: structuredClone(sau) };
  if (!buocDoi(l).length) return undefined;
  lan.set(khoa, l);
  return l;
}
export const docLanDoi = (khoa: string) => lan.get(khoa);
export const boLanDoi = (khoa: string) => void lan.delete(khoa);

/** Hoàn tác cần quyền xác nhận bước khi có bước đổi vào/ra trạng thái Hoàn thành, Không áp dụng. */
export const canQuyenDuyet = (l: LanDoiBuoc) =>
  buocDoi(l).some((ma) => [l.truoc[ma]?.trangThai, l.sau[ma]?.trangThai].some((t) => t === "XONG" || t === "KHONG_AP_DUNG"));

/** Tiến độ sau khi hoàn tác, hoặc lỗi nếu bước đã bị sửa tiếp sau lần đổi. */
export function hoanTacLan(l: LanDoiBuoc, hienTai: TienDo): { tienDo: TienDo } | { loi: string } {
  const doi = buocDoi(l);
  const daSua = doi.filter((ma) => !giong(hienTai[ma], l.sau[ma]));
  if (daSua.length) return { loi: `Bước ${daSua.join(", ")} đã được sửa tiếp sau lần "${l.moTa}" — không hoàn tác (tránh ghi đè thay đổi mới)` };
  const tienDo: TienDo = { ...hienTai };
  for (const ma of doi) {
    if (l.truoc[ma]) tienDo[ma] = structuredClone(l.truoc[ma]);
    else delete tienDo[ma];
  }
  return { tienDo };
}
