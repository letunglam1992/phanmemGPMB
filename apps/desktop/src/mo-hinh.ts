import type { CauHinhLop } from "@gpmb/gis";
/**
 * Mô hình dữ liệu hồ sơ GPMB. Số liệu (diện tích, khối lượng, đơn giá) lưu dạng chuỗi để giữ
 * nguyên số thập phân như người dùng nhập; khối lượng được phép là biểu thức "=10*9.8".
 */
import type { DiChuyen, LoaiDuong, LoaiVatNuoi } from "@gpmb/core";
import type { ThuaBanDo } from "@gpmb/gis";

export type LoaiDoiTuong = "HO_GIA_DINH" | "CA_NHAN" | "TO_CHUC";

export const TEN_DOI_TUONG: Record<LoaiDoiTuong, string> = {
  HO_GIA_DINH: "Hộ gia đình",
  CA_NHAN: "Cá nhân",
  TO_CHUC: "Tổ chức",
};

export interface NhanKhau {
  id: string;
  hoTen: string;
  namSinh?: string;
  quanHe: string;
  ghiChu?: string;
}

/** Giá đất đã chọn từ bảng giá (NQ 152) cho thửa: lưu cả nguồn để truy vết. */
export interface GiaThua {
  giaNghinDong: string;
  /** vd. "NQ 152/2025 – Bảng 01, Xã Chiềng Mung, CLN" */
  nguon: string;
}

/** Tính đất theo phân lớp (QD-21): cán bộ nhập từng lớp; phần mềm điền giá vị trí × tỷ lệ theo lớp. */
export interface PhanLopThua {
  tuyen: { bang: string; stt: string; xa: string; tuyen: string; vt: (number | null)[] };
  lop: { id: string; lop: number; viTri: number; dienTich: string; giaTuyChinh?: string; lyDo?: string }[];
}

export interface Thua {
  id: string;
  soTo: string;
  soThua: string;
  /** Mã loại đất theo bảng giá: LUC, LUK, HNK, CLN, RSX, NTS, ONT, ODT… */
  loaiDat: string;
  dienTich: string;
  dienTichThuHoi: string;
  nguonGoc: string;
  gia: GiaThua | null;
  phanLop?: PhanLopThua;
  /** Thông tin Giấy chứng nhận (dùng cho danh sách thu hồi đất theo mẫu của xã). */
  gcn?: { seri: string; soTo: string; soThua: string; dienTich: string; loaiDat: string; dtThuHoiCoGcn: string; loaiDatThuHoi: string };
  /** Diện tích thu hồi thuộc loại không được bồi thường, hỗ trợ về đất (cán bộ xác định, vd. đất rừng phòng hộ do cộng đồng quản lý, đất chưa sử dụng). */
  khongBoiThuong?: boolean;
  /** Mã thửa trên bản đồ (T{tờ}-{thửa}), nếu tạo từ bản đồ. */
  maBanDo?: string;
  dienTichBanDo?: number;
  cayXen?: {
    dienTichTru: string;
    lyDoTru: string;
    cachXep: "DUNG_KHI_VUOT" | "LAP_DAY";
    /**
     * VM-35: dòng cây không có mật độ quy định (cây hàng năm, hoa màu tính m², loài chưa có mật độ)
     * trên thửa có cây tính theo quỹ mật độ. Chưa chọn → "Cần xác nhận". Chọn thì bắt buộc lý do.
     */
    khongMatDo?: "TINH_100" | "TINH_30";
    lyDoKhongMatDo?: string;
  };
  /**
   * B13: thửa có nguồn gốc nông, lâm trường — cán bộ chọn trường hợp theo k9 Đ6 QĐ 14/2026 và ghi hồ sơ
   * xác nhận nguồn gốc (VM-37). Phần mềm không tự suy ra trường hợp.
   */
  nongLamTruong?: { truongHop: import("@gpmb/core").MaNongLamTruong; hoSo: string };
  ghiChu?: string;
}

