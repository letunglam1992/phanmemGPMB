import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tomTatDuAn } from "../src/tong-hop-tinh/goi-tinh";

describe("1.2.0 (B1) — gói tỉnh: đơn khiếu nại quá hạn không kèm tên hộ, nội dung đơn", () => {
  it("đơn quá hạn thụ lý / giải quyết vào danh sách khâu quá hạn", () => {
    const { duAn, ho } = taoDuAnMau();
    const hos = ho.map((h, i) =>
      i === 0
        ? { ...h, khieuNai: [
            { id: "a", loai: "KHIEU_NAI" as const, lan: 1 as const, ngayNhan: "2026-09-01", noiDung: "Nội dung riêng tư của hộ", ngayThuLy: "2026-09-05" },
            { id: "b", loai: "KHIEU_NAI" as const, lan: 2 as const, ngayNhan: "2026-10-01", noiDung: "x" },
            { id: "c", loai: "KHIEU_NAI" as const, lan: 1 as const, ngayNhan: "2026-11-05", noiDung: "chưa quá hạn" },
          ] }
        : h,
    );
    const [tt] = tomTatDuAn([duAn], hos, () => 0, "2026-11-10");
    const don = (tt!.quaHan ?? []).filter((q) => q.doiTuong.startsWith("Đơn "));
    expect(don.map((q) => [q.doiTuong, q.khau])).toEqual([
      ["Đơn khiếu nại lần 1 nhận 01/09/2026", "Giải quyết, trả lời đơn"],
      ["Đơn khiếu nại lần 2 nhận 01/10/2026", "Thụ lý đơn"],
    ]);
    expect(don[0]!.canCu).toContain("Điều 28 Luật Khiếu nại");
    const json = JSON.stringify(tt);
    expect(json).not.toContain("Nội dung riêng tư");
    expect(json).not.toContain(ho[0]!.ten);
  });
});
