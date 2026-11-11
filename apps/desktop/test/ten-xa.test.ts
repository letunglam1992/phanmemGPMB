import { describe, expect, it } from "vitest";
import { chuanTenXa, cungXa } from "../src/ten-xa";

describe("chuẩn hóa tên xã, phường (1.3.6)", () => {
  it("các cách ghi lệch của cùng một xã về tên trong danh mục", () => {
    for (const s of ["Chiềng Mung", "xã Chiềng Mung", "Xã  Chiềng   Mung ", "UBND xã Chiềng Mung", "XÃ CHIỀNG MUNG", "chieng mung"])
      expect(chuanTenXa(s)).toBe("Xã Chiềng Mung");
    expect(chuanTenXa("phường tô hiệu")).toBe("Phường Tô Hiệu");
    expect(chuanTenXa("Tô Hiệu")).toBe("Phường Tô Hiệu");
  });
  it("tổ hợp dấu NFD vẫn khớp", () => {
    expect(chuanTenXa("Xã Chiềng Mung".normalize("NFD"))).toBe("Xã Chiềng Mung");
  });
  it("tên ngoài danh mục giữ nguyên (chỉ gọn dấu cách); rỗng → rỗng", () => {
    expect(chuanTenXa("  Xã  Không Có  ")).toBe("Xã Không Có");
    expect(chuanTenXa("")).toBe("");
    expect(chuanTenXa(undefined)).toBe("");
  });
  it("cungXa", () => {
    expect(cungXa("Chiềng Mung", "Xã Chiềng Mung")).toBe(true);
    expect(cungXa("Chiềng Mung", "Chiềng Mai")).toBe(false);
  });
});
