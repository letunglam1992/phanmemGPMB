/**
 * Lưu trữ cục bộ trên máy (IndexedDB của WebView2). Không đồng bộ, không gửi dữ liệu ra ngoài.
 * Giao diện Kho tách khỏi cách lưu để thay bằng SQLite (tauri-plugin-sql) mà không đổi màn hình.
 */
import type { DuAn, Ho } from "./mo-hinh";
import type { NguoiDung } from "./tai-khoan";
import { taoDong, type DongNhatKy } from "./nhat-ky";

/**
 * Một lô ghi nguyên tử (P0-6): tất cả hoặc không gì cả. Thứ tự áp dụng: xoaTatCa → xoaDuAn → xoaHo → ghi dự án,
 * hồ sơ → bản đồ, mẫu.
 */
export interface LoGhi {
  xoaTatCa?: boolean;
  /** Khôi phục dữ liệu: ghi đè không kiểm phiên bản (mạng nội bộ — cần quyền KHOI_PHUC). */
  ghiDe?: boolean;
  xoaDuAn?: string[];
  xoaHo?: string[];
  duAn?: DuAn[];
  ho?: Ho[];
  /** bytes null = xóa */
  banDo?: { duAnId: string; bytes: Uint8Array | null }[];
  mau?: { ma: string; bytes: Uint8Array | null; tenTep?: string; luc?: string }[];
}

export interface Kho {
  /** Ghi nhiều bản ghi trong một giao dịch (nhập Excel, tạo từ bản đồ, cập nhật hàng loạt, xóa dự án, khôi phục). */
  ghiLo(lo: LoGhi): Promise<void>;
  dsDuAn(): Promise<DuAn[]>;
  luuDuAn(d: DuAn): Promise<void>;
  xoaDuAn(id: string): Promise<void>;
  dsHo(duAnId: string): Promise<Ho[]>;
  luuHo(h: Ho): Promise<void>;
  xoaHo(id: string): Promise<void>;
  luuBanDo(duAnId: string, bytes: Uint8Array): Promise<void>;
  docBanDo(duAnId: string): Promise<Uint8Array | null>;
  /** Xóa tệp bản đồ đã nạp của dự án (để nạp bản đồ mới). */
  xoaBanDo(duAnId: string): Promise<void>;
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
  /** Cài đặt dùng chung (lịch ngày nghỉ, tự động sao lưu…). */
  docCaiDat<T>(khoa: string): Promise<T | null>;
  luuCaiDat(khoa: string, giaTri: unknown): Promise<void>;
}

const TEN_CSDL = "gpmb-sonla";
const PHIEN_BAN = 4;

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
      if (e.oldVersion < 4) db.createObjectStore("caiDat");
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
      await this.ghiLo({ xoaDuAn: [id] });
    },
    async ghiLo(lo) {
      // Một giao dịch IndexedDB trên mọi kho liên quan; lỗi bất kỳ → abort, không ghi gì
      const t = (await db).transaction(["duAn", "ho", "banDo", "mauVanBan"], "readwrite");
      const xong = new Promise<void>((ok, loi) => {
        t.oncomplete = () => ok();
        t.onerror = () => loi(t.error ?? new Error("Lỗi ghi dữ liệu"));
        t.onabort = () => loi(t.error ?? new Error("Đã hủy ghi — dữ liệu không thay đổi"));
      });
      xong.catch(() => undefined); // tránh "unhandled" khi nhánh catch dưới đây ném lỗi trước
      const s = (n: string) => t.objectStore(n);
      try {
        if (lo.xoaTatCa) for (const n of ["duAn", "ho", "banDo", "mauVanBan"]) s(n).clear();
        for (const id of lo.xoaDuAn ?? []) {
          s("duAn").delete(id);
          for (const k of await yc(s("ho").index("duAnId").getAllKeys(id))) s("ho").delete(k);
          s("banDo").delete(id);
        }
        for (const id of lo.xoaHo ?? []) s("ho").delete(id);
        for (const d of lo.duAn ?? []) s("duAn").put(d);
        for (const h of lo.ho ?? []) s("ho").put(h);
        for (const b of lo.banDo ?? []) b.bytes ? s("banDo").put(b.bytes, b.duAnId) : s("banDo").delete(b.duAnId);
        for (const m of lo.mau ?? []) m.bytes ? s("mauVanBan").put({ bytes: m.bytes, tenTep: m.tenTep ?? `${m.ma}.docx`, luc: m.luc ?? new Date().toISOString() }, m.ma) : s("mauVanBan").delete(m.ma);
      } catch (e) {
        try {
          t.abort();
        } catch {
          /* giao dịch đã kết thúc */
        }
        throw e;
      }
      await xong;
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
    async xoaBanDo(duAnId) {
      await yc((await store("banDo", "readwrite")).delete(duAnId));
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
    async docCaiDat<T>(khoa: string) {
      return ((await yc((await store("caiDat")).get(khoa))) as T | undefined) ?? null;
    },
    async luuCaiDat(khoa, giaTri) {
      await yc((await store("caiDat", "readwrite")).put(giaTri, khoa));
    },
  };
}

