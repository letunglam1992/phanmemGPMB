/**
 * Bảng Excel tổng hợp toàn tỉnh (nút "Xuất Excel" và phụ lục kèm báo cáo Word): trang "Theo xa" (cộng theo xã, phường) và
 * trang "Tung du an" (chi tiết từng dự án, số hộ theo hiện trạng). Số liệu từ tóm tắt gói các đơn vị gửi — không có tên người.
 */
import { D } from "@gpmb/core";
import { THU_TU_TRANG_THAI, TT_GPMB } from "../trang-thai";
import type { DongBaoCao } from "./bao-cao-tinh";

const ngayGio = (iso: string) => {
  const d = new Date(iso);
  const h = (n: number) => String(n).padStart(2, "0");
  return `${h(d.getDate())}/${h(d.getMonth() + 1)}/${d.getFullYear()} ${h(d.getHours())}:${h(d.getMinutes())}`;
};
const tenXa = (d: { xa: string }) => d.xa || "(Chưa ghi xã, phường)";

const FONT = "Times New Roman";
const VIEN = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as const;
/** Kiểu cột: số nguyên (#,##0), tiền đồng, diện tích (2 chữ số lẻ), tỷ lệ (%), chữ, ngày giờ */
type KieuCot = "so" | "tien" | "dt" | "tyLe" | "chu" | "giua";
const DINH_DANG: Partial<Record<KieuCot, string>> = { so: "#,##0", tien: "#,##0", dt: "#,##0.00", tyLe: "0.0%" };

/**
 * Trang biểu theo thể thức báo cáo (như Báo cáo tổng hợp các dự án — xuat-excel.ts): tên đơn vị, tên biểu căn giữa, dòng
 * ghi chú nghiêng, dòng tiêu đề cột đậm có khung, dòng số liệu có khung, định dạng số; khổ A4 ngang, vừa chiều ngang trang,
 * lặp dòng tiêu đề khi in, cố định tiêu đề khi cuộn.
 */
function trangBieu(wb: import("exceljs").Workbook, ten: string, o: { donVi: string; phuLuc?: string; tieuDe: string; ghiChu: string; cot: { ten: string; rong: number; kieu: KieuCot }[] }) {
  const ws = wb.addWorksheet(ten, {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: "&C&\"Times New Roman\"&9Trang &P/&N" },
  });
  const n = o.cot.length;
  ws.columns = o.cot.map((c) => ({ width: c.rong }));
  const tieuDe = (v: string, f: Partial<import("exceljs").Font>, cao?: number) => {
    const r = ws.addRow([v]);
    ws.mergeCells(r.number, 1, r.number, n);
    r.getCell(1).font = { name: FONT, size: 12, ...f };
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (cao) r.height = cao;
  };
  tieuDe(o.donVi.toUpperCase(), { bold: true, size: 12 });
  if (o.phuLuc) tieuDe(o.phuLuc, { bold: true, size: 12 });
  tieuDe(o.tieuDe, { bold: true, size: 13 }, 22);
  tieuDe(o.ghiChu, { italic: true, size: 11 }, 30);
  ws.addRow([]);
  const hd = ws.addRow(o.cot.map((c) => c.ten));
  hd.height = 60;
  hd.eachCell((c) => {
    c.font = { name: FONT, size: 11, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = VIEN;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F1EC" } };
  });
  const so = ws.addRow(o.cot.map((_, i) => `(${i + 1})`));
  so.eachCell((c) => {
    c.font = { name: FONT, size: 10, italic: true };
    c.alignment = { horizontal: "center" };
    c.border = VIEN;
  });
  ws.views = [{ state: "frozen", ySplit: hd.number + 1, xSplit: 2 }];
  ws.pageSetup.printTitlesRow = `${hd.number}:${so.number}`;
  /** Dòng số liệu: kiểu "thuong" | "nhom" (tên xã, gộp ô) | "tong" (đậm) */
  const dong = (v: (string | number | null)[], kieu: "thuong" | "nhom" | "tong" = "thuong", gopDen = 2) => {
    const r = ws.addRow(v);
    for (let c = 1; c <= n; c++) {
      const o2 = r.getCell(c);
      const k = o.cot[c - 1]!.kieu;
      o2.border = VIEN;
      o2.font = { name: FONT, size: 11, bold: kieu !== "thuong", italic: kieu === "nhom" };
      o2.alignment = { vertical: "top", wrapText: k === "chu", horizontal: k === "giua" ? "center" : k === "chu" ? "left" : "right" };
      if (DINH_DANG[k]) o2.numFmt = DINH_DANG[k]!;
    }
    if (kieu === "nhom") {
      ws.mergeCells(r.number, 2, r.number, n);
      r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    }
    if (kieu === "tong") {
      if (gopDen > 2) ws.mergeCells(r.number, 2, r.number, gopDen);
      r.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      for (let c = 1; c <= n; c++) r.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F1" } };
    }
    return r;
  };
  const chuThich = (v: string) => {
    const r = ws.addRow([v]);
    ws.mergeCells(r.number, 1, r.number, n);
    r.getCell(1).font = { name: FONT, size: 10, italic: true };
    r.getCell(1).alignment = { wrapText: true, vertical: "top" };
    r.height = 28;
  };
  return { ws, dong, chuThich };
}

