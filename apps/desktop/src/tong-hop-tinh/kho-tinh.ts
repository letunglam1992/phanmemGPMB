/**
 * Kho tổng hợp cấp tỉnh — trên máy cấp tỉnh, tách khỏi dữ liệu nghiệp vụ (IndexedDB riêng "gpmb-tong-hop-tinh"):
 *   khoa   – khóa cấp tỉnh (khóa bí mật đã mã hóa bằng mật khẩu khóa)
 *   goi    – gói mới nhất của từng đơn vị gửi (giữ nguyên bản mã hóa) + tóm tắt số liệu để xem nhanh không cần mật khẩu
 *   nhatKy – lịch sử nhận gói (thời điểm, nguồn: tệp / cổng, kết quả)
 * Chi tiết hồ sơ chỉ giải mã khi xem (cần mật khẩu khóa) và chỉ giữ trong bộ nhớ.
 */
import { docThongTinGoi, giaiMaGoi, LoiGoiTinh, tomTatBan, type KhoaTinh, type ThongTinGoi, type TomTatDuAn } from "./goi-tinh";
import type { BanSaoLuu } from "../sao-luu";

export interface BanGhiGoi {
  maGui: string;
  donViGui: string;
  thongTin: ThongTinGoi;
  tomTat: TomTatDuAn[];
  nhanLuc: string;
  nguon: "TEP" | "CONG";
  /** Gói nguyên bản (đã mã hóa) */
  bytes: Uint8Array;
}
export interface DongNhanGoi {
  stt?: number;
  luc: string;
  maGui: string;
  donViGui: string;
  lucXuat: string;
  nguon: "TEP" | "CONG";
  ketQua: string;
}

const TEN = "gpmb-tong-hop-tinh";
function mo(): Promise<IDBDatabase> {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(TEN, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore("khoa");
      db.createObjectStore("goi", { keyPath: "maGui" });
      db.createObjectStore("nhatKy", { keyPath: "stt", autoIncrement: true });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error);
  });
}
async function giaoDich<T>(kho: string, che: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await mo();
  return new Promise<T>((ok, loi) => {
    const tx = db.transaction(kho, che);
    const r = f(tx.objectStore(kho));
    tx.oncomplete = () => (db.close(), ok(r ? r.result : (undefined as T)));
    tx.onerror = () => (db.close(), loi(tx.error));
    tx.onabort = () => (db.close(), loi(tx.error));
  });
}

export const docKhoaTinh = async () => ((await giaoDich<KhoaTinh | undefined>("khoa", "readonly", (s) => s.get("tinh"))) ?? null);
export const luuKhoaTinh = (k: KhoaTinh) => giaoDich("khoa", "readwrite", (s) => void s.put(k, "tinh"));
export const dsGoi = () => giaoDich<BanGhiGoi[]>("goi", "readonly", (s) => s.getAll());
export const docGoi = async (maGui: string) => ((await giaoDich<BanGhiGoi | undefined>("goi", "readonly", (s) => s.get(maGui))) ?? null);
export const xoaGoi = (maGui: string) => giaoDich("goi", "readwrite", (s) => void s.delete(maGui));
export const dsNhanGoi = async () => (await giaoDich<DongNhanGoi[]>("nhatKy", "readonly", (s) => s.getAll())).sort((a, b) => (b.stt ?? 0) - (a.stt ?? 0));
const ghiNhan = (d: DongNhanGoi) => giaoDich("nhatKy", "readwrite", (s) => void s.add(d));

/** Khóa ký của đơn vị gửi khác lần nhận trước — có thể là gói giả danh (hoặc đơn vị cài lại phần mềm). */
export class LoiDoiKhoaKy extends LoiGoiTinh {
  constructor(public thongTin: ThongTinGoi, public vanTayCu: string) {
    super(`Gói của "${thongTin.donViGui}" được ký bằng khóa khác lần nhận trước. Chỉ nhận khi đã xác minh với đơn vị gửi (họ cài lại phần mềm hoặc đổi máy).`);
  }
}

export type KetQuaNhap = { loai: "MOI" | "CAP_NHAT"; banGhi: BanGhiGoi; ban: BanSaoLuu } | { loai: "CU_HON" | "TRUNG"; thongTin: ThongTinGoi; cu: BanGhiGoi };

/**
 * Nhập gói: kiểm chữ ký, mã băm → giải mã bằng khóa tỉnh → kiểm bản sao lưu → tóm tắt → lưu (thay gói cũ hơn của cùng đơn vị).
 * Gói cũ hơn / trùng gói đã có: không ghi. Khóa ký đổi: ném LoiDoiKhoaKy trừ khi `chapNhanDoiKhoa`.
 */
export async function nhapGoi(bytes: Uint8Array, khoa: { tinh: KhoaTinh; biMat: CryptoKey }, nguon: "TEP" | "CONG", o: { homNay: string; chapNhanDoiKhoa?: boolean }): Promise<KetQuaNhap> {
  const { thongTin, du } = await docThongTinGoi(bytes);
  const ban = await giaiMaGoi(thongTin, du, khoa.biMat, khoa.tinh.vanTay);
  const cu = await docGoi(thongTin.maGui);
  const luc = new Date().toISOString();
  const nk = (ketQua: string) => ghiNhan({ luc, maGui: thongTin.maGui, donViGui: thongTin.donViGui, lucXuat: thongTin.luc, nguon, ketQua });
  if (cu && cu.thongTin.luc >= thongTin.luc) {
    const loai = cu.thongTin.luc === thongTin.luc ? "TRUNG" : "CU_HON";
    await nk(loai === "TRUNG" ? "Đã có gói này — không nhập lại" : "Cũ hơn gói đang có — không nhập");
    return { loai, thongTin, cu };
  }
  if (cu && cu.thongTin.khoaKy.vanTay !== thongTin.khoaKy.vanTay && !o.chapNhanDoiKhoa) {
    await nk("Từ chối: khóa ký khác lần trước (chờ xác minh)");
    throw new LoiDoiKhoaKy(thongTin, cu.thongTin.khoaKy.vanTay);
  }
  const banGhi: BanGhiGoi = { maGui: thongTin.maGui, donViGui: thongTin.donViGui, thongTin, tomTat: tomTatBan(ban, o.homNay), nhanLuc: luc, nguon, bytes };
  await giaoDich("goi", "readwrite", (s) => void s.put(banGhi));
  await nk(cu ? `Cập nhật (thay gói xuất ${cu.thongTin.luc.slice(0, 16).replace("T", " ")})${cu.thongTin.khoaKy.vanTay !== thongTin.khoaKy.vanTay ? " — đã chấp nhận khóa ký mới" : ""}` : "Nhận mới");
  return { loai: cu ? "CAP_NHAT" : "MOI", banGhi, ban };
}

/** Giải mã gói đã lưu để xem chi tiết. */
export async function moGoiDaLuu(b: BanGhiGoi, khoa: { tinh: KhoaTinh; biMat: CryptoKey }): Promise<BanSaoLuu> {
  const { thongTin, du } = await docThongTinGoi(b.bytes);
  return giaiMaGoi(thongTin, du, khoa.biMat, khoa.tinh.vanTay);
}
