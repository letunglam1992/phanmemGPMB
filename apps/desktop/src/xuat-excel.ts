/**
 * Xuất Excel theo cấu trúc biểu áp giá người dùng cung cấp:
 *  - Mỗi hộ một trang "phương án chi tiết" (A. Bồi thường, B. Hỗ trợ, tổng, làm tròn, khấu trừ);
 *  - "TH ĐẤT": tổng hợp diện tích thu hồi theo thửa, loại đất;
 *  - "TH GIÁ TRỊ TRÌNH DUYỆT": tổng hợp giá trị theo cột.
 * Tệp được tạo trên máy, không gửi đi đâu.
 */
import type ExcelJS from "exceljs";
import { tenDayDu } from "./van-ban/loai-dat";
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import { tenTep } from "./ten-tep";
import { tinhChiTra, type GiaiDoanTyLe } from "./chi-tra";
import { TEN_COT, type CotTongHop, type KetQuaHo } from "./tinh-ho";
import { TEN_TINH_TRANG, type BaoCao, type SoLieu } from "./bao-cao";
import { sapXepKy, tongKy, type KyBaoCao } from "./ky-bao-cao";
import { taiXuong } from "./tai-xuong";
import { dienMauExcel, type DongMau, type DuLieuMauExcel } from "./mau-excel";
import { quyCua, tenLo, trangThaiLo, TEN_TT_LO, TEN_LOAI_LO, TEN_HINH_THUC_GIAO, canBoTriLo } from "./quy-tdc";

const FONT = "Times New Roman";
const so = (d: Decimal | null | undefined) => (d ? d.toDecimalPlaces(0).toNumber() : null);
const VIEN: Partial<ExcelJS.Borders> = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
const DINH_DANG_TIEN = "#,##0";

