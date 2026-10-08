/**
 * 1.0.6 — Chèn ảnh PNG vào tệp Word đã điền: thay đoạn chứa dấu `marker` (vd. "[[BIEU_DO_DIEN_BIEN]]") bằng ảnh nằm giữa
 * (DrawingML inline). Không có ảnh thì bỏ đoạn đánh dấu. Xử lý trên máy, không thư viện ngoài ngoài PizZip.
 */
import PizZip from "pizzip";

const EMU_CM = 360000;
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export function chenAnhDocx(docx: Uint8Array, marker: string, png: Uint8Array | null, rongCm = 15, caoCm = 6.5, ten = "Biểu đồ"): Uint8Array {
  const zip = new PizZip(docx);
  const xmlDoc = zip.file("word/document.xml")!.asText();
  const m = marker.replace(/[[\]]/g, "\\$&");
  const re = new RegExp(`<w:p\\b(?:(?!<w:p\\b)[\\s\\S])*?${m}[\\s\\S]*?</w:p>`);
  if (!re.test(xmlDoc)) return docx;
  if (!png) {
    zip.file("word/document.xml", xmlDoc.replace(re, ""));
    return zip.generate({ type: "uint8array", compression: "DEFLATE" });
  }
  // quan hệ ảnh
  const duongRel = "word/_rels/document.xml.rels";
  let rels = zip.file(duongRel)!.asText();
  let n = 1;
  while (rels.includes(`Id="rIdAnh${n}"`) || zip.file(`word/media/anh-${n}.png`)) n++;
  const rid = `rIdAnh${n}`;
  zip.file(`word/media/anh-${n}.png`, png);
  rels = rels.replace("</Relationships>", `<Relationship Id="${rid}" Type="${NS_REL}/image" Target="media/anh-${n}.png"/></Relationships>`);
  zip.file(duongRel, rels);
  let ct = zip.file("[Content_Types].xml")!.asText();
  if (!/Extension="png"/i.test(ct)) ct = ct.replace("<Types ", '<Types ').replace(/(<Types[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>');
  zip.file("[Content_Types].xml", ct);
  const cx = Math.round(rongCm * EMU_CM), cy = Math.round(caoCm * EMU_CM);
  const xe = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const anh =
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>` +
    `<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${9000 + n}" name="${xe(ten)}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="anh-${n}.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip xmlns:r="${NS_REL}" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  zip.file("word/document.xml", xmlDoc.replace(re, anh));
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}
