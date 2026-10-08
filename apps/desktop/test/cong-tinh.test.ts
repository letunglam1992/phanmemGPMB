/** Cổng Cloudflare cấp tỉnh (tools/cong-tinh/worker.js) với R2 giả lập; mô-đun kết nối cong-tinh.ts gọi qua fetch. */
import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error tệp JS của Worker (không có khai báo kiểu)
import worker from "../../../tools/cong-tinh/worker.js";
import { capMaXa, chuanDiaChi, dsGoiTrenCong, dsXaTrenCong, guiGoiLenCong, kiemTraCong, maTuTen, taiGoiTuCong, thuHoiXa, type CauHinhCong, dsTuyenTrenCong, guiTuyenLenCong } from "../src/tong-hop-tinh/cong-tinh";

/** R2 tối giản: put/get/list/delete trong bộ nhớ. */
function r2() {
  const m = new Map<string, { bytes: Uint8Array; size: number }>();
  const enc = new TextEncoder();
  return {
    async put(k: string, v: string | Uint8Array) {
      const bytes = typeof v === "string" ? enc.encode(v) : v;
      m.set(k, { bytes, size: bytes.length });
    },
    async get(k: string) {
      const o = m.get(k);
      if (!o) return null;
      return { body: o.bytes, json: async () => JSON.parse(new TextDecoder().decode(o.bytes)) };
    },
    async list(o: { prefix: string }) {
      return { objects: [...m.entries()].filter(([k]) => k.startsWith(o.prefix)).map(([key, v]) => ({ key, size: v.size })), truncated: false };
    },
    async delete(k: string) {
      m.delete(k);
    },
    m,
  };
}
const QT = "ma-quan-tri-thu-nghiem-0123456789";
let env: { KHO: ReturnType<typeof r2>; MA_QUAN_TRI: string };
const goi = (p: string, o: { ma?: string; method?: string; body?: BodyInit } = {}) =>
  worker.fetch(new Request(`https://cong.test${p}`, { method: o.method ?? "GET", headers: o.ma ? { authorization: `Bearer ${o.ma}` } : {}, body: o.body }), env) as Promise<Response>;
const GOI = () => {
  const u = new Uint8Array(500);
  u[0] = 0x50;
  u[1] = 0x4b;
  return u;
};

beforeEach(() => {
  env = { KHO: r2(), MA_QUAN_TRI: QT };
});

describe("Worker cổng tỉnh", () => {
  it("cấp mã xã → xã gửi gói → tỉnh liệt kê, tải về; thu hồi → 401; chỉ lưu mã băm", async () => {
    expect((await goi("/api/trang-thai")).status).toBe(401);
    expect(await (await goi("/api/trang-thai", { ma: QT })).json()).toEqual({ vaiTro: "TINH" });
    const cap = await (await goi("/api/xa", { ma: QT, method: "POST", body: JSON.stringify({ ma: "chieng-mung", ten: "Xã Chiềng Mung" }) })).json();
    expect(cap.token).toMatch(/^chieng-mung\.[\w-]{40,}$/);
    expect(new TextDecoder().decode(env.KHO.m.get("xa/chieng-mung.json")!.bytes)).not.toContain(cap.token);
    expect(await (await goi("/api/trang-thai", { ma: cap.token })).json()).toMatchObject({ vaiTro: "XA", ma: "chieng-mung" });
    // xã không xem được danh sách, không cấp mã
    expect((await goi("/api/goi", { ma: cap.token })).status).toBe(403);
    expect((await goi("/api/xa", { ma: cap.token, method: "POST", body: "{}" })).status).toBe(403);
    // gửi gói
    expect((await goi("/api/goi", { ma: cap.token, method: "PUT", body: new Uint8Array(500) })).status).toBe(400);
    for (let i = 0; i < 7; i++) expect((await goi("/api/goi", { ma: cap.token, method: "PUT", body: GOI() })).status).toBe(200);
    expect([...env.KHO.m.keys()].filter((k) => k.startsWith("goi/chieng-mung/")).length).toBe(5); // giữ 5 bản
    const ds = await (await goi("/api/goi", { ma: QT })).json();
    expect(ds).toMatchObject([{ ma: "chieng-mung", ten: "Xã Chiềng Mung", kichThuoc: 500 }]);
    expect(new Uint8Array(await (await goi("/api/goi/chieng-mung", { ma: QT })).arrayBuffer()).length).toBe(500);
    // sai mã, mã giả mạo tiền tố
    expect((await goi("/api/trang-thai", { ma: "chieng-mung.sai" })).status).toBe(401);
    // thu hồi
    expect((await goi("/api/xa/chieng-mung", { ma: QT, method: "DELETE" })).status).toBe(200);
    expect((await goi("/api/goi", { ma: cap.token, method: "PUT", body: GOI() })).status).toBe(401);
    expect((await (await goi("/api/xa", { ma: QT })).json())[0].thuHoi).toBeTruthy();
  });
  it("mã quản trị ngắn bị bỏ qua; mã xã không hợp lệ bị từ chối", async () => {
    env.MA_QUAN_TRI = "ngan";
    expect((await goi("/api/trang-thai", { ma: "ngan" })).status).toBe(401);
    env.MA_QUAN_TRI = QT;
    expect((await goi("/api/xa", { ma: QT, method: "POST", body: JSON.stringify({ ma: "Chiềng Mung", ten: "x" }) })).status).toBe(400);
  });
});

