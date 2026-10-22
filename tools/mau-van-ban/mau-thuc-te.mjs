/**
 * Sinh 7 mẫu theo bố cục bộ văn bản dự án thực tế do người dùng cung cấp 30/9/2026 (docs/19 §3, §4; nguyên văn cấp dự án đã
 * ẩn danh ở docs/mau-thuc-te/). Không chứa tên người, số văn bản, địa danh của dự án gốc — thay bằng trường tự điền {…}.
 * Thể thức theo NĐ 30/2020/NĐ-CP (khung.mjs). Biểu kèm theo đặt ở trang khổ ngang sau khối chữ ký.
 * Chạy lại: node tools/mau-van-ban/mau-thuc-te.mjs
 */
import { writeFileSync } from "node:fs";
import { AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, VerticalAlign } from "docx";
import { FONT, P, giua, trai, lap, runs, dauVanBan, tenVanBan, kyVanBan, quocHieu, thanhPhan, kyBienBan, bangLap } from "./khung.mjs";

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

/** 1.0.5 — biểu quỹ đất, quỹ nhà TĐC và biểu dự kiến bố trí TĐC (k1 Điều 111 LĐĐ 2024). */
const DON_VI_BT = ["{CO_QUAN_CAP_TREN_BT}", "{TEN_DON_VI_BT}"];
const BIEU_LO = () =>
  bieu("ds_lo", [
    { tieuDe: "STT", truong: "{stt}", rong: 5 },
    { tieuDe: "Khu, điểm tái định cư", truong: "{khu}", rong: 20, canh: AlignmentType.LEFT },
    { tieuDe: "Lô / căn số", truong: "{so_lo}", rong: 9 },
    { tieuDe: "Loại", truong: "{loai}", rong: 8 },
    { tieuDe: "Diện tích (m²)", truong: "{dien_tich}", rong: 10, canh: AlignmentType.RIGHT },
    { tieuDe: "Giá đất / giá nhà TĐC (đồng/m²)", truong: "{gia}", rong: 13, canh: AlignmentType.RIGHT },
    { tieuDe: "Căn cứ giá", truong: "{can_cu_gia}", rong: 18, canh: AlignmentType.LEFT },
    { tieuDe: "Ghi chú", truong: "{ghi_chu}", rong: 17, canh: AlignmentType.LEFT },
  ]);
const BIEU_HO_TDC = () =>
  bieu("ds_ho_tdc", [
    { tieuDe: "STT", truong: "{stt}", rong: 5 },
    { tieuDe: "Họ và tên", truong: "{ho_ten}", rong: 18, canh: AlignmentType.LEFT },
    { tieuDe: "Địa chỉ", truong: "{dia_chi}", rong: 15, canh: AlignmentType.LEFT },
    { tieuDe: "Hình thức bố trí", truong: "{hinh_thuc}", rong: 17, canh: AlignmentType.LEFT },
    { tieuDe: "Vị trí (khu – lô, căn)", truong: "{vi_tri}", rong: 15, canh: AlignmentType.LEFT },
    { tieuDe: "Diện tích (m²)", truong: "{dien_tich}", rong: 9, canh: AlignmentType.RIGHT },
    { tieuDe: "Giá (đồng/m²)", truong: "{gia}", rong: 10, canh: AlignmentType.RIGHT },
    { tieuDe: "Tiền SDĐ phải nộp (đồng)", truong: "{tien_sdd}", rong: 11, canh: AlignmentType.RIGHT },
    { tieuDe: "Ghi chú", truong: "{ghi_chu}", rong: 10, canh: AlignmentType.LEFT },
  ]);
const KT_TB_BT = "Thông báo số {so}/TB-{ky_hieu_don_vi} ngày {ngay_ky_ngan} của {ten_don_vi_bt}";

MAU.T8 = () => [
  [
    dauVanBan({ coQuan: DON_VI_BT, so: "Số: {so}/TB-{ky_hieu_don_vi}" }),
    ...tenVanBan("THÔNG BÁO", "Dự kiến phương án bố trí tái định cư\ndự án {ten_du_an}"),
    P("Căn cứ khoản 1 Điều 111 Luật Đất đai năm 2024;", { nghieng: true }),
    ...CAN_CU(),
    P("{ten_don_vi_bt} thông báo dự kiến phương án bố trí tái định cư đối với người có đất ở bị thu hồi, chủ sở hữu nhà ở thuộc đối tượng phải di chuyển chỗ ở để thực hiện dự án {ten_du_an} như sau:"),
    P("**1. Địa điểm khu, điểm tái định cư:** {#tdc_dia_diem}{tdc_dia_diem}{/tdc_dia_diem}{^tdc_dia_diem}{tdc_khu}{/tdc_dia_diem}."),
    P("**2. Quy mô quỹ đất, quỹ nhà tái định cư:** {tdc_quy_mo}."),
    P("**3. Thiết kế:** {tdc_thiet_ke}"),
    P("**4. Diện tích từng lô đất, căn hộ; giá đất, giá nhà tái định cư:** chi tiết tại Biểu số 01 kèm theo. Giá đất tính tiền sử dụng đất tại nơi tái định cư được xác định theo bảng giá đất tại thời điểm phê duyệt phương án bồi thường, hỗ trợ, tái định cư (khoản 3 Điều 111 Luật Đất đai)."),
    P("**5. Dự kiến bố trí tái định cư cho người có đất thu hồi:** {so_ho_tdc_chu} hộ gia đình, cá nhân; chi tiết tại Biểu số 02 kèm theo."),
    P("**6. Niêm yết công khai:** Thông báo này được niêm yết công khai ít nhất 15 ngày, từ ngày {niem_yet_tu} đến ngày {niem_yet_den}, tại trụ sở Ủy ban nhân dân {ten_xa}; {noi_niem_yet}{#noi_tdc_niem_yet}; {noi_tdc_niem_yet}{/noi_tdc_niem_yet}."),
    P("**7.** Hộ gia đình, cá nhân có ý kiến về dự kiến phương án bố trí tái định cư gửi về {ten_don_vi_bt} trước ngày {han_y_kien} để tổng hợp, báo cáo cơ quan có thẩm quyền xem xét trước khi phê duyệt phương án bố trí tái định cư./."),
    kyVanBan(),
  ],
  [
    ...TIEU_DE_BIEU("Biểu số 01. QUỸ ĐẤT, QUỸ NHÀ TÁI ĐỊNH CƯ", KT_TB_BT), BIEU_LO(),
    new Paragraph({ children: [], pageBreakBefore: true }),
    ...TIEU_DE_BIEU("Biểu số 02. DỰ KIẾN BỐ TRÍ TÁI ĐỊNH CƯ", KT_TB_BT), BIEU_HO_TDC(),
  ],
];
MAU.T9 = () => [
  [
    dauVanBan({ coQuan: DON_VI_BT, so: "Số: {so}/TB-{ky_hieu_don_vi}" }),
    ...tenVanBan("THÔNG BÁO", "Công bố công khai phương án bố trí tái định cư\ndự án {ten_du_an}"),
    P("Căn cứ khoản 2 Điều 111 Luật Đất đai năm 2024;", { nghieng: true }),
    ...CAN_CU(),
    P("Căn cứ Quyết định số {qd_tdc_so} ngày {qd_tdc_ngay} của {qd_tdc_co_quan} phê duyệt phương án bố trí tái định cư dự án {ten_du_an};", { nghieng: true }),
    P("{ten_don_vi_bt} công bố công khai phương án bố trí tái định cư đã được phê duyệt như sau:"),
    P("**1. Khu, điểm tái định cư:** {tdc_khu}; quy mô: {tdc_quy_mo}."),
    P("**2. Kết quả bố trí tái định cư:** {so_ho_tdc_chu} hộ gia đình, cá nhân; chi tiết tại Biểu số 01 (lô đất, căn nhà) và Biểu số 02 (bố trí cho từng hộ) kèm theo."),
    P("**3. Địa điểm công bố công khai:** trụ sở Ủy ban nhân dân {ten_xa}; {noi_niem_yet}; {noi_tdc_niem_yet}."),
    P("Đề nghị các hộ gia đình, cá nhân có tên tại Biểu số 02 theo dõi, thực hiện./."),
    kyVanBan(),
  ],
  [
    ...TIEU_DE_BIEU("Biểu số 01. QUỸ ĐẤT, QUỸ NHÀ TÁI ĐỊNH CƯ", KT_TB_BT), BIEU_LO(),
    new Paragraph({ children: [], pageBreakBefore: true }),
    ...TIEU_DE_BIEU("Biểu số 02. BỐ TRÍ TÁI ĐỊNH CƯ", KT_TB_BT), BIEU_HO_TDC(),
  ],
];