interface TaiSanCoSo {
  id: string;
  thuaId: string;
  /** Đợt kiểm đếm (1, 2, … kiểm đếm bổ sung). */
  dot: number;
  ten: string;
  ghiChu?: string;
}

/** Nhà, công trình tính theo QĐ 32/2025: bồi thường thiệt hại thực tế (QD-10) hoặc khối lượng × hệ số × đơn giá. */
export interface TaiSanNhaCongTrinh extends TaiSanCoSo {
  loai: "NHA_CT";
  maDonGia: string;
  donVi: string;
  donGia: string;
  khoiLuong: string;
  cachTinh: "THIET_HAI_THUC_TE" | "HE_SO";
  T?: string;
  T1?: string;
  canCuKhauHao?: string;
  heSo?: string;
  /** Khoản thuộc phần bồi thường (A.II) hay hỗ trợ (B.II). */
  phan: "BOI_THUONG" | "HO_TRO";
  canCu: string;
}

export interface TaiSanCay extends TaiSanCoSo {
  loai: "CAY";
  maDonGia: string;
  donVi: string;
  donGia: string;
  soLuong: string;
  matDoHa: string | null;
}

export interface TaiSanVatNuoi extends TaiSanCoSo {
  loai: "VAT_NUOI";
  loaiDuong: LoaiDuong;
  loaiVatNuoi: LoaiVatNuoi;
  khoiLuong: string;
  quangDuongKm: string;
}

/** Tài sản ngoài danh mục đơn giá (vd. theo Công bố giá VLXD của Sở Xây dựng): nhập tay kèm căn cứ. */
export interface TaiSanKhac extends TaiSanCoSo {
  loai: "KHAC";
  donVi: string;
  khoiLuong: string;
  heSo: string;
  donGia: string;
  canCu: string;
  phan: "BOI_THUONG" | "HO_TRO";
}

export type TaiSan = TaiSanNhaCongTrinh | TaiSanCay | TaiSanVatNuoi | TaiSanKhac;

export interface HoTroHo {
  onDinh?: { dienTichNNDangSuDung: string; diChuyen: DiChuyen; chonNhom?: { ma: string; lyDo: string } };
  chuyenDoiNghe: boolean;
  tamCu?: { soThang: number; tdcBangDat: boolean };
  moMa?: { xay: number; khongXay: number };
  taiDinhCu?: TaiDinhCuHo;
}

/** Hình thức bố trí tái định cư (Điều 111 LĐĐ 2024; Điều 23, 24 NĐ 88/2024). */
export type HinhThucTdc = "DAT_O" | "NHA_O" | "TU_LO" | "TAI_CHO";
export const TEN_HINH_THUC_TDC: Record<HinhThucTdc, string> = {
  DAT_O: "Giao đất ở tại khu, điểm tái định cư",
  NHA_O: "Giao nhà ở tái định cư",
  TU_LO: "Tự lo chỗ ở (nhận tiền hỗ trợ)",
  TAI_CHO: "Tái định cư tại chỗ (chuyển mục đích phần đất NN còn lại — k3 Đ24 NĐ 88)",
};

export interface TaiDinhCuHo {
  hinhThuc: HinhThucTdc;
  /** Khu, điểm tái định cư; số lô / căn hộ. */
  khuTdc?: string;
  viTriLo?: string;
  /** DT lô đất ở / căn hộ được giao (m²). */
  dienTichGiao?: string;
  /** Giá đất ở tại khu TĐC theo bảng giá tại thời điểm phê duyệt phương án (k3 Đ111 LĐĐ), hoặc giá bán nhà TĐC (đ/m²). */
  donGia?: string;
  nguonGia?: string;
  /** Đề nghị hỗ trợ đủ một suất TĐC tối thiểu (k8 Đ111 LĐĐ). */
  suatToiThieu?: boolean;
  /** Hỗ trợ 20% tiền SDĐ phải nộp của thửa TĐC (k11 Đ6 QĐ 14/2026). */
  hoTroTienSdd?: boolean;
  /** Tiền SDĐ phải nộp theo thông báo (nếu có); trống = đơn giá × DT lô giao. */
  tienSddPhaiNop?: string;
  /** Khoản hỗ trợ khác do UBND xã quyết định cho dự án (k13 Đ6 QĐ 14/2026) hoặc chính sách chưa có sẵn — cán bộ nhập, bắt buộc căn cứ. */
  khoanKhac: { id: string; noiDung: string; soTien: string; canCu: string }[];
  ghiChu?: string;
}

