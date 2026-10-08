/**
 * Trạng thái phiên làm việc cấp tỉnh dùng chung giữa màn "Tổng hợp tỉnh" và phần chạy nền (TheoDoiGoiTinh):
 * khóa tỉnh đã mở (chỉ trong bộ nhớ, không lưu mật khẩu), các lần gửi trên cổng đã tải về máy này, gói đang chờ nhận (chuông).
 */
import { useSyncExternalStore } from "react";
import { LoiDoiKhoaKy, nhapGoi, type KetQuaNhap } from "./kho-tinh";
import { dsGoiTrenCong, taiGoiTuCong, type CauHinhCong, type GoiTrenCong } from "./cong-tinh";
import type { KhoaTinh } from "./goi-tinh";

let khoaMo: { vanTay: string; biMat: CryptoKey } | null = null;
export const layKhoaMo = () => khoaMo;
export function datKhoaMo(k: typeof khoaMo) {
  khoaMo = k;
  phat();
}

const KHOA_DA_TAI = "gpmb-cong-tinh-da-tai";
/** Lần gửi của từng xã trên cổng đã tải về máy này (mã xã → thời điểm gửi). */
export function docDaTai(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KHOA_DA_TAI) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
export function ghiDaTai(m: Record<string, string>) {
  try {
    localStorage.setItem(KHOA_DA_TAI, JSON.stringify(m));
  } catch {
    /* bỏ qua */
  }
}

/* ---- gói chờ nhận (cho chuông thông báo) ---- */
let choNhan: GoiTrenCong[] = [];
const nghe = new Set<() => void>();
function phat() {
  for (const f of nghe) f();
}
export function datChoNhan(ds: GoiTrenCong[]) {
  choNhan = ds;
  phat();
}
export const layChoNhan = () => choNhan;
export function useChoNhan(): GoiTrenCong[] {
  return useSyncExternalStore(
    (f) => {
      nghe.add(f);
      return () => void nghe.delete(f);
    },
    () => choNhan,
  );
}
/** Sự kiện: vừa nhận gói mới (màn tổng hợp tải lại danh sách). */
export const SU_KIEN_GOI_MOI = "gpmb-goi-tinh-moi";

export const chuaTai = (ds: GoiTrenCong[]) => {
  const d = docDaTai();
  return ds.filter((g) => (d[g.ma] ?? "") < g.luc);
};

/**
 * Tải và nhận các gói mới trên cổng (chưa tải về máy này). Khóa ký đổi: hỏi `xacNhanDoiKhoa` (không có → bỏ qua, giữ để lần
 * sau xác nhận). Trả về dòng kết quả cho từng gói và số gói đã nhận.
 */
export async function taiGoiMoi(
  cong: CauHinhCong,
  khoa: { tinh: KhoaTinh; biMat: CryptoKey },
  o: { homNay: string; xacNhanDoiKhoa?: (e: LoiDoiKhoaKy) => boolean; khiNhan?: (r: Extract<KetQuaNhap, { banGhi: unknown }>) => Promise<void>; tienDo?: (ten: string) => void },
): Promise<{ ketQua: string[]; soNhan: number; tongTrenCong: number }> {
  const tren = await dsGoiTrenCong(cong);
  const daTai = docDaTai();
  const ketQua: string[] = [];
  let soNhan = 0;
  for (const g of tren) {
    if ((daTai[g.ma] ?? "") >= g.luc) continue;
    o.tienDo?.(g.ten);
    try {
      const bytes = await taiGoiTuCong(cong, g.ma);
      let r: KetQuaNhap;
      try {
        r = await nhapGoi(bytes, khoa, "CONG", { homNay: o.homNay });
      } catch (e) {
        if (!(e instanceof LoiDoiKhoaKy)) throw e;
        if (!o.xacNhanDoiKhoa) {
          // chạy nền (không hỏi được): chưa đánh dấu đã tải để lần bấm "Tải gói mới từ cổng" sau hỏi xác nhận
          ketQua.push(`${g.ten}: chưa nhận — khóa ký của đơn vị gửi đổi, cần xác nhận (bấm "Tải gói mới từ cổng")`);
          continue;
        }
        if (!o.xacNhanDoiKhoa(e)) {
          ketQua.push(`${g.ten}: từ chối (khóa ký đổi, chưa xác minh)`);
          daTai[g.ma] = g.luc;
          ghiDaTai(daTai);
          continue;
        }
        r = await nhapGoi(bytes, khoa, "CONG", { homNay: o.homNay, chapNhanDoiKhoa: true });
      }
      if ("banGhi" in r) {
        soNhan++;
        await o.khiNhan?.(r);
        ketQua.push(`${r.banGhi.donViGui}: ${r.loai === "MOI" ? "nhận mới" : "cập nhật"} — ${r.banGhi.thongTin.soDuAn} dự án, ${r.banGhi.thongTin.soHo} hồ sơ`);
      } else ketQua.push(`${r.thongTin.donViGui}: ${r.loai === "TRUNG" ? "đã có gói này" : "cũ hơn gói đang có — lưu vào các bản trước"}`);
    } catch (e) {
      ketQua.push(`${g.ten}: ${String((e as Error)?.message ?? e)}`);
    }
    daTai[g.ma] = g.luc;
    ghiDaTai(daTai);
  }
  datChoNhan(chuaTai(tren));
  return { ketQua, soNhan, tongTrenCong: tren.length };
}

