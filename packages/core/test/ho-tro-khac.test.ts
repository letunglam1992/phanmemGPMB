import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import { type BoChinhSach, hoTroDoiTuongChinhSach, hoTroHoNgheo, hoTroXayLaiNha } from "../src";

const cs = cs0 as unknown as BoChinhSach;

describe("Hỗ trợ khác — Điều 6 QĐ 14/2026", () => {
  it("k1: cán bộ chọn mức; nhiều đối tượng chỉ hưởng mức cao nhất; thiếu xác nhận → Cần xác nhận", () => {
    const d = hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", muc: "4500000", xacNhan: "XN 1" }, { ten: "B", muc: "6000000", xacNhan: "XN 2" }] });
    expect(d.thanhTien!.toString()).toBe("6000000");
    expect(d.trangThai).toBe("TAM_TINH");
    expect(d.canCu[0]).toEqual({ vanBan: "QĐ 14/2026/QĐ-UBND", viTri: "khoản 1 Điều 6" });
    expect(d.canhBao.join(" ")).toMatch(/một mức hỗ trợ cao nhất/);
    expect(hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", muc: "3000000", xacNhan: "" }] }).trangThai).toBe("CAN_XAC_NHAN");
    expect(hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", muc: "3500000", xacNhan: "x" }] }).trangThai).toBe("THIEU_CAN_CU"); // mức không có trong quy định
  });
  it("k1 theo điểm a–đ (nguyên văn QĐ 14/2026); điểm đ không áp dụng cho hộ nghèo (khoản 2)", () => {
    const d = hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", diem: "b", xacNhan: "XN" }] });
    expect(d.thanhTien!.toString()).toBe("5500000");
    expect(d.canCu[0]!.viTri).toBe("điểm b khoản 1 Điều 6");
    const e = hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", diem: "đ", xacNhan: "XN" }] });
    expect(e.thanhTien!.toString()).toBe("3000000");
    const f = hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", diem: "đ", xacNhan: "XN" }], coHoNgheo: true });
    expect(f.trangThai).toBe("THIEU_CAN_CU");
    expect(f.canhBao.join(" ")).toMatch(/điểm đ.*khoản 2/i);
    const g = hoTroDoiTuongChinhSach(cs, { doiTuong: [{ ten: "A", diem: "d", xacNhan: "XN" }, { ten: "B", diem: "đ", xacNhan: "XN" }], coHoNgheo: true });
    expect(g.thanhTien!.toString()).toBe("4500000");
    expect(cs.hoTroKhac!.doiTuongChinhSach.diem!.map((x) => [x.ma, x.muc])).toEqual([["a", "6000000"], ["b", "5500000"], ["c", "5000000"], ["d", "4500000"], ["đ", "3000000"]]);
  });
  it("k2 hộ nghèo 4.000.000 đ/hộ; k6: 30 kg × giá gạo × khẩu × 6 tháng", () => {
    expect(hoTroHoNgheo(cs, { xacNhan: "QĐ 12" })).toMatchObject({ trangThai: "TAM_TINH" });
    expect(hoTroHoNgheo(cs, { xacNhan: "QĐ 12" }).thanhTien!.toString()).toBe("4000000");
    expect(hoTroHoNgheo(cs, { xacNhan: " " }).trangThai).toBe("CAN_XAC_NHAN");
    expect(hoTroXayLaiNha(cs, { nhanKhau: 4, giaGaoDongKg: "15000", nguonGiaGao: "TB giá" }).thanhTien!.toString()).toBe("10800000");
  });
  it("bộ chính sách không có mục hỗ trợ khác → Thiếu căn cứ", () => {
    const { hoTroKhac: _b, ...khong } = cs;
    expect(hoTroHoNgheo(khong as BoChinhSach, { xacNhan: "x" }).trangThai).toBe("THIEU_CAN_CU");
  });
});
