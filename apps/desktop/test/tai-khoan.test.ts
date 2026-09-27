import { describe, expect, it } from "vitest";
import { coQuyen, dungMatKhau, kiemTraDuyetBuoc, kiemTraMatKhau, kiemTraThayDoi, LoiTaiKhoan, QUYEN_THEO_VAI_TRO, taoTaiKhoan } from "../src/tai-khoan";
import { kiemTraChuoi } from "../src/nhat-ky";
import { taoKhoBoNho } from "../src/kho";

const V = 1000; // số vòng thấp cho kiểm thử; phần mềm dùng 210.000
const vao = (ten: string, vaiTro: "QUAN_TRI" | "LANH_DAO" | "CAN_BO" | "XEM" = "CAN_BO") => ({ ten, hoTen: `Người ${ten}`, chucVu: "", vaiTro, matKhau: "matkhau123" });

describe("Tài khoản, quyền", () => {
  it("băm mật khẩu có muối; đúng/sai mật khẩu; không lưu mật khẩu", async () => {
    const u = await taoTaiKhoan([], vao("canbo1"), V);
    expect(JSON.stringify(u)).not.toContain("matkhau123");
    expect(await dungMatKhau(u, "matkhau123")).toBe(true);
    expect(await dungMatKhau(u, "matkhau124")).toBe(false);
    const u2 = await taoTaiKhoan([], vao("canbo2"), V);
    expect(u2.bam).not.toBe(u.bam);
  });

  it("kiểm tra tên đăng nhập, mật khẩu, trùng tên", async () => {
    await expect(taoTaiKhoan([], { ...vao("Cán Bộ"), ten: "Cán Bộ" }, V)).rejects.toThrow(LoiTaiKhoan);
    expect(kiemTraMatKhau("abc12")).toContain("8 ký tự");
    expect(kiemTraMatKhau("abcdefgh")).toContain("chữ và số");
    expect(kiemTraMatKhau("canbo1xx9", "canbo1")).toContain("tên đăng nhập");
    const u = await taoTaiKhoan([], vao("canbo1"), V);
    await expect(taoTaiKhoan([u], vao("CANBO1"), V)).rejects.toThrow(/đã có/);
  });

  it("ma trận quyền: chỉ xem không sửa; cán bộ không chốt, không duyệt; lãnh đạo không quản lý tài khoản", () => {
    expect(QUYEN_THEO_VAI_TRO.XEM).toEqual([]);
    expect(coQuyen("CAN_BO", "SUA_HO_SO")).toBe(true);
    expect(coQuyen("CAN_BO", "CHOT_PA")).toBe(false);
    expect(coQuyen("CAN_BO", "DUYET_BUOC")).toBe(false);
    expect(coQuyen("LANH_DAO", "PHE_DUYET_PA")).toBe(true);
    expect(coQuyen("LANH_DAO", "TAI_KHOAN")).toBe(false);
    expect(coQuyen("LANH_DAO", "KHOI_PHUC")).toBe(false);
    expect(coQuyen("QUAN_TRI", "KHOI_PHUC")).toBe(true);
    expect(coQuyen(null, "SUA_HO_SO")).toBe(false);
  });

  it("luôn còn một quản trị hoạt động; người gửi duyệt không tự xác nhận", async () => {
    const qt = await taoTaiKhoan([], vao("quantri", "QUAN_TRI"), V);
    const ld = await taoTaiKhoan([qt], vao("lanhdao", "LANH_DAO"), V);
    expect(kiemTraThayDoi([qt, ld], { ...qt, hoatDong: false })).toContain("Quản trị");
    expect(kiemTraThayDoi([qt, ld], { ...qt, vaiTro: "CAN_BO" })).toContain("Quản trị");
    expect(kiemTraThayDoi([qt, ld], { ...ld, hoatDong: false })).toBeNull();
    expect(kiemTraDuyetBuoc("CAN_BO", "canbo1", { trangThai: "CHO_DUYET", guiBoi: "x" })).toContain("không có quyền");
    expect(kiemTraDuyetBuoc("LANH_DAO", "lanhdao", { trangThai: "CHO_DUYET", guiBoi: "lanhdao" })).toContain("không tự xác nhận");
    expect(kiemTraDuyetBuoc("LANH_DAO", "lanhdao", { trangThai: "CHO_DUYET", guiBoi: "canbo1" })).toBeNull();
  });
});

describe("Nhật ký hệ thống (chuỗi băm)", () => {
  it("ghi nối tiếp; phát hiện sửa, xóa dòng giữa", async () => {
    const kho = taoKhoBoNho();
    for (let i = 1; i <= 4; i++) await kho.ghiNhatKy({ nguoi: "qt", hoTen: "QT", hanhDong: `Việc ${i}` });
    const ds = await kho.dsNhatKy();
    expect(ds.map((d) => d.stt)).toEqual([1, 2, 3, 4]);
    expect(await kiemTraChuoi(ds)).toBeNull();
    expect(await kiemTraChuoi(ds.map((d) => (d.stt === 2 ? { ...d, hanhDong: "Sửa" } : d)))).toMatchObject({ stt: 2, lyDo: "nội dung đã bị sửa" });
    expect(await kiemTraChuoi(ds.filter((d) => d.stt !== 3))).toMatchObject({ stt: 4 });
  });
});
