import { describe, expect, it } from "vitest";
import goc from "../../../policy/goi/sonla-2026-03-31.json";
import { BANG_GIA_GOI, BO_CHINH_SACH, DON_GIA, donGiaTheoBo, napBangGiaDatTheoBo } from "../src/du-lieu";
import { DINH_DANG_GOI, dangKyGoi, docGoi, coBoChinhSach } from "../src/goi-chinh-sach";
import { tinhHoMoi } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { BoChinhSach } from "@gpmb/core";

const moi = () => structuredClone(goc) as unknown as Record<string, unknown> & { tamCu: { congThemMoiKhau: string } };

describe("Gói chính sách nạp được (P2-1, chưa ký số)", () => {
  it("gói đúng cấu trúc: có khóa, SHA-256, danh sách mục khác bộ có sẵn", async () => {
    const c = moi();
    c.ma = "SONLA-THU-2027";
    c.tamCu.congThemMoiKhau = "600000";
    const r = await docGoi(JSON.stringify({ dinhDang: DINH_DANG_GOI, khoa: "sonla-thu-2027", chinhSach: c }), Object.keys(BO_CHINH_SACH));
    expect(r.loi).toEqual([]);
    expect(r.goi!.khoa).toBe("sonla-thu-2027");
    expect(r.goi!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.mucKhac).toEqual(expect.arrayContaining(["ma", "tamCu"]));
  });
  it("từ chối: không phải JSON, thiếu mục, sai kiểu, trùng khóa đang có, ngày hiệu lực sai", async () => {
    expect((await docGoi("{", [])).loi[0]).toMatch(/JSON/);
    const thieu = moi();
    delete (thieu as Record<string, unknown>).tamCu;
    expect((await docGoi(JSON.stringify({ ...thieu, ma: "X-1" }), [])).loi.join()).toMatch(/Thiếu mục "tamCu"/);
    const sai = moi();
    (sai as Record<string, unknown>).giaDat = [];
    expect((await docGoi(JSON.stringify({ ...sai, ma: "X-2" }), [])).loi.join()).toMatch(/giaDat.*sai kiểu/);
    expect((await docGoi(JSON.stringify(goc), ["sonla-bthttdc-2026-03-31"])).loi.join()).toMatch(/Đã có bộ chính sách/);
    expect((await docGoi(JSON.stringify({ ...moi(), ma: "X-3", hieuLucTu: "31/3/2027" }), [])).loi.join()).toMatch(/hieuLucTu/);
  });
  it("đăng ký gói: dự án dùng khóa gói tính theo gói; bộ có sẵn không bị thay", async () => {
    const c = moi();
    c.ma = "SONLA-THU-2028";
    c.tamCu.congThemMoiKhau = "900000";
    const r = await docGoi(JSON.stringify(c), Object.keys(BO_CHINH_SACH));
    dangKyGoi([{ khoa: r.goi!.khoa, ten: "Thử", ma: "SONLA-THU-2028", hieuLucTu: "2026-03-31", hieuLucDen: null, sha256: r.goi!.sha256, tenTep: "x.json", napLuc: "", napBoi: "", noiDung: r.goi!.noiDung }]);
    expect(coBoChinhSach("sonla-thu-2028")).toBe(true);
    dangKyGoi([{ khoa: "sonla-2026-03-31", ten: "Giả", ma: "X", hieuLucTu: "2026-01-01", hieuLucDen: null, sha256: "", tenTep: "", napLuc: "", napBoi: "", noiDung: "{}" }]);
    expect((BO_CHINH_SACH["sonla-2026-03-31"] as unknown as { ma: string }).ma).toBe((goc as { ma: string }).ma);
    // hộ có tạm cư 6 nhân khẩu: bộ mới cộng thêm mỗi khẩu nhiều hơn → tổng lớn hơn
    const { duAn, ho } = taoDuAnMau();
    const h = { ...ho[0]!, nhanKhau: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, hoTen: `N${i}`, quanHe: "" })), hoTro: { ...ho[0]!.hoTro, tamCu: { soThang: 6, tdcBangDat: false } } };
    const a = tinhHoMoi(BO_CHINH_SACH["sonla-2026-03-31"]!, duAn, h).tong.tongLamTron;
    const b = tinhHoMoi(BO_CHINH_SACH["sonla-thu-2028"] as BoChinhSach, { ...duAn, boChinhSach: "sonla-thu-2028" }, h).tong.tongLamTron;
    expect(b.gt(a)).toBe(true);
  });
  it("1.0.7 — gói kèm bảng đơn giá, bảng giá đất: kiểm tra, mã băm gồm cả bảng, dự án dùng bảng của gói", async () => {
    const c = moi();
    c.ma = "SONLA-THU-2029";
    const donGia = {
      canCu: "Quyết định số 99/2027/QĐ-UBND (thử)",
      dong: [
        { nguon: "PL VIII", ma: "B1/1", nhom: "Cây ăn quả", ten: "Cây thử A", donVi: "cây", donGia: 123000, matDo: 400 },
        { nguon: "PL VIII", nhom: "Cây ăn quả", ten: "Cây thử B", donVi: "đồng/cây", donGia: "45000" },
      ],
    };
    const bangGiaDat = { van_ban: "Nghị quyết số 77/2027/NQ-HĐND (thử)", danh_muc_xa: ["Xã A"], dat_nong_nghiep: [{ bang: "01", stt: 1, xa: "Xã A", loai_dat: "LUC", gia: 60 }], dat_o: [{ bang: "05", loai_dat: "ONT", xa: "Xã A", stt: "1", nhom: "", tuyen: "Tuyến 1", vt: [1000, 800, null, null], canh_bao: [] }], dat_tmdv: [], dat_skc: [], dat_kcn_ccn: [] };
    const r = await docGoi(JSON.stringify({ dinhDang: DINH_DANG_GOI, khoa: "sonla-thu-2029", chinhSach: c, donGia, bangGiaDat }), Object.keys(BO_CHINH_SACH));
    expect(r.loi).toEqual([]);
    expect(r.goi!.soDongDonGia).toBe(2);
    expect(r.goi!.vanBanGiaDat).toMatch(/77\/2027/);
    const chiCs = await docGoi(JSON.stringify({ dinhDang: DINH_DANG_GOI, khoa: "sonla-thu-2029", chinhSach: c }), Object.keys(BO_CHINH_SACH));
    expect(chiCs.goi!.sha256).not.toBe(r.goi!.sha256);
    dangKyGoi([{ khoa: "sonla-thu-2029", ten: "Thử", ma: c.ma as string, hieuLucTu: "2026-03-31", hieuLucDen: null, sha256: r.goi!.sha256, tenTep: "x.json", napLuc: "", napBoi: "", noiDung: r.goi!.noiDung, donGia: r.goi!.donGia, bangGiaDat: r.goi!.bangGiaDat }]);
    const dg = donGiaTheoBo("sonla-thu-2029");
    // nhóm PL VIII thay bằng bảng của gói; QĐ32, PL V giữ bảng có sẵn
    expect(dg.filter((x) => x.nguon === "PL VIII").map((x) => x.ten)).toEqual(["Cây thử A", "Cây thử B"]);
    expect(dg.filter((x) => x.nguon === "QĐ32").length).toBe(DON_GIA.filter((x) => x.nguon === "QĐ32").length);
    expect(dg.find((x) => x.ten === "Cây thử B")).toMatchObject({ donGia: 45000, donVi: "cây", canCu: donGia.canCu });
    expect(donGiaTheoBo("sonla-2026-03-31")).toBe(DON_GIA);
    expect((await napBangGiaDatTheoBo("sonla-thu-2029")).van_ban).toMatch(/77\/2027/);
    expect(BANG_GIA_GOI["sonla-2026-03-31"]).toBeUndefined();
  });
  it("1.0.7 — từ chối bảng kèm gói thiếu căn cứ, giá không hợp lệ, bảng giá đất thiếu mục", async () => {
    const c = { ...moi(), ma: "X-9" };
    const r = await docGoi(JSON.stringify({ dinhDang: DINH_DANG_GOI, khoa: "x-9", chinhSach: c, donGia: { dong: [{ nguon: "QĐ99", ten: "", donVi: "m2", donGia: 0 }] }, bangGiaDat: { van_ban: "", danh_muc_xa: [] } }), []);
    const l = r.loi.join(" | ");
    expect(l).toMatch(/thiếu văn bản căn cứ/);
    expect(l).toMatch(/Đơn giá dòng 1: nhóm "QĐ99".*thiếu tên.*không phải số dương/);
    expect(l).toMatch(/thiếu văn bản ban hành/);
    expect(l).toMatch(/thiếu mục "dat_o"/);
    expect(r.goi).toBeUndefined();
  });
});
