/**
 * Nhập hồ sơ từ Excel: tệp mẫu của phần mềm hoặc tệp có cấu trúc cột khác (ánh xạ cột). Các loại dữ liệu:
 * Hộ, Nhân khẩu, Thửa đất, Kiểm đếm (cây trồng, nhà – công trình theo mã đơn giá). Nguyên tắc:
 *  - Ánh xạ cột: phần mềm tự đoán trang, dòng tiêu đề và cột theo tên cột (không dấu, từ đồng nghĩa);
 *    cán bộ xem, chỉnh, xem trước rồi mới nhập. Không đoán theo vị trí cột.
 *  - Kiểm tra toàn bộ tệp trước, báo lỗi theo trang/dòng/cột; CÒN LỖI THÌ KHÔNG NHẬP GÌ (không nhập dở).
 *  - Không đoán số liệu: số dạng chữ không rõ dấu thập phân ("1.234") bị báo lỗi, không tự hiểu.
 *  - Trang Hộ chỉ tạo hồ sơ mới; mã trùng hồ sơ đã có → lỗi. Thửa, kiểm đếm được bổ sung cho hồ sơ đã có
 *    (tham chiếu theo mã hộ); thửa trùng tờ/thửa trong cùng hộ → lỗi.
 */
import type ExcelJS from "exceljs";
import { D } from "@gpmb/core";
import { DON_GIA } from "./du-lieu";
import { maHoTiepTheo, mauMaCua } from "./ma-ho";
import { thuTinh } from "./bieu-thuc";
import { TEN_LOAI_DAT } from "./van-ban/loai-dat";
import { hoMoi, taoId, type DuAn, type Ho, type LoaiDoiTuong, type TaiSan, type Thua } from "./mo-hinh";

export interface LoiNhap {
  trang: string;
  dong: number;
  cot: string;
  noiDung: string;
  muc: "LOI" | "CANH_BAO";
}

export interface KetQuaNhap {
  loi: LoiNhap[];
  hoMoi: Ho[];
  hoBoSung: Ho[];
  dem: { ho: number; nhanKhau: number; thua: number; kiemDem: number };
}

type CotMau = { khoa: string; tieuDe: string; batBuoc?: boolean; rong: number; ghiChu?: string };
export const MAU: Record<string, CotMau[]> = {
  Ho: [
    { khoa: "ma", tieuDe: "Mã hộ", batBuoc: true, rong: 10, ghiChu: "Duy nhất trong dự án, vd. H01" },
    { khoa: "ten", tieuDe: "Họ tên / tên tổ chức", batBuoc: true, rong: 28 },
    { khoa: "loai", tieuDe: "Loại đối tượng", rong: 16, ghiChu: "Hộ gia đình | Cá nhân | Tổ chức (bỏ trống = Hộ gia đình)" },
    { khoa: "diaChi", tieuDe: "Địa chỉ", rong: 30 },
    { khoa: "soDinhDanh", tieuDe: "Số định danh / CCCD", rong: 18 },
    { khoa: "dienThoai", tieuDe: "Điện thoại", rong: 14 },
    { khoa: "khauTru", tieuDe: "Khấu trừ nghĩa vụ tài chính (đồng)", rong: 18 },
  ],
  NhanKhau: [
    { khoa: "maHo", tieuDe: "Mã hộ", batBuoc: true, rong: 10 },
    { khoa: "hoTen", tieuDe: "Họ tên", batBuoc: true, rong: 28 },
    { khoa: "namSinh", tieuDe: "Năm sinh", rong: 10 },
    { khoa: "quanHe", tieuDe: "Quan hệ với chủ hộ", rong: 18 },
  ],
  Thua: [
    { khoa: "maHo", tieuDe: "Mã hộ", batBuoc: true, rong: 10 },
    { khoa: "soTo", tieuDe: "Tờ bản đồ", batBuoc: true, rong: 10 },
    { khoa: "soThua", tieuDe: "Số thửa", batBuoc: true, rong: 10 },
    { khoa: "loaiDat", tieuDe: "Loại đất (mã)", batBuoc: true, rong: 12, ghiChu: "Theo trang LoaiDat, vd. LUC, CLN, ONT" },
    { khoa: "dienTich", tieuDe: "DT thửa (m²)", rong: 12 },
    { khoa: "dienTichThuHoi", tieuDe: "DT thu hồi (m²)", batBuoc: true, rong: 14 },
    { khoa: "nguonGoc", tieuDe: "Nguồn gốc sử dụng đất", rong: 30 },
    { khoa: "ghiChu", tieuDe: "Ghi chú", rong: 24 },
  ],
  KiemDem: [
    { khoa: "maHo", tieuDe: "Mã hộ", batBuoc: true, rong: 10 },
    { khoa: "soTo", tieuDe: "Tờ bản đồ", batBuoc: true, rong: 10 },
    { khoa: "soThua", tieuDe: "Số thửa", batBuoc: true, rong: 10 },
    { khoa: "maDonGia", tieuDe: "Mã đơn giá", batBuoc: true, rong: 26, ghiChu: "Chép từ trang DanhMucDonGia (QĐ 32 hoặc PL VIII)" },
    { khoa: "khoiLuong", tieuDe: "Khối lượng / số lượng", batBuoc: true, rong: 14, ghiChu: "Số hoặc biểu thức =10*9,8" },
    { khoa: "dot", tieuDe: "Đợt kiểm đếm", rong: 10, ghiChu: "Bỏ trống = 1" },
    { khoa: "ghiChu", tieuDe: "Ghi chú", rong: 24 },
  ],
};

const TEN_TRANG: Record<string, string> = { Ho: "Ho", NhanKhau: "NhanKhau", Thua: "Thua", KiemDem: "KiemDem" };

async function excel() {
  const { default: E } = await import("exceljs");
  return E;
}

