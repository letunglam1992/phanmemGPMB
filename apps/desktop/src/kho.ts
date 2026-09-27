/**
 * Lưu trữ cục bộ trên máy (IndexedDB của WebView2). Không đồng bộ, không gửi dữ liệu ra ngoài.
 * Giao diện Kho tách khỏi cách lưu để thay bằng SQLite (tauri-plugin-sql) mà không đổi màn hình.
 */
import type { DuAn, Ho } from "./mo-hinh";
import type { NguoiDung } from "./tai-khoan";
import { taoDong, type DongNhatKy } from "./nhat-ky";

export interface Kho {
  dsDuAn(): Promise<DuAn[]>;
  luuDuAn(d: DuAn): Promise<void>;
  xoaDuAn(id: string): Promise<void>;
  dsHo(duAnId: string): Promise<Ho[]>;
  luuHo(h: Ho): Promise<void>;
  xoaHo(id: string): Promise<void>;
  luuBanDo(duAnId: string, bytes: Uint8Array): Promise<void>;
  docBanDo(duAnId: string): Promise<Uint8Array | null>;
  /** Mẫu văn bản do cán bộ tự chỉnh (thay mẫu gốc). */
  luuMau(ma: string, bytes: Uint8Array, tenTep: string): Promise<void>;
  docMau(ma: string): Promise<{ bytes: Uint8Array; tenTep: string; luc: string } | null>;
  xoaMau(ma: string): Promise<void>;
  dsMauTuy(): Promise<string[]>;
  dsBanDo(): Promise<string[]>;
  /** Xóa toàn bộ dữ liệu nghiệp vụ (dùng khi khôi phục kiểu thay thế). Không xóa tài khoản, nhật ký hệ thống. */
  xoaTatCa(): Promise<void>;
  dsNguoiDung(): Promise<NguoiDung[]>;
  luuNguoiDung(u: NguoiDung): Promise<void>;
  /** Ghi nối tiếp một dòng nhật ký hệ thống (chuỗi băm). */
  ghiNhatKy(e: { nguoi: string; hoTen: string; hanhDong: string; chiTiet?: string }): Promise<DongNhatKy>;
  dsNhatKy(): Promise<DongNhatKy[]>;
}

const TEN_CSDL = "gpmb-sonla";
const PHIEN_BAN = 3;

function mo(): Promise<IDBDatabase> {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(TEN_CSDL, PHIEN_BAN);
    r.onupgradeneeded = (e) => {
      const db = r.result;
      if (e.oldVersion < 1) {
        db.createObjectStore("duAn", { keyPath: "id" });
        db.createObjectStore("ho", { keyPath: "id" }).createIndex("duAnId", "duAnId");
        db.createObjectStore("banDo");
      }
      if (e.oldVersion < 2) db.createObjectStore("mauVanBan");
      if (e.oldVersion < 3) {
        db.createObjectStore("nguoiDung", { keyPath: "ten" });
        db.createObjectStore("nhatKyHT", { keyPath: "stt" });
      }
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error);
  });
}

function yc<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, loi) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error);
  });
}

