/** Luồng nhập nhiều hộ: hộ trước / tiếp theo theo danh sách đang lọc (nho-ds-ho.ts). */
import { describe, expect, it } from "vitest";
import { ghiNhoDsHo, hoKeBen, layNhoDsHo } from "../src/nho-ds-ho";

describe("Hộ trước / tiếp theo", () => {
  it("theo thứ tự danh sách đang lọc; hộ đã xóa bị bỏ qua", () => {
    ghiNhoDsHo("da1", { thuTu: ["c", "a", "x", "b"], locTt: "DANG_XU_LY" });
    const tatCa = ["a", "b", "c", "d"]; // x đã bị xóa
    expect(hoKeBen("da1", "a", tatCa)).toEqual({ truoc: "c", sau: "b", viTri: 2, tong: 3, theoLoc: true });
    expect(hoKeBen("da1", "b", tatCa).sau).toBeUndefined();
    expect(hoKeBen("da1", "c", tatCa).truoc).toBeUndefined();
    expect(layNhoDsHo("da1").locTt).toBe("DANG_XU_LY");
  });
  it("hộ không nằm trong danh sách lọc (mở từ nơi khác) → theo thứ tự mọi hộ của dự án", () => {
    expect(hoKeBen("da1", "d", ["a", "b", "c", "d"])).toEqual({ truoc: "c", sau: undefined, viTri: 4, tong: 4, theoLoc: false });
    expect(hoKeBen("khac", "b", ["a", "b", "c"])).toMatchObject({ truoc: "a", sau: "c", theoLoc: false });
  });
});