/**
 * Trạng thái bước. KHONG_AP_DUNG (P1-3): bước tùy chọn không phát sinh với hộ (vd. bước 14 "Cưỡng chế (nếu có)"),
 * bắt buộc ghi lý do, cần quyền xác nhận bước; không tính vào mẫu số tiến độ.
 */
export type TrangThaiBuoc = "CHUA" | "DANG" | "XONG" | "CHO_DUYET" | "KHONG_AP_DUNG";

/** Bàn giao mặt bằng của hộ (P1-4). */
export interface BanGiaoHo {
  ngay: string;
  /** Diện tích đã bàn giao (m², chuẩn máy). Trống = toàn bộ DT thu hồi. */
  dienTich?: string;
  /** Số, ngày biên bản bàn giao mặt bằng. */
  bienBan: string;
  ghiChu?: string;
  nguoiGhi: string;
  /** Thưởng bàn giao trước hạn đã xét (C13, Đ15 PL II QĐ 106/2025) — lưu kết quả để in quyết định (Mẫu 20, 21). */
  thuong?: { moc: string; soTien: string; canCu: string };
}

export interface BuocHo {
  trangThai: TrangThaiBuoc;
  ngay?: string;
  ghiChu?: string;
  /** Tài khoản gửi duyệt / xác nhận hoàn thành (tách người lập – người duyệt). */
  guiBoi?: string;
  duyetBoi?: string;
  /** Ngày bắt đầu tính thời hạn của bước do cán bộ nhập (src/han-buoc.ts), vd. ngày nhận đủ hồ sơ. */
  mocHan?: string;
  /**
   * Khó khăn, vướng mắc của hộ tại bước này (bước 5–16), vd. không nhất trí phương án, chưa nhận tiền, tranh chấp.
   * Có nội dung → hộ ở trạng thái "Vướng mắc", đưa vào cảnh báo và báo cáo lãnh đạo; giải quyết xong thì xóa (ghi nhật ký).
   */
  vuongMac?: string;
  vuongMacNgay?: string;
  /**
   * Chỉ dùng cho bước chung (1–4) lưu trong hồ sơ hộ: true = hộ này theo dõi riêng, không theo bước chung
   * của dự án (vd. hộ không hợp tác phải kiểm đếm bắt buộc).
   */
  rieng?: boolean;
  /** Chỉ có trong kết quả tienDoHieuLuc: giá trị lấy từ bước chung của dự án. */
  tuDuAn?: boolean;
}

export interface NhatKy {
  luc: string;
  nguoi: string;
  noiDung: string;
}

export interface Ho {
  id: string;
  duAnId: string;
  ma: string;
  loai: LoaiDoiTuong;
  ten: string;
  diaChi: string;
  soDinhDanh: string;
  dienThoai: string;
  nhanKhau: NhanKhau[];
  thua: Thua[];
  taiSan: TaiSan[];
  hoTro: HoTroHo;
  khauTru: string;
  tienDo: Record<string, BuocHo>;
  nhatKy: NhatKy[];
  /** Số, ngày các văn bản đã tạo cho hộ (tb_thu_hoi_so, qd_thu_hoi_ngay…) — làm căn cứ cho mẫu sau. */
  vanBan?: Record<string, string>;
  /** Vướng mắc cần ưu tiên xử lý (khiếu nại, chưa nhận tiền, tranh chấp…), do cán bộ ghi. */
  vuongMac?: { noiDung: string; ngay: string } | null;
  /** Chi trả theo phương án đã phê duyệt (src/chi-tra.ts). */
  chiTra?: import("./chi-tra").ChiTraHo;
  /** Xóa mềm (P0-4): hồ sơ nằm trong thùng rác, không tính vào danh sách, tổng hợp, báo cáo. */
  daXoa?: import("./rang-buoc").DauXoa;
  /** Bàn giao mặt bằng (P1-4) — có ngày thì hộ "Đã bàn giao mặt bằng" (hoàn thành GPMB). */
  banGiao?: BanGiaoHo;
  /** Phiên bản cấu trúc dữ liệu (P0-2: 2 = số đã chuẩn hóa). */
  phienBanCauTruc?: number;
}

