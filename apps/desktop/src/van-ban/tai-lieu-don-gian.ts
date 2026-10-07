/**
 * Tài liệu đơn giản (1.0.4): một mô hình khối (tiêu đề, đoạn, bảng) → Word .docx (WordprocessingML tự dựng, không cần
 * mẫu) hoặc HTML để in / lưu PDF bằng hộp in của hệ điều hành. Dùng cho bảng tính, giải trình của hộ.
 */
import PizZip from "pizzip";

export interface Chu {
  t: string;
  dam?: boolean;
  nghieng?: boolean;
  mau?: string;
}
export type Doan = { loai: "doan"; chu: (Chu | string)[]; canh?: "giua" | "phai" | "deu"; co?: number; truoc?: number }
  | { loai: "tieu-de"; chu: string; cap: 1 | 2 | 3 }
  /** gop: số cột mà ô thứ hai của dòng chiếm (dòng tiêu đề nhóm) */
  | { loai: "bang"; cot: { ten: string; rong: number; so?: boolean }[]; dong: { o: (string | Chu[])[]; kieu?: "nhom" | "tong" | "phu"; gop?: number }[] };

export interface TaiLieu {
  tieuDe: string;
  ngang?: boolean;
  khoi: Doan[];
}

const xe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const chuan = (c: Chu | string): Chu => (typeof c === "string" ? { t: c } : c);

/* ------------------------------ Word ------------------------------ */
function run(c: Chu, co?: number): string {
  const pr = [c.dam ? "<w:b/>" : "", c.nghieng ? "<w:i/>" : "", c.mau ? `<w:color w:val="${c.mau}"/>` : "", co ? `<w:sz w:val="${co * 2}"/><w:szCs w:val="${co * 2}"/>` : ""].join("");
  return c.t.split("\n").map((dong, i) => `${i ? "<w:r><w:br/></w:r>" : ""}<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}<w:t xml:space="preserve">${xe(dong)}</w:t></w:r>`).join("");
}
function para(chu: Chu[], o: { canh?: string; co?: number; truoc?: number; sau?: number; giuVoi?: boolean } = {}): string {
  const jc = o.canh === "giua" ? "center" : o.canh === "phai" ? "right" : o.canh === "deu" ? "both" : "left";
  return `<w:p><w:pPr>${o.giuVoi ? "<w:keepNext/>" : ""}<w:spacing w:before="${(o.truoc ?? 0) * 20}" w:after="${o.sau ?? 60}"/><w:jc w:val="${jc}"/></w:pPr>${chu.map((c) => run(c, o.co)).join("")}</w:p>`;
}
function bangWord(b: Extract<Doan, { loai: "bang" }>, rongTrang: number): string {
  const tong = b.cot.reduce((s, c) => s + c.rong, 0);
  const w = b.cot.map((c) => Math.round((c.rong / tong) * rongTrang));
  const vien = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join("")}</w:tblBorders>`;
  const o = (noiDung: string | Chu[], i: number, kieu?: string, gop = 1, dau = false) => {
    const chu = (typeof noiDung === "string" ? [{ t: noiDung }] : noiDung).map((c) => ({ ...c, dam: c.dam || dau || kieu === "nhom" || kieu === "tong" }));
    const rong = w.slice(i, i + gop).reduce((s, x) => s + x, 0);
    const nen = dau ? `<w:shd w:val="clear" w:color="auto" w:fill="E8EEF6"/>` : kieu === "nhom" ? `<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>` : "";
    return `<w:tc><w:tcPr><w:tcW w:w="${rong}" w:type="dxa"/>${gop > 1 ? `<w:gridSpan w:val="${gop}"/>` : ""}${nen}<w:vAlign w:val="${dau ? "center" : "top"}"/></w:tcPr>${para(chu, { canh: dau ? "giua" : b.cot[i]!.so ? "phai" : "trai", co: 11, sau: 0 })}</w:tc>`;
  };
  const dauBang = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.cot.map((c, i) => o(c.ten, i, undefined, 1, true)).join("")}</w:tr>`;
  const than = b.dong.map((d) => {
    const cells: string[] = [];
    let i = 0;
    d.o.forEach((x, k) => {
      const g = k === 1 ? (d.gop ?? 1) : 1; // gop: số cột ô thứ hai chiếm (như colspan ở HTML)
      cells.push(o(x, i, d.kieu, g));
      i += g;
    });
    while (i < b.cot.length) cells.push(o("", i++, d.kieu));
    return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join("")}</w:tr>`;
  }).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${rongTrang}" w:type="dxa"/>${vien}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${w.map((x) => `<w:gridCol w:w="${x}"/>`).join("")}</w:tblGrid>${dauBang}${than}</w:tbl>${para([{ t: "" }], { sau: 0 })}`;
}

