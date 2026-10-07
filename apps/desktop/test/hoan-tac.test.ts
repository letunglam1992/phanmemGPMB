import { describe, expect, it } from "vitest";
import { buocDoi, canQuyenDuyet, docLanDoi, ghiLanDoi, hoanTacLan } from "../src/hoan-tac";

describe("Hoàn tác lần đổi bước gần nhất (0.9.27)", () => {
  it("trả các bước đã đổi về trước; bước không đổi giữ nguyên; bước mới thêm thì bỏ", () => {
    const truoc = { "1": { trangThai: "DANG" as const }, "2": { trangThai: "XONG" as const } };
    const sau = { "1": { trangThai: "CHO_DUYET" as const, guiBoi: "cb" }, "2": { trangThai: "XONG" as const }, "3": { trangThai: "DANG" as const } };
    const l = ghiLanDoi("chung:da1:", "Gửi duyệt bước chung 1", truoc, sau)!;
    expect(docLanDoi("chung:da1:")).toBe(l);
    expect(buocDoi(l)).toEqual(["1", "3"]);
    expect(canQuyenDuyet(l)).toBe(false);
    const kq = hoanTacLan(l, { ...sau, "4": { trangThai: "DANG" } });
    expect(kq).toEqual({ tienDo: { "1": { trangThai: "DANG" }, "2": { trangThai: "XONG" }, "4": { trangThai: "DANG" } } });
  });
  it("bước đã sửa tiếp thì không hoàn tác; không đổi gì thì không ghi nhận; xác nhận xong cần quyền duyệt", () => {
    const l = ghiLanDoi("ho:h1", "Xác nhận hoàn thành bước 5", { "5": { trangThai: "CHO_DUYET" } }, { "5": { trangThai: "XONG", duyetBoi: "ld" } })!;
    expect(canQuyenDuyet(l)).toBe(true);
    const kq = hoanTacLan(l, { "5": { trangThai: "DANG" } });
    expect("loi" in kq && kq.loi).toMatch(/Bước 5 đã được sửa tiếp/);
    expect(ghiLanDoi("ho:h2", "x", { "5": { trangThai: "DANG" } }, { "5": { trangThai: "DANG" } })).toBeUndefined();
    expect(docLanDoi("ho:h2")).toBeUndefined();
  });
});