export interface BanDoDuAn {
  tenTep: string;
  ngayNhap: string;
  /** Vùng ranh GPMB cán bộ đã chọn (mã vùng ứng viên) — dữ liệu cũ, một vùng. */
  vungChon: string | null;
  /** Các vùng ranh / vùng thửa thu hồi đã chọn (hợp các vùng). Có giá trị thì dùng thay vungChon. */
  vungChonDs?: string[];
  /** Thửa cán bộ chọn trực tiếp là thửa thu hồi (mã thửa bản đồ) — dùng khi bản đồ không có ranh GPMB. */
  thuaChon?: string[];
  /** Cấu hình lớp cán bộ đã chốt cho tệp này; chưa có thì dùng gợi ý tự động (goiYCauHinh). */
  cauHinh?: CauHinhLop;
}

export type LoaiDuAn = "GIAO_THONG" | "CONG_NGHIEP" | "TAI_DINH_CU" | "DO_THI" | "THUY_LOI" | "KHAC";
export const TEN_LOAI_DU_AN: Record<LoaiDuAn, string> = {
  GIAO_THONG: "Giao thông", CONG_NGHIEP: "Khu, cụm công nghiệp", TAI_DINH_CU: "Khu tái định cư, dân cư", DO_THI: "Đô thị, hạ tầng", THUY_LOI: "Thủy lợi, thủy điện", KHAC: "Khác",
};
export type TrangThaiDuAn = "DANG_TRIEN_KHAI" | "TAM_DUNG" | "HOAN_THANH";
export const TEN_TRANG_THAI_DU_AN: Record<TrangThaiDuAn, string> = { DANG_TRIEN_KHAI: "Đang triển khai", TAM_DUNG: "Tạm dừng", HOAN_THANH: "Hoàn thành" };

export interface DuAn {
  id: string;
  ten: string;
  /** Loại dự án (biểu tượng, lọc); không ảnh hưởng tính toán. */
  loaiDuAn?: LoaiDuAn;
  /** Trạng thái do cán bộ ghi; bỏ trống = Đang triển khai. */
  trangThaiDuAn?: TrangThaiDuAn;
  xa: string;
  chuDauTu: string;
  canCuThuHoi: string;
  ngayThongBao: string;
  boChinhSach: string;
  giaGao: { dongKg: string; nguon: string } | null;
  hanMucNN: { m2: string; canCu: string } | null;
  heSoGiaDat: { heSo: string; vanBan: string } | null;
  /**
   * VM-36: cách làm tròn tổng tiền từng hộ của dự án. Bỏ trống = theo bộ chính sách (QD-03: làm tròn lên
   * đến 1.000 đ). Chọn khác thì bắt buộc lý do.
   */
  lamTron?: { cach: "LEN" | "NUA_LEN" | "XUONG" | "KHONG"; lyDo: string };
  banDo: BanDoDuAn | null;
  /** Mẫu mã hồ sơ do người dùng đặt (ma-ho.ts), vd. "H###", "CM-2026-####". Trống = "H###". */
  mauMaHo?: string;
  /** Thưởng bàn giao mặt bằng trước hạn (P1-4, C13): mốc, tỷ lệ, mức tối đa, cơ sở tính do cán bộ khai báo kèm căn cứ. */
  thuongBanGiao?: import("./ban-giao").CauHinhThuong;
  /** Phiên bản cấu trúc dữ liệu (P0-2: 2 = số đã chuẩn hóa). */
  phienBanCauTruc?: number;
  /** Xóa mềm (P0-4): dự án nằm trong thùng rác. */
  daXoa?: import("./rang-buoc").DauXoa;
  /** Thông tin dùng chung khi soạn văn bản (cơ quan, người ký, căn cứ, thành phần…) và số, ngày văn bản cấp dự án. */
  vanBan?: Record<string, string>;
  /** Kế hoạch hoàn thành từng bước (ngày ISO) do cán bộ nhập để theo dõi, cảnh báo chậm tiến độ. */
  keHoach?: Record<string, string>;
  /** Trạng thái các bước chung (BUOC_CHUNG: 1–4) — cập nhật một lần, áp dụng cho mọi hộ của dự án. */
  tienDoChung?: Record<string, BuocHo>;
  /** Các phiên bản phương án đã chốt/phê duyệt (src/phuong-an.ts). */
  phuongAn?: import("./phuong-an").PhienBanPA[];
  taoLuc: string;
}