function tenTrang(s: string, daDung: Set<string>): string {
  let t = s.replace(/[\\/*?:[\]]/g, " ").slice(0, 28).trim();
  let i = 2;
  while (daDung.has(t)) t = `${t.slice(0, 25)} ${i++}`;
  daDung.add(t);
  return t;
}

function dongKe(r: ExcelJS.Row, tu: number, den: number) {
  for (let c = tu; c <= den; c++) r.getCell(c).border = VIEN;
}

/** Dòng chi tiết giá trị bồi thường, hỗ trợ của hộ theo cột biểu mẫu (dùng chung cho xuất Excel và mẫu Excel của đơn vị). */
export function dongChiTiet(h: Ho, kq: KetQuaHo): DongMau[] {
  const out: DongMau[] = [];
  const cong = (ds: KetQuaHo["tatCa"]) => ds.reduce((s, x) => (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien ? s.plus(x.dong.thanhTien) : s), D(0));
  const trong = { dvt: "", khoi_luong: null, he_so: null, don_gia: null, can_cu: "", trang_thai: "", dien_giai: "" };
  const phan = (chu: string, tenPhan: string, dsNhom: KetQuaHo["nhom"]) => {
    if (!dsNhom.length) return;
    out.push({ ...trong, _cap: "phan", stt: chu, noi_dung: tenPhan, thanh_tien: so(cong(dsNhom.flatMap((n) => n.dong))) });
    dsNhom.forEach((n) => {
      out.push({ ...trong, _cap: "nhom", stt: n.ma.split(".")[1] ?? "", noi_dung: n.ten, thanh_tien: so(cong(n.dong)) });
      n.dong.forEach((x, j) => {
        const t = h.thua.find((y) => y.id === x.thuaId);
        const tenDong = x.dong.noiDung + (t && !x.dong.noiDung.includes(`Thửa ${t.soThua}`) ? ` (thửa ${t.soThua}, tờ ${t.soTo})` : "");
        const trangThai = x.dong.trangThai === "TAM_TINH" ? (x.dong.luaChon.length ? "Có lựa chọn" : "Tạm tính") : x.dong.trangThai === "CAN_XAC_NHAN" ? "Cần xác nhận" : "Thiếu căn cứ";
        const canCu = x.dong.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(", ")).join("; ");
        const dienGiai = [x.dong.congThuc, ...Object.entries(x.dong.thamSo).map(([k, v]) => `${k}: ${v}`)].join("\n");
        const dsBieu = x.bieu && x.bieu.length ? x.bieu : [null];
        dsBieu.forEach((b, k) => {
          const thanhTien = b ? (b.heSo ? b.kl.mul(b.heSo).mul(b.donGia) : x.dong.thanhTien) : x.dong.thanhTien;
          out.push({
            _cap: null,
            stt: k === 0 ? j + 1 : "",
            noi_dung: k === 0 ? tenDong + (b?.ghiChu ? ` – ${b.ghiChu}` : "") : `   ${b?.ghiChu ?? ""}`,
            dvt: b?.dvt ?? "",
            khoi_luong: b ? b.kl.toNumber() : null,
            he_so: b?.heSo ? b.heSo.toDecimalPlaces(4).toNumber() : null,
            don_gia: b ? so(b.donGia) : null,
            thanh_tien: x.dong.trangThai === "TAM_TINH" ? so(thanhTien) : null,
            can_cu: k === 0 ? canCu : "",
            trang_thai: k === 0 ? trangThai : "",
            dien_giai: k === 0 ? dienGiai : "",
          });
        });
      });
    });
  };
  phan("A", "GIÁ TRỊ BỒI THƯỜNG", kq.nhom.filter((n) => n.ma.startsWith("A")));
  phan("B", "GIÁ TRỊ HỖ TRỢ", kq.nhom.filter((n) => n.ma.startsWith("B")));
  return out;
}

function trangHo(wb: ExcelJS.Workbook, duAn: DuAn, h: Ho, kq: KetQuaHo, ten: string, ban?: string) {
  const ws = wb.addWorksheet(ten, { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.properties.defaultRowHeight = 16;
  ws.columns = [{ width: 6 }, { width: 44 }, { width: 8 }, { width: 12 }, { width: 10 }, { width: 13 }, { width: 16 }, { width: 30 }, { width: 13 }, { width: 44 }];
  const N = 10;
  const tieuDe = (text: string, r: number, dam = true, co = 12) => {
    ws.mergeCells(r, 1, r, 10);
    const c = ws.getCell(r, 1);
    c.value = text;
    c.font = { name: FONT, bold: dam, size: co };
    c.alignment = { horizontal: "center", wrapText: true };
  };
  ws.getCell("A1").value = `UBND ${duAn.xa.toUpperCase()}`;
  ws.getCell("A1").font = { name: FONT, bold: true };
  ws.getCell("H1").value = ban ?? (kq.tong.duocChot ? "" : "DỰ THẢO – CHƯA CHỐT");
  ws.getCell("H1").font = { name: FONT, bold: true, color: { argb: "FFC00000" } };
  tieuDe("PHƯƠNG ÁN CHI TIẾT BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ", 3, true, 13);
  tieuDe(`Dự án: ${duAn.ten}`, 4, false);
  let r = 6;
  const dong = (nhan: string, giaTri: string) => {
    ws.getCell(r, 1).value = nhan;
    ws.getCell(r, 1).font = { name: FONT, bold: true };
    ws.mergeCells(r, 2, r, 10);
    ws.getCell(r, 2).value = giaTri;
    ws.getCell(r, 2).font = { name: FONT };
    r++;
  };
  dong("1.", `Họ và tên: ${h.ten}   ·   Mã hồ sơ: ${h.ma}`);
  dong("", `Địa chỉ: ${h.diaChi || "…"}   ·   Số định danh: ${h.soDinhDanh || "…"}   ·   Nhân khẩu: ${h.nhanKhau.length}`);
  dong("2.", "Thửa đất bị thu hồi:");
  const dau2 = ws.getRow(r);
  dau2.values = ["TT", "Tờ / thửa", "Loại đất", "DT thửa (m²)", "", "DT thu hồi (m²)", "", "Nguồn gốc sử dụng"];
  dau2.font = { name: FONT, bold: true };
  dongKe(dau2, 1, 8);
  r++;
  h.thua.forEach((t, i) => {
    const row = ws.getRow(r++);
    row.values = [i + 1, `Tờ ${t.soTo}, thửa ${t.soThua}`, tenDayDu(t.loaiDat), Number(t.dienTich) || null, "", Number(t.dienTichThuHoi) || null, "", t.nguonGoc || ""];
    row.getCell(4).numFmt = "#,##0.00";
    row.getCell(6).numFmt = "#,##0.00";
    row.font = { name: FONT };
    dongKe(row, 1, 8);
  });
  r++;
  dong("3.", "Giá trị bồi thường, hỗ trợ:");
  const dau = ws.getRow(r++);
  dau.values = ["STT", "Danh mục", "ĐVT", "Khối lượng", "Hệ số / mức hỗ trợ", "Đơn giá (đồng)", "Thành tiền (đồng)", "Căn cứ pháp lý", "Trạng thái", "Diễn giải tính"];
  dau.font = { name: FONT, bold: true };
  dau.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  dau.height = 32;
  dongKe(dau, 1, N);
  for (const d of dongChiTiet(h, kq)) {
    const rw = ws.getRow(r++);
    rw.values = [d.stt, d.noi_dung, d.dvt, d.khoi_luong, d.he_so, d.don_gia, d.thanh_tien, d.can_cu, d.trang_thai, d.dien_giai];
    if (d._cap) {
      rw.font = { name: FONT, bold: true, italic: d._cap === "nhom" };
    } else {
      rw.font = { name: FONT, size: 11 };
      rw.alignment = { vertical: "top", wrapText: true };
      rw.getCell(4).numFmt = "#,##0.##";
      rw.getCell(6).numFmt = DINH_DANG_TIEN;
      rw.getCell(10).font = { name: FONT, size: 9, color: { argb: "FF555555" } };
      if (d.trang_thai && d.trang_thai !== "Tạm tính" && d.trang_thai !== "Có lựa chọn") rw.getCell(9).font = { name: FONT, size: 11, color: { argb: "FFC00000" } };
    }
    rw.getCell(7).numFmt = DINH_DANG_TIEN;
    dongKe(rw, 1, N);
  }
  const tongDong = (nhan: string, v: Decimal) => {
    const rt = ws.getRow(r++);
    rt.values = ["", nhan, "", "", "", "", so(v)];
    rt.font = { name: FONT, bold: true };
    rt.getCell(7).numFmt = DINH_DANG_TIEN;
    dongKe(rt, 1, N);
  };
  tongDong("TỔNG CỘNG (A + B)", kq.tong.tongChuaLamTron);
  tongDong(`Tổng sau làm tròn — ${kq.moTaLamTron}`, kq.tong.tongLamTron);
  tongDong("Khấu trừ nghĩa vụ tài chính", kq.khauTru);
  tongDong("Số tiền thực nhận", kq.conLai);
  r++;
  const ghiChu = kq.tatCa.filter((x) => x.dong.trangThai !== "TAM_TINH");
  if (ghiChu.length) {
    dong("Lưu ý:", `Còn ${ghiChu.length} khoản chưa đủ căn cứ/cần xác nhận, không cộng vào tổng: ${ghiChu.map((x) => x.dong.noiDung).join("; ")}`);
  }
  const luaChon = kq.tatCa.flatMap((x) => x.dong.luaChon.map((l) => `${x.dong.noiDung}: ${l.ma} – ${l.giaTri} (${l.lyDo})`));
  if (luaChon.length) dong("Lựa chọn:", [...new Set(luaChon)].join("\n"));
  r += 1;
  ws.getCell(r, 2).value = "NGƯỜI LẬP";
  ws.getCell(r, 8).value = "ĐẠI DIỆN HỘ / TỔ CHỨC";
  ws.getRow(r).font = { name: FONT, bold: true };
}

/** ban: dòng ghi trạng thái phiên bản phương án (vd. "Bản 2 – đã phê duyệt theo QĐ số … ngày …"), in dưới tiêu đề. */
export async function taoWorkbook(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], ban?: string): Promise<ExcelJS.Workbook> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  wb.created = new Date();

  // TH ĐẤT
  const loaiDat = [...new Set(ds.flatMap(({ h }) => h.thua.map((t) => t.loaiDat)))].sort();
  const wd = wb.addWorksheet("TH ĐẤT");
  wd.columns = [{ width: 6 }, { width: 30 }, { width: 30 }, { width: 8 }, { width: 8 }, { width: 13 }, ...loaiDat.map(() => ({ width: 11 }))];
  wd.mergeCells(1, 1, 1, 6 + loaiDat.length);
  wd.getCell(1, 1).value = `BẢNG TỔNG HỢP DIỆN TÍCH ĐẤT THU HỒI – ${duAn.ten}`;
  wd.getCell(1, 1).font = { name: FONT, bold: true, size: 13 };
  wd.getCell(1, 1).alignment = { horizontal: "center" };
  if (ban) dongBan(wd, 6 + loaiDat.length, ban);
  const hd = wd.getRow(3);
  hd.values = ["STT", "Chủ sử dụng", "Địa chỉ", "Tờ", "Thửa", "DT thu hồi (m²)", ...loaiDat.map(tenDayDu)];
  hd.font = { name: FONT, bold: true };
  dongKe(hd, 1, 6 + loaiDat.length);
  let r = 4;
  let stt = 0;
  for (const { h } of ds) {
    for (const t of h.thua) {
      const row = wd.getRow(r++);
      const dt = Number(t.dienTichThuHoi) || 0;
      row.values = [++stt, h.ten, h.diaChi, t.soTo, t.soThua, dt, ...loaiDat.map((l) => (l === t.loaiDat ? dt : null))];
      row.font = { name: FONT };
      for (let c = 6; c <= 6 + loaiDat.length; c++) row.getCell(c).numFmt = "#,##0.00";
      dongKe(row, 1, 6 + loaiDat.length);
    }
  }
  const tongD = wd.getRow(r);
  tongD.values = ["", "Tổng cộng", "", "", "", { formula: `SUM(F4:F${r - 1})` }, ...loaiDat.map((_, i) => ({ formula: `SUM(${colName(7 + i)}4:${colName(7 + i)}${r - 1})` }))];
  tongD.font = { name: FONT, bold: true };
  for (let c = 6; c <= 6 + loaiDat.length; c++) tongD.getCell(c).numFmt = "#,##0.00";
  dongKe(tongD, 1, 6 + loaiDat.length);

  // TH GIÁ TRỊ
  const cot = Object.keys(TEN_COT) as CotTongHop[];
  const wg = wb.addWorksheet("TH GIÁ TRỊ TRÌNH DUYỆT");
  const tieuDeCot = ["STT", "Chủ sử dụng", "DT thu hồi (m²)", ...cot.map((c) => TEN_COT[c]), "Tổng bồi thường", "Tổng hỗ trợ", "Tổng cộng (làm tròn)", "Khấu trừ NVTC", "Sau khấu trừ", "Ghi chú"];
  wg.columns = tieuDeCot.map((_, i) => ({ width: i === 1 ? 28 : i === 0 ? 6 : i === tieuDeCot.length - 1 ? 26 : 15 }));
  wg.mergeCells(1, 1, 1, tieuDeCot.length);
  wg.getCell(1, 1).value = `BẢNG TỔNG HỢP GIÁ TRỊ BỒI THƯỜNG, HỖ TRỢ TRÌNH DUYỆT – ${duAn.ten}`;
  wg.getCell(1, 1).font = { name: FONT, bold: true, size: 13 };
  wg.getCell(1, 1).alignment = { horizontal: "center" };
  if (ban) dongBan(wg, tieuDeCot.length, ban);
  const hg = wg.getRow(3);
  hg.values = tieuDeCot;
  hg.font = { name: FONT, bold: true };
  hg.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  hg.height = 48;
  dongKe(hg, 1, tieuDeCot.length);
  r = 4;
  ds.forEach(({ h, k }, i) => {
    const row = wg.getRow(r++);
    row.values = [
      i + 1,
      h.ten,
      h.thua.reduce((s, t) => s + (Number(t.dienTichThuHoi) || 0), 0),
      ...cot.map((c) => so(k.theoCot[c])),
      so(k.tongBoiThuong),
      so(k.tongHoTro),
      so(k.tong.tongLamTron),
      so(k.khauTru),
      so(k.conLai),
      k.tong.duocChot ? "" : `${k.tong.soDongCanXacNhan + k.tong.soDongThieuCanCu} khoản chưa đủ căn cứ`,
    ];
    row.font = { name: FONT };
    row.getCell(3).numFmt = "#,##0.00";
    for (let c = 4; c < tieuDeCot.length; c++) row.getCell(c).numFmt = DINH_DANG_TIEN;
    dongKe(row, 1, tieuDeCot.length);
  });
  const tg = wg.getRow(r);
  tg.values = ["", "Tổng cộng", ...Array.from({ length: tieuDeCot.length - 3 }, (_, i) => ({ formula: `SUM(${colName(3 + i)}4:${colName(3 + i)}${r - 1})` }))];
  tg.font = { name: FONT, bold: true };
  for (let c = 3; c < tieuDeCot.length; c++) tg.getCell(c).numFmt = c === 3 ? "#,##0.00" : DINH_DANG_TIEN;
  dongKe(tg, 1, tieuDeCot.length);

  const daDung = new Set(["TH ĐẤT", "TH GIÁ TRỊ TRÌNH DUYỆT"]);
  ds.forEach(({ h, k }, i) => trangHo(wb, duAn, h, k, tenTrang(`${i + 1}. ${h.ten}`, daDung), ban));
  return wb;
}

function dongBan(ws: ExcelJS.Worksheet, soCot: number, ban: string) {
  ws.mergeCells(2, 1, 2, soCot);
  const c = ws.getCell(2, 1);
  c.value = ban;
  c.font = { name: FONT, italic: true, bold: true, color: { argb: "FF1F4E3D" } };
  c.alignment = { horizontal: "center" };
}

/** Bảng theo dõi chi trả, tiền chậm trả (tạm tính) — căn cứ lập phương án chi trả bồi thường chậm (điểm b k3 Đ94 LĐĐ). */
export async function taoWorkbookChiTra(duAn: DuAn, hos: Ho[], tyLe: GiaiDoanTyLe[], homNay: string): Promise<ExcelJS.Workbook> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  const ws = wb.addWorksheet("THEO DÕI CHI TRẢ");
  const cot = ["STT", "Mã", "Họ tên", "Bản PA / QĐ phê duyệt", "Ngày hiệu lực", "Hạn chi trả", "Phải trả (đ)", "Đã chi (đ)", "Còn phải chi (đ)", "Ngày chi gần nhất", "Số ngày chậm (lớn nhất)", "Tiền chậm trả tạm tính (đ)", "Nguyên nhân chậm", "Diễn giải"];
  ws.columns = cot.map((_, i) => ({ width: [6, 8, 26, 26, 12, 12, 16, 16, 16, 13, 12, 18, 22, 60][i] }));
  ws.mergeCells(1, 1, 1, cot.length);
  ws.getCell(1, 1).value = `BẢNG THEO DÕI CHI TRẢ TIỀN BỒI THƯỜNG, HỖ TRỢ VÀ TIỀN CHẬM TRẢ – ${duAn.ten}`;
  ws.getCell(1, 1).font = { name: FONT, bold: true, size: 13 };
  ws.getCell(1, 1).alignment = { horizontal: "center" };
  ws.mergeCells(2, 1, 2, cot.length);
  ws.getCell(2, 1).value = `Số liệu đến ngày ${homNay.split("-").reverse().join("/")}. Tiền chậm trả là TẠM TÍNH theo điểm b khoản 3 Điều 94 Luật Đất đai 2024 với tỷ lệ do cán bộ nhập; phải được cấp có thẩm quyền phê duyệt phương án chi trả bồi thường chậm.`;
  ws.getCell(2, 1).font = { name: FONT, italic: true };
  ws.getCell(2, 1).alignment = { horizontal: "center", wrapText: true };
  ws.getRow(2).height = 32;
  const hd = ws.getRow(4);
  hd.values = cot;
  hd.font = { name: FONT, bold: true };
  hd.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  hd.height = 44;
  dongKe(hd, 1, cot.length);
  let r = 5;
  const tenNN = { DO_CO_QUAN: "Do cơ quan thực hiện BT", DO_NGUOI_DAN: "Do người có đất", "": "Chưa xác nhận" } as const;
  hos.forEach((h, i) => {
    const c = tinhChiTra(h, duAn.phuongAn ?? [], tyLe, homNay);
    if (c.trangThai === "CHUA_DUYET") return;
    const row = ws.getRow(r++);
    const dots = [...(h.chiTra?.dot ?? [])].sort((a, b) => a.ngay.localeCompare(b.ngay));
    row.values = [
      i + 1,
      h.ma,
      h.ten,
      `Bản ${c.ban!.so} – ${c.ban!.pheDuyet!.so} ngày ${c.ban!.pheDuyet!.ngay.split("-").reverse().join("/")}`,
      c.ngayHieuLuc!.split("-").reverse().join("/"),
      c.hanChi!.split("-").reverse().join("/"),
      so(c.phaiTra!),
      so(c.daChi),
      so(c.conLai!),
      dots.at(-1)?.ngay.split("-").reverse().join("/") ?? "",
      c.chamTra.reduce((m, x) => Math.max(m, x.soNgay), 0) || "",
      c.chamTra.length ? (c.tienChamTra ? so(c.tienChamTra) : "Thiếu căn cứ") : 0,
      c.chamTra.length ? tenNN[h.chiTra?.nguyenNhanCham ?? ""] : "",
      c.chamTra.map((x) => `${x.dotId ? `Chi ${x.ngay.split("-").reverse().join("/")}` : "Chưa chi"}: ${x.soTien.toFixed(0)} đ × ${x.dienGiai}`).join("\n"),
    ];
    row.font = { name: FONT };
    row.alignment = { vertical: "top", wrapText: true };
    for (const k of [7, 8, 9, 12]) row.getCell(k).numFmt = DINH_DANG_TIEN;
    dongKe(row, 1, cot.length);
  });
  const tg = ws.getRow(r);
  tg.values = ["", "", "Tổng cộng", "", "", "", ...[7, 8, 9].map((k) => ({ formula: `SUM(${colName(k)}5:${colName(k)}${r - 1})` })), "", "", { formula: `SUM(L5:L${r - 1})` }];
  tg.font = { name: FONT, bold: true };
  for (const k of [7, 8, 9, 12]) tg.getCell(k).numFmt = DINH_DANG_TIEN;
  dongKe(tg, 1, cot.length);
  return wb;
}

/**
 * Phiếu đối chiếu nghiệm thu: số phần mềm tính (từng hộ, từng khoản) — cán bộ nhập số của phương án đã được
 * phê duyệt thực tế vào cột "Theo PA đã duyệt"; công thức tính chênh lệch; ghi nguyên nhân.
 */
export async function taoPhieuDoiChieu(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Promise<ExcelJS.Workbook> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  const ws = wb.addWorksheet("DOI CHIEU", { views: [{ state: "frozen", ySplit: 4 }] });
  const cot = ["Mã hộ", "Họ tên", "Mã khoản", "Nội dung khoản", "Trạng thái phần mềm", "Phần mềm tính (đ)", "Theo PA đã duyệt (đ)", "Chênh lệch (đ)", "Chênh lệch (%)", "Nguyên nhân / ghi chú"];
  ws.columns = [10, 24, 9, 52, 16, 17, 17, 15, 11, 40].map((w) => ({ width: w }));
  ws.mergeCells(1, 1, 1, cot.length);
  ws.getCell(1, 1).value = `PHIẾU ĐỐI CHIẾU KẾT QUẢ TÍNH VỚI PHƯƠNG ÁN ĐÃ PHÊ DUYỆT – ${duAn.ten}`;
  ws.getCell(1, 1).font = { name: FONT, bold: true, size: 13 };
  ws.getCell(1, 1).alignment = { horizontal: "center" };
  ws.mergeCells(2, 1, 2, cot.length);
  ws.getCell(2, 1).value = "Nhập số của phương án đã được phê duyệt vào cột G (ô màu vàng). Cột H, I tự tính. Dòng TỔNG HỘ là tổng sau làm tròn cấp hộ.";
  ws.getCell(2, 1).font = { name: FONT, italic: true };
  const hd = ws.getRow(4);
  hd.values = cot;
  hd.font = { name: FONT, bold: true };
  hd.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  hd.height = 34;
  dongKe(hd, 1, cot.length);
  const TT: Record<string, string> = { TAM_TINH: "Tạm tính", CAN_XAC_NHAN: "Cần xác nhận", THIEU_CAN_CU: "Thiếu căn cứ" };
  let r = 5;
  const vang = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF2CC" } };
  const dongSo = (row: ExcelJS.Row, dam = false) => {
    row.getCell(8).value = { formula: `IF(G${row.number}="","",G${row.number}-F${row.number})` };
    row.getCell(9).value = { formula: `IF(OR(G${row.number}="",G${row.number}=0),"",H${row.number}/G${row.number})` };
    row.getCell(6).numFmt = row.getCell(7).numFmt = row.getCell(8).numFmt = DINH_DANG_TIEN;
    row.getCell(9).numFmt = "0.00%";
    row.getCell(7).fill = vang;
    row.font = { name: FONT, bold: dam };
    dongKe(row, 1, cot.length);
  };
  for (const { h, k } of ds) {
    for (const x of k.tatCa) {
      const row = ws.getRow(r++);
      row.values = [h.ma, h.ten, x.dong.ma, x.dong.noiDung, TT[x.dong.trangThai] ?? x.dong.trangThai, x.dong.thanhTien ? so(x.dong.thanhTien) : null];
      dongSo(row);
    }
    const t = ws.getRow(r++);
    t.values = [h.ma, h.ten, "", "TỔNG HỘ (làm tròn; chỉ cộng khoản Tạm tính)", k.tong.duocChot ? "" : "Chưa đủ căn cứ", so(k.tong.tongLamTron)];
    dongSo(t, true);
  }
  return wb;
}

export async function xuatPhieuDoiChieu(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]) {
  await taiVe(await taoPhieuDoiChieu(duAn, ds), `Phieu-doi-chieu_${tenAnToan(duAn.ten)}.xlsx`);
}

