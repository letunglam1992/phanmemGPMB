/** 1.3.5: nhận diện tệp Excel phương án sẵn có của xã (không có trường {{…}}) → mẫu có trường → điền theo bố cục của xã. */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { dongChiTiet, duLieuMauExcel } from "../src/xuat-excel";
import { dienMauExcel } from "../src/mau-excel";
import { nhanDienMauCoSan } from "../src/mau-excel-nhan-dien";

const cs = cs0 as unknown as BoChinhSach;
const buf = async (wb: ExcelJS.Workbook) => new Uint8Array(await wb.xlsx.writeBuffer());
const docLai = async (wb: ExcelJS.Workbook) => {
  const d = new ExcelJS.Workbook();
  await d.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
  return d;
};

/** Tệp phương án "của xã" (dữ liệu giả): tổng hợp + 2 trang chi tiết hộ, không có trường. */
async function tepCuaXa() {
  const wb = new ExcelJS.Workbook();
  const th = wb.addWorksheet("Tong hop");
  th.mergeCells("A1:E1");
  th.getCell("A1").value = "BẢNG TỔNG HỢP KINH PHÍ BỒI THƯỜNG, HỖ TRỢ";
  th.getCell("A2").value = "Dự án: Đường nội bản thử nghiệm";
  th.getRow(4).values = ["STT", "Họ và tên", "Diện tích thu hồi (m²)", "Tổng số tiền (đồng)", "Ghi chú"];
  th.getRow(5).values = ["1", "2", "3", "4", "5"];
  th.getRow(6).values = [1, "Nguyễn Văn Giả", 120, 15000000, ""];
  th.getRow(7).values = [2, "Lò Thị Thử", 80, 9000000, ""];
  th.getRow(8).values = ["", "Tổng cộng", 200, 24000000, ""];
  th.getCell("D6").numFmt = "#,##0";
  for (const [ten, so] of [["Ho 1", 1], ["Ho 2", 2]] as const) {
    const ws = wb.addWorksheet(ten);
    ws.mergeCells("A1:H1");
    ws.getCell("A1").value = "PHƯƠNG ÁN CHI TIẾT BỒI THƯỜNG, HỖ TRỢ";
    ws.getCell("A3").value = `Họ và tên: Người giả ${so}`;
    ws.getCell("A4").value = "Địa chỉ:";
    ws.getCell("C4").value = "Bản Thử, xã Thử";
    ws.getRow(6).values = ["STT", "Nội dung bồi thường, hỗ trợ", "ĐVT", "Khối lượng", "Đơn giá (đồng)", "Thành tiền (đồng)", "Căn cứ"];
    ws.getRow(7).values = ["1", "2", "3", "4", "5", "6=4x5", "7"];
    ws.getRow(8).values = [1, "Đất trồng cây lâu năm", "m²", 100, 50000, 5000000, "QĐ giá đất"];
    ws.getRow(9).values = [2, "Cây cà phê", "cây", 10, 200000, 2000000, "QĐ đơn giá cây"];
    ws.getRow(10).values = ["", "Tổng cộng", "", "", "", 7000000, ""];
    ws.getRow(11).values = ["", "Làm tròn", "", "", "", 7000000, ""];
    ws.getCell("F8").numFmt = "#,##0";
    ws.getCell("F8").font = { name: "Times New Roman", size: 12, italic: true };
    ws.getCell("A13").value = "Người lập biểu";
  }
  return buf(wb);
}

