/** Bắt điểm nâng cao (docs/08 §9.10): đỉnh, trung điểm, giao điểm, vuông góc. */
import { describe, expect, it } from "vitest";
import { batDiemNangCao, chanVuongGoc, giaoDoan, hinhTuVong, tamCung, type HinhVe, type KieuBat } from "../src/man/ban-do/hinh-hoc";

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

  it("1.0.7 — bắt tâm cung tròn/elip; điểm gần nhất trên cạnh (ưu tiên thấp nhất)", () => {
    const k = (...x: KieuBat[]) => new Set<KieuBat>(x);
    // cung 1/4 đường tròn tâm (100, 200) bán kính 10, rời rạc 9 điểm
    const cung = Array.from({ length: 9 }, (_, i) => ({ x: 100 + 10 * Math.cos((i * Math.PI) / 16), y: 200 + 10 * Math.sin((i * Math.PI) / 16) }));
    const t = tamCung(cung, false)!;
    expect(t.x).toBeCloseTo(100, 6);
    expect(t.y).toBeCloseTo(200, 6);
    const tron = Array.from({ length: 37 }, (_, i) => ({ x: 50 + 4 * Math.cos((i * Math.PI) / 18), y: 60 + 2 * Math.sin((i * Math.PI) / 18) }));
    expect(tamCung(tron, true)!.x).toBeCloseTo(50, 6);
    expect(tamCung([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], false)).toBeNull();
    const hop = (d: { x: number; y: number }[]) => ({ minX: Math.min(...d.map((p) => p.x)), minY: Math.min(...d.map((p) => p.y)), maxX: Math.max(...d.map((p) => p.x)), maxY: Math.max(...d.map((p) => p.y)) });
    const hCung: HinhVe = { stt: 1, lop: 1, loai: "CUNG", mau: 0, duong: [cung], kin: false, hop: hop(cung), tam: t };
    // con trỏ trên cung (xa tâm) → bắt tâm
    const tren = { x: 100 + 10 * Math.cos(0.3), y: 200 + 10 * Math.sin(0.3) };
    expect(batDiemNangCao(tren, [hCung], 1, k("TAM"))!.kieu).toBe("TAM");
    // con trỏ gần tâm → bắt tâm
    expect(batDiemNangCao({ x: 100.4, y: 200.2 }, [hCung], 1, k("TAM"))!.d).toEqual(t);
    // điểm gần nhất trên cạnh: chỉ khi không có kiểu khác trong bán kính
    const vuong = hinhTuVong([[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }]]);
    const g = batDiemNangCao({ x: 3.3, y: 0.4 }, [vuong], 1, k("GAN_NHAT"))!;
    expect(g.kieu).toBe("GAN_NHAT");
    expect(g.d.x).toBeCloseTo(3.3, 9);
    expect(Math.abs(g.d.y)).toBeLessThan(1e-9);
    expect(batDiemNangCao({ x: 0.3, y: 0.4 }, [vuong], 1, k("GAN_NHAT", "DINH"))!.kieu).toBe("DINH");
    expect(batDiemNangCao({ x: 5, y: 5 }, [vuong], 1, k("GAN_NHAT"))).toBeNull();
  });
});
