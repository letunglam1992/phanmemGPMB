import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { docTepNhap, taoMauNhap } from "../src/nhap-excel";
import { goiYPhapLy, nhomTuChu, thongKePhapLy } from "../src/nguon-goc";

describe("Pháp lý nguồn gốc đất (P2-5)", () => {
  it("nhận nhóm từ chữ; không chắc thì không đoán", () => {
    expect(nhomTuChu("Đã cấp GCN năm 2005")).toBe("GCN");
    expect(nhomTuChu("Có sổ đỏ")).toBe("GCN");
    expect(nhomTuChu("Không có giấy tờ, sử dụng từ 1990")).toBe("KHONG_GIAY_TO");
    expect(nhomTuChu("Có giấy tờ theo Điều 137")).toBe("GIAY_TO");
    expect(nhomTuChu("Nhận khoán của lâm trường")).toBe("GIAO_KHOAN");
    expect(nhomTuChu("Lấn chiếm hành lang")).toBe("VI_PHAM");
    expect(nhomTuChu("Nhận chuyển nhượng")).toBeNull();
    expect(goiYPhapLy({ gcn: { seri: "AB 123" }, nguonGoc: "" })).toBe("GCN");
  });
  it("thống kê diện tích thu hồi theo nhóm bằng Decimal; bỏ thửa không thu hồi", () => {
    const tk = thongKePhapLy([
      { thua: [{ phapLy: "GCN", dienTichThuHoi: "0.1" }, { phapLy: "GCN", dienTichThuHoi: "0.2" }, { dienTichThuHoi: "50" }] },
      { thua: [{ phapLy: "KHONG_GIAY_TO", dienTichThuHoi: "0" }, { dienTichThuHoi: "abc" }] },
    ]);
    expect(tk).toEqual([{ nhom: "GCN", soThua: 2, dt: "0.3" }, { nhom: "CHUA", soThua: 1, dt: "50" }]);
  });
  it("nhập Excel: cột Tình trạng pháp lý; chữ không nhận ra → cảnh báo, để trống", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoMauNhap()) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Thua")!;
    ws.addRow(["H10", "5", "200", "CLN", 1000, 250, "Nhận chuyển nhượng", "Có GCN"]);
    ws.addRow(["H10", "5", "201", "CLN", 1000, 100, "", "Khác"]);
    ws.addRow(["H10", "5", "202", "CLN", 1000, 100, "", "chưa rõ"]);
    wb.getWorksheet("Ho")!.addRow(["H10", "Hộ thử", "Hộ gia đình"]);
    const { duAn } = taoDuAnMau();
    const k = await docTepNhap(new Uint8Array(await wb.xlsx.writeBuffer()), duAn, []);
    const h = k.hoMoi.find((x) => x.ma === "H10")!;
    expect(h.thua.map((t) => t.phapLy)).toEqual(["GCN", "KHAC", undefined]);
    expect(h.thua[0]!.nguonGoc).toBe("Nhận chuyển nhượng");
    expect(k.loi.some((l) => l.muc === "CANH_BAO" && l.noiDung.includes("chưa rõ"))).toBe(true);
  });
});
