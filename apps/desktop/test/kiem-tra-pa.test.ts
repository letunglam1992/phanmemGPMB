/**
 * Kiểm tra tệp Excel phương án: bảng tổng hợp theo cấu trúc Phụ lục II thường gặp (tiêu đề 2 tầng, dòng đánh số cột,
 * nhóm A/I/1, dòng Cộng, Tổng cộng, Làm tròn). Số liệu lấy từ hồ sơ đối chiếu docs/16 (chỉ diện tích, số lượng,
 * đơn giá) và cài thêm lỗi cố ý. Không có tên người, số định danh.
 */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import bang0 from "../../../policy/nguon/nq152-2025-bang-gia-dat.json";
import type { BoChinhSach } from "@gpmb/core";
import { DON_GIA, type BangGiaDat } from "../src/du-lieu";
import { chonTrang, docTepExcel, kiemTraBang, nhanDienCot, xuatBaoCaoKiemTra, type KetQuaKiemTra, type TrangBang } from "../src/kiem-tra-pa";

const cs = cs0 as unknown as BoChinhSach;
const bangGia = bang0 as unknown as BangGiaDat;
const XA = "Xã Chiềng Mung";

async function taoTep(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Tong hop").addRows([["BẢNG TỔNG HỢP"], ["STT", "Họ và tên", "Tổng tiền"], [1, "Đối tượng 1", 100]]);
  const ws = wb.addWorksheet("PL II chi tiet");
  ws.addRows([
    ["PHỤ LỤC II — PHƯƠNG ÁN CHI TIẾT"],
    [],
    ["STT", "Nội dung", "Đơn vị tính", "Khối lượng", "Đơn giá (đồng)", "Tỷ lệ (%)", "Thành tiền (đồng)", "Căn cứ"],
    ["(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)=(4)x(5)x(6)", "(8)"],
    ["A", "BỒI THƯỜNG, HỖ TRỢ VỀ ĐẤT", null, null, null, null, 641628000, null],
    [1, "Đất CLN thửa 1", "m²", 6358.8, 54000, 100, 343375200, null], // 10
    [2, "Đất CLN thửa 2", "m²", 5523.2, 55000, 100, 303776000, null], // sai giá đất (đúng 54.000)
    ["B", "CÂY TRỒNG", null, null, null, null, 7555000, null],
    ["I", "Thửa 1", null, null, null, null, 7555000, null],
    [1, "Nhãn 30-35", "cây", 1, 3900000, 100, 3900000, null],
    [2, "Nhãn 25-30", "cây", 1, 1950000, 100, 1950000, null],
    [3, "Xoài 25-30", "cây", 1, 1900000, 30, 570000, null], // sai đơn giá (đúng 1.850.000); số học đúng
    [4, "Chuối sắp quả", "cây", 10, 38000, 30, 114000, null], // cây không có mật độ tính 30% → VM-35
    [5, "Rau ngót", "m²", 4, 15200, 100, 61500, null], // sai số học (đúng 60.800)
    [6, "Cây kiwi", "cây", 1, 12345, 100, 12345, null], // không có trong danh mục
    ["C", "HỖ TRỢ", null, null, null, null, 1924884000, null],
    [1, "Hỗ trợ đào tạo, chuyển đổi nghề", "m²", 11882, 54000, null, 1924884000, null], // hệ số 3 suy từ thành tiền
    [null, "Cộng", null, null, null, null, 2574067000, null], // lệch do dòng rau ngót và nhóm
    [null, "Tổng cộng", null, null, null, null, 2574067345, null],
    [null, "Làm tròn", null, null, null, null, 2574067000, null],
  ]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

async function chay(): Promise<KetQuaKiemTra> {
  const ds = await docTepExcel(await taoTep());
  const t = ds[chonTrang(ds)]!;
  const kq = kiemTraBang(t, { donGia: DON_GIA, bangGia, chinhSach: cs, xa: XA });
  if ("loi" in kq) throw new Error(kq.loi);
  return kq;
}
const cua = (kq: KetQuaKiemTra, ten: string) => kq.dong.find((d) => d.ten === ten)!;
const muc = (kq: KetQuaKiemTra, ten: string, loai: string) => cua(kq, ten).phatHien.filter((p) => p.loai === loai).map((p) => p.mucDo);

describe("Kiểm tra tệp Excel phương án", () => {
  it("tự chọn trang chi tiết, nhận tiêu đề và cột, bỏ dòng đánh số cột", async () => {
    const kq = await chay();
    expect(kq.trang).toBe("PL II chi tiet");
    expect(kq.anhXa).toMatchObject({ stt: 0, ten: 1, dvt: 2, kl: 3, dg: 4, tyLe: 5, tt: 6, canCu: 7 });
    expect(kq.dong[0]!.dong).toBe(5);
    expect(kq.dong.filter((d) => d.loai === "CHI_TIET")).toHaveLength(9);
  });

  it("đơn giá cây trồng: đúng danh mục PL VIII; sai giá báo lỗi kèm mức đúng; ngoài danh mục báo không kiểm được", async () => {
    const kq = await chay();
    expect(muc(kq, "Nhãn 30-35", "DON_GIA")).toEqual(["DUNG"]);
    expect(cua(kq, "Nhãn 30-35").phatHien.find((p) => p.loai === "DON_GIA")!.canCu).toMatch(/Phụ lục VIII QĐ 106\/2025/);
    expect(muc(kq, "Xoài 25-30", "DON_GIA")).toEqual(["LOI"]);
    expect(cua(kq, "Xoài 25-30").phatHien.find((p) => p.mucDo === "LOI")!.noiDung).toMatch(/1\.850\.000/);
    expect(muc(kq, "Cây kiwi", "DON_GIA")).toEqual(["KHONG_KIEM"]);
    expect(muc(kq, "Rau ngót", "DON_GIA")).toEqual(["DUNG"]);
  });

  it("tỷ lệ 30% với cây không có mật độ quy định → cảnh báo VM-35", async () => {
    const kq = await chay();
    expect(muc(kq, "Chuối sắp quả", "DON_GIA")).toContain("CANH_BAO");
  });

  it("số học từng dòng, có tỷ lệ phần trăm", async () => {
    const kq = await chay();
    expect(muc(kq, "Xoài 25-30", "SO_HOC")).toEqual(["DUNG"]);
    expect(muc(kq, "Rau ngót", "SO_HOC")).toEqual(["LOI"]);
    expect(cua(kq, "Rau ngót").phatHien.find((p) => p.loai === "SO_HOC")!.noiDung).toMatch(/60\.800/);
  });

  it("giá đất theo NQ 152 của xã; hệ số hỗ trợ chuyển đổi nghề theo bộ chính sách", async () => {
    const kq = await chay();
    expect(muc(kq, "Đất CLN thửa 1", "GIA_DAT")).toEqual(["DUNG"]);
    expect(muc(kq, "Đất CLN thửa 2", "GIA_DAT")).toEqual(["LOI"]);
    expect(cua(kq, "Đất CLN thửa 2").phatHien.find((p) => p.loai === "GIA_DAT")!.noiDung).toMatch(/54\.000/);
    expect(muc(kq, "Hỗ trợ đào tạo, chuyển đổi nghề", "HE_SO")).toEqual(["DUNG"]);
    expect(cua(kq, "Hỗ trợ đào tạo, chuyển đổi nghề").phatHien.find((p) => p.loai === "HE_SO")!.canCu).toMatch(/Điều 14 Phụ lục II QĐ 106\/2025/);
  });

  it("tổng nhóm, dòng Cộng, Tổng cộng, Làm tròn", async () => {
    const kq = await chay();
    const nhom = (ten: string) => cua(kq, ten).phatHien.filter((p) => p.loai === "TONG").map((p) => p.mucDo);
    // A: 343.375.200 + 303.776.000 = 647.151.200 ≠ 641.628.000
    expect(nhom("BỒI THƯỜNG, HỖ TRỢ VỀ ĐẤT")).toEqual(["LOI"]);
    // B, I: 3.900.000 + 1.950.000 + 570.000 + 114.000 + 61.500 + 12.345 = 6.607.845 ≠ 7.555.000
    expect(nhom("Thửa 1")).toEqual(["LOI"]);
    expect(nhom("HỖ TRỢ")).toEqual(["DUNG"]);
    // Tổng chi tiết = 647.151.200 + 6.607.845 + 1.924.884.000 = 2.578.643.045
    expect(nhom("Tổng cộng")).toEqual(["LOI"]);
    expect(cua(kq, "Tổng cộng").phatHien[0]!.noiDung).toMatch(/2\.578\.643\.045/);
    expect(nhom("Làm tròn")).toEqual(["THONG_TIN"]);
  });

  it("cột Căn cứ để trống → lưu ý chung; đếm theo mức", async () => {
    const kq = await chay();
    expect(kq.chung.some((p) => /Căn cứ/.test(p.noiDung))).toBe(true);
    expect(kq.dem.LOI).toBeGreaterThanOrEqual(7);
  });

  it("không chọn xã → giá đất, hệ số ở trạng thái không kiểm được", async () => {
    const ds = await docTepExcel(await taoTep());
    const kq = kiemTraBang(ds[1]!, { donGia: DON_GIA, bangGia, chinhSach: cs }) as KetQuaKiemTra;
    expect(muc(kq, "Đất CLN thửa 1", "GIA_DAT")).toEqual(["KHONG_KIEM"]);
  });

  it("bảng không có tiêu đề nhận được → báo lỗi, cho chọn cột thủ công", () => {
    const t: TrangBang = { ten: "X", o: [["a", "b"], [1, 2]] };
    expect(nhanDienCot(t.o)).toBeNull();
    expect(kiemTraBang(t, { donGia: DON_GIA })).toHaveProperty("loi");
    const tay = kiemTraBang(t, { donGia: DON_GIA }, { kl: 0, dg: 1, tt: 1, ten: 0 });
    expect("loi" in tay).toBe(false);
  });

  it("xuất báo cáo Excel đọc lại được", async () => {
    const kq = await chay();
    const b = await xuatBaoCaoKiemTra(kq, "pa.xlsx", XA);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(b as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Kết quả kiểm tra")!;
    expect(ws.rowCount).toBeGreaterThan(20);
  });
});
