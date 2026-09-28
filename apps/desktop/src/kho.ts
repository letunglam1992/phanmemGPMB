/**
 * Giao diện kho dữ liệu và hai cách lưu cục bộ: IndexedDB (bản chạy trên trình duyệt; bản cài Windows trước 0.6.0) và
 * bộ nhớ (kiểm thử). Bản cài Windows từ 0.6.0 lưu máy đơn bằng SQLite qua lõi Rust (kho-mang.ts, gọi trong tiến trình).
 * Không đồng bộ, không gửi dữ liệu ra ngoài.
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
  /** Lý do ghi vào lịch sử cho bản cũ bị thay (mặc định "Sửa"). */
  lyDoLichSu?: string;
}

/** Bản ghi đã lưu (máy chủ có thể ghi thêm người gửi/duyệt, dấu xóa…) — giao diện cập nhật trạng thái bằng bản này (P1-2). */
export interface KetQuaGhi {
  duAn: DuAn[];
  ho: Ho[];
}

/** Một bản cũ của bản ghi (P1-5). */
export interface BanLichSu {
  stt: number;
  loai: "ho" | "duAn" | "pa";
  id: string;
  duAnId: string | null;
  phienBan: number | null;
  duLieu: unknown;
  suaLuc: string | null;
  suaBoi: string | null;
  /** Thời điểm bản này bị thay/xóa, người làm, lý do ("Sửa", "Xóa hẳn", "Trước khi khôi phục…"). */
  luuLuc: string;
  luuBoi: string | null;
  lyDo: string | null;
}

