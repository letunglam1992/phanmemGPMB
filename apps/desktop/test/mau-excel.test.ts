/** Mẫu Excel của đơn vị (QD-32): điền trường, nhân dòng, nhân trang từng hộ, giữ định dạng, dời công thức. */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { dongChiTiet, duLieuMauExcel, taoMauExcelMacDinh } from "../src/xuat-excel";
import { dienMauExcel, doiCongThuc } from "../src/mau-excel";

const cs = cs0 as unknown as BoChinhSach;
const docLai = async (wb: ExcelJS.Workbook) => {
  const d = new ExcelJS.Workbook();
  await d.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  return d;
};

describe("Dời công thức khi nhân dòng lặp", () => {
  it("dòng dưới vùng mẫu dời; vùng SUM kết thúc tại dòng mẫu mở rộng; chuỗi, tên hàm giữ nguyên", () => {
    expect(doiCongThuc("SUM(G4:G4)", 4, 4, 3)).toBe("SUM(G4:G6)");
    expect(doiCongThuc("G5*2+$H$10", 4, 4, 3)).toBe("G7*2+$H$12");
    expect(doiCongThuc("A1+B3", 4, 4, 3)).toBe("A1+B3");
    expect(doiCongThuc('IF(A5="B4","",LOG10(C5))', 4, 4, 1)).toBe('IF(A5="B4","",LOG10(C5))');
    expect(doiCongThuc("SUM(G4:G4)", 4, 4, 0)).toBe("SUM(G4:G4)");
    expect(doiCongThuc("G6", 4, 5, 1)).toBe("G5");
  });
});

