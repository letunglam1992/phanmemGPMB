/** Cập nhật phần mềm: lịch tự kiểm tra, gọi lệnh vỏ Rust (giả lập invoke). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const goi: string[] = [];
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (lenh: string) => {
    goi.push(lenh);
    if (lenh === "cap_nhat_kiem_tra") return { san_sang: true, hien_tai: "0.9.15", ban_moi: { phien_ban: "0.9.16", hien_tai: "0.9.15", ngay: "2026-10-03", ghi_chu: "Sửa lỗi" } };
    return null;
  },
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => undefined }));

const kho = new Map<string, string>();
beforeEach(() => {
  goi.length = 0;
  kho.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => kho.get(k) ?? null, setItem: (k: string, v: string) => void kho.set(k, v) });
});
afterEach(() => vi.unstubAllGlobals());

describe("Cập nhật phần mềm", () => {
  it("chỉ tự kiểm tra trong bản cài, khi bật, cách lần trước ≥ 20 giờ", async () => {
    const { denLucKiemTra } = await import("../src/cap-nhat");
    expect(denLucKiemTra({ tuDong: true })).toBe(false); // không phải bản cài (không có vỏ Tauri)
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    const bay = Date.parse("2026-10-03T08:00:00Z");
    expect(denLucKiemTra({ tuDong: true }, bay)).toBe(true);
    expect(denLucKiemTra({ tuDong: false }, bay)).toBe(false);
    expect(denLucKiemTra({ tuDong: true, lanCuoi: "2026-10-03T01:00:00Z" }, bay)).toBe(false);
    expect(denLucKiemTra({ tuDong: true, lanCuoi: "2026-10-02T08:00:00Z" }, bay)).toBe(true);
  });
  it("kiểm tra gọi lệnh vỏ Rust, ghi lần cuối; mặc định bật tự kiểm tra", async () => {
    const { docCaiDat, kiemTraCapNhat, caiDatCapNhat } = await import("../src/cap-nhat");
    expect(docCaiDat().tuDong).toBe(true);
    const kq = await kiemTraCapNhat();
    expect(kq.ban_moi?.phien_ban).toBe("0.9.16");
    expect(docCaiDat().lanCuoi).toBeTruthy();
    await caiDatCapNhat(() => undefined);
    expect(goi).toEqual(["cap_nhat_kiem_tra", "cap_nhat_cai_dat"]);
  });
});
