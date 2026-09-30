/**
 * Sinh 7 mẫu theo bố cục bộ văn bản dự án thực tế do người dùng cung cấp 30/9/2026 (docs/19 §3, §4; nguyên văn cấp dự án đã
 * ẩn danh ở docs/mau-thuc-te/). Không chứa tên người, số văn bản, địa danh của dự án gốc — thay bằng trường tự điền {…}.
 * Thể thức theo NĐ 30/2020/NĐ-CP (khung.mjs). Biểu kèm theo đặt ở trang khổ ngang sau khối chữ ký.
 * Chạy lại: node tools/mau-van-ban/mau-thuc-te.mjs
 */
import { writeFileSync } from "node:fs";
import { AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, VerticalAlign } from "docx";
import { FONT, P, giua, trai, lap, runs, dauVanBan, tenVanBan, kyVanBan } from "./khung.mjs";

const RA = new URL("../../apps/desktop/public/mau-van-ban/", import.meta.url);
const UBND_XA = ["ỦY BAN NHÂN DÂN", "{TEN_XA}"];
const PHONG = ["ỦY BAN NHÂN DÂN {TEN_XA}", "{TEN_PHONG}"];
const CAN_CU = () => lap("can_cu", "{.}", { nghieng: true, sau: 60 });
const muc = (s) => P(s, { trai: 567, thut: 0 });
const VIEN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const RONG_NGANG = 14570; // A4 ngang − lề 20 mm hai bên

/** Bảng biểu có viền: tiêu đề, dòng đánh số cột, dòng lặp {#ten}…{/ten} (ô có thể nhiều dòng: mảng đoạn), dòng tổng. */
function bieu(ten, cot, tong) {
  const k = RONG_NGANG / cot.reduce((s, c) => s + c.rong, 0);
  const w = cot.map((c) => Math.round(c.rong * k));
  const vien = { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN };
  const cell = (dong, i, o = {}) =>
    new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      borders: vien,
      verticalAlign: VerticalAlign.CENTER,
      children: (Array.isArray(dong) ? dong : [dong]).map((s) => new Paragraph({ alignment: o.canh ?? AlignmentType.CENTER, children: runs(s, { size: 24, bold: o.dam, italics: o.nghieng }) })),
    });
  const rows = [
    new TableRow({ tableHeader: true, children: cot.map((c, i) => cell(c.tieuDe, i, { dam: true })) }),
    new TableRow({ tableHeader: true, children: cot.map((_, i) => cell(`(${i + 1})`, i, { nghieng: true })) }),
    new TableRow({
      cantSplit: true,
      children: cot.map((c, i) => {
        const nd = Array.isArray(c.truong) ? c.truong : [c.truong];
        const dau = i === 0 ? `{#${ten}}` : "";
        const cuoi = i === cot.length - 1 ? `{/${ten}}` : "";
        const ds = nd.map((t, j) => `${j === 0 ? dau : ""}${t}${j === nd.length - 1 ? cuoi : ""}`);
        return cell(ds, i, { canh: c.canh });
      }),
    }),
  ];
  if (tong) rows.push(new TableRow({ children: cot.map((c, i) => cell(i === 1 ? "TỔNG CỘNG" : c.tong ? `{${c.tong}}` : "", i, { dam: true, canh: c.canh })) }));
  return new Table({ width: { size: RONG_NGANG, type: WidthType.DXA }, columnWidths: w, rows });
}

const kemTheo = (vb) => giua(`(Kèm theo ${vb})`, { nghieng: true, sau: 120 });
const KT = {
  TTR: "Tờ trình số {so}/TTr-{ky_hieu_phong} ngày {ngay_ky_ngan} của {ten_phong}",
  TB: "Thông báo số {so}/TB-UBND ngày {ngay_ky_ngan} của Ủy ban nhân dân {ten_xa}",
  QD: "Quyết định số {so}/QĐ-UBND ngày {ngay_ky_ngan} của Chủ tịch Ủy ban nhân dân {ten_xa}",
};

function taoDoc(chinh, phu) {
  const sections = [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 850 } } }, children: chinh }];
  if (phu) sections.push({ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: phu });
  return new Document({ creator: "GPMB Sơn La", styles: { default: { document: { run: { font: FONT, size: 28 } } } }, sections });
}

