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
  /** Mã thửa trên bản đồ (T{tờ}-{thửa}), nếu tạo từ bản đồ. */
  maBanDo?: string;
  dienTichBanDo?: number;
  cayXen?: { dienTichTru: string; lyDoTru: string; cachXep: "DUNG_KHI_VUOT" | "LAP_DAY" };
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
}

export type TrangThaiBuoc = "CHUA" | "DANG" | "XONG" | "CHO_DUYET";

export interface BuocHo {
  trangThai: TrangThaiBuoc;
  ngay?: string;
  ghiChu?: string;
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
  /** Vướng mắc cần ưu tiên xử lý (khiếu nại, chưa nhận tiền, tranh chấp…), do cán bộ ghi. */
  vuongMac?: { noiDung: string; ngay: string } | null;
}

export interface BanDoDuAn {
  tenTep: string;
  ngayNhap: string;
  /** Vùng ranh GPMB cán bộ đã chọn (mã vùng ứng viên). */
  vungChon: string | null;
}

export interface DuAn {
  id: string;
  ten: string;
  xa: string;
  chuDauTu: string;
  canCuThuHoi: string;
  ngayThongBao: string;
  boChinhSach: string;
  giaGao: { dongKg: string; nguon: string } | null;
  hanMucNN: { m2: string; canCu: string } | null;
  heSoGiaDat: { heSo: string; vanBan: string } | null;
  banDo: BanDoDuAn | null;
  /** Kế hoạch hoàn thành từng bước (ngày ISO) do cán bộ nhập để theo dõi, cảnh báo chậm tiến độ. */
  keHoach?: Record<string, string>;
  taoLuc: string;
}

/** 16 bước theo Sổ tay QĐ 1966/QĐ-UBND (docs/05). */
export const CAC_BUOC: { ma: string; ten: string; thoiHan?: string; mau?: string; canCu: string }[] = [
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
  { ma: "14", ten: "Cưỡng chế (nếu có)", mau: "22", canCu: "Đ89 LĐĐ" },
  { ma: "15", ten: "Chỉnh lý hồ sơ địa chính", thoiHan: "≤ 3 NLV sau chi trả", canCu: "Mục XVIII Sổ tay" },
  { ma: "16", ten: "Quản lý đất đã thu hồi", canCu: "k5 Đ86 LĐĐ" },
];

export const TEN_TRANG_THAI_BUOC: Record<TrangThaiBuoc, string> = {
  CHUA: "Chưa thực hiện",
  DANG: "Đang thực hiện",
  CHO_DUYET: "Chờ duyệt",
  XONG: "Hoàn thành",
};

export function taoId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Bước hiện tại của hộ: bước đầu tiên chưa hoàn thành. */
export function buocHienTai(ho: Ho): number {
  const i = CAC_BUOC.findIndex((b) => ho.tienDo[b.ma]?.trangThai !== "XONG");
  return i < 0 ? CAC_BUOC.length : i;
}

export type { ThuaBanDo };
