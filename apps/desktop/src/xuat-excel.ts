/**
 * Xuất Excel theo cấu trúc biểu áp giá người dùng cung cấp:
 *  - Mỗi hộ một trang "phương án chi tiết" (A. Bồi thường, B. Hỗ trợ, tổng, làm tròn, khấu trừ);
 *  - "TH ĐẤT": tổng hợp diện tích thu hồi theo thửa, loại đất;
 *  - "TH GIÁ TRỊ TRÌNH DUYỆT": tổng hợp giá trị theo cột.
 * Tệp được tạo trên máy, không gửi đi đâu.
 */
import type ExcelJS from "exceljs";
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import { tenTep } from "./ten-tep";
import { tinhChiTra, type GiaiDoanTyLe } from "./chi-tra";
import { TEN_COT, type CotTongHop, type KetQuaHo } from "./tinh-ho";

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
    row.values = [i + 1, `Tờ ${t.soTo}, thửa ${t.soThua}`, t.loaiDat, Number(t.dienTich) || null, "", Number(t.dienTichThuHoi) || null, "", t.nguonGoc || ""];
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
  const cong = (ds: KetQuaHo["tatCa"]) => ds.reduce((s, x) => (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien ? s.plus(x.dong.thanhTien) : s), D(0));
  const phan = (chu: string, tenPhan: string, dsNhom: KetQuaHo["nhom"]) => {
    if (!dsNhom.length) return;
    const rp = ws.getRow(r++);
    rp.values = [chu, tenPhan, "", "", "", "", so(cong(dsNhom.flatMap((n) => n.dong)))];
    rp.font = { name: FONT, bold: true };
    rp.getCell(7).numFmt = DINH_DANG_TIEN;
    dongKe(rp, 1, N);
    dsNhom.forEach((n) => {
      const rn = ws.getRow(r++);
      rn.values = [n.ma.split(".")[1], n.ten, "", "", "", "", so(cong(n.dong))];
      rn.font = { name: FONT, bold: true, italic: true };
      rn.getCell(7).numFmt = DINH_DANG_TIEN;
      dongKe(rn, 1, N);
      n.dong.forEach((x, j) => {
        const t = h.thua.find((y) => y.id === x.thuaId);
        const tenDong = x.dong.noiDung + (t && !x.dong.noiDung.includes(`Thửa ${t.soThua}`) ? ` (thửa ${t.soThua}, tờ ${t.soTo})` : "");
        const trangThai = x.dong.trangThai === "TAM_TINH" ? (x.dong.luaChon.length ? "Có lựa chọn" : "Tạm tính") : x.dong.trangThai === "CAN_XAC_NHAN" ? "Cần xác nhận" : "Thiếu căn cứ";
        const canCu = x.dong.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(", ")).join("; ");
        const dienGiai = [x.dong.congThuc, ...Object.entries(x.dong.thamSo).map(([k, v]) => `${k}: ${v}`)].join("\n");
        const dsBieu = x.bieu && x.bieu.length ? x.bieu : [null];
        dsBieu.forEach((b, k) => {
          const rw = ws.getRow(r++);
          const thanhTien = b ? (b.heSo ? b.kl.mul(b.heSo).mul(b.donGia) : x.dong.thanhTien) : x.dong.thanhTien;
          rw.values = [
            k === 0 ? j + 1 : "",
            k === 0 ? tenDong + (b?.ghiChu ? ` – ${b.ghiChu}` : "") : `   ${b?.ghiChu ?? ""}`,
            b?.dvt ?? "",
            b ? b.kl.toNumber() : null,
            b?.heSo ? b.heSo.toDecimalPlaces(4).toNumber() : null,
            b ? so(b.donGia) : null,
            x.dong.trangThai === "TAM_TINH" ? so(thanhTien) : null,
            k === 0 ? canCu : "",
            k === 0 ? trangThai : "",
            k === 0 ? dienGiai : "",
          ];
          rw.font = { name: FONT, size: 11 };
          rw.alignment = { vertical: "top", wrapText: true };
          rw.getCell(4).numFmt = "#,##0.##";
          rw.getCell(6).numFmt = DINH_DANG_TIEN;
          rw.getCell(7).numFmt = DINH_DANG_TIEN;
          rw.getCell(10).font = { name: FONT, size: 9, color: { argb: "FF555555" } };
          if (x.dong.trangThai !== "TAM_TINH") rw.getCell(9).font = { name: FONT, size: 11, color: { argb: "FFC00000" } };
          dongKe(rw, 1, N);
        });
      });
    });
  };
  phan("A", "GIÁ TRỊ BỒI THƯỜNG", kq.nhom.filter((n) => n.ma.startsWith("A")));
  phan("B", "GIÁ TRỊ HỖ TRỢ", kq.nhom.filter((n) => n.ma.startsWith("B")));
  const tongDong = (nhan: string, v: Decimal) => {
    const rt = ws.getRow(r++);
    rt.values = ["", nhan, "", "", "", "", so(v)];
    rt.font = { name: FONT, bold: true };
    rt.getCell(7).numFmt = DINH_DANG_TIEN;
    dongKe(rt, 1, N);
  };
  tongDong("TỔNG CỘNG (A + B)", kq.tong.tongChuaLamTron);
  tongDong("Làm tròn (lên đến nghìn đồng)", kq.tong.tongLamTron);
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
  hd.values = ["STT", "Chủ sử dụng", "Địa chỉ", "Tờ", "Thửa", "DT thu hồi (m²)", ...loaiDat];
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
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = tenTep;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

const tenAnToan = (s: string) => tenTep(s, 80);

export async function xuatExcelDuAn(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], ban?: string) {
  await taiVe(await taoWorkbook(duAn, ds, ban), `Phuong-an_${tenAnToan(duAn.ten)}.xlsx`);
}

export async function xuatExcelHo(duAn: DuAn, h: Ho, k: KetQuaHo) {
  await taiVe(await taoWorkbook(duAn, [{ h, k }]), `Phuong-an-chi-tiet_${tenAnToan(h.ma + " " + h.ten)}.xlsx`);
}
