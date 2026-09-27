import { describe, expect, it } from "vitest";
import { MAC_DINH_TU_DONG, coVoWindows, denHan, tenTepTuDong } from "../src/tu-dong-sao-luu";

describe("Tự động sao lưu", () => {
  const bay = new Date("2026-10-02T09:00:00.000Z");
  it("đến hạn theo chu kỳ; tắt thì không chạy; lỗi thì chờ 6 giờ mới thử lại", () => {
    expect(denHan(MAC_DINH_TU_DONG, bay)).toBe(true);
    expect(denHan({ ...MAC_DINH_TU_DONG, bat: false }, bay)).toBe(false);
    expect(denHan({ ...MAC_DINH_TU_DONG, lanCuoi: "2026-10-01T10:00:00.000Z" }, bay)).toBe(false);
    expect(denHan({ ...MAC_DINH_TU_DONG, lanCuoi: "2026-10-01T09:00:00.000Z" }, bay)).toBe(true);
    expect(denHan({ ...MAC_DINH_TU_DONG, soNgay: 3, lanCuoi: "2026-10-01T09:00:00.000Z" }, bay)).toBe(false);
    expect(denHan({ ...MAC_DINH_TU_DONG, loiCuoi: "x", thuLuc: "2026-10-02T05:00:00.000Z" }, bay)).toBe(false);
    expect(denHan({ ...MAC_DINH_TU_DONG, loiCuoi: "x", thuLuc: "2026-10-02T02:00:00.000Z" }, bay)).toBe(true);
  });
  it("tên tệp tự động: không dấu, có dấu thời gian để sắp xếp (khớp kiểm tra phía vỏ Rust)", () => {
    const t = tenTepTuDong("2026-10-02T09:05:07.123Z");
    expect(t).toBe("GPMB-tu-dong_20261002_090507.gpmb");
    expect(/^GPMB-tu-dong_[A-Za-z0-9._-]+\.gpmb$/.test(t)).toBe(true);
  });
  it("ngoài bản cài Windows thì không có vỏ", () => {
    expect(coVoWindows()).toBe(false);
  });
});
