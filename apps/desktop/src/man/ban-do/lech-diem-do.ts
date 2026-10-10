/**
 * 1.0.7 — Đối chiếu điểm đo hiện trạng với tọa độ ghi trong biên bản kiểm đếm (docs/08 §9.7): khoảng cách (m) theo
 * VN-2000; vượt ngưỡng do cán bộ đặt thì cảnh báo. Phần mềm không tự đặt ngưỡng (để trống = chỉ hiện khoảng cách).
 * Quy ước: biên bản ghi X = Bắc, Y = Đông; điểm đo trong phần mềm x = Đông, y = Bắc.
 */
import { laSoMay } from "../../so";
import type { DiemDoHienTrang } from "../../mo-hinh";

export function lechDiemDo(d: Pick<DiemDoHienTrang, "x" | "y" | "toaDoBienBan">, nguong?: string): { kc: number; vuot: boolean } | null {
  const bb = d.toaDoBienBan;
  if (!bb || !laSoMay(bb.x) || !laSoMay(bb.y)) return null;
  const kc = Math.hypot(d.x - Number(bb.y), d.y - Number(bb.x));
  const n = nguong?.trim() && laSoMay(nguong.trim()) && Number(nguong) > 0 ? Number(nguong) : null;
  return { kc, vuot: n !== null && kc > n };
}
