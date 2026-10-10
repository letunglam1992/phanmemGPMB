/**
 * Dựng mẫu Word "Báo cáo tổng hợp tình hình BT, HT, TĐC các dự án" (thể thức NĐ 30/2020/NĐ-CP: A4, lề trái 30 mm,
 * Times New Roman 13) → apps/desktop/public/mau-van-ban/bao-cao-tong-hop.docx. Các trường {…} do phần mềm điền
 * (src/bao-cao-van-ban.ts); cán bộ có thể thay mẫu riêng (giữ tên trường).
 *
 * Chạy: node tools/mau-van-ban/mau-bao-cao.cjs   (cần gói `docx`: npm i -g docx, hoặc NODE_PATH trỏ tới nơi cài)
 *
 * LƯU Ý: mẫu đang dùng đã được bổ sung trực tiếp mục "hộ vướng mắc" (§11.4, {#co_ho_vuong_mac}…) mà tệp này chưa dựng —
 * chạy lại sẽ mất mục đó. Khi thêm mục mới (vd. 1.0.6 "Kết quả theo đợt thu hồi" {#co_dot}…), sinh ra tệp tạm rồi chép
 * đoạn XML mới vào mẫu đang dùng; kiểm thử `bao-cao.test.ts` kiểm cả hai mục.
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

const TIEU_DE_COT = ["TT", "Dự án (xã)", "Số hộ", "DT thu hồi (m²)", "Kinh phí đã duyệt (đồng)", "Đã chi trả (đồng)", "Hoàn thành GPMB (hộ)", "Tình trạng"];
const RONG_COT = [500, 2600, 700, 1100, 1300, 1300, 800, 771];
const TRUONG_COT = ["{#du_an}{tt}", "{ten}", "{so_ho}", "{dt}", "{da_duyet}", "{da_chi}", "{hoan_thanh}", "{tinh_trang}{/du_an}"];
const TONG_COT = ["", "Tổng cộng", "{so_ho}", "{dt}", "{da_duyet}", "{da_chi}", "{ho_hoan_thanh}", ""];
const oBang = (text, i, o = {}) =>
  new TableCell({
    width: { size: RONG_COT[i], type: WidthType.DXA }, borders: O_VIEN, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({ children: o.runs ?? [R(text, { size: 22, bold: o.bold })], alignment: i === 1 ? AlignmentType.LEFT : i >= 2 && i <= 6 && !o.dau ? AlignmentType.RIGHT : AlignmentType.CENTER })],
  });
const bang = new Table({
  width: { size: RONG, type: WidthType.DXA },
  columnWidths: RONG_COT,
  rows: [
    new TableRow({ tableHeader: true, children: TIEU_DE_COT.map((t, i) => oBang(t, i, { bold: true, dau: true })) }),
    // 1.0.7: dòng đợt (la_dot) in nghiêng
    new TableRow({ children: TRUONG_COT.map((t, i) => oBang(t, i, i === 1 ? { runs: [R("{^la_dot}{ten}{/la_dot}", { size: 22 }), R("{#la_dot}{ten}{/la_dot}", { size: 22, italics: true })] } : {})) }),
    new TableRow({ children: TONG_COT.map((t, i) => oBang(t, i, { bold: true })) }),
  ],
});

// 1.0.6: bảng tổng hợp theo đợt thu hồi (dự án có đợt)
const bangDot = new Table({
  width: { size: RONG, type: WidthType.DXA },
  columnWidths: RONG_COT,
  rows: [
    new TableRow({ tableHeader: true, children: ["TT", "Dự án – đợt thu hồi", "Số hộ", "DT thu hồi (m²)", "Kinh phí đã duyệt (đồng)", "Đã chi trả (đồng)", "Hoàn thành GPMB (hộ)", "Tỷ lệ hoàn thành"].map((t, i) => oBang(t, i, { bold: true, dau: true })) }),
    new TableRow({ children: ["{#theo_dot}{tt}", "{ten}", "{so_ho}", "{dt}", "{da_duyet}", "{da_chi}", "{hoan_thanh}", "{ty_le}{/theo_dot}"].map((t, i) => oBang(t, i)) }),
  ],
});

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
  title: "Báo cáo tổng hợp",
  styles: { default: { document: { run: { font: FONT, size: 26 } } } },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } },
      children: [
        tieuDe,
        giua("", { after: 120 }),
        giua("BÁO CÁO", { bold: true, size: 28 }),
        giua("Tình hình thực hiện công tác bồi thường, hỗ trợ, tái định cư các dự án{#co_pham_vi} trên địa bàn {pham_vi}{/co_pham_vi}", { bold: true }),
        giua("(Số liệu tính đến ngày {den_ngay})", { italics: true, after: 60 }),
        giua("———", { size: 20, after: 120 }),
        new Paragraph({ children: [R("Kính gửi: {kinh_gui}.")], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
        P("{mo_dau}"),
        muc("I. KẾT QUẢ THỰC HIỆN"),
        P([R("1. Kết quả chung", { bold: true, italics: true })]),
        P("{tong_quat}"),
        P([R("2. Kết quả từng dự án", { bold: true, italics: true })]),
        bang,
        P([R("(Chi tiết kinh phí tạm tính, còn phải chi, chặng thực hiện: Phụ lục Excel kèm theo)", { italics: true, size: 22 })], { indent: false, align: AlignmentType.LEFT, before: 60 }),
        P("{#co_dot}"),
        P([R("3. Kết quả theo đợt thu hồi", { bold: true, italics: true })], { before: 120 }),
        bangDot,
        P("{/co_dot}"),
        muc("II. KHÓ KHĂN, VƯỚNG MẮC"),
        // Thẻ vòng lặp/điều kiện đứng riêng một đoạn để docxtemplater (paragraphLoop) bỏ đoạn khi rỗng
        P("{#vuong_mac}"),
        P("- {du_an}: {noi_dung}"),
        P("{/vuong_mac}"),
        P("{^vuong_mac}"),
        P("Không có vướng mắc cần xử lý ngay theo cảnh báo của phần mềm."),
        P("{/vuong_mac}"),
        P("{#co_kho_khan_khac}"),
        P("{kho_khan_khac}"),
        P("{/co_kho_khan_khac}"),
        muc("III. NHIỆM VỤ, GIẢI PHÁP THỜI GIAN TỚI"),
        P("{nhiem_vu}"),
        muc("IV. ĐỀ XUẤT, KIẾN NGHỊ"),
        P("{kien_nghi}"),
        P("{ket_thuc}", { after: 200 }),
        kyTen,
      ],
    },
  ],
});

const RA = path.resolve(__dirname, "../../apps/desktop/public/mau-van-ban/bao-cao-tong-hop.docx");
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(RA, b);
  console.log("Đã ghi", RA);
});
