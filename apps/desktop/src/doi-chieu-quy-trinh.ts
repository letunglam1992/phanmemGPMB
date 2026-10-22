/**
 * 1.2.0 (A3) — Đối chiếu 16 bước của phần mềm với trình tự tại mục IV Phần II Phụ lục I NĐ 151/2025/NĐ-CP (thu hồi đất vì quốc
 * phòng, an ninh; phát triển kinh tế – xã hội) và Sổ tay QĐ 1966/QĐ-UBND. Mỗi trích dẫn là nguyên văn (kiểm thử
 * `doi-chieu-quy-trinh.test.ts` đối chiếu với policy/nguon). Phần mềm không tự đặt thời hạn: bước nào nghị định không quy định số ngày
 * thì ghi rõ nguồn của thời hạn đang tính (Sổ tay) hoặc không tính.
 */
export type DanhGiaDoiChieu = "KHOP" | "THEO_NGHI_DINH" | "THEO_SO_TAY" | "KHONG_TINH";

export interface DongDoiChieu {
  buoc: string;
  /** Mục của mục IV Phần II Phụ lục I NĐ 151 */
  mucNd151: string;
  /** Nguyên văn (trống = nghị định không có bước này) */
  trichNd151: string;
  soTay?: { muc: string; trich: string };
  /** Thời hạn phần mềm đang tính (hoặc "Không tính hạn") */
  phanMem: string;
  danhGia: DanhGiaDoiChieu;
  ghiChu?: string;
}

export const TEN_DANH_GIA: Record<DanhGiaDoiChieu, string> = {
  KHOP: "Khớp",
  THEO_NGHI_DINH: "Lệch — phần mềm theo nghị định",
  THEO_SO_TAY: "Nghị định không quy định số ngày — phần mềm theo Sổ tay",
  KHONG_TINH: "Không tính hạn",
};

const ND = "mục IV Phần II Phụ lục I NĐ 151/2025/NĐ-CP";

