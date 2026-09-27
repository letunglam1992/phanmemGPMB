import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import { datTheoPhanLop, tyLeLop, type BoChinhSach } from "../src";

const cs = cs0 as unknown as BoChinhSach;

describe("Đất theo phân lớp do cán bộ nhập (QD-21, k6 Đ4 NQ 152)", () => {
  it("tỷ lệ giảm dần: đất ở 100/60/36/21,6/12,96%; PNN 100/50/25/12,5%", () => {
    expect([1, 2, 3, 4, 5].map((k) => tyLeLop(cs, "DAT_O", k).toString())).toEqual(["1", "0.6", "0.36", "0.216", "0.1296"]);
    expect([1, 2, 3, 4].map((k) => tyLeLop(cs, "PNN", k).toString())).toEqual(["1", "0.5", "0.25", "0.125"]);
  });

  it("điền giá theo vị trí và lớp; cộng từng lớp", () => {
    const { dong, chiTiet } = datTheoPhanLop(cs, {
      loaiDat: "ONT",
      nhom: "DAT_O",
      nguonTuyen: "Bảng 05, STT 1.1, VT1–VT2",
      dienTichThuHoiM2: "150.5",
      lop: [
        { lop: 1, viTri: 1, giaViTriNghinDong: 720, dienTichM2: 100 },
        { lop: 2, viTri: 1, giaViTriNghinDong: 720, dienTichM2: "40.5" },
        { lop: 1, viTri: 2, giaViTriNghinDong: 420, dienTichM2: 10 },
      ],
    });
    expect(chiTiet.map((x) => x.giaApDung.toString())).toEqual(["720000", "432000", "420000"]);
    // 100 × 720.000 + 40,5 × 432.000 + 10 × 420.000
    expect(dong.thanhTien!.toString()).toBe(String(72000000 + 17496000 + 4200000));
    expect(dong.trangThai).toBe("TAM_TINH");
  });

  it("tổng DT lớp khác DT thu hồi, giá sửa không lý do → cần xác nhận; có lý do → ghi lựa chọn", () => {
    const a = datTheoPhanLop(cs, { loaiDat: "ONT", nhom: "DAT_O", nguonTuyen: "x", dienTichThuHoiM2: 200, lop: [{ lop: 1, viTri: 1, giaViTriNghinDong: 720, dienTichM2: 100 }] });
    expect(a.dong.trangThai).toBe("CAN_XAC_NHAN");
    const b = datTheoPhanLop(cs, { loaiDat: "ONT", nhom: "DAT_O", nguonTuyen: "x", lop: [{ lop: 2, viTri: 1, giaViTriNghinDong: 720, dienTichM2: 10, giaTuyChinhNghinDong: 500 }] });
    expect(b.dong.trangThai).toBe("CAN_XAC_NHAN");
    const c = datTheoPhanLop(cs, { loaiDat: "ONT", nhom: "DAT_O", nguonTuyen: "x", lop: [{ lop: 2, viTri: 1, giaViTriNghinDong: 720, dienTichM2: 10, giaTuyChinhNghinDong: 500, lyDo: "Áp sàn giá VT thấp nhất" }] });
    expect(c.dong.trangThai).toBe("TAM_TINH");
    expect(c.dong.thanhTien!.toString()).toBe("5000000");
    expect(c.dong.luaChon[0]!.ma).toBe("QD-21");
  });

  it("lớp vượt số lớp quy định → cần xác nhận", () => {
    const d = datTheoPhanLop(cs, { loaiDat: "TMD", nhom: "PNN", nguonTuyen: "x", lop: [{ lop: 5, viTri: 1, giaViTriNghinDong: 100, dienTichM2: 1 }] });
    expect(d.dong.trangThai).toBe("CAN_XAC_NHAN");
  });
});
