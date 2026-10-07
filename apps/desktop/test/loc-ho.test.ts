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

import { docToThua, timHo } from "../src/tim-kiem";
describe("Tìm chung 1.0.4: tờ/thửa đúng số, số định danh, lý trình", () => {
  const h = { ma: "H01", ten: "Lò Văn A", diaChi: "Bản Mòng", soDinhDanh: "014089001234", thua: [{ soTo: "5", soThua: "85", loaiDat: "CLN", lyTrinh: { tu: 1200, den: 1350 } }, { soTo: "15", soThua: "850" }] };
  it("đọc tờ/thửa", () => {
    expect(docToThua("5/85")).toEqual({ to: "5", thua: "85" });
    expect(docToThua("tờ 05 thửa 85")).toEqual({ to: "5", thua: "85" });
    expect(docToThua("thửa 85 tờ 5")).toEqual({ to: "5", thua: "85" });
    expect(docToThua("Lò Văn")).toBeNull();
  });
  it("so khớp", () => {
    expect(timHo(h, "5/85")).toEqual({ khop: true, lyDo: "Thửa 85 tờ 5 · CLN" });
    expect(timHo(h, "15/85").khop).toBe(false);
    expect(timHo(h, "5/8").khop).toBe(false);
    expect(timHo(h, "15/850").khop).toBe(true);
    expect(timHo(h, "1234")).toEqual({ khop: true, lyDo: "Số định danh …1234" });
    expect(timHo(h, "014089").khop).toBe(true);
    expect(timHo(h, "Km1+300").lyDo).toMatch(/Thửa 85 tờ 5 · lý trình/);
    expect(timHo(h, "Km2+000").khop).toBe(false);
    expect(timHo(h, "lo van").khop).toBe(true);
  });
});
