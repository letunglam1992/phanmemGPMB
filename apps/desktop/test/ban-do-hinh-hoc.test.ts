/** Trình xem bản đồ (0.8.8): đo chiều dài, diện tích, bắt điểm, tìm phần tử, tách lớp của tệp DGN. */
import { describe, expect, it } from "vitest";
import { docDgn } from "@gpmb/gis";
import { VietDgn } from "../../../packages/gis/test/viet-dgn";
import { batDiem, chieuDai, chuanBiVe, dienTich, hinhTuVong, khoangCachDoan, phamViToanBo, timPhanTu } from "../src/man/ban-do/hinh-hoc";

describe("Đo đạc", () => {
  it("chiều dài, diện tích (Gauss), khoảng cách tới đoạn", () => {
    const vuong = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }];
    expect(chieuDai(vuong)).toBe(80);
    expect(dienTich(vuong)).toBe(600);
    expect(dienTich([...vuong].reverse())).toBe(600);
    expect(khoangCachDoan({ x: 5, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(4);
    expect(khoangCachDoan({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });
  it("bắt điểm vào đỉnh gần nhất trong bán kính", () => {
    const h = [hinhTuVong([[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]])];
    expect(batDiem({ x: 9.5, y: 0.4 }, h, 1)).toEqual({ x: 10, y: 0 });
    expect(batDiem({ x: 5, y: 5 }, h, 1)).toBeNull();
  });
});

describe("Tệp DGN: tách lớp, chữ, phạm vi", () => {
  const v = new VietDgn(1000, 1, [0, 0]);
  v.duongGap({ lop: 10 }, [[500000, 1350000], [500020, 1350000], [500020, 1350020], [500000, 1350020], [500000, 1350000]], 6)
    .duongGap({ lop: 23 }, [[500000, 1350030], [500050, 1350030]], 4)
    .chu({ lop: 13 }, [500005, 1350008], "15");
  const ve = chuanBiVe(docDgn(new Uint8Array(v.xuat())));
  it("mỗi lớp có số nét, số chữ; vùng khép kín tính được diện tích", () => {
    expect(ve.lop.map((l) => [l.lop, l.soHinh, l.soChu])).toEqual([[10, 1, 0], [13, 0, 1], [23, 1, 0]]);
    const vung = ve.hinh.find((h) => h.lop === 10)!;
    expect(vung.kin).toBe(true);
    expect(dienTich(vung.duong.flat())).toBe(400);
    expect(ve.chu[0]!.chu).toBe("15");
  });
  it("phạm vi toàn bộ; tìm phần tử gần con trỏ (cạnh, chữ)", () => {
    const r = phamViToanBo(ve.hinh, ve.chu)!;
    expect(r.minX).toBe(500000);
    expect(r.maxY).toBe(1350030);
    expect(timPhanTu({ x: 500025, y: 1350030.5 }, ve.hinh, ve.chu, 1)?.hinh?.lop).toBe(23);
    expect(timPhanTu({ x: 500005.2, y: 1350008.1 }, ve.hinh, ve.chu, 1)?.chu?.chu).toBe("15");
  });
});
