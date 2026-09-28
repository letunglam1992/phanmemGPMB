import { describe, expect, it } from "vitest";
import { khongDau, khopTuKhoa } from "../src/tim-kiem";
import { donViMoi, donViSuDung, kiemTraDonVi, truongVanBanTuDonVi } from "../src/don-vi";

const ho = { ma: "H02", ten: "Đoàn Thị Huyền Trang", diaChi: "Bản Tô Hiệu", soDinhDanh: "014190001234", thua: [{ soTo: "5", soThua: "85" }] };

describe("Tìm kiếm", () => {
  it("không phân biệt dấu, hoa thường; mọi từ phải khớp", () => {
    expect(khongDau("Đoàn Thị HUYỀN")).toBe("doan thi huyen");
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "doan trang")).toBe(true);
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "Huyền H02")).toBe(true);
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "doan nam")).toBe(false);
  });
  it("tìm theo tờ/thửa, địa chỉ, tên dự án; từ khóa rỗng khớp tất cả", () => {
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "5/85")).toBe(true);
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "tờ 5 thửa 85")).toBe(true);
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "5/86")).toBe(false);
    expect(khopTuKhoa({ h: ho, duAnTen: "Cụm công nghiệp Hoàng Văn Thụ" }, "hoang van thu")).toBe(true);
    expect(khopTuKhoa({ h: ho, duAnTen: "" }, "  ")).toBe(true);
  });
});

describe("Thiết lập đơn vị", () => {
  it("kiểm tra: tên bắt buộc, không trùng cùng loại, một đơn vị sử dụng", () => {
    const a = { ...donViMoi("UBND"), ten: "UBND xã Chiềng Mung", suDung: true };
    const b = { ...donViMoi("UBND"), ten: "ubnd XÃ Chiềng Mung" };
    const c = { ...donViMoi("PHONG"), ten: "" };
    const loi = kiemTraDonVi([a, b, c]);
    expect(loi.some((x) => x.includes("trùng"))).toBe(true);
    expect(loi.some((x) => x.includes("chưa nhập tên"))).toBe(true);
    expect(kiemTraDonVi([a, { ...b, ten: "UBND xã Chiềng Sinh", suDung: true }]).some((x) => x.includes("một đơn vị"))).toBe(true);
    expect(donViSuDung([b, a])?.ten).toBe("UBND xã Chiềng Mung");
  });
  it("điền trường văn bản: đơn vị bồi thường, phòng, người ký UBND; trường trống không ghi đè", () => {
    const bt = { ...donViMoi("DON_VI_BT"), ten: "Ban Quản lý dự án đầu tư xây dựng tỉnh", capTren: "Ủy ban nhân dân tỉnh Sơn La", kyHieu: "BQLDA", nguoiKy: "" };
    const ph = { ...donViMoi("PHONG"), ten: "Phòng Kinh tế", kyHieu: "KT", nguoiKy: "Nguyễn Văn A" };
    const ub = { ...donViMoi("UBND"), ten: "UBND xã", quyenHan: "KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH", nguoiKy: "Lò Văn B" };
    const t = truongVanBanTuDonVi([bt, ph, ub]);
    expect(t).toMatchObject({ ten_don_vi_bt: "Ban Quản lý dự án đầu tư xây dựng tỉnh", co_quan_cap_tren_bt: "ỦY BAN NHÂN DÂN TỈNH SƠN LA", ky_hieu_don_vi: "BQLDA", ten_phong: "Phòng Kinh tế", ky_hieu_phong: "KT", nguoi_ky_phong: "Nguyễn Văn A", quyen_han: "KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH", nguoi_ky: "Lò Văn B" });
    expect("nguoi_ky_don_vi" in t).toBe(false);
  });
});
