import { describe, expect, it } from "vitest";
import { amSangDuong } from "../src/am-lich";

describe("Âm lịch → dương lịch (UTC+7)", () => {
  it("Tết Nguyên đán, Giỗ Tổ Hùng Vương các năm đã biết", () => {
    expect(amSangDuong(1, 1, 2024)).toBe("2024-02-10");
    expect(amSangDuong(1, 1, 2025)).toBe("2025-01-29");
    expect(amSangDuong(1, 1, 2026)).toBe("2026-02-17");
    expect(amSangDuong(1, 1, 2027)).toBe("2027-02-06");
    expect(amSangDuong(10, 3, 2024)).toBe("2024-04-18");
    expect(amSangDuong(10, 3, 2025)).toBe("2025-04-07");
    expect(amSangDuong(10, 3, 2026)).toBe("2026-04-26");
  });
  it("tháng nhuận: 2025 nhuận tháng 6; tháng không nhuận trả null", () => {
    expect(amSangDuong(1, 6, 2025, true)).toBe("2025-07-25");
    expect(amSangDuong(1, 5, 2025, true)).toBeNull();
    expect(amSangDuong(1, 6, 2026, true)).toBeNull();
  });
});

describe("Đề xuất ngày nghỉ (k1 Đ112 BLLĐ 2019)", () => {
  it("2026: lễ dương lịch, mùng 1–3 Tết, Giỗ Tổ; ghi căn cứ; cảnh báo trùng cuối tuần", async () => {
    const { deXuatNgayNghi } = await import("../src/lich-lam-viec");
    const ds = deXuatNgayNghi(2026);
    expect(ds.map((x) => x.ngay)).toEqual(["2026-01-01", "2026-02-17", "2026-02-18", "2026-02-19", "2026-04-26", "2026-04-30", "2026-05-01", "2026-09-02"]);
    expect(ds.every((x) => /khoản 1 Điều 112/.test(x.canCu))).toBe(true);
    expect(ds.find((x) => x.ngay === "2026-04-26")!.ghiChu).toMatch(/Trùng cuối tuần/); // Chủ nhật
    expect(ds.find((x) => x.ngay === "2026-02-17")!.ghiChu).toMatch(/05 ngày/);
  });
});
