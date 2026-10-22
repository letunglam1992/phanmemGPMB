/**
 * 1.2.0 (C2) — Xem trước văn bản trong phần mềm: dựng HTML từ word/document.xml của tệp .docx đã điền (đoạn, căn lề, đậm,
 * nghiêng, gạch chân, cỡ chữ, bảng, ngắt dòng, ngắt trang/khổ). Chỉ để soát số liệu, câu chữ trước khi tải — bố cục trang chính xác
 * xem ở Word. Không dùng thư viện ngoài, không gửi gì ra ngoài.
 */
import PizZip from "pizzip";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const thoat = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Phần tử con (dùng childNodes — chạy được cả với DOMParser không có `children`) */
const ptu = (el: Element) => Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1);
const con = (el: Element, ten: string) => ptu(el).filter((c) => c.localName === ten);
const mot = (el: Element | undefined, ten: string) => (el ? con(el, ten)[0] : undefined);
const thuocTinh = (el: Element | undefined, ten: string) => el?.getAttributeNS(W, ten) ?? el?.getAttribute(`w:${ten}`) ?? null;
const bat = (rPr: Element | undefined, ten: string) => {
  const e = mot(rPr, ten);
  if (!e) return false;
  const v = thuocTinh(e, "val");
  return v === null || (v !== "0" && v !== "false" && v !== "none");
};

function run(r: Element): string {
  const rPr = mot(r, "rPr");
  let noiDung = "";
  for (const c of ptu(r)) {
    if (c.localName === "t") noiDung += thoat(c.textContent ?? "");
    else if (c.localName === "tab") noiDung += "&emsp;";
    else if (c.localName === "br") noiDung += thuocTinh(c, "type") === "page" ? '<hr class="xt-trang">' : "<br>";
  }
  if (!noiDung) return "";
  const kieu: string[] = [];
  const sz = thuocTinh(mot(rPr, "sz"), "val");
  if (sz) kieu.push(`font-size:${Number(sz) / 2}pt`);
  if (bat(rPr, "b")) kieu.push("font-weight:bold");
  if (bat(rPr, "i")) kieu.push("font-style:italic");
  if (mot(rPr, "u") && thuocTinh(mot(rPr, "u"), "val") !== "none") kieu.push("text-decoration:underline");
  return kieu.length ? `<span style="${kieu.join(";")}">${noiDung}</span>` : noiDung;
}

function doan(p: Element): string {
  const pPr = mot(p, "pPr");
  const jc = thuocTinh(mot(pPr, "jc"), "val");
  const canh = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : jc === "both" ? "justify" : "left";
  const ind = mot(pPr, "ind");
  const kieu = [`text-align:${canh}`];
  const tw = (v: string | null) => (v ? `${(Number(v) / 20).toFixed(1)}pt` : null);
  const trai = tw(thuocTinh(ind, "left") ?? thuocTinh(ind, "start"));
  const dau = tw(thuocTinh(ind, "firstLine"));
  if (trai) kieu.push(`margin-left:${trai}`);
  if (dau) kieu.push(`text-indent:${dau}`);
  let html = "";
  const duyet = (el: Element) => {
    for (const c of ptu(el)) {
      if (c.localName === "r") html += run(c);
      else if (c.localName === "hyperlink" || c.localName === "smartTag" || c.localName === "sdt" || c.localName === "sdtContent" || c.localName === "ins") duyet(c);
    }
  };
  duyet(p);
  const ngat = mot(pPr, "sectPr") ? '<hr class="xt-trang">' : "";
  return `<p style="${kieu.join(";")}">${html || "&nbsp;"}</p>${ngat}`;
}

function bang(tbl: Element): string {
  const vien = mot(mot(tbl, "tblPr"), "tblBorders");
  const coVien = !!vien && con(vien, "top").some((e) => thuocTinh(e, "val") !== "none" && thuocTinh(e, "val") !== "nil");
  let html = `<table class="${coVien ? "xt-bang xt-vien" : "xt-bang"}">`;
  for (const tr of con(tbl, "tr")) {
    html += "<tr>";
    for (const tc of con(tr, "tc")) {
      const tcPr = mot(tc, "tcPr");
      const gop = thuocTinh(mot(tcPr, "gridSpan"), "val");
      const cVien = mot(tcPr, "tcBorders");
      const oVien = coVien || (!!cVien && ptu(cVien).some((e) => thuocTinh(e, "val") === "single"));
      html += `<td${gop && /^\d+$/.test(gop) ? ` colspan="${gop}"` : ""}${oVien ? ' class="xt-vien"' : ""}>${khoi(tc)}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}

function khoi(el: Element): string {
  let html = "";
  for (const c of ptu(el)) {
    if (c.localName === "p") html += doan(c);
    else if (c.localName === "tbl") html += bang(c);
    else if (c.localName === "sdt") html += khoi(mot(c, "sdtContent") ?? c);
  }
  return html;
}

/** HTML (phần thân) của văn bản .docx. */
export function docxSangHtml(docx: Uint8Array): string {
  const xml = new PizZip(docx).file("word/document.xml")?.asText();
  if (!xml) throw new Error("Tệp không phải văn bản Word (.docx)");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const than = doc.getElementsByTagNameNS(W, "body")[0];
  if (!than) throw new Error("Không đọc được nội dung văn bản");
  return khoi(than);
}

export const CSS_XEM_TRUOC = `
.xt-giay{background:#fff;color:#000;font-family:"Times New Roman",serif;font-size:14pt;line-height:1.35;padding:20mm 15mm 20mm 30mm;max-width:210mm;margin:0 auto;box-shadow:0 1px 6px rgba(0,0,0,.2)}
.xt-giay p{margin:0 0 4pt}
.xt-bang{border-collapse:collapse;width:100%;margin:4pt 0}
.xt-bang td{vertical-align:top;padding:2pt 4pt}
.xt-vien{border:1px solid #000}
.xt-bang.xt-vien td{border:1px solid #000}
.xt-trang{border:0;border-top:2px dashed #999;margin:16pt -10mm}`;
