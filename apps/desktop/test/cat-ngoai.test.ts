import { describe, expect, it } from "vitest";
import { canhBaoCatNgoai, laNoiNgoai, oCua } from "../src/cat-ngoai";

describe("1.0.19 (B3) — nhắc cất bản sao lưu ra thiết bị khác", () => {
  it("nhận biết ổ đĩa: khác ký tự ổ, đường dẫn mạng là thiết bị khác; không xác định → null", () => {
    expect(oCua("e:\\SaoLuu\\a.gpmb")).toBe("E:");
    expect(oCua("\\\\May-Chu\\Chia Se\\GPMB\\a.gpmb")).toBe("\\\\may-chu\\chia se");
    const macDinh = "C:\\Users\\a\\Documents\\GPMB Son La\\Sao luu";
    expect(laNoiNgoai("E:\\a.gpmb", macDinh)).toBe(true);
    expect(laNoiNgoai("c:\\Khac\\a.gpmb", macDinh)).toBe(false);
    expect(laNoiNgoai("\\\\may-chu\\chia-se\\a.gpmb", macDinh)).toBe(true);
    expect(laNoiNgoai("a.gpmb", macDinh)).toBeNull();
    expect(laNoiNgoai("E:\\a.gpmb", "")).toBeNull();
  });

  it("nhắc theo chu kỳ đơn vị đặt (mặc định 7 ngày); chưa có dữ liệu thì không nhắc", () => {
    expect(canhBaoCatNgoai(null, "2026-10-17", false)).toBeNull();
    expect(canhBaoCatNgoai(null, "2026-10-17", true)).toContain("Chưa cất bản sao lưu ra thiết bị khác");
    const lan = { luc: "2026-10-05T08:00:00.000Z", noi: "E:\\a.gpmb" };
    expect(canhBaoCatNgoai(lan, "2026-10-12", true)).toBeNull();
    expect(canhBaoCatNgoai(lan, "2026-10-17", true)).toBe("Đã 12 ngày chưa cất bản sao lưu ra thiết bị khác (lần cuối 05/10/2026; nhắc sau 7 ngày).");
    expect(canhBaoCatNgoai(lan, "2026-10-17", true, 14)).toBeNull();
  });
});
