/**
 * Danh mục 22 mẫu văn bản — Phần III Sổ tay ban hành kèm QĐ 1966/QĐ-UBND ngày 05/8/2025.
 * Thứ tự 14/15 theo NỘI DUNG mẫu (VM-23): 14 = QĐ phê duyệt phương án, 15 = QĐ thu hồi đất.
 * "goiY" lấy từ chú thích cuối trang của Sổ tay.
 */

export interface TruongNhap {
  truong: string;
  nhan: string;
  goiY?: string;
  macDinh?: string;
  /** Ô nhiều dòng (mỗi dòng một mục nếu là danh sách). */
  nhieuDong?: boolean;
  luaChon?: { giaTri: string; nhan: string }[];
}

export interface MauVanBan {
  ma: string;
  ten: string;
  buoc: string;
  /** DU_AN: một văn bản cho cả dự án; HO: mỗi hộ/tổ chức một văn bản; DOT: một văn bản cho nhóm hộ được chọn (một đợt). */
  phamVi: "DU_AN" | "HO" | "DOT";
  /**
   * SO_TAY: mẫu của Sổ tay QĐ 1966; RIENG: mẫu riêng của xã (giữ định dạng văn bản đang dùng); THUC_TE: dựng theo bố cục bộ
   * văn bản dự án thực tế của UBND phường (docs/19) — không chứa tên, số văn bản của dự án gốc.
   */
  nguon?: "SO_TAY" | "RIENG" | "THUC_TE";
  /** Tệp mẫu trong public/mau-van-ban (mặc định mau-{ma}.docx). */
  tep?: string;
  moTa?: string;
  /** Văn bản do ai ban hành → gợi ý quyền hạn ký. */
  coQuan: "UBND" | "PHONG" | "DON_VI_BT" | "BIEN_BAN" | "NGUOI_DAN";
  /** Sau khi tạo, số/ngày văn bản được ghi lại làm căn cứ cho các mẫu sau. */
  ghiLai?: { khoa: string; capDo: "DU_AN" | "HO"; kyHieu: string };
  nhapThem: TruongNhap[];
}

const TG = (truong: string, nhan: string): TruongNhap => ({ truong, nhan, macDinh: "" });
const THOI_DIEM: TruongNhap = { truong: "thoi_diem", nhan: "Thời điểm (giờ, phút, ngày)", goiY: "vd. 08 giờ 30 phút, ngày 15 tháng 5 năm 2026" };
const DIA_DIEM: TruongNhap = { truong: "dia_diem_lam_viec", nhan: "Địa điểm làm việc", goiY: "Ghi rõ địa điểm (nhà văn hóa bản, nhà hộ gia đình…)" };
const GIO_KT: TruongNhap = { truong: "gio_ket_thuc", nhan: "Giờ kết thúc", goiY: "vd. 10 giờ 00 phút" };
const Y_KIEN: TruongNhap = { truong: "y_kien", nhan: "Ý kiến ghi nhận", nhieuDong: true, goiY: "Trường hợp người được tuyên truyền, vận động không ký biên bản thì ghi rõ: “Không ký biên bản”; các thành phần khác ký để lưu hồ sơ." };
const HIEU_LUC: TruongNhap = { truong: "ngay_hieu_luc", nhan: "Ngày có hiệu lực", goiY: "Để trống = “ký”; vd. ngày ký" };
const NOI_NHAN = (macDinh: string): TruongNhap => ({ truong: "noi_nhan", nhan: "Nơi nhận (mỗi dòng một nơi)", nhieuDong: true, macDinh });

