/** Biểu Excel tổng hợp toàn tỉnh (1.0.2+): thể thức biểu báo cáo — tiêu đề gộp ô, tiêu đề cột có khung, nhóm theo xã, tổng cộng. */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { taoExcelTinh } from "../src/tong-hop-tinh/excel-tinh";
import type { DongBaoCao } from "../src/tong-hop-tinh/bao-cao-tinh";

const da = (id: string, xa: string, ten: string, soHo: number, hoanThanh: number, tien: string, dt: string): DongBaoCao => ({
  id, ten, xa, chuDauTu: "Ban QLDA các công trình", soHo, theoTrangThai: { HOAN_THANH: hoanThanh, DA_KIEM_DEM: soHo - hoanThanh },
  tongTamTinh: tien, dienTichThuHoi: dt, soVuongMac: 1, soHoDaChotPA: soHo, soHoDaDuyetPA: hoanThanh, tienDoBinhQuan: 0.5, soTepDinhKem: 2,
  donViGui: "UBND xã mẫu", luc: "2026-10-04T15:20:00.000Z",
} as DongBaoCao);

const MAU = [
  da("a", "Phường Mộc Châu", "Khai thác đá vôi làm vật liệu xây dựng thông thường, bê tông tươi, bê tông nhựa nóng", 15, 4, "40862832000", "87307.64"),
  da("b", "Xã Chiềng Mung", "Khu công nghiệp Mai Sơn", 43, 0, "1235906000", "154764.2"),
  da("c", "Xã Chiềng Mung", "Cao tốc Sơn La - Điện Biên", 78, 7, "3000000000", "100000"),
];

describe("Excel tổng hợp toàn tỉnh", () => {
  it("hai trang: tên đơn vị, phụ lục, tên biểu gộp ô; nhóm xã; tổng cộng đúng; định dạng số", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoExcelTinh(MAU, "Sở Nông nghiệp và Môi trường", true)) as unknown as ArrayBuffer);
    const w1 = wb.getWorksheet("Theo xa")!;
    expect(w1.getCell("A1").value).toBe("SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG");
    expect(w1.getCell("A2").value).toBe("PHỤ LỤC 01");
    expect(w1.getCell("A1").isMerged).toBe(true);
    const hang = w1.getRows(1, w1.rowCount)!;
    const tong = hang.find((r) => String(r.getCell(2).value).startsWith("TỔNG CỘNG"))!;
    expect([tong.getCell(3).value, tong.getCell(4).value, tong.getCell(5).value, tong.getCell(10).value]).toEqual([3, 136, 11, 45098738000]);
    expect(tong.getCell(10).numFmt).toBe("#,##0");
    expect(tong.getCell(6).numFmt).toBe("0.0%");
    expect(tong.getCell(2).font?.bold).toBe(true);
    const w2 = wb.getWorksheet("Tung du an")!;
    const h2 = w2.getRows(1, w2.rowCount)!;
    expect(h2.filter((r) => /\(\d+ dự án\)$/.test(String(r.getCell(2).value))).map((r) => r.getCell(2).value)).toEqual(["Phường Mộc Châu (1 dự án)", "Xã Chiềng Mung (2 dự án)", "TỔNG CỘNG (3 dự án)"]);
    expect(h2.find((r) => r.getCell(1).value === 1)!.getCell(3).value).toMatch(/^Khai thác đá vôi/);
    expect(w2.views[0]).toMatchObject({ state: "frozen" });
  });
  it("1.0.4: dự án liên xã — trang Lien xa (Phụ lục 03): nhóm tuyến, xã chưa có số liệu, cộng toàn tuyến; tổng số dự án đếm theo mã", async () => {
    const ds = MAU.map((d, i) => (i === 0 ? d : { ...d, lienXa: { ma: "LX-2026-001", kmDau: "Km0", kmCuoi: "Km3" } }));
    const tuyen = [{ ma: "LX-2026-001", ten: "Đường nối QL6", chuDauTu: "Ban QLDA", dsXa: ["Xã Chiềng Mung", "Xã Mường Bon"], taoLuc: "", taoBoi: "" }];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoExcelTinh(ds, "Sở Nông nghiệp và Môi trường", true, tuyen)) as unknown as ArrayBuffer);
    const w3 = wb.getWorksheet("Lien xa")!;
    expect(w3.getCell("A2").value).toBe("PHỤ LỤC 03");
    const r = w3.getRows(1, w3.rowCount)!.map((x) => [x.getCell(2).value, x.getCell(4).value, x.getCell(5).value]);
    expect(r.find((x) => x[0] === "Xã Mường Bon")).toEqual(["Xã Mường Bon", "Chưa có số liệu", null]);
    const tong = w3.getRows(1, w3.rowCount)!.find((x) => String(x.getCell(2).value).startsWith("Cộng toàn tuyến"))!;
    expect(String(tong.getCell(2).value)).toContain("1/2 xã có số liệu");
    expect(tong.getCell(5).value).toBe(121);
    const w1 = wb.getWorksheet("Theo xa")!;
    expect(w1.getRows(1, w1.rowCount)!.find((x) => String(x.getCell(2).value).startsWith("TỔNG CỘNG"))!.getCell(3).value).toBe(2);
  });
});