export async function xuatExcelChiTra(duAn: DuAn, hos: Ho[], tyLe: GiaiDoanTyLe[], homNay: string) {
  await taiVe(await taoWorkbookChiTra(duAn, hos, tyLe, homNay), `Theo-doi-chi-tra_${tenAnToan(duAn.ten)}.xlsx`);
}

function colName(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function taiVe(wb: ExcelJS.Workbook, tenTep: string) {
  const buf = await wb.xlsx.writeBuffer();
  await taiXuong(new Uint8Array(buf as ArrayBuffer), tenTep, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

const tenAnToan = (s: string) => tenTep(s, 80);

/** mau: biểu mẫu Excel của đơn vị (MA_MAU_EXCEL) — có thì điền mẫu, giữ định dạng của mẫu; không thì dùng bố cục của phần mềm. */
export async function xuatExcelDuAn(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], ban?: string, mau?: Uint8Array | null) {
  const wb = mau ? (await dienMauExcel(mau, duLieuMauExcel(duAn, ds, ban))).wb : await taoWorkbook(duAn, ds, ban);
  await taiVe(wb, `Phuong-an_${tenAnToan(duAn.ten)}.xlsx`);
}

export async function xuatExcelHo(duAn: DuAn, h: Ho, k: KetQuaHo, mau?: Uint8Array | null) {
  const wb = mau ? (await dienMauExcel(mau, duLieuMauExcel(duAn, [{ h, k }]))).wb : await taoWorkbook(duAn, [{ h, k }]);
  await taiVe(wb, `Phuong-an-chi-tiet_${tenAnToan(h.ma + " " + h.ten)}.xlsx`);
}

const COT = Object.keys(TEN_COT) as CotTongHop[];
const ngayVN = (d = new Date()) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const dtSo = (v: string) => (Number(v) || 0);

/** Các trường của biểu mẫu Excel (hiện ở hộp Mẫu Excel để đơn vị thiết kế mẫu). */
export const TRUONG_MAU_EXCEL: [string, string][] = [
  ["{{ten_du_an}} {{xa}} {{xa_hoa}} {{chu_dau_tu}} {{ngay_xuat}} {{ban}}", "Chung: tên dự án, xã/phường (thường / CHỮ HOA), chủ đầu tư, ngày xuất (dd/mm/yyyy), trạng thái bản phương án"],
  ["{{so_ho}} {{tong_dt_thu_hoi}} {{tong_boi_thuong}} {{tong_ho_tro}} {{tong_lam_tron}} {{tong_khau_tru}} {{tong_con_lai}}", "Chung: số hộ và các tổng của dự án"],
  [COT.map((c) => `{{tong_${c.toLowerCase()}}}`).join(" "), `Chung: tổng theo cột (${COT.map((c) => TEN_COT[c]).join("; ")})`],
  ["{{#ho}} … {{stt}} {{ten}} {{ma}} {{dia_chi}} {{dt_thu_hoi}} " + COT.map((c) => `{{${c.toLowerCase()}}}`).join(" ") + " {{tong_boi_thuong}} {{tong_ho_tro}} {{tong_lam_tron}} {{khau_tru}} {{con_lai}} {{ghi_chu}}", "Dòng lặp mỗi hộ một dòng (bảng tổng hợp giá trị trình duyệt)"],
  ["{{#thua_du_an}} … {{stt}} {{ten}} {{dia_chi}} {{to}} {{thua}} {{loai_dat}} {{ma_loai_dat}} {{dt_thua}} {{dt_thu_hoi}} {{nguon_goc}}", "Dòng lặp mỗi thửa của dự án một dòng (bảng tổng hợp đất); loai_dat là tên đầy đủ, ma_loai_dat là ký hiệu"],
  ["Tên trang chứa {{…}}, vd. {{stt}}. {{ten}}", "Trang mẫu của từng hộ — nhân thành một trang cho mỗi hộ. Trong trang: {{stt}} {{ten}} {{ma}} {{dia_chi}} {{so_dinh_danh}} {{so_nhan_khau}} {{dt_thu_hoi}} {{tong_boi_thuong}} {{tong_ho_tro}} {{tong_chua_lam_tron}} {{tong_lam_tron}} {{mo_ta_lam_tron}} {{khau_tru}} {{con_lai}} {{trang_thai_ban}} {{luu_y}} {{lua_chon}}"],
  ["{{#thua}} … {{stt}} {{to}} {{thua}} {{loai_dat}} {{ma_loai_dat}} {{dt_thua}} {{dt_thu_hoi}} {{nguon_goc}}", "Trong trang hộ: dòng lặp các thửa của hộ"],
  ["{{#dong}} {{#dong.phan}} {{#dong.nhom}} … {{stt}} {{noi_dung}} {{dvt}} {{khoi_luong}} {{he_so}} {{don_gia}} {{thanh_tien}} {{can_cu}} {{trang_thai}} {{dien_giai}}", "Trong trang hộ: dòng chi tiết bồi thường, hỗ trợ; dòng {{#dong.phan}} (A, B) và {{#dong.nhom}} (I, II…) — nếu có — là định dạng riêng của dòng tiêu đề phần, nhóm"],
];

/** Dữ liệu điền biểu mẫu Excel của đơn vị. Số tiền làm tròn đồng; diện tích giữ 2 chữ số thập phân như hồ sơ. */
export function duLieuMauExcel(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], ban?: string): DuLieuMauExcel {
  const tong = (f: (k: KetQuaHo) => Decimal) => so(ds.reduce((s, { k }) => s.plus(f(k)), D(0)));
  const dtHo = (h: Ho) => h.thua.reduce((s, t) => s.plus(D(dtSo(t.dienTichThuHoi))), D(0)).toDecimalPlaces(2).toNumber();
  const chung: DuLieuMauExcel["chung"] = {
    ten_du_an: duAn.ten,
    xa: duAn.xa,
    xa_hoa: duAn.xa.toUpperCase(),
    chu_dau_tu: duAn.chuDauTu ?? "",
    ngay_xuat: ngayVN(),
    ban: ban ?? "",
    so_ho: ds.length,
    tong_dt_thu_hoi: ds.reduce((s, { h }) => s.plus(dtHo(h)), D(0)).toDecimalPlaces(2).toNumber(),
    tong_boi_thuong: tong((k) => k.tongBoiThuong),
    tong_ho_tro: tong((k) => k.tongHoTro),
    tong_lam_tron: tong((k) => k.tong.tongLamTron),
    tong_khau_tru: tong((k) => k.khauTru),
    tong_con_lai: tong((k) => k.conLai),
    ...Object.fromEntries(COT.map((c) => [`tong_${c.toLowerCase()}`, tong((k) => k.theoCot[c])])),
  };
  const thuaDong = (h: Ho) =>
    h.thua.map((t, i): DongMau => ({ stt: i + 1, ten: h.ten, dia_chi: h.diaChi, to: t.soTo, thua: t.soThua, loai_dat: tenDayDu(t.loaiDat), ma_loai_dat: t.loaiDat, dt_thua: dtSo(t.dienTich) || null, dt_thu_hoi: dtSo(t.dienTichThuHoi) || null, nguon_goc: t.nguonGoc || "" }));
  let sttThua = 0;
  return {
    chung,
    bang: {
      ho: ds.map(({ h, k }, i) => ({
        stt: i + 1,
        ten: h.ten,
        ma: h.ma,
        dia_chi: h.diaChi,
        dt_thu_hoi: dtHo(h),
        ...Object.fromEntries(COT.map((c) => [c.toLowerCase(), so(k.theoCot[c])])),
        tong_boi_thuong: so(k.tongBoiThuong),
        tong_ho_tro: so(k.tongHoTro),
        tong_lam_tron: so(k.tong.tongLamTron),
        khau_tru: so(k.khauTru),
        con_lai: so(k.conLai),
        ghi_chu: k.tong.duocChot ? "" : `${k.tong.soDongCanXacNhan + k.tong.soDongThieuCanCu} khoản chưa đủ căn cứ`,
      })),
      thua_du_an: ds.flatMap(({ h }) => thuaDong(h).map((d) => ({ ...d, stt: ++sttThua }))),
    },
    ho: ds.map(({ h, k }, i) => {
      const chuaDu = k.tatCa.filter((x) => x.dong.trangThai !== "TAM_TINH");
      const luaChon = [...new Set(k.tatCa.flatMap((x) => x.dong.luaChon.map((l) => `${x.dong.noiDung}: ${l.ma} – ${l.giaTri} (${l.lyDo})`)))];
      return {
        chung: {
          stt: i + 1,
          ten: h.ten,
          ma: h.ma,
          dia_chi: h.diaChi,
          so_dinh_danh: h.soDinhDanh,
          so_nhan_khau: h.nhanKhau.length,
          dt_thu_hoi: dtHo(h),
          tong_boi_thuong: so(k.tongBoiThuong),
          tong_ho_tro: so(k.tongHoTro),
          tong_chua_lam_tron: so(k.tong.tongChuaLamTron),
          tong_lam_tron: so(k.tong.tongLamTron),
          mo_ta_lam_tron: k.moTaLamTron,
          khau_tru: so(k.khauTru),
          con_lai: so(k.conLai),
          trang_thai_ban: ban ?? (k.tong.duocChot ? "" : "DỰ THẢO – CHƯA CHỐT"),
          luu_y: chuaDu.length ? `Còn ${chuaDu.length} khoản chưa đủ căn cứ/cần xác nhận, không cộng vào tổng: ${chuaDu.map((x) => x.dong.noiDung).join("; ")}` : "",
          lua_chon: luaChon.join("\n"),
        },
        bang: { thua: thuaDong(h), dong: dongChiTiet(h, k) },
      };
    }),
  };
}

/**
 * Mẫu Excel mặc định (bố cục của phần mềm, dạng có trường {{…}}) để đơn vị tải về sửa định dạng, tiêu đề, chữ ký rồi nạp lại.
 * Không phải biểu mẫu do cơ quan có thẩm quyền ban hành.
 */
export async function taoMauExcelMacDinh(): Promise<Uint8Array> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  const kieuO = (row: ExcelJS.Row, den: number, dam = false) => {
    row.font = { name: FONT, bold: dam };
    dongKe(row, 1, den);
  };
  // TH ĐẤT
  const wd = wb.addWorksheet("TH ĐẤT");
  wd.columns = [{ width: 6 }, { width: 30 }, { width: 30 }, { width: 8 }, { width: 8 }, { width: 30 }, { width: 14 }];
  wd.mergeCells("A1:G1");
  wd.getCell("A1").value = "BẢNG TỔNG HỢP DIỆN TÍCH ĐẤT THU HỒI – {{ten_du_an}}";
  wd.getCell("A1").font = { name: FONT, bold: true, size: 13 };
  wd.getCell("A1").alignment = { horizontal: "center" };
  wd.mergeCells("A2:G2");
  wd.getCell("A2").value = "{{ban}}";
  wd.getCell("A2").alignment = { horizontal: "center" };
  wd.getRow(3).values = ["STT", "Chủ sử dụng", "Địa chỉ", "Tờ", "Thửa", "Loại đất", "DT thu hồi (m²)"];
  kieuO(wd.getRow(3), 7, true);
  wd.getRow(4).values = ["{{#thua_du_an}}{{stt}}", "{{ten}}", "{{dia_chi}}", "{{to}}", "{{thua}}", "{{loai_dat}}", "{{dt_thu_hoi}}"];
  kieuO(wd.getRow(4), 7);
  wd.getCell("G4").numFmt = "#,##0.00";
  wd.getRow(5).values = ["", "Tổng cộng", "", "", "", "", { formula: "SUM(G4:G4)" } as ExcelJS.CellFormulaValue];
  kieuO(wd.getRow(5), 7, true);
  wd.getCell("G5").numFmt = "#,##0.00";

  // TH GIÁ TRỊ
  const tieu = ["STT", "Chủ sử dụng", "DT thu hồi (m²)", ...COT.map((c) => TEN_COT[c]), "Tổng bồi thường", "Tổng hỗ trợ", "Tổng cộng (làm tròn)", "Khấu trừ NVTC", "Sau khấu trừ", "Ghi chú"];
  const truong = ["{{#ho}}{{stt}}", "{{ten}}", "{{dt_thu_hoi}}", ...COT.map((c) => `{{${c.toLowerCase()}}}`), "{{tong_boi_thuong}}", "{{tong_ho_tro}}", "{{tong_lam_tron}}", "{{khau_tru}}", "{{con_lai}}", "{{ghi_chu}}"];
  const n = tieu.length;
  const wg = wb.addWorksheet("TH GIÁ TRỊ TRÌNH DUYỆT");
  wg.columns = tieu.map((_, i) => ({ width: i === 1 ? 28 : i === 0 ? 6 : i === n - 1 ? 26 : 15 }));
  wg.mergeCells(1, 1, 1, n);
  wg.getCell(1, 1).value = "BẢNG TỔNG HỢP GIÁ TRỊ BỒI THƯỜNG, HỖ TRỢ TRÌNH DUYỆT – {{ten_du_an}}";
  wg.getCell(1, 1).font = { name: FONT, bold: true, size: 13 };
  wg.getCell(1, 1).alignment = { horizontal: "center" };
  wg.mergeCells(2, 1, 2, n);
  wg.getCell(2, 1).value = "{{ban}}";
  wg.getCell(2, 1).alignment = { horizontal: "center" };
  const hg = wg.getRow(3);
  hg.values = tieu;
  kieuO(hg, n, true);
  hg.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  hg.height = 48;
  wg.getRow(4).values = truong;
  kieuO(wg.getRow(4), n);
  wg.getRow(4).getCell(3).numFmt = "#,##0.00";
  for (let c = 4; c < n; c++) wg.getRow(4).getCell(c).numFmt = DINH_DANG_TIEN;
  wg.getRow(5).values = ["", "Tổng cộng", ...Array.from({ length: n - 3 }, (_, i) => ({ formula: `SUM(${colName(3 + i)}4:${colName(3 + i)}4)` }) as ExcelJS.CellFormulaValue)];
  kieuO(wg.getRow(5), n, true);
  wg.getRow(5).getCell(3).numFmt = "#,##0.00";
  for (let c = 4; c < n; c++) wg.getRow(5).getCell(c).numFmt = DINH_DANG_TIEN;

  // Trang từng hộ
  const ws = wb.addWorksheet("{{stt}}. {{ten}}", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 6 }, { width: 44 }, { width: 8 }, { width: 12 }, { width: 10 }, { width: 13 }, { width: 16 }, { width: 30 }, { width: 13 }, { width: 44 }];
  ws.getCell("A1").value = "UBND {{xa_hoa}}";
  ws.getCell("A1").font = { name: FONT, bold: true };
  ws.getCell("H1").value = "{{trang_thai_ban}}";
  ws.getCell("H1").font = { name: FONT, bold: true, color: { argb: "FFC00000" } };
  const giua = (r: number, text: string, dam = true, co = 12) => {
    ws.mergeCells(r, 1, r, 10);
    ws.getCell(r, 1).value = text;
    ws.getCell(r, 1).font = { name: FONT, bold: dam, size: co };
    ws.getCell(r, 1).alignment = { horizontal: "center", wrapText: true };
  };
  giua(3, "PHƯƠNG ÁN CHI TIẾT BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ", true, 13);
  giua(4, "Dự án: {{ten_du_an}}", false);
  const dong = (r: number, nhan: string, gt: string) => {
    ws.getCell(r, 1).value = nhan;
    ws.getCell(r, 1).font = { name: FONT, bold: true };
    ws.mergeCells(r, 2, r, 10);
    ws.getCell(r, 2).value = gt;
    ws.getCell(r, 2).font = { name: FONT };
  };
  dong(6, "1.", "Họ và tên: {{ten}}   ·   Mã hồ sơ: {{ma}}");
  dong(7, "", "Địa chỉ: {{dia_chi}}   ·   Số định danh: {{so_dinh_danh}}   ·   Nhân khẩu: {{so_nhan_khau}}");
  dong(8, "2.", "Thửa đất bị thu hồi:");
  ws.getRow(9).values = ["TT", "Tờ / thửa", "Loại đất", "DT thửa (m²)", "", "DT thu hồi (m²)", "", "Nguồn gốc sử dụng"];
  kieuO(ws.getRow(9), 8, true);
  ws.getRow(10).values = ["{{#thua}}{{stt}}", "Tờ {{to}}, thửa {{thua}}", "{{loai_dat}}", "{{dt_thua}}", "", "{{dt_thu_hoi}}", "", "{{nguon_goc}}"];
  kieuO(ws.getRow(10), 8);
  ws.getCell("D10").numFmt = "#,##0.00";
  ws.getCell("F10").numFmt = "#,##0.00";
  dong(12, "3.", "Giá trị bồi thường, hỗ trợ:");
  const dau = ws.getRow(13);
  dau.values = ["STT", "Danh mục", "ĐVT", "Khối lượng", "Hệ số / mức hỗ trợ", "Đơn giá (đồng)", "Thành tiền (đồng)", "Căn cứ pháp lý", "Trạng thái", "Diễn giải tính"];
  kieuO(dau, 10, true);
  dau.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  dau.height = 32;
  const lap = ["{{stt}}", "{{noi_dung}}", "{{dvt}}", "{{khoi_luong}}", "{{he_so}}", "{{don_gia}}", "{{thanh_tien}}", "{{can_cu}}", "{{trang_thai}}", "{{dien_giai}}"];
  ([["phan", true, false], ["nhom", true, true], [null, false, false]] as const).forEach(([cap, dam, nghieng], i) => {
    const row = ws.getRow(14 + i);
    row.values = [`{{#dong${cap ? "." + cap : ""}}}${lap[0]}`, ...lap.slice(1)];
    kieuO(row, 10, dam);
    row.font = { name: FONT, bold: dam, italic: nghieng };
    row.getCell(7).numFmt = DINH_DANG_TIEN;
    if (!cap) {
      row.alignment = { vertical: "top", wrapText: true };
      row.getCell(4).numFmt = "#,##0.##";
      row.getCell(6).numFmt = DINH_DANG_TIEN;
      row.getCell(10).font = { name: FONT, size: 9, color: { argb: "FF555555" } };
    }
  });
  const tongD = (r: number, nhan: string, truongTien: string) => {
    const row = ws.getRow(r);
    row.values = ["", nhan, "", "", "", "", truongTien];
    kieuO(row, 10, true);
    row.getCell(7).numFmt = DINH_DANG_TIEN;
  };
  tongD(17, "TỔNG CỘNG (A + B)", "{{tong_chua_lam_tron}}");
  tongD(18, "Tổng sau làm tròn — {{mo_ta_lam_tron}}", "{{tong_lam_tron}}");
  tongD(19, "Khấu trừ nghĩa vụ tài chính", "{{khau_tru}}");
  tongD(20, "Số tiền thực nhận", "{{con_lai}}");
  dong(22, "Lưu ý:", "{{luu_y}}");
  dong(23, "Lựa chọn:", "{{lua_chon}}");
  ws.getCell(25, 2).value = "NGƯỜI LẬP";
  ws.getCell(25, 8).value = "ĐẠI DIỆN HỘ / TỔ CHỨC";
  ws.getRow(25).font = { name: FONT, bold: true };
  return new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

