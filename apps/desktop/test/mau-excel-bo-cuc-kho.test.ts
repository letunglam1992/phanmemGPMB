/** 1.3.6: các bố cục Excel của xã dễ nhận thiếu (docs/22 mục 3.2) — dữ liệu giả. */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { nhanDienMauCoSan } from "../src/mau-excel-nhan-dien";

const buf = async (wb: ExcelJS.Workbook) => new Uint8Array(await wb.xlsx.writeBuffer());
const doc = async (b: Uint8Array) => {
  const m = new ExcelJS.Workbook();
  await m.xlsx.load(b as unknown as ArrayBuffer);
  return m;
};

describe("Bố cục khó của tệp phương án xã", () => {
  it("tiêu đề gộp 3 tầng (STT, Nội dung gộp dọc; Giá trị bồi thường gộp ngang trên Đơn giá | Thành tiền)", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ho 1");
    ws.getCell("A2").value = "Họ và tên: Người giả";
    ws.getRow(5).values = ["STT", "Nội dung", "ĐVT", "Khối lượng", "Giá trị bồi thường, hỗ trợ", "", "Căn cứ"];
    ws.getRow(6).values = ["", "", "", "", "Theo quy định", "", ""];
    ws.getRow(7).values = ["", "", "", "", "Đơn giá (đồng)", "Thành tiền (đồng)", ""];
    for (const c of ["A", "B", "C", "D", "G"]) ws.mergeCells(`${c}5:${c}7`);
    ws.mergeCells("E5:F5");
    ws.mergeCells("E6:F6");
    ws.getRow(8).values = ["1", "2", "3", "4", "5", "6", "7"];
    ws.getRow(9).values = [1, "Đất trồng lúa", "m²", 100, 60000, 6000000, "QĐ giá đất"];
    ws.getRow(10).values = [2, "Cây ăn quả", "cây", 5, 300000, 1500000, "QĐ đơn giá"];
    ws.getRow(11).values = ["", "Tổng cộng", "", "", "", 7500000, ""];
    const nd = await nhanDienMauCoSan(await buf(wb));
    const ct = (await doc(nd.bytes)).worksheets[0]!;
    expect(ct.getCell("A9").value).toBe("{{#dong}}{{stt}}");
    expect(ct.getCell("B9").value).toBe("{{noi_dung}}");
    expect(ct.getCell("D9").value).toBe("{{khoi_luong}}");
    expect(ct.getCell("E9").value).toBe("{{don_gia}}");
    expect(ct.getCell("F9").value).toBe("{{thanh_tien}}");
    expect(ct.getCell("G9").value).toBe("{{can_cu}}");
    expect(ct.getCell("F10").value).toBe("{{tong_chua_lam_tron}}");
  });

  it("bảng A/B có dòng tiêu đề lặp lại (in sang trang) và dòng Cộng A, Cộng B", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ho 1");
    const td = ["STT", "Nội dung", "ĐVT", "Khối lượng", "Đơn giá", "Thành tiền"];
    ws.getRow(4).values = td;
    ws.getRow(5).values = ["A", "Bồi thường về đất", "", "", "", 6000000];
    ws.getRow(6).values = [1, "Đất trồng lúa", "m²", 100, 60000, 6000000];
    ws.getRow(7).values = ["", "Cộng A", "", "", "", 6000000];
    ws.getRow(8).values = td;
    ws.getRow(9).values = ["B", "Hỗ trợ", "", "", "", 1000000];
    ws.getRow(10).values = [1, "Hỗ trợ ổn định đời sống", "khẩu", 2, 500000, 1000000];
    ws.getRow(11).values = ["", "Cộng B", "", "", "", 1000000];
    ws.getRow(12).values = ["", "Tổng cộng (A+B)", "", "", "", 7000000];
    ws.getRow(13).values = ["", "Làm tròn", "", "", "", 7000000];
    const nd = await nhanDienMauCoSan(await buf(wb));
    const ct = (await doc(nd.bytes)).worksheets[0]!;
    expect(ct.getCell("A5").value).toBe("{{#dong}}{{stt}}");
    expect(ct.getCell("B6").value).toBe("Tổng cộng (A+B)");
    expect(ct.getCell("F6").value).toBe("{{tong_chua_lam_tron}}");
    expect(ct.getCell("F7").value).toBe("{{tong_lam_tron}}");
    // không còn tiêu đề lặp, dòng Cộng A/B cũ
    const conLai = [] as string[];
    ct.eachRow((r) => conLai.push(String(r.getCell(2).value ?? "")));
    expect(conLai.filter((x) => /Cộng A|Cộng B/.test(x))).toEqual([]);
  });

  it("nhiều bảng trên một trang: bảng thứ hai sau dòng tổng được báo trong mô tả", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ho 1");
    ws.getRow(3).values = ["STT", "Nội dung", "ĐVT", "Khối lượng", "Đơn giá", "Thành tiền"];
    ws.getRow(4).values = [1, "Đất trồng lúa", "m²", 100, 60000, 6000000];
    ws.getRow(5).values = ["", "Tổng cộng", "", "", "", 6000000];
    ws.getRow(7).values = ["STT", "Tài sản, vật kiến trúc", "ĐVT", "Khối lượng", "Đơn giá", "Thành tiền"];
    ws.getRow(8).values = [1, "Nhà cấp 4", "m²", 30, 2000000, 60000000];
    const nd = await nhanDienMauCoSan(await buf(wb));
    expect(nd.moTa.join("\n")).toMatch(/bảng khác/);
  });
});

describe("Điền mẫu: vùng lặp nhiều dòng mẫu, ít dữ liệu (lỗi spliceRows của ExcelJS)", () => {
  it("3 dòng mẫu (phần, nhóm, chính) ở cuối trang, dữ liệu 0 dòng và 1 dòng → không sót dòng mẫu", async () => {
    const { dienMauExcel } = await import("../src/mau-excel");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("A");
    ws.getCell("A1").value = "Tiêu đề";
    ws.getCell("A2").value = "{{#d.phan}}{{ten}}";
    ws.getCell("A3").value = "{{#d.nhom}}{{ten}}";
    ws.getCell("A4").value = "{{#d}}{{ten}}";
    ws.getCell("A5").value = "Cuối";
    const b = await buf(wb);
    for (const [bang, ky] of [[[], ["Tiêu đề", "Cuối"]], [[{ ten: "x" }], ["Tiêu đề", "x", "Cuối"]]] as const) {
      const { wb: kq } = await dienMauExcel(b, { chung: {}, bang: { d: [...bang] }, ho: [] });
      const d = await doc(new Uint8Array(await kq.xlsx.writeBuffer()));
      const ra: unknown[] = [];
      d.worksheets[0]!.eachRow((r) => ra.push(r.getCell(1).value));
      expect(ra).toEqual(ky);
    }
  });
});
