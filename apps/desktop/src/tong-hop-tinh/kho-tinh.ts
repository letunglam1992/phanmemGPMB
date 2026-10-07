/**
 * Kho tổng hợp cấp tỉnh — trên máy cấp tỉnh, tách khỏi dữ liệu nghiệp vụ (IndexedDB riêng "gpmb-tong-hop-tinh"):
 *   khoa   – khóa cấp tỉnh (khóa bí mật đã mã hóa bằng mật khẩu khóa)
 *   goi    – gói mới nhất của từng đơn vị gửi (giữ nguyên bản mã hóa) + tóm tắt số liệu để xem nhanh không cần mật khẩu
 *   nhatKy – lịch sử nhận gói (thời điểm, nguồn: tệp / cổng, kết quả)
 *   tuyen  – dự án liên xã do tỉnh khai: mã dùng chung, tên, chủ đầu tư, xã dọc tuyến, đoạn ghép tay (1.0.4, lien-xa.ts)
 *   banCu, banCuTep – các bản gửi trước của từng đơn vị (thông tin + tóm tắt; tệp gói riêng để danh sách nhẹ), giữ tối đa
 *                     GIU_BAN_CU bản mỗi đơn vị (giới hạn dung lượng máy, bản cũ nhất bị bỏ)
 * Chi tiết hồ sơ chỉ giải mã khi xem (cần mật khẩu khóa) và chỉ giữ trong bộ nhớ.
 */
