/**
 * 1.0.7 — Chạy nền ở máy cấp tỉnh: lịch kiểm tra cổng (20 giây, mỗi 30 phút, không chạy chồng); khóa đóng → chuông "gói
 * chờ nhận"; khóa mở → tự nhận gói (Worker cổng giả lập, gói thật mã hóa cho khóa tỉnh), báo, phát sự kiện; lần sau không
 * nhận lại. Dữ liệu mẫu ẩn danh.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { taoKhoBoNho } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { congKhaiCua, moKhoaTinh, taoGoiTinh, taoKhoaKy, taoKhoaTinh, type KhoaTinh } from "../src/tong-hop-tinh/goi-tinh";
import { dsGoiTrenCong, guiGoiLenCong } from "../src/tong-hop-tinh/cong-tinh";
import { chuaTai, datChoNhan, layChoNhan, taiGoiMoi } from "../src/tong-hop-tinh/phien-tinh";
import { CHU_KY_KIEM_CONG, DAU_KIEM_CONG, kiemCongMotLan, lapLichKiemCong, type PhuThuocKiemCong } from "../src/tong-hop-tinh/theo-doi-cong";
// @ts-expect-error tệp JS của Worker
import worker from "../../../tools/cong-tinh/worker.js";

describe("Lịch kiểm tra cổng", () => {
  it("lần đầu sau 20 giây, sau đó mỗi 30 phút; lần trước chưa xong thì bỏ qua; hủy thì dừng; lỗi không làm dừng lịch", async () => {
    vi.useFakeTimers();
    let soLan = 0;
    let xong: (() => void) | null = null;
    const huy = lapLichKiemCong(() => {
      soLan++;
      if (soLan === 3) throw new Error("mất mạng");
      return new Promise<void>((r) => (xong = r));
    });
    await vi.advanceTimersByTimeAsync(DAU_KIEM_CONG - 1);
    expect(soLan).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(soLan).toBe(1);
    // lần 1 chưa xong → đến hạn 30 phút bị bỏ qua
    await vi.advanceTimersByTimeAsync(CHU_KY_KIEM_CONG);
    expect(soLan).toBe(1);
    xong!();
    await vi.advanceTimersByTimeAsync(CHU_KY_KIEM_CONG);
    expect(soLan).toBe(2);
    xong!();
    await vi.advanceTimersByTimeAsync(CHU_KY_KIEM_CONG); // lần 3 lỗi
    expect(soLan).toBe(3);
    await vi.advanceTimersByTimeAsync(CHU_KY_KIEM_CONG);
    expect(soLan).toBe(4);
    xong!();
    huy();
    await vi.advanceTimersByTimeAsync(CHU_KY_KIEM_CONG * 3);
    expect(soLan).toBe(4);
    vi.useRealTimers();
  });
});

describe("Một lần kiểm tra cổng (Worker giả lập)", () => {
  let tinh: KhoaTinh;
  let biMat: CryptoKey;
  const MA_QT = "ma-quan-tri-thu-nghiem-0123456789";
  const kho0 = new Map<string, Uint8Array>();
  const enc = new TextEncoder();
  const env = {
    MA_QUAN_TRI: MA_QT,
    KHO: {
      put: async (k: string, v: string | Uint8Array) => void kho0.set(k, typeof v === "string" ? enc.encode(v) : v),
      get: async (k: string) => (kho0.has(k) ? { body: kho0.get(k)!, json: async () => JSON.parse(new TextDecoder().decode(kho0.get(k)!)) } : null),
      list: async (o: { prefix: string }) => ({ objects: [...kho0.entries()].filter(([k]) => k.startsWith(o.prefix)).map(([key, v]) => ({ key, size: v.length })), truncated: false }),
      delete: async (k: string) => void kho0.delete(k),
    },
  };
  const ls = new Map<string, string>();
  beforeAll(async () => {
    const fake = await import("fake-indexeddb");
    Object.assign(globalThis, { indexedDB: fake.indexedDB, IDBKeyRange: fake.IDBKeyRange });
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => worker.fetch(new Request(url, init), env));
    vi.stubGlobal("localStorage", { getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string, v: string) => void ls.set(k, v), removeItem: (k: string) => void ls.delete(k) });
    tinh = await taoKhoaTinh("mat-khau-tinh-2026", "Sở (thử)", "qt");
    biMat = (await moKhoaTinh(tinh, "mat-khau-tinh-2026"))!;
  }, 60_000);
  afterAll(() => vi.unstubAllGlobals());

  it("khóa đóng → chuông có gói chờ; khóa mở → tự nhận, báo, phát sự kiện; lần sau không nhận lại", async () => {
    const cong = { diaChi: "https://cong.test", ma: MA_QT };
    const { token } = await (await worker.fetch(new Request("https://cong.test/api/xa", { method: "POST", headers: { authorization: `Bearer ${MA_QT}` }, body: JSON.stringify({ ma: "xa-b", ten: "Xã B" }) }), env)).json();
    const kho = taoKhoBoNho();
    const a = taoDuAnMau();
    await kho.ghiLo({ duAn: [a.duAn], ho: a.ho });
    const g = await taoGoiTinh(kho, { khoaTinh: congKhaiCua(tinh), khoaKy: await taoKhoaKy(), maGui: "b-1", donViGui: "UBND xã B", duAnIds: [a.duAn.id], kemDinhKem: false, kemBanDo: false, ungDung: "t", nguoiXuat: "x" });
    await guiGoiLenCong({ diaChi: "https://cong.test", ma: token }, g.bytes);

    const bao: string[] = [];
    let suKien = 0;
    const nhan: string[] = [];
    const p = (khoaMo: PhuThuocKiemCong["khoaMo"]): PhuThuocKiemCong => ({
      cong,
      khoaMo,
      docKhoaTinh: async () => tinh,
      taiGoiMoi: (c, k) => taiGoiMoi(c, k, { homNay: "2026-10-20", khiNhan: async (x) => void nhan.push(x.banGhi.donViGui) }),
      dsGoiTrenCong,
      chuaTai,
      datChoNhan,
      bao: (s) => void bao.push(s),
      phatGoiMoi: () => void suKien++,
    });
    // chưa cài cổng → không làm gì
    expect(await kiemCongMotLan({ ...p(null), cong: null })).toBe("KHONG");
    // khóa đóng → chuông
    expect(await kiemCongMotLan(p(null))).toBe("CHUONG");
    expect(layChoNhan().map((x) => x.ma)).toEqual(["xa-b"]);
    expect(nhan).toEqual([]);
    // khóa mở nhưng là khóa khác (vân tay lệch) → vẫn chỉ chuông
    expect(await kiemCongMotLan(p({ vanTay: "khac", biMat }))).toBe("CHUONG");
    // khóa mở đúng → nhận
    expect(await kiemCongMotLan(p({ vanTay: tinh.vanTay, biMat }))).toBe("NHAN");
    expect(nhan).toEqual(["UBND xã B"]);
    expect(bao[0]).toMatch(/^Đã tự nhận 1 gói mới từ cổng: UBND xã B/);
    expect(suKien).toBe(1);
    expect(layChoNhan()).toEqual([]);
    // lần sau: không có gói mới → không nhận lại, không báo
    expect(await kiemCongMotLan(p({ vanTay: tinh.vanTay, biMat }))).toBe("NHAN");
    expect(nhan).toHaveLength(1);
    expect(bao).toHaveLength(1);
    expect(suKien).toBe(1);
  }, 60_000);
});
