/**
 * 1.0.5 — Biểu mẫu ghi kết quả thử trên máy thật: danh sách việc cần thử lấy nguyên từ docs/22 (các mục "### A…",
 * dòng "- [ ] …", sinh vào viec-thu.json bằng tools/tao-viec-thu.mjs), xuất Excel có cột Đạt / Không đạt / Ghi chú, ngày thử, người thử để gửi lại tác giả.
 * Không ghi gì về máy, không gửi đi đâu.
 */
import type ExcelJS from "exceljs";
import viecThu from "./viec-thu.json";
import type { NhomThu } from "./doc-viec-thu";
import { PHIEN_BAN } from "./phien-ban";

export const VIEC_THU = viecThu as NhomThu[];

export async function taoBieuMauThu(ds: NhomThu[] = VIEC_THU): Promise<Uint8Array> {
  const { default: Excel } = await import("exceljs");
  const wb: ExcelJS.Workbook = new Excel.Workbook();
  const ws = wb.addWorksheet("Kết quả thử", { pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 7 }, { width: 80 }, { width: 8 }, { width: 11 }, { width: 40 }];
  const vien = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as const;
  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = `BIỂU GHI KẾT QUẢ THỬ PHẦN MỀM GPMB SƠN LA TRÊN MÁY THẬT — PHIÊN BẢN ${PHIEN_BAN}`;
  ws.getCell("A1").font = { bold: true, size: 13 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.addRow([]);
  for (const [nhan] of [["Người thử, đơn vị:"], ["Máy (Windows, vai trò: xã / tỉnh / máy chủ):"], ["Ngày thử:"]]) {
    const r = ws.addRow([nhan]);
    ws.mergeCells(`A${r.number}:B${r.number}`);
    r.getCell(1).font = { bold: true };
  }
  ws.addRow([]);
  const dau = ws.addRow(["STT", "Việc cần thử", "Đạt (x)", "Không đạt (x)", "Ghi chú (lỗi gặp, ảnh chụp màn hình số…)"]);
  dau.eachCell((c) => {
    c.font = { bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF6" } };
    c.border = vien;
  });
  ws.views = [{ state: "frozen", ySplit: dau.number }];
  for (const n of ds) {
    const r = ws.addRow(["", n.ten]);
    ws.mergeCells(`B${r.number}:E${r.number}`);
    r.eachCell({ includeEmpty: true }, (c) => {
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      c.border = vien;
    });
    n.viec.forEach((v, i) => {
      const d = ws.addRow([i + 1, v, "", "", ""]);
      d.eachCell({ includeEmpty: true }, (c, k) => {
        c.border = vien;
        c.alignment = { vertical: "top", wrapText: true, horizontal: k === 1 || k === 3 || k === 4 ? "center" : "left" };
      });
    });
  }
  ws.addRow([]);
  const cuoi = ws.addRow(["", "Gửi lại biểu này (kèm ảnh chụp màn hình khi có lỗi) cho tác giả để khắc phục. Không gửi dữ liệu hồ sơ, thông tin cá nhân của người có đất."]);
  cuoi.getCell(2).font = { italic: true };
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
