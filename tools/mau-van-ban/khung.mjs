/**
 * Khung thể thức văn bản hành chính (Nghị định 30/2020/NĐ-CP) để dựng các mẫu của Sổ tay
 * QĐ 1966/QĐ-UBND. Trường tự điền viết dạng {ten_truong} (docxtemplater); mỗi trường nằm trọn
 * trong một run để thay thế được.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  LineRuleType,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export const FONT = "Times New Roman";
const RONG = 9355; // A4 − lề trái 30 mm − lề phải 15 mm (twip)
const KHONG_VIEN = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
const VIEN_MANH = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

/** Tách chuỗi có đánh dấu **đậm** và __nghiêng__ thành các run. */
export function runs(s, co = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__)/g;
  let i = 0;
  for (const m of s.matchAll(re)) {
    if (m.index > i) out.push(new TextRun({ text: s.slice(i, m.index), font: FONT, size: co.size ?? 28, bold: co.bold, italics: co.italics }));
    const dam = m[0].startsWith("**");
    out.push(new TextRun({ text: m[0].slice(2, -2), font: FONT, size: co.size ?? 28, bold: dam || co.bold, italics: !dam || co.italics }));
    i = m.index + m[0].length;
  }
  if (i < s.length || s.length === 0) out.push(new TextRun({ text: s.slice(i), font: FONT, size: co.size ?? 28, bold: co.bold, italics: co.italics }));
  return out;
}

/** Đoạn văn nội dung: canh đều, thụt đầu dòng 1 cm, cách đoạn 6 pt. */
export function P(s, o = {}) {
  return new Paragraph({
    alignment: o.canh ?? AlignmentType.JUSTIFIED,
    indent: { firstLine: o.thut ?? 567, left: o.trai ?? 0 },
    spacing: { before: o.truoc ?? 0, after: o.sau ?? 120, line: o.dong ?? 288, lineRule: LineRuleType.AUTO },
    keepNext: o.giu,
    children: runs(s, { size: o.co ?? 28, bold: o.dam, italics: o.nghieng }),
  });
}
export const giua = (s, o = {}) => P(s, { canh: AlignmentType.CENTER, thut: 0, ...o });
export const trai = (s, o = {}) => P(s, { canh: AlignmentType.LEFT, thut: 0, ...o });
/** Đoạn lặp theo danh sách (paragraphLoop của docxtemplater): mỗi phần tử một đoạn. */
export const lap = (ten, s, o = {}) => [trai(`{#${ten}}`, { sau: 0 }), P(s, o), trai(`{/${ten}}`, { sau: 0 })];

function gach(rongTwip) {
  // dòng kẻ ngang nét liền dưới tên cơ quan / tiêu ngữ: đoạn rỗng cỡ chữ nhỏ, viền dưới, thụt hai bên
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { left: rongTwip, right: rongTwip },
    border: { bottom: VIEN_MANH },
    spacing: { before: 0, after: 80, line: 120, lineRule: LineRuleType.EXACT },
    children: [new TextRun({ text: "", size: 4 })],
  });
}

const o = (children, width, canh = AlignmentType.CENTER) =>
  new TableCell({ width: { size: width, type: WidthType.DXA }, borders: KHONG_VIEN, children: children.length ? children : [new Paragraph({ alignment: canh, children: [] })] });

/**
 * Tiêu đề văn bản: bên trái tên cơ quan (2 dòng) + số, ký hiệu; bên phải quốc hiệu, tiêu ngữ + địa danh, ngày.
 * coQuan: [dòng trên (không đậm), dòng dưới (đậm)] — dòng trên có thể rỗng.
 */
export function dauVanBan({ coQuan = ["{co_quan_cap_tren}", "{CO_QUAN}"], so = "Số: {so}/{ky_hieu}", ngay = true } = {}) {
  const trai = 3700, phai = RONG - trai;
  const cq = [];
  if (coQuan[0]) cq.push(new Paragraph({ alignment: AlignmentType.CENTER, children: runs(coQuan[0], { size: 26 }) }));
  cq.push(new Paragraph({ alignment: AlignmentType.CENTER, children: runs(coQuan[1], { size: 26, bold: true }) }));
  cq.push(gach(1100));
  const qh = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: runs("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { size: 26, bold: true }) }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: runs("Độc lập - Tự do - Hạnh phúc", { size: 28, bold: true }) }),
    gach(1450),
  ];
  const r2t = so ? [new Paragraph({ alignment: AlignmentType.CENTER, children: runs(so, { size: 26 }) })] : [];
  const r2p = ngay ? [new Paragraph({ alignment: AlignmentType.CENTER, children: runs("{dia_danh}, ngày {ngay} tháng {thang} năm {nam}", { size: 28, italics: true }) })] : [];
  return new Table({
    width: { size: RONG, type: WidthType.DXA },
    columnWidths: [trai, phai],
    borders: KHONG_VIEN,
    rows: [new TableRow({ children: [o(cq, trai), o(qh, phai)] }), new TableRow({ children: [o(r2t, trai), o(r2p, phai)] })],
  });
}

