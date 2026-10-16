import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, ghiThamDinh, pheDuyet } from "../src/phuong-an";
import { tinhHo } from "../src/tinh-ho";
import { tienDoThuTuc } from "../src/tien-do-thu-tuc";
import { hanThuHoiNhom, nhomThuHoi } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { canhBaoDuAn } from "../src/trang-thai";
import { tomTatDuAn } from "../src/tong-hop-tinh/goi-tinh";
import { duLieuBaoCaoTinh, type DongBaoCao } from "../src/tong-hop-tinh/bao-cao-tinh";
import { taoExcelTinh } from "../src/tong-hop-tinh/excel-tinh";
import { dienMau } from "../src/van-ban/dien-mau";
import type { DuAn, Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA 1", lyDo: "", nguoi: "A", luc: "2026-09-01T08:00:00.000Z" };
const moc = (h: Ho, buoc: string, ngay: string, xong?: string): Ho => ({ ...h, tienDo: { ...h.tienDo, [buoc]: { trangThai: xong ? "XONG" : "CHUA", ...(xong ? { ngay: xong } : {}), mocHan: ngay } } });

describe("1.0.16 — chi trả, bàn giao trong tiến độ thủ tục; hạn QĐ thu hồi cả dự án; khâu quá hạn trong báo cáo tỉnh", () => {
  it("tiến độ thủ tục: khâu chi trả (30 ngày từ QĐ có hiệu lực, chậm tính theo ngày) và số hộ đã bàn giao", async () => {
    const { duAn, ho: ho0 } = taoDuAnMau();
    const ho = [ho0[0]!, { ...ho0[0]!, id: `${ho0[0]!.id}-2`, ma: "H99" }];
    const p0 = await chotPhuongAn(cs, duAn, ho, O);
    const p = pheDuyet(ghiThamDinh(p0, { so: "1", ngay: "2026-10-16", coQuan: "PKT", yKien: "THONG_NHAT" }, "B"), { so: "5/QĐ", ngay: "2026-10-26", coQuan: "UBND" }, "L");
    const da: DuAn = { ...duAn, phuongAn: [p] };
    const tra = (h: Ho, ngay: string): Ho => ({ ...h, chiTra: { dot: [{ id: `c-${h.id}`, ngay, soTien: p.ho.find((x) => x.hoId === h.id)!.conLai, hinhThuc: "CHUYEN_KHOAN", chungTu: "UNC", nguoiGhi: "a" }] } });
    // hộ 1 chi đủ đúng hạn, hộ 2 chưa chi → đang chậm
    let hos = [{ ...tra(ho[0]!, "2026-11-20"), banGiao: { ngay: "2026-11-22" } } as Ho, ho[1]!];
    let [d] = tienDoThuTuc(da, hos, "2026-11-30", LICH_TRONG);
    expect(d!.chiTra).toMatchObject({ moc: "2026-10-26", han: "2026-11-25", xong: null, cham: 5, dangCham: true, daChiDu: 1, soHo: 2 });
    expect(d!.banGiao).toEqual({ da: 1, soHo: 2, xong: null });
    // hộ 2 chi đủ ngày 01/12 → xong ngày chi cuối, chậm 6 ngày
    hos = [hos[0]!, { ...tra(ho[1]!, "2026-12-01"), banGiao: { ngay: "2026-12-03" } } as Ho];
    [d] = tienDoThuTuc(da, hos, "2026-12-10", LICH_TRONG);
    expect(d!.chiTra).toMatchObject({ xong: "2026-12-01", cham: 6, dangCham: false, daChiDu: 2 });
    expect(d!.banGiao).toEqual({ da: 2, soHo: 2, xong: "2026-12-03" });
    // bản chưa phê duyệt: không có khâu chi trả
    const [d2] = tienDoThuTuc({ ...duAn, phuongAn: [p0] }, hos, "2026-12-10", LICH_TRONG);
    expect(d2!.chiTra).toMatchObject({ han: null, soHo: 0 });
  });

  it("dự án không chia đợt: một nhóm 'Cả dự án', cảnh báo một dòng, tỉnh có khâu quá hạn", () => {
    const { duAn, ho } = taoDuAnMau();
    const da: DuAn = { ...duAn, dotThuHoi: [] };
    const hos = ho.map((h) => moc({ ...h, dotId: undefined }, "13", "2026-10-01"));
    const n = nhomThuHoi(da, hos);
    expect(n.map((x) => [x.ten, x.hos.length])).toEqual([["Cả dự án", hos.length]]);
    expect(hanThuHoiNhom(n[0]!.hos, "2026-10-15", LICH_TRONG)).toMatchObject({ hanChot: "2026-10-12", trangThai: "QUA_HAN" });
    const cb = canhBaoDuAn(da, hos.map((h) => ({ h, k: tinhHo(cs, da, h) })), "2026-10-15");
    expect(cb.filter((c) => /Cả dự án: quá hạn ban hành quyết định thu hồi/.test(c.noiDung))).toHaveLength(1);
    expect(cb.some((c) => /bước 13/.test(c.noiDung) && c.hoId)).toBe(false);
    const [tt] = tomTatDuAn([da], hos, () => 0, "2026-10-15");
    expect(tt!.quaHan).toEqual([expect.objectContaining({ doiTuong: "Cả dự án", khau: "Ban hành QĐ thu hồi đất" })]);
    // dự án có đợt: hộ chưa xếp đợt thành nhóm riêng
    const da2: DuAn = { ...duAn, dotThuHoi: [{ id: "d1", so: 1, ten: "" }] };
    const n2 = nhomThuHoi(da2, [{ ...hos[0]!, dotId: "d1" }, ...hos.slice(1)]);
    expect(n2.map((x) => [x.ten, x.hos.length])).toEqual([["Đợt 1", 1], ["Hộ chưa xếp đợt", hos.length - 1]]);
  });

  it("báo cáo Word và Excel tỉnh có bảng khâu thủ tục quá hạn", async () => {
    const d: DongBaoCao = { id: "a", ten: "Dự án 1", xa: "Xã Chiềng Mung", chuDauTu: "", soHo: 3, theoTrangThai: { CHUA_KIEM_DEM: 3 }, tongTamTinh: "0", dienTichThuHoi: "1", soVuongMac: 0, soHoDaChotPA: 0, soHoDaDuyetPA: 0, tienDoBinhQuan: 0, soTepDinhKem: 0, donViGui: "UBND xã Chiềng Mung", luc: "2026-10-15T00:00:00Z",
      quaHan: [{ doiTuong: "Bản 2 (Đợt 1)", khau: "Thẩm định phương án", han: "2026-10-13", canCu: "khoản 3 Điều 3 NĐ 88/2024/NĐ-CP" }] };
    const tt = { coQuanCapTren: "UBND tỉnh Sơn La", coQuan: "Sở NN&MT", kyHieu: "SNNMT", diaDanh: "Sơn La", kinhGui: "UBND tỉnh", so: "", ngayKy: "2026-10-20", moDau: "", khoKhanKhac: "", nhiemVu: "", kienNghi: "", ketThuc: "", noiNhan: "VT", quyenHan: "GĐ", nguoiKy: "X" };
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-tong-hop-tinh.docx", import.meta.url));
    const chu = (dong: DongBaoCao[]) => new PizZip(dienMau(mau, duLieuBaoCaoTinh(dong, tt, { phamVi: "tỉnh", denNgay: "2026-10-20", soDonVi: 1, cham: [], nguong: null }))).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
    const xml = chu([d]);
    expect(xml).toContain("Có 1 khâu thủ tục quá hạn");
    expect(xml).toContain("Bản 2 (Đợt 1)");
    expect(xml).toContain("13/10/2026");
    expect(xml).not.toMatch(/\{[#/^]?[a-z_]+\}/);
    expect(chu([{ ...d, quaHan: undefined }])).not.toContain("khâu thủ tục quá hạn");
    const E = (await import("exceljs")).default;
    const wb = new E.Workbook();
    await wb.xlsx.load((await taoExcelTinh([d], "Sở NN&MT", true)) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Khau qua han")!;
    const vals = ws.getSheetValues().flat().map(String);
    expect(vals).toContain("Thẩm định phương án");
    expect(vals).toContain("13/10/2026");
    expect(vals.some((v) => v.startsWith("PHỤ LỤC 03"))).toBe(true);
  });
});
