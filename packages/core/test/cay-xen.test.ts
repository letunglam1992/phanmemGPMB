/**
 * Ca kiểm thử vàng từ biểu áp giá mẫu (dự thảo) người dùng cung cấp — thửa 85, tờ 5, đã bỏ tên chủ hộ.
 * DT 9.222,1 m²; trừ 154,3 m² công trình; quỹ = 9.222,1 × 1,5 − 154,3 = 13.678,85 m².
 */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import { cayTrongXenCanh, goiYThuTuCayXen, D, type BoChinhSach, type DongCayXen } from "../src";

const cs = cs0 as unknown as BoChinhSach;
const c = (ten: string, soLuong: number, donGia: number, matDoHa: number): DongCayXen => ({ ten, maDonGia: "PL8", donVi: "cây", donGia, soLuong, matDoHa });
const NHAN = 400, XOAI = 400, NA = 1100, MIT = 400, CAPHE = 4600, GO = 1600;
// Thứ tự đúng như biểu mẫu (chủ sở hữu chọn: nhãn → xoài → ...)
const thua85: DongCayXen[] = [
  c("Nhãn >30cm", 14, 3900000, NHAN), c("Nhãn >25cm", 32, 1950000, NHAN), c("Nhãn >20cm", 38, 1500000, NHAN),
  c("Nhãn >15cm", 42, 1200000, NHAN), c("Nhãn >10cm", 138, 800000, NHAN), c("Nhãn >8cm", 75, 575000, NHAN),
  c("Nhãn >4cm", 39, 285000, NHAN), c("Nhãn >2cm", 43, 120000, NHAN), c("Nhãn ≤2cm", 27, 90000, NHAN),
  c("Xoài >30cm", 10, 3240000, XOAI), c("Xoài >25cm", 39, 1850000, XOAI), c("Xoài >20cm", 117, 1480000, XOAI),
  c("Xoài >15cm", 177, 1150000, XOAI), c("Xoài >10cm", 216, 790000, XOAI), c("Xoài >8cm", 39, 540000, XOAI),
  c("Xoài >6cm", 6, 280000, XOAI), c("Xoài >4cm", 14, 115000, XOAI), c("Xoài ≤4cm", 6, 90000, XOAI),
  c("Na >15cm", 4, 1537000, NA), c("Na >10cm", 10, 1200000, NA), c("Mít >25cm", 1, 1690000, MIT),
  c("Cà phê 10–20 năm", 1381, 68000, CAPHE), c("Cà phê 5–10 năm", 132, 56000, CAPHE),
  c("Lát khép tán", 169, 76000, GO), c("Lát 0,4–0,5", 47, 174000, GO), c("Lát 0,5–0,6", 16, 190000, GO), c("Lát >0,6", 47, 280000, GO),
  c("Sưa khép tán", 95, 76000, GO), c("Sưa 0,4–0,5", 7, 174000, GO), c("Sưa 0,5–0,6", 8, 190000, GO), c("Sưa >0,6", 5, 280000, GO),
  c("Xoan khép tán", 35, 47000, GO), c("Xoan 0,4–0,5", 19, 118000, GO), c("Xoan 0,5–0,6", 5, 134000, GO), c("Xoan >0,6", 34, 202000, GO),
];
// Tổng cột G dòng 47–83 của biểu mẫu
const TONG_BIEU_MAU = 54600000 + 62400000 + 57000000 + 50400000 + 110400000 + 43125000 + 11115000 + 5160000 + 2430000
  + 32400000 + 72150000 + 74000000 + 29748000 + 61065000 + 51192000 + 6318000 + 504000 + 483000 + 162000
  + 1844400 + 3600000 + 507000 + 28172400 + 2217600 + 3853200 + 2453400 + 912000 + 3948000
  + 2166000 + 365400 + 456000 + 420000 + 493500 + 672600 + 201000 + 2060400;

describe("Cây trồng xen nhiều loài (k4 Đ5 PL VIII QĐ 106/2025)", () => {
  const kq = cayTrongXenCanh(cs, { dienTichM2: "9222.1", dienTichTruM2: "154.3", lyDoTru: "Theo biểu mẫu: trừ diện tích công trình xây dựng", thuTuChuSoHuu: thua85, cay: thua85 });
  const tong = kq.dong.reduce((s, d) => s.plus(d.thanhTien ?? 0), D(0));

  it("quỹ diện tích và dòng ranh giới khớp biểu mẫu", () => {
    expect(kq.quyM2.toString()).toBe("13678.85");
    expect(kq.daDungM2.toString()).toBe("13675");
    const xoai20 = kq.dong[11]!;
    expect(xoai20.thamSo["Hưởng 100%"]).toBe("50");
    expect(xoai20.thamSo["Vượt (hưởng 30%)"]).toBe("67");
  });

  it("tổng tiền khớp biểu mẫu (dòng 47–83)", () => {
    expect(tong.toNumber()).toBe(TONG_BIEU_MAU);
    expect(kq.dong.every((d) => d.trangThai === "TAM_TINH")).toBe(true);
  });

  it("LAP_DAY: phần dư 3,85 m² xếp thêm 1 cây cà phê hưởng 100%", () => {
    const k2 = cayTrongXenCanh(cs, { dienTichM2: "9222.1", dienTichTruM2: "154.3", lyDoTru: "x", cachXep: "LAP_DAY", thuTuChuSoHuu: thua85, cay: thua85 });
    const t2 = k2.dong.reduce((s, d) => s.plus(d.thanhTien ?? 0), D(0));
    expect(t2.minus(tong).toNumber()).toBe(68000 * 0.7);
    expect(k2.dong[0]!.luaChon.some((l) => l.ma === "VM-34")).toBe(true);
  });

  it("trừ diện tích công trình mà không có lý do → cần xác nhận", () => {
    const k3 = cayTrongXenCanh(cs, { dienTichM2: 100, dienTichTruM2: 10, cay: [c("Nhãn", 10, 1000, 400)] });
    expect(k3.dong[0]!.trangThai).toBe("CAN_XAC_NHAN");
  });

  it("thứ tự gợi ý theo đơn giá giảm dần; cây không có mật độ → cần xác nhận", () => {
    expect(goiYThuTuCayXen([c("A", 1, 100, 400), c("B", 1, 300, 400), c("C", 1, 300, 400)]).map((x) => x.ten)).toEqual(["B", "C", "A"]);
    const k4 = cayTrongXenCanh(cs, { dienTichM2: 100, cay: [{ ...c("Hoa giấy", 3, 17000, 0), matDoHa: null }] });
    expect(k4.dong[0]!.trangThai).toBe("CAN_XAC_NHAN");
    expect(k4.dong[0]!.luaChon[0]!.giaTri).toContain("đơn giá giảm dần");
  });
});