/** Báo cáo tổng hợp nhiều dự án: trang "Tổng hợp" (nhóm theo xã, cộng xã, tổng cộng) và "Vướng mắc". */
export async function taoWorkbookBaoCao(bc: BaoCao, coQuan: string, dsKy: KyBaoCao[] = [], hoVm: import("./bao-cao-dinh-ky").HoVuongMac[] = []): Promise<ExcelJS.Workbook> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  const ws = wb.addWorksheet("Tổng hợp", { pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const cot = ["TT", "Dự án / Xã", "Tình trạng", "Số hộ", "DT thu hồi (m²)", "Kinh phí tạm tính (đ)", "Số hộ đã duyệt PA", "Kinh phí đã duyệt (đ)", "Đã chi trả (đ)", "Còn phải chi (đ)", "Hộ hoàn thành GPMB", "Tỷ lệ hoàn thành", "Hộ vướng mắc", "Chặng hiện tại", "Cảnh báo cần xử lý"];
  ws.columns = cot.map((_, i) => ({ width: [5, 42, 16, 8, 14, 18, 10, 18, 18, 18, 11, 10, 10, 26, 10][i] }));
  const ngay = bc.loc.denNgay.split("-").reverse().join("/");
  const tieuDe = (r: number, v: string, f: Partial<ExcelJS.Font>) => {
    ws.mergeCells(r, 1, r, cot.length);
    ws.getCell(r, 1).value = v;
    ws.getCell(r, 1).font = { name: FONT, ...f };
    ws.getCell(r, 1).alignment = { horizontal: "center", wrapText: true };
  };
  tieuDe(1, coQuan.toUpperCase(), { bold: true, size: 12 });
  tieuDe(2, "BÁO CÁO TỔNG HỢP TÌNH HÌNH BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ CÁC DỰ ÁN", { bold: true, size: 13 });
  tieuDe(3, `Số liệu tính đến ngày ${ngay}${bc.loc.xa ? ` — ${bc.loc.xa}` : ""}${bc.loc.tinhTrang ? ` — ${TEN_TINH_TRANG[bc.loc.tinhTrang]}` : ""}. Kinh phí tạm tính theo bảng tính hiện tại; kinh phí đã duyệt theo các bản phương án đã phê duyệt.`, { italic: true });
  ws.getRow(3).height = 30;
  const hd = ws.getRow(5);
  hd.values = cot;
  hd.font = { name: FONT, bold: true };
  hd.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  hd.height = 48;
  dongKe(hd, 1, cot.length);
  const TIEN = [6, 8, 9, 10];
  const soLieu = (x: SoLieu) => [x.soHo, x.dtThuHoi.toDecimalPlaces(2).toNumber(), so(x.tamTinh), x.soHoDaDuyet, so(x.daDuyet), so(x.daChi), so(x.conPhaiChi), x.theoTrangThai.HOAN_THANH, x.soHo ? x.theoTrangThai.HOAN_THANH / x.soHo : 0, x.theoTrangThai.VUONG_MAC];
  const dinhDang = (row: ExcelJS.Row, dam = false) => {
    row.font = { name: FONT, bold: dam };
    row.alignment = { vertical: "top", wrapText: true };
    for (const k of TIEN) row.getCell(k).numFmt = DINH_DANG_TIEN;
    row.getCell(5).numFmt = "#,##0.00";
    row.getCell(12).numFmt = "0%";
    dongKe(row, 1, cot.length);
  };
  let r = 6;
  let tt = 0;
  for (const nhom of bc.theoXa) {
    const rx = ws.getRow(r++);
    rx.values = ["", nhom.xa];
    rx.font = { name: FONT, bold: true, italic: true };
    dongKe(rx, 1, cot.length);
    for (const d of nhom.dong) {
      const row = ws.getRow(r++);
      const [soHo, dt, tamTinh, soHoDuyet, daDuyet, daChi, conPhaiChi, hoanThanh, tyLe, vuongMac] = soLieu(d);
      row.values = [++tt, d.duAn.ten, TEN_TINH_TRANG[d.tinhTrang], soHo, dt, tamTinh, soHoDuyet, daDuyet, daChi, conPhaiChi, hoanThanh, tyLe, vuongMac, d.changHienTai, d.canhBaoCao];
      dinhDang(row);
    }
    if (bc.theoXa.length > 1) {
      const rc = ws.getRow(r++);
      rc.values = ["", `Cộng ${nhom.xa.replace(/^Xã |^Phường /, (m) => m.toLowerCase())}`, "", ...soLieu(nhom.tong), "", nhom.tong.canhBaoCao];
      dinhDang(rc, true);
    }
  }
  const tg = ws.getRow(r++);
  tg.values = ["", `TỔNG CỘNG (${bc.tong.soDuAn} dự án)`, "", ...soLieu(bc.tong), "", bc.tong.canhBaoCao];
  dinhDang(tg, true);
  r++;
  const ghiChu = [
    bc.tong.soHoChamTraThieuTyLe ? `Có ${bc.tong.soHoChamTraThieuTyLe} hộ chi trả quá hạn 30 ngày nhưng chưa nhập tỷ lệ tiền chậm nộp — chưa tính được tiền chậm trả (k3 Đ94 LĐĐ 2024).` : "",
    bc.tong.chamTra.gt(0) ? `Tiền chậm trả tạm tính: ${bc.tong.chamTra.toDecimalPlaces(0).toNumber().toLocaleString("vi-VN")} đ (chưa phê duyệt).` : "",
    "Tình trạng dự án: Hoàn thành GPMB = mọi hộ đã xác nhận chi trả (bước 12); Có vướng mắc = có hộ vướng mắc hoặc cảnh báo cần xử lý ngay.",
  ].filter(Boolean);
  for (const g of ghiChu) {
    ws.mergeCells(r, 1, r, cot.length);
    ws.getCell(r, 1).value = g;
    ws.getCell(r++, 1).font = { name: FONT, italic: true, size: 10 };
  }
  ws.views = [{ state: "frozen", ySplit: 5, xSplit: 2 }];

  const vm = wb.addWorksheet("Vướng mắc");
  vm.columns = [{ width: 5 }, { width: 18 }, { width: 40 }, { width: 70 }, { width: 36 }];
  const h2 = vm.getRow(1);
  h2.values = ["TT", "Xã", "Dự án", "Nội dung cần xử lý ngay", "Căn cứ"];
  h2.font = { name: FONT, bold: true };
  dongKe(h2, 1, 5);
  let i = 0;
  for (const d of bc.dong)
    for (const c of d.vuongMac) {
      const row = vm.getRow(i + 2);
      row.values = [++i, d.duAn.xa, d.duAn.ten, c.noiDung, c.canCu ?? ""];
      row.font = { name: FONT };
      row.alignment = { vertical: "top", wrapText: true };
      dongKe(row, 1, 5);
    }
  if (!i) vm.getCell(2, 1).value = "Không có cảnh báo cần xử lý ngay.";

  // Diễn biến theo các kỳ đã chốt (cùng bộ lọc) + số liệu hiện tại
  if (dsKy.length) {
    const db = wb.addWorksheet("Diễn biến");
    const c3 = ["Kỳ", "Số liệu đến", "Người chốt", "Số dự án", "Số hộ", "Hộ hoàn thành", "Tỷ lệ hoàn thành", "Hộ đã duyệt PA", "Kinh phí đã duyệt (đ)", "Đã chi trả (đ)", "Tỷ lệ chi / duyệt", "Hộ vướng mắc", "Mã băm SHA-256"];
    db.columns = c3.map((_, k) => ({ width: [22, 12, 18, 9, 9, 11, 10, 11, 18, 18, 10, 10, 30][k] }));
    const hd3 = db.getRow(1);
    hd3.values = c3;
    hd3.font = { name: FONT, bold: true };
    hd3.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    dongKe(hd3, 1, c3.length);
    const dong = (v: unknown[], dam = false) => {
      const row = db.addRow(v);
      row.font = { name: FONT, bold: dam };
      for (const k of [9, 10]) row.getCell(k).numFmt = DINH_DANG_TIEN;
      for (const k of [7, 11]) row.getCell(k).numFmt = "0%";
      dongKe(row, 1, c3.length);
    };
    for (const k of sapXepKy(dsKy)) {
      const t = tongKy(k, bc.loc);
      dong([k.ten, k.denNgay.split("-").reverse().join("/"), k.nguoi, t.soDuAn, t.soHo, t.hoanThanh, t.soHo ? t.hoanThanh / t.soHo : 0, t.soHoDaDuyet, so(t.daDuyet), so(t.daChi), t.daDuyet.gt(0) ? t.daChi.div(t.daDuyet).toNumber() : 0, t.vuongMac, k.bam]);
    }
    const s = bc.tong;
    dong(["Hiện tại (chưa chốt)", ngay, "", s.soDuAn, s.soHo, s.theoTrangThai.HOAN_THANH, s.soHo ? s.theoTrangThai.HOAN_THANH / s.soHo : 0, s.soHoDaDuyet, so(s.daDuyet), so(s.daChi), s.daDuyet.gt(0) ? s.daChi.div(s.daDuyet).toNumber() : 0, s.theoTrangThai.VUONG_MAC, ""], true);
  }
  // §11.4: danh sách hộ vướng mắc — bước đang thực hiện, số ngày tồn đọng
  if (hoVm.length) {
    const wv = wb.addWorksheet("Hộ vướng mắc", { pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    wv.columns = [5, 36, 10, 26, 30, 12, 60].map((width) => ({ width }));
    const d = wv.addRow(["TT", "Dự án", "Mã hồ sơ", "Họ tên / tổ chức", "Bước đang thực hiện", "Số ngày tồn đọng", "Vướng mắc"]);
    d.font = { name: FONT, bold: true };
    hoVm.forEach((x, n) => {
      const r = wv.addRow([n + 1, x.du_an, x.ma, x.ten, x.buoc, x.so_ngay, x.noi_dung]);
      r.font = { name: FONT };
      r.alignment = { vertical: "top", wrapText: true };
    });
  }
  return wb;
}

/**
 * P3-3: quỹ tái định cư — trang "Quỹ TĐC" (mọi lô, trạng thái, hộ được giao), "Hộ chờ bố trí" (hộ có TĐC giao đất ở /
 * nhà ở chưa có lô — dùng lập danh sách bốc thăm), "Lô trống", "Kết quả bốc thăm" (theo biên bản đã ghi nhận).
 */
export async function taoWorkbookQuyTdc(duAn: DuAn, hos: Ho[]): Promise<ExcelJS.Workbook> {
  const { default: Excel } = await import("exceljs");
  const q = quyCua(duAn);
  const tenHo = (id: string) => {
    const h = hos.find((x) => x.id === id);
    return h ? `${h.ma} – ${h.ten}` : "(hồ sơ không còn)";
  };
  const soN = (v?: string) => (v && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null);
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  const trang = (ten: string, tieuDe: string, cot: { t: string; w: number; tien?: boolean }[], dong: (string | number | null)[][]) => {
    const ws = wb.addWorksheet(ten, { pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.mergeCells(1, 1, 1, cot.length);
    ws.getCell(1, 1).value = tieuDe;
    ws.getCell(1, 1).font = { name: FONT, bold: true, size: 13 };
    ws.getCell(1, 1).alignment = { horizontal: "center" };
    ws.getRow(3).values = cot.map((c) => c.t);
    ws.getRow(3).font = { name: FONT, bold: true };
    cot.forEach((c, i) => (ws.getColumn(i + 1).width = c.w));
    dong.forEach((d, i) => (ws.getRow(4 + i).values = d));
    for (let r = 3; r < 4 + dong.length; r++)
      for (let c = 1; c <= cot.length; c++) {
        const o = ws.getCell(r, c);
        o.border = VIEN;
        o.font = { name: FONT, bold: r === 3 };
        o.alignment = { vertical: "middle", wrapText: true, horizontal: r === 3 ? "center" : undefined };
        if (cot[c - 1]!.tien && r > 3) o.numFmt = DINH_DANG_TIEN;
      }
    return ws;
  };
  const lo = [...q.lo].sort((a, b) => `${a.khu}|${a.soLo}`.localeCompare(`${b.khu}|${b.soLo}`, "vi", { numeric: true }));
  trang("Quỹ TĐC", `QUỸ ĐẤT Ở, NHÀ Ở TÁI ĐỊNH CƯ – ${duAn.ten.toUpperCase()}`, [
    { t: "STT", w: 6 }, { t: "Khu, điểm TĐC", w: 26 }, { t: "Lô / căn", w: 10 }, { t: "Loại", w: 12 }, { t: "DT (m²)", w: 10, tien: true }, { t: "Giá (đ/m²)", w: 14, tien: true }, { t: "Căn cứ giá", w: 34 }, { t: "Trạng thái", w: 12 }, { t: "Hộ được giao", w: 30 }, { t: "Hình thức, căn cứ giao", w: 36 },
  ], lo.map((l, i) => [i + 1, l.khu, l.soLo, TEN_LOAI_LO[l.loai], soN(l.dienTich), soN(l.gia), l.canCuGia ?? "", TEN_TT_LO[trangThaiLo(l)] + (l.giuLai ? `: ${l.giuLai}` : ""), l.giao ? tenHo(l.giao.hoId) : "", l.giao ? `${TEN_HINH_THUC_GIAO[l.giao.hinhThuc]} ngày ${l.giao.ngay.split("-").reverse().join("/")} – ${l.giao.canCu}` : ""]));
  const daGiao = new Set(q.lo.filter((l) => l.giao).map((l) => l.giao!.hoId));
  const cho = hos.filter((h) => canBoTriLo(h) && !daGiao.has(h.id)).sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true }));
  trang("Hộ chờ bố trí", `DANH SÁCH HỘ ĐƯỢC BỐ TRÍ TÁI ĐỊNH CƯ CHƯA GIAO LÔ – ${duAn.ten.toUpperCase()}`, [
    { t: "STT", w: 6 }, { t: "Mã hồ sơ", w: 12 }, { t: "Họ tên", w: 30 }, { t: "Địa chỉ", w: 34 }, { t: "Hình thức", w: 20 }, { t: "Ghi chú", w: 30 },
  ], cho.map((h, i) => [i + 1, h.ma, h.ten, h.diaChi, h.hoTro.taiDinhCu!.hinhThuc === "NHA_O" ? "Giao nhà ở" : "Giao đất ở", ""]));
  const trong = lo.filter((l) => trangThaiLo(l) === "TRONG");
  trang("Lô trống", `DANH SÁCH LÔ, CĂN CÒN TRỐNG – ${duAn.ten.toUpperCase()}`, [
    { t: "STT", w: 6 }, { t: "Khu, điểm TĐC", w: 26 }, { t: "Lô / căn", w: 10 }, { t: "Loại", w: 12 }, { t: "DT (m²)", w: 10, tien: true }, { t: "Giá (đ/m²)", w: 14, tien: true }, { t: "Căn cứ giá", w: 40 },
  ], trong.map((l, i) => [i + 1, l.khu, l.soLo, TEN_LOAI_LO[l.loai], soN(l.dienTich), soN(l.gia), l.canCuGia ?? ""]));
  if (q.bocTham || q.ketQuaBocTham?.length) {
    const dong: (string | number | null)[][] = [];
    for (const b of q.ketQuaBocTham ?? [])
      for (const x of b.ketQua) {
        const l = q.lo.find((y) => y.id === x.loId);
        dong.push([b.bienBan, b.ngay.split("-").reverse().join("/"), x.stt, tenHo(x.hoId), l ? tenLo(l) : "(lô không còn)"]);
      }
    trang("Kết quả bốc thăm", `KẾT QUẢ BỐC THĂM LÔ TÁI ĐỊNH CƯ – ${duAn.ten.toUpperCase()}`, [
      { t: "Biên bản", w: 28 }, { t: "Ngày", w: 12 }, { t: "Thứ tự bốc", w: 10 }, { t: "Hộ", w: 32 }, { t: "Lô / căn", w: 32 },
    ], dong);
  }
  return wb;
}

export async function xuatExcelQuyTdc(duAn: DuAn, hos: Ho[]) {
  await taiVe(await taoWorkbookQuyTdc(duAn, hos), `Quy-TDC_${tenAnToan(duAn.ten)}.xlsx`);
}
