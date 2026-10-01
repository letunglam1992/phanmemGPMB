/** Lọc hộ khi chọn hộ tạo văn bản (báo cáo kiểm thử 0.9.12: gõ "HO80" phải lọc ra hộ); tên tệp mẫu không sai chính tả. */
import { describe, expect, it } from "vitest";
import { chuanTimHo, khopLocHo } from "../src/van-ban/loc-ho";
import { tenTep } from "../src/ten-tep";
import { DANH_MUC_MAU } from "../src/van-ban/danh-muc";

describe("Lọc hộ", () => {
  const h = { ma: "HO-080", ten: "Nguyễn Văn Ánh" };
  it("bỏ dấu, gạch, khoảng trắng, số 0 đầu", () => {
    expect(chuanTimHo("HO-080")).toBe("ho80");
    for (const loc of ["HO80", "ho 80", "HO-080", "anh", "Ánh", "nguyen van", ""]) expect(khopLocHo(loc, h)).toBe(true);
    expect(khopLocHo("HO81", h)).toBe(false);
    expect(khopLocHo("HO8", h)).toBe(true);
  });
});
describe("Tên tệp mẫu", () => {
  it("bỏ dấu đúng (niêm yết → niem-yet), không ký tự lạ", () => {
    expect(tenTep("Biên bản niêm yết công khai phương án")).toBe("Bien-ban-niem-yet-cong-khai-phuong-an");
    for (const m of DANH_MUC_MAU) expect(tenTep(m.ten)).toMatch(/^[A-Za-z0-9.\-]+$/);
  });
});