const BIEU_CHAM = () =>
  bieu("ds_cham_tra", [
    { tieuDe: "STT", truong: "{stt}", rong: 5 },
    { tieuDe: "Họ và tên", truong: "{ho_ten}", rong: 16, canh: AlignmentType.LEFT },
    { tieuDe: "Địa chỉ", truong: "{dia_chi}", rong: 13, canh: AlignmentType.LEFT },
    { tieuDe: "Số tiền theo phương án (đồng)", truong: "{phai_tra}", rong: 11, canh: AlignmentType.RIGHT },
    { tieuDe: "Hạn chi trả", truong: "{han_chi}", rong: 8 },
    { tieuDe: "Số tiền chậm trả × số ngày chậm", truong: "{khoan}", rong: 18, canh: AlignmentType.LEFT },
    { tieuDe: "Mức tiền chậm nộp áp dụng", truong: "{dien_giai}", rong: 18, canh: AlignmentType.LEFT },
    { tieuDe: "Tiền chậm trả (đồng)", truong: "{tien_cham}", rong: 11, canh: AlignmentType.RIGHT, tong: "tong_cham_tra" },
  ], true);

MAU.T10 = () => [
  [
    dauVanBan({ coQuan: DON_VI_BT, so: "Số: {so}/TTr-{ky_hieu_don_vi}" }),
    ...tenVanBan("TỜ TRÌNH", "Đề nghị phê duyệt phương án chi trả bồi thường chậm\ndự án {ten_du_an}"),
    giua("Kính gửi: {kinh_gui}.", { truoc: 120 }),
    P("Căn cứ điểm b khoản 3 Điều 94 Luật Đất đai năm 2024;", { nghieng: true }),
    ...CAN_CU(),
    P("{ten_don_vi_bt} kính trình phê duyệt phương án chi trả bồi thường chậm cho người có đất thu hồi, chủ sở hữu tài sản thuộc dự án {ten_du_an}, như sau:"),
    P("**1. Lý do chậm chi trả:** {ly_do_cham}"),
    P("**2. Số hộ gia đình, cá nhân được thanh toán tiền chậm trả:** {so_ho_cham_chu} hộ (chi tiết tại biểu kèm theo)."),
    P("**3. Cách tính:** khoản tiền bằng mức tiền chậm nộp theo quy định của Luật Quản lý thuế tính trên số tiền chậm trả và thời gian chậm trả (điểm b khoản 3 Điều 94 Luật Đất đai năm 2024); thời gian chậm trả tính từ ngày liền sau hạn 30 ngày kể từ ngày quyết định phê duyệt phương án có hiệu lực đến ngày chi trả (khoản chưa chi: tạm tính đến ngày {tinh_den_ngay}). Mức tiền chậm nộp áp dụng: {can_cu_ty_le}."),
    P("**4. Tổng kinh phí chi trả bồi thường chậm:** **{tong_cham_tra}** đồng."),
    P("__(Bằng chữ: {tong_cham_tra_chu})__"),
    P("**5. Nguồn kinh phí:** {nguon_kinh_phi}."),
    P("{ten_don_vi_bt} kính trình xem xét, phê duyệt./."),
    kyVanBan(),
  ],
  [...TIEU_DE_BIEU("DANH SÁCH CHI TRẢ BỒI THƯỜNG CHẬM", "Tờ trình số {so}/TTr-{ky_hieu_don_vi} ngày {ngay_ky_ngan} của {ten_don_vi_bt}"), BIEU_CHAM()],
];
MAU.T11 = () => [
  [
    dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/QĐ-UBND" }),
    ...tenVanBan("QUYẾT ĐỊNH", "Phê duyệt phương án chi trả bồi thường chậm\ndự án {ten_du_an}"),
    giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
    P("Căn cứ điểm b khoản 3 Điều 94 Luật Đất đai năm 2024;", { nghieng: true }),
    ...CAN_CU(),
    P("Theo đề nghị của {ten_don_vi_bt} tại Tờ trình số {tt_cham_tra_so} ngày {tt_cham_tra_ngay}.", { nghieng: true }),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** Phê duyệt phương án chi trả bồi thường chậm cho {so_ho_cham_chu} hộ gia đình, cá nhân có đất thu hồi thuộc dự án {ten_du_an}, tổng kinh phí **{tong_cham_tra}** đồng __(Bằng chữ: {tong_cham_tra_chu})__; chi tiết tại biểu kèm theo."),
    P("**Điều 2.** Nguồn kinh phí: {nguon_kinh_phi}. {ten_don_vi_bt} có trách nhiệm chi trả cho các hộ gia đình, cá nhân có tên tại biểu kèm theo cùng với tiền bồi thường, hỗ trợ theo phương án đã phê duyệt."),
    P("**Điều 3.** Quyết định này có hiệu lực kể từ ngày {ngay_hieu_luc}. {ten_don_vi_bt}, các cơ quan, đơn vị và hộ gia đình, cá nhân có tên tại biểu kèm theo chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan({ quyenHan: "{quyen_han}" }),
  ],
  [...TIEU_DE_BIEU("DANH SÁCH CHI TRẢ BỒI THƯỜNG CHẬM", KT.QD), BIEU_CHAM()],
];

/** 1.0.6 — Biên bản đối thoại (điểm a khoản 3 Điều 87 Luật Đất đai 2024): luật không ban hành mẫu; bố cục theo các biên bản của Sổ tay. */
MAU.T12 = () => [
  [
    ...quocHieu({ ngay: true }),
    ...tenVanBan("BIÊN BẢN", "Đối thoại về phương án bồi thường, hỗ trợ, tái định cư\nkhi Nhà nước thu hồi đất để thực hiện dự án {ten_du_an}"),
    P("Căn cứ điểm a khoản 3 Điều 87 Luật Đất đai năm 2024;", { nghieng: true, truoc: 120 }),
    P("Căn cứ kết quả tổ chức lấy ý kiến về phương án bồi thường, hỗ trợ, tái định cư ngày {ngay_lay_y_kien};", { nghieng: true }),
    P("Hôm nay, vào hồi {thoi_diem}, tại {dia_diem_lam_viec}, {ten_don_vi_bt} phối hợp với Ủy ban nhân dân {ten_xa} tổ chức đối thoại với người có đất thu hồi còn ý kiến không đồng ý về phương án bồi thường, hỗ trợ, tái định cư, gồm:"),
    P("**I. THÀNH PHẦN THAM GIA**"),
    ...thanhPhan([
      ["Đại diện đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư:", "tp_don_vi_bt"],
      ["Đại diện Ủy ban nhân dân {ten_xa}:", "tp_ubnd"],
      ["Các thành phần khác có liên quan (nếu có):", "tp_khac"],
    ]),
    P("**4. Người có đất thu hồi:** {ho_ten}{ho_cung_ten}; địa chỉ: {dia_chi}.", { dam: false }),
    P("**II. NỘI DUNG ĐỐI THOẠI**"),
    P("1. Ý kiến không đồng ý của người có đất về phương án: {y_kien_khong_dong_y}"),
    P("2. Giải thích, giải trình, tiếp thu của {ten_don_vi_bt} và Ủy ban nhân dân {ten_xa}: {giai_trinh}"),
    P("3. Ý kiến của người có đất sau khi được giải thích, giải trình: {y_kien_sau}"),
    P("**III. KẾT QUẢ**"),
    P("{ket_qua_doi_thoai}"),
    P("Biên bản kết thúc vào hồi {gio_ket_thuc} cùng ngày, các thành phần tham gia đã đọc, nhất trí với các nội dung trên đây và ký tên dưới đây./."),
    kyBienBan([
      "ĐƠN VỊ, TỔ CHỨC THỰC HIỆN NHIỆM VỤ\nBỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ",
      "ĐẠI DIỆN UBND {TEN_XA}",
      "CÁC THÀNH PHẦN KHÁC (NẾU CÓ)",
      "NGƯỜI CÓ ĐẤT THU HỒI",
    ]),
  ],
];

/**
 * 1.0.7 — Biên bản bốc thăm lô đất ở, căn nhà ở tái định cư: Luật Đất đai 2024 và các nghị định hướng dẫn không ban hành
 * mẫu; bố cục theo các biên bản của Sổ tay. Nguyên tắc, trình tự bốc thăm do người dùng ghi theo quy chế/phương án được
 * duyệt. Biểu 01 (lô, căn đưa vào bốc thăm) và Biểu 02 (kết quả) lấy từ Quỹ tái định cư; chưa ghi kết quả thì để trống
 * cột thứ tự, lô bốc được để ghi tay tại buổi bốc thăm.
 */
MAU.T13 = () => [
  [
    ...quocHieu({ ngay: true }),
    ...tenVanBan("BIÊN BẢN", "Bốc thăm vị trí lô đất ở, căn nhà ở tái định cư\ndự án {ten_du_an}"),
    P("Căn cứ Quyết định số {qd_tdc_so} ngày {qd_tdc_ngay} của {qd_tdc_co_quan} phê duyệt phương án bố trí tái định cư dự án {ten_du_an};", { nghieng: true, truoc: 120 }),
    P("Căn cứ {quy_che_boc_tham};", { nghieng: true }),
    P("Hôm nay, vào hồi {thoi_diem}, tại {dia_diem_lam_viec}, {ten_don_vi_bt} phối hợp với Ủy ban nhân dân {ten_xa} tổ chức bốc thăm vị trí lô đất ở, căn nhà ở tái định cư cho hộ gia đình, cá nhân được bố trí tái định cư, gồm:"),
    P("**I. THÀNH PHẦN THAM GIA**"),
    ...thanhPhan([
      ["Đại diện đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư:", "tp_don_vi_bt"],
      ["Đại diện Ủy ban nhân dân {ten_xa}:", "tp_ubnd"],
      ["Các thành phần khác có liên quan (nếu có):", "tp_khac"],
    ]),
    P("**4. Hộ gia đình, cá nhân được bố trí tái định cư:** {so_ho_boc_chu} hộ, danh sách tại Biểu số 02 kèm theo.", { dam: false }),
    P("**II. NỘI DUNG**"),
    P("1. Quỹ lô đất ở, căn nhà ở đưa vào bốc thăm: {so_lo_boc} lô/căn tại {tdc_khu_boc}; chi tiết tại Biểu số 01 kèm theo."),
    P("2. Nguyên tắc, trình tự bốc thăm: {nguyen_tac_boc_tham}"),
    P("3. Kết quả bốc thăm: chi tiết tại Biểu số 02 kèm theo (thứ tự bốc thăm, lô/căn bốc được); người bốc thăm ký xác nhận vào biểu."),
    P("4. Ý kiến của các hộ gia đình, cá nhân tham gia bốc thăm: {y_kien}"),
    P("Biên bản kết thúc vào hồi {gio_ket_thuc} cùng ngày, các thành phần tham gia đã đọc, nhất trí với các nội dung trên đây và ký tên dưới đây./."),
    kyBienBan([
      "ĐƠN VỊ, TỔ CHỨC THỰC HIỆN NHIỆM VỤ\nBỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ",
      "ĐẠI DIỆN UBND {TEN_XA}",
      "CÁC THÀNH PHẦN KHÁC (NẾU CÓ)",
      "ĐẠI DIỆN CÁC HỘ THAM GIA\n(có danh sách ký tại Biểu số 02)",
    ]),
  ],
  [
    ...TIEU_DE_BIEU("Biểu số 01. LÔ ĐẤT Ở, CĂN NHÀ Ở ĐƯA VÀO BỐC THĂM", "Biên bản bốc thăm ngày {ngay_ky_ngan}"),
    bieu("ds_lo_boc", [
      { tieuDe: "STT", truong: "{stt}", rong: 5 },
      { tieuDe: "Khu, điểm tái định cư", truong: "{khu}", rong: 24, canh: AlignmentType.LEFT },
      { tieuDe: "Lô / căn số", truong: "{so_lo}", rong: 10 },
      { tieuDe: "Loại", truong: "{loai}", rong: 9 },
      { tieuDe: "Diện tích (m²)", truong: "{dien_tich}", rong: 11, canh: AlignmentType.RIGHT },
      { tieuDe: "Giá đất / giá nhà TĐC (đồng/m²)", truong: "{gia}", rong: 14, canh: AlignmentType.RIGHT },
      { tieuDe: "Căn cứ giá", truong: "{can_cu_gia}", rong: 27, canh: AlignmentType.LEFT },
    ]),
    new Paragraph({ children: [], pageBreakBefore: true }),
    ...TIEU_DE_BIEU("Biểu số 02. KẾT QUẢ BỐC THĂM", "Biên bản bốc thăm ngày {ngay_ky_ngan}"),
    bieu("ds_ket_qua_boc", [
      { tieuDe: "STT", truong: "{stt}", rong: 5 },
      { tieuDe: "Họ và tên", truong: "{ho_ten}", rong: 18, canh: AlignmentType.LEFT },
      { tieuDe: "Địa chỉ", truong: "{dia_chi}", rong: 16, canh: AlignmentType.LEFT },
      { tieuDe: "Hình thức bố trí", truong: "{hinh_thuc}", rong: 10 },
      { tieuDe: "Thứ tự bốc thăm", truong: "{thu_tu}", rong: 8 },
      { tieuDe: "Lô / căn bốc được (khu – lô)", truong: "{lo}", rong: 18, canh: AlignmentType.LEFT },
      { tieuDe: "Diện tích (m²)", truong: "{dien_tich}", rong: 9, canh: AlignmentType.RIGHT },
      { tieuDe: "Người bốc thăm ký, ghi rõ họ tên", truong: "", rong: 16 },
    ]),
  ],
];


/**
 * 1.0.21 (B2) — Văn bản khiếu nại, cưỡng chế của hộ: số liệu lấy từ thẻ Khiếu nại của hồ sơ hộ (khieu-nai.ts, cuong-che.ts).
 * T14 theo Mẫu số 15 Phụ lục NĐ 124/2020/NĐ-CP (NĐ 155/2026/NĐ-CP không thay mẫu này — Điều 20); T15–T17: Luật Đất đai 2024
 * không ban hành mẫu — bố cục theo biên bản, quyết định của Sổ tay; câu chữ nghĩa vụ trích nguyên văn khoản 7 Điều 87, Điều 89.
 * Kết luận, biện pháp, lực lượng, kinh phí do cán bộ ghi — phần mềm không tự đặt.
 */
const BANG_THUA_HO = () =>
  bangLap("thua", [
    { tieuDe: "STT", truong: "stt", rong: 6 },
    { tieuDe: "Tờ bản đồ số", truong: "so_to", rong: 10 },
    { tieuDe: "Thửa đất số", truong: "so_thua", rong: 10 },
    { tieuDe: "Loại đất", truong: "loai_dat", rong: 30, canh: AlignmentType.LEFT },
    { tieuDe: "DT thửa (m²)", truong: "dien_tich", rong: 12, canh: AlignmentType.RIGHT },
    { tieuDe: "DT thu hồi (m²)", truong: "dt_thu_hoi", rong: 12, canh: AlignmentType.RIGHT },
  ]);
const CC_QD_THU_HOI = () => P("Căn cứ Quyết định số {qd_thu_hoi_so} ngày {qd_thu_hoi_ngay} về việc thu hồi đất đối với {doi_tuong_goi} {ho_ten} để thực hiện dự án {ten_du_an};", { nghieng: true });
const CC_QD_CUONG_CHE = () => P("Căn cứ Quyết định số {cc_so_qd} ngày {cc_ngay_qd} về việc cưỡng chế thực hiện quyết định thu hồi đất đối với {doi_tuong_goi} {ho_ten};", { nghieng: true });

MAU.T14 = () => [
  [
    dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/QĐ-UBND" }),
    ...tenVanBan("QUYẾT ĐỊNH", "Về việc giải quyết khiếu nại của {kn_nguoi_khieu_nai}\n(lần đầu)"),
    giua("{CHUC_DANH_GQKN}", { dam: true, truoc: 120 }),
    ...lap("kn_can_cu", "{.}", { nghieng: true, sau: 60 }),
    P("Xét đơn khiếu nại {kn_ngay_don} của {kn_nguoi_khieu_nai} (địa chỉ: {dia_chi}) khiếu nại {kn_doi_tuong}.", { nghieng: true }),
    P("Theo báo cáo của {kn_tham_muu} tại Văn bản số {kn_bc_so} ngày {kn_bc_ngay} về việc giải quyết khiếu nại của {kn_nguoi_khieu_nai} với các nội dung sau đây:"),
    P("**I. Nội dung khiếu nại:**"),
    P("{kn_noi_dung}"),
    P("**II. Kết quả xác minh nội dung khiếu nại:**"),
    P("{kn_xac_minh}"),
    P("**III. Kết quả đối thoại (nếu có):**"),
    P("{kn_doi_thoai}"),
    P("**IV. Kết luận**"),
    P("{kn_ket_luan}"),
    P("Từ những nhận định và căn cứ trên,"),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** {kn_dieu_1}"),
    P("**Điều 2.** {kn_dieu_2}"),
    P("**Điều 3.** Trong thời hạn {kn_so_ngay_lan_hai} ngày, kể từ ngày nhận được Quyết định này, nếu {kn_nguoi_khieu_nai} không đồng ý với giải quyết khiếu nại của {chuc_danh_gqkn} thì {kn_nguoi_khieu_nai} có quyền khiếu nại đến {kn_nguoi_gq_lan_hai} hoặc khởi kiện vụ án hành chính tại Tòa án theo quy định của pháp luật về tố tụng hành chính."),
    P("**Điều 4.** {kn_thi_hanh} chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan(),
  ],
];

MAU.T15 = () => [
  [
    ...quocHieu({ ngay: true }),
    ...tenVanBan("BIÊN BẢN", "Vận động, thuyết phục bàn giao đất bị thu hồi\nđể thực hiện dự án {ten_du_an}"),
    P("Căn cứ điểm a, điểm b khoản 7 Điều 87 Luật Đất đai năm 2024;", { nghieng: true, truoc: 120 }),
    CC_QD_THU_HOI(),
    P("Hôm nay, vào hồi {thoi_diem}, tại {dia_diem_lam_viec}, Ủy ban nhân dân {ten_xa} chủ trì, phối hợp với Ủy ban Mặt trận Tổ quốc Việt Nam {ten_xa} và {ten_don_vi_bt} tổ chức vận động, thuyết phục người có đất thu hồi bàn giao đất, gồm:"),
    P("**I. THÀNH PHẦN**"),
    ...thanhPhan([
      ["Đại diện Ủy ban nhân dân {ten_xa}:", "tp_ubnd"],
      ["Đại diện Ủy ban Mặt trận Tổ quốc Việt Nam {ten_xa}:", "tp_mttq"],
      ["Đại diện đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư:", "tp_don_vi_bt"],
      ["Thành phần khác (nếu có):", "tp_khac"],
    ]),
    P("**5. Người có đất thu hồi:** {ho_ten}{ho_cung_ten}; địa chỉ: {dia_chi}.", { dam: false }),
    P("**II. NỘI DUNG**"),
    P("1. Đất bị thu hồi chưa bàn giao: {thua_mo_ta}; tổng diện tích thu hồi {dt_thu_hoi} m² (chi tiết tại bảng dưới)."),
    BANG_THUA_HO(),
    P("2. Thời gian tổ chức vận động, thuyết phục: từ ngày {cc_van_dong_tu} đến ngày {cc_van_dong_den} (điểm b khoản 7 Điều 87: việc tổ chức vận động, thuyết phục được tiến hành trong thời gian 10 ngày và phải được thể hiện bằng văn bản).", { truoc: 120 }),
    P("3. Nội dung tuyên truyền, vận động, giải thích: {noi_dung_van_dong}"),
    P("4. Ý kiến của người có đất thu hồi: {y_kien}"),
    P("**III. KẾT QUẢ**"),
    P("{ket_qua_van_dong}"),
    P("Biên bản kết thúc vào hồi {gio_ket_thuc} cùng ngày, đã đọc lại cho các thành phần tham gia cùng nghe và ký tên dưới đây./."),
    kyBienBan([
      "ĐẠI DIỆN UBND {TEN_XA}",
      "ĐẠI DIỆN ỦY BAN MTTQ VIỆT NAM {TEN_XA}",
      "ĐƠN VỊ, TỔ CHỨC THỰC HIỆN NHIỆM VỤ\nBỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ",
      "NGƯỜI CÓ ĐẤT THU HỒI",
    ]),
  ],
];

MAU.T16 = () => [
  [
    dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/QĐ-UBND" }),
    ...tenVanBan("QUYẾT ĐỊNH", "Về việc thành lập Ban cưỡng chế thu hồi đất đối với {doi_tuong_goi} {ho_ten}\nđể thực hiện dự án {ten_du_an}"),
    giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
    ...CAN_CU(),
    CC_QD_THU_HOI(),
    CC_QD_CUONG_CHE(),
    P("Xét đề nghị của {chuc_danh_de_nghi}.", { nghieng: true }),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** Thành lập Ban cưỡng chế thu hồi đất để tổ chức thực hiện Quyết định số {cc_so_qd} ngày {cc_ngay_qd} về việc cưỡng chế thực hiện quyết định thu hồi đất đối với {doi_tuong_goi} {ho_ten}, địa chỉ: {dia_chi}, gồm các ông (bà) có tên sau:"),
    ...lap("thanh_vien_ban", "- {.}", { thut: 0, trai: 567, sau: 40 }),
    P("**Điều 2.** Ban cưỡng chế thu hồi đất có nhiệm vụ:", { truoc: 120 }),
    P("1. Vận động, thuyết phục, đối thoại với người bị cưỡng chế; nếu người bị cưỡng chế chấp hành thì lập biên bản ghi nhận sự chấp hành. Việc bàn giao đất được thực hiện chậm nhất là 30 ngày kể từ ngày lập biên bản. Trường hợp người bị cưỡng chế không chấp hành quyết định cưỡng chế thì tổ chức thực hiện cưỡng chế (điểm b khoản 4 Điều 89 Luật Đất đai năm 2024)."),
    P("2. Chủ trì lập phương án cưỡng chế và dự toán kinh phí cho hoạt động cưỡng chế trình phê duyệt; bàn giao đất cho đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư (điểm b khoản 5 Điều 89 Luật Đất đai năm 2024)."),
    P("3. Thực hiện các quyền, trách nhiệm quy định tại điểm c, điểm d khoản 4 Điều 89 Luật Đất đai năm 2024; mời đại diện Ủy ban Mặt trận Tổ quốc Việt Nam tham gia giám sát việc cưỡng chế thu hồi đất."),
    P("{nhiem_vu_khac}"),
    P("**Điều 3.** Quyết định có hiệu lực kể từ ngày {ngay_hieu_luc}. {co_quan_thi_hanh}, các ông (bà) có tên tại Điều 1 và {doi_tuong_goi} {ho_ten} chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan(),
  ],
];

MAU.T17 = () => [
  [
    dauVanBan({ coQuan: ["ỦY BAN NHÂN DÂN {TEN_XA}", "BAN CƯỠNG CHẾ THU HỒI ĐẤT"], so: "Số: {so}/PA-BCC" }),
    ...tenVanBan("PHƯƠNG ÁN", "Cưỡng chế thực hiện quyết định thu hồi đất đối với {doi_tuong_goi} {ho_ten}\nđể thực hiện dự án {ten_du_an}"),
    P("**I. CĂN CỨ**", { truoc: 120 }),
    ...CAN_CU(),
    P("Căn cứ Điều 89 Luật Đất đai năm 2024;", { nghieng: true }),
    CC_QD_THU_HOI(),
    CC_QD_CUONG_CHE(),
    P("Căn cứ Quyết định số {cc_qd_ban} về việc thành lập Ban cưỡng chế thu hồi đất;", { nghieng: true }),
    P("**II. ĐỐI TƯỢNG, ĐỊA ĐIỂM CƯỠNG CHẾ**"),
    P("1. Người bị cưỡng chế: {ho_ten}{ho_cung_ten}; địa chỉ: {dia_chi}."),
    P("2. Đất bị cưỡng chế: {thua_mo_ta}; tổng diện tích {dt_thu_hoi} m², chi tiết:"),
    BANG_THUA_HO(),
    P("3. Tài sản trên đất (nếu có) và phương án di chuyển, bảo quản tài sản: {xu_ly_tai_san}", { truoc: 120 }),
    P("**III. THỜI GIAN CƯỠNG CHẾ**"),
    P("Thời gian dự kiến bắt đầu: {cc_ngay_du_kien}. Thời điểm bắt đầu tiến hành cưỡng chế được thực hiện trong giờ hành chính; không thực hiện cưỡng chế trong thời gian từ 10 giờ đêm ngày hôm trước đến 06 giờ sáng ngày hôm sau; các ngày nghỉ, ngày lễ theo quy định của pháp luật, ngày lễ theo truyền thống của đồng bào dân tộc; trong thời gian 15 ngày trước và sau thời gian nghỉ Tết Âm lịch và các trường hợp đặc biệt khác (điểm b khoản 1 Điều 89 Luật Đất đai năm 2024)."),
    P("**IV. LỰC LƯỢNG, PHÂN CÔNG NHIỆM VỤ**"),
    P("{luc_luong}"),
    P("**V. TRÌNH TỰ THỰC HIỆN**"),
    P("{trinh_tu}"),
    P("**VI. DỰ TOÁN KINH PHÍ**"),
    P("Kinh phí cưỡng chế thu hồi đất do ngân sách nhà nước bảo đảm, được lập thành một khoản trong kinh phí bồi thường, hỗ trợ, tái định cư (khoản 6 Điều 89 Luật Đất đai năm 2024). Căn cứ lập dự toán: {can_cu_du_toan}."),
    bangLap("ds_du_toan", [
      { tieuDe: "STT", truong: "stt", rong: 7 },
      { tieuDe: "Nội dung chi", truong: "noi_dung", rong: 63, canh: AlignmentType.LEFT },
      { tieuDe: "Số tiền (đồng)", truong: "so_tien", rong: 30, canh: AlignmentType.RIGHT, tong: "tong_du_toan" },
    ]),
    P("Tổng dự toán: {tong_du_toan} đồng (Bằng chữ: {tong_du_toan_chu}).", { truoc: 120 }),
    P("Ban cưỡng chế thu hồi đất kính trình Chủ tịch Ủy ban nhân dân {ten_xa} xem xét, phê duyệt (điểm b khoản 5 Điều 89 Luật Đất đai năm 2024)./."),
    kyVanBan({ quyenHan: "TRƯỞNG BAN" }),
  ],
];


/**
 * 1.0.21 (A2) — Mẫu thủ tục khiếu nại theo Phụ lục NĐ 155/2026/NĐ-CP (thay Mẫu 03, 04, 14 và bổ sung 14a, 14b của NĐ 124/2020):
 * T18 Thông báo thụ lý (Mẫu 03), T19 Thông báo không thụ lý (Mẫu 04), T20 Biên bản đối thoại (Mẫu 14), T21 QĐ tạm đình chỉ/đình
 * chỉ (Mẫu 14a), T22 QĐ tiếp tục giải quyết (Mẫu 14b). Giữ nguyên câu chữ mẫu; phần "…" là trường tự điền từ đơn hoặc cán bộ nhập.
 */
const KN_DAU = (kyHieu) => dauVanBan({ coQuan: UBND_XA, so: `Số: {so}/${kyHieu}` });
const KN_NGUOI = () => [
  P("Địa chỉ: {dia_chi}"),
  P("Số căn cước/định danh cá nhân/giấy chứng nhận căn cước/hộ chiếu: {so_dinh_danh}, ngày cấp: {kn_ngay_cap_giay_to}, nơi cấp: {kn_noi_cap_giay_to}"),
];
MAU.T18 = () => [
  [
    KN_DAU("TB-UBND"),
    ...tenVanBan("THÔNG BÁO", "Về việc thụ lý giải quyết khiếu nại {kn_lan_chu}"),
    giua("Kính gửi: {kn_nguoi_khieu_nai}.", { truoc: 120 }),
    P("Ngày {kn_ngay_nhan_ngan}, Ủy ban nhân dân {ten_xa} đã nhận được đơn khiếu nại của {kn_nguoi_khieu_nai}:"),
    ...KN_NGUOI(),
    P("Khiếu nại về việc: {kn_noi_dung}."),
    P("Sau khi xem xét nội dung đơn khiếu nại của {kn_nguoi_khieu_nai}, căn cứ quy định của pháp luật về khiếu nại, Ủy ban nhân dân {ten_xa} nhận thấy đơn khiếu nại của {kn_nguoi_khieu_nai} đủ điều kiện thụ lý."),
    P("Vậy thông báo để {kn_nguoi_khieu_nai} được biết./."),
    kyVanBan(),
  ],
];
MAU.T19 = () => [
  [
    KN_DAU("TB-UBND"),
    ...tenVanBan("THÔNG BÁO", "Về việc không thụ lý giải quyết khiếu nại"),
    giua("Kính gửi: {kn_nguoi_khieu_nai}.", { truoc: 120 }),
    P("Ngày {kn_ngay_nhan_ngan}, Ủy ban nhân dân {ten_xa} đã nhận được đơn khiếu nại của {kn_nguoi_khieu_nai}"),
    ...KN_NGUOI(),
    P("Khiếu nại về việc: {kn_noi_dung}."),
    P("Sau khi xem xét nội dung đơn khiếu nại, căn cứ Điều 11 của Luật Khiếu nại, Ủy ban nhân dân {ten_xa} nhận thấy, đơn khiếu nại của {kn_nguoi_khieu_nai} không đủ điều kiện để thụ lý giải quyết vì {kn_ly_do_khong_thu_ly}."),
    P("Vậy thông báo để {kn_nguoi_khieu_nai} được biết."),
    kyVanBan(),
  ],
];
MAU.T20 = () => [
  [
    dauVanBan({ coQuan: UBND_XA, so: "", ngay: false }),
    ...tenVanBan("BIÊN BẢN ĐỐI THOẠI VỚI NGƯỜI KHIẾU NẠI"),
    P("Vào hồi {thoi_diem}, tại {dia_diem_lam_viec}", { truoc: 120 }),
    P("**I. THÀNH PHẦN THAM GIA ĐỐI THOẠI**"),
    P("1. Người giải quyết khiếu nại, người được phân công chủ trì đối thoại: {tp_chu_tri}"),
    P("2. Người ghi biên bản: {tp_ghi_bien_ban}"),
    P("3. Người khiếu nại (hoặc người đại diện, người được ủy quyền của người khiếu nại): {kn_nguoi_khieu_nai}"),
    ...KN_NGUOI(),
    P("{kn_vang_doi_thoai}", { nghieng: true }),
    P("4. Người bị khiếu nại (hoặc người đại diện, người được ủy quyền khiếu nại của người bị khiếu nại (nếu có)): {tp_bi_khieu_nai}"),
    P("5. Người có quyền, nghĩa vụ liên quan (nếu có): {tp_quyen_nghia_vu}"),
    P("6. Đại diện cơ quan, tổ chức, cá nhân có liên quan (nếu có): {tp_khac}"),
    P("**II. NỘI DUNG ĐỐI THOẠI**"),
    P("1. Người giải quyết khiếu nại hoặc người được phân công chủ trì đối thoại nêu mục đích, yêu cầu của việc đối thoại, tóm tắt kết quả xác minh nội dung khiếu nại và những nội dung đối thoại: {noi_dung_doi_thoai}"),
    P("2. Ý kiến của những người tham gia đối thoại về từng nội dung đối thoại: {y_kien}"),
    P("**III. KẾT QUẢ ĐỐI THOẠI**"),
    P("{ket_qua_doi_thoai}"),
    P("Buổi đối thoại kết thúc hồi {gio_ket_thuc}."),
    P("Biên bản đối thoại đã được đọc lại cho những người tham gia đối thoại nghe và ký xác nhận (trường hợp người tham gia đối thoại không ký xác nhận thì phải ghi rõ lý do)."),
    P("Biên bản được lập thành {so_ban} bản; {nguoi_nhan_bien_ban} mỗi người nhận 01 bản./."),
    kyBienBan([
      "NGƯỜI BỊ KHIẾU NẠI",
      "NGƯỜI GIẢI QUYẾT KHIẾU NẠI\n(HOẶC NGƯỜI ĐƯỢC PHÂN CÔNG\nCHỦ TRÌ ĐỐI THOẠI)",
      "NGƯỜI KHIẾU NẠI\n(HOẶC NGƯỜI ĐẠI DIỆN,\nNGƯỜI ĐƯỢC ỦY QUYỀN)",
      "ĐẠI DIỆN CƠ QUAN, TỔ CHỨC,\nCÁ NHÂN CÓ LIÊN QUAN",
      "NGƯỜI CÓ QUYỀN VÀ\nNGHĨA VỤ LIÊN QUAN",
      "NGƯỜI GHI BIÊN BẢN",
    ]),
  ],
];
MAU.T21 = () => [
  [
    KN_DAU("QĐ-UBND"),
    ...tenVanBan("QUYẾT ĐỊNH", "Về việc {kn_loai_dinh_chi} giải quyết khiếu nại"),
    giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
    ...lap("kn_can_cu_dinh_chi", "{.}", { nghieng: true, sau: 60 }),
    P("Theo đề nghị của {chuc_danh_de_nghi}.", { nghieng: true }),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** {kn_dieu_1_dinh_chi}"),
    P("Lý do: {kn_ly_do_dinh_chi}"),
    P("**Điều 2.** Quyết định này có hiệu lực thi hành kể từ ngày ký."),
    P("**Điều 3.** {kn_thi_hanh_dinh_chi} chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan(),
  ],
];
MAU.T22 = () => [
  [
    KN_DAU("QĐ-UBND"),
    ...tenVanBan("QUYẾT ĐỊNH", "Về việc tiếp tục giải quyết khiếu nại"),
    giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
    ...lap("kn_can_cu_tiep_tuc", "{.}", { nghieng: true, sau: 60 }),
    P("Theo đề nghị của {chuc_danh_de_nghi}.", { nghieng: true }),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** {kn_dieu_1_tiep_tuc}"),
    P("**Điều 2.** Quyết định này có hiệu lực thi hành kể từ ngày ký."),
    P("**Điều 3.** {kn_thi_hanh_dinh_chi} chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan(),
  ],
];


/**
 * 1.0.21 (B2) — Mẫu số 06 Phụ lục NĐ 102/2024/NĐ-CP "Biên bản bàn giao đất trên thực địa": bàn giao khu đất cho người được giao
 * đất, cho thuê đất (thường là chủ đầu tư) theo quyết định giao đất/cho thuê đất — sau khi đã thu hồi, giải phóng mặt bằng.
 */
MAU.T23 = () => [
  [
    ...quocHieu(),
    ...tenVanBan("BIÊN BẢN", "Bàn giao đất trên thực địa"),
    P("Thực hiện Quyết định số {qd_giao_dat_so} ngày {qd_giao_dat_ngay} của {co_quan_giao_dat} về việc {loai_giao_dat}, hôm nay ngày {ngay} tháng {thang} năm {nam}, tại {dia_diem_lam_viec}, thành phần gồm:", { truoc: 120 }),
    P("**I. ĐẠI DIỆN {CO_QUAN_BAN_GIAO}**"),
    P("{tp_co_quan}", { trai: 567, thut: 0, canh: AlignmentType.LEFT }),
    P("**II. ĐẠI DIỆN ỦY BAN NHÂN DÂN {TEN_XA}**"),
    P("{tp_ubnd}", { trai: 567, thut: 0, canh: AlignmentType.LEFT }),
    P("**III. BÊN NHẬN BÀN GIAO ĐẤT**"),
    P("{ben_nhan}: {tp_ben_nhan}", { trai: 567, thut: 0, canh: AlignmentType.LEFT }),
    P("**IV. CÁC BÊN TIẾN HÀNH BÀN GIAO ĐẤT TRÊN THỰC ĐỊA, CỤ THỂ NHƯ SAU:**"),
    P("1. Giao nhận trên thực địa đối với {thua_khu_dat} tại {dia_diem_khu_dat} cho {ben_nhan} đã được {loai_giao_dat} theo Quyết định số {qd_giao_dat_so} ngày {qd_giao_dat_ngay} của {co_quan_giao_dat};"),
    P("2. Giao nhận thửa đất/khu đất nêu tại mục 1 phần này theo các mốc giới, ranh giới thửa đất/khu đất, diện tích {dien_tich_giao} m² trên thực địa xác định theo {trich_do}, gồm:"),
    ...lap("moc_gioi", "- {.};", { trai: 567, thut: 0 }),
    P("3. Biên bản được lập hồi {gio_ket_thuc} cùng ngày, đã đọc cho các bên tham dự cùng nghe, nhất trí thông qua ký tên dưới đây."),
    P("Biên bản này lập thành {so_ban} bản có giá trị như nhau, gửi {noi_gui}./."),
    kyBienBan(["ĐẠI DIỆN {CO_QUAN_BAN_GIAO}", "ĐẠI DIỆN UBND {TEN_XA}", "BÊN NHẬN BÀN GIAO ĐẤT"], "(Ký và ghi rõ họ tên, đóng dấu)"),
  ],
];


/**
 * 1.1.0 (A2, A3) — T24 Thông báo tổ chức đối thoại (khoản 1 Điều 28 NĐ 124/2020 sửa bởi NĐ 155/2026: gửi trước ngày đối thoại ít
 * nhất 05 ngày, ghi rõ thời gian, địa điểm, nội dung — nghị định không ban hành mẫu, bố cục thông báo theo NĐ 30/2020);
 * T25 Quyết định giải quyết khiếu nại lần hai (Mẫu số 16 Phụ lục NĐ 124/2020).
 */
MAU.T24 = () => [
  [
    KN_DAU("TB-UBND"),
    ...tenVanBan("THÔNG BÁO", "Về việc tổ chức đối thoại giải quyết khiếu nại {kn_lan_chu}"),
    giua("Kính gửi: {kn_nguoi_nhan_tb}.", { truoc: 120 }),
    P("Căn cứ Luật Khiếu nại ngày 11 tháng 11 năm 2011 và các văn bản sửa đổi, bổ sung; khoản 1 Điều 28 Nghị định số 124/2020/NĐ-CP được sửa đổi, bổ sung bởi Nghị định số 155/2026/NĐ-CP;", { nghieng: true }),
    P("Trong quá trình giải quyết đơn khiếu nại ngày {kn_ngay_nhan_ngan} của {kn_nguoi_khieu_nai} (địa chỉ: {dia_chi}) về việc: {kn_noi_dung}, Ủy ban nhân dân {ten_xa} tổ chức đối thoại như sau:"),
    P("1. Thời gian: {dt_thoi_gian}."),
    P("2. Địa điểm: {dt_dia_diem}."),
    P("3. Nội dung đối thoại: {dt_noi_dung}"),
    P("4. Thành phần: {dt_thanh_phan}"),
    P("Đề nghị người khiếu nại, người bị khiếu nại, người có quyền, nghĩa vụ liên quan, cơ quan, tổ chức có liên quan có mặt đúng thời gian, địa điểm nêu trên. Trường hợp người khiếu nại đã được mời đối thoại nhưng không tham gia mà không có lý do chính đáng thì người giải quyết khiếu nại vẫn tiếp tục giải quyết khiếu nại (khoản 6 Điều 30 Luật Khiếu nại; khoản 5 Điều 28 Nghị định số 124/2020/NĐ-CP được sửa đổi, bổ sung bởi Nghị định số 155/2026/NĐ-CP)./."),
    kyVanBan(),
  ],
];

MAU.T25 = () => [
  [
    dauVanBan({ coQuan: ["{kn2_co_quan_cap_tren}", "{KN2_CO_QUAN}"], so: "Số: {so}/QĐ-{kn2_ky_hieu}" }),
    ...tenVanBan("QUYẾT ĐỊNH", "Về việc giải quyết khiếu nại của {kn_nguoi_khieu_nai}\n(lần hai)"),
    giua("{KN2_CHUC_DANH}", { dam: true, truoc: 120 }),
    ...lap("kn_can_cu", "{.}", { nghieng: true, sau: 60 }),
    P("Xét đơn khiếu nại {kn_ngay_don} của {kn_nguoi_khieu_nai} (địa chỉ: {dia_chi}).", { nghieng: true }),
    P("Theo báo cáo của {kn_tham_muu} tại Văn bản số {kn_bc_so} ngày {kn_bc_ngay} về việc giải quyết khiếu nại của {kn_nguoi_khieu_nai} với các nội dung sau đây:"),
    P("**I. Nội dung khiếu nại:**"),
    P("{kn_noi_dung}"),
    P("**II. Kết quả giải quyết khiếu nại của người đã giải quyết khiếu nại lần đầu:**"),
    P("{kn_kq_lan_dau}"),
    P("**III. Kết quả xác minh nội dung khiếu nại:**"),
    P("{kn_xac_minh}"),
    P("**IV. Kết quả đối thoại:**"),
    P("{kn_doi_thoai}"),
    P("**V. Kết luận:**"),
    P("{kn_ket_luan}"),
    P("Từ những nhận định và căn cứ trên,"),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** {kn_dieu_1}"),
    P("**Điều 2.** {kn_dieu_2}"),
    P("**Điều 3.** Trong thời hạn {kn2_thoi_han_khoi_kien}, kể từ ngày nhận được Quyết định này, nếu {kn_nguoi_khieu_nai} không đồng ý với giải quyết khiếu nại của {kn2_co_quan} thì {kn_nguoi_khieu_nai} có quyền khởi kiện {kn2_co_quan} tại Tòa án theo quy định của pháp luật về tố tụng hành chính."),
    P("**Điều 4.** {kn_thi_hanh} chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan(),
  ],
];


/**
 * 1.2.0 (A2) — T26 Quyết định phê duyệt phương án theo Mẫu số 44 Phụ lục II NĐ 151/2025/NĐ-CP (thẩm quyền Chủ tịch UBND cấp xã —
 * điểm d khoản 1 Điều 5): Điều 1 gồm (1) phương án đối với dự án (khoản 1 Điều 3 NĐ 88/2024), (2) phương án chi tiết đối với từng người
 * có đất thu hồi (khoản 2 Điều 3 NĐ 88/2024) — biểu kèm theo từng người, số tiền lấy từ kết quả tính của hộ.
 */
MAU.T26 = () => [
  [
    dauVanBan({ coQuan: UBND_XA, so: "Số: {so}/QĐ-UBND" }),
    ...tenVanBan("QUYẾT ĐỊNH", "Về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất\nđể thực hiện dự án {ten_du_an}{#co_pham_vi} ({pham_vi_dot}){/co_pham_vi}"),
    giua("CHỦ TỊCH ỦY BAN NHÂN DÂN {TEN_XA}", { dam: true, truoc: 120 }),
    ...CAN_CU(),
    P("Theo đề nghị của {ten_phong} tại Tờ trình số {to_trinh_so} ngày {to_trinh_ngay},", { nghieng: true }),
    giua("QUYẾT ĐỊNH:", { dam: true, truoc: 120 }),
    P("**Điều 1.** Phê duyệt phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất để thực hiện dự án {ten_du_an}{#co_pham_vi} ({pham_vi_dot}){/co_pham_vi}, bao gồm:"),
    P("**1. Phương án bồi thường, hỗ trợ, tái định cư đối với dự án {ten_du_an} theo quy định tại khoản 1 Điều 3 của Nghị định số 88/2024/NĐ-CP ngày 15 tháng 7 năm 2024 của Chính phủ quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất:**"),
    muc("a) Tổng diện tích đất thu hồi: {tong_dt_thu_hoi} m²; số đối tượng có đất thu hồi: {so_doi_tuong_pa}; địa điểm: {dia_diem_du_an};"),
    muc("b) Phương án đào tạo, chuyển đổi nghề và tìm kiếm việc làm: {pa_chuyen_doi_nghe};"),
    muc("c) Phương án bố trí tái định cư: {pa_tai_dinh_cu};"),
    muc("d) Phương án bồi thường bằng đất: {pa_boi_thuong_dat};"),
    muc("đ) Phương án di dời mồ mả: {pa_mo_ma};"),
    muc("e) Phương án di chuyển công trình hạ tầng: {pa_ha_tang};"),
    muc("g) Tổng kinh phí bồi thường, hỗ trợ, tái định cư: {tong_gia_tri} đồng (bằng chữ: {tong_gia_tri_chu}); chi phí bảo đảm cho việc tổ chức thực hiện bồi thường, hỗ trợ, tái định cư: {chi_phi_to_chuc} đồng; chi phí khác: {chi_phi_khac};"),
    muc("h) Tiến độ thực hiện: {tien_do_thuc_hien}."),
    P("**2. Phương án chi tiết bồi thường, hỗ trợ, tái định cư đối với từng người có đất thu hồi, chủ sở hữu tài sản theo quy định tại khoản 2 Điều 3 của Nghị định số 88/2024/NĐ-CP ngày 15 tháng 7 năm 2024 của Chính phủ quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất:** {so_doi_tuong_pa}; tổng kinh phí {tong_gia_tri} đồng (chi tiết tại biểu kèm theo)."),
    P("**3. Các nội dung khác (nếu có):** {noi_dung_khac}"),
    P("**Điều 2.** Nhiệm vụ, trách nhiệm của các bên có liên quan:"),
    P("1. {ten_don_vi_bt} có trách nhiệm phối hợp với chủ đầu tư dự án, {ten_phong} và Ủy ban nhân dân {ten_xa} phổ biến và niêm yết công khai quyết định này; giao quyết định này đến từng người có đất thu hồi, chủ sở hữu tài sản; chi trả tiền bồi thường, hỗ trợ, tái định cư theo phương án được phê duyệt trong thời hạn 30 ngày kể từ ngày quyết định này có hiệu lực."),
    P("2. {trach_nhiem_nguoi_co_dat}"),
    P("**Điều 3.** Quyết định này có hiệu lực kể từ ngày {ngay_hieu_luc}."),
    P("**Điều 4.** {co_quan_thi_hanh} và các tổ chức, cá nhân có tên tại biểu kèm theo chịu trách nhiệm thi hành Quyết định này./."),
    kyVanBan(),
  ],
  [
    ...TIEU_DE_BIEU("PHƯƠNG ÁN CHI TIẾT BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ ĐỐI VỚI TỪNG NGƯỜI CÓ ĐẤT THU HỒI", KT.QD),
    bieu(
      "ds_ho_pa",
      [
        { tieuDe: "STT", truong: "{stt}", rong: 5 },
        { tieuDe: "Họ và tên", truong: "{ho_ten}", rong: 22, canh: AlignmentType.LEFT },
        { tieuDe: "Địa chỉ", truong: "{dia_chi}", rong: 20, canh: AlignmentType.LEFT },
        { tieuDe: "Tờ/thửa", truong: "{to_thua}", rong: 12, canh: AlignmentType.LEFT },
        { tieuDe: "Diện tích thu hồi (m²)", truong: "{dt_thu_hoi}", rong: 11, canh: AlignmentType.RIGHT, tong: "ds_ho_pa_tong_dt" },
        { tieuDe: "Kinh phí bồi thường, hỗ trợ, tái định cư (đồng)", truong: "{tong_tien}", rong: 16, canh: AlignmentType.RIGHT, tong: "ds_ho_pa_tong_tien" },
        { tieuDe: "Ghi chú", truong: "{ghi_chu}", rong: 14, canh: AlignmentType.LEFT },
      ],
      true,
    ),
  ],
];

/**
 * 1.2.0 (B3) — T27 Biên bản cưỡng chế thu hồi đất: ghi nhận sự chấp hành hoặc việc tổ chức thực hiện cưỡng chế (điểm b, c, d khoản 4
 * Điều 89 Luật Đất đai 2024); T28 Biên bản bàn giao bảo quản tài sản (khoản 2 Điều 38 NĐ 102/2024 — nội dung bắt buộc của biên bản).
 * Không có mẫu luật định — bố cục theo NĐ 30/2020, câu chữ nghĩa vụ trích nguyên văn.
 */
MAU.T27 = () => [
  [
    ...quocHieu({ ngay: true }),
    ...tenVanBan("BIÊN BẢN", "Cưỡng chế thực hiện quyết định thu hồi đất\nđối với {doi_tuong_goi} {ho_ten}"),
    P("Căn cứ khoản 4 Điều 89 Luật Đất đai năm 2024;", { nghieng: true, truoc: 120 }),
    CC_QD_THU_HOI(),
    CC_QD_CUONG_CHE(),
    P("Căn cứ Quyết định số {cc_qd_ban} về việc thành lập Ban cưỡng chế thu hồi đất;", { nghieng: true }),
    P("Hôm nay, vào hồi {thoi_diem}, tại {dia_diem_lam_viec}, Ban cưỡng chế thu hồi đất tổ chức thực hiện Quyết định cưỡng chế số {cc_so_qd} ngày {cc_ngay_qd}, gồm:"),
    P("**I. THÀNH PHẦN**"),
    ...thanhPhan([
      ["Ban cưỡng chế thu hồi đất:", "tp_ban"],
      ["Đại diện Ủy ban Mặt trận Tổ quốc Việt Nam (giám sát — điểm d khoản 4 Điều 89):", "tp_mttq"],
      ["Lực lượng bảo vệ trật tự, an toàn (nếu có):", "tp_cong_an"],
      ["Người bị cưỡng chế, người có liên quan:", "tp_nguoi_bi_cc"],
      ["Người chứng kiến:", "tp_chung_kien"],
    ]),
    P("**II. NỘI DUNG**"),
    P("1. Khu đất cưỡng chế: {thua_mo_ta}; diện tích thu hồi {dt_thu_hoi} m² (chi tiết tại bảng dưới)."),
    BANG_THUA_HO(),
    P("2. Kết quả vận động, thuyết phục, đối thoại với người bị cưỡng chế: {ket_qua_van_dong}", { truoc: 120 }),
    P("3. Kết quả: {ket_qua_cc_chu}"),
    P("{dien_bien_cc}"),
    P("4. Tài sản trên đất: {tai_san_tren_dat}"),
    P("5. Ý kiến của người bị cưỡng chế, người có liên quan: {y_kien}"),
    P("Trường hợp người bị cưỡng chế chấp hành: việc bàn giao đất được thực hiện chậm nhất là 30 ngày kể từ ngày lập biên bản này (điểm b khoản 4 Điều 89 Luật Đất đai năm 2024).", { nghieng: true }),
    P("Biên bản kết thúc vào hồi {gio_ket_thuc} cùng ngày, đã đọc lại cho các thành phần tham gia cùng nghe và ký tên dưới đây. Người vắng mặt hoặc từ chối ký: {tu_choi_ky}./."),
    kyBienBan(["TRƯỞNG BAN CƯỠNG CHẾ\nTHU HỒI ĐẤT", "ĐẠI DIỆN ỦY BAN MTTQ VIỆT NAM", "NGƯỜI BỊ CƯỠNG CHẾ", "NGƯỜI CHỨNG KIẾN"]),
  ],
];

MAU.T28 = () => [
  [
    ...quocHieu({ ngay: true }),
    ...tenVanBan("BIÊN BẢN", "Bàn giao bảo quản tài sản khi cưỡng chế thu hồi đất\nđối với {doi_tuong_goi} {ho_ten}"),
    P("Căn cứ điểm c khoản 4, điểm b khoản 5 Điều 89 Luật Đất đai năm 2024; Điều 38 Nghị định số 102/2024/NĐ-CP ngày 30 tháng 7 năm 2024 của Chính phủ;", { nghieng: true, truoc: 120 }),
    CC_QD_CUONG_CHE(),
    P("Hôm nay, vào hồi {thoi_diem}, tại {dia_diem_lam_viec}, Ban cưỡng chế thu hồi đất tiến hành bàn giao bảo quản tài sản của người bị cưỡng chế, gồm:"),
    P("**I. THÀNH PHẦN**"),
    ...thanhPhan([
      ["Người chủ trì thực hiện quyết định cưỡng chế:", "tp_chu_tri"],
      ["Cá nhân, đại diện tổ chức bị cưỡng chế:", "tp_nguoi_bi_cc"],
      ["Người được giao bảo quản tài sản:", "tp_bao_quan"],
      ["Người chứng kiến việc bàn giao:", "tp_chung_kien"],
    ]),
    P("**II. TÀI SẢN BÀN GIAO BẢO QUẢN** (số lượng, tình trạng (chất lượng) tài sản)"),
    ...lap("ds_tai_san_bq", "- {.}", { trai: 567, thut: 0, sau: 40 }),
    P("**III. QUYỀN VÀ NGHĨA VỤ CỦA NGƯỜI ĐƯỢC GIAO BẢO QUẢN TÀI SẢN**", { truoc: 120 }),
    P("{quyen_nghia_vu_bao_quan}"),
    P("Người được giao bảo quản tài sản gây hư hỏng, đánh tráo, làm mất hoặc hủy hoại tài sản thì phải chịu trách nhiệm bồi thường và tùy theo tính chất, mức độ vi phạm sẽ bị xử lý theo quy định của pháp luật (điểm d khoản 2 Điều 38 Nghị định số 102/2024/NĐ-CP). Chi phí bảo quản tài sản (nếu có) do chủ sở hữu chịu trách nhiệm thanh toán và được trừ vào tiền bồi thường, hỗ trợ, tái định cư trước khi chi trả (điểm c khoản 2 Điều 38)."),
    P("**IV. THỜI GIAN BÀN GIAO BẢO QUẢN:** {thoi_gian_bao_quan}"),
    P("Sau khi bàn giao, Ban cưỡng chế thu hồi đất gửi thông báo cho chủ sở hữu tài sản đến nhận tài sản trong thời hạn 60 ngày (khoản 3 Điều 38 Nghị định số 102/2024/NĐ-CP)."),
    P("Biên bản lập thành {so_ban} bản, giao cho người được giao bảo quản tài sản, cá nhân, đại diện tổ chức bị cưỡng chế, người chứng kiến và người chủ trì thực hiện mỗi người giữ 01 bản. Người vắng mặt hoặc từ chối ký: {tu_choi_ky}./."),
    kyBienBan(["TRƯỞNG BAN CƯỠNG CHẾ\nTHU HỒI ĐẤT", "NGƯỜI ĐƯỢC GIAO\nBẢO QUẢN TÀI SẢN", "NGƯỜI BỊ CƯỠNG CHẾ", "NGƯỜI CHỨNG KIẾN"]),
  ],
];

const DANH_SACH = { T1: "tt-ke-hoach", T8: "tt-tb-du-kien-tdc", T9: "tt-tb-cong-bo-tdc", T10: "tt-to-trinh-cham-tra", T11: "tt-qd-cham-tra", T12: "tt-bb-doi-thoai", T13: "tt-bb-boc-tham-tdc", T14: "tt-qd-giai-quyet-kn", T15: "tt-bb-van-dong-ban-giao", T16: "tt-qd-ban-cuong-che", T17: "tt-pa-cuong-che", T18: "tt-tb-thu-ly-kn", T19: "tt-tb-khong-thu-ly-kn", T20: "tt-bb-doi-thoai-kn", T21: "tt-qd-tam-dinh-chi-kn", T22: "tt-qd-tiep-tuc-kn", T23: "tt-bb-ban-giao-dat-thuc-dia", T24: "tt-tb-doi-thoai-kn", T25: "tt-qd-giai-quyet-kn-lan-hai", T26: "tt-qd-pa-mau-44", T27: "tt-bb-cuong-che-thu-hoi", T28: "tt-bb-bao-quan-tai-san", T2: "tt-to-trinh-tb", T3: "tt-thong-bao", T4: "tt-to-trinh-pa-ho", T5: "tt-qd-pa-ho", T6: "tt-to-trinh-thu-hoi", T7: "tt-qd-thu-hoi" };
for (const [ma, tep] of Object.entries(DANH_SACH)) {
  const [chinh, phu] = MAU[ma]();
  const buf = await Packer.toBuffer(taoDoc(chinh, phu));
  writeFileSync(new URL(`${tep}.docx`, RA), buf);
  console.log(`Mẫu ${ma}: ${tep}.docx (${buf.length} byte)`);
}
