import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import {
  type BoChinhSach,
  boiThuongHanhLang,
  chiPhiDauTuTheoGiaDat,
  chuyenDoiNghe,
  hoTroNhaHanhLang,
  hoTroNhaSoHuuNhaNuoc,
  hoTroOnDinhSanXuatDat,
  hoTroOnDinhSxkd,
  hoTroTuLoChoO,
  nhomDiaBan,
} from "../src";

const cs = cs0 as unknown as BoChinhSach;
const { phuLucII: _p, ...khong0 } = cs;
const khong = khong0 as BoChinhSach;

describe("Phụ lục II QĐ 106/2025 — các khoản còn hiệu lực", () => {
  it("nhomDiaBan: mẫu \"Phường *\" khớp mọi phường sau khi không khớp tên cụ thể", () => {
    expect(nhomDiaBan({ A: ["Xã X"], P: ["Phường *"] }, "Phường Mới", "K")).toBe("P");
    expect(nhomDiaBan({ P: ["Phường *"], A: ["Phường Đặc Biệt"] }, "Phường Đặc Biệt", "K")).toBe("A");
    expect(nhomDiaBan({ P: ["Phường *"] }, "Xã Phường", "K")).toBe("K");
    // Điều 14: "Đối với các phường" 5 lần giá đất NN
    const d = chuyenDoiNghe(cs, { xa: "Phường Quyết Tâm", loaiDat: "LUC", dienTichThuHoiM2: "100", hanMucM2: "1000", canCuHanMuc: "x", giaDatNNNghinDong: "50" });
    expect(d.thanhTien!.toString()).toBe("25000000");
    // Điều 10 k1: Phường Quyết Tâm thuộc nhóm 100 triệu
    expect(hoTroTuLoChoO(cs, { xa: "Phường Quyết Tâm" }).thanhTien!.toString()).toBe("100000000");
  });
  it("Điều 3 k2: 01 lần giá đất bảng giá × DT; tổ chức nhân tỷ lệ thời hạn còn lại", () => {
    const d = chiPhiDauTuTheoGiaDat(cs, { loaiDat: "CLN", dienTichM2: "200", giaNghinDong: "60", nguonGia: "Bảng 02" });
    expect(d.thanhTien!.toString()).toBe("12000000");
    expect(d.ma).toBe("B07");
    expect(d.canCu[0]).toEqual({ vanBan: "QĐ 106/2025/QĐ-UBND", viTri: "Điều 3 Phụ lục II" });
    expect(chiPhiDauTuTheoGiaDat(cs, { loaiDat: "SKC", dienTichM2: "100", giaNghinDong: "1000", nguonGia: "B", tyLeThoiHan: { conLaiNam: 20, thoiHanNam: 50 } }).thanhTien!.toString()).toBe("40000000");
    expect(chiPhiDauTuTheoGiaDat(khong, { loaiDat: "CLN", dienTichM2: "1", giaNghinDong: "1", nguonGia: "" }).trangThai).toBe("THIEU_CAN_CU");
  });
  it("Điều 7: hành lang điện 80/50/30%; hành lang khác 50% (không áp dụng HNK); nhà trong hành lang 70%", () => {
    const g = { loaiDat: "ONT", dienTichM2: "100", giaDongM2: "1000000", nguonGia: "giá cụ thể" };
    expect(boiThuongHanhLang(cs, { ...g, loai: "DIEN", nhomDat: "O_PNN" }).thanhTien!.toString()).toBe("80000000");
    expect(boiThuongHanhLang(cs, { ...g, loai: "DIEN", nhomDat: "CLN_RSX" }).thanhTien!.toString()).toBe("50000000");
    expect(boiThuongHanhLang(cs, { ...g, loai: "DIEN", nhomDat: "HNK" }).thanhTien!.toString()).toBe("30000000");
    expect(boiThuongHanhLang(cs, { ...g, loai: "KHAC", nhomDat: "O_PNN" })).toMatchObject({ ma: "B09" });
    expect(boiThuongHanhLang(cs, { ...g, loai: "KHAC", nhomDat: "O_PNN" }).thanhTien!.toString()).toBe("50000000");
    expect(boiThuongHanhLang(cs, { ...g, loai: "KHAC", nhomDat: "HNK" }).trangThai).toBe("THIEU_CAN_CU");
    expect(hoTroNhaHanhLang(cs, { ten: "Nhà cấp 4", giaTriTheoDonGia: "200000000" }).thanhTien!.toString()).toBe("140000000");
  });
  it("Điều 11: thuê nhà theo khẩu, tối đa 6 tháng; tự lo 50% mức Điều 10", () => {
    const t = (nhanKhau: number, soThang: number) => hoTroNhaSoHuuNhaNuoc(cs, { cach: "THUE", nhanKhau, soThang, xa: "Xã Mường Bú" }).thanhTien!.toString();
    expect(t(2, 3)).toBe("6000000");
    expect(t(4, 6)).toBe("21000000");
    expect(t(6, 8)).toBe("27000000"); // (3,5 + 2 × 0,5) × 6
    expect(hoTroNhaSoHuuNhaNuoc(cs, { cach: "TU_LO", nhanKhau: 3, soThang: 0, xa: "Phường Tô Hiệu" }).thanhTien!.toString()).toBe("50000000");
    expect(hoTroNhaSoHuuNhaNuoc(cs, { cach: "THUE", nhanKhau: 3, soThang: 0, xa: "x" }).trangThai).toBe("THIEU_CAN_CU");
  });
  it("Điều 13 k1: cây hàng năm 100% × 2 vụ; cây lâu năm 50%, tối đa 1 ha; thiếu căn cứ định mức → Thiếu căn cứ", () => {
    const d = hoTroOnDinhSanXuatDat(cs, { hangNam: { dienTichM2: "5000", dinhMucDongHaVu: "10000000" }, lauNam: { dienTichM2: "15000", chiPhiDongHa: "40000000" }, canCuDinhMuc: "QĐ định mức số X" });
    expect(d.thanhTien!.toString()).toBe(String(0.5 * 10e6 * 2 + 1 * 40e6 * 0.5));
    expect(d.canhBao.join(" ")).toMatch(/vượt 1,00 ha/);
    expect(hoTroOnDinhSanXuatDat(cs, { hangNam: { dienTichM2: "1", dinhMucDongHaVu: "1" }, canCuDinhMuc: " " }).trangThai).toBe("THIEU_CAN_CU");
  });
  it("Điều 13 k2, k3: 30% thu nhập sau thuế BQ; tạm thời 50%; hộ không kế toán 2,4 / 4,8 triệu", () => {
    expect(hoTroOnDinhSxkd(cs, { cach: "K2", thuNhapBinhQuanNam: "200000000", canCuSoLieu: "BCTC" }).thanhTien!.toString()).toBe("60000000");
    expect(hoTroOnDinhSxkd(cs, { cach: "K2_TAM_THOI", thuNhapBinhQuanNam: "200000000", canCuSoLieu: "BCTC" }).thanhTien!.toString()).toBe("30000000");
    expect(hoTroOnDinhSxkd(cs, { cach: "K3", doanhThuNam: "100000000", canCuSoLieu: "CV thuế" }).thanhTien!.toString()).toBe("2400000");
    expect(hoTroOnDinhSxkd(cs, { cach: "K3", doanhThuNam: "100000001", canCuSoLieu: "CV thuế" }).thanhTien!.toString()).toBe("4800000");
    expect(hoTroOnDinhSxkd(cs, { cach: "K3", doanhThuNam: "1", canCuSoLieu: "" }).trangThai).toBe("THIEU_CAN_CU");
  });
});