/** Tệp mẫu nhập liệu (kèm hướng dẫn, danh mục loại đất, danh mục mã đơn giá). */
export async function taoMauNhap(): Promise<Uint8Array> {
  const E = await excel();
  const wb = new E.Workbook();
  wb.creator = "GPMB Sơn La";
  const hd = wb.addWorksheet("HuongDan");
  hd.getColumn(1).width = 120;
  [
    "MẪU NHẬP HỒ SƠ – PHẦN MỀM GPMB SƠN LA",
    "",
    "1. Điền các trang Ho, NhanKhau, Thua, KiemDem; giữ nguyên dòng tiêu đề (dòng 1). Cột có dấu * là bắt buộc.",
    "2. Trang Ho chỉ tạo hồ sơ MỚI. Mã hộ trùng hồ sơ đã có trong dự án sẽ bị báo lỗi.",
    "3. Trang Thua, KiemDem có thể bổ sung cho hồ sơ đã có (ghi đúng mã hộ).",
    "4. Số liệu: nhập dạng SỐ trong Excel. Nếu nhập dạng chữ, dùng dấu phẩy cho phần thập phân (vd. 125,5). Chuỗi như \"1.234\" không rõ là 1,234 hay 1234 → bị báo lỗi.",
    "5. KiemDem: mã đơn giá chép từ trang DanhMucDonGia. Nhà, công trình nhập vào tính theo thiệt hại thực tế, cán bộ bổ sung thời gian sử dụng (T, T1) trong phần mềm.",
    "6. Phần mềm kiểm tra toàn bộ tệp trước; còn lỗi thì không nhập dòng nào.",
    "7. Giá đất, hỗ trợ, phân lớp… chọn trong phần mềm sau khi nhập (có căn cứ).",
  ].forEach((d, i) => {
    hd.getCell(i + 1, 1).value = d;
    if (i === 0) hd.getCell(1, 1).font = { bold: true, size: 13 };
  });
  for (const [ten, cot] of Object.entries(MAU)) {
    const ws = wb.addWorksheet(TEN_TRANG[ten]!);
    ws.columns = cot.map((c) => ({ header: c.tieuDe + (c.batBuoc ? " *" : ""), key: c.khoa, width: c.rong }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { wrapText: true, vertical: "middle" };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    cot.forEach((c, i) => c.ghiChu && (ws.getCell(1, i + 1).note = c.ghiChu));
    for (const c of cot) if (["soTo", "soThua", "ma", "maHo", "soDinhDanh", "dienThoai"].includes(c.khoa)) ws.getColumn(c.khoa).numFmt = "@";
  }
  const ld = wb.addWorksheet("LoaiDat");
  ld.columns = [{ header: "Mã", key: "ma", width: 8 }, { header: "Loại đất", key: "ten", width: 50 }];
  ld.getRow(1).font = { bold: true };
  for (const [ma, ten] of Object.entries(TEN_LOAI_DAT)) ld.addRow({ ma, ten });
  const dm = wb.addWorksheet("DanhMucDonGia");
  dm.columns = [
    { header: "Mã đơn giá", key: "ma", width: 26 },
    { header: "Nguồn", key: "nguon", width: 9 },
    { header: "Nhóm", key: "nhom", width: 40 },
    { header: "Tên", key: "ten", width: 50 },
    { header: "ĐVT", key: "dvt", width: 10 },
    { header: "Đơn giá (đ)", key: "gia", width: 14 },
  ];
  dm.getRow(1).font = { bold: true };
  for (const r of DON_GIA) if (r.nguon !== "PL V") dm.addRow({ ma: r.ma, nguon: r.nguon, nhom: r.nhom, ten: r.ten, dvt: r.donVi, gia: r.donGia });
  dm.getColumn("gia").numFmt = "#,##0";
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** Giá trị ô dạng chuỗi (bỏ công thức, rich text). */
function chuO(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("result" in v) return chuO(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return "";
  }
  return String(v).trim();
}

/** Số từ ô: số Excel dùng nguyên; chữ theo kiểu Việt Nam (phẩy thập phân); mơ hồ → lỗi. */
export function docSo(v: ExcelJS.CellValue): { so: string | null; loi: string | null } {
  if (v == null || v === "") return { so: null, loi: null };
  if (typeof v === "number") return { so: D(v).toFixed(), loi: null };
  if (typeof v === "object" && v && "result" in v) return docSo(v.result as ExcelJS.CellValue);
  const s = chuO(v).replace(/\s/g, "");
  if (!s) return { so: null, loi: null };
  if (/^-?\d+$/.test(s)) return { so: s, loi: null };
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return { so: null, loi: `"${s}" không rõ dấu chấm là phân cách nghìn hay thập phân — nhập dạng số hoặc dùng dấu phẩy thập phân` };
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(s) || /^-?\d+,\d+$/.test(s)) return { so: s.replace(/\./g, "").replace(",", "."), loi: null };
  if (/^-?\d+\.\d+$/.test(s)) return { so: s, loi: null };
  return { so: null, loi: `"${s}" không phải số` };
}


/* ============================ Ánh xạ cột ============================ */

export type LoaiTrang = "Ho" | "NhanKhau" | "Thua" | "KiemDem";
export const LOAI_TRANG: LoaiTrang[] = ["Ho", "NhanKhau", "Thua", "KiemDem"];
export const TEN_LOAI_TRANG: Record<LoaiTrang, string> = { Ho: "Hộ, cá nhân, tổ chức", NhanKhau: "Nhân khẩu", Thua: "Thửa đất", KiemDem: "Kiểm đếm tài sản" };

export interface TruongNhap {
  khoa: string;
  tieuDe: string;
  /** Bắt buộc phải chọn cột. */
  batBuoc?: boolean;
  /** Cần một trong các trường cùng nhóm (vd. mã hộ hoặc tên chủ). */
  motTrong?: string;
  ghiChu?: string;
  /** Tên cột thường gặp (viết không dấu, thường) — dùng để tự nhận diện. */
  dongNghia: string[];
}

const TEN_CHU = ["ho ten", "ho va ten", "ho ten chu ho", "ho va ten chu ho", "ten chu ho", "chu ho", "ten chu su dung", "chu su dung", "nguoi su dung", "ho ten nguoi su dung", "ten to chuc", "ten ho", "ten ho gia dinh ca nhan", "ho gia dinh ca nhan", "ten nguoi su dung dat", "ho ten chu su dung dat"];
const DIA_CHI = ["dia chi", "noi o", "noi thuong tru", "dia chi thuong tru", "thon ban", "ban", "thon", "to dan pho", "tieu khu", "dia chi lien he"];

export const TRUONG: Record<LoaiTrang, TruongNhap[]> = {
  Ho: [
    { khoa: "ma", tieuDe: "Mã hộ", ghiChu: "Không có cột → phần mềm tự đánh mã H001, H002…", dongNghia: ["ma ho", "ma so ho", "ma doi tuong", "ma ho so", "ma"] },
    { khoa: "ten", tieuDe: "Họ tên / tên tổ chức", batBuoc: true, dongNghia: TEN_CHU },
    { khoa: "loai", tieuDe: "Loại đối tượng", dongNghia: ["loai doi tuong", "doi tuong", "loai chu"] },
    { khoa: "diaChi", tieuDe: "Địa chỉ", dongNghia: DIA_CHI },
    { khoa: "soDinhDanh", tieuDe: "Số định danh / CCCD", dongNghia: ["so dinh danh", "dinh danh", "cccd", "so cccd", "can cuoc", "can cuoc cong dan", "cmnd", "so cmnd", "cmnd cccd"] },
    { khoa: "dienThoai", tieuDe: "Điện thoại", dongNghia: ["dien thoai", "so dien thoai", "sdt", "dt lien he"] },
    { khoa: "khauTru", tieuDe: "Khấu trừ nghĩa vụ tài chính (đồng)", dongNghia: ["khau tru", "khau tru nghia vu tai chinh", "nghia vu tai chinh", "tien khau tru"] },
  ],
  NhanKhau: [
    { khoa: "maHo", tieuDe: "Mã hộ", batBuoc: true, dongNghia: ["ma ho", "ma so ho", "ma ho so"] },
    { khoa: "hoTen", tieuDe: "Họ tên", batBuoc: true, dongNghia: ["ho ten", "ho va ten", "ten nhan khau", "thanh vien", "ho ten thanh vien"] },
    { khoa: "namSinh", tieuDe: "Năm sinh", dongNghia: ["nam sinh", "ngay sinh", "ngay thang nam sinh"] },
    { khoa: "quanHe", tieuDe: "Quan hệ với chủ hộ", dongNghia: ["quan he", "quan he voi chu ho", "quan he chu ho"] },
  ],
  Thua: [
    { khoa: "maHo", tieuDe: "Mã hộ", motTrong: "chu", ghiChu: "Hoặc chọn cột Tên chủ sử dụng để phần mềm nhóm thửa theo chủ", dongNghia: ["ma ho", "ma so ho", "ma ho so"] },
    { khoa: "tenChu", tieuDe: "Tên chủ sử dụng", motTrong: "chu", ghiChu: "Dùng khi tệp không có mã hộ: thửa cùng tên (và địa chỉ) gộp một hồ sơ", dongNghia: TEN_CHU },
    { khoa: "diaChiChu", tieuDe: "Địa chỉ chủ sử dụng", dongNghia: DIA_CHI },
    { khoa: "soTo", tieuDe: "Tờ bản đồ", batBuoc: true, dongNghia: ["to ban do", "so to", "so to ban do", "to bd", "to so", "to"] },
    { khoa: "soThua", tieuDe: "Số thửa", batBuoc: true, dongNghia: ["so thua", "thua so", "thua dat so", "so hieu thua", "thua"] },
    { khoa: "loaiDat", tieuDe: "Loại đất (mã)", batBuoc: true, ghiChu: "Mã (LUC, CLN, ONT…) hoặc đúng tên loại đất", dongNghia: ["loai dat", "ma loai dat", "muc dich su dung", "muc dich su dung dat", "mdsd", "ky hieu loai dat"] },
    { khoa: "dienTich", tieuDe: "DT thửa (m²)", dongNghia: ["dien tich thua", "dt thua", "dien tich thua dat", "tong dien tich", "dien tich", "dien tich m", "dien tich theo ban do"] },
    { khoa: "dienTichThuHoi", tieuDe: "DT thu hồi (m²)", batBuoc: true, dongNghia: ["dien tich thu hoi", "dt thu hoi", "thu hoi", "dien tich bi thu hoi", "dien tich anh huong", "dien tich thu hoi m", "dien tich thu hoi dat"] },
    { khoa: "nguonGoc", tieuDe: "Nguồn gốc sử dụng đất", dongNghia: ["nguon goc", "nguon goc su dung dat", "nguon goc dat"] },
    { khoa: "ghiChu", tieuDe: "Ghi chú", dongNghia: ["ghi chu"] },
  ],
  KiemDem: [
    { khoa: "maHo", tieuDe: "Mã hộ", ghiChu: "Không có cột → tìm hồ sơ theo tờ, thửa", dongNghia: ["ma ho", "ma so ho", "ma ho so"] },
    { khoa: "soTo", tieuDe: "Tờ bản đồ", batBuoc: true, dongNghia: ["to ban do", "so to", "to bd", "to so", "to"] },
    { khoa: "soThua", tieuDe: "Số thửa", batBuoc: true, dongNghia: ["so thua", "thua so", "thua"] },
    { khoa: "maDonGia", tieuDe: "Mã đơn giá", batBuoc: true, dongNghia: ["ma don gia", "ma dg", "ma hieu don gia", "ma"] },
    { khoa: "khoiLuong", tieuDe: "Khối lượng / số lượng", batBuoc: true, dongNghia: ["khoi luong", "so luong", "kl", "khoi luong so luong", "so luong khoi luong"] },
    { khoa: "dot", tieuDe: "Đợt kiểm đếm", dongNghia: ["dot", "dot kiem dem"] },
    { khoa: "ghiChu", tieuDe: "Ghi chú", dongNghia: ["ghi chu"] },
  ],
};

export interface AnhXaTrang {
  /** Tên trang trong tệp; null = không nhập loại dữ liệu này. */
  trang: string | null;
  /** Dòng tiêu đề (từ 1). Dữ liệu bắt đầu từ dòng kế tiếp. */
  dongTieuDe: number;
  /** Trường → số cột (từ 1); null/thiếu = không có. */
  cot: Record<string, number | null>;
}
export type AnhXa = Record<LoaiTrang, AnhXaTrang>;

export interface TepExcel {
  wb: ExcelJS.Workbook;
  trang: { ten: string; soDong: number; soCot: number }[];
}

const MAX_COT = 80;
const MAX_DONG_TIEU_DE = 20;

/** Chuẩn hóa để so tên cột: bỏ dấu, thường, chỉ chữ số. */
export function chuanTen(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const chuCot = (n: number): string => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

export async function moTepExcel(bytes: Uint8Array | ArrayBuffer): Promise<TepExcel> {
  const E = await excel();
  const wb = new E.Workbook();
  await wb.xlsx.load(bytes as ArrayBuffer);
  return { wb, trang: wb.worksheets.map((w) => ({ ten: w.name, soDong: w.rowCount, soCot: Math.min(w.columnCount, MAX_COT) })) };
}

/**
 * Nhãn các cột ở dòng tiêu đề `dong`. Tiêu đề gộp 2 dòng (ô trên được gộp ngang, vd. "Diện tích (m²)" trên
 * "Thửa đất" | "Thu hồi") → ghép "ô trên + ô dưới".
 */
export function nhanCot(tep: TepExcel, trang: string, dong: number): string[] {
  const ws = tep.wb.getWorksheet(trang);
  if (!ws) return [];
  const n = Math.min(ws.columnCount, MAX_COT);
  const out: string[] = [];
  for (let c = 1; c <= n; c++) {
    const duoi = chuO(ws.getCell(dong, c).value);
    let tren = "";
    if (dong > 1) {
      const o = ws.getCell(dong - 1, c);
      if (o.isMerged && o.master.col !== o.col) tren = chuO(o.value);
      else if (o.isMerged && o.master.row === o.row) {
        // ô gộp ngang bắt đầu tại cột này
        const ke = ws.getCell(dong - 1, c + 1);
        if (ke.isMerged && ke.master.address === o.address) tren = chuO(o.value);
      }
    }
    out.push(tren && tren !== duoi ? `${tren} ${duoi}`.trim() : duoi);
  }
  return out;
}

/** Ghép cột với trường theo tên: khớp đúng > chứa cụm dài hơn; mỗi cột, mỗi trường dùng một lần. */
function ghepCot(nhan: string[], truong: TruongNhap[]): { cot: Record<string, number | null>; diem: number } {
  const ungVien: { khoa: string; c: number; d: number }[] = [];
  nhan.forEach((n, i) => {
    const h = chuanTen(n.replace(/\*/g, ""));
    if (!h) return;
    for (const t of truong) {
      let d = 0;
      for (const s of [chuanTen(t.tieuDe), ...t.dongNghia]) {
        if (!s) continue;
        if (h === s) d = Math.max(d, 100 + s.length);
        else if (` ${h} `.includes(` ${s} `)) d = Math.max(d, s.length);
      }
      if (d) ungVien.push({ khoa: t.khoa, c: i + 1, d });
    }
  });
  ungVien.sort((a, b) => b.d - a.d || a.c - b.c);
  const cot: Record<string, number | null> = Object.fromEntries(truong.map((t) => [t.khoa, null]));
  const daDung = new Set<number>();
  let diem = 0;
  for (const u of ungVien) {
    if (cot[u.khoa] !== null || daDung.has(u.c)) continue;
    cot[u.khoa] = u.c;
    daDung.add(u.c);
    diem += u.d;
  }
  // Nhiều trường khớp hơn thắng trước (tiêu đề 2 tầng: dòng dưới tách được "DT thửa" | "DT thu hồi")
  return { cot, diem: daDung.size * 1000 + diem };
}

/** Trang có đủ cột tối thiểu cho loại dữ liệu không. */
function duCot(loai: LoaiTrang, cot: Record<string, number | null>): boolean {
  const co = (k: string) => cot[k] != null;
  switch (loai) {
    case "Ho": return co("ten") && !co("soThua");
    case "NhanKhau": return co("maHo") && co("hoTen") && (co("namSinh") || co("quanHe"));
    case "Thua": return co("soThua") && co("soTo") && (co("dienTichThuHoi") || co("dienTich"));
    case "KiemDem": return co("maDonGia") && co("khoiLuong");
  }
}

/** Ánh xạ tự đoán cho một trang, loại dữ liệu cho trước (dò dòng tiêu đề trong 20 dòng đầu). */
export function goiYTrang(tep: TepExcel, trang: string, loai: LoaiTrang): AnhXaTrang & { diem: number; du: boolean } {
  const ws = tep.wb.getWorksheet(trang);
  let tot: AnhXaTrang & { diem: number; du: boolean } = { trang, dongTieuDe: 1, cot: Object.fromEntries(TRUONG[loai].map((t) => [t.khoa, null])), diem: 0, du: false };
  if (!ws) return tot;
  for (let r = 1; r <= Math.min(ws.rowCount, MAX_DONG_TIEU_DE); r++) {
    const g = ghepCot(nhanCot(tep, trang, r), TRUONG[loai]);
    const du = duCot(loai, g.cot);
    if ((du && !tot.du) || (du === tot.du && g.diem > tot.diem)) tot = { trang, dongTieuDe: r, cot: g.cot, diem: g.diem, du };
  }
  return tot;
}

/**
 * Tự đoán ánh xạ cho cả tệp: mỗi trang dùng cho tối đa một loại dữ liệu; trang trùng tên mẫu (Ho, Thua…) được ưu tiên.
 * Kết quả chỉ là gợi ý — cán bộ xem và chỉnh trên màn hình trước khi nhập.
 */
export function goiYAnhXa(tep: TepExcel): AnhXa {
  const ungVien: { loai: LoaiTrang; g: ReturnType<typeof goiYTrang>; d: number }[] = [];
  for (const { ten } of tep.trang)
    for (const loai of LOAI_TRANG) {
      const g = goiYTrang(tep, ten, loai);
      if (g.du) ungVien.push({ loai, g, d: g.diem + (ten === loai ? 1e6 : 0) });
    }
  ungVien.sort((a, b) => b.d - a.d);
  const ax = Object.fromEntries(LOAI_TRANG.map((l) => [l, { trang: null, dongTieuDe: 1, cot: {} }])) as AnhXa;
  const daDung = new Set<string>();
  for (const u of ungVien) {
    if (ax[u.loai].trang !== null || daDung.has(u.g.trang!)) continue;
    ax[u.loai] = { trang: u.g.trang, dongTieuDe: u.g.dongTieuDe, cot: u.g.cot };
    daDung.add(u.g.trang!);
  }
  return ax;
}

type DongDoc = { dong: number; o: Record<string, ExcelJS.CellValue> };

/** Đọc các dòng dữ liệu theo ánh xạ; bỏ dòng đánh số cột, dòng tổng, dòng trống (trả về số dòng bỏ qua). */
function docDong(tep: TepExcel, ax: AnhXaTrang): { ds: DongDoc[]; boQua: number[] } {
  const ws = ax.trang ? tep.wb.getWorksheet(ax.trang) : undefined;
  if (!ws) return { ds: [], boQua: [] };
  const cot = Object.entries(ax.cot).filter((x): x is [string, number] => x[1] != null);
  const ds: DongDoc[] = [];
  const boQua: number[] = [];
  for (let r = ax.dongTieuDe + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const o = Object.fromEntries(cot.map(([k, c]) => [k, row.getCell(c).value]));
    const chu = cot.map(([k]) => chuO(o[k]));
    if (chu.every((x) => x === "")) continue;
    const coGiaTri = chu.filter(Boolean);
    const laDanhSo = coGiaTri.length >= 3 && coGiaTri.every((x) => /^\(?\d{1,2}\)?$/.test(x)) && coGiaTri.map((x) => Number(x.replace(/\D/g, ""))).every((v, i, a) => i === 0 || v > a[i - 1]!);
    const laTong = coGiaTri.some((x) => /^(tổng cộng|tổng số|tổng|cộng)\s*[:.]?\s*$/i.test(x) || /^tổng cộng\s/i.test(x));
    if (laDanhSo || laTong) { boQua.push(r); continue; }
    ds.push({ dong: r, o });
  }
  return { ds, boQua };
}

/** Xem trước n dòng đầu theo ánh xạ hiện tại (giá trị dạng chuỗi). */
export function xemTruoc(tep: TepExcel, ax: AnhXaTrang, n = 5): { dong: number; gt: Record<string, string> }[] {
  return docDong(tep, ax).ds.slice(0, n).map(({ dong, o }) => ({ dong, gt: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, chuO(v)])) }));
}

