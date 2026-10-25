/**
 * 1.3.1 — Điểm tọa độ tuyến giá đất ghi trong phụ biểu NQ 28/2026/NQ-HĐND (WGS-84: đầu, cuối, giữa tuyến) đổi sang VN-2000 theo
 * kinh tuyến trục đang dùng cho ảnh nền của dự án — lớp tham khảo trên bản đồ, gợi ý tuyến gần thửa. Không dùng xác định vị
 * trí thửa: cán bộ xác nhận vị trí, tuyến theo hồ sơ địa chính khi chọn giá.
 */
import { wgs84SangVn2000, type Diem, type HeVn2000 } from "@gpmb/gis";
import type { SuaBangGia } from "../../bang-gia-nq28";

export interface TuyenToaDo {
  nhan: string;
  tuyen: string;
  vt: (number | null)[];
  diem: Diem[];
}

export function tuyenCoToaDo(sua: SuaBangGia, xa: string, he: HeVn2000): TuyenToaDo[] {
  return sua.bo_sung.dat_o
    .filter((r) => r.xa === xa && r.toa_do?.length)
    .map((r) => ({ nhan: r.tuyen.length > 40 ? `${r.tuyen.slice(0, 38)}…` : r.tuyen, tuyen: r.tuyen, vt: r.vt, diem: r.toa_do!.map(([lat, lon]) => wgs84SangVn2000({ lat, lon }, he)) }));
}

/** Tuyến có điểm tọa độ gần điểm `d` nhất trong bán kính (m). */
export function tuyenGanNhat(ds: TuyenToaDo[], d: Diem, banKinh = 1500): { t: TuyenToaDo; m: number } | null {
  let tot: { t: TuyenToaDo; m: number } | null = null;
  for (const t of ds)
    for (const p of t.diem) {
      const m = Math.hypot(p.x - d.x, p.y - d.y);
      if (m <= banKinh && (!tot || m < tot.m)) tot = { t, m };
    }
  return tot;
}
