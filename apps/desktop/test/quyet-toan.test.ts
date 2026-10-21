import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { D } from "@gpmb/core";
import ExcelJS from "exceljs";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, pheDuyet } from "../src/phuong-an";
import type { GiaiDoanTyLe } from "../src/chi-tra";
import type { Ho } from "../src/mo-hinh";
import { quyetToanChiTra, tinhKinhPhi } from "../src/quyet-toan";
import { taoWorkbookQuyetToan } from "../src/xuat-excel";

const cs = cs0 as unknown as BoChinhSach;
// tỷ lệ GIẢ ĐỊNH chỉ để kiểm thử cách tính (không phải mức pháp lý)
const gd: GiaiDoanTyLe[] = [{ tuNgay: "2026-01-01", tyLe: "0.03", canCu: "giả định" }];

async function duLieu() {
  const { duAn, ho } = taoDuAnMau();
  const h1 = ho[0]!;
  const h2: Ho = { ...h1, id: "h2-qt", ma: "H99", ten: "Hộ thứ hai" };
  const p = pheDuyet(await chotPhuongAn(cs, duAn, [h1, h2], { ten: "B1", lyDo: "", nguoi: "x" }), { so: "1/QĐ", ngay: "2026-10-01", coQuan: "" }, "x");
  const phai = D(p.ho[0]!.conLai);
  const a: Ho = {
    ...h1,
    chiTra: {
      dot: [
        { id: "d1", ngay: "2026-10-10", soTien: "1000000", hinhThuc: "TIEN_MAT", chungTu: "PC1", nguoiGhi: "a" },
        { id: "d2", ngay: "2026-10-12", soTien: phai.minus(3000000).toFixed(), hinhThuc: "CHUYEN_KHOAN", chungTu: "UNC1", nguoiGhi: "a" },
        { id: "d3", ngay: "2026-10-20", soTien: "2000000", hinhThuc: "GUI_NGAN_HANG", chungTu: "GNH", nguoiGhi: "a", guiNH: { nganHang: "NH A" } },
        { id: "d4", ngay: "2026-10-21", soTien: "5000000", hinhThuc: "TIEN_MAT", chungTu: "PC sai", nguoiGhi: "a", huy: { luc: "x", nguoi: "a", lyDo: "nhầm" } },
      ],
    },
  };
  const b: Ho = { ...h2, chiTra: { dot: [{ id: "e1", ngay: "2026-10-05", soTien: "500000", hinhThuc: "GUI_NGAN_HANG", chungTu: "GNH2", nguoiGhi: "a", guiNH: { nganHang: "NH A", traLai: { ngay: "2026-10-25", tienLai: "1200", chungTu: "SK", nguoi: "a" } } }] } };
  const c: Ho = { ...h1, id: "h3", ma: "H98", chiTra: { dot: [{ id: "f1", ngay: "2026-10-05", soTien: "100", hinhThuc: "TIEN_MAT", chungTu: "x", nguoiGhi: "a" }] } };
  return { duAn: { ...duAn, phuongAn: [p] }, hos: [a, b, c], p, phai, phai2: D(p.ho[1]!.conLai) };
}

describe("Quyết toán chi trả theo bản phương án đã phê duyệt (1.0.20, B4)", () => {
  it("cộng theo hình thức chi; gửi ngân hàng chưa trả / đã trả; bỏ đợt đã hủy; hộ chưa duyệt có chi được đếm riêng", async () => {
    const { duAn, hos, phai, phai2 } = await duLieu();
    const qt = quyetToanChiTra(duAn, hos, gd, "2026-10-28");
    expect(qt.dong).toHaveLength(1);
    const d = qt.dong[0]!;
    expect(d.soHo).toBe(2);
    expect(d.phaiTra.toFixed()).toBe(phai.plus(phai2).toFixed());
    expect(d.tienMat.toFixed()).toBe("1000000");
    expect(d.guiNHChuaTra.toFixed()).toBe("2000000");
    expect(d.guiNHDaTra.toFixed()).toBe("500000");
    expect(d.tienLaiNH.toFixed()).toBe("1200");
    expect(d.daChi.toFixed()).toBe(phai.plus(500000).toFixed());
    expect(d.conPhaiChi.toFixed()).toBe(phai2.minus(500000).toFixed());
    expect(d.soHoChuaChiDu).toBe(1);
    expect(qt.hoChuaDuyetCoChi).toBe(1);
    expect(qt.tong.phaiTra.toFixed()).toBe(d.phaiTra.toFixed());
  });
});