/** Biểu danh sách người có đất thu hồi (docs/19 §4.1) — mỗi thửa một dòng, dòng 2 là vợ/chồng cùng đứng tên. */
const BIEU_DS = () =>
  bieu(
    "bang_thua",
    [
      { tieuDe: "STT", truong: "{stt}", rong: 5 },
      { tieuDe: "Tên chủ sử dụng đất", truong: ["{ho_ten}", "{cung_ten}"], rong: 26, canh: AlignmentType.LEFT },
      { tieuDe: "Địa chỉ khu đất", truong: "{dia_chi_khu_dat}", rong: 20, canh: AlignmentType.LEFT },
      { tieuDe: "Diện tích (m²)", truong: "{dien_tich}", rong: 11, canh: AlignmentType.RIGHT, tong: "bang_thua_tong" },
      { tieuDe: "Tờ bản đồ", truong: "{so_to}", rong: 8 },
      { tieuDe: "Số thửa", truong: "{so_thua}", rong: 8 },
      { tieuDe: "Loại đất theo hiện trạng", truong: "{ky_hieu}", rong: 10 },
      { tieuDe: "Ghi chú", truong: "{ghi_chu}", rong: 12 },
    ],
    true,
  );

/** Biểu tổng hợp diện tích thu hồi (docs/19 §4.4); cột theo từng ký hiệu loại đất: xuất ở biểu Excel. */
const BIEU_DT = () =>
  bieu(
    "bang_thua",
    [
      { tieuDe: "STT", truong: "{stt}", rong: 5 },
      { tieuDe: "Họ và tên", truong: ["{ho_ten}", "{cung_ten}"], rong: 24, canh: AlignmentType.LEFT },
      { tieuDe: "Địa chỉ thửa đất thu hồi", truong: "{dia_chi_khu_dat}", rong: 20, canh: AlignmentType.LEFT },
      { tieuDe: "Số thửa", truong: "{so_thua}", rong: 8 },
      { tieuDe: "Tờ bản đồ", truong: "{so_to}", rong: 8 },
      { tieuDe: "Diện tích (m²)", truong: "{dien_tich}", rong: 11, canh: AlignmentType.RIGHT, tong: "bang_thua_tong" },
      { tieuDe: "Loại đất thu hồi", truong: "{ky_hieu}", rong: 10 },
      { tieuDe: "Ghi chú", truong: "{ghi_chu}", rong: 12 },
    ],
    true,
  );

const TIEU_DE_BIEU = (dong1, loai) => [
  giua(dong1, { dam: true, sau: 0 }),
  giua("Dự án: {ten_du_an}", { dam: true, sau: 0 }),
  kemTheo(loai),
];