const LOAI: Record<string, LoaiDoiTuong> = { "": "HO_GIA_DINH", "ho gia dinh": "HO_GIA_DINH", "ho": "HO_GIA_DINH", "ca nhan": "CA_NHAN", "to chuc": "TO_CHUC" };
const LA_TO_CHUC = /ubnd|uy ban|cong ty|hop tac xa|to chuc|ban quan ly|truong|cong dong|doanh nghiep|chi nhanh|tram|benh vien|don vi/;
const MA_LOAI_THEO_TEN = new Map(Object.entries(TEN_LOAI_DAT).map(([ma, ten]) => [chuanTen(ten), ma]));

/** Kiểm tra (không ghi gì vào kho) theo ánh xạ đã chọn. */
export function kiemTraNhap(tep: TepExcel, ax: AnhXa, duAn: DuAn, hienCoTatCa: Ho[], tenTep = "tệp Excel", nguoi = ""): KetQuaNhap {
  // Hồ sơ trong thùng rác: chỉ giữ mã (không dùng lại), không bổ sung dữ liệu vào (P0-3, P0-4)
  const hienCo = hienCoTatCa.filter((h) => !h.daXoa);
  const loi: LoiNhap[] = [];
  const tenTruong = (l: LoaiTrang, khoa: string) => {
    const t = TRUONG[l].find((x) => x.khoa === khoa);
    const c = ax[l].cot[khoa];
    return `${c ? `${chuCot(c)} – ` : ""}${t?.tieuDe ?? khoa}`;
  };
  const trangCua = (l: LoaiTrang) => ax[l].trang ?? l;
  const bao = (l: LoaiTrang, dong: number, khoa: string, noiDung: string, muc: LoiNhap["muc"] = "LOI") => loi.push({ trang: trangCua(l), dong, cot: khoa ? tenTruong(l, khoa) : "", noiDung, muc });
  const co = (l: LoaiTrang, k: string) => ax[l].cot[k] != null;

  const dungLoai = LOAI_TRANG.filter((l) => ax[l].trang);
  if (!dungLoai.length) loi.push({ trang: "", dong: 0, cot: "", noiDung: "Chưa nhận ra trang dữ liệu nào — chọn trang và cột ở phần Ánh xạ cột (hoặc dùng tệp mẫu của phần mềm)", muc: "LOI" });
  for (const l of dungLoai) {
    if (!tep.wb.getWorksheet(ax[l].trang!)) { bao(l, 0, "", `Không có trang "${ax[l].trang}" trong tệp`); continue; }
    for (const t of TRUONG[l]) if (t.batBuoc && !co(l, t.khoa)) bao(l, ax[l].dongTieuDe, "", `Chưa chọn cột cho trường bắt buộc "${t.tieuDe}"`);
    if (l === "Thua" && !co(l, "maHo") && !co(l, "tenChu")) bao(l, ax[l].dongTieuDe, "", `Chưa chọn cột "Mã hộ" hoặc "Tên chủ sử dụng" — không biết thửa thuộc hồ sơ nào`);
  }
  const rong = { loi, hoMoi: [], hoBoSung: [], dem: { ho: 0, nhanKhau: 0, thua: 0, kiemDem: 0 } };
  if (loi.length) return rong;

  const doc = (l: LoaiTrang) => {
    if (!ax[l].trang) return [];
    const { ds, boQua } = docDong(tep, ax[l]);
    if (boQua.length) bao(l, 0, "", `Bỏ qua ${boQua.length} dòng đánh số cột / dòng tổng: dòng ${boQua.slice(0, 8).join(", ")}${boQua.length > 8 ? "…" : ""}`, "CANH_BAO");
    return ds;
  };

  const nhatKy = { luc: new Date().toISOString(), nguoi, noiDung: `Nhập từ Excel (${tenTep})` };
  const theoMaCu = new Map(hienCoTatCa.map((h) => [h.ma.toLowerCase(), h]));
  const moi = new Map<string, Ho>();
  const boSung = new Map<string, Ho>();
  const dinhDanh = new Map(hienCo.filter((h) => h.soDinhDanh).map((h) => [h.soDinhDanh, h.ma]));
  const dem = { ho: 0, nhanKhau: 0, thua: 0, kiemDem: 0 };
  const soLoi = () => loi.filter((l) => l.muc === "LOI").length;
  const maDaDung = new Set([...hienCoTatCa.map((h) => h.ma.toLowerCase())]);
  // Mã tự đánh theo mẫu mã của dự án, tiếp số lớn nhất đang dùng (P0-3)
  const maTuDong = () => {
    const m = maHoTiepTheo(maDaDung, mauMaCua(duAn));
    maDaDung.add(m.toLowerCase());
    return m;
  };
  const loaiTheoTen = (ten: string): LoaiDoiTuong => (LA_TO_CHUC.test(chuanTen(ten)) ? "TO_CHUC" : "HO_GIA_DINH");
  const khoaChu = (ten: string, diaChi: string) => `${chuanTen(ten)}|${chuanTen(diaChi)}`;
  const theoChu = new Map<string, Ho>();
  let soMaTuDong = 0;

  const dsHo = doc("Ho");
  // Mã có sẵn trong tệp được giữ trước, mã tự đánh lấy số còn trống
  for (const { o } of dsHo) { const m = chuO(o.ma).toLowerCase(); if (m) maDaDung.add(m); }
  const maTrongTep = new Set<string>();
  for (const { dong, o } of dsHo) {
    const loiTruoc = soLoi();
    let ma = chuO(o.ma);
    const ten = chuO(o.ten);
    if (!ten) { bao("Ho", dong, "ten", "Thiếu họ tên"); continue; }
    if (ma && theoMaCu.has(ma.toLowerCase())) { bao("Ho", dong, "ma", `Mã ${ma} trùng hồ sơ đã có trong dự án`); continue; }
    if (ma && maTrongTep.has(ma.toLowerCase())) { bao("Ho", dong, "ma", `Mã ${ma} lặp lại trong tệp`); continue; }
    if (!ma) { ma = maTuDong(); soMaTuDong++; }
    maTrongTep.add(ma.toLowerCase());
    const loaiS = chuO(o.loai);
    const loai = co("Ho", "loai") ? LOAI[chuanTen(loaiS)] : loaiTheoTen(ten);
    if (!loai) bao("Ho", dong, "loai", `"${loaiS}" không phải Hộ gia đình / Cá nhân / Tổ chức`);
    const kt = docSo(o.khauTru);
    if (kt.loi) bao("Ho", dong, "khauTru", kt.loi);
    if (soLoi() > loiTruoc) continue;
    const h = hoMoi(duAn.id, ma, ten, loai ?? "HO_GIA_DINH");
    h.diaChi = chuO(o.diaChi);
    h.soDinhDanh = chuO(o.soDinhDanh);
    h.dienThoai = chuO(o.dienThoai);
    h.khauTru = kt.so ?? "0";
    h.nhatKy = [nhatKy];
    if (h.soDinhDanh) {
      const trung = dinhDanh.get(h.soDinhDanh);
      if (trung) bao("Ho", dong, "soDinhDanh", `Số định danh trùng với hộ ${trung} — kiểm tra có nhập trùng người`, "CANH_BAO");
      dinhDanh.set(h.soDinhDanh, ma);
    }
    moi.set(ma.toLowerCase(), h);
    theoChu.set(khoaChu(ten, h.diaChi), h);
    dem.ho++;
  }

  const boSungTu = (cu: Ho): Ho => {
    if (!boSung.has(cu.id)) boSung.set(cu.id, { ...structuredClone(cu), nhatKy: [...cu.nhatKy, nhatKy] });
    return boSung.get(cu.id)!;
  };
  const layHo = (l: LoaiTrang, dong: number, v: ExcelJS.CellValue): Ho | null => {
    const ma = chuO(v).toLowerCase();
    if (!ma) { bao(l, dong, "maHo", "Thiếu mã hộ"); return null; }
    const h = moi.get(ma);
    if (h) return h;
    const cu = theoMaCu.get(ma);
    if (!cu) { bao(l, dong, "maHo", `Không có hộ mã ${chuO(v)} (trong trang hộ hoặc trong dự án)`); return null; }
    return boSungTu(cu);
  };
  /** Thửa không có mã hộ: tìm/tạo hồ sơ theo tên chủ (+ địa chỉ). Trùng tên có thể là người khác → cảnh báo. */
  const hoTheoChu = (dong: number, ten: string, diaChi: string): Ho => {
    const k = khoaChu(ten, diaChi);
    const daCo = theoChu.get(k);
    if (daCo) return daCo;
    const cu = hienCo.filter((h) => khoaChu(h.ten, co("Thua", "diaChiChu") ? h.diaChi : "") === k);
    if (cu.length === 1) {
      bao("Thua", dong, "tenChu", `Gắn vào hồ sơ đã có ${cu[0]!.ma} (cùng tên${co("Thua", "diaChiChu") ? ", địa chỉ" : ""}) — kiểm tra đúng người`, "CANH_BAO");
      const h = boSungTu(cu[0]!);
      theoChu.set(k, h);
      return h;
    }
    const h = hoMoi(duAn.id, maTuDong(), ten, loaiTheoTen(ten));
    h.diaChi = diaChi;
    h.nhatKy = [nhatKy];
    moi.set(h.ma.toLowerCase(), h);
    theoChu.set(k, h);
    soMaTuDong++;
    dem.ho++;
    return h;
  };

  for (const { dong, o } of doc("NhanKhau")) {
    const loiTruoc = soLoi();
    const h = layHo("NhanKhau", dong, o.maHo);
    const hoTen = chuO(o.hoTen);
    if (!hoTen) bao("NhanKhau", dong, "hoTen", "Thiếu họ tên");
    let ns = chuO(o.namSinh);
    // Ngày sinh đầy đủ (dd/mm/yyyy hoặc ô ngày Excel) → lấy năm; dạng khác không tự hiểu
    const nam = ns.match(/^\d{1,2}[/.-]\d{1,2}[/.-](\d{4})$/) ?? ns.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (ns && !/^\d{4}$/.test(ns) && nam) ns = nam[1]!;
    if (ns && !/^\d{4}$/.test(ns)) bao("NhanKhau", dong, "namSinh", `"${ns}" không phải năm (4 chữ số)`);
    if (!h || !hoTen || soLoi() > loiTruoc) continue;
    h.nhanKhau.push({ id: taoId(), hoTen, namSinh: ns || undefined, quanHe: chuO(o.quanHe) });
    dem.nhanKhau++;
  }

  const toThua = new Map<string, string>();
  for (const h of hienCo) for (const t of h.thua) toThua.set(`${t.soTo}/${t.soThua}`, h.ma);
  let chuTruoc: { ten: string; diaChi: string; dong: number } | null = null;
  for (const { dong, o } of doc("Thua")) {
    const loiTruoc = soLoi();
    const soTo = chuO(o.soTo);
    const soThua = chuO(o.soThua);
    let ten = chuO(o.tenChu);
    let diaChi = chuO(o.diaChiChu);
    const maHo = chuO(o.maHo);
    // Dòng tiêu đề nhóm (vd. "Thôn Bản Mé"): chỉ có chữ, không có tờ/thửa/diện tích → bỏ qua, có ghi lại
    if (!soTo && !soThua && !chuO(o.dienTich) && !chuO(o.dienTichThuHoi) && !chuO(o.loaiDat)) {
      bao("Thua", dong, "", `Bỏ qua dòng không có tờ, thửa, diện tích ("${[maHo, ten, diaChi].filter(Boolean).join(" – ")}")`, "CANH_BAO");
      if (ten) chuTruoc = null;
      continue;
    }
    let h: Ho | null = null;
    if (maHo || (co("Thua", "maHo") && !co("Thua", "tenChu"))) h = layHo("Thua", dong, o.maHo);
    else {
      if (!ten && chuTruoc) {
        ten = chuTruoc.ten;
        diaChi = diaChi || chuTruoc.diaChi;
        bao("Thua", dong, "tenChu", `Không ghi chủ sử dụng — lấy theo dòng ${chuTruoc.dong} (${ten}); kiểm tra`, "CANH_BAO");
      }
      if (!ten) bao("Thua", dong, "tenChu", "Thiếu mã hộ và tên chủ sử dụng");
      else h = hoTheoChu(dong, ten, diaChi);
      if (ten && chuO(o.tenChu)) chuTruoc = { ten, diaChi, dong };
    }
    let loaiDat = chuO(o.loaiDat).toUpperCase();
    if (loaiDat && !TEN_LOAI_DAT[loaiDat]) {
      const ma = MA_LOAI_THEO_TEN.get(chuanTen(chuO(o.loaiDat)));
      if (ma) loaiDat = ma;
    }
    if (!soTo) bao("Thua", dong, "soTo", "Thiếu số tờ");
    if (!soThua) bao("Thua", dong, "soThua", "Thiếu số thửa");
    if (!loaiDat) bao("Thua", dong, "loaiDat", "Thiếu loại đất");
    else if (!TEN_LOAI_DAT[loaiDat]) bao("Thua", dong, "loaiDat", `Mã loại đất "${loaiDat}" không có trong danh mục — kiểm tra lại (giá đất sẽ phải chọn tay)`, "CANH_BAO");
    const dt = docSo(o.dienTich);
    const dtth = docSo(o.dienTichThuHoi);
    if (dt.loi) bao("Thua", dong, "dienTich", dt.loi);
    else if (!dt.so) bao("Thua", dong, "dienTich", "Chưa có DT thửa — không xác định được thu hồi toàn bộ hay một phần thửa", "CANH_BAO");
    if (dtth.loi) bao("Thua", dong, "dienTichThuHoi", dtth.loi);
    else if (!dtth.so) bao("Thua", dong, "dienTichThuHoi", "Thiếu diện tích thu hồi");
    else if (D(dtth.so).lte(0)) bao("Thua", dong, "dienTichThuHoi", "Diện tích thu hồi phải lớn hơn 0");
    if (dt.so && dtth.so && D(dtth.so).gt(dt.so)) bao("Thua", dong, "dienTichThuHoi", `DT thu hồi ${dtth.so} lớn hơn DT thửa ${dt.so}`);
    if (!h || !soTo || !soThua || soLoi() > loiTruoc) continue;
    if (h.thua.some((t) => t.soTo === soTo && t.soThua === soThua)) { bao("Thua", dong, "soThua", `Hộ ${h.ma} đã có thửa ${soThua} tờ ${soTo}`); continue; }
    const khac = toThua.get(`${soTo}/${soThua}`);
    if (khac && khac !== h.ma) bao("Thua", dong, "soThua", `Thửa ${soThua} tờ ${soTo} cũng có ở hộ ${khac} — kiểm tra (đồng sử dụng hay nhập nhầm)`, "CANH_BAO");
    toThua.set(`${soTo}/${soThua}`, h.ma);
    const t: Thua = { id: taoId(), soTo, soThua, loaiDat, dienTich: dt.so ?? "", dienTichThuHoi: dtth.so ?? "", nguonGoc: chuO(o.nguonGoc), gia: null, ghiChu: chuO(o.ghiChu) || undefined };
    h.thua.push(t);
    dem.thua++;
  }
  if (soMaTuDong) loi.push({ trang: "", dong: 0, cot: "", noiDung: `${soMaTuDong} hồ sơ được tự đánh mã (H001…) vì tệp không có mã hộ; các thửa cùng tên chủ${co("Thua", "diaChiChu") ? " và địa chỉ" : ""} gộp một hồ sơ — trùng tên có thể là người khác, kiểm tra trước khi nhập`, muc: "CANH_BAO" });

  const donGia = new Map(DON_GIA.filter((r) => r.nguon !== "PL V").map((r) => [r.ma, r]));
  const tatCaHo = () => [...moi.values(), ...hienCo.map((h) => boSung.get(h.id) ?? h)];
  for (const { dong, o } of doc("KiemDem")) {
    const loiTruoc = soLoi();
    const soTo = chuO(o.soTo);
    const soThua = chuO(o.soThua);
    let h: Ho | null = null;
    if (co("KiemDem", "maHo")) h = layHo("KiemDem", dong, o.maHo);
    else {
      const ds = tatCaHo().filter((x) => x.thua.some((t) => t.soTo === soTo && t.soThua === soThua));
      if (ds.length === 1) h = moi.has(ds[0]!.ma.toLowerCase()) ? ds[0]! : boSungTu(hienCo.find((x) => x.id === ds[0]!.id)!);
      else bao("KiemDem", dong, "soThua", ds.length ? `Thửa ${soThua} tờ ${soTo} có ở ${ds.length} hồ sơ (${ds.map((x) => x.ma).join(", ")}) — cần cột Mã hộ` : `Không có hồ sơ nào có thửa ${soThua} tờ ${soTo}`);
    }
    const t = h?.thua.find((x) => x.soTo === soTo && x.soThua === soThua);
    if (h && !t) bao("KiemDem", dong, "soThua", `Hộ ${h.ma} không có thửa ${soThua} tờ ${soTo} (thêm ở trang thửa trước)`);
    const ma = chuO(o.maDonGia);
    const r = donGia.get(ma);
    if (!ma) bao("KiemDem", dong, "maDonGia", "Thiếu mã đơn giá");
    else if (!r) bao("KiemDem", dong, "maDonGia", `Mã đơn giá "${ma}" không có trong danh mục (QĐ 32, PL VIII)`);
    let kl = typeof o.khoiLuong === "number" ? String(o.khoiLuong) : chuO(o.khoiLuong);
    if (kl.startsWith("=")) kl = kl.replace(/,/g, ".");
    else if (kl) {
      const so = docSo(o.khoiLuong);
      if (so.loi) { bao("KiemDem", dong, "khoiLuong", so.loi); kl = ""; } else kl = so.so ?? "";
    }
    if (!kl) bao("KiemDem", dong, "khoiLuong", "Thiếu khối lượng / số lượng");
    else if (thuTinh(kl).loi) bao("KiemDem", dong, "khoiLuong", `Khối lượng: ${thuTinh(kl).loi}`);
    const dotS = chuO(o.dot);
    const dot = dotS ? Number(dotS) : 1;
    if (!Number.isInteger(dot) || dot < 1) bao("KiemDem", dong, "dot", `Đợt "${dotS}" phải là số nguyên ≥ 1`);
    if (!h || !t || !r || !kl || soLoi() > loiTruoc) continue;
    const coSo = { id: taoId(), thuaId: t.id, dot: Number.isInteger(dot) && dot > 0 ? dot : 1, ten: r.ten, maDonGia: r.ma, donVi: r.donVi, donGia: String(r.donGia), ghiChu: chuO(o.ghiChu) || undefined };
    const ts: TaiSan =
      r.nguon === "QĐ32"
        ? { ...coSo, loai: "NHA_CT", khoiLuong: kl, cachTinh: "THIET_HAI_THUC_TE", phan: "BOI_THUONG", canCu: r.nhom }
        : { ...coSo, loai: "CAY", soLuong: kl, matDoHa: r.matDo ? String(r.matDo) : null };
    h.taiSan.push(ts);
    dem.kiemDem++;
  }

  loi.sort((a, b) => (a.muc === b.muc ? 0 : a.muc === "LOI" ? -1 : 1));
  return { loi, hoMoi: [...moi.values()], hoBoSung: [...boSung.values()], dem };
}

/** Đọc, tự ánh xạ, kiểm tra tệp nhập. Không ghi gì vào kho. */
export async function docTepNhap(bytes: Uint8Array | ArrayBuffer, duAn: DuAn, hienCo: Ho[], tenTep = "tệp Excel", nguoi = "", ax?: AnhXa): Promise<KetQuaNhap> {
  let tep: TepExcel;
  try {
    tep = await moTepExcel(bytes);
  } catch {
    return { loi: [{ trang: "", dong: 0, cot: "", noiDung: "Không đọc được tệp .xlsx", muc: "LOI" }], hoMoi: [], hoBoSung: [], dem: { ho: 0, nhanKhau: 0, thua: 0, kiemDem: 0 } };
  }
  return kiemTraNhap(tep, ax ?? goiYAnhXa(tep), duAn, hienCo, tenTep, nguoi);
}

export const coLoiChan = (k: KetQuaNhap) => k.loi.some((l) => l.muc === "LOI");
