/**
 * Lưu trữ cục bộ trên máy (IndexedDB của WebView2). Không đồng bộ, không gửi dữ liệu ra ngoài.
 * Giao diện Kho tách khỏi cách lưu để thay bằng SQLite (tauri-plugin-sql) mà không đổi màn hình.
 */
import type { DuAn, Ho } from "./mo-hinh";

export interface Kho {
  dsDuAn(): Promise<DuAn[]>;
  luuDuAn(d: DuAn): Promise<void>;
  xoaDuAn(id: string): Promise<void>;
  dsHo(duAnId: string): Promise<Ho[]>;
  luuHo(h: Ho): Promise<void>;
  xoaHo(id: string): Promise<void>;
  luuBanDo(duAnId: string, bytes: Uint8Array): Promise<void>;
  docBanDo(duAnId: string): Promise<Uint8Array | null>;
}

const TEN_CSDL = "gpmb-sonla";
const PHIEN_BAN = 1;

function mo(): Promise<IDBDatabase> {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(TEN_CSDL, PHIEN_BAN);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore("duAn", { keyPath: "id" });
      db.createObjectStore("ho", { keyPath: "id" }).createIndex("duAnId", "duAnId");
      db.createObjectStore("banDo");
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
  };
}

/** Kho trong bộ nhớ – dùng cho kiểm thử. */
export function taoKhoBoNho(): Kho {
  const duAn = new Map<string, DuAn>();
  const ho = new Map<string, Ho>();
  const banDo = new Map<string, Uint8Array>();
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
  };
}
