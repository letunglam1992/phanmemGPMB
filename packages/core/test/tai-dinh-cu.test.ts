import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import { type BoChinhSach, dienTichSuatToiThieu, hoTroSuatToiThieu, hoTroTienSddTdc, hoTroTuLoChoO } from "../src";

const cs = cs0 as unknown as BoChinhSach;

describe("Hỗ trợ tái định cư", () => {
  it("C08 tự lo chỗ ở theo địa bàn (Đ10 PL II QĐ 106)", () => {
    expect(hoTroTuLoChoO(cs, { xa: "Phường Chiềng An" }).thanhTien!.toString()).toBe("100000000");
    expect(hoTroTuLoChoO(cs, { xa: "Xã Mai Sơn" }).thanhTien!.toString()).toBe("80000000");
    expect(hoTroTuLoChoO(cs, { xa: "Xã Chiềng Mung" }).thanhTien!.toString()).toBe("60000000");
  });
  it("suất tối thiểu (Đ16 PL II): đất ở 40 m² phường, 60 m² xã; nhà ở 40 m²", () => {
    expect(dienTichSuatToiThieu(cs, { xa: "Phường Tô Hiệu", hinhThuc: "DAT_O" })).toBe("40");
    expect(dienTichSuatToiThieu(cs, { xa: "Xã Chiềng Mung", hinhThuc: "DAT_O" })).toBe("60");
    expect(dienTichSuatToiThieu(cs, { xa: "Xã Chiềng Mung", hinhThuc: "NHA_O" })).toBe("40");
  });
  it("C10 = giá trị suất tối thiểu − tiền bồi thường về đất ở; đủ suất thì 0", () => {
    const d = hoTroSuatToiThieu(cs, { xa: "Xã Chiềng Mung", hinhThuc: "DAT_O", donGiaDongM2: 1_500_000, nguonGia: "NQ 152", tienBoiThuongDatO: 50_000_000 });
    expect(d.thanhTien!.toString()).toBe("40000000"); // 60 × 1,5 tr = 90 tr − 50 tr
    const du = hoTroSuatToiThieu(cs, { xa: "Xã Chiềng Mung", hinhThuc: "DAT_O", donGiaDongM2: 1_500_000, nguonGia: "NQ 152", tienBoiThuongDatO: 120_000_000 });
    expect(du.thanhTien!.toString()).toBe("0");
    expect(du.canhBao.join(" ")).toContain("đã đủ");
  });
  it("C11 = 20% tiền SDĐ phải nộp (k11 Đ6 QĐ 14/2026), kèm cảnh báo VM-28", () => {
    const d = hoTroTienSddTdc(cs, { tienSddPhaiNop: 150_000_000, moTa: "thử" });
    expect(d.thanhTien!.toString()).toBe("30000000");
    expect(d.canhBao.join(" ")).toContain("VM-28");
  });
});
