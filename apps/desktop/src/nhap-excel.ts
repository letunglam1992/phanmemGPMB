/**
 * Nhập hồ sơ từ Excel theo mẫu của phần mềm: Hộ, Nhân khẩu, Thửa đất, Kiểm đếm (cây trồng, nhà – công trình
 * theo mã đơn giá). Nguyên tắc:
 *  - Kiểm tra toàn bộ tệp trước, báo lỗi theo trang/dòng/cột; CÒN LỖI THÌ KHÔNG NHẬP GÌ (không nhập dở).
 *  - Không đoán số liệu: số dạng chữ không rõ dấu thập phân ("1.234") bị báo lỗi, không tự hiểu.
 *  - Trang Hộ chỉ tạo hồ sơ mới; mã trùng hồ sơ đã có → lỗi. Thửa, kiểm đếm được bổ sung cho hồ sơ đã có
 *    (tham chiếu theo mã hộ); thửa trùng tờ/thửa trong cùng hộ → lỗi.
 */
import type ExcelJS from "exceljs";
import { D } from "@gpmb/core";
import { DON_GIA } from "./du-lieu";
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

const LOAI: Record<string, LoaiDoiTuong> = { "": "HO_GIA_DINH", "hộ gia đình": "HO_GIA_DINH", "hộ": "HO_GIA_DINH", "cá nhân": "CA_NHAN", "tổ chức": "TO_CHUC" };

function docTrang(wb: ExcelJS.Workbook, ten: string): { dong: number; o: Record<string, ExcelJS.CellValue> }[] {
  const ws = wb.getWorksheet(ten);
  if (!ws) return [];
  const cot = MAU[ten]!;
  const out: { dong: number; o: Record<string, ExcelJS.CellValue> }[] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const o = Object.fromEntries(cot.map((c, i) => [c.khoa, row.getCell(i + 1).value]));
    if (Object.values(o).every((v) => chuO(v) === "")) return;
    out.push({ dong: n, o });
  });
  return out;
}

