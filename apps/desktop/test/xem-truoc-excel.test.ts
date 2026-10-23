import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { workbookSangHtml } from "../src/xem-truoc-excel";

describe("1.2.0 (C3) — xem trước biểu Excel", () => {
  it("ô gộp thành colspan/rowspan, số có dấu phân cách, công thức lấy kết quả, chữ được thoát", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Biểu 01");
    ws.mergeCells("A1:C1");
    ws.getCell("A1").value = "TỔNG HỢP <PHƯƠNG ÁN>";
    ws.getCell("A1").font = { bold: true };
    ws.getCell("A1").alignment = { horizontal: "center" };
    ws.getCell("A2").value = "Hộ A";
    ws.getCell("B2").value = 1234567;
    ws.getCell("B2").numFmt = "#,##0";
    ws.getCell("C2").value = { formula: "B2*2", result: 2469134 };
    ws.getCell("C2").numFmt = "#,##0";
    ws.mergeCells("A3:A4");
    ws.getCell("A3").value = "Gộp dọc";
    wb.addWorksheet("Biểu 02").getCell("A1").value = "x";
    const ds = workbookSangHtml(wb);
    expect(ds.map((t) => t.ten)).toEqual(["Biểu 01", "Biểu 02"]);
    const h = ds[0]!.html;
    expect(h).toContain('<td colspan="3" style="font-weight:bold;text-align:center">TỔNG HỢP &lt;PHƯƠNG ÁN&gt;</td>');
    expect(h).toContain("1.234.567");
    expect(h).toContain("2.469.134");
    expect(h).toContain('rowspan="2"');
    // hàng 1 chỉ có 1 ô (2 ô bị gộp)
    expect(h.split("</tr>")[0]!.match(/<td/g)).toHaveLength(1);
  });
  it("giới hạn số dòng hiện", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Dài");
    for (let i = 1; i <= 50; i++) ws.getCell(`A${i}`).value = i;
    const [t] = workbookSangHtml(wb, 10);
    expect(t!.soDong).toBe(50);
    expect(t!.html.match(/<tr>/g)).toHaveLength(10);
  });
});
