/**
 * 1.2.0 (C3) — Xem trước biểu Excel trong phần mềm: dựng bảng HTML từ workbook ExcelJS đã điền (ô gộp, đậm, nghiêng, căn lề,
 * định dạng số có dấu phân cách). Chỉ để soát số liệu trước khi tải — độ rộng cột, khung, thiết lập trang in xem ở Excel.
 */
import type ExcelJS from "exceljs";

const thoat = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "B3" → [hàng 3, cột 2] */
function oSang(dc: string): [number, number] {
  const m = /^([A-Z]+)(\d+)$/.exec(dc.replace(/\$/g, ""))!;
  const cot = [...m[1]!].reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0);
  return [Number(m[2]), cot];
}

function giaTri(o: ExcelJS.Cell): string {
  let v: unknown = o.value;
  if (v && typeof v === "object") {
    if ("result" in (v as object)) v = (v as { result: unknown }).result;
    else if ("richText" in (v as object)) v = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    else if ("text" in (v as object)) v = (v as { text: unknown }).text;
    else if (v instanceof Date) v = `${String(v.getDate()).padStart(2, "0")}/${String(v.getMonth() + 1).padStart(2, "0")}/${v.getFullYear()}`;
  }
  if (typeof v === "number") {
    const fmt = o.numFmt ?? "";
    const le = /0\.(0+)/.exec(fmt)?.[1]?.length ?? (Number.isInteger(v) ? 0 : 2);
    return v.toLocaleString("vi-VN", { minimumFractionDigits: /[#0],[#0]/.test(fmt) || fmt.includes(".") ? le : 0, maximumFractionDigits: le });
  }
  return v === null || v === undefined ? "" : String(v);
}

export interface TrangXemTruoc {
  ten: string;
  html: string;
  /** Số dòng của trang (để báo khi chỉ hiện một phần) */
  soDong: number;
}

/** Bảng HTML của từng trang (tối đa `toiDaDong` dòng mỗi trang). */
export function workbookSangHtml(wb: ExcelJS.Workbook, toiDaDong = 300): TrangXemTruoc[] {
  const out: TrangXemTruoc[] = [];
  wb.eachSheet((ws) => {
    const gop = new Map<string, { rs: number; cs: number }>();
    const an = new Set<string>();
    for (const r of (ws.model as { merges?: string[] }).merges ?? []) {
      const [a, b] = r.split(":");
      const [r1, c1] = oSang(a!);
      const [r2, c2] = oSang(b ?? a!);
      gop.set(`${r1},${c1}`, { rs: r2 - r1 + 1, cs: c2 - c1 + 1 });
      for (let i = r1; i <= r2; i++) for (let j = c1; j <= c2; j++) if (i !== r1 || j !== c1) an.add(`${i},${j}`);
    }
    const soCot = ws.columnCount;
    const soDong = ws.rowCount;
    let html = '<table class="xte-bang">';
    for (let i = 1; i <= Math.min(soDong, toiDaDong); i++) {
      const row = ws.getRow(i);
      html += "<tr>";
      for (let j = 1; j <= soCot; j++) {
        if (an.has(`${i},${j}`)) continue;
        const o = row.getCell(j);
        const g = gop.get(`${i},${j}`);
        const kieu: string[] = [];
        if (o.font?.bold) kieu.push("font-weight:bold");
        if (o.font?.italic) kieu.push("font-style:italic");
        const h = o.alignment?.horizontal;
        if (h === "center" || h === "centerContinuous") kieu.push("text-align:center");
        else if (h === "right" || (typeof o.value === "number" && !h)) kieu.push("text-align:right");
        const vien = o.border && (o.border.top || o.border.bottom || o.border.left || o.border.right);
        html += `<td${g && g.rs > 1 ? ` rowspan="${g.rs}"` : ""}${g && g.cs > 1 ? ` colspan="${g.cs}"` : ""}${vien ? ' class="xte-vien"' : ""}${kieu.length ? ` style="${kieu.join(";")}"` : ""}>${thoat(giaTri(o)).replace(/\n/g, "<br>")}</td>`;
      }
      html += "</tr>";
    }
    out.push({ ten: ws.name, html: html + "</table>", soDong });
  });
  return out;
}

export const CSS_XEM_TRUOC_EXCEL = `
.xte-bang{border-collapse:collapse;font-family:"Times New Roman",serif;font-size:12px;background:#fff;color:#000}
.xte-bang td{padding:2px 4px;vertical-align:middle;white-space:pre-wrap;min-width:24px}
.xte-bang td.xte-vien{border:1px solid #444}`;