/** 11 mục phương án 01 hộ (docs/19 §3.1) — dùng chung cho Tờ trình (T4) và Điều 1 của QĐ (T5). */
function muoiMotMuc() {
  return [
    P("**1. Tổng số hộ gia đình, cá nhân có đất thu hồi:** {pa_so_ho_chu} hộ. {doi_tuong_goi_hoa} {ho_ten}{ho_cung_ten}; địa chỉ thường trú: {dia_chi}."),
    P("**2. Tổng diện tích đất thu hồi:** {pa_dt_thu_hoi} m²; loại đất thu hồi: {pa_loai_dat}; địa điểm thu hồi: {dia_diem_du_an}."),
    P("**3. Phương án đào tạo, chuyển đổi nghề và tìm kiếm việc làm:** {pa_chuyen_doi_nghe_ho}"),
    P("**4. Phương án bố trí tái định cư:** {pa_tai_dinh_cu_ho}"),
    P("**5. Phương án bồi thường bằng đất:** {pa_boi_thuong_dat_ho}"),
    P("**6. Phương án di dời mồ mả:** {pa_mo_ma_ho}"),
    P("**7. Phương án di chuyển công trình hạ tầng:** {pa_ha_tang}."),
    P("**8. Kinh phí bồi thường, hỗ trợ, tái định cư**"),
    P("8.1. Tổng kinh phí bồi thường, hỗ trợ (đã làm tròn): **{tong_tien}** đồng{pa_chenh_lech}."),
    P("__(Bằng chữ: {tong_tien_chu})__"),
    P("Trong đó:"),
    muc("a) Bồi thường về đất ({pa_bt_dat_loai}): {pa_bt_dat} đồng;"),
    muc("b) Bồi thường hoa màu, tài sản trên đất: {pa_bt_tai_san} đồng;"),
    muc("c) Bồi thường chi phí di chuyển: {pa_bt_di_chuyen};"),
    muc("d) Bồi thường chi phí đầu tư vào đất còn lại: {pa_bt_dau_tu};"),
    muc("đ) Các khoản hỗ trợ: {pa_ho_tro} đồng, trong đó:"),
    trai("{#pa_ho_tro_ds}", { sau: 0 }),
    P("- {ten}: {tien} đồng;", { trai: 1134, thut: 0 }),
    trai("{/pa_ho_tro_ds}", { sau: 0 }),
    P("- Hỗ trợ cây cối, hoa màu: {pa_ht_cay};", { trai: 1134, thut: 0 }),
    P("- Hỗ trợ khác theo khoản 13 Điều 6 Quyết định số 14/2026/QĐ-UBND:{#khong_k13} Không.{/khong_k13}{#co_k13} tổng giá trị {pa_k13_tong} đồng, gồm:{/co_k13}", { trai: 1134, thut: 0 }),
    trai("{#pa_k13}", { sau: 0 }),
    P("+ Nội dung: {noi_dung}; lý do: {ly_do}; mức hỗ trợ: {muc} (căn cứ: {can_cu}).", { trai: 1418, thut: 0 }),
    trai("{/pa_k13}", { sau: 0 }),
    P("8.2. Chi phí khác: {chi_phi_khac}."),
    P("**9. Tiến độ thực hiện phương án:** {tien_do_thuc_hien}"),
    P("**10. Ý kiến, kiến nghị của hộ gia đình, cá nhân về phương án và kết quả giải quyết:** {y_kien_kien_nghi}"),
    P("**11. Nội dung khác:** {noi_dung_khac}"),
  ];
}

const BIEU_01_02 = () => [
  giua("Biểu số 01, Biểu số 02 (bảng tổng hợp kinh phí và bảng tính chi tiết của hộ) xuất từ Excel phương án:", { nghieng: true }),
  giua("Hồ sơ hộ → Tính toán → Xuất Excel (mẫu Excel mặc định có Biểu số 01, Biểu số 02).", { nghieng: true }),
];