/** Tiêu đề chỉ có quốc hiệu, tiêu ngữ (biên bản, tờ tự khai). */
export function quocHieu({ ngay = false } = {}) {
  const out = [
    giua("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { dam: true, co: 26, sau: 0 }),
    giua("Độc lập - Tự do - Hạnh phúc", { dam: true, sau: 0 }),
    gach(3000),
  ];
  if (ngay) out.push(P("{dia_danh}, ngày {ngay} tháng {thang} năm {nam}", { canh: AlignmentType.RIGHT, nghieng: true, thut: 0 }));
  return out;
}

/** Tên loại văn bản + trích yếu. */
export function tenVanBan(ten, trichYeu) {
  const out = [giua(ten, { dam: true, truoc: 240, sau: 0 })];
  if (trichYeu) for (const d of trichYeu.split("\n")) out.push(giua(d, { dam: true, sau: 0 }));
  out.push(gach(3600));
  return out;
}

/** Khối chữ ký + nơi nhận (văn bản hành chính). */
export function kyVanBan({ noiNhan = true, quyenHan = "{quyen_han}", nguoiKy = "{nguoi_ky}", ghiChu = "" } = {}) {
  const trai = 4300, phai = RONG - trai;
  const nn = noiNhan
    ? [
        new Paragraph({ children: runs("Nơi nhận:", { size: 24, bold: true, italics: true }) }),
        new Paragraph({ children: runs("{#noi_nhan}", { size: 22 }) }),
        new Paragraph({ children: runs("- {.};", { size: 22 }) }),
        new Paragraph({ children: runs("{/noi_nhan}", { size: 22 }) }),
      ]
    : [];
  const ky = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: runs(quyenHan, { size: 28, bold: true }) }),
    ...(ghiChu ? [new Paragraph({ alignment: AlignmentType.CENTER, children: runs(ghiChu, { size: 26, italics: true }) })] : []),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: runs(nguoiKy, { size: 28, bold: true }) }),
  ];
  return new Table({
    width: { size: RONG, type: WidthType.DXA },
    columnWidths: [trai, phai],
    borders: KHONG_VIEN,
    rows: [new TableRow({ children: [o(nn, trai, AlignmentType.LEFT), o(ky, phai)] })],
  });
}

/** Khối ký của biên bản: các bên xếp 2 cột. */
export function kyBienBan(cacBen, ghiChu = "(Ký, ghi rõ họ tên)") {
  const nua = RONG / 2;
  const rows = [];
  for (let i = 0; i < cacBen.length; i += 2) {
    const cell = (ten) =>
      o(
        ten
          ? [
              ...ten.split("\n").map((d) => new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: runs(d, { size: 24, bold: true }) })),
              new Paragraph({ alignment: AlignmentType.CENTER, children: runs(ghiChu, { size: 24, italics: true }) }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
            ]
          : [],
        nua,
      );
    rows.push(new TableRow({ cantSplit: true, children: [cell(cacBen[i]), cell(cacBen[i + 1])] }));
  }
  return new Table({ width: { size: RONG, type: WidthType.DXA }, columnWidths: [nua, nua], borders: KHONG_VIEN, rows });
}

/** Bảng có viền, hàng dữ liệu lặp theo danh sách {#ten}…{/ten}. */
export function bangLap(ten, cot) {
  const tong = cot.reduce((s, c) => s + c.rong, 0);
  const k = RONG / tong;
  const w = cot.map((c) => Math.round(c.rong * k));
  const vien = { top: VIEN_MANH, bottom: VIEN_MANH, left: VIEN_MANH, right: VIEN_MANH };
  const cell = (s, i, dam = false, canh = AlignmentType.CENTER) =>
    new TableCell({ width: { size: w[i], type: WidthType.DXA }, borders: vien, children: [new Paragraph({ alignment: canh, children: runs(s, { size: 24, bold: dam }) })] });
  const dau = new TableRow({ tableHeader: true, children: cot.map((c, i) => cell(c.tieuDe, i, true)) });
  const dong = new TableRow({
    children: cot.map((c, i) => cell(`${i === 0 ? `{#${ten}}` : ""}{${c.truong}}${i === cot.length - 1 ? `{/${ten}}` : ""}`, i, false, c.canh ?? AlignmentType.CENTER)),
  });
  const rows = [dau, dong];
  if (cot.some((c) => c.tong)) rows.push(new TableRow({ children: cot.map((c, i) => cell(i === 0 ? "" : i === 1 ? "Tổng cộng" : c.tong ? `{${c.tong}}` : "", i, true, c.canh ?? AlignmentType.CENTER)) }));
  return new Table({ width: { size: RONG, type: WidthType.DXA }, columnWidths: w, rows });
}

/** Thành phần tham gia biên bản: mỗi bên một dòng tiêu đề + danh sách người (xuống dòng). */
export function thanhPhan(ds) {
  const out = [];
  ds.forEach(([tieuDe, truong], i) => {
    out.push(P(`${i + 1}. ${tieuDe}`, { dam: true, sau: 40 }));
    out.push(P(`{${truong}}`, { trai: 567, thut: 0, sau: 80, canh: AlignmentType.LEFT }));
  });
  return out;
}

export function taoDocument(children) {
  return new Document({
    creator: "GPMB Sơn La",
    styles: { default: { document: { run: { font: FONT, size: 28 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 850 } } }, children }],
  });
}