export interface Kho {
  /** Ghi nhiều bản ghi trong một giao dịch (nhập Excel, tạo từ bản đồ, cập nhật hàng loạt, xóa dự án, khôi phục). */
  ghiLo(lo: LoGhi): Promise<KetQuaGhi>;
  dsDuAn(): Promise<DuAn[]>;
  luuDuAn(d: DuAn): Promise<DuAn>;
  xoaDuAn(id: string): Promise<void>;
  dsHo(duAnId: string): Promise<Ho[]>;
  luuHo(h: Ho): Promise<Ho>;
  /** Lịch sử một bản ghi, mới nhất trước; `soNamGiu` = thời hạn giữ (0 = không thời hạn). */
  lichSu(loai: "ho" | "duAn", id: string): Promise<{ ds: BanLichSu[]; soNamGiu: number }>;
  /** Hồ sơ đã xóa hẳn còn trong lịch sử (bản cuối trước khi xóa). */
  hoDaXoaHan(duAnId: string): Promise<BanLichSu[]>;
  /** Khôi phục hồ sơ về một bản trong lịch sử (quản trị; bắt buộc lý do). */
  khoiPhucBanLichSu(stt: number, lyDo: string, nguoi: string): Promise<Ho>;
  /** Người đang đăng nhập — ghi vào lịch sử ở kho cục bộ (máy chủ lấy theo phiên). */
  datNguoi(ten: string): void;
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
const PHIEN_BAN = 5;

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
      if (e.oldVersion < 5) {
        const ls = db.createObjectStore("lichSu", { keyPath: "stt", autoIncrement: true });
        ls.createIndex("banGhi", ["loai", "id"]);
        ls.createIndex("luuLuc", "luuLuc");
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

const nam = (so: number) => new Date(Date.now() - (so * 365 + Math.floor(so / 4)) * 86400_000).toISOString();

/** Dựng bản khôi phục từ một bản lịch sử (dùng chung cho kho cục bộ; máy chủ làm tương tự ở may_chu.rs). */
export function dungBanKhoiPhuc(ls: BanLichSu, lyDo: string, nguoi: string, duAn: DuAn | undefined, hoKhac: Ho[]): Ho {
  if (ls.loai !== "ho") throw new Error("Chỉ khôi phục được hồ sơ hộ, cá nhân, tổ chức");
  if (!lyDo.trim()) throw new Error("Khôi phục cần ghi lý do");
  if (!duAn) throw new Error("Dự án của hồ sơ không còn — không khôi phục được");
  const h = structuredClone(ls.duLieu) as Ho;
  const ma = h.ma.trim().toUpperCase();
  const trung = hoKhac.find((x) => x.id !== h.id && ma && x.ma.trim().toUpperCase() === ma);
  if (trung) throw new Error(`Mã hồ sơ ${ma} đang dùng cho "${trung.ten}" — đổi mã hồ sơ đó trước khi khôi phục`);
  h.nhatKy = [...(h.nhatKy ?? []), { luc: new Date().toISOString(), nguoi, noiDung: `Quản trị khôi phục về phiên bản ${ls.phienBan ?? "?"} (lưu lúc ${ls.suaLuc ?? ls.luuLuc}): ${lyDo.trim()}` }];
  return h;
}

export function taoKhoIndexedDb(): Kho {
  const db = mo();
  let nguoi = "";
  const store = async (ten: string, che: IDBTransactionMode = "readonly") => (await db).transaction(ten, che).objectStore(ten);
  const donLichSu = async () => {
    const n = ((await yc((await store("caiDat")).get("giuLichSu"))) as { soNam?: number } | undefined)?.soNam ?? 0;
    if (!n) return 0;
    const s = await store("lichSu", "readwrite");
    const khoa = await yc(s.index("luuLuc").getAllKeys(IDBKeyRange.upperBound(nam(n), true)));
    for (const k of khoa) s.delete(k);
    return khoa.length;
  };
  void donLichSu().catch(() => undefined);
  const kho: Kho = {
    datNguoi(ten) {
      nguoi = ten;
    },
    async dsDuAn() {
      return yc((await store("duAn")).getAll()) as Promise<DuAn[]>;
    },
    async luuDuAn(d) {
      return (await this.ghiLo({ duAn: [d] })).duAn[0]!;
    },
    async xoaDuAn(id) {
      await this.ghiLo({ xoaDuAn: [id] });
    },
    async ghiLo(lo) {
      // Một giao dịch IndexedDB trên mọi kho liên quan; lỗi bất kỳ → abort, không ghi gì
      const t = (await db).transaction(["duAn", "ho", "banDo", "mauVanBan", "lichSu"], "readwrite");
      const xong = new Promise<void>((ok, loi) => {
        t.oncomplete = () => ok();
        t.onerror = () => loi(t.error ?? new Error("Lỗi ghi dữ liệu"));
        t.onabort = () => loi(t.error ?? new Error("Đã hủy ghi — dữ liệu không thay đổi"));
      });
      xong.catch(() => undefined); // tránh "unhandled" khi nhánh catch dưới đây ném lỗi trước
      const s = (n: string) => t.objectStore(n);
      const luc = new Date().toISOString();
      const ghiLs = (loai: "ho" | "duAn", cu: DuAn | Ho | undefined, lyDo: string) => {
        if (cu) s("lichSu").add({ loai, id: cu.id, duAnId: "duAnId" in cu ? cu.duAnId : cu.id, phienBan: null, duLieu: cu, suaLuc: null, suaBoi: null, luuLuc: luc, luuBoi: nguoi, lyDo });
      };
      try {
        if (lo.xoaTatCa) {
          for (const d of (await yc(s("duAn").getAll())) as DuAn[]) ghiLs("duAn", d, "Khôi phục kiểu thay thế toàn bộ");
          for (const h of (await yc(s("ho").getAll())) as Ho[]) ghiLs("ho", h, "Khôi phục kiểu thay thế toàn bộ");
          for (const n of ["duAn", "ho", "banDo", "mauVanBan"]) s(n).clear();
        }
        for (const id of lo.xoaDuAn ?? []) {
          ghiLs("duAn", (await yc(s("duAn").get(id))) as DuAn | undefined, "Xóa hẳn");
          s("duAn").delete(id);
          for (const h of (await yc(s("ho").index("duAnId").getAll(id))) as Ho[]) (ghiLs("ho", h, "Xóa hẳn"), s("ho").delete(h.id));
          s("banDo").delete(id);
        }
        for (const id of lo.xoaHo ?? []) {
          ghiLs("ho", (await yc(s("ho").get(id))) as Ho | undefined, "Xóa hẳn");
          s("ho").delete(id);
        }
        const lyDo = lo.lyDoLichSu ?? (lo.ghiDe ? "Ghi đè khi khôi phục dữ liệu" : "Sửa");
        for (const d of lo.duAn ?? []) {
          const cu = (await yc(s("duAn").get(d.id))) as DuAn | undefined;
          if (cu && JSON.stringify(cu) === JSON.stringify(d)) continue;
          ghiLs("duAn", cu, lyDo);
          s("duAn").put(d);
        }
        for (const h of lo.ho ?? []) {
          const cu = (await yc(s("ho").get(h.id))) as Ho | undefined;
          if (cu && JSON.stringify(cu) === JSON.stringify(h)) continue;
          ghiLs("ho", cu, lyDo);
          s("ho").put(h);
        }
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
      return { duAn: [...(lo.duAn ?? [])], ho: [...(lo.ho ?? [])] };
    },
    async dsHo(duAnId) {
      return yc((await store("ho")).index("duAnId").getAll(duAnId)) as Promise<Ho[]>;
    },
    async luuHo(h) {
      return (await this.ghiLo({ ho: [h] })).ho[0]!;
    },
    async xoaHo(id) {
      await this.ghiLo({ xoaHo: [id] });
    },
    async lichSu(loai, id) {
      const ds = (await yc((await store("lichSu")).index("banGhi").getAll([loai, id]))) as BanLichSu[];
      const soNamGiu = ((await yc((await store("caiDat")).get("giuLichSu"))) as { soNam?: number } | undefined)?.soNam ?? 0;
      return { ds: ds.sort((a, b) => b.stt - a.stt), soNamGiu };
    },
    async hoDaXoaHan(duAnId) {
      const ds = ((await yc((await store("lichSu")).getAll())) as BanLichSu[]).filter((x) => x.loai === "ho" && x.duAnId === duAnId);
      const cuoi = new Map<string, BanLichSu>();
      for (const x of ds) if ((cuoi.get(x.id)?.stt ?? -1) < x.stt) cuoi.set(x.id, x);
      const con = new Set(((await this.dsHo(duAnId)) as Ho[]).map((h) => h.id));
      return [...cuoi.values()].filter((x) => x.lyDo === "Xóa hẳn" && !con.has(x.id)).sort((a, b) => b.stt - a.stt);
    },
    async khoiPhucBanLichSu(stt, lyDo, ai) {
      const ls = (await yc((await store("lichSu")).get(stt))) as BanLichSu | undefined;
      if (!ls) throw new Error("Không còn bản lịch sử này");
      const h0 = ls.duLieu as Ho;
      const duAn = ((await this.dsDuAn()) as DuAn[]).find((d) => d.id === h0.duAnId);
      const h = dungBanKhoiPhuc(ls, lyDo, ai, duAn, duAn ? await this.dsHo(duAn.id) : []);
      await this.ghiLo({ ho: [h], lyDoLichSu: `Trước khi khôi phục về phiên bản ${ls.phienBan ?? "?"}` });
      return h;
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
      await this.ghiLo({ xoaTatCa: true });
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
      if (khoa === "giuLichSu") await donLichSu();
    },
  };
  return kho;
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
  let lichSu: BanLichSu[] = [];
  let sttLs = 0;
  let ai = "";
  const ghiLs = (loai: "ho" | "duAn", cu: DuAn | Ho | undefined, lyDo: string) => {
    if (cu) lichSu.push({ stt: ++sttLs, loai, id: cu.id, duAnId: "duAnId" in cu ? cu.duAnId : cu.id, phienBan: null, duLieu: structuredClone(cu), suaLuc: null, suaBoi: null, luuLuc: new Date().toISOString(), luuBoi: ai, lyDo });
  };
  return {
    datNguoi(ten) {
      ai = ten;
    },
    async dsDuAn() {
      return [...duAn.values()];
    },
    async luuDuAn(d) {
      return (await this.ghiLo({ duAn: [d] })).duAn[0]!;
    },
    async xoaDuAn(id) {
      await this.ghiLo({ xoaDuAn: [id] });
    },
    async ghiLo(lo) {
      // Sao lưu trạng thái, áp dụng; lỗi → trả lại nguyên trạng
      const truoc = [new Map(duAn), new Map(ho), new Map(banDo), new Map(mau)] as const;
      const lsTruoc = [...lichSu];
      const lyDo = lo.lyDoLichSu ?? (lo.ghiDe ? "Ghi đè khi khôi phục dữ liệu" : "Sửa");
      let buoc = 0;
      const b = () => tuyChon.thuLoi?.(buoc++);
      try {
        if (lo.xoaTatCa) {
          b();
          for (const d of duAn.values()) ghiLs("duAn", d, "Khôi phục kiểu thay thế toàn bộ");
          for (const h of ho.values()) ghiLs("ho", h, "Khôi phục kiểu thay thế toàn bộ");
          duAn.clear();
          ho.clear();
          banDo.clear();
          mau.clear();
        }
        for (const id of lo.xoaDuAn ?? []) {
          b();
          ghiLs("duAn", duAn.get(id), "Xóa hẳn");
          duAn.delete(id);
          for (const h of [...ho.values()]) if (h.duAnId === id) (ghiLs("ho", h, "Xóa hẳn"), ho.delete(h.id));
          banDo.delete(id);
        }
        for (const id of lo.xoaHo ?? []) (b(), ghiLs("ho", ho.get(id), "Xóa hẳn"), ho.delete(id));
        for (const d of lo.duAn ?? []) {
          b();
          const cu = duAn.get(d.id);
          if (cu && JSON.stringify(cu) === JSON.stringify(d)) continue;
          ghiLs("duAn", cu, lyDo);
          duAn.set(d.id, structuredClone(d));
        }
        for (const h of lo.ho ?? []) {
          b();
          const cu = ho.get(h.id);
          if (cu && JSON.stringify(cu) === JSON.stringify(h)) continue;
          ghiLs("ho", cu, lyDo);
          ho.set(h.id, structuredClone(h));
        }
        for (const x of lo.banDo ?? []) (b(), x.bytes ? banDo.set(x.duAnId, x.bytes) : banDo.delete(x.duAnId));
        for (const m of lo.mau ?? []) (b(), m.bytes ? mau.set(m.ma, { bytes: m.bytes, tenTep: m.tenTep ?? `${m.ma}.docx`, luc: m.luc ?? new Date().toISOString() }) : mau.delete(m.ma));
      } catch (e) {
        for (const [dich, goc] of [[duAn, truoc[0]], [ho, truoc[1]], [banDo, truoc[2]], [mau, truoc[3]]] as [Map<string, unknown>, Map<string, unknown>][]) {
          dich.clear();
          for (const [k, v] of goc) dich.set(k, v);
        }
        lichSu = lsTruoc;
        throw e;
      }
      return { duAn: (lo.duAn ?? []).map((d) => structuredClone(d)), ho: (lo.ho ?? []).map((h) => structuredClone(h)) };
    },
    async dsHo(duAnId) {
      return [...ho.values()].filter((h) => h.duAnId === duAnId);
    },
    async luuHo(h) {
      return (await this.ghiLo({ ho: [h] })).ho[0]!;
    },
    async xoaHo(id) {
      await this.ghiLo({ xoaHo: [id] });
    },
    async lichSu(loai, id) {
      const soNamGiu = (caiDat.get("giuLichSu") as { soNam?: number } | undefined)?.soNam ?? 0;
      return { ds: lichSu.filter((x) => x.loai === loai && x.id === id).sort((a, b) => b.stt - a.stt).map((x) => structuredClone(x)), soNamGiu };
    },
    async hoDaXoaHan(duAnId) {
      const cuoi = new Map<string, BanLichSu>();
      for (const x of lichSu) if (x.loai === "ho" && x.duAnId === duAnId && (cuoi.get(x.id)?.stt ?? -1) < x.stt) cuoi.set(x.id, x);
      return [...cuoi.values()].filter((x) => x.lyDo === "Xóa hẳn" && !ho.has(x.id)).map((x) => structuredClone(x));
    },
    async khoiPhucBanLichSu(stt, lyDo, nguoiKp) {
      const ls = lichSu.find((x) => x.stt === stt);
      if (!ls) throw new Error("Không còn bản lịch sử này");
      const d = duAn.get((ls.duLieu as Ho).duAnId);
      const h = dungBanKhoiPhuc(ls, lyDo, nguoiKp, d, [...ho.values()].filter((x) => x.duAnId === d?.id));
      await this.ghiLo({ ho: [h], lyDoLichSu: `Trước khi khôi phục về phiên bản ${ls.phienBan ?? "?"}` });
      return h;
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
      await this.ghiLo({ xoaTatCa: true });
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
      const n = (giaTri as { soNam?: number } | null)?.soNam ?? 0;
      if (khoa === "giuLichSu" && n > 0) lichSu = lichSu.filter((x) => x.luuLuc >= nam(n));
    },
  };
}