const KHOA_BAN_DA_TAI = "gpmb-cong-tinh-ban-da-tai";
const docBanDaTai = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(KHOA_BAN_DA_TAI) ?? "[]") as string[]); } catch { return new Set(); } };
const ghiBanDaTai = (s: Set<string>) => { try { localStorage.setItem(KHOA_BAN_DA_TAI, JSON.stringify([...s].slice(-500))); } catch { /* bỏ qua */ } };

/**
 * 1.0.5 — tải các bản cũ cổng còn giữ (tối đa 5 bản/xã) chưa có trên máy này: bản cũ hơn gói đang có vào "các bản trước"
 * (xem lại diễn biến), bản mới hơn thì nhận như thường. Khóa ký đổi → bỏ qua (cần xác nhận bằng "Tải gói mới từ cổng").
 */
export async function taiBanCu(cong: CauHinhCong, khoa: { tinh: KhoaTinh; biMat: CryptoKey }, o: { homNay: string; tienDo?: (ten: string) => void }): Promise<{ ketQua: string[]; soBan: number }> {
  const { dsBanTrenCong, taiBanTuCong } = await import("./cong-tinh");
  const daTai = docBanDaTai();
  const ketQua: string[] = [];
  let soBan = 0;
  for (const g of await dsGoiTrenCong(cong)) {
    o.tienDo?.(g.ten);
    let ds: { id: string; luc: string }[];
    try {
      ds = await dsBanTrenCong(cong, g.ma);
    } catch (e) {
      ketQua.push(`${g.ten}: ${(e as Error).message}`);
      continue;
    }
    for (const b of ds) {
      const k = `${g.ma}|${b.id}`;
      if (daTai.has(k)) continue;
      try {
        const r = await nhapGoi(await taiBanTuCong(cong, g.ma, b.id), khoa, "CONG", { homNay: o.homNay });
        if ("banGhi" in r) ketQua.push(`${g.ten} (${b.luc.slice(0, 10)}): ${r.loai === "MOI" ? "nhận mới" : "cập nhật"}`);
        else if (r.loai !== "TRUNG") ketQua.push(`${g.ten} (${b.luc.slice(0, 10)}): lưu vào các bản trước`);
        if ("banGhi" in r || r.loai !== "TRUNG") soBan++;
        daTai.add(k);
      } catch (e) {
        if (e instanceof LoiDoiKhoaKy) ketQua.push(`${g.ten} (${b.luc.slice(0, 10)}): khóa ký đổi — bỏ qua`);
        else ketQua.push(`${g.ten} (${b.luc.slice(0, 10)}): ${(e as Error).message}`);
      }
    }
  }
  ghiBanDaTai(daTai);
  return { ketQua, soBan };
}