const MAU = {
  T1: () => [
    [
      dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/KH-UBND" }),
      ...tenVanBan("KẾ HOẠCH", "Thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm để thực hiện\ndự án {ten_du_an}"),
      ...CAN_CU(),
      P("Ủy ban nhân dân {ten_xa} ban hành Kế hoạch thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm để thực hiện dự án {ten_du_an} như sau:"),
      P("**I. MỤC ĐÍCH, YÊU CẦU**"),
      P("- Thực hiện bồi thường, hỗ trợ, tái định cư, thu hồi đất để bàn giao mặt bằng cho chủ đầu tư thực hiện dự án đảm bảo đúng tiến độ đã được phê duyệt."),
      P("- Tổ chức triển khai các trình tự, thủ tục bồi thường, hỗ trợ, tái định cư, thu hồi đất đảm bảo công khai, dân chủ, theo đúng quy định của pháp luật."),
      P("- Làm tốt công tác tuyên truyền, phổ biến chính sách pháp luật về thu hồi đất, bồi thường, giải phóng mặt bằng cho các đối tượng có liên quan, tạo sự đồng thuận của người có đất thu hồi."),
      P("**II. THÔNG TIN CHUNG VỀ DỰ ÁN**"),
      P("1. Tên dự án: {ten_du_an}."),
      P("2. Chủ đầu tư: {chu_dau_tu}."),
      P("3. Lý do thu hồi đất: {ly_do_thu_hoi}."),
      P("4. Vị trí, địa điểm, quy mô diện tích khu đất thu hồi: vị trí, địa điểm: {dia_diem_du_an}; diện tích thu hồi khoảng {tong_dt_thu_hoi} m² (theo hồ sơ các hộ đã nhập); loại đất thu hồi: {ds_loai_ten}."),
      P("5. Phạm vi ảnh hưởng: {so_doi_tuong_mo_ta} tại {dia_diem_du_an}."),
      P("6. Tiến độ thực hiện dự án: {tien_do_du_an}."),
      P("**III. NỘI DUNG KẾ HOẠCH**"),
      P("1. Cắm mốc ranh giới khu đất thu hồi; trích lục bản đồ địa chính hoặc trích đo địa chính thửa đất, khu đất: dự kiến hoàn thành trước ngày {kh_b1}."),
      P("2. Tổ chức họp với người có đất trong khu vực thu hồi để phổ biến, tiếp nhận ý kiến: dự kiến hoàn thành trước ngày {kh_b2}."),
      P("3. Thông báo thu hồi đất: {ten_phong} trình Ủy ban nhân dân {ten_xa} ban hành Thông báo thu hồi đất; gửi thông báo thu hồi đất cho từng người có đất thu hồi, chủ sở hữu tài sản gắn liền với đất, người có quyền lợi và nghĩa vụ liên quan (nếu có) chậm nhất {thoi_han_tb} trước khi ban hành quyết định thu hồi đất; đồng thời niêm yết thông báo thu hồi đất và danh sách người có đất thu hồi tại trụ sở Ủy ban nhân dân {ten_xa} và địa điểm sinh hoạt chung của khu dân cư nơi có đất thu hồi trong suốt thời gian bồi thường, hỗ trợ, tái định cư. Dự kiến hoàn thành trước ngày {kh_b3}."),
      P("Trường hợp không liên lạc được, không gửi được thông báo thu hồi đất cho người có đất thu hồi, chủ sở hữu tài sản gắn liền với đất, người có quyền lợi và nghĩa vụ liên quan thì phát sóng trên đài phát thanh hoặc truyền hình của địa phương 03 lần trong 03 ngày liên tiếp; niêm yết tại trụ sở Ủy ban nhân dân cấp xã, địa điểm sinh hoạt chung của khu dân cư nơi có đất thu hồi, đăng tải lên cổng thông tin điện tử của Ủy ban nhân dân cấp xã trong suốt thời gian bồi thường, hỗ trợ, tái định cư mà không phải gửi thông báo thu hồi đất lại."),
      P("4. Điều tra, khảo sát, đo đạc, kiểm đếm: họp dân, phát tờ khai (người có đất thu hồi kê khai và nộp tờ khai trong thời hạn theo quy định); thông báo kiểm kê hiện trạng; kiểm kê hiện trạng đất đai, tài sản, vật kiến trúc trên đất. Trường hợp người có đất thu hồi không phối hợp thì Ủy ban nhân dân {ten_xa} tổ chức vận động, thuyết phục; không chấp hành thì thực hiện kiểm đếm bắt buộc theo quy định. Dự kiến hoàn thành trước ngày {kh_b4}."),
      P("5. Xác minh, kết luận về nguồn gốc, loại đất; họp xét đối tượng giao đất tái định cư, giao đất có thu tiền sử dụng đất (nếu có): dự kiến hoàn thành trước ngày {kh_xac_minh}."),
      P("6. Lập, công khai, thẩm định, phê duyệt phương án bồi thường, hỗ trợ, tái định cư: lập phương án trước ngày {kh_b5}; niêm yết công khai trước ngày {kh_b6}; lấy ý kiến, đối thoại trước ngày {kh_b7}; thẩm định trước ngày {kh_b8}; phê duyệt phương án trước ngày {kh_b9}."),
      P("7. Thực hiện phương án bồi thường, hỗ trợ, quyết định thu hồi đất: phổ biến, niêm yết quyết định trước ngày {kh_b10}; gửi quyết định đến từng người trước ngày {kh_b11}; chi trả tiền bồi thường, hỗ trợ trước ngày {kh_b12}; ban hành quyết định thu hồi đất trước ngày {kh_b13}; bàn giao mặt bằng, quản lý đất đã thu hồi trước ngày {kh_b16}."),
      P("**IV. GIAO NHIỆM VỤ CHO CÁC ĐƠN VỊ**"),
      P("1. {ten_don_vi_bt}: tiếp nhận hồ sơ dự án, mốc giới; dự thảo các thông báo, quyết định, phương án bồi thường, hỗ trợ; phối hợp tổ chức họp, điều tra, kiểm đếm, niêm yết, lấy ý kiến; phối hợp chi trả tiền bồi thường, hỗ trợ theo phương án được phê duyệt."),
      P("2. {ten_phong}: cơ quan thường trực của Hội đồng bồi thường, hỗ trợ, tái định cư; theo dõi, đôn đốc thực hiện Kế hoạch; thẩm định phương án; tham mưu Ủy ban nhân dân {ten_xa} ban hành thông báo, quyết định thu hồi đất, phê duyệt phương án; lưu trữ hồ sơ."),
      P("3. {co_quan_dang_tai}: đăng tải Kế hoạch này lên trang thông tin điện tử."),
      P("4. Các tổ chức, hộ gia đình, cá nhân trong phạm vi thực hiện dự án: phối hợp cung cấp thông tin, hồ sơ, giấy tờ về quyền sử dụng đất; cùng tham gia đo đạc, kiểm kê, kiểm đếm."),
      P("Trong quá trình thực hiện nếu có khó khăn, vướng mắc, các cơ quan, đơn vị kịp thời báo cáo Ủy ban nhân dân {ten_xa} (qua {ten_phong}) để xem xét, giải quyết./."),
      kyVanBan({ quyenHan: "TM. ỦY BAN NHÂN DÂN\n{quyen_han}" }),
    ],
    [
      giua("BẢNG TIẾN ĐỘ DỰ KIẾN", { dam: true, sau: 0 }),
      kemTheo("Kế hoạch số {so}/KH-UBND ngày {ngay_ky_ngan} của Ủy ban nhân dân {ten_xa}"),
      bieu("ds_moc", [
        { tieuDe: "STT", truong: "{stt}", rong: 5 },
        { tieuDe: "Bước", truong: "{buoc}", rong: 6 },
        { tieuDe: "Nội dung công việc", truong: "{ten}", rong: 40, canh: AlignmentType.LEFT },
        { tieuDe: "Dự kiến hoàn thành trước ngày", truong: "{ngay}", rong: 16 },
        { tieuDe: "Căn cứ", truong: "{can_cu}", rong: 20, canh: AlignmentType.LEFT },
      ]),
    ],
  ],
  T2: () => [
    [
      dauVanBan({ coQuan: PHONG, so: "Số: {so}/TTr-{ky_hieu_phong}" }),
      ...tenVanBan("TỜ TRÌNH", "V/v ban hành Thông báo thu hồi đất thực hiện dự án {ten_du_an}"),
      giua("Kính gửi: Chủ tịch Ủy ban nhân dân {ten_xa}.", { truoc: 120 }),
      ...CAN_CU(),
      P("Căn cứ Kế hoạch số {ke_hoach_so} ngày {ke_hoach_ngay} của Ủy ban nhân dân {ten_xa} về việc thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm để thực hiện dự án {ten_du_an};", { nghieng: true }),
      P("{ten_phong} kính trình Chủ tịch Ủy ban nhân dân {ten_xa} ban hành Thông báo thu hồi đất thực hiện dự án {ten_du_an}, với nội dung như sau:"),
      ...NOI_DUNG_TB(),
      P("{ten_phong} kính trình Chủ tịch Ủy ban nhân dân {ten_xa} xem xét, quyết định./."),
      kyVanBan(),
    ],
    [...TIEU_DE_BIEU("DANH SÁCH NGƯỜI CÓ ĐẤT DỰ KIẾN THU HỒI", KT.TTR), BIEU_DS()],
  ],
  T3: () => [
    [
      dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/TB-UBND" }),
      ...tenVanBan("THÔNG BÁO", "Thu hồi đất để thực hiện dự án {ten_du_an}"),
      ...CAN_CU(),
      P("Căn cứ Kế hoạch số {ke_hoach_so} ngày {ke_hoach_ngay} của Ủy ban nhân dân {ten_xa} về việc thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm để thực hiện dự án {ten_du_an};", { nghieng: true }),
      P("Theo đề nghị của {chuc_danh_de_nghi} tại Tờ trình số {tt_tb_thu_hoi_so} ngày {tt_tb_thu_hoi_ngay}.", { nghieng: true }),
      P("Ủy ban nhân dân {ten_xa} thông báo như sau:"),
      ...NOI_DUNG_TB(),
      P("**6. Tổ chức thực hiện**"),
      P("6.1. {ten_phong}: chủ trì, phối hợp với các cơ quan, đơn vị liên quan đôn đốc, kiểm tra việc thực hiện thông báo thu hồi đất; phối hợp tổ chức họp phổ biến đến người dân trong khu vực có đất thu hồi."),
      P("6.2. {ten_don_vi_bt}: gửi Thông báo thu hồi đất đến từng người có đất thu hồi (có danh sách ký nhận); trường hợp không nhận thông báo thì lập biên bản ghi nhận sự việc; niêm yết công khai Thông báo tại {noi_niem_yet}; thông báo đến từng người có đất thuộc phạm vi thu hồi không được làm thay đổi hiện trạng sử dụng đất, không trồng cây lâu năm, xây dựng, cải tạo công trình trên diện tích đất đã thông báo thu hồi — tài sản phát sinh sau thông báo không được bồi thường, hỗ trợ; tổ chức điều tra, khảo sát, đo đạc, kiểm đếm, lập phương án bồi thường, hỗ trợ, tái định cư theo quy định."),
      P("6.3. {co_quan_dang_tai}: đăng tải Thông báo này trên trang thông tin điện tử; phát sóng trên đài phát thanh hoặc truyền hình của địa phương 03 lần trong 03 ngày liên tiếp đối với trường hợp không liên lạc được, không gửi được thông báo."),
      P("6.4. Các tổ chức, hộ gia đình, cá nhân có đất thu hồi: có trách nhiệm phối hợp với {ten_don_vi_bt} và Hội đồng bồi thường, hỗ trợ, tái định cư thực hiện việc điều tra, khảo sát, đo đạc, kiểm đếm; trường hợp không phối hợp thì bị kiểm đếm bắt buộc theo quy định./."),
      kyVanBan({ quyenHan: "TM. ỦY BAN NHÂN DÂN\n{quyen_han}" }),
    ],
    [...TIEU_DE_BIEU("DANH SÁCH NGƯỜI CÓ ĐẤT THU HỒI", KT.TB), BIEU_DS()],
  ],
  T4: () => [
    [
      dauVanBan({ coQuan: PHONG, so: "Số: {so}/TTr-{ky_hieu_phong}" }),
      ...tenVanBan("TỜ TRÌNH", "V/v đề nghị phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với {doi_tuong_goi} {ho_ten}{ho_cung_ten}\ntại {dia_chi} bị thu hồi đất để thực hiện dự án {ten_du_an}"),
      giua("Kính gửi: Chủ tịch Ủy ban nhân dân {ten_xa}.", { truoc: 120 }),
      ...CAN_CU(),
      P("Căn cứ Thông báo thu hồi đất số {tb_thu_hoi_so} ngày {tb_thu_hoi_ngay} của Ủy ban nhân dân {ten_xa};", { nghieng: true }),
      P("{ten_phong} kính trình Chủ tịch Ủy ban nhân dân {ten_xa} phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với {doi_tuong_goi} {ho_ten} bị thu hồi đất để thực hiện dự án {ten_du_an}, như sau:"),
      ...muoiMotMuc(),
      P("(Chi tiết có Biểu số 01, Biểu số 02 kèm theo)", { nghieng: true, canh: AlignmentType.CENTER, thut: 0 }),
      P("{ten_phong} kính trình Chủ tịch Ủy ban nhân dân {ten_xa} xem xét, phê duyệt./."),
      kyVanBan(),
    ],
    BIEU_01_02(),
  ],
  T5: () => [
    [
      dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/QĐ-UBND" }),
      ...tenVanBan("QUYẾT ĐỊNH", "Về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với {doi_tuong_goi} {ho_ten}{ho_cung_ten}\ntại {dia_chi} bị thu hồi đất để thực hiện dự án {ten_du_an}"),
      giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
      ...CAN_CU(),
      P("Căn cứ Thông báo thu hồi đất số {tb_thu_hoi_so} ngày {tb_thu_hoi_ngay} của Ủy ban nhân dân {ten_xa};", { nghieng: true }),
      P("Xét đề nghị của {chuc_danh_de_nghi} tại Tờ trình số {tt_pa_ho_so} ngày {tt_pa_ho_ngay}.", { nghieng: true }),
      giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
      P("**Điều 1.** Phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với {doi_tuong_goi} {ho_ten} bị thu hồi đất để thực hiện dự án {ten_du_an}, với các nội dung sau:"),
      ...muoiMotMuc(),
      P("(Chi tiết có Biểu số 01, Biểu số 02 kèm theo)", { nghieng: true, canh: AlignmentType.CENTER, thut: 0 }),
      P("**Điều 2. Tổ chức thực hiện**"),
      P("1. {ten_don_vi_bt}: giao Quyết định này đến {doi_tuong_goi} {ho_ten}; phối hợp chi trả tiền bồi thường, hỗ trợ theo phương án được phê duyệt."),
      P("2. {ten_phong} và các cơ quan, đơn vị liên quan: thực hiện các nội dung theo chức năng, nhiệm vụ."),
      P("3. {co_quan_dang_tai}: đăng tải Quyết định này lên trang thông tin điện tử."),
      P("**Điều 3.** Quyết định có hiệu lực kể từ ngày {ngay_hieu_luc}. Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân, {chuc_danh_de_nghi}, Thủ trưởng {ten_don_vi_bt}, {doi_tuong_goi} {ho_ten} và các cơ quan, đơn vị có liên quan chịu trách nhiệm thi hành Quyết định này./."),
      kyVanBan(),
    ],
    BIEU_01_02(),
  ],
  T6: () => [
    [
      dauVanBan({ coQuan: PHONG, so: "Số: {so}/TTr-{ky_hieu_phong}" }),
      ...tenVanBan("TỜ TRÌNH", "V/v đề nghị ban hành Quyết định thu hồi {bang_thua_tong} m² đất của {so_ho} hộ gia đình, cá nhân\nđể thực hiện dự án {ten_du_an}"),
      giua("Kính gửi: Chủ tịch Ủy ban nhân dân {ten_xa}.", { truoc: 120 }),
      ...CAN_CU(),
      P("Căn cứ Thông báo thu hồi đất số {tb_thu_hoi_so} ngày {tb_thu_hoi_ngay} của Ủy ban nhân dân {ten_xa};", { nghieng: true }),
      ...QD_PA_CAN_CU(),
      P("Căn cứ Tờ trình số {tt_don_vi_so} ngày {tt_don_vi_ngay} của {ten_don_vi_bt};", { nghieng: true }),
      P("{ten_phong} kính trình Chủ tịch Ủy ban nhân dân {ten_xa} ban hành Quyết định thu hồi đất, như sau:"),
      ...NOI_DUNG_THU_HOI(),
      P("{ten_phong} kính trình Chủ tịch Ủy ban nhân dân {ten_xa} xem xét, quyết định./."),
      kyVanBan(),
    ],
    [...TIEU_DE_BIEU("BẢNG TỔNG HỢP DIỆN TÍCH THU HỒI ĐẤT", KT.TTR), BIEU_DT()],
  ],
  T7: () => [
    [
      dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/QĐ-UBND" }),
      ...tenVanBan("QUYẾT ĐỊNH", "Về việc thu hồi {bang_thua_tong} m² đất của {so_ho} hộ gia đình, cá nhân\nđể thực hiện dự án {ten_du_an}"),
      giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
      ...CAN_CU(),
      P("Căn cứ Thông báo thu hồi đất số {tb_thu_hoi_so} ngày {tb_thu_hoi_ngay} của Ủy ban nhân dân {ten_xa};", { nghieng: true }),
      ...QD_PA_CAN_CU(),
      P("Xét đề nghị của {chuc_danh_de_nghi} tại Tờ trình số {tt_thu_hoi_so} ngày {tt_thu_hoi_ngay}.", { nghieng: true }),
      giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
      ...NOI_DUNG_THU_HOI(true),
      P("**Điều 3.** Quyết định có hiệu lực kể từ ngày {ngay_hieu_luc}. Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân, {chuc_danh_de_nghi}, Thủ trưởng {ten_don_vi_bt}, {don_vi_nhan_dat}, các hộ gia đình, cá nhân có tên tại biểu kèm theo và các cơ quan, đơn vị có liên quan chịu trách nhiệm thi hành Quyết định này./."),
      kyVanBan(),
    ],
    [...TIEU_DE_BIEU("BẢNG TỔNG HỢP DIỆN TÍCH THU HỒI ĐẤT", KT.QD), BIEU_DT()],
  ],
};

