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

export async function taoExcelTinh(dong: DongBaoCao[], donVi: string, tieuDePhuLuc = false): Promise<Uint8Array> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  const nhom = new Map<string, DongBaoCao[]>();
  for (const d of dong) nhom.set(tenXa(d), [...(nhom.get(tenXa(d)) ?? []), d]);
  const xa = [...nhom.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  const dau = (ws: import("exceljs").Worksheet, tieuDe: string, cot: string[]) => {
    ws.addRow([`${tieuDePhuLuc ? "PHỤ LỤC — " : ""}${tieuDe} — ${donVi.toUpperCase()}`]).font = { bold: true, size: 13 };
    ws.addRow([`Lập lúc ${ngayGio(new Date().toISOString())}; số liệu theo gói các đơn vị gửi. Giá trị tạm tính chưa phải số đã phê duyệt.`]);
    ws.addRow([]);
    const h = ws.addRow(cot);
    h.font = { bold: true };
    h.alignment = { wrapText: true, vertical: "middle" };
  };
  const bg = (d: DongBaoCao) => d.theoTrangThai.HOAN_THANH ?? 0;
  const cong = (ds: DongBaoCao[], f: (d: DongBaoCao) => number) => ds.reduce((s, d) => s + f(d), 0);
  const tien = (ds: DongBaoCao[]) => Number(ds.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0)).toFixed(0));
  const dt = (ds: DongBaoCao[]) => Number(ds.reduce((s, d) => s.plus(D(d.dienTichThuHoi)), D(0)).toFixed(1));

  const w1 = wb.addWorksheet("Theo xa");
  dau(w1, "TỔNG HỢP TIẾN ĐỘ BT, HT, TĐC THEO XÃ, PHƯỜNG", ["STT", "Xã, phường", "Số dự án", "Số hộ", "Đã bàn giao MB (hộ)", "Tỷ lệ bàn giao (%)", "Hộ có vướng mắc", "Hộ đã chốt PA", "Hộ đã duyệt PA", "Giá trị tạm tính (đồng)", "DT thu hồi (m²)"]);
  xa.forEach(([ten, ds], i) => {
    const so = cong(ds, (d) => d.soHo);
    w1.addRow([i + 1, ten, ds.length, so, cong(ds, bg), so ? Number(((cong(ds, bg) / so) * 100).toFixed(1)) : 0, cong(ds, (d) => d.soVuongMac), cong(ds, (d) => d.soHoDaChotPA), cong(ds, (d) => d.soHoDaDuyetPA), tien(ds), dt(ds)]);
  });
  const so = cong(dong, (d) => d.soHo);
  w1.addRow(["", "Tổng cộng", dong.length, so, cong(dong, bg), so ? Number(((cong(dong, bg) / so) * 100).toFixed(1)) : 0, cong(dong, (d) => d.soVuongMac), cong(dong, (d) => d.soHoDaChotPA), cong(dong, (d) => d.soHoDaDuyetPA), tien(dong), dt(dong)]).font = { bold: true };
  w1.columns.forEach((c, i) => (c.width = i === 1 ? 28 : 15));

  const w2 = wb.addWorksheet("Tung du an");
  dau(w2, "CHI TIẾT TỪNG DỰ ÁN", ["STT", "Xã, phường", "Dự án", "Chủ đầu tư", "Đơn vị gửi", "Số liệu đến", "Số hộ", ...THU_TU_TRANG_THAI.map((t) => TT_GPMB[t].ten), "Tỷ lệ đã bàn giao (%)", "Hộ đã chốt PA", "Hộ đã phê duyệt PA", "Hộ có vướng mắc", "Giá trị tạm tính (đồng)", "Diện tích thu hồi (m²)", "Tệp đính kèm"]);
  let stt = 0;
  for (const [ten, ds] of xa) {
    w2.addRow(["", ten, `${ds.length} dự án`]).font = { bold: true };
    for (const d of ds)
      w2.addRow([++stt, ten, d.ten, d.chuDauTu, d.donViGui, ngayGio(d.luc), d.soHo, ...THU_TU_TRANG_THAI.map((t) => d.theoTrangThai[t] ?? 0), d.soHo ? Number(((bg(d) / d.soHo) * 100).toFixed(1)) : 0, d.soHoDaChotPA, d.soHoDaDuyetPA, d.soVuongMac, Number(d.tongTamTinh), Number(d.dienTichThuHoi), d.soTepDinhKem]);
  }
  w2.columns.forEach((c, i) => (c.width = i === 2 ? 40 : i === 1 || i === 4 ? 24 : 14));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