export async function taoExcelTinh(dong: DongBaoCao[], donVi: string, tieuDePhuLuc = false): Promise<Uint8Array> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "GPMB Sơn La";
  const nhom = new Map<string, DongBaoCao[]>();
  for (const d of dong) nhom.set(tenXa(d), [...(nhom.get(tenXa(d)) ?? []), d]);
  const xa = [...nhom.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  const ghiChu = `Lập lúc ${ngayGio(new Date().toISOString())}; số liệu theo gói các đơn vị gửi. Giá trị tạm tính chưa phải số đã phê duyệt.`;
  const bg = (d: DongBaoCao) => d.theoTrangThai.HOAN_THANH ?? 0;
  const cong = (ds: DongBaoCao[], f: (d: DongBaoCao) => number) => ds.reduce((s, d) => s + f(d), 0);
  const tien = (ds: DongBaoCao[]) => Number(ds.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0)).toFixed(0));
  const dt = (ds: DongBaoCao[]) => Number(ds.reduce((s, d) => s.plus(D(d.dienTichThuHoi)), D(0)).toFixed(2));
  const tyLe = (a: number, b: number) => (b ? a / b : 0);

  // Trang 1: tổng hợp theo xã, phường
  const t1 = trangBieu(wb, "Theo xa", {
    donVi,
    phuLuc: tieuDePhuLuc ? "PHỤ LỤC 01" : undefined,
    tieuDe: "TỔNG HỢP TIẾN ĐỘ BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ THEO XÃ, PHƯỜNG",
    ghiChu,
    cot: [
      { ten: "STT", rong: 6, kieu: "giua" },
      { ten: "Xã, phường", rong: 28, kieu: "chu" },
      { ten: "Số dự án", rong: 10, kieu: "so" },
      { ten: "Số hộ", rong: 10, kieu: "so" },
      { ten: "Đã bàn giao mặt bằng (hộ)", rong: 13, kieu: "so" },
      { ten: "Tỷ lệ bàn giao", rong: 11, kieu: "tyLe" },
      { ten: "Hộ có vướng mắc", rong: 11, kieu: "so" },
      { ten: "Hộ đã chốt phương án", rong: 12, kieu: "so" },
      { ten: "Hộ đã duyệt phương án", rong: 12, kieu: "so" },
      { ten: "Giá trị tạm tính (đồng)", rong: 20, kieu: "tien" },
      { ten: "Diện tích thu hồi (m²)", rong: 16, kieu: "dt" },
    ],
  });
  const soLieuXa = (ds: DongBaoCao[]) => {
    const so = cong(ds, (d) => d.soHo);
    return [ds.length, so, cong(ds, bg), tyLe(cong(ds, bg), so), cong(ds, (d) => d.soVuongMac), cong(ds, (d) => d.soHoDaChotPA), cong(ds, (d) => d.soHoDaDuyetPA), tien(ds), dt(ds)];
  };
  xa.forEach(([ten, ds], i) => t1.dong([i + 1, ten, ...soLieuXa(ds)]));
  t1.dong(["", `TỔNG CỘNG (${xa.length} xã, phường)`, ...soLieuXa(dong)], "tong");
  t1.ws.addRow([]);
  t1.chuThich("Ghi chú: Đã bàn giao mặt bằng = hộ ở hiện trạng Hoàn thành GPMB; tỷ lệ bàn giao = số hộ đã bàn giao / tổng số hộ. Số liệu tổng hợp từ gói dữ liệu mã hóa các đơn vị gửi, không gồm thông tin cá nhân.");

  // Trang 2: chi tiết từng dự án, nhóm theo xã, phường
  const t2 = trangBieu(wb, "Tung du an", {
    donVi,
    phuLuc: tieuDePhuLuc ? "PHỤ LỤC 02" : undefined,
    tieuDe: "CHI TIẾT TIẾN ĐỘ BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ TỪNG DỰ ÁN",
    ghiChu,
    cot: [
      { ten: "STT", rong: 6, kieu: "giua" },
      { ten: "Xã, phường", rong: 18, kieu: "chu" },
      { ten: "Dự án", rong: 34, kieu: "chu" },
      { ten: "Chủ đầu tư", rong: 20, kieu: "chu" },
      { ten: "Đơn vị gửi", rong: 18, kieu: "chu" },
      { ten: "Số liệu đến", rong: 16, kieu: "giua" },
      { ten: "Số hộ", rong: 8, kieu: "so" },
      ...THU_TU_TRANG_THAI.map((t) => ({ ten: TT_GPMB[t].ten, rong: 11, kieu: "so" as const })),
      { ten: "Tỷ lệ đã bàn giao", rong: 10, kieu: "tyLe" },
      { ten: "Hộ đã chốt phương án", rong: 10, kieu: "so" },
      { ten: "Hộ đã phê duyệt phương án", rong: 10, kieu: "so" },
      { ten: "Hộ có vướng mắc", rong: 10, kieu: "so" },
      { ten: "Giá trị tạm tính (đồng)", rong: 18, kieu: "tien" },
      { ten: "Diện tích thu hồi (m²)", rong: 14, kieu: "dt" },
      { ten: "Tệp đính kèm", rong: 9, kieu: "so" },
    ],
  });
  const soLieuDa = (ds: DongBaoCao[]) => {
    const so = cong(ds, (d) => d.soHo);
    return [so, ...THU_TU_TRANG_THAI.map((t) => cong(ds, (d) => d.theoTrangThai[t] ?? 0)), tyLe(cong(ds, bg), so), cong(ds, (d) => d.soHoDaChotPA), cong(ds, (d) => d.soHoDaDuyetPA), cong(ds, (d) => d.soVuongMac), tien(ds), dt(ds), cong(ds, (d) => d.soTepDinhKem)];
  };
  let stt = 0;
  const la = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  xa.forEach(([ten, ds], k) => {
    t2.dong([la[k] ?? String(k + 1), `${ten} (${ds.length} dự án)`], "nhom");
    for (const d of ds) t2.dong([++stt, ten, d.ten, d.chuDauTu, d.donViGui, ngayGio(d.luc), ...soLieuDa([d])]);
  });
  t2.dong(["", `TỔNG CỘNG (${dong.length} dự án)`, "", "", "", "", ...soLieuDa(dong)], "tong", 6);
  t2.ws.addRow([]);
  t2.chuThich(`Ghi chú: Số hộ theo hiện trạng GPMB (${THU_TU_TRANG_THAI.map((t) => TT_GPMB[t].ten).join("; ")}); "Số liệu đến" là thời điểm đơn vị lập gói gửi. Giá trị tạm tính theo bảng tính hiện tại của đơn vị, chưa phải số đã phê duyệt.`);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