/** Đọc, kiểm tra tệp nhập. Không ghi gì vào kho. */
export async function docTepNhap(bytes: Uint8Array | ArrayBuffer, duAn: DuAn, hienCo: Ho[], tenTep = "tệp Excel"): Promise<KetQuaNhap> {
  const E = await excel();
  const wb = new E.Workbook();
  const loi: LoiNhap[] = [];
  try {
    await wb.xlsx.load(bytes as ArrayBuffer);
  } catch {
    return { loi: [{ trang: "", dong: 0, cot: "", noiDung: "Không đọc được tệp .xlsx", muc: "LOI" }], hoMoi: [], hoBoSung: [], dem: { ho: 0, nhanKhau: 0, thua: 0, kiemDem: 0 } };
  }
  const tieuDe = (trang: string, khoa: string) => MAU[trang]!.find((c) => c.khoa === khoa)!.tieuDe;
  const bao = (trang: string, dong: number, khoa: string, noiDung: string, muc: LoiNhap["muc"] = "LOI") => loi.push({ trang, dong, cot: khoa ? tieuDe(trang, khoa) : "", noiDung, muc });
  if (!Object.keys(MAU).some((t) => wb.getWorksheet(t))) bao("", 0, "", "Tệp không có trang Ho, NhanKhau, Thua, KiemDem — dùng tệp mẫu của phần mềm");
  for (const t of Object.keys(MAU)) {
    const ws = wb.getWorksheet(t);
    if (!ws) continue;
    MAU[t]!.forEach((c, i) => {
      const td = chuO(ws.getCell(1, i + 1).value).replace(/\s*\*$/, "");
      if (td !== c.tieuDe) bao(t, 1, "", `Cột ${i + 1}: tiêu đề "${td}" khác mẫu ("${c.tieuDe}") — không đổi thứ tự cột của tệp mẫu`);
    });
  }

  const nhatKy = { luc: new Date().toISOString(), nguoi: "Cán bộ xã", noiDung: `Nhập từ Excel (${tenTep})` };
  const theoMaCu = new Map(hienCo.map((h) => [h.ma.toLowerCase(), h]));
  const moi = new Map<string, Ho>();
  const boSung = new Map<string, Ho>();
  const dinhDanh = new Map(hienCo.filter((h) => h.soDinhDanh).map((h) => [h.soDinhDanh, h.ma]));
  const dem = { ho: 0, nhanKhau: 0, thua: 0, kiemDem: 0 };
  const soLoi = () => loi.filter((l) => l.muc === "LOI").length;

  for (const { dong, o } of docTrang(wb, "Ho")) {
    const loiTruoc = soLoi();
    const ma = chuO(o.ma);
    const ten = chuO(o.ten);
    if (!ma) bao("Ho", dong, "ma", "Thiếu mã hộ");
    if (!ten) bao("Ho", dong, "ten", "Thiếu họ tên");
    if (!ma || !ten) continue;
    if (theoMaCu.has(ma.toLowerCase())) { bao("Ho", dong, "ma", `Mã ${ma} trùng hồ sơ đã có trong dự án`); continue; }
    if (moi.has(ma.toLowerCase())) { bao("Ho", dong, "ma", `Mã ${ma} lặp lại trong tệp`); continue; }
    const loai = LOAI[chuO(o.loai).toLowerCase()];
    if (!loai) bao("Ho", dong, "loai", `"${chuO(o.loai)}" không phải Hộ gia đình / Cá nhân / Tổ chức`);
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
    dem.ho++;
  }

  const layHo = (trang: string, dong: number, v: ExcelJS.CellValue): Ho | null => {
    const ma = chuO(v).toLowerCase();
    if (!ma) { bao(trang, dong, "maHo", "Thiếu mã hộ"); return null; }
    const h = moi.get(ma);
    if (h) return h;
    const cu = theoMaCu.get(ma);
    if (!cu) { bao(trang, dong, "maHo", `Không có hộ mã ${chuO(v)} (trong trang Ho hoặc trong dự án)`); return null; }
    if (!boSung.has(cu.id)) boSung.set(cu.id, { ...structuredClone(cu), nhatKy: [...cu.nhatKy, nhatKy] });
    return boSung.get(cu.id)!;
  };

  for (const { dong, o } of docTrang(wb, "NhanKhau")) {
    const loiTruoc = soLoi();
    const h = layHo("NhanKhau", dong, o.maHo);
    const hoTen = chuO(o.hoTen);
    if (!hoTen) bao("NhanKhau", dong, "hoTen", "Thiếu họ tên");
    const ns = chuO(o.namSinh);
    if (ns && !/^\d{4}$/.test(ns)) bao("NhanKhau", dong, "namSinh", `"${ns}" không phải năm (4 chữ số)`);
    if (!h || !hoTen || soLoi() > loiTruoc) continue;
    h.nhanKhau.push({ id: taoId(), hoTen, namSinh: ns || undefined, quanHe: chuO(o.quanHe) });
    dem.nhanKhau++;
  }

  const toThua = new Map<string, string>();
  for (const h of hienCo) for (const t of h.thua) toThua.set(`${t.soTo}/${t.soThua}`, h.ma);
  for (const { dong, o } of docTrang(wb, "Thua")) {
    const loiTruoc = soLoi();
    const h = layHo("Thua", dong, o.maHo);
    const soTo = chuO(o.soTo);
    const soThua = chuO(o.soThua);
    const loaiDat = chuO(o.loaiDat).toUpperCase();
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

  const donGia = new Map(DON_GIA.filter((r) => r.nguon !== "PL V").map((r) => [r.ma, r]));
  for (const { dong, o } of docTrang(wb, "KiemDem")) {
    const loiTruoc = soLoi();
    const h = layHo("KiemDem", dong, o.maHo);
    const soTo = chuO(o.soTo);
    const soThua = chuO(o.soThua);
    const t = h?.thua.find((x) => x.soTo === soTo && x.soThua === soThua);
    if (h && !t) bao("KiemDem", dong, "soThua", `Hộ ${h.ma} không có thửa ${soThua} tờ ${soTo} (thêm ở trang Thua trước)`);
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

export const coLoiChan = (k: KetQuaNhap) => k.loi.some((l) => l.muc === "LOI");