/** Tài liệu → .docx (A4, lề 2/1,5/2/3 cm, Times New Roman 13). */
export function taoDocx(tl: TaiLieu): Uint8Array {
  const [rong, cao] = tl.ngang ? [16838, 11906] : [11906, 16838];
  const rongTrang = rong - 1701 - 1134; // lề trái 3 cm, phải 2 cm
  const than = tl.khoi.map((k) => {
    if (k.loai === "tieu-de") return para([{ t: k.chu, dam: true }], { canh: k.cap === 1 ? "giua" : "trai", co: k.cap === 1 ? 14 : 13, truoc: k.cap === 1 ? 0 : 6, sau: 80, giuVoi: true });
    if (k.loai === "doan") return para(k.chu.map(chuan), { canh: k.canh, co: k.co, truoc: k.truoc });
    return bangWord(k, rongTrang);
  }).join("");
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${than}<w:sectPr><w:pgSz w:w="${rong}" w:h="${cao}"${tl.ngang ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
  const zip = new PizZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xe(tl.tieuDe)}</dc:title><dc:creator>Phần mềm GPMB Sơn La</dc:creator></cp:coreProperties>`);
  zip.file("word/document.xml", doc);
  zip.file("word/styles.xml", styles);
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}

/* ------------------------------ HTML (in / PDF) ------------------------------ */
const chuHtml = (c: Chu) => {
  let s = xe(c.t).replace(/\n/g, "<br>");
  if (c.dam) s = `<b>${s}</b>`;
  if (c.nghieng) s = `<i>${s}</i>`;
  return c.mau ? `<span style="color:#${c.mau}">${s}</span>` : s;
};

export function taoHtmlIn(tl: TaiLieu): string {
  const than = tl.khoi.map((k) => {
    if (k.loai === "tieu-de") return `<h${k.cap}>${xe(k.chu)}</h${k.cap}>`;
    if (k.loai === "doan") return `<p style="text-align:${k.canh === "giua" ? "center" : k.canh === "phai" ? "right" : k.canh === "deu" ? "justify" : "left"}${k.co ? `;font-size:${k.co}pt` : ""}">${k.chu.map(chuan).map(chuHtml).join("")}</p>`;
    const tong = k.cot.reduce((s, c) => s + c.rong, 0);
    return `<table><colgroup>${k.cot.map((c) => `<col style="width:${((c.rong / tong) * 100).toFixed(1)}%">`).join("")}</colgroup><thead><tr>${k.cot.map((c) => `<th>${xe(c.ten)}</th>`).join("")}</tr></thead><tbody>${k.dong
      .map((d) => `<tr class="${d.kieu ?? ""}">${d.o.map((x, i) => `<td${i === 1 && (d.gop ?? 1) > 1 ? ` colspan="${d.gop}"` : ""}${k.cot[i]?.so ? ' class="so"' : ""}>${(typeof x === "string" ? [{ t: x }] : x).map(chuHtml).join("")}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
  }).join("\n");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${xe(tl.tieuDe)}</title><style>
@page { size: A4 ${tl.ngang ? "landscape" : "portrait"}; margin: 20mm 20mm 20mm 30mm; }
body { font-family: "Times New Roman", serif; font-size: 13pt; color: #000; }
h1 { font-size: 14pt; text-align: center; margin: 0 0 6pt; } h2, h3 { font-size: 13pt; margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 0 0 4pt; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4pt 0 8pt; font-size: 11pt; }
th, td { border: 0.5pt solid #808080; padding: 2pt 3pt; vertical-align: top; word-wrap: break-word; } th { background: #e8eef6; }
thead { display: table-header-group; } tr { break-inside: avoid; } td.so { text-align: right; } tr.nhom td { background: #f2f2f2; font-weight: bold; } tr.tong td { font-weight: bold; }
</style></head><body>${than}</body></html>`;
}

/** In tài liệu qua hộp in của hệ điều hành (chọn "Microsoft Print to PDF" để lưu PDF). */
export function inTaiLieu(tl: TaiLieu): void {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  f.setAttribute("aria-hidden", "true");
  document.body.appendChild(f);
  const d = f.contentDocument!;
  d.open();
  d.write(taoHtmlIn(tl));
  d.close();
  setTimeout(() => {
    f.contentWindow?.focus();
    f.contentWindow?.print();
    setTimeout(() => f.remove(), 60_000);
  }, 200);
}
