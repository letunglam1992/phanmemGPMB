/**
 * Dựng mẫu Word "Báo cáo tổng hợp tình hình BT, HT, TĐC trên địa bàn tỉnh" (tổng hợp từ gói các xã, phường gửi lên —
 * docs/21) theo thể thức NĐ 30/2020/NĐ-CP (A4, lề trái 30 mm, Times New Roman 13)
 * → apps/desktop/public/mau-van-ban/bao-cao-tong-hop-tinh.docx. Các trường {…} do phần mềm điền
 * (src/tong-hop-tinh/bao-cao-tinh.ts).
 *
 * Chạy: NODE_PATH=<nơi cài gói docx> node tools/mau-van-ban/mau-bao-cao-tinh.cjs
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalAlign,
} = require("docx");

const FONT = "Times New Roman";
const R = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 26, bold: o.bold, italics: o.italics, underline: o.underline ? {} : undefined });
const P = (runs, o = {}) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [R(runs, o)],
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    indent: o.indent === false ? undefined : { firstLine: o.firstLine ?? 567 },
    spacing: { before: o.before ?? 0, after: o.after ?? 80, line: o.line ?? 300 },
  });
const KHONG_VIEN = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const O_VIEN = { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN };

const giua = (text, o = {}) => new Paragraph({ children: [R(text, { size: o.size ?? 26, bold: o.bold, italics: o.italics })], alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 0 } });

// Tiêu đề: cơ quan (trái) — quốc hiệu (phải)
const RONG = 9071; // A4 11906 − lề trái 1701 − lề phải 1134
const tieuDe = new Table({
  width: { size: RONG, type: WidthType.DXA },
  columnWidths: [3600, RONG - 3600],
  borders: { ...KHONG_VIEN, insideHorizontal: KHONG_VIEN.top, insideVertical: KHONG_VIEN.top },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA }, borders: KHONG_VIEN,
          children: [giua("{CO_QUAN_CAP_TREN}", { size: 26 }), giua("{CO_QUAN}", { bold: true }), giua("———", { size: 20 }), giua("Số: {so}/BC-{ky_hieu}", { after: 60 })],
        }),
        new TableCell({
          width: { size: RONG - 3600, type: WidthType.DXA }, borders: KHONG_VIEN,
          children: [giua("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true, size: 24 }), giua("Độc lập - Tự do - Hạnh phúc", { bold: true }), giua("———————————", { size: 20 }), giua("{dia_danh}, ngày {ngay} tháng {thang} năm {nam}", { italics: true })],
        }),
      ],
    }),
  ],
});


const bangCo = (tieuDe, rong, truong, tong) => {
  const o = (text, i, op = {}) =>
    new TableCell({
      width: { size: rong[i], type: WidthType.DXA }, borders: O_VIEN, verticalAlign: VerticalAlign.CENTER,
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [new Paragraph({ children: [R(text, { size: 22, bold: op.bold })], alignment: i === 1 ? AlignmentType.LEFT : i >= 2 && !op.dau ? AlignmentType.RIGHT : AlignmentType.CENTER })],
    });
  return new Table({
    width: { size: RONG, type: WidthType.DXA },
    columnWidths: rong,
    rows: [
      new TableRow({ tableHeader: true, children: tieuDe.map((t, i) => o(t, i, { bold: true, dau: true })) }),
      new TableRow({ children: truong.map((t, i) => o(t, i)) }),
      ...(tong ? [new TableRow({ children: tong.map((t, i) => o(t, i, { bold: true })) })] : []),
    ],
  });
};

// Bảng 1: theo xã, phường
const bangXa = bangCo(
  ["TT", "Xã, phường", "Số dự án", "Số hộ", "Đã bàn giao MB (hộ)", "Hộ có vướng mắc", "Hộ đã duyệt PA", "Giá trị tạm tính (đồng)"],
  [500, 2071, 800, 800, 1100, 1000, 1000, 1800],
  ["{#xa}{tt}", "{ten}", "{so_du_an}", "{so_ho}", "{ban_giao}", "{vuong_mac}", "{da_duyet}", "{tam_tinh}{/xa}"],
  ["", "Tổng cộng", "{so_du_an}", "{so_ho}", "{ban_giao}", "{vuong_mac}", "{da_duyet}", "{tam_tinh}"],
);
// Bảng 2: từng dự án
const bangDuAn = bangCo(
  ["TT", "Dự án (xã, phường)", "Số hộ", "Đã bàn giao MB", "Vướng mắc", "Đã duyệt PA", "DT thu hồi (m²)", "Số liệu đến"],
  [500, 2871, 700, 1000, 900, 900, 1100, 1100],
  ["{#du_an}{tt}", "{ten}", "{so_ho}", "{ban_giao}", "{vuong_mac}", "{da_duyet}", "{dt}", "{den_ngay}{/du_an}"],
  null,
);

const muc = (text) => P([R(text, { bold: true })], { before: 120 });
const kyTen = new Table({
  width: { size: RONG, type: WidthType.DXA },
  columnWidths: [4300, RONG - 4300],
  borders: { ...KHONG_VIEN, insideHorizontal: KHONG_VIEN.top, insideVertical: KHONG_VIEN.top },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4300, type: WidthType.DXA }, borders: KHONG_VIEN,
          children: [
            new Paragraph({ children: [R("Nơi nhận:", { size: 24, bold: true, italics: true })] }),
            new Paragraph({ children: [R("{#noi_nhan_ds}{.}", { size: 22 })] }),
            new Paragraph({ children: [R("{/noi_nhan_ds}", { size: 22 })] }),
          ],
        }),
        new TableCell({
          width: { size: RONG - 4300, type: WidthType.DXA }, borders: KHONG_VIEN,
          children: [giua("{quyen_han}", { bold: true }), giua(""), giua(""), giua(""), giua(""), giua("{nguoi_ky}", { bold: true })],
        }),
      ],
    }),
  ],
});


const doc = new Document({
  creator: "GPMB Sơn La",
  title: "Báo cáo tổng hợp toàn tỉnh",
  styles: { default: { document: { run: { font: FONT, size: 26 } } } },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
      children: [
        tieuDe,
        giua("", { after: 120 }),
        giua("BÁO CÁO", { bold: true, size: 28 }),
        giua("Tình hình thực hiện công tác bồi thường, hỗ trợ, tái định cư các dự án trên địa bàn {pham_vi}", { bold: true }),
        giua("(Tổng hợp từ số liệu các xã, phường gửi đến ngày {den_ngay})", { italics: true, after: 60 }),
        giua("———", { size: 20, after: 120 }),
        new Paragraph({ children: [R("Kính gửi: {kinh_gui}.")], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
        P("{mo_dau}"),
        muc("I. KẾT QUẢ THỰC HIỆN"),
        P([R("1. Kết quả chung", { bold: true, italics: true })]),
        P("{tong_quat}"),
        P([R("2. Kết quả theo xã, phường", { bold: true, italics: true })]),
        bangXa,
        P([R("3. Kết quả từng dự án", { bold: true, italics: true })], { before: 120 }),
        bangDuAn,
        P([R("(Giá trị tạm tính là tổng các khoản phần mềm tính theo hồ sơ, chưa phải số đã phê duyệt; chi tiết: Phụ lục Excel kèm theo)", { italics: true, size: 22 })], { indent: false, align: AlignmentType.LEFT, before: 60 }),
        muc("II. TÌNH HÌNH CẬP NHẬT SỐ LIỆU CỦA CÁC XÃ, PHƯỜNG"),
        P("{tinh_hinh_gui}"),
        P("{#cham_gui}"),
        P("- {ten}: {noi_dung}"),
        P("{/cham_gui}"),
        muc("III. KHÓ KHĂN, VƯỚNG MẮC"),
        P("{#co_vuong_mac}"),
        P("Có {tong_vuong_mac} hộ đang ghi vướng mắc tại các dự án: {ds_vuong_mac}."),
        P("{/co_vuong_mac}"),
        P("{#co_kho_khan_khac}"),
        P("{kho_khan_khac}"),
        P("{/co_kho_khan_khac}"),
        muc("IV. NHIỆM VỤ, GIẢI PHÁP THỜI GIAN TỚI"),
        P("{nhiem_vu}"),
        muc("V. ĐỀ XUẤT, KIẾN NGHỊ"),
        P("{kien_nghi}"),
        P("{ket_thuc}", { after: 200 }),
        kyTen,
      ],
    },
  ],
});

const RA = path.resolve(__dirname, "../../apps/desktop/public/mau-van-ban/bao-cao-tong-hop-tinh.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("Đã ghi", RA);
});
