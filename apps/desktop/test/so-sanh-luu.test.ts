import { describe, expect, it } from "vitest";
import { taoSoSanhLuu } from "../src/man/ban-do/ranh";

describe("1.0.12 — lưu kết quả so sánh bản đồ vào dự án", () => {
  it("chỉ giữ thửa thay đổi, đếm đủ mọi trạng thái, làm tròn đến mm; ghi chú trống thì bỏ", () => {
    const v = [[{ x: 500000.12345, y: 2300000.98765 }]];
    const r = taoSoSanhLuu(
      { tep: "moi.dgn", ds: [
        { ma: "a", soTo: "7", soThua: "1", trangThai: "GIONG", dtCu: 400, dtMoi: 400, khacBiet: 0, vongCu: v, vongMoi: v },
        { ma: "b", soTo: "7", soThua: "2", trangThai: "DOI_DT", dtCu: 400.12345, dtMoi: 500.98765, khacBiet: 100.4444, vongCu: v, vongMoi: v },
        { ma: "c", soTo: "7", soThua: "9", trangThai: "MOI", dtCu: null, dtMoi: 50, khacBiet: 50 },
      ] },
      "Cán bộ A", "  ", "2026-10-15T01:00:00.000Z", "ss1",
    );
    expect(r).toMatchObject({ id: "ss1", tep: "moi.dgn", nguoi: "Cán bộ A", dem: { GIONG: 1, DOI_DT: 1, MOI: 1 } });
    expect(r).not.toHaveProperty("ghiChu");
    expect(r.ds.map((x) => x.ma)).toEqual(["b", "c"]);
    expect(r.ds[0]).toMatchObject({ dtCu: 400.123, dtMoi: 500.988, khacBiet: 100.444 });
    expect(r.ds[0]!.vongCu![0]![0]).toEqual({ x: 500000.123, y: 2300000.988 });
    expect(r.ds[1]).not.toHaveProperty("vongCu");
  });
});