export const DOI_CHIEU_QUY_TRINH: DongDoiChieu[] = [
  {
    buoc: "1", mucNd151: `mục 1 ${ND}`,
    trichNd151: "Đơn vị, tổ chức có trách nhiệm thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư chủ trì, phối hợp với các cơ quan có liên quan xem xét các căn cứ, điều kiện thu hồi đất quy định tại Điều 80 Luật Đất đai để xây dựng kế hoạch thu hồi đất.",
    phanMem: "Không tính hạn (ghi ngày ở bước chung)", danhGia: "KHONG_TINH",
  },
  {
    buoc: "2", mucNd151: `mục 2 ${ND}`,
    trichNd151: "Ủy ban nhân dân cấp xã nơi có đất thu hồi chủ trì phối hợp với Ủy ban Mặt trận Tổ quốc Việt Nam cùng cấp",
    soTay: { muc: "khoản 4 Mục V Phần II Sổ tay", trich: "Trong thời hạn không quá 03 ngày, kể từ khi Kế hoạch thu hồi đất, điều tra, khảo sát, đo đạc kiểm đếm được phê duyệt" },
    phanMem: "Không tính hạn", danhGia: "KHONG_TINH", ghiChu: "Sổ tay có hạn 03 ngày tổ chức họp sau khi phê duyệt kế hoạch — phần mềm chưa nhắc.",
  },
  {
    buoc: "3", mucNd151: `mục 3 ${ND}`,
    trichNd151: "Chủ tịch Ủy ban nhân dân cấp xã ban hành thông báo thu hồi đất",
    soTay: { muc: "khoản 2 Mục V Phần II Sổ tay", trich: "Trong thời hạn không quá 02 ngày kể từ ngày nhận được tờ trình của phòng chuyên môn, Chủ tịch UBND cấp xã ban hành thông báo thu hồi đất." },
    phanMem: "Thông báo trước ít nhất 90 ngày (đất nông nghiệp) / 180 ngày (đất phi nông nghiệp) trước khi có quyết định thu hồi (Điều 85 Luật Đất đai)", danhGia: "KHOP",
    ghiChu: "Hạn 02 ngày ban hành thông báo của Sổ tay — phần mềm chưa nhắc.",
  },
  {
    buoc: "4", mucNd151: `điểm c mục 4 ${ND}`,
    trichNd151: "Việc tổ chức vận động, thuyết phục được tiến hành trong thời gian 15 ngày và phải được thể hiện bằng văn bản.",
    soTay: { muc: "Mục VII Phần II Sổ tay", trich: "Trong thời gian 03 (ba) ngày làm việc kể từ ngày nhận được văn bản đề nghị kiểm đếm bắt buộc" },
    phanMem: "Đối chiếu điều kiện cưỡng chế kiểm đếm (Điều 88 Luật Đất đai); vận động trước QĐ kiểm đếm bắt buộc (15 ngày, quá 10 ngày mới ban hành) chưa tính hạn", danhGia: "KHONG_TINH",
    ghiChu: "Khớp với điểm d khoản 2 Điều 87 Luật Đất đai; Ban cưỡng chế kiểm đếm vận động 05 ngày làm việc (khoản 2 Điều 36 NĐ 102/2024) đã nhắc ở hồ sơ cưỡng chế.",
  },
  { buoc: "5", mucNd151: `mục 5 ${ND}`, trichNd151: "Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư có trách nhiệm lập phương án bồi thường, hỗ trợ, tái định cư.", phanMem: "Không tính hạn", danhGia: "KHONG_TINH" },
  {
    buoc: "6", mucNd151: `mục 6 ${ND}`,
    trichNd151: "nơi có đất thu hồi trong thời hạn 30 ngày.",
    phanMem: "Niêm yết 30 ngày", danhGia: "KHOP",
  },
  {
    buoc: "7", mucNd151: `mục 7 ${ND}`,
    trichNd151: "Trong thời hạn 60 ngày kể từ ngày tổ chức lấy ý kiến, đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư có trách nhiệm phối hợp với Ủy ban nhân dân cấp xã nơi có đất thu hồi tổ chức đối thoại",
    phanMem: "Đối thoại trong 60 ngày kể từ ngày lấy ý kiến", danhGia: "KHOP",
  },
  {
    buoc: "8", mucNd151: `điểm a mục 8 ${ND}`,
    trichNd151: "Trong thời hạn không quá 30 ngày kể từ ngày nhận đủ hồ sơ của đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư gửi đến, cơ quan có chức năng quản lý đất đai cấp xã chủ trì",
    soTay: { muc: "điểm a khoản 2 Mục XII Phần II Sổ tay", trich: "Trong thời hạn không quá 30 (ba mươi) ngày làm việc kể từ ngày nhận" },
    phanMem: "≤ 30 ngày (khoản 3 Điều 3 NĐ 88/2024)", danhGia: "THEO_NGHI_DINH",
    ghiChu: "Sổ tay ghi 30 ngày làm việc; nghị định ghi 30 ngày — văn bản cấp tỉnh không kéo dài thời hạn của nghị định (QD-38, QD-39).",
  },
  {
    buoc: "9", mucNd151: `mục 9 ${ND}`,
    trichNd151: "Cơ quan có chức năng quản lý đất đai cấp xã trình Chủ tịch Ủy ban nhân dân cấp xã quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư.",
    soTay: { muc: "điểm d khoản 2 Mục XII Phần II Sổ tay", trich: "Trong thời hạn không quá 05 (năm) ngày làm việc, kể từ ngày nhận được hồ sơ hợp lệ" },
    phanMem: "≤ 05 ngày làm việc", danhGia: "THEO_SO_TAY",
  },
  { buoc: "10", mucNd151: `mục 10 ${ND}`, trichNd151: "phổ biến, niêm yết công khai quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư tại trụ sở Ủy ban nhân dân cấp xã", phanMem: "Không tính hạn", danhGia: "KHONG_TINH" },
  {
    buoc: "11", mucNd151: `mục 11 ${ND}`,
    trichNd151: "gửi phương án bồi thường, hỗ trợ, tái định cư đã được phê duyệt đến từng người có đất thu hồi",
    soTay: { muc: "Mục XV Phần II Sổ tay", trich: "Trong thời hạn không quá 03 (ba) ngày làm việc, kể từ ngày nhận quyết định phê duyệt phương án" },
    phanMem: "≤ 03 ngày làm việc", danhGia: "THEO_SO_TAY",
  },
  {
    buoc: "12", mucNd151: `mục 12 ${ND}`,
    trichNd151: "thực hiện việc bồi thường, hỗ trợ, bố trí tái định cư theo phương án bồi thường, hỗ trợ, tái định cư đã được phê duyệt.",
    phanMem: "Chi trả ≤ 30 ngày kể từ ngày quyết định phê duyệt có hiệu lực (khoản 3 Điều 94 Luật Đất đai)", danhGia: "KHOP",
  },
  {
    buoc: "13", mucNd151: `mục 13, 14 ${ND}`,
    trichNd151: "Quá thời hạn 10 ngày kể từ ngày kết thúc vận động, thuyết phục mà người có đất thu hồi vẫn không đồng ý hoặc không phối hợp thực hiện thì Chủ tịch Ủy ban nhân dân cấp xã ban hành quyết định thu hồi đất.",
    phanMem: "≤ 10 ngày khi đủ điều kiện (khoản 5, 6 Điều 87 Luật Đất đai)", danhGia: "KHOP",
  },
  {
    buoc: "14", mucNd151: `mục 15 ${ND}`,
    trichNd151: "Quá thời hạn 10 ngày kể từ ngày kết thúc vận động, thuyết phục mà người có đất thu hồi vẫn không chấp hành việc bàn giao đất",
    phanMem: "QĐ cưỡng chế sau 10 ngày kể từ ngày kết thúc vận động (điểm b khoản 7 Điều 87 Luật Đất đai); điều kiện, thời hạn Điều 89", danhGia: "KHOP",
  },
  {
    buoc: "15", mucNd151: `Không có trong ${ND}`,
    trichNd151: "",
    soTay: { muc: "khoản 1 Mục XVIII Phần II Sổ tay", trich: "Trong 03 (ba) ngày làm việc kể từ ngày kết thúc việc chi trả kinh phí bồi thường" },
    phanMem: "≤ 03 ngày làm việc sau chi trả", danhGia: "THEO_SO_TAY", ghiChu: "Nghị định 151 không có bước chỉnh lý hồ sơ địa chính trong mục IV.",
  },
  {
    buoc: "16", mucNd151: `mục 16 ${ND}`,
    trichNd151: "có trách nhiệm quản lý đất đã được thu hồi trong khi chưa giao đất, cho thuê đất theo quy định tại khoản 5 Điều 86 của Luật Đất đai.",
    phanMem: "Không tính hạn", danhGia: "KHONG_TINH",
  },
];

/** Gộp khoảng trắng, xuống dòng (văn bản Sổ tay chuyển từ PDF bị ngắt dòng) để đối chiếu nguyên văn. */
export const chuanHoaChu = (s: string) => s.replace(/\s+/g, " ").trim();