/** Nội dung 1–5 của Tờ trình/Thông báo thu hồi đất (docs/mau-thuc-te/thong-bao-thu-hoi-dat.md). */
function NOI_DUNG_TB() {
  return [
    P("**1. Thu hồi đất để thực hiện dự án**"),
    P("- Tổng diện tích đất dự kiến thu hồi của các hộ gia đình, cá nhân khoảng {bang_thua_tong} m². {dt_khac_mo_ta}"),
    P("- Tổ chức, hộ gia đình, cá nhân bị ảnh hưởng: {so_doi_tuong_mo_ta} (có danh sách chi tiết kèm theo)."),
    P("- Địa điểm thu hồi đất: {dia_diem_du_an}."),
    P("**2. Lý do thu hồi đất:** {ly_do_thu_hoi}."),
    P("**3. Thời gian điều tra, khảo sát, đo đạc, kiểm đếm:** bắt đầu từ ngày {tg_dieu_tra_tu}; tiến độ theo Kế hoạch số {ke_hoach_so} ngày {ke_hoach_ngay} của Ủy ban nhân dân {ten_xa}."),
    P("**4. Hiệu lực thông báo thu hồi đất:** Thông báo này có hiệu lực 12 tháng tính từ ngày ban hành."),
    P("**5. Dự kiến kế hoạch di chuyển và bố trí tái định cư (nếu có):** {ke_hoach_tdc}"),
  ];
}

