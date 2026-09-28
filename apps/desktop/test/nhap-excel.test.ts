import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { DON_GIA } from "../src/du-lieu";
import { tinhHo } from "../src/tinh-ho";
import { coLoiChan, docSo, docTepNhap, goiYAnhXa, kiemTraNhap, moTepExcel, nhanCot, taoMauNhap, xemTruoc } from "../src/nhap-excel";

const cs = cs0 as unknown as BoChinhSach;
const cay = DON_GIA.find((r) => r.nguon === "PL VIII")!;
const nha = DON_GIA.find((r) => r.nguon === "QĐ32")!;

async function tep(dien: (wb: ExcelJS.Workbook) => void): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await taoMauNhap()) as unknown as ArrayBuffer);
  dien(wb);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
const them = (wb: ExcelJS.Workbook, trang: string, ...dong: unknown[][]) => dong.forEach((d) => wb.getWorksheet(trang)!.addRow(d));

describe("Nhập hồ sơ từ Excel", () => {
  it("tệp mẫu có đủ trang, danh mục mã đơn giá; tệp trống không có lỗi, không có gì để nhập", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoMauNhap()) as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["HuongDan", "Ho", "NhanKhau", "Thua", "KiemDem", "LoaiDat", "DanhMucDonGia"]);
    expect(wb.getWorksheet("DanhMucDonGia")!.rowCount).toBeGreaterThan(100);
    const { duAn } = taoDuAnMau();
    const k = await docTepNhap(await taoMauNhap(), duAn, []);
    expect(k.loi).toEqual([]);
    expect(k.dem).toEqual({ ho: 0, nhanKhau: 0, thua: 0, kiemDem: 0 });
  });

  it("nhập hộ mới, nhân khẩu, thửa, kiểm đếm; bổ sung thửa cho hộ đã có; tính được", async () => {
    const { duAn, ho } = taoDuAnMau();
    const b = await tep((wb) => {
      them(wb, "Ho", ["H10", "Hộ nhập thử", "Hộ gia đình", "Bản A", "001", "", "1.500.000,5"], ["T01", "Công ty X", "Tổ chức"]);
      them(wb, "NhanKhau", ["H10", "Người A", 1980, "Chủ hộ"], ["H10", "Người B", "1985", "Vợ"]);
      them(wb, "Thua", ["H10", "5", "200", "CLN", 1000, "250,5", "Nhận chuyển nhượng"], [ho[0]!.ma, "9", "999", "LUC", 500, 500]);
      them(wb, "KiemDem", ["H10", "5", "200", cay.ma, "=10*2,5", "", "đợt đầu"], ["H10", "5", "200", nha.ma, 30.5, 2]);
    });
    const k = await docTepNhap(b, duAn, ho, "thu.xlsx");
    expect(k.loi.filter((l) => l.muc === "LOI")).toEqual([]);
    expect(k.dem).toEqual({ ho: 2, nhanKhau: 2, thua: 2, kiemDem: 2 });
    const h = k.hoMoi.find((x) => x.ma === "H10")!;
    expect(h).toMatchObject({ ten: "Hộ nhập thử", loai: "HO_GIA_DINH", khauTru: "1500000.5", soDinhDanh: "001" });
    expect(k.hoMoi.find((x) => x.ma === "T01")!.loai).toBe("TO_CHUC");
    expect(h.nhanKhau.map((n) => n.namSinh)).toEqual(["1980", "1985"]);
    expect(h.thua[0]).toMatchObject({ soTo: "5", soThua: "200", loaiDat: "CLN", dienTich: "1000", dienTichThuHoi: "250.5" });
    expect(h.taiSan[0]).toMatchObject({ loai: "CAY", soLuong: "=10*2.5", maDonGia: cay.ma, dot: 1 });
    expect(h.taiSan[1]).toMatchObject({ loai: "NHA_CT", khoiLuong: "30.5", dot: 2, cachTinh: "THIET_HAI_THUC_TE" });
    expect(h.nhatKy[0]!.noiDung).toContain("thu.xlsx");
    expect(k.hoBoSung).toHaveLength(1);
    expect(k.hoBoSung[0]!.thua.length).toBe(ho[0]!.thua.length + 1);
    expect(ho[0]!.thua.some((t) => t.soThua === "999")).toBe(false); // không sửa bản gốc
    expect(() => tinhHo(cs, duAn, h)).not.toThrow();
    // cảnh báo: thửa T01 không có; LUC 500 không thiếu DT thửa
    expect(k.loi.every((l) => l.muc === "CANH_BAO")).toBe(true);
  });

  it("báo lỗi theo trang, dòng, cột; không đoán số mơ hồ; còn lỗi thì chặn nhập", async () => {
    const { duAn, ho } = taoDuAnMau();
    const b = await tep((wb) => {
      them(wb, "Ho", [ho[0]!.ma, "Trùng mã"], ["H20", ""], ["H21", "Hộ 21", "Doanh nghiệp"], ["H22", "Hộ 22"], ["H22", "Hộ 22 lặp"]);
      them(wb, "Thua", ["H22", "1", "1", "CLN", "1.234", 100], ["H22", "1", "2", "CLN", 50, 80], ["HXX", "1", "3", "CLN", 10, 10], ["H22", "1", "4", "ABC", "", 10], ["H22", "1", "5", "CLN", 10, 0]);
      them(wb, "KiemDem", ["H22", "1", "2", "KHONG-CO", 1], ["H22", "7", "7", cay.ma, 1], ["H22", "1", "4", cay.ma, "=2*"], ["H22", "1", "4", cay.ma, 3, "0"]);
    });
    const k = await docTepNhap(b, duAn, ho);
    expect(coLoiChan(k)).toBe(true);
    const co = (trang: string, dong: number, chu: string) => expect(k.loi.some((l) => l.trang === trang && l.dong === dong && l.noiDung.includes(chu)), `${trang}:${dong} ${chu}`).toBe(true);
    co("Ho", 2, "trùng hồ sơ đã có");
    co("Ho", 3, "Thiếu họ tên");
    co("Ho", 4, "không phải Hộ gia đình");
    co("Ho", 6, "lặp lại trong tệp");
    co("Thua", 2, "không rõ dấu chấm");
    co("Thua", 3, "lớn hơn DT thửa");
    co("Thua", 4, "Không có hộ mã HXX");
    co("Thua", 5, "không có trong danh mục");
    co("Thua", 6, "phải lớn hơn 0");
    co("KiemDem", 2, "không có trong danh mục");
    co("KiemDem", 3, "không có thửa 7 tờ 7");
    co("KiemDem", 4, "Khối lượng");
    co("KiemDem", 5, "số nguyên");
    expect(k.loi.find((l) => l.trang === "Thua" && l.dong === 5)!.muc).toBe("CANH_BAO");
  });

  it("đọc số: số Excel, dấu phẩy thập phân, từ chối chuỗi mơ hồ", () => {
    expect(docSo(12.5).so).toBe("12.5");
    expect(docSo("1.234,56").so).toBe("1234.56");
    expect(docSo("250,5").so).toBe("250.5");
    expect(docSo("250.5").so).toBe("250.5");
    expect(docSo("1.234").loi).toContain("không rõ");
    expect(docSo("12a").loi).toContain("không phải số");
    expect(docSo("").so).toBeNull();
  });

  it("tệp mẫu đổi thứ tự cột: ánh xạ theo tên cột, đọc đúng dữ liệu", async () => {
    const { duAn } = taoDuAnMau();
    const b = await tep((wb) => {
      const ws = wb.getWorksheet("Thua")!;
      ws.getCell(1, 2).value = "Số thửa";
      ws.getCell(1, 3).value = "Tờ bản đồ";
      them(wb, "Ho", ["X1", "Hộ X"]);
      them(wb, "Thua", ["X1", "85", "5", "CLN", 100, 40]);
    });
    const k = await docTepNhap(b, duAn, []);
    expect(k.loi.filter((l) => l.muc === "LOI")).toEqual([]);
    expect(k.hoMoi[0]!.thua[0]).toMatchObject({ soTo: "5", soThua: "85" });
  });

  it("thiếu cột bắt buộc → báo lỗi, không nhập", async () => {
    const { duAn } = taoDuAnMau();
    const t = await moTepExcel(await taoMauNhap());
    const ax = goiYAnhXa(t);
    ax.Thua.cot.dienTichThuHoi = null;
    const k = kiemTraNhap(t, ax, duAn, []);
    expect(coLoiChan(k)).toBe(true);
    expect(k.loi[0]!.noiDung).toContain("DT thu hồi");
  });
});

