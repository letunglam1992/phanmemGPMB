import { describe, expect, it } from "vitest";
import { docDiem, docLyTrinh, dsDoan, hienDiem, hienLyTrinh, hopDoan, matBangTheoLyTrinh } from "../src/ly-trinh";
import type { Ho } from "../src/mo-hinh";

describe("Lý trình (1.0.4)", () => {
  it("đọc điểm và đoạn theo các cách viết thường gặp", () => {
    expect(docDiem("Km12+350")).toBe(12350);
    expect(docDiem("km 12 + 350,5")).toBe(12350.5);
    expect(docDiem("0+050")).toBe(50);
    expect(docDiem("12350")).toBe(12350);
    expect(docDiem("12+1350")).toBeNull();
    expect(docLyTrinh("")).toEqual({ ly: null });
    expect(docLyTrinh("Km12+350 – Km12+480")).toEqual({ ly: { tu: 12350, den: 12480 } });
    expect(docLyTrinh("12+350-12+480")).toEqual({ ly: { tu: 12350, den: 12480 } });
    expect(docLyTrinh("Km12+480 đến Km12+350")).toEqual({ ly: { tu: 12350, den: 12480 } });
    expect(docLyTrinh("Km1+000 ~ Km1+200")).toEqual({ ly: { tu: 1000, den: 1200 } });
    expect("loi" in docLyTrinh("Km A")).toBe(true);
    expect("loi" in docLyTrinh("Km1+000 – Km1+100 – Km1+200")).toBe(true);
    expect("loi" in docLyTrinh("12.350")).toBe(true); // dấu chấm phần nghìn: không đoán
  });
  it("hiển thị Km", () => {
    expect(hienDiem(12350)).toBe("Km12+350");
    expect(hienDiem(50)).toBe("Km0+050");
    expect(hienDiem(12350.5)).toBe("Km12+350,5");
    expect(hienLyTrinh({ tu: 100, den: 200 })).toBe("Km0+100 – Km0+200");
    expect(hienLyTrinh({ tu: 100 })).toBe("Km0+100");
    expect(hienLyTrinh(undefined)).toBe("");
  });
  it("hợp đoạn và mặt bằng sạch trừ phần chồng thửa chưa bàn giao", () => {
    expect(hopDoan([{ tu: 0, den: 100 }, { tu: 50, den: 150 }, { tu: 200, den: 300 }, { tu: 400 }])).toEqual([[0, 150], [200, 300]]);
    const ho = (id: string, banGiao: boolean, ly: { tu: number; den?: number }[]): Ho =>
      ({ id, ma: id, ten: id, banGiao: banGiao ? { ngay: "2026-10-01" } : undefined, thua: ly.map((l, i) => ({ id: `${id}-${i}`, soTo: "1", soThua: String(i), lyTrinh: l })) }) as unknown as Ho;
    const ds = dsDoan([ho("H2", false, [{ tu: 80, den: 120 }]), ho("H1", true, [{ tu: 0, den: 200 }, { tu: 500 }])], (h) => !!h.banGiao);
    expect(ds.map((d) => d.ma)).toEqual(["H1", "H2", "H1"]);
    const mb = matBangTheoLyTrinh(ds);
    expect(mb.tongM).toBe(200);
    expect(mb.sachM).toBe(160);
    expect(mb.chua).toEqual([[80, 120]]);
    expect(mb.sach).toEqual([[0, 80], [120, 200]]);
    expect(mb.soThuaDiem).toBe(1);
  });
});
