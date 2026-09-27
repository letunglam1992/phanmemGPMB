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
  /** DU_AN: một văn bản cho cả dự án; HO: mỗi hộ/tổ chức một văn bản. */
  phamVi: "DU_AN" | "HO";
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

export const mauTheoMa = (ma: string) => DANH_MUC_MAU.find((m) => m.ma === ma)!;