describe("Kinh phí tổ chức thực hiện (1.0.20, B3 — k1 Đ94, k6 Đ89 LĐĐ 2024)", () => {
  it("tỷ lệ không có căn cứ → không tính mức tối đa; có căn cứ → mức = cơ sở × tỷ lệ", async () => {
    const { duAn, hos, phai, phai2 } = await duLieu();
    const k0 = tinhKinhPhi({ ...duAn, kinhPhi: { tyLe: "2", khoan: [], giaiNgan: [] } }, hos, gd, "2026-10-28");
    expect(k0.mucToiDa).toBeNull();
    expect(k0.canhBao[0]!.noiDung).toMatch(/chưa ghi căn cứ/);
    const k1 = tinhKinhPhi({ ...duAn, kinhPhi: { tyLe: "2", canCuTyLe: "Căn cứ giả định để kiểm thử", khoan: [], giaiNgan: [] } }, hos, gd, "2026-10-28");
    expect(k1.coSo.toFixed()).toBe(phai.plus(phai2).toFixed());
    expect(k1.mucToiDa!.toFixed()).toBe(phai.plus(phai2).times(2).div(100).toDecimalPlaces(0).toFixed());
    const k2 = tinhKinhPhi({ ...duAn, kinhPhi: { tyLe: "2", canCuTyLe: "x", coSo: "1000000000", khoan: [], giaiNgan: [] } }, hos, gd, "2026-10-28");
    expect(k2).toMatchObject({ coSoNhap: true });
    expect(k2.mucToiDa!.toFixed()).toBe("20000000");
  });
  it("dự toán vượt mức, giải ngân vượt dự toán, chưa có QĐ dự toán, thiếu khoản cưỡng chế", async () => {
    const { duAn, hos } = await duLieu();
    const kp = {
      tyLe: "1", canCuTyLe: "x", coSo: "100000000",
      khoan: [{ id: "k1", loai: "TO_CHUC" as const, noiDung: "Tổ chức", soTien: "1500000" }],
      giaiNgan: [{ id: "g1", ngay: "2026-10-01", soTien: "2000000", noiDung: "Chi", chungTu: "PC" }, { id: "g2", ngay: "2026-10-02", soTien: "9000000", noiDung: "Sai", chungTu: "PC", huy: { luc: "x", nguoi: "a", lyDo: "nhầm" } }],
    };
    const hosCc = [{ ...hos[0]!, cuongChe: [{ id: "c", loai: "THU_HOI" as const }] }, ...hos.slice(1)];
    const k = tinhKinhPhi({ ...duAn, kinhPhi: kp }, hosCc, gd, "2026-10-28");
    expect(k.daGiaiNgan.toFixed()).toBe("2000000");
    expect(k.conLai.toFixed()).toBe("-500000");
    const nd = k.canhBao.map((c) => c.noiDung).join("\n");
    expect(nd).toMatch(/vượt mức theo tỷ lệ 1%/);
    expect(nd).toMatch(/vượt tổng dự toán/);
    expect(nd).toMatch(/chưa ghi quyết định phê duyệt dự toán/);
    expect(k.canhBao.find((c) => /cưỡng chế/.test(c.noiDung))?.canCu).toBe("khoản 6, điểm b khoản 5 Điều 89 Luật Đất đai 2024; khoản 3 Điều 27 NĐ 88/2024/NĐ-CP");
    const ok = tinhKinhPhi({ ...duAn, kinhPhi: { ...kp, qdDuToan: { so: "5/QĐ", ngay: "2026-09-01" }, khoan: [...kp.khoan, { id: "k2", loai: "CUONG_CHE" as const, noiDung: "Cưỡng chế", soTien: "600000" }] } }, hosCc, gd, "2026-10-28");
    expect(ok.canhBao.map((c) => c.noiDung).join("\n")).not.toMatch(/quyết định phê duyệt dự toán|khoản kinh phí cưỡng chế|vượt tổng dự toán/);
  });
  it("Excel quyết toán: có trang theo dõi từng hộ, tổng hợp theo bản, kinh phí", async () => {
    const { duAn, hos, phai, phai2 } = await duLieu();
    const wb = await taoWorkbookQuyetToan({ ...duAn, kinhPhi: { khoan: [{ id: "k", loai: "TO_CHUC", noiDung: "Họp dân", soTien: "300000" }], giaiNgan: [] } }, hos, gd, "2026-10-28");
    const doc = new ExcelJS.Workbook();
    await doc.xlsx.load(await wb.xlsx.writeBuffer());
    expect(doc.worksheets.map((w) => w.name)).toEqual(["THEO DÕI CHI TRẢ", "QUYET TOAN CHI TRA", "KINH PHI TCTH"]);
    const qt = doc.getWorksheet("QUYET TOAN CHI TRA")!;
    expect(qt.getRow(5).getCell(4).value).toBe(phai.plus(phai2).toNumber());
    expect(qt.getRow(6).getCell(2).value).toBe("Tổng cộng");
    const kp = doc.getWorksheet("KINH PHI TCTH")!;
    const chu = kp.getSheetValues().flat().filter((x) => typeof x === "string").join("|");
    expect(chu).toMatch(/Họp dân/);
    expect(chu).toMatch(/Thiếu căn cứ \/ chưa nhập tỷ lệ/);
  });
});