import { docThongTinGoi, giaiMaGoi, LoiGoiTinh, tomTatBan, type KhoaTinh, type ThongTinGoi, type TomTatDuAn } from "./goi-tinh";
import type { BanSaoLuu } from "../sao-luu";
import type { TuyenLienXa } from "./lien-xa";

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
    const r = indexedDB.open(TEN, 3);
    r.onupgradeneeded = (e) => {
      const db = r.result;
      if (e.oldVersion < 1) {
        db.createObjectStore("khoa");
        db.createObjectStore("goi", { keyPath: "maGui" });
        db.createObjectStore("nhatKy", { keyPath: "stt", autoIncrement: true });
      }
      if (e.oldVersion < 2) {
        db.createObjectStore("banCu", { keyPath: "id", autoIncrement: true }).createIndex("maGui", "maGui");
        db.createObjectStore("banCuTep");
      }
      if (e.oldVersion < 3) db.createObjectStore("tuyen", { keyPath: "ma" });
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
export const dsTuyen = () => giaoDich<TuyenLienXa[]>("tuyen", "readonly", (s) => s.getAll());
export const luuTuyen = (t: TuyenLienXa) => giaoDich("tuyen", "readwrite", (s) => void s.put(t));
export const xoaTuyen = (ma: string) => giaoDich("tuyen", "readwrite", (s) => void s.delete(ma));
export const dsGoi = () => giaoDich<BanGhiGoi[]>("goi", "readonly", (s) => s.getAll());
export const docGoi = async (maGui: string) => ((await giaoDich<BanGhiGoi | undefined>("goi", "readonly", (s) => s.get(maGui))) ?? null);
export async function xoaGoi(maGui: string) {
  await giaoDich("goi", "readwrite", (s) => void s.delete(maGui));
  for (const b of await dsBanCu(maGui)) await xoaBanCu(b.id);
}

/* ---------------- Bản gửi trước (xem lại số liệu các lần gửi cũ) ---------------- */

export const GIU_BAN_CU = 20;
export type BanCu = Omit<BanGhiGoi, "bytes"> & { id: number };
export const dsBanCu = async (maGui: string) =>
  (await giaoDich<BanCu[]>("banCu", "readonly", (s) => s.index("maGui").getAll(maGui))).sort((a, b) => b.thongTin.luc.localeCompare(a.thongTin.luc));
export const dsBanCuTatCa = () => giaoDich<BanCu[]>("banCu", "readonly", (s) => s.getAll());
export async function docBanCu(id: number): Promise<BanGhiGoi | null> {
  const m = await giaoDich<BanCu | undefined>("banCu", "readonly", (s) => s.get(id));
  const bytes = await giaoDich<Uint8Array | undefined>("banCuTep", "readonly", (s) => s.get(id));
  return m && bytes ? { ...m, bytes } : null;
}
async function xoaBanCu(id: number) {
  await giaoDich("banCu", "readwrite", (s) => void s.delete(id));
  await giaoDich("banCuTep", "readwrite", (s) => void s.delete(id));
}
/** Lưu một bản vào danh sách bản cũ (bỏ bản trùng thời điểm; vượt GIU_BAN_CU thì bỏ bản cũ nhất). */
async function luuBanCu(b: BanGhiGoi): Promise<boolean> {
  const ds = await dsBanCu(b.maGui);
  if (ds.some((x) => x.thongTin.luc === b.thongTin.luc)) return false;
  const { bytes, ...m } = b;
  const id = await giaoDich<IDBValidKey>("banCu", "readwrite", (s) => s.add(m));
  await giaoDich("banCuTep", "readwrite", (s) => void s.put(bytes, id));
  for (const x of [...ds].sort((a, c) => a.thongTin.luc.localeCompare(c.thongTin.luc)).slice(0, Math.max(0, ds.length + 1 - GIU_BAN_CU))) await xoaBanCu(x.id);
  return true;
}
export const dsNhanGoi = async () => (await giaoDich<DongNhanGoi[]>("nhatKy", "readonly", (s) => s.getAll())).sort((a, b) => (b.stt ?? 0) - (a.stt ?? 0));
const ghiNhan = (d: DongNhanGoi) => giaoDich("nhatKy", "readwrite", (s) => void s.add(d));

/** Khóa ký của đơn vị gửi khác lần nhận trước — có thể là gói giả danh (hoặc đơn vị cài lại phần mềm). */
export class LoiDoiKhoaKy extends LoiGoiTinh {
  constructor(public thongTin: ThongTinGoi, public vanTayCu: string) {
    super(`Gói của "${thongTin.donViGui}" được ký bằng khóa khác lần nhận trước. Chỉ nhận khi đã xác minh với đơn vị gửi (họ cài lại phần mềm hoặc đổi máy).`);
  }
}

export type KetQuaNhap = { loai: "MOI" | "CAP_NHAT"; banGhi: BanGhiGoi; ban: BanSaoLuu } | { loai: "CU_HON" | "TRUNG"; thongTin: ThongTinGoi; cu: BanGhiGoi };
/* CU_HON: gói cũ hơn bản đang có — được lưu vào danh sách bản cũ (nếu chưa có) để xem lại. */

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
    if (cu.thongTin.luc === thongTin.luc) {
      await nk("Đã có gói này — không nhập lại");
      return { loai: "TRUNG", thongTin, cu };
    }
    const moi = await luuBanCu({ maGui: thongTin.maGui, donViGui: thongTin.donViGui, thongTin, tomTat: tomTatBan(ban, o.homNay), nhanLuc: luc, nguon, bytes });
    await nk(moi ? "Cũ hơn gói đang có — lưu vào các bản trước" : "Đã có bản này trong các bản trước");
    return { loai: moi ? "CU_HON" : "TRUNG", thongTin, cu };
  }
  if (cu && cu.thongTin.khoaKy.vanTay !== thongTin.khoaKy.vanTay && !o.chapNhanDoiKhoa) {
    await nk("Từ chối: khóa ký khác lần trước (chờ xác minh)");
    throw new LoiDoiKhoaKy(thongTin, cu.thongTin.khoaKy.vanTay);
  }
  const banGhi: BanGhiGoi = { maGui: thongTin.maGui, donViGui: thongTin.donViGui, thongTin, tomTat: tomTatBan(ban, o.homNay), nhanLuc: luc, nguon, bytes };
  if (cu) await luuBanCu(cu); // bản đang có chuyển sang danh sách bản trước
  await giaoDich("goi", "readwrite", (s) => void s.put(banGhi));
  await nk(cu ? `Cập nhật (thay gói xuất ${cu.thongTin.luc.slice(0, 16).replace("T", " ")})${cu.thongTin.khoaKy.vanTay !== thongTin.khoaKy.vanTay ? " — đã chấp nhận khóa ký mới" : ""}` : "Nhận mới");
  return { loai: cu ? "CAP_NHAT" : "MOI", banGhi, ban };
}

/** Giải mã gói đã lưu để xem chi tiết. */
export async function moGoiDaLuu(b: BanGhiGoi, khoa: { tinh: KhoaTinh; biMat: CryptoKey }): Promise<BanSaoLuu> {
  const { thongTin, du } = await docThongTinGoi(b.bytes);
  return giaiMaGoi(thongTin, du, khoa.biMat, khoa.tinh.vanTay);
}
