import { describe, expect, it } from "vitest";
import { hanDon, soNgayGiaiQuyet, soNgayThuLy, thongKeDon, type DonKhieuNai } from "../src/khieu-nai";
import { hanBanGiaoSauChapHanh, hanThiHanh, kiemCuongChe, nghiTet, ngaySomNhatQdThuHoi, trongKhoangTet, type CuongChe } from "../src/cuong-che";
import { LICH_TRONG, hanChotNgay, type LichLamViec } from "../src/lich-lam-viec";
import type { Ho } from "../src/mo-hinh";

const ho = (p: Partial<Ho> = {}): Ho => ({ id: "h1", duAnId: "d1", ma: "H01", loai: "HO_GIA_DINH", ten: "Hộ mẫu", diaChi: "", soDinhDanh: "", dienThoai: "", nhanKhau: [], thua: [], taiSan: [], hoTro: {} as Ho["hoTro"], khauTru: "0", tienDo: {}, nhatKy: [], ...p });
const don = (p: Partial<DonKhieuNai>): DonKhieuNai => ({ id: "k1", loai: "KHIEU_NAI", lan: 1, ngayNhan: "2026-10-01", noiDung: "Không đồng ý giá bồi thường", ...p });

describe("Khiếu nại — Điều 27, 28, 36, 37 Luật Khiếu nại 2011 (1.0.20, B1)", () => {
  it("bảng số ngày giải quyết lần đầu / lần hai, phức tạp, vùng sâu vùng xa", () => {
    expect([soNgayGiaiQuyet(1, false, false), soNgayGiaiQuyet(1, true, false), soNgayGiaiQuyet(1, false, true), soNgayGiaiQuyet(1, true, true)]).toEqual([30, 45, 45, 60]);
    expect([soNgayGiaiQuyet(2, false, false), soNgayGiaiQuyet(2, true, false), soNgayGiaiQuyet(2, false, true), soNgayGiaiQuyet(2, true, true)]).toEqual([45, 60, 60, 70]);
  });
  it("chưa thụ lý: từ 01/7/2026 hạn 07 ngày làm việc (k1 Đ16 NĐ 124/2020 sửa bởi Điều 10 NĐ 155/2026)", () => {
    const t = hanDon(don({}), "2026-10-05", LICH_TRONG);
    expect(t).toMatchObject({ tt: "CHO_THU_LY", han: "2026-10-12", soNgay: 7 });
    expect(t.canCu).toBe("k1 Điều 16 NĐ 124/2020/NĐ-CP (sửa bởi Điều 10 NĐ 155/2026/NĐ-CP); Điều 27 Luật Khiếu nại (sửa bởi Luật 136/2025/QH15)");
    expect(hanDon(don({}), "2026-10-13", LICH_TRONG).tt).toBe("QUA_HAN_THU_LY");
    expect(hanDon(don({ lan: 2 }), "2026-10-05", LICH_TRONG).canCu).toMatch(/khoản 1 Điều 36 Luật Khiếu nại \(sửa bởi Luật 136\/2025\/QH15\)$/);
  });
  it("chưa thụ lý: đơn nhận trước 01/7/2026 hạn 10 ngày làm việc (k1 Đ16 NĐ 124/2020), bỏ qua thứ Bảy, Chủ nhật", () => {
    const t = hanDon(don({ ngayNhan: "2026-06-01" }), "2026-06-02", LICH_TRONG);
    expect(t).toMatchObject({ tt: "CHO_THU_LY", han: "2026-06-15", soNgay: 10, canCu: "k1 Điều 16 NĐ 124/2020/NĐ-CP; Điều 27 Luật Khiếu nại 2011" });
    expect(soNgayThuLy("2026-06-30")).toBe(10);
    expect(soNgayThuLy("2026-07-01")).toBe(7);
  });
  it("đã thụ lý: hạn giải quyết tính từ ngày thụ lý; sắp hết (≤ 5 ngày), quá hạn, đã giải quyết", () => {
    const d = don({ ngayThuLy: "2026-10-05" });
    expect(hanDon(d, "2026-10-10", LICH_TRONG)).toMatchObject({ tt: "DANG_GIAI_QUYET", han: "2026-11-04", soNgay: 30, canCu: "Điều 28 Luật Khiếu nại 2011" });
    expect(hanDon(d, "2026-11-01", LICH_TRONG).tt).toBe("SAP_HET");
    expect(hanDon(d, "2026-11-05", LICH_TRONG)).toMatchObject({ tt: "QUA_HAN", conLai: -1 });
    expect(hanDon({ ...d, phucTap: true, vungKhoKhan: true }, "2026-11-05", LICH_TRONG)).toMatchObject({ tt: "DANG_GIAI_QUYET", han: "2026-12-04", soNgay: 60 });
    expect(hanDon({ ...d, lan: 2, phucTap: true, vungKhoKhan: true }, "2026-11-05", LICH_TRONG)).toMatchObject({ han: "2026-12-14", soNgay: 70, canCu: "Điều 37 Luật Khiếu nại 2011" });
    expect(hanDon({ ...d, ketQua: "SAI" }, "2027-01-01", LICH_TRONG).tt).toBe("DA_GIAI_QUYET");
  });
  it("kiến nghị: không có hạn luật định — chỉ tính khi đơn vị nhập số ngày kèm căn cứ", () => {
    const k = don({ loai: "KIEN_NGHI", lan: undefined });
    expect(hanDon(k, "2027-01-01", LICH_TRONG).tt).toBe("KHONG_TINH_HAN");
    expect(hanDon({ ...k, hanNhap: { soNgay: 15, canCu: "" } }, "2027-01-01", LICH_TRONG).tt).toBe("KHONG_TINH_HAN");
    expect(hanDon({ ...k, hanNhap: { soNgay: 15, canCu: "Quy chế tiếp công dân của UBND xã" } }, "2026-10-10", LICH_TRONG)).toMatchObject({ han: "2026-10-16", canCu: "Quy chế tiếp công dân của UBND xã" });
  });
  it("thống kê đơn theo dự án", () => {
    const hos = [ho({ khieuNai: [don({ ngayThuLy: "2026-10-05" }), don({ id: "k2", ketQua: "DUNG" })] }), ho({ id: "h2" })];
    expect(thongKeDon(hos, "2026-11-10", LICH_TRONG)).toEqual({ tong: 2, dangGiaiQuyet: 1, quaHan: 1, daGiaiQuyet: 1, soHo: 1 });
  });
});

