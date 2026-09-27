import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { D } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, pheDuyet } from "../src/phuong-an";
import { tienChamTraKhoan, tinhChiTra, type GiaiDoanTyLe } from "../src/chi-tra";
import type { Ho } from "../src/mo-hinh";
import { canhBaoDuAn } from "../src/trang-thai";
import { tinhHo } from "../src/tinh-ho";
import { taoWorkbookChiTra } from "../src/xuat-excel";
import ExcelJS from "exceljs";

const cs = cs0 as unknown as BoChinhSach;
// tỷ lệ GIẢ ĐỊNH chỉ để kiểm thử cách tính (không phải mức pháp lý)
const gd: GiaiDoanTyLe[] = [{ tuNgay: "2026-01-01", tyLe: "0.03", canCu: "giả định A" }, { tuNgay: "2026-11-15", tyLe: "0.05", canCu: "giả định B" }];

async function hoDaDuyet() {
  const { duAn, ho } = taoDuAnMau();
  const p = pheDuyet(await chotPhuongAn(cs, duAn, [ho[0]!], { ten: "B1", lyDo: "", nguoi: "x" }), { so: "1/QĐ", ngay: "2026-10-01", coQuan: "" }, "x");
  return { h: ho[0]!, ds: [p], phaiTra: D(p.ho[0]!.conLai) };
}

describe("Chi trả, tiền chậm trả (k3, k4 Đ94 LĐĐ)", () => {
  it("chưa có bản duyệt: không tính", () => {
    const { ho } = taoDuAnMau();
    expect(tinhChiTra(ho[0]!, [], gd, "2026-12-01").trangThai).toBe("CHUA_DUYET");
  });

  it("hạn 30 ngày từ ngày hiệu lực; chi đủ trong hạn: không chậm", async () => {
    const { h, ds, phaiTra } = await hoDaDuyet();
    const x: Ho = { ...h, chiTra: { dot: [{ id: "d1", ngay: "2026-10-31", soTien: phaiTra.toFixed(), hinhThuc: "CHUYEN_KHOAN", chungTu: "UNC 1", nguoiGhi: "a" }] } };
    const r = tinhChiTra(x, ds, gd, "2026-12-01");
    expect(r).toMatchObject({ hanChi: "2026-10-31", trangThai: "DA_CHI_DU", chamTra: [] });
    expect(r.tienChamTra!.toNumber()).toBe(0);
  });

  it("chi sau hạn: tính theo số ngày chậm × tỷ lệ; khoản chưa chi tạm tính đến hôm nay; qua 2 giai đoạn tỷ lệ", async () => {
    const { h, ds, phaiTra } = await hoDaDuyet();
    const mot = D(100_000_000);
    const x: Ho = { ...h, chiTra: { dot: [{ id: "d1", ngay: "2026-11-10", soTien: mot.toFixed(), hinhThuc: "TIEN_MAT", chungTu: "PC 1", nguoiGhi: "a" }], nguyenNhanCham: "DO_CO_QUAN" } };
    const r = tinhChiTra(x, ds, gd, "2026-11-20");
    // khoản 1: 10 ngày (01/11–10/11) × 0,03% × 100 triệu = 300.000
    expect(r.chamTra[0]).toMatchObject({ soNgay: 10 });
    expect(r.chamTra[0]!.tien!.toNumber()).toBe(300_000);
    // khoản còn lại: 01/11–20/11 = 20 ngày: 14 ngày × 0,03% + 6 ngày × 0,05%
    const con = phaiTra.minus(mot);
    expect(r.chamTra[1]!.soNgay).toBe(20);
    expect(r.chamTra[1]!.tien!.toFixed()).toBe(con.times(0.0003 * 14 + 0.0005 * 6).toDecimalPlaces(0).toFixed());
    expect(r.trangThai).toBe("CHI_MOT_PHAN");
  });

  it("thiếu tỷ lệ → thiếu căn cứ; chưa xác nhận nguyên nhân → cảnh báo; do người dân → 0", async () => {
    const { h, ds } = await hoDaDuyet();
    const r = tinhChiTra(h, ds, [], "2026-11-05");
    expect(r.tienChamTra).toBeNull();
    expect(r.canhBao.join(" ")).toMatch(/Thiếu tỷ lệ/);
    expect(r.canhBao.join(" ")).toMatch(/xác nhận nguyên nhân/);
    const r2 = tinhChiTra({ ...h, chiTra: { dot: [], nguyenNhanCham: "DO_NGUOI_DAN" } }, ds, gd, "2026-11-05");
    expect(r2.tienChamTra!.toNumber()).toBe(0);
    expect(tienChamTraKhoan(D(1000), "2026-10-31", "2026-10-31", []).tien!.toNumber()).toBe(0);
  });

  it("chi vượt số duyệt: cảnh báo", async () => {
    const { h, ds, phaiTra } = await hoDaDuyet();
    const r = tinhChiTra({ ...h, chiTra: { dot: [{ id: "d", ngay: "2026-10-05", soTien: phaiTra.plus(1000).toFixed(), hinhThuc: "TIEN_MAT", chungTu: "", nguoiGhi: "" }] } }, ds, gd, "2026-10-06");
    expect(r.trangThai).toBe("CHI_VUOT");
  });

  it("cảnh báo quá hạn chi trả kèm tiền chậm trả tạm tính", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = pheDuyet(await chotPhuongAn(cs, duAn, [ho[0]!], { ten: "B1", lyDo: "", nguoi: "x" }), { so: "1/QĐ", ngay: "2026-10-01", coQuan: "" }, "x");
    const da = { ...duAn, phuongAn: [p] };
    const cb = canhBaoDuAn(da, [{ h: ho[0]!, k: tinhHo(cs, da, ho[0]!) }], "2026-11-05", undefined, gd);
    const c = cb.find((x) => x.noiDung.includes("quá hạn chi trả"))!;
    expect(c.muc).toBe("CAO");
    expect(c.noiDung).toContain("31/10/2026");
    expect(c.canCu).toContain("Điều 94");
  });

  it("bảng Excel theo dõi chi trả: phải trả, đã chi, tiền chậm trả", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = pheDuyet(await chotPhuongAn(cs, duAn, [ho[0]!], { ten: "B1", lyDo: "", nguoi: "x" }), { so: "1/QĐ", ngay: "2026-10-01", coQuan: "" }, "x");
    const h: Ho = { ...ho[0]!, chiTra: { dot: [{ id: "d", ngay: "2026-11-10", soTien: "100000000", hinhThuc: "TIEN_MAT", chungTu: "PC1", nguoiGhi: "" }], nguyenNhanCham: "DO_CO_QUAN" } };
    const wb = await taoWorkbookChiTra({ ...duAn, phuongAn: [p] }, [h, ho[1]!], gd, "2026-11-10");
    const doc = new ExcelJS.Workbook();
    await doc.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const ws = doc.worksheets[0]!;
    const hang = ws.getRow(5).values as unknown[];
    expect(hang[2]).toBe(h.ma);
    expect(hang[7]).toBe(Number(p.ho[0]!.conLai));
    expect(hang[8]).toBe(100_000_000);
    expect(hang[11]).toBe(10);
    expect(hang[13]).toBe("Do cơ quan thực hiện BT");
    expect(ws.getRow(6).getCell(3).value).toBe("Tổng cộng"); // hộ 02 chưa có trong bản duyệt → không liệt kê
  });
});
