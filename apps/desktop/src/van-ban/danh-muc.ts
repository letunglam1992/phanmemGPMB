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
  { ma: "08", ten: "Biên bản hội nghị lấy ý kiến về phương án", buoc: "7", phamVi: "DU_AN", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Người có đất tham dự (hoặc “Có danh sách kèm theo”)", nhieuDong: true }, Y_KIEN, { truong: "giai_trinh", nhan: "Giải thích, giải trình, tiếp thu", nhieuDong: true }, { truong: "y_kien_sau", nhan: "Ý kiến sau giải thích", nhieuDong: true }, { truong: "so_dong_y", nhan: "Số ý kiến đồng ý", goiY: "Để trống = đếm từ ý kiến đã ghi ở bước 7 của các hộ" }, { truong: "so_khong_dong_y", nhan: "Số ý kiến không đồng ý", goiY: "Để trống = đếm từ ý kiến đã ghi ở bước 7 của các hộ" }, { truong: "so_y_kien_khac", nhan: "Số ý kiến khác", goiY: "Để trống = đếm từ ý kiến đã ghi ở bước 7 của các hộ" }, { truong: "tiep_thu", nhan: "Nội dung tiếp thu, giải trình", nhieuDong: true }, GIO_KT] },
  { ma: "09", ten: "Biên bản niêm yết công khai phương án", buoc: "6", phamVi: "DU_AN", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Người có đất được mời chứng kiến", nhieuDong: true }, TG("tg_niem_yet_tu", "Niêm yết từ"), TG("tg_niem_yet_den", "đến"), { truong: "dia_diem_niem_yet", nhan: "Địa điểm niêm yết" }, { truong: "so_lan_thong_bao", nhan: "Số lần thông báo trên loa" }, { truong: "so_ngay_thong_bao", nhan: "Số ngày thông báo liên tục" }, TG("tg_thong_bao_tu", "Thông báo từ ngày"), TG("tg_thong_bao_den", "đến ngày"), GIO_KT] },
  { ma: "10", ten: "Biên bản kết thúc niêm yết công khai phương án", buoc: "6", phamVi: "DU_AN", coQuan: "BIEN_BAN", nhapThem: [THOI_DIEM, DIA_DIEM, { truong: "tp_nguoi_co_dat", nhan: "Người có đất được mời chứng kiến", nhieuDong: true }, TG("tg_niem_yet_tu", "Niêm yết thực tế từ"), TG("tg_niem_yet_den", "đến"), { truong: "dia_diem_niem_yet", nhan: "Địa điểm niêm yết" }, Y_KIEN, GIO_KT] },
  { ma: "11", ten: "Tờ trình đề nghị thẩm định phương án", buoc: "8", phamVi: "DU_AN", coQuan: "DON_VI_BT", nhapThem: [...PHUONG_AN(), NOI_NHAN("Như trên\nLưu: VT")] },
  { ma: "12", ten: "Tờ trình thu hồi đất", buoc: "8", phamVi: "DU_AN", coQuan: "PHONG", nhapThem: [{ truong: "co_quan_quan_ly_dat", nhan: "Cơ quan được giao quản lý đất đã thu hồi" }, NOI_NHAN("Như trên\nLưu: VT")] },
  { ma: "13", ten: "Tờ trình đề nghị phê duyệt phương án", buoc: "8", phamVi: "DU_AN", coQuan: "PHONG", ghiLai: { khoa: "tt_phe_duyet_pa", capDo: "DU_AN", kyHieu: "TTr-{ky_hieu_phong}" }, nhapThem: [{ truong: "ket_qua_tham_dinh", nhan: "Kết quả thẩm định (số, ngày văn bản)", goiY: "Ghi tên cơ quan chủ trì thẩm định và văn bản thẩm định." }, ...PHUONG_AN(), NOI_NHAN("Như trên\nLưu: VT")] },
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

/**
 * 1.0.21 (B1) — Đối chiếu Phụ lục NĐ 102/2024/NĐ-CP: mẫu 06, 07, 15, 22 của Sổ tay có bố cục theo Mẫu 01a, 01b, 01c, 01đ (cùng các
 * điều, khoản). Mẫu 07, 22: số liệu thời gian, ghi ngược số QĐ cưỡng chế vào hồ sơ cưỡng chế của hộ (thẻ Khiếu nại).
 */
// 1.2.0 (A2): cùng bố cục Mẫu số 45, 46, 47, 48 Phụ lục II NĐ 151/2025/NĐ-CP (thẩm quyền Chủ tịch UBND cấp xã — Điều 5).
for (const [ma, mauNd102, mauNd151, ghiLai] of [
  ["06", "01a (Quyết định kiểm đếm bắt buộc)", "45", undefined],
  ["07", "01b (Quyết định cưỡng chế kiểm đếm bắt buộc)", "46", { khoa: "qd_cc_kiem_dem", capDo: "HO", kyHieu: "QĐ-UBND" }],
  ["15", "01c (Quyết định thu hồi đất)", "47", undefined],
  ["22", "01đ (Quyết định cưỡng chế thu hồi đất)", "48", { khoa: "qd_cc_thu_hoi", capDo: "HO", kyHieu: "QĐ-UBND" }],
] as const) {
  const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
  const them = ma === "07" || ma === "22" ? " Thời gian bắt đầu lấy từ ngày dự kiến ở hồ sơ cưỡng chế của hộ (thẻ Khiếu nại); cấp số thì số, ngày được ghi vào hồ sơ cưỡng chế." : "";
  m.moTa = `${m.moTa ? m.moTa + " " : ""}Bố cục tương ứng Mẫu số ${mauNd151} Phụ lục II NĐ 151/2025/NĐ-CP (Mẫu số ${mauNd102} Phụ lục NĐ 102/2024/NĐ-CP).${them}`;
  if (ghiLai) m.ghiLai = { ...ghiLai };
}

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
  {
    ma: "T10", ten: "Tờ trình đề nghị phê duyệt phương án chi trả bồi thường chậm", buoc: "12", phamVi: "DOT", coQuan: "DON_VI_BT", nguon: "THUC_TE", tep: "tt-to-trinh-cham-tra.docx",
    moTa: "Điểm b khoản 3 Điều 94 Luật Đất đai 2024: đơn vị thực hiện bồi thường chậm chi trả thì người có đất được thanh toán thêm khoản tiền bằng mức tiền chậm nộp theo Luật Quản lý thuế; cơ quan có thẩm quyền phê duyệt phương án BT, HT, TĐC phê duyệt phương án chi trả bồi thường chậm. Biểu lấy từ thẻ Chi trả của các hộ được chọn (bỏ hộ xác nhận chậm do người có đất).",
    ghiLai: { khoa: "tt_cham_tra", capDo: "DU_AN", kyHieu: "TTr-{ky_hieu_don_vi}" },
    nhapThem: [
      { truong: "kinh_gui", nhan: "Kính gửi", goiY: "Để trống = Chủ tịch Ủy ban nhân dân xã, phường của dự án (cơ quan phê duyệt phương án BT, HT, TĐC)" },
      { truong: "ly_do_cham", nhan: "Lý do chậm chi trả", nhieuDong: true, goiY: "Nêu rõ nguyên nhân thuộc trách nhiệm cơ quan, đơn vị thực hiện bồi thường (vd. chậm bố trí vốn)" },
      { truong: "nguon_kinh_phi", nhan: "Nguồn kinh phí chi trả bồi thường chậm", macDinh: "Ngân sách của cấp phê duyệt phương án bồi thường, hỗ trợ, tái định cư (điểm b khoản 3 Điều 94 Luật Đất đai 2024)" },
      NOI_NHAN("Như trên\nLưu: VT"),
    ],
  },
  {
    ma: "T11", ten: "Quyết định phê duyệt phương án chi trả bồi thường chậm", buoc: "12", phamVi: "DOT", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-cham-tra.docx",
    moTa: "Phê duyệt phương án chi trả bồi thường chậm (điểm b khoản 3 Điều 94 LĐĐ 2024) theo Tờ trình T10; biểu từng hộ, tổng tiền bằng số và bằng chữ.",
    ghiLai: { khoa: "qd_cham_tra", capDo: "DU_AN", kyHieu: "QĐ-UBND" },
    nhapThem: [
      { truong: "nguon_kinh_phi", nhan: "Nguồn kinh phí", macDinh: "Ngân sách của cấp phê duyệt phương án bồi thường, hỗ trợ, tái định cư (điểm b khoản 3 Điều 94 Luật Đất đai 2024)" },
      HIEU_LUC,
      NOI_NHAN("Như Điều 3\nLưu: VT"),
    ],
  },
  {
    ma: "T12", ten: "Biên bản đối thoại về phương án bồi thường, hỗ trợ, tái định cư", buoc: "7", phamVi: "HO", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-doi-thoai.docx",
    moTa: "Điểm a khoản 3 Điều 87 Luật Đất đai 2024: trong 60 ngày kể từ ngày tổ chức lấy ý kiến, đơn vị thực hiện bồi thường phối hợp UBND cấp xã tổ chức đối thoại khi còn ý kiến không đồng ý. Luật không ban hành mẫu — bố cục theo biên bản của Sổ tay. Ý kiến, ngày lấy ý kiến, lần đối thoại gần nhất lấy từ bước 7 (Tiến độ) của hộ.",
    nhapThem: [
      THOI_DIEM, DIA_DIEM,
      { truong: "tp_don_vi_bt", nhan: "Đại diện đơn vị thực hiện bồi thường", nhieuDong: true },
      { truong: "tp_ubnd", nhan: "Đại diện UBND xã, phường", nhieuDong: true },
      { truong: "tp_khac", nhan: "Thành phần khác (nếu có)", nhieuDong: true },
      { truong: "y_kien_khong_dong_y", nhan: "Ý kiến không đồng ý", nhieuDong: true, goiY: "Để trống = nội dung đã ghi ở bước 7 của hộ" },
      { truong: "giai_trinh", nhan: "Giải thích, giải trình, tiếp thu", nhieuDong: true, goiY: "Để trống = nội dung lần đối thoại gần nhất ở bước 7" },
      { truong: "y_kien_sau", nhan: "Ý kiến của người có đất sau giải trình", nhieuDong: true },
      { truong: "ket_qua_doi_thoai", nhan: "Kết quả", nhieuDong: true, goiY: "Để trống = theo kết quả lần đối thoại gần nhất ở bước 7" },
      GIO_KT,
    ],
  },
  {
    ma: "T13", ten: "Biên bản bốc thăm vị trí lô đất ở, căn nhà ở tái định cư", buoc: "9", phamVi: "DOT", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-boc-tham-tdc.docx",
    moTa: "Dùng khi dự án giao lô tái định cư bằng hình thức bốc thăm (Quỹ tái định cư → tích \"Giao lô bằng bốc thăm\"). Luật Đất đai 2024 và nghị định hướng dẫn không ban hành mẫu — bố cục theo biên bản của Sổ tay; nguyên tắc, trình tự bốc thăm ghi theo quy chế/phương án bố trí TĐC được duyệt. Biểu 01: lô, căn còn trống (bỏ lô tạm giữ, đã giao); Biểu 02: hộ được chọn cần bố trí lô — đã ghi nhận kết quả bốc thăm thì điền thứ tự, lô bốc được; chưa thì để trống ghi tay. Phần mềm không bốc thăm thay.",
    nhapThem: [
      { truong: "qd_tdc_so", nhan: "Quyết định phê duyệt phương án bố trí TĐC số" }, { truong: "qd_tdc_ngay", nhan: "ngày" },
      { truong: "qd_tdc_co_quan", nhan: "Cơ quan phê duyệt", goiY: "vd. Chủ tịch Ủy ban nhân dân xã …" },
      { truong: "quy_che_boc_tham", nhan: "Căn cứ tổ chức bốc thăm", goiY: "vd. Quy chế bốc thăm … ban hành kèm theo Quyết định số … ngày … của …" },
      THOI_DIEM, DIA_DIEM,
      { truong: "tp_don_vi_bt", nhan: "Đại diện đơn vị thực hiện bồi thường", nhieuDong: true },
      { truong: "tp_ubnd", nhan: "Đại diện UBND xã, phường", nhieuDong: true },
      { truong: "tp_khac", nhan: "Thành phần khác (nếu có)", nhieuDong: true, goiY: "vd. đại diện Ủy ban Mặt trận Tổ quốc, trưởng bản, tổ dân phố" },
      { truong: "nguyen_tac_boc_tham", nhan: "Nguyên tắc, trình tự bốc thăm", nhieuDong: true, goiY: "Ghi theo quy chế/phương án được duyệt (bốc số thứ tự, bốc lô; ưu tiên nếu có…)" },
      { truong: "y_kien", nhan: "Ý kiến của các hộ tham gia bốc thăm", nhieuDong: true, goiY: "Để trống nếu không có ý kiến; hộ vắng mặt, ủy quyền… ghi rõ" },
      GIO_KT,
    ],
  },
);

export const mauTheoMa = (ma: string) => DANH_MUC_MAU.find((m) => m.ma === ma)!;
export const tepMau = (m: MauVanBan) => m.tep ?? `mau-${m.ma}.docx`;

/**
 * 1.0.21 (B2) — Văn bản khiếu nại, cưỡng chế của hộ: tự điền từ thẻ Khiếu nại của hồ sơ hộ. Thẩm quyền ban hành quyết định
 * cưỡng chế, thành lập Ban cưỡng chế, phê duyệt phương án và kinh phí cưỡng chế: Chủ tịch UBND cấp xã (điểm d khoản 2, điểm đ
 * khoản 1 Điều 5 NĐ 151/2025/NĐ-CP — chuyển giao từ cấp huyện). Kết luận, biện pháp, kinh phí do cán bộ ghi.
 */
DANH_MUC_MAU.push(
  {
    ma: "T14", ten: "Quyết định giải quyết khiếu nại (lần đầu)", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-giai-quyet-kn.docx",
    moTa: "Theo Mẫu số 15 Phụ lục Nghị định 124/2020/NĐ-CP (Điều 31 Luật Khiếu nại 2011). Đơn khiếu nại lần đầu lấy từ thẻ Khiếu nại của hộ (đơn chưa có kết quả mới nhất, không có thì đơn mới nhất). Ngày ký từ 01/7/2026 tự thêm căn cứ Luật 136/2025/QH15 và NĐ 155/2026/NĐ-CP (cùng hiệu lực 01/7/2026).",
    ghiLai: { khoa: "qd_gqkn", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [
      { truong: "can_cu_tham_quyen", nhan: "Căn cứ chức năng, nhiệm vụ, quyền hạn của người giải quyết", goiY: "Ghi chú (5) Mẫu 15: văn bản quy định chức năng, nhiệm vụ, quyền hạn — vd. Luật Tổ chức chính quyền địa phương …" },
      { truong: "kn_doi_tuong", nhan: "Quyết định, hành vi bị khiếu nại", goiY: "Để trống = đã ghi ở đơn (thẻ Khiếu nại)" },
      { truong: "kn_tham_muu", nhan: "Cơ quan, người được giao tham mưu giải quyết", goiY: "Ghi chú (6) Mẫu 15" },
      { truong: "kn_bc_so", nhan: "Báo cáo kết quả xác minh số" }, { truong: "kn_bc_ngay", nhan: "ngày" },
      { truong: "kn_noi_dung", nhan: "I. Nội dung khiếu nại", nhieuDong: true, goiY: "Để trống = nội dung đơn đã ghi" },
      { truong: "kn_xac_minh", nhan: "II. Kết quả xác minh", nhieuDong: true },
      { truong: "kn_doi_thoai", nhan: "III. Kết quả đối thoại (nếu có)", nhieuDong: true, macDinh: "Không." },
      { truong: "kn_ket_luan", nhan: "IV. Kết luận", nhieuDong: true, goiY: "Nêu căn cứ pháp luật, kết luận từng nội dung đúng, đúng một phần hay sai (Mẫu 15; điểm e, g k2 Điều 31 Luật Khiếu nại)" },
      { truong: "kn_dieu_1", nhan: "Điều 1", nhieuDong: true, goiY: "Giữ nguyên, sửa đổi, bổ sung hoặc hủy bỏ một phần hay toàn bộ quyết định hành chính; tiếp tục thực hiện hoặc chấm dứt hành vi hành chính bị khiếu nại" },
      { truong: "kn_dieu_2", nhan: "Điều 2", nhieuDong: true, goiY: "Giải quyết các vấn đề liên quan (bồi thường thiệt hại nếu có — điểm i k2 Điều 31)" },
      { truong: "kn_so_ngay_lan_hai", nhan: "Thời hạn khiếu nại lần hai (ngày)", goiY: "Để trống = 30 ngày; vùng sâu, vùng xa (đơn đã đánh dấu) = 45 ngày (k1 Điều 33 Luật Khiếu nại 2011)" },
      { truong: "kn_nguoi_gq_lan_hai", nhan: "Người có thẩm quyền giải quyết lần hai", goiY: "Ghi chú (12) Mẫu 15. Để trống (ký từ 01/7/2026) = Chủ tịch UBND tỉnh — khoản 2 Điều 21 Luật Khiếu nại sửa bởi Luật 136/2025, áp dụng khi người giải quyết lần đầu là Chủ tịch UBND xã" },
      { truong: "kn_thi_hanh", nhan: "Người chịu trách nhiệm thi hành (Điều 4)", macDinh: "Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân, Thủ trưởng các cơ quan, đơn vị có liên quan và người khiếu nại" },
      HIEU_LUC,
      NOI_NHAN("Như Điều 4\nThủ trưởng cấp trên trực tiếp\nNgười có quyền, nghĩa vụ liên quan\nCơ quan thanh tra nhà nước cùng cấp\nLưu: VT, hồ sơ"),
    ],
  },
  {
    ma: "T15", ten: "Biên bản vận động, thuyết phục bàn giao đất", buoc: "14", phamVi: "HO", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-van-dong-ban-giao.docx",
    moTa: "Điểm a, b khoản 7 Điều 87 Luật Đất đai 2024: UBND cấp xã chủ trì, phối hợp UB MTTQ cấp xã và đơn vị bồi thường vận động trong 10 ngày, thể hiện bằng văn bản. Thời gian vận động lấy từ hồ sơ cưỡng chế thu hồi đất của hộ (thẻ Khiếu nại).",
    nhapThem: [
      THOI_DIEM, DIA_DIEM,
      { truong: "tp_ubnd", nhan: "Đại diện UBND xã", nhieuDong: true },
      { truong: "tp_mttq", nhan: "Đại diện Ủy ban MTTQ Việt Nam xã", nhieuDong: true },
      { truong: "tp_don_vi_bt", nhan: "Đại diện đơn vị bồi thường", nhieuDong: true },
      { truong: "tp_khac", nhan: "Thành phần khác (nếu có)", nhieuDong: true },
      { truong: "cc_van_dong_tu", nhan: "Vận động từ ngày", goiY: "Để trống = đã ghi ở hồ sơ cưỡng chế" }, { truong: "cc_van_dong_den", nhan: "đến ngày" },
      { truong: "noi_dung_van_dong", nhan: "Nội dung tuyên truyền, vận động, giải thích", nhieuDong: true },
      Y_KIEN,
      { truong: "ket_qua_van_dong", nhan: "Kết quả", nhieuDong: true, goiY: "vd. Hộ đồng ý bàn giao đất ngày …; hoặc: Hộ chưa đồng ý bàn giao đất. Quá thời hạn 10 ngày kể từ ngày kết thúc vận động mà không chấp hành thì ban hành quyết định cưỡng chế (điểm b k7 Đ87)" },
      GIO_KT,
    ],
  },
  {
    ma: "T16", ten: "Quyết định thành lập Ban cưỡng chế thu hồi đất", buoc: "14", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-ban-cuong-che.docx",
    moTa: "Điểm a khoản 4 Điều 89 Luật Đất đai 2024. Số, ngày quyết định cưỡng chế lấy từ hồ sơ cưỡng chế của hộ; nhiệm vụ của Ban trích điểm b, c, d khoản 4 và điểm b khoản 5 Điều 89. Thẩm quyền: Chủ tịch UBND cấp xã (điểm d khoản 2 Điều 5 NĐ 151/2025/NĐ-CP).",
    ghiLai: { khoa: "qd_ban_cc", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [
      { truong: "chuc_danh_de_nghi", nhan: "Chức danh người đề nghị", goiY: "Để trống = Trưởng + tên phòng" },
      { truong: "thanh_vien_ban", nhan: "Thành viên Ban (mỗi dòng một người: họ tên, chức vụ, nhiệm vụ trong Ban)", nhieuDong: true, goiY: "Điểm a k4 Đ89: Chủ tịch hoặc Phó Chủ tịch UBND là trưởng ban; đại diện các cơ quan có chức năng thanh tra, tư pháp, tài nguyên và môi trường, xây dựng; đơn vị bồi thường; lãnh đạo UBND xã nơi có đất; thành viên khác do người ký quyết định" },
      { truong: "nhiem_vu_khac", nhan: "Nhiệm vụ khác (nếu có)", nhieuDong: true },
      HIEU_LUC,
      { truong: "co_quan_thi_hanh", nhan: "Cơ quan thi hành (Điều 3)", macDinh: "Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân, Thủ trưởng các cơ quan, đơn vị có liên quan" },
      NOI_NHAN("Như Điều 3\nỦy ban Mặt trận Tổ quốc Việt Nam (để giám sát)\nLưu: VT"),
    ],
  },
  {
    ma: "T17", ten: "Phương án cưỡng chế, dự toán kinh phí cưỡng chế", buoc: "14", phamVi: "HO", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-pa-cuong-che.docx",
    moTa: "Điểm b khoản 5 Điều 89 Luật Đất đai 2024: Ban cưỡng chế lập phương án và dự toán kinh phí trình Chủ tịch UBND cấp xã phê duyệt (điểm đ khoản 1 Điều 5 NĐ 151/2025); khoản 6 Điều 89: kinh phí là một khoản trong kinh phí bồi thường. Thửa đất, QĐ thu hồi, QĐ cưỡng chế, ngày dự kiến lấy từ hồ sơ hộ; dự toán do cán bộ nhập từng dòng, phần mềm cộng tổng.",
    nhapThem: [
      { truong: "xu_ly_tai_san", nhan: "Tài sản trên đất, phương án di chuyển, bảo quản", nhieuDong: true, goiY: "Điểm c k4, điểm b k5 Đ89: chi phí bảo quản tài sản do chủ sở hữu thanh toán" },
      { truong: "luc_luong", nhan: "Lực lượng, phân công nhiệm vụ", nhieuDong: true },
      { truong: "trinh_tu", nhan: "Trình tự thực hiện", nhieuDong: true },
      { truong: "can_cu_du_toan", nhan: "Căn cứ lập dự toán (chế độ, định mức chi)", goiY: "Ghi văn bản quy định mức chi áp dụng — phần mềm không đặt mức chi" },
      { truong: "du_toan_kinh_phi", nhan: "Dự toán (mỗi dòng: nội dung chi | số tiền)", nhieuDong: true, goiY: "vd. Bồi dưỡng lực lượng tham gia … | 5.000.000" },
      { truong: "nguoi_ky", nhan: "Trưởng Ban cưỡng chế (họ tên)" },
    ],
  },
);

/**
 * 1.0.21 (A2) — Mẫu thủ tục khiếu nại theo Phụ lục NĐ 155/2026/NĐ-CP (thay Mẫu 03, 04, 14; bổ sung 14a, 14b của NĐ 124/2020),
 * tự điền từ đơn khiếu nại của hộ (đơn chưa có kết quả mới nhất). Cơ quan ban hành mặc định UBND xã (Điều 17 Luật Khiếu nại sửa bởi
 * Luật 136/2025: Chủ tịch UBND cấp xã giải quyết lần đầu QĐ, hành vi của mình và cơ quan thuộc UBND xã).
 */
const KN_NOI_NHAN = NOI_NHAN("Như trên\nCơ quan, tổ chức, cá nhân theo khoản 2 Điều 16 NĐ 124/2020\nLưu: VT, hồ sơ");
const KN_GIAY_TO: TruongNhap[] = [{ truong: "kn_ngay_cap_giay_to", nhan: "Ngày cấp giấy tờ tùy thân" }, { truong: "kn_noi_cap_giay_to", nhan: "Nơi cấp" }];
DANH_MUC_MAU.push(
  {
    ma: "T18", ten: "Thông báo thụ lý giải quyết khiếu nại", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-tb-thu-ly-kn.docx",
    moTa: "Mẫu số 03 Phụ lục NĐ 155/2026/NĐ-CP; thụ lý trong 07 ngày làm việc từ ngày nhận đơn (Điều 27, k1 Điều 36 Luật Khiếu nại sửa bởi Luật 136/2025; k1 Điều 16 NĐ 124 sửa bởi NĐ 155). Gửi người khiếu nại và cơ quan theo k2 Điều 16 NĐ 124.",
    ghiLai: { khoa: "tb_thu_ly_kn", capDo: "HO", kyHieu: "TB-UBND" },
    nhapThem: [...KN_GIAY_TO, { truong: "kn_noi_dung", nhan: "Tóm tắt nội dung khiếu nại", nhieuDong: true, goiY: "Để trống = nội dung đơn" }, KN_NOI_NHAN],
  },
  {
    ma: "T19", ten: "Thông báo không thụ lý giải quyết khiếu nại", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-tb-khong-thu-ly-kn.docx",
    moTa: "Mẫu số 04 Phụ lục NĐ 155/2026/NĐ-CP; lý do theo Điều 11 Luật Khiếu nại (lấy từ đơn có kết quả \"Không thụ lý\").",
    nhapThem: [...KN_GIAY_TO, { truong: "kn_noi_dung", nhan: "Tóm tắt nội dung khiếu nại", nhieuDong: true, goiY: "Để trống = nội dung đơn" }, { truong: "kn_ly_do_khong_thu_ly", nhan: "Lý do không thụ lý", nhieuDong: true, goiY: "Để trống = đã ghi ở đơn; các trường hợp tại Điều 11 Luật Khiếu nại" }, KN_NOI_NHAN],
  },
  {
    ma: "T20", ten: "Biên bản đối thoại với người khiếu nại", buoc: "9", phamVi: "HO", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-doi-thoai-kn.docx",
    moTa: "Mẫu số 14 Phụ lục NĐ 155/2026/NĐ-CP (Điều 28 NĐ 124 sửa bởi NĐ 155: thông báo đối thoại trước ít nhất 05 ngày; biên bản ít nhất ba bản). Người khiếu nại vắng (đã ghi ở đơn) thì tự ghi có/không có lý do. Khác T12 (đối thoại về phương án — điểm a k3 Đ87 LĐĐ).",
    nhapThem: [
      THOI_DIEM, DIA_DIEM,
      { truong: "tp_chu_tri", nhan: "Người giải quyết khiếu nại / người chủ trì đối thoại (họ tên, chức vụ, cơ quan)" },
      { truong: "tp_ghi_bien_ban", nhan: "Người ghi biên bản (họ tên, chức vụ, cơ quan)" },
      ...KN_GIAY_TO,
      { truong: "tp_bi_khieu_nai", nhan: "Người bị khiếu nại (nếu có)" },
      { truong: "tp_quyen_nghia_vu", nhan: "Người có quyền, nghĩa vụ liên quan (nếu có)", macDinh: "Không" },
      { truong: "tp_khac", nhan: "Đại diện cơ quan, tổ chức, cá nhân có liên quan (nếu có)", nhieuDong: true },
      { truong: "noi_dung_doi_thoai", nhan: "Mục đích, yêu cầu; tóm tắt kết quả xác minh; nội dung đối thoại", nhieuDong: true },
      Y_KIEN,
      { truong: "ket_qua_doi_thoai", nhan: "Kết quả đối thoại", nhieuDong: true, goiY: "Những nội dung đã thống nhất, những vấn đề còn ý kiến khác nhau và ý kiến khác (nếu có)" },
      GIO_KT,
      { truong: "so_ban", nhan: "Số bản", macDinh: "04", goiY: "Ít nhất ba bản (k4 Điều 28 NĐ 124 sửa bởi NĐ 155)" },
      { truong: "nguoi_nhan_bien_ban", nhan: "Người nhận biên bản", macDinh: "người giải quyết khiếu nại, người được giao nhiệm vụ xác minh, người khiếu nại, người bị khiếu nại", goiY: "Người khiếu nại, người bị khiếu nại không tham gia đối thoại thì không được nhận (ghi chú 5 Mẫu 14)" },
    ],
  },
  {
    ma: "T21", ten: "Quyết định tạm đình chỉ / đình chỉ giải quyết khiếu nại", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-tam-dinh-chi-kn.docx",
    moTa: "Mẫu số 14a Phụ lục NĐ 155/2026/NĐ-CP; k1, k2 Điều 11a Luật Khiếu nại (bổ sung bởi Luật 136/2025). Đơn có kết quả \"Đình chỉ\"/\"Rút đơn\" → đình chỉ; còn lại theo lần tạm đình chỉ mới nhất. Ban hành ngay, gửi trong 03 ngày làm việc (k1 Điều 28b NĐ 124).",
    ghiLai: { khoa: "qd_tdc_kn", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [{ truong: "chuc_danh_de_nghi", nhan: "Chức danh người đề nghị", goiY: "Để trống = Trưởng + tên phòng" }, { truong: "kn_ly_do_dinh_chi", nhan: "Lý do", nhieuDong: true, goiY: "Để trống = theo trường hợp, lý do đã ghi ở đơn" }, NOI_NHAN("Như Điều 3\nLưu: VT, hồ sơ")],
  },
  {
    ma: "T22", ten: "Quyết định tiếp tục giải quyết khiếu nại", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-tiep-tuc-kn.docx",
    moTa: "Mẫu số 14b Phụ lục NĐ 155/2026/NĐ-CP; k4 Điều 11a Luật Khiếu nại; k2 Điều 28b NĐ 124: thời hạn giải quyết tiếp tục tính từ ngày ban hành quyết định này — ghi ngày vào ô \"Ngày QĐ tiếp tục giải quyết\" của đơn để phần mềm tính lại hạn.",
    ghiLai: { khoa: "qd_tiep_tuc_kn", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [{ truong: "chuc_danh_de_nghi", nhan: "Chức danh người đề nghị", goiY: "Để trống = Trưởng + tên phòng" }, NOI_NHAN("Như Điều 3\nLưu: VT, hồ sơ")],
  },
);

/** 1.0.21 (B2) — Mẫu số 06 Phụ lục NĐ 102/2024/NĐ-CP: bàn giao đất trên thực địa cho người được giao đất, cho thuê đất. */
DANH_MUC_MAU.push({
  ma: "T23", ten: "Biên bản bàn giao đất trên thực địa", buoc: "16", phamVi: "DU_AN", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-ban-giao-dat-thuc-dia.docx",
  moTa: "Mẫu số 06 Phụ lục NĐ 102/2024/NĐ-CP — bàn giao khu đất cho người được giao đất, cho thuê đất (chủ đầu tư) theo quyết định giao đất/cho thuê đất, sau khi giải phóng mặt bằng. Bên nhận mặc định chủ đầu tư; diện tích mặc định tổng diện tích thu hồi của dự án (đợt) — sửa theo trích lục/trích đo được thẩm định.",
  nhapThem: [
    { truong: "qd_giao_dat_so", nhan: "Quyết định giao đất/cho thuê đất số" }, { truong: "qd_giao_dat_ngay", nhan: "ngày" },
    { truong: "co_quan_giao_dat", nhan: "Cơ quan ban hành quyết định", goiY: "vd. Ủy ban nhân dân tỉnh Sơn La" },
    { truong: "loai_giao_dat", nhan: "Hình thức", macDinh: "giao đất", luaChon: [{ giaTri: "giao đất", nhan: "Giao đất" }, { giaTri: "cho thuê đất", nhan: "Cho thuê đất" }] },
    DIA_DIEM,
    { truong: "CO_QUAN_BAN_GIAO", nhan: "Cơ quan bàn giao (in hoa)", goiY: "vd. SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG / VĂN PHÒNG ĐĂNG KÝ ĐẤT ĐAI … — theo phân công tại địa phương" },
    { truong: "tp_co_quan", nhan: "Đại diện cơ quan bàn giao", nhieuDong: true },
    { truong: "tp_ubnd", nhan: "Đại diện UBND xã", nhieuDong: true },
    { truong: "ben_nhan", nhan: "Bên nhận bàn giao", goiY: "Để trống = chủ đầu tư của dự án" },
    { truong: "tp_ben_nhan", nhan: "Đại diện bên nhận (họ tên, chức vụ)", nhieuDong: true },
    { truong: "thua_khu_dat", nhan: "Thửa đất/khu đất", goiY: "vd. khu đất thực hiện dự án …, gồm các thửa … tờ bản đồ số …" },
    { truong: "dia_diem_khu_dat", nhan: "Địa điểm khu đất", goiY: "Để trống = tên xã" },
    { truong: "dien_tich_giao", nhan: "Diện tích bàn giao (m²)", goiY: "Để trống = tổng diện tích thu hồi" },
    { truong: "trich_do", nhan: "Tờ trích lục/trích đo địa chính", macDinh: "tờ trích lục bản đồ địa chính (hoặc tờ trích đo địa chính) số …, tỷ lệ …, do … lập ngày …, đã được … thẩm định" },
    { truong: "moc_gioi", nhan: "Mốc giới, ranh giới (mỗi dòng một mốc/cạnh)", nhieuDong: true },
    GIO_KT,
    { truong: "so_ban", nhan: "Số bản", macDinh: "04" },
    { truong: "noi_gui", nhan: "Gửi", macDinh: "các bên tham dự, lưu hồ sơ" },
  ],
});

/** 1.1.0 (A2, A3) — thông báo tổ chức đối thoại; QĐ giải quyết khiếu nại lần hai (Mẫu số 16 NĐ 124/2020). */
DANH_MUC_MAU.push(
  {
    ma: "T24", ten: "Thông báo tổ chức đối thoại giải quyết khiếu nại", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-tb-doi-thoai-kn.docx",
    moTa: "Khoản 1 Điều 28 NĐ 124/2020/NĐ-CP sửa bởi NĐ 155/2026/NĐ-CP: gửi người khiếu nại, người bị khiếu nại, người có quyền, nghĩa vụ liên quan, cơ quan, tổ chức liên quan trước ngày đối thoại ít nhất 05 ngày; ghi rõ thời gian, địa điểm, nội dung. Nghị định không ban hành mẫu — bố cục thông báo theo NĐ 30/2020. Ngày, địa điểm lấy từ đơn (thẻ Khiếu nại).",
    ghiLai: { khoa: "tb_doi_thoai_kn", capDo: "HO", kyHieu: "TB-UBND" },
    nhapThem: [
      { truong: "kn_nguoi_nhan_tb", nhan: "Kính gửi", goiY: "Để trống = người khiếu nại; có thể ghi thêm người bị khiếu nại, người có quyền, nghĩa vụ liên quan" },
      { truong: "dt_thoi_gian", nhan: "Thời gian đối thoại", goiY: "Để trống = ngày đã ghi ở đơn; ghi đủ giờ, vd. 08 giờ 00 phút, ngày …" },
      { truong: "dt_dia_diem", nhan: "Địa điểm", goiY: "Để trống = địa điểm đã ghi ở đơn" },
      { truong: "dt_noi_dung", nhan: "Nội dung đối thoại", nhieuDong: true },
      { truong: "dt_thanh_phan", nhan: "Thành phần", nhieuDong: true },
      NOI_NHAN("Như trên\nNgười bị khiếu nại\nNgười có quyền, nghĩa vụ liên quan\nLưu: VT, hồ sơ"),
    ],
  },
  {
    ma: "T25", ten: "Quyết định giải quyết khiếu nại (lần hai)", buoc: "9", phamVi: "HO", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-giai-quyet-kn-lan-hai.docx",
    moTa: "Mẫu số 16 Phụ lục NĐ 124/2020/NĐ-CP (Điều 40 Luật Khiếu nại). Người giải quyết lần hai mặc định Chủ tịch UBND tỉnh (khoản 2 Điều 21 Luật Khiếu nại sửa bởi Luật 136/2025 — khi người giải quyết lần đầu là Chủ tịch UBND cấp xã). Đơn lần hai lấy từ thẻ Khiếu nại; mục II lấy kết quả đơn lần đầu. Thời hạn khởi kiện (Điều 3) mặc định 01 năm kể từ ngày nhận được hoặc biết được quyết định (điểm a khoản 3 Điều 116 Luật Tố tụng hành chính, VBHN 109/VBHN-VPQH).",
    ghiLai: { khoa: "qd_gqkn2", capDo: "HO", kyHieu: "QĐ-UBND" },
    nhapThem: [
      { truong: "KN2_CO_QUAN", nhan: "Cơ quan ban hành (in hoa)", goiY: "Để trống = ỦY BAN NHÂN DÂN TỈNH SƠN LA" },
      { truong: "KN2_CHUC_DANH", nhan: "Chức danh người giải quyết (in hoa)", goiY: "Để trống = CHỦ TỊCH ỦY BAN NHÂN DÂN TỈNH SƠN LA" },
      { truong: "kn2_co_quan", nhan: "Người, cơ quan giải quyết (trong Điều 3)", goiY: "Để trống = Chủ tịch Ủy ban nhân dân tỉnh Sơn La" },
      { truong: "can_cu_tham_quyen", nhan: "Căn cứ chức năng, nhiệm vụ, quyền hạn", goiY: "Ghi chú (5) Mẫu 16" },
      { truong: "kn_tham_muu", nhan: "Cơ quan tham mưu giải quyết" },
      { truong: "kn_bc_so", nhan: "Báo cáo kết quả xác minh số" }, { truong: "kn_bc_ngay", nhan: "ngày" },
      { truong: "kn_noi_dung", nhan: "I. Nội dung khiếu nại", nhieuDong: true, goiY: "Để trống = nội dung đơn lần hai" },
      { truong: "kn_kq_lan_dau", nhan: "II. Kết quả giải quyết lần đầu", nhieuDong: true, goiY: "Để trống = theo đơn lần đầu đã ghi kết quả" },
      { truong: "kn_xac_minh", nhan: "III. Kết quả xác minh", nhieuDong: true },
      { truong: "kn_doi_thoai", nhan: "IV. Kết quả đối thoại", nhieuDong: true, goiY: "Lần hai bắt buộc đối thoại (k2 Điều 28 NĐ 124 sửa bởi NĐ 155)" },
      { truong: "kn_ket_luan", nhan: "V. Kết luận", nhieuDong: true },
      { truong: "kn_dieu_1", nhan: "Điều 1", nhieuDong: true, goiY: "Đúng/đúng một phần: yêu cầu sửa đổi, hủy bỏ QĐ, chấm dứt hành vi; sai toàn bộ: công nhận, giữ nguyên QĐ giải quyết lần đầu (Mẫu 16)" },
      { truong: "kn_dieu_2", nhan: "Điều 2", nhieuDong: true },
      { truong: "kn2_thoi_han_khoi_kien", nhan: "Thời hạn khởi kiện (Điều 3)", goiY: "Để trống = 01 năm (điểm a khoản 3 Điều 116 Luật Tố tụng hành chính)" },
      { truong: "kn_thi_hanh", nhan: "Người chịu trách nhiệm thi hành (Điều 4)", macDinh: "Người khiếu nại, người bị khiếu nại, người giải quyết khiếu nại lần đầu và các cơ quan, tổ chức, cá nhân có liên quan" },
      NOI_NHAN("Như Điều 4\nNgười có quyền, nghĩa vụ liên quan\nCơ quan thanh tra nhà nước cùng cấp\nLưu: VT, hồ sơ"),
    ],
  },
);

/**
 * 1.2.0 (A2, B3) — T26 QĐ phê duyệt phương án theo Mẫu số 44 Phụ lục II NĐ 151/2025/NĐ-CP; T27 Biên bản cưỡng chế thu hồi đất
 * (khoản 4 Điều 89 Luật Đất đai 2024); T28 Biên bản bàn giao bảo quản tài sản (khoản 2 Điều 38 NĐ 102/2024/NĐ-CP).
 */
DANH_MUC_MAU.push(
  {
    ma: "T26", ten: "Quyết định phê duyệt phương án (Mẫu 44 NĐ 151/2025)", buoc: "9", phamVi: "DOT", coQuan: "UBND", nguon: "THUC_TE", tep: "tt-qd-pa-mau-44.docx",
    moTa: "Mẫu số 44 Phụ lục II NĐ 151/2025/NĐ-CP — Chủ tịch UBND cấp xã phê duyệt (điểm d khoản 1 Điều 5). Điều 1: (1) phương án đối với dự án (khoản 1 Điều 3 NĐ 88/2024), (2) phương án chi tiết từng người có đất thu hồi (khoản 2 Điều 3) — biểu kèm theo, số tiền theo kết quả tính của hộ (chỉ khoản Tạm tính). Căn cứ văn bản thẩm định, số Tờ trình lấy như mẫu 14.",
    ghiLai: { khoa: "qd_phe_duyet", capDo: "DU_AN", kyHieu: "QĐ-UBND" },
    nhapThem: [
      ...TRUONG_DOT,
      ...PHUONG_AN(),
      { truong: "trach_nhiem_nguoi_co_dat", nhan: "Điều 2 khoản 2 — trách nhiệm của người có đất thu hồi, chủ sở hữu tài sản", nhieuDong: true, goiY: "Ghi chú 11 Mẫu 44: ghi trách nhiệm của người có đất thu hồi, chủ sở hữu tài sản, người có quyền lợi và nghĩa vụ liên quan (nếu có)" },
      HIEU_LUC,
      { truong: "co_quan_thi_hanh", nhan: "Cơ quan thi hành (Điều 4)", nhieuDong: true, macDinh: "Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân, Thủ trưởng đơn vị thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư, các cơ quan, đơn vị có liên quan" },
      NOI_NHAN("Như Điều 4\nLưu: VT"),
    ],
  },
  {
    ma: "T27", ten: "Biên bản cưỡng chế thu hồi đất", buoc: "14", phamVi: "HO", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-cuong-che-thu-hoi.docx",
    moTa: "Điểm b, c, d khoản 4 Điều 89 Luật Đất đai 2024: Ban cưỡng chế lập biên bản ghi nhận sự chấp hành (bàn giao đất chậm nhất 30 ngày) hoặc việc tổ chức thực hiện cưỡng chế; mời Ủy ban MTTQ giám sát. Không có mẫu luật định. Số, ngày QĐ thu hồi, QĐ cưỡng chế, QĐ thành lập Ban, kết quả lấy từ hồ sơ cưỡng chế của hộ.",
    nhapThem: [
      THOI_DIEM, DIA_DIEM,
      { truong: "tp_ban", nhan: "Ban cưỡng chế (họ tên, chức vụ)", nhieuDong: true },
      { truong: "tp_mttq", nhan: "Đại diện Ủy ban MTTQ Việt Nam", nhieuDong: true },
      { truong: "tp_cong_an", nhan: "Lực lượng bảo vệ trật tự (nếu có)", nhieuDong: true },
      { truong: "tp_nguoi_bi_cc", nhan: "Người bị cưỡng chế, người có liên quan", nhieuDong: true, goiY: "Để trống = họ tên hộ" },
      { truong: "tp_chung_kien", nhan: "Người chứng kiến", nhieuDong: true },
      { truong: "ket_qua_van_dong", nhan: "Kết quả vận động, thuyết phục, đối thoại", nhieuDong: true },
      { truong: "dien_bien_cc", nhan: "Diễn biến (nếu tổ chức cưỡng chế)", nhieuDong: true, goiY: "Việc buộc ra khỏi khu đất, di chuyển người, tài sản (điểm c khoản 4 Điều 89)" },
      { truong: "tai_san_tren_dat", nhan: "Tài sản trên đất", nhieuDong: true, goiY: "Người bị cưỡng chế từ chối nhận tài sản → lập biên bản bảo quản (T28)" },
      { truong: "y_kien", nhan: "Ý kiến của người bị cưỡng chế", nhieuDong: true },
      { truong: "tu_choi_ky", nhan: "Người vắng mặt / từ chối ký (lý do)", macDinh: "Không" },
      GIO_KT,
    ],
  },
  {
    ma: "T28", ten: "Biên bản bàn giao bảo quản tài sản khi cưỡng chế", buoc: "14", phamVi: "HO", coQuan: "BIEN_BAN", nguon: "THUC_TE", tep: "tt-bb-bao-quan-tai-san.docx",
    moTa: "Khoản 2 Điều 38 NĐ 102/2024/NĐ-CP: biên bản ghi rõ người chủ trì, người bị cưỡng chế, người được giao bảo quản, người chứng kiến; số lượng, tình trạng tài sản; quyền, nghĩa vụ của người bảo quản; thời gian bàn giao. Sau bàn giao, thông báo chủ sở hữu nhận tài sản trong 60 ngày (khoản 3). Không có mẫu luật định.",
    nhapThem: [
      THOI_DIEM, DIA_DIEM,
      { truong: "tp_chu_tri", nhan: "Người chủ trì thực hiện quyết định cưỡng chế", nhieuDong: true },
      { truong: "tp_nguoi_bi_cc", nhan: "Cá nhân, đại diện tổ chức bị cưỡng chế", nhieuDong: true, goiY: "Để trống = họ tên hộ" },
      { truong: "tp_bao_quan", nhan: "Người được giao bảo quản tài sản", nhieuDong: true, goiY: "Khoản 1 Điều 38 NĐ 102: tổ chức có chức năng, cơ quan chuyên ngành, kiểm lâm, hoặc UBND cấp xã" },
      { truong: "tp_chung_kien", nhan: "Người chứng kiến", nhieuDong: true },
      { truong: "ds_tai_san_bq", nhan: "Tài sản (mỗi dòng: tên, số lượng, tình trạng)", nhieuDong: true },
      { truong: "quyen_nghia_vu_bao_quan", nhan: "Quyền và nghĩa vụ của người được giao bảo quản", nhieuDong: true },
      { truong: "thoi_gian_bao_quan", nhan: "Thời gian bàn giao bảo quản" },
      { truong: "so_ban", nhan: "Số bản", macDinh: "04" },
      { truong: "tu_choi_ky", nhan: "Người vắng mặt / từ chối ký (lý do)", macDinh: "Không" },
    ],
  },
);
