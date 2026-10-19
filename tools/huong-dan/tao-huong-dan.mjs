/**
 * Tạo tệp Word "Hướng dẫn sử dụng" có ảnh (D1, 1.0.20) từ noi-dung.mjs và ảnh của chup-anh.mjs.
 *   node tools/huong-dan/tao-huong-dan.mjs <thư mục ảnh> [tệp ra]
 * Mặc định ghi apps/desktop/public/huong-dan/Huong-dan-su-dung-GPMB.docx (phần mềm tải về ở màn Hướng dẫn sử dụng).
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AlignmentType, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageNumber, Paragraph, TableOfContents, TextRun, LevelFormat, PageBreak } from "docx";
import { CHUONG } from "./noi-dung.mjs";

const goc = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const thuMucAnh = process.argv[2];
if (!thuMucAnh) throw new Error("Thiếu thư mục ảnh (chạy chup-anh.mjs trước)");
const ra = process.argv[3] ?? join(goc, "apps/desktop/public/huong-dan/Huong-dan-su-dung-GPMB.docx");
const phienBan = JSON.parse(readFileSync(join(goc, "apps/desktop/package.json"), "utf8")).version;

const anhCo = new Map(readdirSync(thuMucAnh).filter((f) => f.endsWith(".jpg")).map((f) => [f.replace(/^\d+-/, "").replace(/\.jpg$/, ""), join(thuMucAnh, f)]));
const FONT = "Times New Roman";
const CO = 26; // 13 pt

/** "**đậm**" → các TextRun */
const chay = (s, o = {}) => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((t) => (t.startsWith("**") ? new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: CO, ...o }) : new TextRun({ text: t, font: FONT, size: CO, ...o })));
const doan = (s) => new Paragraph({ children: chay(s), alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 300 }, indent: { firstLine: 567 } });

/** Kích thước JPEG (đọc khung SOF) */
function coAnh(buf) {
  let i = 2;
  while (i < buf.length) {
    const m = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error("Không đọc được kích thước ảnh");
}

let soHinh = 0;
const con = [];
// Trang bìa
con.push(
  new Paragraph({ children: chay("UBND TỈNH SƠN LA", { bold: true }), alignment: AlignmentType.CENTER }),
  new Paragraph({ children: chay("SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG", { bold: true }), alignment: AlignmentType.CENTER, spacing: { after: 2400 } }),
  new Paragraph({ children: chay("HƯỚNG DẪN SỬ DỤNG", { bold: true, size: 40 }), alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
  new Paragraph({ children: chay("PHẦN MỀM HỖ TRỢ BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ", { bold: true, size: 30 }), alignment: AlignmentType.CENTER }),
  new Paragraph({ children: chay("KHI NHÀ NƯỚC THU HỒI ĐẤT TRÊN ĐỊA BÀN TỈNH SƠN LA", { bold: true, size: 30 }), alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
  new Paragraph({ children: chay(`Phiên bản ${phienBan}`, { italics: true }), alignment: AlignmentType.CENTER, spacing: { after: 3000 } }),
  new Paragraph({ children: chay("Tác giả: Lê Tùng Lâm – Sở Nông nghiệp và Môi trường tỉnh Sơn La"), alignment: AlignmentType.CENTER }),
  new Paragraph({ children: chay("Ảnh minh họa chụp từ dữ liệu mẫu ẩn danh và dự án tập huấn giả lập.", { italics: true, size: 22 }), alignment: AlignmentType.CENTER }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ children: chay("MỤC LỤC", { bold: true }), alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-1" }),
  new Paragraph({ children: chay("(Nếu mục lục chưa hiện số trang: bấm chuột phải vào mục lục → Update Field.)", { italics: true, size: 22 }) }),
);

CHUONG.forEach((c, i) => {
  con.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: `${i + 1}. ${c.ten.toUpperCase()}`, bold: true, font: FONT, size: 28 })], spacing: { after: 200 } }));
  for (const d of c.doan ?? []) con.push(doan(d));
  for (const b of c.buoc ?? []) con.push(new Paragraph({ children: chay(b), numbering: { reference: `buoc-${i}`, level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 100, line: 300 } }));
  for (const [ten, chuThich] of c.anh ?? []) {
    const tep = anhCo.get(ten);
    if (!tep) throw new Error(`Thiếu ảnh ${ten}`);
    const buf = readFileSync(tep);
    const { w, h } = coAnh(buf);
    const rong = 600; // px ~ 15,9 cm
    con.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, keepNext: true, children: [new ImageRun({ type: "jpg", data: buf, transformation: { width: rong, height: Math.round((rong * h) / w) } })] }));
    con.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: chay(`Hình ${++soHinh}. ${chuThich}`, { italics: true, size: 24 }) }));
  }
  for (const l of c.luuY ?? []) con.push(new Paragraph({ children: [new TextRun({ text: "Lưu ý: ", bold: true, italics: true, font: FONT, size: CO }), ...chay(l, { italics: true })], alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 } }));
});

const doc = new Document({
  creator: "Lê Tùng Lâm",
  title: "Hướng dẫn sử dụng phần mềm GPMB Sơn La",
  features: { updateFields: true },
  styles: { default: { document: { run: { font: FONT, size: CO } } } },
  numbering: { config: CHUONG.map((_, i) => ({ reference: `buoc-${i}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 340 } } } }] })) },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: chay(`Hướng dẫn sử dụng Phần mềm GPMB Sơn La – phiên bản ${phienBan}`, { italics: true, size: 20 }) })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] }) },
    children: con,
  }],
});
mkdirSync(dirname(ra), { recursive: true });
writeFileSync(ra, await Packer.toBuffer(doc));
console.log(`Đã ghi ${ra} (${soHinh} hình)`);