/** Tệp "danh sách hộ bị ảnh hưởng" kiểu địa phương: tiêu đề 2 dòng gộp ô, dòng đánh số cột, nhóm theo thôn, dòng tổng. */
async function tepDiaPhuong(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("DS anh huong");
  ws.getCell("A1").value = "DANH SÁCH CÁC HỘ BỊ ẢNH HƯỞNG";
  ws.mergeCells("A1:I1");
  ws.addRow([]);
  ws.addRow(["STT", "Họ và tên chủ sử dụng", "Địa chỉ", "Tờ bản đồ", "Thửa số", "Mục đích sử dụng", "Diện tích (m²)", "", "Ghi chú"]);
  ws.addRow(["", "", "", "", "", "", "Diện tích thửa", "Diện tích thu hồi", ""]);
  for (const c of ["A", "B", "C", "D", "E", "F", "I"]) ws.mergeCells(`${c}3:${c}4`);
  ws.mergeCells("G3:H3");
  ws.addRow(["(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)", "(8)", "(9)"]);
  ws.addRow(["I", "Bản Mé"]);
  ws.addRow([1, "Lò Văn An", "Bản Mé", 5, 85, "CLN", 1000, "250,5", ""]);
  ws.addRow(["", "", "", 5, 86, "Đất trồng lúa nương", 500, 500, "cùng chủ"]);
  ws.addRow([2, "UBND xã Chiềng Mung", "Bản Mé", 5, 90, "DGT", 300, 120, ""]);
  ws.addRow([3, "Lò Văn An", "Bản Mé", 6, 10, "CLN", 200, 200, ""]);
  ws.addRow(["", "Tổng cộng", "", "", "", "", 2000, "1070,5", ""]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

describe("Ánh xạ cột tệp Excel khác mẫu", () => {
  it("nhận ra trang, dòng tiêu đề 2 tầng, các cột theo tên", async () => {
    const t = await moTepExcel(await tepDiaPhuong());
    const ax = goiYAnhXa(t);
    expect(ax.Ho.trang).toBeNull();
    expect(ax.Thua).toMatchObject({ trang: "DS anh huong", dongTieuDe: 4 });
    expect(ax.Thua.cot).toMatchObject({ maHo: null, tenChu: 2, diaChiChu: 3, soTo: 4, soThua: 5, loaiDat: 6, dienTich: 7, dienTichThuHoi: 8, ghiChu: 9 });
    expect(nhanCot(t, "DS anh huong", 4)[7]).toBe("Diện tích (m²) Diện tích thu hồi");
    const xt = xemTruoc(t, ax.Thua);
    expect(xt[0]!.dong).toBe(6); // bỏ dòng đánh số cột (5)
  });

  it("gộp thửa theo chủ sử dụng, tự đánh mã; bỏ dòng tổng, dòng nhóm; đổi tên loại đất sang mã; báo rõ", async () => {
    const { duAn } = taoDuAnMau();
    const k = await docTepNhap(await tepDiaPhuong(), duAn, []);
    expect(k.loi.filter((l) => l.muc === "LOI")).toEqual([]);
    expect(k.hoMoi.map((h) => [h.ma, h.ten, h.loai, h.thua.length])).toEqual([
      ["H001", "Lò Văn An", "HO_GIA_DINH", 3],
      ["H002", "UBND xã Chiềng Mung", "TO_CHUC", 1],
    ]);
    const an = k.hoMoi[0]!;
    expect(an.thua.map((x) => `${x.soTo}/${x.soThua}:${x.loaiDat}:${x.dienTichThuHoi}`)).toEqual(["5/85:CLN:250.5", "5/86:LUN:500", "6/10:CLN:200"]);
    const cb = k.loi.map((l) => l.noiDung).join(" | ");
    expect(cb).toContain("lấy theo dòng 7");
    expect(cb).toContain("tự đánh mã");
    expect(cb).toContain("dòng tổng");
    expect(cb).toContain("Bỏ qua dòng không có tờ");
  });

  it("thửa trùng tên chủ đã có trong dự án → gắn vào hồ sơ đó, có cảnh báo", async () => {
    const { duAn, ho } = taoDuAnMau();
    const b = await tep((wb) => {
      const ws = wb.getWorksheet("Thua")!;
      ws.getCell(1, 1).value = "Chủ sử dụng";
      them(wb, "Thua", [ho[0]!.ten, "99", "1", "CLN", 100, 100]);
    });
    const k = await docTepNhap(b, duAn, ho);
    expect(k.loi.filter((l) => l.muc === "LOI")).toEqual([]);
    expect(k.hoBoSung).toHaveLength(1);
    expect(k.hoBoSung[0]!.id).toBe(ho[0]!.id);
    expect(k.loi.some((l) => l.noiDung.includes(`hồ sơ đã có ${ho[0]!.ma}`))).toBe(true);
  });
});
