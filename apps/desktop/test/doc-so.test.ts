import { describe, expect, it } from "vitest";
import { docSoTien } from "../src/van-ban/doc-so";

describe("Đọc số tiền thành chữ", () => {
  it.each([
    [0, "Không đồng"],
    [5, "Năm đồng"],
    [15, "Mười lăm đồng"],
    [21, "Hai mươi mốt đồng"],
    [24, "Hai mươi tư đồng"],
    [105, "Một trăm linh năm đồng"],
    [1000, "Một nghìn đồng"],
    [1005, "Một nghìn không trăm linh năm đồng"],
    [1_000_005, "Một triệu không trăm linh năm đồng"],
    [1_234_500, "Một triệu hai trăm ba mươi tư nghìn năm trăm đồng"],
    [2_827_920_000, "Hai tỷ tám trăm hai mươi bảy triệu chín trăm hai mươi nghìn đồng"],
    [1_493_980_200, "Một tỷ bốn trăm chín mươi ba triệu chín trăm tám mươi nghìn hai trăm đồng"],
    [10_000_000_000, "Mười tỷ đồng"],
  ])("%d", (n, chu) => expect(docSoTien(n)).toBe(chu));
  it("nhận chuỗi định dạng Việt Nam", () => expect(docSoTien("2.827.920.000")).toBe(docSoTien(2827920000)));
});