describe("Nhận diện mẫu Excel sẵn có của xã", () => {
  it("trang chi tiết → mỗi hộ một trang, dòng lặp {{#dong}}, dòng tổng, ô thông tin hộ; trang tổng hợp → {{#ho}}", async () => {
    const nd = await nhanDienMauCoSan(await tepCuaXa());
    expect(nd.daCoTruong).toBe(false);
    expect(nd.moTa.join("\n")).toMatch(/bảng chi tiết của hộ/);
    expect(nd.moTa.join("\n")).toMatch(/bảng tổng hợp/);
    const m = new ExcelJS.Workbook();
    await m.xlsx.load(nd.bytes as unknown as ArrayBuffer);
    expect(m.worksheets.map((w) => w.name)).toEqual(["Tong hop", "{{stt}}. {{ten}}"]);
    const ct = m.getWorksheet("{{stt}}. {{ten}}")!;
    expect(ct.getCell("A8").value).toBe("{{#dong}}{{stt}}");
    expect(ct.getCell("F8").value).toBe("{{thanh_tien}}");
    expect(ct.getCell("G8").value).toBe("{{can_cu}}");
    expect(ct.getCell("F9").value).toBe("{{tong_chua_lam_tron}}"); // dòng dữ liệu thứ hai đã xóa → Tổng cộng dời lên
    expect(ct.getCell("F10").value).toBe("{{tong_lam_tron}}");
    expect(ct.getCell("A3").value).toBe("Họ và tên: {{ten}}");
    expect(ct.getCell("C4").value).toBe("{{dia_chi}}");
    expect(ct.getCell("A12").value).toBe("Người lập biểu");
    expect(ct.getCell("F8").numFmt).toBe("#,##0");
    const th = m.getWorksheet("Tong hop")!;
    expect(th.getCell("A6").value).toBe("{{#ho}}{{stt}}");
    expect(th.getCell("B6").value).toBe("{{ten}}");
    expect(th.getCell("D6").value).toBe("{{tong_lam_tron}}");
    expect(th.getCell("D7").value).toBe("{{tong_lam_tron}}");
    expect(th.getCell("A2").value).toBe("Dự án: {{ten_du_an}}");
  });

  it("điền bằng số liệu dự án: đúng số trang hộ, đủ dòng chi tiết, tổng khớp kết quả tính, giữ định dạng của xã", async () => {
    const { duAn, ho } = taoDuAnMau();
    const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    const nd = await nhanDienMauCoSan(await tepCuaXa());
    const { wb } = await dienMauExcel(nd.bytes, duLieuMauExcel(duAn, ds));
    const d = await docLai(wb);
    expect(d.worksheets.map((w) => w.name)).toEqual(["Tong hop", ...ho.map((h, i) => `${i + 1}. ${h.ten}`)]);
    const th = d.getWorksheet("Tong hop")!;
    expect(th.getCell("A2").value).toBe(`Dự án: ${duAn.ten}`);
    expect(th.getCell("B6").value).toBe(ho[0]!.ten);
    expect(th.getCell("D6").value).toBe(ds[0]!.k.tong.tongLamTron.toNumber());
    expect(th.getCell("D6").numFmt).toBe("#,##0");
    expect(th.getRow(6 + ho.length).getCell(2).value).toBe("Tổng cộng");
    const ws = d.getWorksheet(`1. ${ho[0]!.ten}`)!;
    expect(ws.getCell("A1").value).toBe("PHƯƠNG ÁN CHI TIẾT BỒI THƯỜNG, HỖ TRỢ");
    expect(ws.getCell("A3").value).toBe(`Họ và tên: ${ho[0]!.ten}`);
    const n = dongChiTiet(ho[0]!, ds[0]!.k).length;
    expect(n).toBeGreaterThan(1);
    expect(ws.getRow(8 + n).getCell(2).value).toBe("Tổng cộng");
    expect(ws.getRow(8 + n).getCell(6).value).toBe(ds[0]!.k.tong.tongChuaLamTron.toNumber());
    expect(ws.getRow(9 + n).getCell(6).value).toBe(ds[0]!.k.tong.tongLamTron.toNumber());
    expect(ws.getCell("F8").font?.italic).toBe(true);
    expect(ws.getRow(11 + n).getCell(1).value).toBe("Người lập biểu");
  });

  it("tệp đã có trường → giữ nguyên; tệp không có bảng phương án → báo lỗi", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("A").getCell("A1").value = "{{ten_du_an}}";
    const b = await buf(wb);
    const nd = await nhanDienMauCoSan(b);
    expect(nd.daCoTruong).toBe(true);
    expect(nd.bytes).toBe(b);
    const rong = new ExcelJS.Workbook();
    rong.addWorksheet("B").getCell("A1").value = "Không có gì";
    await expect(nhanDienMauCoSan(await buf(rong))).rejects.toThrow(/Không nhận ra bảng phương án/);
  });
});