/** 16 bước theo Sổ tay QĐ 1966/QĐ-UBND (docs/05). */
export const CAC_BUOC: { ma: string; ten: string; thoiHan?: string; mau?: string; canCu: string; tuyChon?: boolean }[] = [
  { ma: "1", ten: "Kế hoạch, điều tra, khảo sát", canCu: "k1 Đ86 LĐĐ" },
  { ma: "2", ten: "Họp với người có đất", canCu: "k1 Đ87 LĐĐ" },
  { ma: "3", ten: "Thông báo thu hồi đất", thoiHan: "≥ 90 N (NN) / 180 N (PNN) trước QĐ thu hồi", mau: "01", canCu: "Đ85, k2 Đ87 LĐĐ" },
  { ma: "4", ten: "Điều tra, đo đạc, kiểm đếm", mau: "02, 03, 04", canCu: "k2 c, d Đ87 LĐĐ" },
  { ma: "5", ten: "Lập phương án", canCu: "k3 a Đ87 LĐĐ; Đ3 NĐ88" },
  { ma: "6", ten: "Niêm yết công khai", thoiHan: "30 N", mau: "09, 10", canCu: "k3 a Đ87 LĐĐ" },
  { ma: "7", ten: "Lấy ý kiến, đối thoại", thoiHan: "đối thoại ≤ 60 N", mau: "08", canCu: "k3 a Đ87 LĐĐ" },
  { ma: "8", ten: "Thẩm định phương án", thoiHan: "≤ 30 NLV", mau: "11, 12, 13", canCu: "k3 Đ3 NĐ88" },
  { ma: "9", ten: "Phê duyệt phương án", thoiHan: "≤ 5 NLV", mau: "14", canCu: "điểm c k3 Đ87 LĐĐ" },
  { ma: "10", ten: "Phổ biến, niêm yết QĐ", canCu: "k4 a Đ87 LĐĐ" },
  { ma: "11", ten: "Gửi QĐ đến từng người", thoiHan: "≤ 3 NLV", mau: "16", canCu: "k4 b Đ87 LĐĐ" },
  { ma: "12", ten: "Chi trả", thoiHan: "≤ 30 N từ QĐ duyệt PA", mau: "17, 18, 19", canCu: "k3, k4 Đ94 LĐĐ" },
  { ma: "13", ten: "Quyết định thu hồi đất", thoiHan: "≤ 10 N khi đủ điều kiện", mau: "15", canCu: "k5, k6 Đ87 LĐĐ" },
  { ma: "14", ten: "Cưỡng chế (nếu có)", mau: "22", canCu: "Đ89 LĐĐ", tuyChon: true },
  { ma: "15", ten: "Chỉnh lý hồ sơ địa chính", thoiHan: "≤ 3 NLV sau chi trả", canCu: "Mục XVIII Sổ tay" },
  { ma: "16", ten: "Quản lý đất đã thu hồi", canCu: "k5 Đ86 LĐĐ" },
];