/**
 * Kho trong bộ nhớ – dùng cho kiểm thử. `thuLoi(buoc)` (kiểm thử): gọi trước mỗi thao tác của ghiLo, ném lỗi để
 * giả lập hỏng giữa chừng.
 */
export function taoKhoBoNho(tuyChon: { thuLoi?: (buoc: number) => void } = {}): Kho {
  const duAn = new Map<string, DuAn>();
  const ho = new Map<string, Ho>();
  const banDo = new Map<string, Uint8Array>();
  const mau = new Map<string, { bytes: Uint8Array; tenTep: string; luc: string }>();
  const nguoi = new Map<string, NguoiDung>();
  const nk: DongNhatKy[] = [];
  const caiDat = new Map<string, unknown>();
  return {
    async dsDuAn() {
      return [...duAn.values()];
    },
    async luuDuAn(d) {
      duAn.set(d.id, structuredClone(d));
    },
    async xoaDuAn(id) {
      await this.ghiLo({ xoaDuAn: [id] });
    },
    async ghiLo(lo) {
      // Sao lưu trạng thái, áp dụng; lỗi → trả lại nguyên trạng
      const truoc = [new Map(duAn), new Map(ho), new Map(banDo), new Map(mau)] as const;
      let buoc = 0;
      const b = () => tuyChon.thuLoi?.(buoc++);
      try {
        if (lo.xoaTatCa) {
          b();
          duAn.clear();
          ho.clear();
          banDo.clear();
          mau.clear();
        }
        for (const id of lo.xoaDuAn ?? []) {
          b();
          duAn.delete(id);
          for (const h of [...ho.values()]) if (h.duAnId === id) ho.delete(h.id);
          banDo.delete(id);
        }
        for (const id of lo.xoaHo ?? []) (b(), ho.delete(id));
        for (const d of lo.duAn ?? []) (b(), duAn.set(d.id, structuredClone(d)));
        for (const h of lo.ho ?? []) (b(), ho.set(h.id, structuredClone(h)));
        for (const x of lo.banDo ?? []) (b(), x.bytes ? banDo.set(x.duAnId, x.bytes) : banDo.delete(x.duAnId));
        for (const m of lo.mau ?? []) (b(), m.bytes ? mau.set(m.ma, { bytes: m.bytes, tenTep: m.tenTep ?? `${m.ma}.docx`, luc: m.luc ?? new Date().toISOString() }) : mau.delete(m.ma));
      } catch (e) {
        for (const [dich, goc] of [[duAn, truoc[0]], [ho, truoc[1]], [banDo, truoc[2]], [mau, truoc[3]]] as [Map<string, unknown>, Map<string, unknown>][]) {
          dich.clear();
          for (const [k, v] of goc) dich.set(k, v);
        }
        throw e;
      }
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
    async xoaBanDo(id) {
      banDo.delete(id);
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
    async docCaiDat<T>(khoa: string) {
      return caiDat.has(khoa) ? (structuredClone(caiDat.get(khoa)) as T) : null;
    },
    async luuCaiDat(khoa, giaTri) {
      caiDat.set(khoa, structuredClone(giaTri));
    },
  };
}