describe("Điền mẫu Excel", () => {
  it("mẫu mặc định: trang tổng hợp, mỗi hộ một trang; số khớp kết quả tính; giữ ô gộp, định dạng; SUM mở rộng", async () => {
    const { duAn, ho } = taoDuAnMau();
    const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    const { wb, thieu } = await dienMauExcel(await taoMauExcelMacDinh(), duLieuMauExcel(duAn, ds, "Bản 1 – thử"));
    expect(thieu).toEqual([]);
    const d = await docLai(wb);
    expect(d.worksheets.map((w) => w.name)).toEqual(["TH ĐẤT", "TH GIÁ TRỊ TRÌNH DUYỆT", "DS KÈM THÔNG BÁO", "BIỂU 01", "TH DIỆN TÍCH THU HỒI", "1. Hộ mẫu 01", "2. Hộ mẫu 02"]);
    const tg = d.getWorksheet("TH GIÁ TRỊ TRÌNH DUYỆT")!;
    expect(tg.getCell("A1").value).toBe(`BẢNG TỔNG HỢP GIÁ TRỊ BỒI THƯỜNG, HỖ TRỢ TRÌNH DUYỆT – ${duAn.ten}`);
    expect(tg.getCell("A2").value).toBe("Bản 1 – thử");
    expect(tg.getRow(4).getCell(2).value).toBe("Hộ mẫu 01");
    const cotTong = 3 + 8 + 3; // STT, tên, DT + 8 cột + BT, HT, tổng làm tròn
    expect(tg.getRow(4).getCell(cotTong).value).toBe(ds[0]!.k.tong.tongLamTron.toNumber());
    expect(tg.getRow(4).getCell(cotTong).numFmt).toBe("#,##0");
    expect((tg.getRow(6).getCell(cotTong).value as { formula: string }).formula).toMatch(/^SUM\(N4:N5\)$/);
    expect(tg.model.merges).toContain("A1:Q1");
    const td = d.getWorksheet("TH ĐẤT")!;
    const soThua = ho.reduce((s, h) => s + h.thua.length, 0);
    expect((td.getRow(4 + soThua).getCell(7).value as { formula: string }).formula).toBe(`SUM(G4:G${3 + soThua})`);
    expect(td.getRow(4).getCell(6).value).toBe("Đất trồng cây lâu năm (CLN)");
    // Trang hộ (Biểu số 02): dòng chi tiết đủ, dòng tổng sau vùng lặp, ô gộp tiêu đề giữ nguyên
    const th = d.getWorksheet("1. Hộ mẫu 01")!;
    expect(th.getCell("A1").value).toBe(`UBND ${duAn.xa.toUpperCase()}`);
    expect(th.model.merges).toContain("A3:K3");
    expect((th.getCell("A5").value as { formula: string }).formula).toBe("'BIỂU 01'!A4");
    expect(th.getCell("B7").value).toBe("Họ và tên chủ hộ: Hộ mẫu 01 (vợ: Thành viên A)   ·   Mã hồ sơ: H01");
    expect(th.getCell("B8").value).toMatch(/^CCCD số: /);
    const dong = dongChiTiet(ho[0]!, ds[0]!.k);
    const dauDong = 16 + ho[0]!.thua.length; // thửa lặp đẩy xuống (1 dòng mẫu → n dòng)
    expect(th.getRow(dauDong).getCell(2).value).toBe("GIÁ TRỊ BỒI THƯỜNG");
    expect(th.getRow(dauDong).getCell(2).font?.bold).toBe(true);
    expect(th.getRow(dauDong + 2).getCell(2).font?.bold).toBeFalsy();
    const cuoi = dauDong + dong.length;
    expect(th.getRow(cuoi).getCell(2).value).toBe("TỔNG CỘNG (A + B)");
    expect(th.getRow(cuoi + 1).getCell(8).value).toBe(ds[0]!.k.tong.tongLamTron.toNumber());
    const soTien = dong.filter((x) => !x._cap && typeof x.thanh_tien === "number");
    expect(soTien.length).toBeGreaterThan(0);
    expect(th.getRow(cuoi + 6).getCell(8).value).toBe(ds[0]!.k.theoCot.BT_DAT.toNumber()); // "Bồi thường về đất" trong khối tổng hợp theo khoản
    expect(th.model.merges).toContain(`B${cuoi + 15}:K${cuoi + 15}`); // dòng "Lưu ý:" dời theo

    // Biểu số 01: cột loại đất động (CLN, HNK, ONT), số liệu tham chiếu công thức sang trang hộ, dòng tổng làm tròn
    const b1 = d.getWorksheet("BIỂU 01")!;
    expect(b1.getRow(7).values).toEqual(expect.arrayContaining(["CLN", "HNK", "ONT"]));
    expect(b1.getCell("E6").value).toBe("Loại đất thu hồi (m²)");
    expect(b1.model.merges).toEqual(expect.arrayContaining(["E6:G6", "J6:L6", "M6:Q6", "A1:Q1", "H6:H7"]));
    expect(b1.getCell("E8").value).toBe(9665.3);
    expect(b1.getCell("F9").value).toBe(600);
    expect((b1.getCell("I8").value as { formula: string }).formula).toBe(`'1. Hộ mẫu 01'!H${cuoi + 1}`);
    expect((b1.getCell("J8").value as { formula: string }).formula).toBe(`'1. Hộ mẫu 01'!H${cuoi + 6}`);
    expect((b1.getCell("I10").value as { formula: string }).formula).toBe("ROUND(SUM(I8:I9),-3)");
    expect((b1.getCell("E10").value as { formula: string }).formula).toBe("SUM(E8:E9)");
    expect(b1.getCell("A4").value).toBe("(Kèm theo Tờ trình số ………… ngày ………… của phòng chuyên môn)");
    // Biểu tổng hợp diện tích: DT = tổng các cột loại đất
    const bdt = d.getWorksheet("TH DIỆN TÍCH THU HỒI")!;
    expect((bdt.getCell("F7").value as { formula: string }).formula).toBe("SUM(G7:I7)");
    expect((bdt.getCell("I11").value as { formula: string }).formula).toBe("SUM(I7:I10)");
    expect(bdt.getCell("H9").value).toBe(600);
    // Biểu danh sách kèm Thông báo: vợ/chồng xuống dòng, ký hiệu loại đất
    const bds = d.getWorksheet("DS KÈM THÔNG BÁO")!;
    expect(bds.getCell("B7").value).toBe("Hộ mẫu 01\nvợ: Thành viên A");
    expect(bds.getCell("G9").value).toBe("HNK");
    expect(bds.getCell("H9").value).toBe("Thu hồi một phần");
  });

  it("dòng (Kèm theo …) lấy số, ngày văn bản đã ghi của hộ/dự án", async () => {
    const { kemTheoBieu } = await import("../src/xuat-excel");
    const { duAn, ho } = taoDuAnMau();
    const h = ho.map((x) => ({ ...x, vanBan: { tb_thu_hoi_so: "94/TB-UBND", tb_thu_hoi_ngay: "20/03/2026", qd_phe_duyet_so: "31/QĐ-UBND", qd_phe_duyet_ngay: "01/09/2026" } }));
    const kt = kemTheoBieu({ ...duAn, vanBan: { tt_thu_hoi_so: "12/TTr-KT", tt_thu_hoi_ngay: "02/09/2026", ten_phong: "Phòng Kinh tế" } }, h);
    expect(kt.tb).toBe("(Kèm theo Thông báo số 94/TB-UBND ngày 20/03/2026 của Ủy ban nhân dân xã Chiềng Mung)");
    expect(kt.pa).toBe("(Kèm theo Quyết định số 31/QĐ-UBND ngày 01/09/2026 của Chủ tịch Ủy ban nhân dân xã Chiềng Mung)");
    expect(kt.thuHoi).toBe("(Kèm theo Tờ trình số 12/TTr-KT ngày 02/09/2026 của Phòng Kinh tế)");
    // số QĐ phê duyệt khác nhau giữa các hộ → không lấy chung
    expect(kemTheoBieu(duAn, [h[0]!, { ...h[1]!, vanBan: {} }]).pa).toMatch(/Tờ trình số …………/);
  });

  it("cột động: dời cột trong công thức, mở rộng vùng, bản sao tự tham chiếu; 0 cột", async () => {
    const { doiCotCongThuc } = await import("../src/mau-excel");
    expect(doiCotCongThuc("SUM(E8:E8)", 5, 3, null)).toBe("SUM(E8:G8)");
    expect(doiCotCongThuc("SUM(E8:E8)", 5, 3, 2)).toBe("SUM(G8:G8)");
    expect(doiCotCongThuc("ROUND(SUM(G8:G8),-3)+H1", 5, 3, null)).toBe("ROUND(SUM(I8:I8),-3)+J1");
    expect(doiCotCongThuc("'BIỂU 01'!A4+D2", 1, 3, null)).toBe("'BIỂU 01'!A4+F2");
    expect(doiCotCongThuc("SUM(D1:F1)", 5, 0, null)).toBe("SUM(D1:E1)");
    expect(doiCotCongThuc("SUM(E8:E8)", 5, 0, null)).toBe("SUM(0)");
  });

  it("ô gộp trong dòng lặp nhân theo từng dòng; công thức trong dòng lặp trỏ đúng dòng; hai vùng lặp", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("TH");
    ws.getCell("A1").value = "{{ten_du_an}}";
    ws.mergeCells("A1:E1");
    ws.getRow(2).values = ["{{#ho}}{{stt}}", "{{ten}}", "", "{{tong_lam_tron}}", { formula: "D2*2" } as ExcelJS.CellFormulaValue];
    ws.mergeCells("B2:C2");
    ws.getRow(3).values = ["", "Cộng", "", { formula: "SUM(D2:D2)" } as ExcelJS.CellFormulaValue];
    ws.getRow(5).values = ["{{#thua_du_an}}{{stt}}", "{{loai_dat}}"];
    ws.getCell("A6").value = "Ký tên";
    ws.mergeCells("A6:E6");
    const bytes = new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const { duAn, ho } = taoDuAnMau();
    const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    const d = await docLai((await dienMauExcel(bytes, duLieuMauExcel(duAn, ds))).wb);
    const t = d.getWorksheet("TH")!;
    const soThua = ho.reduce((s2, h) => s2 + h.thua.length, 0);
    expect(t.model.merges).toEqual(expect.arrayContaining(["A1:E1", "B2:C2", "B3:C3", `A${6 + 1 + soThua - 1}:E${6 + 1 + soThua - 1}`]));
    expect((t.getCell("E3").value as { formula: string }).formula).toBe("D3*2");
    expect((t.getCell("D4").value as { formula: string }).formula).toBe("SUM(D2:D3)");
    expect(t.getCell(`A${6 + soThua}`).value).toBe("Ký tên");
  });

  it("trường mẫu không có trong dữ liệu → báo tên trường; tệp không phải xlsx → lỗi rõ ràng", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("A");
    ws.getCell("A1").value = "Dự án {{ten_du_an}} {{truong_la}}";
    ws.getCell("A2").value = "{{#bang_la}}{{x}}";
    const bytes = new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const { duAn, ho } = taoDuAnMau();
    const r = await dienMauExcel(bytes, duLieuMauExcel(duAn, [{ h: ho[0]!, k: tinhHo(cs, duAn, ho[0]!) }]));
    expect(r.thieu).toEqual(["#bang_la", "truong_la"]);
    await expect(dienMauExcel(new Uint8Array([1, 2, 3]), { chung: {}, bang: {}, ho: [] })).rejects.toThrow(/Không đọc được tệp mẫu Excel/);
  });
});
