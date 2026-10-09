/**
 * 1.0.7 — Tính nền lần mở đầu với dữ liệu lớn: thay vì tính toàn bộ hộ trong một lần vẽ (≈ 10–14 s với 20.000 hộ, giao
 * diện đứng), chia thành từng lát ngắn (mặc định 12 ms) xen giữa các lần vẽ, ghi vào bộ nhớ đệm của `tinhHo`. Khi xong,
 * tăng `lan` để màn Tổng quan/chuông tính lại tổng hợp (lúc này mọi hộ đã có trong bộ nhớ đệm). Ít hộ chưa tính
 * (≤ NGUONG_NEN) thì không tính nền — nơi gọi tính ngay như trước. Kết quả tính không đổi (cùng hàm `tinhHo`).
 */
import type { BoChinhSach } from "@gpmb/core";
import type { DuAn, Ho } from "./mo-hinh";
import { daTinh, tinhHo } from "./tinh-ho";

export type ViecTinh = readonly [BoChinhSach, DuAn, Ho];
export interface TienDoNen {
  /** Số hộ đã tính / tổng số hộ của lần tính nền đang chạy (0/0 khi không chạy). */
  xong: number;
  tong: number;
  /** Tăng mỗi khi một lần tính nền xong. */
  lan: number;
}
export const NGUONG_NEN = 800;

let tienDo: TienDoNen = { xong: 0, tong: 0, lan: 0 };
let dang: { huy: boolean } | null = null;
const nghe = new Set<() => void>();
const phat = (t: TienDoNen) => {
  tienDo = t;
  nghe.forEach((f) => f());
};
export const ngheTinhNen = (f: () => void) => (nghe.add(f), () => void nghe.delete(f));
export const layTienDoNen = () => tienDo;
export const dangTinhNen = () => dang !== null;

/**
 * Bắt đầu tính nền các việc chưa có kết quả. Trả true nếu đang/đã bắt đầu tính nền (nơi gọi chưa nên tính tổng hợp),
 * false nếu số việc chưa tính ≤ nguong (tính ngay được). Gọi lại với danh sách mới thì hủy lần cũ (kết quả đã tính vẫn
 * giữ trong bộ nhớ đệm) và chỉ tính phần còn thiếu.
 */
export function tinhNen(viec: Iterable<ViecTinh>, o: { nguong?: number; lat?: number; hen?: (f: () => void) => void; dongHo?: () => number } = {}): boolean {
  const { nguong = NGUONG_NEN, lat = 12, hen = (f) => void setTimeout(f, 0), dongHo = () => performance.now() } = o;
  const con: ViecTinh[] = [];
  for (const v of viec) if (!daTinh(v[0], v[1], v[2])) con.push(v);
  if (dang) dang.huy = true;
  dang = null;
  if (con.length <= nguong) {
    if (tienDo.tong) phat({ xong: 0, tong: 0, lan: tienDo.lan });
    return false;
  }
  const ban = { huy: false };
  dang = ban;
  let i = 0, baoLuc = 0;
  phat({ xong: 0, tong: con.length, lan: tienDo.lan });
  const buoc = () => {
    if (ban.huy) return;
    const het = dongHo() + lat;
    do {
      const [cs, d, h] = con[i++]!;
      tinhHo(cs, d, h);
    } while (i < con.length && dongHo() < het);
    if (i >= con.length) {
      dang = null;
      phat({ xong: 0, tong: 0, lan: tienDo.lan + 1 });
      return;
    }
    // báo tiến độ thưa (≥ 200 ms) để không vẽ lại liên tục
    if (dongHo() - baoLuc >= 200) {
      baoLuc = dongHo();
      phat({ xong: i, tong: con.length, lan: tienDo.lan });
    }
    hen(buoc);
  };
  hen(buoc);
  return true;
}
