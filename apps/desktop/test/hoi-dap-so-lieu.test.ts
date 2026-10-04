/** Hỏi đáp: số liệu dự án trả lời ngay trên máy. */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { nhanYDinh, traLoiSoLieu } from "../src/hoi-dap/so-lieu";

const cs = cs0 as unknown as BoChinhSach;
describe("Số liệu dự án (nội bộ)", () => {
  it("nhận ý định", () => {
    expect(nhanYDinh("Dự án có bao nhiêu hộ?")).toContain("SO_HO");
    expect(nhanYDinh("Tổng kinh phí bồi thường của dự án là bao nhiêu")).toContain("TONG_TIEN");
    expect(nhanYDinh("Hộ nào đang vướng mắc?")).toContain("VUONG_MAC");
    expect(nhanYDinh("Những hộ nào chưa chốt phương án")).toContain("PHUONG_AN");
    expect(nhanYDinh("Hỗ trợ ổn định đời sống tính thế nào")).toEqual([]);
  });
  it("trả lời số hộ, tổng tiền, diện tích, phương án", () => {
    const { duAn, ho } = taoDuAnMau();
    const kq = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    const t = traLoiSoLieu(["SO_HO", "TONG_TIEN", "DIEN_TICH", "PHUONG_AN", "HIEN_TRANG", "VUONG_MAC"], [{ duAn, kq }], "2026-10-04");
    expect(t).toContain(`${ho.length} hồ sơ`);
    expect(t).toMatch(/Tổng giá trị bồi thường, hỗ trợ tạm tính \(đã làm tròn\): [\d.]+ đồng/);
    expect(t).toMatch(/Tổng diện tích thu hồi theo hồ sơ: [\d.,]+ m²/);
    expect(t).toContain(`${ho.length} hộ chưa chốt phương án`);
  });
});