/** Căn cứ: QĐ phê duyệt phương án của từng hộ (số, ngày, tên hộ) — tự lấy từ hồ sơ; thông báo gửi tiền (nếu có). */
function QD_PA_CAN_CU() {
  return [
    trai("{#ds_qd_pa}", { sau: 0 }),
    P("Căn cứ Quyết định số {so} ngày {ngay} của {co_quan} về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với {goi} {ho_ten};", { nghieng: true, sau: 60 }),
    trai("{/ds_qd_pa}", { sau: 0 }),
    trai("{#ds_tb_gui_tien}", { sau: 0 }),
    P("Căn cứ Thông báo số {so} ngày {ngay} về việc gửi tiền bồi thường, hỗ trợ của {goi} {ho_ten} vào tài khoản tiền gửi;", { nghieng: true, sau: 60 }),
    trai("{/ds_tb_gui_tien}", { sau: 0 }),
  ];
}

function NOI_DUNG_THU_HOI(laQd = false) {
  const d = (so, s) => (laQd ? P(`**Điều ${so}.** ${s}`) : P(`**${so}.** ${s}`));
  return [
    d(1, "Thu hồi {bang_thua_tong} m² đất của {so_ho_chu} hộ gia đình, cá nhân tại {dia_diem_du_an} để thực hiện dự án {ten_du_an} (chi tiết có biểu tổng hợp kèm theo)."),
    P("Lý do thu hồi đất: {ly_do_thu_hoi}."),
    P("Giao {bang_thua_tong} m² đất đã thu hồi cho {don_vi_nhan_dat} quản lý theo quy định."),
    d(2, "Giao nhiệm vụ:"),
    P("2.1. {co_quan_dang_tai}: đăng tải Quyết định trên trang thông tin điện tử."),
    P("2.2. {ten_phong}: chỉnh lý hồ sơ địa chính (hoặc phối hợp cơ quan đăng ký đất đai), quản lý quỹ đất đã thu hồi theo quy định."),
    P("2.3. {ten_don_vi_bt}: giao Quyết định thu hồi đất đến các hộ gia đình, cá nhân có đất thu hồi; thu hồi Giấy chứng nhận (nếu có) để chỉnh lý."),
    P("2.4. Ban điều hành tổ dân phố/bản nơi có đất thu hồi: phối hợp tuyên truyền, vận động."),
    P("2.5. Các hộ gia đình, cá nhân có tên tại biểu kèm theo: chấp hành Quyết định thu hồi đất, bàn giao mặt bằng theo quy định."),
  ];
}

const DANH_SACH = { T1: "tt-ke-hoach", T2: "tt-to-trinh-tb", T3: "tt-thong-bao", T4: "tt-to-trinh-pa-ho", T5: "tt-qd-pa-ho", T6: "tt-to-trinh-thu-hoi", T7: "tt-qd-thu-hoi" };
for (const [ma, tep] of Object.entries(DANH_SACH)) {
  const [chinh, phu] = MAU[ma]();
  const buf = await Packer.toBuffer(taoDoc(chinh, phu));
  writeFileSync(new URL(`${tep}.docx`, RA), buf);
  console.log(`Mẫu ${ma}: ${tep}.docx (${buf.length} byte)`);
}
