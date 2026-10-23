import { describe, expect, it } from "vitest";
import { hanSoTayCuongChe, kiemCuongChe, ngaySomNhatQdKiemDem, ngayQdKiemDem, type CuongChe } from "../src/cuong-che";
import { hanBuocChung } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import type { Ho } from "../src/mo-hinh";

const ho = (p: Partial<Ho> = {}): Ho => ({ id: "h1", duAnId: "d1", ma: "H01", loai: "HO_GIA_DINH", ten: "Hộ mẫu", diaChi: "", soDinhDanh: "", dienThoai: "", nhanKhau: [], thua: [], taiSan: [], hoTro: {} as Ho["hoTro"], khauTru: "0", tienDo: {}, nhatKy: [], ...p });
const cc = (p: Partial<CuongChe>): CuongChe => ({ id: "c1", loai: "KIEM_DEM", ...p });

describe("1.2.0 (B1) — bước chung 2, 3 theo Mục V Phần II Sổ tay QĐ 1966", () => {
  it("bước 2: họp ≤ 03 ngày từ ngày phê duyệt kế hoạch; bước 3: thông báo ≤ 02 ngày từ ngày nhận tờ trình (trống = ngày T2)", () => {
    const duAn = { tienDoChung: { "1": { trangThai: "XONG" as const, ngay: "2026-10-05" } }, vanBan: { tt_tb_thu_hoi_ngay: "07/10/2026" } };
    const ds = hanBuocChung(duAn, "2026-10-09", LICH_TRONG);
    expect(ds.find((x) => x.t.han.buoc === "2")!.t).toMatchObject({ moc: "2026-10-05", hanChot: "2026-10-08", trangThai: "QUA_HAN" });
    expect(ds.find((x) => x.t.han.buoc === "3")!.t).toMatchObject({ moc: "2026-10-07", hanChot: "2026-10-09", trangThai: "SAP_HET" });
    // ngày ghi ở bước chung 3 được ưu tiên hơn ngày T2
    const ds2 = hanBuocChung({ ...duAn, tienDoChung: { ...duAn.tienDoChung, "3": { trangThai: "DANG" as const, mocHan: "2026-10-08" } } }, "2026-10-09", LICH_TRONG);
    expect(ds2.find((x) => x.t.han.buoc === "3")!.t.hanChot).toBe("2026-10-12"); // 10/10 thứ Bảy → thứ Hai
  });
  it("đợt có bước chung riêng được tính riêng; bước đã xong ghi nhận đúng/quá hạn", () => {
    const duAn = {
      tienDoChung: { "1": { trangThai: "XONG" as const, ngay: "2026-10-05" }, "2": { trangThai: "XONG" as const, ngay: "2026-10-07" } },
      dotThuHoi: [{ id: "d2", so: 2, ten: "", tienDoChung: { "1": { trangThai: "XONG" as const, ngay: "2026-10-12" }, "2": { trangThai: "XONG" as const, ngay: "2026-10-20" } } }],
    };
    const ds = hanBuocChung(duAn, "2026-10-20", LICH_TRONG);
    expect(ds.filter((x) => x.t.han.buoc === "2").map((x) => [x.ten, x.t.trangThai])).toEqual([["Cả dự án", "XONG_DUNG_HAN"], ["Đợt 2", "XONG_QUA_HAN"]]);
  });
});

describe("1.2.0 (B2) — vận động trước QĐ kiểm đếm bắt buộc (điểm đ k2 Đ87 LĐĐ)", () => {
  it("QĐ kiểm đếm chưa quá 10 ngày kể từ ngày kết thúc vận động → mức cao; lấy ngày QĐ theo Mẫu 06 đã ghi", () => {
    expect(ngaySomNhatQdKiemDem("2026-10-15", LICH_TRONG)).toBe("2026-10-27"); // 25/10 Chủ nhật → hạn 26/10, sớm nhất 27/10
    const h = ho({ vanBan: { qd_kiem_dem_ngay: "20/10/2026" } });
    const c = cc({ vdKdTu: "2026-10-01", vdKdDen: "2026-10-15" });
    expect(ngayQdKiemDem(c, h)).toBe("2026-10-20");
    const k = hanSoTayCuongChe(c, h, "2026-10-21", LICH_TRONG);
    expect(k.find((x) => x.muc === "CAO")!.noiDung).toContain("chưa quá 10 ngày");
    expect(k.some((x) => x.noiDung.includes("15 ngày"))).toBe(false); // 01–15/10 đủ 15 ngày
    const ngan = hanSoTayCuongChe(cc({ vdKdTu: "2026-10-05", vdKdDen: "2026-10-15" }), ho(), "2026-10-16", LICH_TRONG);
    expect(ngan.find((x) => x.noiDung.includes("ghi 11 ngày"))!.muc).toBe("THONG_TIN");
    expect(ngan.find((x) => x.noiDung.includes("sớm nhất 27/10/2026"))).toBeTruthy();
  });
  it("có QĐ kiểm đếm mà chưa ghi vận động trước → mức trung bình", () => {
    expect(hanSoTayCuongChe(cc({ ngayQdKd: "2026-10-20" }), ho(), "2026-10-21", LICH_TRONG)[0]!.muc).toBe("TRUNG_BINH");
  });
});

describe("1.2.0 (B3) — 03/02 ngày làm việc trình, ban hành; giao QĐ cưỡng chế; vận động 05 NLV sau giao", () => {
  it("quá hạn trình QĐ kiểm đếm bắt buộc (k2 Mục VII) → nhắc", () => {
    const k = hanSoTayCuongChe(cc({ deNghiKd: "2026-10-01" }), ho(), "2026-10-07", LICH_TRONG);
    const m = k.find((x) => x.canCu.startsWith("khoản 2 Mục VII"))!;
    expect(m).toMatchObject({ muc: "TRUNG_BINH", nhac: true });
    expect(m.noiDung).toContain("06/10/2026");
  });
  it("cưỡng chế thu hồi: trình 03, ban hành 02, giao 03 NLV (Mục XVII); ngày dự kiến trong 05 NLV vận động sau giao", () => {
    const c: CuongChe = { id: "c", loai: "THU_HOI", deNghiCc: "2026-10-01", trinhCc: "2026-10-05", ngayQd: "2026-10-09", ngayNhanQd: "2026-10-16", ngayDuKien: "2026-10-22" };
    const k = hanSoTayCuongChe(c, ho(), "2026-10-17", LICH_TRONG);
    expect(k.find((x) => x.noiDung.startsWith("Ban hành QĐ cưỡng chế ngày 09/10/2026"))!.noiDung).toContain("sau hạn 07/10/2026");
    expect(k.find((x) => x.noiDung.startsWith("Giao QĐ cưỡng chế"))!.noiDung).toContain("sau hạn 14/10/2026");
    expect(k.find((x) => x.canCu.startsWith("khoản 6 Mục XVII"))!.noiDung).toContain("đến 23/10/2026");
    // trình đúng hạn → không báo
    expect(k.some((x) => x.noiDung.startsWith("Trình"))).toBe(false);
  });
  it("kiemCuongChe gộp các hạn Sổ tay", () => {
    expect(kiemCuongChe(cc({ deNghiCc: "2026-10-01" }), ho(), "2026-10-02", LICH_TRONG).some((x) => x.canCu.startsWith("khoản 1 Mục VIII"))).toBe(true);
  });
});