describe("Cưỡng chế — Điều 88, 89, điểm b k7 Điều 87 LĐĐ 2024 (1.0.20, B2)", () => {
  it("hạn theo ngày, ngày cuối là ngày nghỉ thì sang ngày làm việc", () => {
    expect(hanChotNgay("2026-10-01", 10, LICH_TRONG)).toBe("2026-10-12");
    expect(hanChotNgay("2026-10-02", 10, LICH_TRONG)).toBe("2026-10-12");
    expect(hanChotNgay("2026-10-05", 10, LICH_TRONG)).toBe("2026-10-15");
  });
  it("QĐ cưỡng chế thu hồi sớm nhất: quá 10 ngày kể từ ngày kết thúc vận động", () => {
    expect(ngaySomNhatQdThuHoi("2026-10-05", LICH_TRONG)).toBe("2026-10-16");
    const h = ho({ tienDo: { "13": { trangThai: "XONG", ngay: "2026-09-01" } as Ho["tienDo"][string] } });
    const c: CuongChe = { id: "c", loai: "THU_HOI", vanDongTu: "2026-09-25", vanDongDen: "2026-10-05", vbVanDong: "BB 01", ngayQd: "2026-10-15", soQd: "12/QĐ-UBND", qdBan: "13/QĐ-UBND" };
    expect(kiemCuongChe(c, h, "2026-10-20", LICH_TRONG).some((k) => k.muc === "CAO" && /chưa quá 10 ngày/.test(k.noiDung))).toBe(true);
    expect(kiemCuongChe({ ...c, ngayQd: "2026-10-16" }, h, "2026-10-20", LICH_TRONG).some((k) => /chưa quá 10 ngày/.test(k.noiDung))).toBe(false);
  });
  it("thiếu QĐ thu hồi đất của hộ → mức cao; thiếu niêm yết, hiệu lực, nhận QĐ → nhắc", () => {
    const c: CuongChe = { id: "c", loai: "THU_HOI", soQd: "12/QĐ-UBND", ngayQd: "2026-10-16" };
    const ds = kiemCuongChe(c, ho(), "2026-10-20", LICH_TRONG);
    expect(ds.find((k) => /bước 13/.test(k.noiDung))?.canCu).toBe("điểm a khoản 2 Điều 89 Luật Đất đai 2024");
    expect(ds.map((k) => k.canCu)).toEqual(expect.arrayContaining(["điểm b khoản 2 Điều 89 Luật Đất đai 2024", "điểm c khoản 2 Điều 89 Luật Đất đai 2024", "điểm d khoản 2 Điều 89 Luật Đất đai 2024", "điểm a khoản 4 Điều 89 Luật Đất đai 2024"]));
    const kd = kiemCuongChe({ id: "k", loai: "KIEM_DEM", soQd: "1", ngayQd: "2026-10-16" }, ho(), "2026-10-20", LICH_TRONG);
    expect(kd.some((k) => /truyền thanh/.test(k.noiDung) && k.canCu === "điểm b khoản 2 Điều 88 Luật Đất đai 2024")).toBe(true);
    expect(kd.some((k) => /bước 13/.test(k.noiDung))).toBe(false);
  });
  it("hạn thi hành 10 ngày (hoặc dài hơn theo QĐ); ngày dự kiến ngày nghỉ, sau hạn; bàn giao 30 ngày sau chấp hành", () => {
    const c: CuongChe = { id: "c", loai: "THU_HOI", ngayNhanQd: "2026-10-05" };
    expect(hanThiHanh(c, LICH_TRONG)).toBe("2026-10-15");
    expect(hanThiHanh({ ...c, hanThiHanhNgay: 20 }, LICH_TRONG)).toBe("2026-10-26"); // 25/10 Chủ nhật
    const h = ho();
    expect(kiemCuongChe(c, h, "2026-10-16", LICH_TRONG).some((k) => /Quá hạn thi hành/.test(k.noiDung))).toBe(true);
    const dk = kiemCuongChe({ ...c, ngayDuKien: "2026-10-17" }, h, "2026-10-10", LICH_TRONG);
    expect(dk.some((k) => /ngày nghỉ/.test(k.noiDung))).toBe(true);
    expect(dk.some((k) => /sau hạn thi hành/.test(k.noiDung))).toBe(true);
    const ch = { ...c, ketQua: "CHAP_HANH" as const, ngayKetQua: "2026-10-12" };
    expect(hanBanGiaoSauChapHanh(ch, LICH_TRONG)).toBe("2026-11-11");
    expect(kiemCuongChe(ch, h, "2026-11-12", LICH_TRONG).some((k) => /30 ngày chưa bàn giao/.test(k.noiDung))).toBe(true);
    expect(kiemCuongChe(ch, ho({ banGiao: { ngay: "2026-11-01" } as Ho["banGiao"] }), "2026-11-12", LICH_TRONG).some((k) => /chưa bàn giao/.test(k.noiDung))).toBe(false);
  });
  it("khoảng 15 ngày trước và sau thời gian nghỉ Tết Âm lịch (điểm b k1 Đ89)", () => {
    // Tết Đinh Mùi: mùng 1 = 06/02/2027 (thứ Bảy). Lịch chưa nhập → khoảng nghỉ là thứ Bảy, Chủ nhật quanh mùng 1.
    expect(nghiTet(2027, LICH_TRONG)).toEqual({ tu: "2027-02-06", den: "2027-02-07", thieuLich: true });
    expect(trongKhoangTet("2027-01-22", LICH_TRONG)).not.toBeNull();
    expect(trongKhoangTet("2027-01-21", LICH_TRONG)).toBeNull();
    expect(trongKhoangTet("2027-02-22", LICH_TRONG)).not.toBeNull();
    expect(trongKhoangTet("2027-02-23", LICH_TRONG)).toBeNull();
    const lich: LichLamViec = { nghi: ["2027-02-04", "2027-02-05", "2027-02-08", "2027-02-09", "2027-02-10"].map((ngay) => ({ ngay, ten: "Tết" })), lamBu: [], namDaDu: [2027] };
    expect(nghiTet(2027, lich)).toEqual({ tu: "2027-02-04", den: "2027-02-10", thieuLich: false });
    expect(trongKhoangTet("2027-01-20", lich)).not.toBeNull();
    expect(trongKhoangTet("2027-02-25", lich)).not.toBeNull();
    expect(trongKhoangTet("2027-02-26", lich)).toBeNull();
    // Tết Mậu Thân: mùng 1 = 26/01/2028 (thứ Tư, lịch chưa nhập → chỉ mùng 1) → từ 11/01 đến 10/02/2028
    expect(trongKhoangTet("2028-01-11", LICH_TRONG)).toEqual({ tu: "2028-01-26", den: "2028-01-26", thieuLich: true });
    expect(trongKhoangTet("2028-01-10", LICH_TRONG)).toBeNull();
    expect(trongKhoangTet("2028-02-11", LICH_TRONG)).toBeNull();
    const c: CuongChe = { id: "c", loai: "THU_HOI", ngayDuKien: "2027-02-15" };
    expect(kiemCuongChe(c, ho(), "2027-01-01", lich).some((k) => /nghỉ Tết Âm lịch/.test(k.noiDung) && k.canCu === "điểm b khoản 1 Điều 89 Luật Đất đai 2024")).toBe(true);
  });
});
