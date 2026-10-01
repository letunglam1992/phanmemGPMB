/** Bắt điểm nâng cao (docs/08 §9.10): đỉnh, trung điểm, giao điểm, vuông góc. */
import { describe, expect, it } from "vitest";
import { batDiemNangCao, chanVuongGoc, giaoDoan, hinhTuVong, type KieuBat } from "../src/man/ban-do/hinh-hoc";

const vuong = hinhTuVong([[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }]]);
const cheo = hinhTuVong([[{ x: -5, y: 5 }, { x: 15, y: 5 }]]);
const k = (...x: KieuBat[]) => new Set(x);

describe("Bắt điểm nâng cao", () => {
  it("giao đoạn, chân vuông góc", () => {
    expect(giaoDoan({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 5 });
    expect(giaoDoan({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeNull();
    expect(chanVuongGoc({ x: 3, y: 7 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 3, y: 0 });
    expect(chanVuongGoc({ x: 13, y: 7 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeNull();
  });
  it("chọn kiểu theo cài đặt và khoảng cách", () => {
    expect(batDiemNangCao({ x: 0.3, y: 0.2 }, [vuong], 1, k("DINH"))).toEqual({ d: { x: 0, y: 0 }, kieu: "DINH" });
    expect(batDiemNangCao({ x: 5.2, y: 0.3 }, [vuong], 1, k("DINH", "TRUNG_DIEM"))).toEqual({ d: { x: 5, y: 0 }, kieu: "TRUNG_DIEM" });
    expect(batDiemNangCao({ x: 10.3, y: 5.2 }, [vuong, cheo], 1, k("GIAO_DIEM"))).toEqual({ d: { x: 10, y: 5 }, kieu: "GIAO_DIEM" });
    expect(batDiemNangCao({ x: 3.4, y: 0.4 }, [vuong], 1, k("VUONG_GOC"), { x: 3, y: 8 })).toEqual({ d: { x: 3, y: 0 }, kieu: "VUONG_GOC" });
    expect(batDiemNangCao({ x: 5, y: 5 }, [vuong], 1, k("DINH", "TRUNG_DIEM"))).toBeNull();
  });
});
