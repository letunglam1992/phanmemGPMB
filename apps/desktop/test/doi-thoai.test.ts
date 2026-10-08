import { describe, expect, it } from "vitest";
import { demYKien, hanDoiThoai, trangThaiDoiThoai } from "../src/doi-thoai";
import { LICH_TRONG } from "../src/lich-lam-viec";

describe("Ý kiến về phương án, đối thoại — điểm a khoản 3 Điều 87 LĐĐ 2024 (1.0.6)", () => {
  it("hạn 60 ngày kể từ ngày lấy ý kiến; ngày cuối rơi vào ngày nghỉ thì sang ngày làm việc tiếp theo", () => {
    expect(hanDoiThoai("2026-09-05", LICH_TRONG)).toBe("2026-11-04"); // thứ Tư
    expect(hanDoiThoai("2026-09-01", LICH_TRONG)).toBe("2026-11-02"); // 31/10 thứ Bảy → thứ Hai 02/11
    expect(hanDoiThoai("2026-09-02", LICH_TRONG)).toBe("2026-11-02"); // 01/11 Chủ nhật → thứ Hai 02/11
  });
  it("trạng thái: chưa ghi, không cần (đồng ý/ý kiến khác), cần đối thoại, quá hạn, đã đối thoại", () => {
    expect(trangThaiDoiThoai(undefined, "2026-10-01", LICH_TRONG).tt).toBe("CHUA_GHI");
    expect(trangThaiDoiThoai({ ngayLay: "2026-09-01" }, "2026-10-01", LICH_TRONG).tt).toBe("CHUA_GHI");
    expect(trangThaiDoiThoai({ loai: "DONG_Y" }, "2026-10-01", LICH_TRONG).tt).toBe("KHONG_CAN");
    expect(trangThaiDoiThoai({ loai: "KHAC" }, "2026-10-01", LICH_TRONG).tt).toBe("KHONG_CAN");
    const kd = { loai: "KHONG_DONG_Y" as const, ngayLay: "2026-09-01" };
    expect(trangThaiDoiThoai(kd, "2026-11-02", LICH_TRONG)).toEqual({ tt: "CAN_DOI_THOAI", han: "2026-11-02" });
    expect(trangThaiDoiThoai(kd, "2026-11-03", LICH_TRONG).tt).toBe("QUA_HAN");
    expect(trangThaiDoiThoai({ loai: "KHONG_DONG_Y" }, "2027-01-01", LICH_TRONG).tt).toBe("CAN_DOI_THOAI"); // chưa có ngày lấy ý kiến → chưa tính hạn
    expect(trangThaiDoiThoai({ ...kd, doiThoai: [{ ngay: "2026-09-10", ketQua: "CON_Y_KIEN" }, { ngay: "2026-09-25", ketQua: "THONG_NHAT" }] }, "2026-12-01", LICH_TRONG).tt).toBe("DA_THONG_NHAT");
    expect(trangThaiDoiThoai({ ...kd, doiThoai: [{ ngay: "2026-09-25", ketQua: "THONG_NHAT" }, { ngay: "2026-09-10", ketQua: "CON_Y_KIEN" }] }, "2026-12-01", LICH_TRONG).tt).toBe("DA_THONG_NHAT"); // lấy lần muộn nhất
  });
  it("đếm ý kiến cho biên bản lấy ý kiến", () => {
    expect(demYKien([{ yKienPA: { loai: "DONG_Y" } }, { yKienPA: { loai: "KHONG_DONG_Y" } }, { yKienPA: { loai: "KHAC" } }, { yKienPA: { ngayLay: "2026-09-01" } }, {}])).toEqual({ dongY: 1, khongDongY: 1, khac: 1, chuaGhi: 2 });
  });
});
