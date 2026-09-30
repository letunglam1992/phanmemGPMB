/** PDF bản đồ tiến độ (docs/08 §9.5): cấu trúc tệp PDF một trang nhúng ảnh JPEG; thước tỷ lệ "đẹp". */
import { describe, expect, it } from "vitest";
import { doDaiThuoc, taoPdfAnh, KHO_GIAY } from "../src/man/ban-do/xuat-pdf";

describe("PDF bản đồ tiến độ", () => {
  it("một trang A3 ngang, ảnh DCTDecode đúng độ dài, bảng xref trỏ đúng vị trí đối tượng", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
    const pdf = taoPdfAnh(jpeg, 2480, 1754, KHO_GIAY.A3, "Bản đồ tiến độ");
    const chu = new TextDecoder("latin1").decode(pdf);
    expect(chu.startsWith("%PDF-1.4")).toBe(true);
    expect(chu).toContain("/MediaBox [0 0 1190.55 841.89]");
    expect(chu).toContain("/Width 2480 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 10");
    expect(chu.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(chu)![1]);
    expect(chu.slice(startxref, startxref + 4)).toBe("xref");
    const xref = [...chu.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(xref).toHaveLength(6);
    xref.forEach((vt, i) => expect(chu.slice(vt, vt + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(chu).toContain("/Title <FEFF0042");
  });
  it("thước tỷ lệ 1, 2, 5 × 10^n", () => {
    expect([0.8, 3, 7, 18, 45, 120, 260].map(doDaiThuoc)).toEqual([0.5, 2, 5, 10, 20, 100, 200]);
  });
});
