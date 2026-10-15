/** 1.0.10 — Bản dùng thử, mã kích hoạt ký ECDSA P-256 (khóa thử tạo trong kiểm thử, không phải khóa của tác giả). */
import { beforeAll, describe, expect, it } from "vitest";
import { demDuAnTinh, docGiayPhep, kiemThemDuAn, kyGiayPhep, laDuAnMau, taoMaCaiDat, trangThaiGiayPhep, type NoiDungGiayPhep } from "../src/giay-phep";
import { KHOA_CONG_GIAY_PHEP } from "../src/giay-phep-khoa";
import type { DuAn } from "../src/mo-hinh";

let rieng: JsonWebKey, cong: JsonWebKey;
beforeAll(async () => {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  rieng = await crypto.subtle.exportKey("jwk", k.privateKey);
  cong = await crypto.subtle.exportKey("jwk", k.publicKey);
});
const nd = (o: Partial<NoiDungGiayPhep> = {}): NoiDungGiayPhep => ({ v: 1, donVi: "UBND xã Thử", maCaiDat: "ABCD-EFGH-JKLM-NPQR", soDuAn: 5, hetHan: "2027-12-31", cap: "2026-10-13", ...o });
const da = (id: string, o: Partial<DuAn> = {}) => ({ id, ten: `Dự án ${id}`, ...o }) as DuAn;

describe("Mã cài đặt, mã kích hoạt", () => {
  it("mã cài đặt 16 ký tự nhóm 4, không có I, O, 0, 1", () => {
    const m = taoMaCaiDat();
    expect(m).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
    expect(taoMaCaiDat()).not.toBe(m);
  });
  it("ký rồi đọc lại đúng nội dung; sửa một ký tự → sai chữ ký; khóa khác → sai chữ ký", async () => {
    const ma = await kyGiayPhep(nd(), rieng);
    expect(ma.startsWith("GPMB1.")).toBe(true);
    expect(await docGiayPhep(ma, cong)).toEqual(nd());
    const [a, b, c] = ma.split(".");
    const sua = `${a}.${b!.slice(0, -2)}${b!.slice(-2) === "AA" ? "BB" : "AA"}.${c}`;
    await expect(docGiayPhep(sua, cong)).rejects.toThrow(/sai chữ ký|thiếu hoặc sai/);
    await expect(docGiayPhep(ma, KHOA_CONG_GIAY_PHEP)).rejects.toThrow(/sai chữ ký/);
    await expect(docGiayPhep("abc", cong)).rejects.toThrow(/không đúng dạng/);
  });
  it("trạng thái: dùng thử, hợp lệ, sai máy, hết hạn; mã cài đặt so không phân biệt gạch nối, hoa thường", async () => {
    expect(await trangThaiGiayPhep(null, "X", "2026-10-13", cong)).toEqual({ loai: "DUNG_THU", gioiHan: 1 });
    const ma = await kyGiayPhep(nd(), rieng);
    expect(await trangThaiGiayPhep(ma, "abcdefghjklmnpqr", "2026-10-13", cong)).toMatchObject({ loai: "HOP_LE", gioiHan: 5 });
    expect(await trangThaiGiayPhep(ma, "ZZZZ-ZZZZ-ZZZZ-ZZZZ", "2026-10-13", cong)).toMatchObject({ loai: "SAI_MAY", gioiHan: 1 });
    expect(await trangThaiGiayPhep(ma, "ABCD-EFGH-JKLM-NPQR", "2028-01-01", cong)).toMatchObject({ loai: "HET_HAN", gioiHan: 1 });
    const kgh = await kyGiayPhep(nd({ soDuAn: null, hetHan: null }), rieng);
    expect((await trangThaiGiayPhep(kgh, "ABCD-EFGH-JKLM-NPQR", "2099-01-01", cong)).gioiHan).toBe(Infinity);
    expect(await trangThaiGiayPhep("GPMB1.xx.yy", "X", "2026-10-13", cong)).toMatchObject({ loai: "SAI", gioiHan: 1 });
  });
  it("đếm dự án: bỏ dự án mẫu, dự án trong thùng rác; kiểm thêm dự án theo mức", async () => {
    const ds = [da("a"), da("m", { mau: true }), da("c", { ten: "Dự án mẫu – Khu công nghiệp (dữ liệu ẩn danh)" }), da("x", { daXoa: { luc: "", nguoi: "", lyDo: "" } } as Partial<DuAn>)];
    expect(laDuAnMau(ds[2]!)).toBe(true);
    expect(demDuAnTinh(ds)).toBe(1);
    const thu = { loai: "DUNG_THU", gioiHan: 1 } as const;
    expect(kiemThemDuAn([], 1, thu)).toBeNull();
    expect(kiemThemDuAn(ds, 1, thu)).toMatch(/Bản dùng thử dùng được 1 dự án; đang có 1 dự án/);
    const ma = await kyGiayPhep(nd({ soDuAn: 2 }), rieng);
    const hl = await trangThaiGiayPhep(ma, "ABCD-EFGH-JKLM-NPQR", "2026-10-13", cong);
    expect(kiemThemDuAn(ds, 1, hl)).toBeNull();
    expect(kiemThemDuAn(ds, 2, hl)).toMatch(/cho phép 2 dự án/);
  });
});

describe("1.0.12 — Chặn mã cũ khi cấp lại cho máy mới", () => {
  it("mã băm trùng cách tính của máy chủ (Rust); mã nằm trong danh sách chặn → về mức dùng thử", async () => {
    const { bamMa, MA_BI_CHAN, moTaGiayPhep } = await import("../src/giay-phep");
    expect(await bamMa(" GPMB1.abc\n.def ")).toBe("a220d69a62ae3fd0629899076af6bf6fd45f88f8419134bd07a17172b1398fc1");
    expect(MA_BI_CHAN.size).toBeGreaterThanOrEqual(0);
    const ma = await kyGiayPhep(nd(), rieng);
    const tt = await trangThaiGiayPhep(ma, "ABCD-EFGH-JKLM-NPQR", "2026-10-15", cong, new Set([await bamMa(ma)]));
    expect(tt).toMatchObject({ loai: "BI_CHAN", gioiHan: 1 });
    expect(moTaGiayPhep(tt)).toMatch(/đã được thay bằng mã cấp lại/);
    expect((await trangThaiGiayPhep(ma, "ABCD-EFGH-JKLM-NPQR", "2026-10-15", cong, new Set(["0".repeat(64)]))).loai).toBe("HOP_LE");
  });
});