export function taoKhoIndexedDb(): Kho {
  const db = mo();
  const store = async (ten: string, che: IDBTransactionMode = "readonly") => (await db).transaction(ten, che).objectStore(ten);
  return {
    async dsDuAn() {
      return yc((await store("duAn")).getAll()) as Promise<DuAn[]>;
    },
    async luuDuAn(d) {
      await yc((await store("duAn", "readwrite")).put(d));
    },
    async xoaDuAn(id) {
      await yc((await store("duAn", "readwrite")).delete(id));
      const hos = await this.dsHo(id);
      for (const h of hos) await this.xoaHo(h.id);
      await yc((await store("banDo", "readwrite")).delete(id));
    },
    async dsHo(duAnId) {
      return yc((await store("ho")).index("duAnId").getAll(duAnId)) as Promise<Ho[]>;
    },
    async luuHo(h) {
      await yc((await store("ho", "readwrite")).put(h));
    },
    async xoaHo(id) {
      await yc((await store("ho", "readwrite")).delete(id));
    },
    async luuBanDo(duAnId, bytes) {
      await yc((await store("banDo", "readwrite")).put(bytes, duAnId));
    },
    async docBanDo(duAnId) {
      return ((await yc((await store("banDo")).get(duAnId))) as Uint8Array | undefined) ?? null;
    },
    async luuMau(ma, bytes, tenTep) {
      await yc((await store("mauVanBan", "readwrite")).put({ bytes, tenTep, luc: new Date().toISOString() }, ma));
    },
    async docMau(ma) {
      return ((await yc((await store("mauVanBan")).get(ma))) as { bytes: Uint8Array; tenTep: string; luc: string } | undefined) ?? null;
    },
    async xoaMau(ma) {
      await yc((await store("mauVanBan", "readwrite")).delete(ma));
    },
    async dsMauTuy() {
      return ((await yc((await store("mauVanBan")).getAllKeys())) as string[]) ?? [];
    },
    async dsBanDo() {
      return ((await yc((await store("banDo")).getAllKeys())) as string[]) ?? [];
    },
    async xoaTatCa() {
      for (const ten of ["duAn", "ho", "banDo", "mauVanBan"]) await yc((await store(ten, "readwrite")).clear());
    },
    async dsNguoiDung() {
      return yc((await store("nguoiDung")).getAll()) as Promise<NguoiDung[]>;
    },
    async luuNguoiDung(u) {
      await yc((await store("nguoiDung", "readwrite")).put(u));
    },
    async ghiNhatKy(e) {
      // tính băm ngoài giao dịch (giao dịch IndexedDB tự đóng khi chờ crypto); add() lỗi nếu trùng stt → thử lại
      for (let lan = 0; lan < 5; lan++) {
        const c = await yc((await store("nhatKyHT")).openCursor(null, "prev"));
        const d = await taoDong((c?.value as DongNhatKy | undefined) ?? null, e);
        try {
          await yc((await store("nhatKyHT", "readwrite")).add(d));
          return d;
        } catch {
          /* dòng khác vừa ghi — thử lại */
        }
      }
      throw new Error("Không ghi được nhật ký hệ thống");
    },
    async dsNhatKy() {
      return yc((await store("nhatKyHT")).getAll()) as Promise<DongNhatKy[]>;
    },
  };
}

/** Kho trong bộ nhớ – dùng cho kiểm thử. */
export function taoKhoBoNho(): Kho {
  const duAn = new Map<string, DuAn>();
  const ho = new Map<string, Ho>();
  const banDo = new Map<string, Uint8Array>();
  const mau = new Map<string, { bytes: Uint8Array; tenTep: string; luc: string }>();
  const nguoi = new Map<string, NguoiDung>();
  const nk: DongNhatKy[] = [];
  return {
    async dsDuAn() {
      return [...duAn.values()];
    },
    async luuDuAn(d) {
      duAn.set(d.id, structuredClone(d));
    },
    async xoaDuAn(id) {
      duAn.delete(id);
      for (const h of [...ho.values()]) if (h.duAnId === id) ho.delete(h.id);
      banDo.delete(id);
    },
    async dsHo(duAnId) {
      return [...ho.values()].filter((h) => h.duAnId === duAnId);
    },
    async luuHo(h) {
      ho.set(h.id, structuredClone(h));
    },
    async xoaHo(id) {
      ho.delete(id);
    },
    async luuBanDo(id, b) {
      banDo.set(id, b);
    },
    async docBanDo(id) {
      return banDo.get(id) ?? null;
    },
    async luuMau(ma, bytes, tenTep) {
      mau.set(ma, { bytes, tenTep, luc: new Date().toISOString() });
    },
    async docMau(ma) {
      return mau.get(ma) ?? null;
    },
    async xoaMau(ma) {
      mau.delete(ma);
    },
    async dsMauTuy() {
      return [...mau.keys()];
    },
    async dsBanDo() {
      return [...banDo.keys()];
    },
    async xoaTatCa() {
      duAn.clear();
      ho.clear();
      banDo.clear();
      mau.clear();
    },
    async dsNguoiDung() {
      return [...nguoi.values()].map((u) => structuredClone(u));
    },
    async luuNguoiDung(u) {
      nguoi.set(u.ten, structuredClone(u));
    },
    async ghiNhatKy(e) {
      const d = await taoDong(nk.at(-1) ?? null, e);
      nk.push(d);
      return d;
    },
    async dsNhatKy() {
      return nk.map((d) => ({ ...d }));
    },
  };
}