/**
 * Bước chung của cả dự án (kế hoạch, họp dân, thông báo thu hồi, điều tra – kiểm đếm): cán bộ cập nhật một lần
 * ở màn Dự án. Bước 5–16 theo dõi riêng từng hộ, cá nhân, tổ chức (có cập nhật hàng loạt cho nhiều hộ).
 */
export const BUOC_CHUNG = ["1", "2", "3", "4"] as const;
export const laBuocChung = (ma: string) => (BUOC_CHUNG as readonly string[]).includes(ma);

/**
 * Tiến độ có hiệu lực của hộ: bước chung lấy theo dự án, trừ khi hộ đánh dấu theo dõi riêng; dự án chưa
 * cập nhật bước chung thì giữ giá trị cũ trong hồ sơ hộ (dữ liệu nhập trước khi có bước chung).
 */
export function tienDoHieuLuc(duAn: Pick<DuAn, "tienDoChung"> | undefined | null, h: Ho): Record<string, BuocHo> {
  const chung = duAn?.tienDoChung;
  if (!chung) return h.tienDo;
  const out = { ...h.tienDo };
  for (const ma of BUOC_CHUNG) {
    if (h.tienDo[ma]?.rieng) continue;
    const c = chung[ma];
    if (c) out[ma] = { ...c, tuDuAn: true };
  }
  return out;
}

/** Hồ sơ với tiến độ có hiệu lực — dùng cho mọi chỗ ĐỌC tiến độ (thống kê, cảnh báo, thanh bước). */
export const hoHieuLuc = (duAn: Pick<DuAn, "tienDoChung"> | undefined | null, h: Ho): Ho =>
  duAn?.tienDoChung ? { ...h, tienDo: tienDoHieuLuc(duAn, h) } : h;

export const TEN_TRANG_THAI_BUOC: Record<TrangThaiBuoc, string> = {
  CHUA: "Chưa thực hiện",
  DANG: "Đang thực hiện",
  CHO_DUYET: "Chờ duyệt",
  KHONG_AP_DUNG: "Không áp dụng",
  XONG: "Hoàn thành",
};

export function taoId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Hồ sơ trống cho hộ, cá nhân, tổ chức mới. */
export function hoMoi(duAnId: string, ma: string, ten: string, loai: LoaiDoiTuong = "HO_GIA_DINH"): Ho {
  return {
    id: taoId(), duAnId, ma, loai, ten, diaChi: "", soDinhDanh: "", dienThoai: "", nhanKhau: [], thua: [], taiSan: [],
    hoTro: { chuyenDoiNghe: loai !== "TO_CHUC" }, khauTru: "0", tienDo: {}, nhatKy: [],
  };
}

/** Bước đã qua: hoàn thành hoặc không áp dụng (P1-3). */
export const daQuaBuoc = (t: TrangThaiBuoc | undefined) => t === "XONG" || t === "KHONG_AP_DUNG";
/** Bước được đánh dấu "không áp dụng" (chỉ bước tùy chọn). */
export const laTuyChon = (ma: string) => !!CAC_BUOC.find((b) => b.ma === ma)?.tuyChon;

/** Tiến độ của hộ trên các bước áp dụng: số bước xong / số bước áp dụng (bỏ bước "không áp dụng"). */
export function tienDoHo(ho: Pick<Ho, "tienDo">): { xong: number; apDung: number; tyLe: number } {
  const apDung = CAC_BUOC.filter((b) => ho.tienDo[b.ma]?.trangThai !== "KHONG_AP_DUNG");
  const xong = apDung.filter((b) => ho.tienDo[b.ma]?.trangThai === "XONG").length;
  return { xong, apDung: apDung.length, tyLe: apDung.length ? xong / apDung.length : 1 };
}

/** Bước hiện tại của hộ: bước đầu tiên chưa hoàn thành (bỏ qua bước không áp dụng). */
export function buocHienTai(ho: Ho): number {
  const i = CAC_BUOC.findIndex((b) => !daQuaBuoc(ho.tienDo[b.ma]?.trangThai));
  return i < 0 ? CAC_BUOC.length : i;
}

export type { ThuaBanDo };