describe("Kết nối cổng từ phần mềm", () => {
  it("gọi Worker qua fetch: quản trị cấp mã, xã gửi, tỉnh tải; lỗi tiếng Việt", async () => {
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => worker.fetch(new Request(url, init), env));
    const tinh: CauHinhCong = { diaChi: chuanDiaChi("https://cong.test/"), ma: QT };
    expect((await kiemTraCong(tinh)).vaiTro).toBe("TINH");
    const { token } = await capMaXa(tinh, maTuTen("Xã Chiềng Mung"), "Xã Chiềng Mung");
    const xa: CauHinhCong = { diaChi: tinh.diaChi, ma: token };
    expect((await kiemTraCong(xa)).ten).toBe("Xã Chiềng Mung");
    expect((await guiGoiLenCong(xa, GOI())).kichThuoc).toBe(500);
    const ds = await dsGoiTrenCong(tinh);
    expect(ds[0]!.ma).toBe("chieng-mung");
    expect((await taiGoiTuCong(tinh, "chieng-mung")).length).toBe(500);
    expect((await dsXaTrenCong(tinh))[0]!.goiCuoi).toBeTruthy();
    await expect(dsGoiTrenCong(xa)).rejects.toThrow(/quản trị/);
    await thuHoiXa(tinh, "chieng-mung");
    await expect(guiGoiLenCong(xa, GOI())).rejects.toThrow(/thu hồi/);
    vi.unstubAllGlobals();
  });
  it("1.0.5: tỉnh đưa danh sách dự án liên xã lên cổng, xã đọc; xã không ghi được; mã sai bị bỏ", async () => {
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => worker.fetch(new Request(url, init), env));
    const tinh: CauHinhCong = { diaChi: chuanDiaChi("https://cong.test/"), ma: QT };
    const { token } = await capMaXa(tinh, "muong-bu", "Xã Mường Bú");
    const xa: CauHinhCong = { diaChi: tinh.diaChi, ma: token };
    expect((await dsTuyenTrenCong(xa)).tuyen).toEqual([]);
    const r = await guiTuyenLenCong(tinh, [
      { ma: "LX-2026-001", ten: "Đường nối QL6", chuDauTu: "Ban QLDA", dsXa: ["Xã Mường Bú", "Xã Chiềng Mung"], taoLuc: "x" } as never,
      { ma: "sai mã", ten: "x", chuDauTu: "", dsXa: [] },
    ]);
    expect(r.soTuyen).toBe(1);
    const d = await dsTuyenTrenCong(xa);
    expect(d.tuyen).toEqual([{ ma: "LX-2026-001", ten: "Đường nối QL6", chuDauTu: "Ban QLDA", dsXa: ["Xã Mường Bú", "Xã Chiềng Mung"] }]);
    expect(d.luc).toBeTruthy();
    await expect(guiTuyenLenCong(xa, [])).rejects.toThrow(/quản trị/);
    vi.unstubAllGlobals();
  });
  it("địa chỉ cổng phải https; mã xã từ tên", () => {
    expect(() => chuanDiaChi("http://cong.vn")).toThrow();
    expect(chuanDiaChi("http://127.0.0.1:8787/")).toBe("http://127.0.0.1:8787");
    expect(maTuTen("Phường Tô Hiệu")).toBe("to-hieu");
    expect(maTuTen("UBND xã Đồng Lạc")).toBe("dong-lac");
  });
});