export const DANH_MUC_MAU: MauVanBan[] = [
  {
    ma: "01", ten: "Thông báo thu hồi đất", buoc: "3", phamVi: "HO", coQuan: "UBND", ghiLai: { khoa: "tb_thu_hoi", capDo: "HO", kyHieu: "TB-UBND" },
    nhapThem: [TG("tg_dieu_tra_tu", "Điều tra, kiểm đếm từ ngày"), TG("tg_dieu_tra_den", "đến ngày"), TG("tb_het_hieu_luc", "Thông báo có hiệu lực đến ngày"), { truong: "ke_hoach_tdc", nhan: "Dự kiến kế hoạch di chuyển, bố trí tái định cư", nhieuDong: true }, NOI_NHAN("Như trên\nLưu: VT")],
  },
  { ma: "02", ten: "Thông báo kiểm kê hiện trạng", buoc: "4", phamVi: "HO", coQuan: "UBND", nhapThem: [TG("tg_kiem_ke_tu", "Kiểm kê từ (giờ, phút, ngày)"), TG("tg_kiem_ke_den", "đến"), NOI_NHAN("Như trên\nLưu: VT")] },
  {
    ma: "03", ten: "Tờ tự khai", buoc: "4", phamVi: "HO", coQuan: "NGUOI_DAN",
    nhapThem: [
      { truong: "so_gcn", nhan: "Số Giấy chứng nhận", goiY: "Ghi các thông tin trên giấy chứng nhận: người được cấp, cơ quan cấp, ngày cấp. Không có giấy chứng nhận thì không ghi." },
      { truong: "co_quan_cap_gcn", nhan: "Cơ quan cấp" }, { truong: "ngay_cap_gcn", nhan: "Ngày cấp" }, { truong: "ten_tren_gcn", nhan: "Tên người được cấp" },
      { truong: "giay_to_dat", nhan: "Giấy tờ khác về sử dụng đất", goiY: "Liệt kê tất cả giấy tờ liên quan. Không có thì ghi rõ “Không có giấy tờ”." },
      { truong: "thoi_diem_su_dung", nhan: "Thời điểm sử dụng" },
      { truong: "thong_tin_khac", nhan: "Thông tin khác", nhieuDong: true },
      { truong: "giay_to_tai_san", nhan: "Giấy tờ về tài sản", goiY: "Giấy phép xây dựng, giấy bán nhà, giấy giao rừng (nếu có). Không có thì ghi rõ “Không có giấy tờ”." },
    ],
  },
  {
    ma: "04", ten: "Biên bản kiểm kê hiện trạng đất và tài sản trên đất", buoc: "4", phamVi: "HO", coQuan: "BIEN_BAN",
    nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Hộ gia đình/cá nhân/tổ chức tham gia", nhieuDong: true }, { truong: "ten_tren_gcn", nhan: "Tên người được cấp giấy chứng nhận" }, { truong: "giay_to_dat", nhan: "Giấy tờ về sử dụng đất" }, { truong: "thoi_diem_su_dung", nhan: "Thời điểm sử dụng" }, { truong: "thong_tin_khac", nhan: "Thông tin khác về đất" }, { truong: "giay_to_tai_san", nhan: "Giấy tờ về tài sản" }, { truong: "thong_tin_tai_san", nhan: "Thông tin khác về tài sản", goiY: "Nêu rõ loại nhà, công trình, thời điểm tạo lập, kích thước, khối lượng và đặc điểm khác có liên quan." }, GIO_KT],
  },
  { ma: "05", ten: "Biên bản tuyên truyền, vận động phối hợp điều tra, kiểm đếm", buoc: "4", phamVi: "HO", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, Y_KIEN, GIO_KT] },
  {
    ma: "06", ten: "Quyết định kiểm đếm bắt buộc", buoc: "4", phamVi: "HO", coQuan: "UBND", ghiLai: { khoa: "qd_kiem_dem", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [{ truong: "dia_chi_hien_nay", nhan: "Địa chỉ nơi ở hiện nay" }, { truong: "ly_do", nhan: "Lý do kiểm đếm bắt buộc", nhieuDong: true }, TG("tg_tu", "Thực hiện từ ngày"), TG("tg_den", "đến ngày"), HIEU_LUC, { truong: "co_quan_thuc_hien", nhan: "Cơ quan triển khai thực hiện", goiY: "Ghi tên cơ quan, tổ chức được giao nhiệm vụ." }, NOI_NHAN("Như Điều 2\nLưu: VT")],
  },
  {
    ma: "07", ten: "Quyết định cưỡng chế thực hiện quyết định kiểm đếm bắt buộc", buoc: "4", phamVi: "HO", coQuan: "UBND",
    nhapThem: [{ truong: "dia_chi_hien_nay", nhan: "Địa chỉ nơi ở hiện nay" }, { truong: "ly_do", nhan: "Lý do cưỡng chế", nhieuDong: true }, TG("tg_tu", "Thực hiện từ ngày"), TG("tg_den", "đến ngày"), HIEU_LUC, { truong: "co_quan_thuc_hien", nhan: "Cơ quan triển khai thực hiện" }, { truong: "kinh_phi_cuong_che", nhan: "Kinh phí phục vụ cưỡng chế" }, NOI_NHAN("Như Điều 2\nLưu: VT")],
  },
  { ma: "08", ten: "Biên bản hội nghị lấy ý kiến về phương án", buoc: "7", phamVi: "DU_AN", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Người có đất tham dự (hoặc “Có danh sách kèm theo”)", nhieuDong: true }, Y_KIEN, { truong: "giai_trinh", nhan: "Giải thích, giải trình, tiếp thu", nhieuDong: true }, { truong: "y_kien_sau", nhan: "Ý kiến sau giải thích", nhieuDong: true }, { truong: "so_dong_y", nhan: "Số ý kiến đồng ý" }, { truong: "so_khong_dong_y", nhan: "Số ý kiến không đồng ý" }, { truong: "so_y_kien_khac", nhan: "Số ý kiến khác" }, { truong: "tiep_thu", nhan: "Nội dung tiếp thu, giải trình", nhieuDong: true }, GIO_KT] },
  { ma: "09", ten: "Biên bản niêm yết công khai phương án", buoc: "6", phamVi: "DU_AN", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Người có đất được mời chứng kiến", nhieuDong: true }, TG("tg_niem_yet_tu", "Niêm yết từ"), TG("tg_niem_yet_den", "đến"), { truong: "dia_diem_niem_yet", nhan: "Địa điểm niêm yết" }, { truong: "so_lan_thong_bao", nhan: "Số lần thông báo trên loa" }, { truong: "so_ngay_thong_bao", nhan: "Số ngày thông báo liên tục" }, TG("tg_thong_bao_tu", "Thông báo từ ngày"), TG("tg_thong_bao_den", "đến ngày"), GIO_KT] },
  { ma: "10", ten: "Biên bản kết thúc niêm yết công khai phương án", buoc: "6", phamVi: "DU_AN", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Người có đất được mời chứng kiến", nhieuDong: true }, TG("tg_niem_yet_tu", "Niêm yết thực tế từ"), TG("tg_niem_yet_den", "đến"), { truong: "dia_diem_niem_yet", nhan: "Địa điểm niêm yết" }, Y_KIEN, GIO_KT] },
  { ma: "11", ten: "Tờ trình đề nghị thẩm định phương án", buoc: "8", phamVi: "DU_AN", coQuan: "DON_VI_BT", nhapThem: [...PHUONG_AN(), NOI_NHAN("Như trên\nLưu: VT")] },
  { ma: "12", ten: "Tờ trình thu hồi đất", buoc: "8", phamVi: "DU_AN", coQuan: "PHONG", nhapThem: [{ truong: "co_quan_quan_ly_dat", nhan: "Cơ quan được giao quản lý đất đã thu hồi" }, NOI_NHAN("Như trên\nLưu: VT")] },
  { ma: "13", ten: "Tờ trình đề nghị phê duyệt phương án", buoc: "8", phamVi: "DU_AN", coQuan: "PHONG", nhapThem: [{ truong: "ket_qua_tham_dinh", nhan: "Kết quả thẩm định (số, ngày văn bản)", goiY: "Ghi tên cơ quan chủ trì thẩm định và văn bản thẩm định." }, ...PHUONG_AN(), NOI_NHAN("Như trên\nLưu: VT")] },
  { ma: "14", ten: "Quyết định phê duyệt phương án", buoc: "9", phamVi: "DU_AN", coQuan: "UBND", ghiLai: { khoa: "qd_phe_duyet", capDo: "DU_AN", kyHieu: "QĐ-UBND" }, nhapThem: [...PHUONG_AN(), HIEU_LUC, { truong: "co_quan_thi_hanh", nhan: "Các cơ quan chịu trách nhiệm thi hành" }, NOI_NHAN("Như Điều 4\nLưu: VT")] },
  { ma: "15", ten: "Quyết định thu hồi đất", buoc: "13", phamVi: "HO", coQuan: "UBND", ghiLai: { khoa: "qd_thu_hoi", capDo: "HO", kyHieu: "QĐ-UBND" }, nhapThem: [HIEU_LUC, { truong: "co_quan_quan_ly_dat", nhan: "Cơ quan phối hợp quản lý quỹ đất" }, NOI_NHAN("Như Điều 2\nLưu: VT")] },
  { ma: "16", ten: "Biên bản giao quyết định", buoc: "11", phamVi: "HO", coQuan: "BIEN_BAN", nhapThem: [{ truong: "loai_qd_giao", nhan: "Quyết định được giao", macDinh: "QD_PHE_DUYET", luaChon: [{ giaTri: "QD_PHE_DUYET", nhan: "QĐ phê duyệt phương án" }, { giaTri: "QD_THU_HOI", nhan: "QĐ thu hồi đất" }], goiY: "Ghi tên Quyết định thu hồi đất, Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư" }, THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Đại diện tổ chức/hộ gia đình/cá nhân", nhieuDong: true }, { truong: "tg_nhan_tien", nhan: "Thời gian nhận tiền" }, { truong: "dia_diem_nhan_tien", nhan: "Địa điểm nhận tiền" }, { truong: "so_ngay_ban_giao", nhan: "Số ngày bàn giao mặt bằng sau khi nhận tiền" }, { truong: "ben_nhan_mat_bang", nhan: "Đơn vị nhận bàn giao mặt bằng" }, GIO_KT] },
  { ma: "17", ten: "Biên bản vận động nhận tiền, bàn giao mặt bằng", buoc: "12", phamVi: "HO", coQuan: "BIEN_BAN", nhapThem: [{ truong: "lan_thu", nhan: "Lần thứ", macDinh: "1" }, THOI_DIEM, DIA_DIEM, Y_KIEN, GIO_KT] },
  { ma: "18", ten: "Thông báo gửi tiền vào tài khoản tiền gửi", buoc: "12", phamVi: "HO", coQuan: "UBND", ghiLai: { khoa: "tb_gui_tien", capDo: "HO", kyHieu: "TB-UBND" }, nhapThem: [{ truong: "so_lan_van_dong", nhan: "Số lần đã vận động" }, { truong: "so_tai_khoan", nhan: "Số tài khoản tiền gửi" }, { truong: "ngan_hang", nhan: "Tại Kho bạc/Ngân hàng" }, NOI_NHAN("Hộ gia đình/cá nhân/tổ chức\nLưu: VT")] },
  { ma: "19", ten: "Biên bản giao Thông báo gửi tiền", buoc: "12", phamVi: "HO", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, GIO_KT] },
  { ma: "20", ten: "Tờ trình phê duyệt danh sách hỗ trợ bàn giao mặt bằng sớm", buoc: "12", phamVi: "DU_AN", coQuan: "PHONG", nhapThem: [{ truong: "bb_niem_yet_thuong", nhan: "Biên bản niêm yết danh sách (số, ngày)" }, NOI_NHAN("Như trên\nLưu: VT")] },
  { ma: "21", ten: "Quyết định phê duyệt danh sách hỗ trợ bàn giao mặt bằng sớm", buoc: "12", phamVi: "DU_AN", coQuan: "UBND", ghiLai: { khoa: "qd_thuong", capDo: "DU_AN", kyHieu: "QĐ-UBND" }, nhapThem: [HIEU_LUC, { truong: "co_quan_thi_hanh", nhan: "Các cơ quan chịu trách nhiệm thi hành" }, NOI_NHAN("Như Điều 3\nLưu: VT")] },
  { ma: "22", ten: "Quyết định cưỡng chế thu hồi đất", buoc: "14", phamVi: "HO", coQuan: "UBND", nhapThem: [TG("tg_cuong_che_tu", "Cưỡng chế từ ngày"), TG("tg_cuong_che_den", "đến ngày"), HIEU_LUC, { truong: "co_quan_cuong_che", nhan: "Cơ quan triển khai cưỡng chế" }, { truong: "kinh_phi_cuong_che", nhan: "Kinh phí phục vụ cưỡng chế" }, { truong: "co_quan_thi_hanh", nhan: "Các cơ quan chịu trách nhiệm thi hành" }, NOI_NHAN("Như Điều 2\nLưu: VT")] },
];

function PHUONG_AN(): TruongNhap[] {
  return [
    { truong: "pa_chuyen_doi_nghe", nhan: "Phương án đào tạo, chuyển đổi nghề", nhieuDong: true, macDinh: "Không" },
    { truong: "pa_tai_dinh_cu", nhan: "Phương án bố trí tái định cư", nhieuDong: true, macDinh: "Không", goiY: "Số hộ được bố trí; khu, địa điểm tái định cư; hình thức (bằng đất, bằng nhà ở). Hộ tự lo chỗ ở thì ghi số tiền hỗ trợ." },
    { truong: "pa_boi_thuong_dat", nhan: "Phương án bồi thường bằng đất", macDinh: "Không" },
    { truong: "pa_mo_ma", nhan: "Phương án di dời mồ mả", macDinh: "Không" },
    { truong: "pa_ha_tang", nhan: "Phương án di chuyển công trình hạ tầng", macDinh: "Không" },
    { truong: "bt_dau_tu_con_lai", nhan: "Bồi thường chi phí đầu tư vào đất còn lại (đồng)", macDinh: "0" },
    { truong: "ho_tro_ban_giao_som", nhan: "Hỗ trợ bàn giao mặt bằng sớm (đồng)", macDinh: "" },
    { truong: "chi_phi_to_chuc", nhan: "Chi phí tổ chức thực hiện (đồng)", goiY: "Theo dự toán được duyệt (QĐ 03/2025/QĐ-UBND)" },
    { truong: "chi_phi_khac", nhan: "Các chi phí khác", macDinh: "Không" },
    { truong: "tien_do_thuc_hien", nhan: "Tiến độ thực hiện phương án" },
    { truong: "y_kien_kien_nghi", nhan: "Ý kiến, kiến nghị và kết quả giải quyết", nhieuDong: true },
    { truong: "noi_dung_khac", nhan: "Nội dung khác", nhieuDong: true, macDinh: "Không" },
  ];
}

const TRUONG_DOT: TruongNhap[] = [
  { truong: "pham_vi_dot", nhan: "Phạm vi, đợt (in trong ngoặc sau tên dự án)", goiY: "vd. Phạm vi tuyến đường thuộc bản …, xã … đợt 10. Để trống nếu không có — lưu cho dự án" },
];

/** Mẫu riêng của xã (người dùng cung cấp): giữ nguyên định dạng, tự điền số liệu. */
DANH_MUC_MAU.push(
  {
    ma: "R1", ten: "Tờ trình đề nghị thu hồi đất (mẫu của xã)", buoc: "13", phamVi: "DOT", coQuan: "PHONG", nguon: "RIENG", tep: "rieng-to-trinh-thu-hoi.docx",
    moTa: "Phòng chuyên môn trình Chủ tịch UBND xã; kèm danh sách thu hồi đất 17 cột (có thông tin Giấy chứng nhận).",
    ghiLai: { khoa: "to_trinh", capDo: "DU_AN", kyHieu: "TTr-{ky_hieu_phong}" },
    nhapThem: [...TRUONG_DOT, { truong: "tt_don_vi_so", nhan: "Tờ trình của đơn vị bồi thường số" }, { truong: "tt_don_vi_ngay", nhan: "ngày" }, { truong: "noi_nhan", nhan: "Nơi nhận (mỗi dòng một nơi)", nhieuDong: true, macDinh: "UBND xã\nĐơn vị thực hiện nhiệm vụ bồi thường, GPMB\nLưu: VT" }],
  },
  {
    ma: "R2", ten: "Báo cáo thẩm định thu hồi đất (mẫu của xã)", buoc: "13", phamVi: "DOT", coQuan: "PHONG", nguon: "RIENG", tep: "rieng-bao-cao-tham-dinh.docx",
    moTa: "Phòng chuyên môn báo cáo kết quả thẩm định hồ sơ đề nghị thu hồi đất.",
    nhapThem: [...TRUONG_DOT, { truong: "tt_don_vi_so", nhan: "Tờ trình của đơn vị bồi thường số" }, { truong: "tt_don_vi_ngay", nhan: "ngày" }, { truong: "ket_luan_tham_dinh", nhan: "Kết luận thẩm định", macDinh: "Đủ điều kiện thu hồi đất để thực hiện dự án." }, { truong: "can_bo_tham_dinh", nhan: "Cán bộ thẩm định (họ tên)" }, { truong: "noi_nhan", nhan: "Nơi nhận (mỗi dòng một nơi)", nhieuDong: true, macDinh: "Như trên\nChủ tịch, PCT UBND xã\nLưu: VT" }],
  },
  {
    ma: "R3", ten: "Quyết định thu hồi đất theo đợt (mẫu của xã)", buoc: "13", phamVi: "DOT", coQuan: "UBND", nguon: "RIENG", tep: "rieng-qd-thu-hoi.docx",
    moTa: "Một quyết định thu hồi đất cho nhiều hộ trong đợt, kèm danh sách thu hồi đất.",
    ghiLai: { khoa: "qd_thu_hoi", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [...TRUONG_DOT, { truong: "chuc_danh_de_nghi", nhan: "Chức danh người đề nghị", goiY: "Để trống = Trưởng + tên phòng" }, { truong: "dia_diem_niem_yet_qd", nhan: "Nơi niêm yết quyết định", goiY: "vd. nhà văn hóa bản …" }, { truong: "co_quan_chinh_ly", nhan: "Cơ quan chỉnh lý hồ sơ địa chính", goiY: "vd. Chi nhánh Văn phòng Đăng ký đất đai khu vực …" }, HIEU_LUC, { truong: "noi_nhan", nhan: "Nơi nhận (mỗi dòng một nơi)", nhieuDong: true, macDinh: "Như Điều 3\nThường trực Đảng ủy xã\nThường trực HĐND xã\nChủ tịch, PCT UBND xã\nLưu: VT" }],
  },
);

const PA_RIENG = (): TruongNhap[] => [
  ...TRUONG_DOT,
  { truong: "ten_to_ban_do", nhan: "Cách ghi tờ bản đồ trong danh sách thửa", macDinh: "mảnh trích đo địa chính số", goiY: "vd. tờ bản đồ số / mảnh trích đo địa chính số" },
  ...PHUONG_AN().map((t) =>
    t.truong === "chi_phi_to_chuc" ? { ...t, macDinh: "Thực hiện theo quy định hiện hành.", goiY: "Nhập số tiền (đồng) thì được cộng vào tổng giá trị phương án" }
    : t.truong === "tien_do_thuc_hien" ? { ...t, nhieuDong: true, macDinh: "Trong thời hạn 30 ngày kể từ ngày quyết định phê duyệt phương án bồi thường, hỗ trợ có hiệu lực thi hành, đơn vị thực hiện nhiệm vụ bồi thường phải chi trả tiền bồi thường, hỗ trợ cho người có đất thu hồi, chủ sở hữu tài sản." }
    : t.truong === "y_kien_kien_nghi" ? { ...t, macDinh: "Không." }
    : t,
  ).filter((t) => !["bt_dau_tu_con_lai", "ho_tro_ban_giao_som", "noi_dung_khac"].includes(t.truong)),
];

/** Mẫu phê duyệt phương án của xã (QD-23): số liệu các khoản lấy từ bảng tính, tên khoản theo nhóm bồi thường / hỗ trợ. */
DANH_MUC_MAU.push(
  {
    ma: "R4", ten: "Tờ trình đề nghị phê duyệt phương án (mẫu của xã)", buoc: "8", phamVi: "DOT", coQuan: "PHONG", nguon: "RIENG", tep: "rieng-to-trinh-pa.docx",
    moTa: "Phòng chuyên môn trình Chủ tịch UBND xã phê duyệt phương án; các khoản a, b, c… tự lấy theo nhóm của bảng tính. Kèm Phụ lục I, II xuất từ Excel phương án.",
    ghiLai: { khoa: "tt_phe_duyet_pa", capDo: "DU_AN", kyHieu: "TTr-{ky_hieu_phong}" },
    nhapThem: [
      { truong: "ket_qua_tham_dinh", nhan: "Kết quả thẩm định (văn bản, số, ngày)", nhieuDong: true, goiY: "vd. Báo cáo số …/BC-HĐBT ngày … về thẩm định phương án …" },
      { truong: "tt_don_vi_so", nhan: "Tờ trình đề nghị thẩm định của đơn vị bồi thường số" }, { truong: "tt_don_vi_ngay", nhan: "ngày" },
      ...PA_RIENG(),
      { truong: "noi_nhan", nhan: "Nơi nhận (mỗi dòng một nơi)", nhieuDong: true, macDinh: "Như kính gửi\nLưu: VT" },
    ],
  },
  {
    ma: "R5", ten: "Quyết định phê duyệt phương án (mẫu của xã)", buoc: "9", phamVi: "DOT", coQuan: "UBND", nguon: "RIENG", tep: "rieng-qd-pa.docx",
    moTa: "Chủ tịch UBND xã phê duyệt phương án; dẫn số Tờ trình (mẫu R4) đã ghi. Điều 4 dẫn “có tên tại Phụ lục kèm theo”; nơi nhận mặc định “Như Điều 4”.",
    ghiLai: { khoa: "qd_phe_duyet", capDo: "DU_AN", kyHieu: "QĐ-UBND" },
    nhapThem: [
      { truong: "chuc_danh_de_nghi", nhan: "Chức danh người đề nghị", goiY: "Để trống = Trưởng + tên phòng" },
      ...PA_RIENG(),
      { truong: "ben_nhan_mat_bang", nhan: "Đơn vị nhận bàn giao mặt bằng", macDinh: "đơn vị thi công thực hiện dự án" },
      HIEU_LUC,
      { truong: "co_quan_thi_hanh", nhan: "Các cơ quan chịu trách nhiệm thi hành (Điều 4)", nhieuDong: true, macDinh: "Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân; Trưởng Phòng Kinh tế; Trưởng Phòng Văn hóa - Xã hội; Thủ trưởng đơn vị thực hiện nhiệm vụ bồi thường, giải phóng mặt bằng; Hội đồng bồi thường, hỗ trợ, tái định cư dự án; các cơ quan, đơn vị liên quan" },
      { truong: "noi_nhan", nhan: "Nơi nhận (mỗi dòng một nơi)", nhieuDong: true, macDinh: "Chủ tịch UBND tỉnh (để b/c)\nCác Phó Chủ tịch UBND tỉnh (để b/c)\nSở Nông nghiệp và Môi trường (để b/c)\nThường trực Đảng ủy xã\nThường trực HĐND xã\nChủ tịch, PCT UBND xã\nNhư Điều 4\nTrang thông tin điện tử\nLưu: VT" },
    ],
  },
);

const TIEN_DO_30N = "Trong thời hạn 30 ngày kể từ ngày quyết định phê duyệt phương án bồi thường, hỗ trợ có hiệu lực thi hành, đơn vị thực hiện nhiệm vụ bồi thường phải chi trả tiền bồi thường, hỗ trợ cho người có đất thu hồi, chủ sở hữu tài sản.";
const PA_HO = (): TruongNhap[] => [
  { truong: "pa_ha_tang", nhan: "7. Phương án di chuyển công trình hạ tầng", macDinh: "Không" },
  { truong: "chi_phi_khac", nhan: "8.2. Chi phí khác", macDinh: "Không" },
  { truong: "tien_do_thuc_hien", nhan: "9. Tiến độ thực hiện phương án", nhieuDong: true, macDinh: TIEN_DO_30N },
  { truong: "y_kien_kien_nghi", nhan: "10. Ý kiến, kiến nghị của hộ và kết quả giải quyết", nhieuDong: true, macDinh: "Không." },
  { truong: "noi_dung_khac", nhan: "11. Nội dung khác", nhieuDong: true, macDinh: "Không." },
];

/**
 * Mẫu dựng theo bố cục bộ văn bản dự án thực tế (UBND phường, 2026 — docs/19 §3, §4): mục 3–7 của phương án 01 hộ tự điền
 * từ hồ sơ hộ (tái định cư, chuyển đổi nghề, mồ mả); mục 8 lấy theo bảng tính. Căn cứ riêng của dự án (chủ trương đầu tư,
 * điều chỉnh quy hoạch, thông báo kết luận…) nhập ở "Căn cứ riêng của dự án".
 */
DANH_MUC_MAU.push(
  {
    ma: "T1", ten: "Kế hoạch thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm", buoc: "1", phamVi: "DU_AN", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-ke-hoach.docx",
    moTa: "Mốc thời gian từng việc lấy từ lịch dự kiến của dự án (Dự án → Lập kế hoạch). Kèm bảng tiến độ dự kiến.",
    ghiLai: { khoa: "ke_hoach", capDo: "DU_AN", kyHieu: "KH-UBND" },
    nhapThem: [
      { truong: "tien_do_du_an", nhan: "Tiến độ thực hiện dự án", goiY: "vd. 2026-2027" },
      { truong: "thoi_han_tb", nhan: "Thời hạn gửi thông báo thu hồi đất trước khi ban hành QĐ thu hồi đất", goiY: "Khoản 2 Điều 85 Luật Đất đai 2024: chậm nhất 90 ngày (đất nông nghiệp), 180 ngày (đất phi nông nghiệp). Văn bản thực tế năm 2026 ghi 60/120 ngày theo văn bản mới (NQ 254/2025/QH15 — phần mềm chưa có nguyên văn): cán bộ ghi theo căn cứ áp dụng." },
      { truong: "kh_xac_minh", nhan: "Xác minh nguồn gốc, loại đất; xét tái định cư — dự kiến hoàn thành trước ngày" },
      NOI_NHAN("Thường trực Đảng ủy (b/c)\nThường trực HĐND (b/c)\nChủ tịch, các PCT UBND\nBan điều hành tổ dân phố/bản\nCác phòng, đơn vị chuyên môn\nLưu: VT"),
    ],
  },
  {
    ma: "T2", ten: "Tờ trình đề nghị ban hành Thông báo thu hồi đất", buoc: "3", phamVi: "DOT", coQuan: "PHONG", nguon: "THUC_TE", tep: "tt-to-trinh-tb.docx",
    moTa: "Phòng chuyên môn trình Chủ tịch UBND cấp xã ban hành Thông báo thu hồi đất (mẫu T3). Dẫn Kế hoạch (mẫu T1) đã ghi số.",
    ghiLai: { khoa: "tt_tb_thu_hoi", capDo: "DU_AN", kyHieu: "TTr-{ky_hieu_phong}" },
    nhapThem: [
      { truong: "dt_khac_mo_ta", nhan: "Diện tích khác trong phạm vi dự án (ngoài đất của các hộ)", nhieuDong: true, goiY: "vd. Diện tích UBND tỉnh đã thu hồi, giao cho UBND phường quản lý …m² và đất giao thông …m². Để trống nếu không có" },
      { truong: "tg_dieu_tra_tu", nhan: "Điều tra, khảo sát, kiểm đếm bắt đầu từ ngày" },
      NOI_NHAN("Như trên\nLưu: VT"),
    ],
  },
  {
    ma: "T3", ten: "Thông báo thu hồi đất (kèm danh sách người có đất thu hồi)", buoc: "3", phamVi: "DOT", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-thong-bao.docx",
    moTa: "Một thông báo cho các hộ được chọn, kèm biểu danh sách (mỗi thửa một dòng). Số, ngày thông báo ghi vào từng hộ.",
    ghiLai: { khoa: "tb_thu_hoi", capDo: "HO", kyHieu: "TB-UBND" },
    nhapThem: [
      { truong: "dt_khac_mo_ta", nhan: "Diện tích khác trong phạm vi dự án (ngoài đất của các hộ)", nhieuDong: true, goiY: "Để trống nếu không có" },
      { truong: "tg_dieu_tra_tu", nhan: "Điều tra, khảo sát, kiểm đếm bắt đầu từ ngày" },
      { truong: "ke_hoach_tdc", nhan: "Dự kiến kế hoạch di chuyển, bố trí tái định cư", nhieuDong: true, macDinh: "Bố trí tái định cư (nếu có): thực hiện theo quy định của pháp luật." },
      { truong: "noi_niem_yet", nhan: "Nơi niêm yết thông báo", goiY: "vd. trụ sở UBND phường và nhà văn hóa tổ dân phố …" },
      NOI_NHAN("Thường trực Đảng ủy\nThường trực HĐND\nChủ tịch, các PCT UBND\nHội đồng BT, HT, TĐC dự án\nCác phòng, đơn vị có liên quan\nTổ chức, hộ gia đình, cá nhân có đất thu hồi\nLưu: VT"),
    ],
  },
  {
    ma: "T4", ten: "Tờ trình đề nghị phê duyệt phương án BT, HT, TĐC (01 hộ)", buoc: "8", phamVi: "HO", coQuan: "PHONG", nguon: "THUC_TE", tep: "tt-to-trinh-pa-ho.docx",
    moTa: "11 mục theo văn bản thực tế; mục 8 (kinh phí) lấy theo bảng tính của hộ, tổng làm tròn và bằng chữ; hỗ trợ khác khoản 13 Điều 6 QĐ 14/2026 ghi nội dung, lý do, mức. Kèm Biểu số 01, 02 xuất từ Excel.",
    ghiLai: { khoa: "tt_pa_ho", capDo: "HO", kyHieu: "TTr-{ky_hieu_phong}" },
    nhapThem: [...PA_HO(), NOI_NHAN("Như trên\nLưu: VT")],
  },
  {
    ma: "T5", ten: "Quyết định phê duyệt phương án BT, HT, TĐC (01 hộ)", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-pa-ho.docx",
    moTa: "Điều 1 = 11 mục như Tờ trình (mẫu T4, số liệu giống hệt); dẫn số Tờ trình của hộ. Số, ngày QĐ ghi vào hộ — mẫu T6, T7 tự lấy làm căn cứ.",
    ghiLai: { khoa: "qd_phe_duyet", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [...PA_HO(), HIEU_LUC, NOI_NHAN("Thường trực Đảng ủy\nThường trực HĐND\nVăn phòng Đăng ký đất đai tỉnh\nỦy ban MTTQ Việt Nam\nThành viên Hội đồng BT, HT, TĐC\nBan điều hành tổ dân phố/bản\nNhư Điều 3\nLưu: VT")],
  },
  {
    ma: "T6", ten: "Tờ trình đề nghị ban hành Quyết định thu hồi đất (nhiều hộ)", buoc: "13", phamVi: "DOT", coQuan: "PHONG", nguon: "THUC_TE", tep: "tt-to-trinh-thu-hoi.docx",
    moTa: "Trích yếu nêu tổng diện tích, số hộ; căn cứ tự liệt kê QĐ phê duyệt phương án từng hộ (số, ngày, tên hộ) và thông báo gửi tiền (nếu có). Kèm biểu tổng hợp diện tích.",
    ghiLai: { khoa: "tt_thu_hoi", capDo: "DU_AN", kyHieu: "TTr-{ky_hieu_phong}" },
    nhapThem: [
      { truong: "tt_don_vi_so", nhan: "Tờ trình của đơn vị bồi thường (Ban QLDA) số" }, { truong: "tt_don_vi_ngay", nhan: "ngày" },
      { truong: "don_vi_nhan_dat", nhan: "Đơn vị được giao quản lý diện tích đất thu hồi", goiY: "vd. Ban Quản lý dự án đầu tư xây dựng …" },
      NOI_NHAN("Như trên\nLưu: VT"),
    ],
  },
  {
    ma: "T7", ten: "Quyết định thu hồi đất (nhiều hộ)", buoc: "13", phamVi: "DOT", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-thu-hoi.docx",
    moTa: "Điều 1–3 như Tờ trình (mẫu T6); dẫn số Tờ trình T6. Số, ngày QĐ thu hồi ghi vào từng hộ. Kèm biểu tổng hợp diện tích.",
    ghiLai: { khoa: "qd_thu_hoi", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [
      { truong: "don_vi_nhan_dat", nhan: "Đơn vị được giao quản lý diện tích đất thu hồi" },
      HIEU_LUC,
      NOI_NHAN("Thường trực Đảng ủy\nThường trực HĐND\nVăn phòng Đăng ký đất đai tỉnh\nNhư Điều 3\nLưu: VT"),
    ],
  },
  {
    ma: "T8", ten: "Thông báo dự kiến phương án bố trí tái định cư", buoc: "6", phamVi: "DOT", coQuan: "DON_VI_BT", nguon: "THUC_TE", tep: "tt-tb-du-kien-tdc.docx",
    moTa: "Khoản 1 Điều 111 Luật Đất đai 2024: đơn vị thực hiện bồi thường thông báo dự kiến phương án bố trí TĐC cho người có đất ở bị thu hồi, chủ sở hữu nhà ở phải di chuyển; niêm yết ít nhất 15 ngày tại trụ sở UBND cấp xã, địa điểm sinh hoạt chung khu dân cư nơi có đất thu hồi và nơi tái định cư đã có người dân sinh sống. Biểu lô đất, căn nhà lấy từ Quỹ tái định cư; biểu dự kiến bố trí lấy từ thông tin TĐC của các hộ được chọn.",
    ghiLai: { khoa: "tb_du_kien_tdc", capDo: "DU_AN", kyHieu: "TB-{ky_hieu_don_vi}" },
    nhapThem: [
      { truong: "tdc_dia_diem", nhan: "Địa điểm khu, điểm tái định cư", goiY: "Để trống = tên các khu trong Quỹ tái định cư" },
      { truong: "tdc_thiet_ke", nhan: "Thiết kế (quy hoạch chi tiết, mẫu nhà, hạ tầng…)", nhieuDong: true, goiY: "vd. Theo quy hoạch chi tiết khu TĐC được phê duyệt tại Quyết định số …; hạ tầng giao thông, điện, nước đã hoàn thành" },
      { truong: "noi_niem_yet", nhan: "Địa điểm sinh hoạt chung của khu dân cư nơi có đất thu hồi", goiY: "vd. Nhà văn hóa bản …" },
      { truong: "noi_tdc_niem_yet", nhan: "Nơi tái định cư đã có người dân sinh sống (nếu có)", goiY: "Để trống nếu khu TĐC chưa có người dân sinh sống" },
      { truong: "niem_yet_tu", nhan: "Niêm yết từ ngày" }, { truong: "niem_yet_den", nhan: "đến ngày", goiY: "Ít nhất 15 ngày (k1 Đ111)" },
      { truong: "han_y_kien", nhan: "Hạn gửi ý kiến", goiY: "Thường là ngày kết thúc niêm yết" },
      NOI_NHAN("UBND xã, phường (để niêm yết)\nBan điều hành tổ dân phố/bản\nCác hộ gia đình, cá nhân có tên tại biểu kèm theo\nLưu: VT"),
    ],
  },
  {
    ma: "T9", ten: "Thông báo công bố công khai phương án bố trí tái định cư đã phê duyệt", buoc: "9", phamVi: "DOT", coQuan: "DON_VI_BT", nguon: "THUC_TE", tep: "tt-tb-cong-bo-tdc.docx",
    moTa: "Khoản 2 Điều 111 Luật Đất đai 2024: phương án bố trí TĐC đã được cơ quan có thẩm quyền phê duyệt phải được công bố công khai tại trụ sở UBND cấp xã, địa điểm sinh hoạt chung của khu dân cư nơi có đất thu hồi và tại nơi tái định cư. Ghi số, ngày quyết định phê duyệt; biểu bố trí lấy từ hồ sơ.",
    nhapThem: [
      { truong: "qd_tdc_so", nhan: "Quyết định phê duyệt phương án bố trí TĐC số" }, { truong: "qd_tdc_ngay", nhan: "ngày" },
      { truong: "qd_tdc_co_quan", nhan: "Cơ quan phê duyệt", goiY: "vd. Chủ tịch Ủy ban nhân dân xã …" },
      { truong: "noi_niem_yet", nhan: "Địa điểm sinh hoạt chung của khu dân cư nơi có đất thu hồi" },
      { truong: "noi_tdc_niem_yet", nhan: "Nơi tái định cư" },
      NOI_NHAN("UBND xã, phường (để công bố)\nBan điều hành tổ dân phố/bản\nCác hộ gia đình, cá nhân có tên tại biểu kèm theo\nLưu: VT"),
    ],
  },
);

export const mauTheoMa = (ma: string) => DANH_MUC_MAU.find((m) => m.ma === ma)!;
export const tepMau = (m: MauVanBan) => m.tep ?? `mau-${m.ma}.docx`;
