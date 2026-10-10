import { describe, expect, it } from "vitest";
import { lechDiemDo } from "../src/man/ban-do/lech-diem-do";

describe("1.0.7 — đối chiếu điểm đo với tọa độ biên bản kiểm đếm", () => {
  it("khoảng cách theo VN-2000 (X biên bản = Bắc); ngưỡng do cán bộ đặt; thiếu tọa độ/ngưỡng thì không cảnh báo", () => {
    const d = { x: 500030, y: 1350010 }; // Đông, Bắc
    expect(lechDiemDo(d)).toBeNull();
    expect(lechDiemDo({ ...d, toaDoBienBan: { x: "1350010", y: "" } })).toBeNull();
    const l = lechDiemDo({ ...d, toaDoBienBan: { x: "1350013", y: "500034" } })!;
    expect(l.kc).toBeCloseTo(5, 9);
    expect(l.vuot).toBe(false);
    expect(lechDiemDo({ ...d, toaDoBienBan: { x: "1350013", y: "500034" } }, "3")!.vuot).toBe(true);
    expect(lechDiemDo({ ...d, toaDoBienBan: { x: "1350013", y: "500034" } }, "5.5")!.vuot).toBe(false);
    expect(lechDiemDo({ ...d, toaDoBienBan: { x: "1350013", y: "500034" } }, "0")!.vuot).toBe(false);
  });
});
