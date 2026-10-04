/** Hỏi đáp Gemini: che số, nội dung gửi đi chỉ gồm câu hỏi + đoạn trích (+ số liệu tổng hợp khi bật). */
import { describe, expect, it } from "vitest";
import { cheSo, taoYeuCau, HUONG_DAN_HE_THONG } from "../src/hoi-dap/gemini";

describe("Gemini — nội dung gửi đi", () => {
  it("che số CCCD, điện thoại, tài khoản", () => {
    expect(cheSo("CCCD 012345678901, ĐT 0912345678")).toBe("CCCD [số đã ẩn], ĐT [số điện thoại đã ẩn]");
    expect(cheSo("Điều 12 khoản 3 năm 2024, 1.200.000 đồng")).toBe("Điều 12 khoản 3 năm 2024, 1.200.000 đồng");
  });
  it("yêu cầu gồm hướng dẫn hệ thống (không tự đặt mức, ghi nguồn), đoạn trích đánh số, câu hỏi đã che số", () => {
    const y = taoYeuCau("Hộ có CCCD 012345678901 được hỗ trợ gì?", [{ diem: 1, doan: { id: 1, nguon: "NĐ 88/2024", loai: "VAN_BAN", tieuDe: "Điều 12", noiDung: "Nội dung" } }]);
    expect(HUONG_DAN_HE_THONG).toContain("Không tự đặt ra điều kiện, mức giá");
    const t = y.contents.at(-1)!.parts[0]!.text;
    expect(t).toContain("[1] NĐ 88/2024 — Điều 12");
    expect(t).not.toContain("012345678901");
    expect(t).not.toContain("SỐ LIỆU TỔNG HỢP");
    expect(taoYeuCau("x", [], "12 hồ sơ").contents.at(-1)!.parts[0]!.text).toContain("SỐ LIỆU TỔNG HỢP CỦA DỰ ÁN");
  });
});
