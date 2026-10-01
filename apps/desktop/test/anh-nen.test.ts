/** Nhận ra ô ảnh "Map data not yet available" (xám trung tính) để dùng ảnh mức thấp hơn. */
import { describe, expect, it } from "vitest";
import { laOTrong } from "../src/man/ban-do/anh-nen";

const o = (ds: [number, number, number][]) => ds.flatMap(([r, g, b]) => [r, g, b, 255]);
describe("Ô ảnh trống", () => {
  it("xám trung tính có chữ trắng → trống", () => expect(laOTrong(o([[200, 200, 200], [204, 203, 205], [255, 255, 255], [190, 190, 192]]))).toBe(true));
  it("ảnh vệ tinh (có điểm lệch màu) → có ảnh", () => expect(laOTrong(o([[200, 200, 200], [60, 90, 40], [201, 200, 199]]))).toBe(false));
  it("xám tối (bóng núi, nước sâu) → có ảnh", () => expect(laOTrong(o([[80, 80, 80], [82, 81, 80]]))).toBe(false));
  it("không có điểm → không kết luận trống", () => expect(laOTrong([])).toBe(false));
});
