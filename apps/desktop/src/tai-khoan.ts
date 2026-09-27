/**
 * Tài khoản, vai trò, quyền (docs/06 QD-22). Lưu trên máy; mật khẩu băm PBKDF2-SHA256 (không lưu mật khẩu).
 *
 * GIỚI HẠN: đây là phân quyền mức ứng dụng để phân định trách nhiệm, tránh thao tác nhầm và ghi nhật ký
 * người thực hiện. Dữ liệu trên máy không mã hóa; người có quyền quản trị Windows/đọc được thư mục dữ liệu
 * vẫn có thể can thiệp ngoài phần mềm (nhật ký hệ thống có mã băm nối tiếp để PHÁT HIỆN sửa, không ngăn được).
 */
export type VaiTro = "QUAN_TRI" | "LANH_DAO" | "CAN_BO" | "XEM";

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  QUAN_TRI: "Quản trị",
  LANH_DAO: "Lãnh đạo, kiểm tra",
  CAN_BO: "Cán bộ nghiệp vụ",
  XEM: "Chỉ xem",
};

export const MO_TA_VAI_TRO: Record<VaiTro, string> = {
  QUAN_TRI: "Toàn quyền; quản lý tài khoản; khôi phục dữ liệu",
  LANH_DAO: "Như cán bộ + duyệt bước, chốt/ghi nhận phê duyệt/hủy phương án, thay mẫu văn bản, xóa dự án, cài đặt chung",
  CAN_BO: "Nhập, sửa hồ sơ, kiểm đếm, bản đồ, nhập Excel, soạn văn bản, gửi duyệt, sao lưu",
  XEM: "Chỉ xem, tra cứu, xuất Excel/văn bản; không sửa dữ liệu",
};

export type Quyen =
  | "SUA_HO_SO"
  | "XOA_DU_AN"
  | "SOAN_VAN_BAN"
  | "THAY_MAU"
  | "GUI_DUYET"
  | "DUYET_BUOC"
  | "CHOT_PA"
  | "PHE_DUYET_PA"
  | "HUY_PA"
  | "SAO_LUU"
  | "KHOI_PHUC"
  | "TAI_KHOAN"
  | "XEM_NHAT_KY"
  | "CAI_DAT";

export const TEN_QUYEN: Record<Quyen, string> = {
  SUA_HO_SO: "Nhập, sửa dự án, hồ sơ, kiểm đếm, bản đồ; nhập Excel",
  XOA_DU_AN: "Xóa dự án",
  SOAN_VAN_BAN: "Soạn văn bản (ghi số, ngày vào hồ sơ)",
  THAY_MAU: "Thay mẫu văn bản gốc",
  GUI_DUYET: "Gửi duyệt bước",
  DUYET_BUOC: "Xác nhận hoàn thành bước",
  CHOT_PA: "Chốt phương án",
  PHE_DUYET_PA: "Ghi nhận phê duyệt phương án",
  HUY_PA: "Hủy bản phương án",
  SAO_LUU: "Tạo bản sao lưu",
  KHOI_PHUC: "Khôi phục dữ liệu",
  TAI_KHOAN: "Quản lý tài khoản",
  XEM_NHAT_KY: "Xem nhật ký hệ thống",
  CAI_DAT: "Cài đặt chung (lịch ngày nghỉ, tự động sao lưu)",
};

const CAN_BO: Quyen[] = ["SUA_HO_SO", "SOAN_VAN_BAN", "GUI_DUYET", "SAO_LUU"];
const LANH_DAO: Quyen[] = [...CAN_BO, "XOA_DU_AN", "THAY_MAU", "DUYET_BUOC", "CHOT_PA", "PHE_DUYET_PA", "HUY_PA", "XEM_NHAT_KY", "CAI_DAT"];
export const QUYEN_THEO_VAI_TRO: Record<VaiTro, Quyen[]> = {
  QUAN_TRI: Object.keys(TEN_QUYEN) as Quyen[],
  LANH_DAO,
  CAN_BO,
  XEM: [],
};

export const coQuyen = (vt: VaiTro | undefined | null, q: Quyen) => !!vt && QUYEN_THEO_VAI_TRO[vt].includes(q);

export interface NguoiDung {
  /** Tên đăng nhập (khóa), chữ thường không dấu. */
  ten: string;
  hoTen: string;
  chucVu: string;
  vaiTro: VaiTro;
  hoatDong: boolean;
  muoi: string;
  vongLap: number;
  bam: string;
  taoLuc: string;
  /** Quản trị đặt lại mật khẩu → buộc đổi ở lần đăng nhập sau. */
  phaiDoiMatKhau?: boolean;
  dangNhapCuoi?: string;
}

export class LoiTaiKhoan extends Error {}

const VONG_LAP = 210_000;
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const tuHex = (s: string) => new Uint8Array(s.match(/../g)!.map((x) => parseInt(x, 16)));

async function pbkdf2(matKhau: string, muoi: Uint8Array, vongLap: number): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(matKhau), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: muoi as Uint8Array<ArrayBuffer>, iterations: vongLap }, k, 256));
}

export function kiemTraTenDangNhap(ten: string): string | null {
  if (!/^[a-z0-9._-]{3,32}$/.test(ten)) return "Tên đăng nhập 3–32 ký tự: chữ thường không dấu, số, dấu chấm, gạch";
  return null;
}

export function kiemTraMatKhau(mk: string, ten = ""): string | null {
  if (mk.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (!/[A-Za-zÀ-ỹ]/.test(mk) || !/\d/.test(mk)) return "Mật khẩu phải có cả chữ và số";
  if (ten && mk.toLowerCase().includes(ten.toLowerCase())) return "Mật khẩu không được chứa tên đăng nhập";
  return null;
}

export async function datMatKhau(u: Omit<NguoiDung, "muoi" | "vongLap" | "bam">, matKhau: string, vongLap = VONG_LAP): Promise<NguoiDung> {
  const l = kiemTraMatKhau(matKhau, u.ten);
  if (l) throw new LoiTaiKhoan(l);
  const muoi = crypto.getRandomValues(new Uint8Array(16));
  return { ...u, muoi: hex(muoi), vongLap, bam: await pbkdf2(matKhau, muoi, vongLap) };
}

export async function dungMatKhau(u: NguoiDung, matKhau: string): Promise<boolean> {
  const b = await pbkdf2(matKhau, tuHex(u.muoi), u.vongLap);
  // so sánh đủ độ dài (không dừng sớm)
  let khac = b.length ^ u.bam.length;
  for (let i = 0; i < Math.min(b.length, u.bam.length); i++) khac |= b.charCodeAt(i) ^ u.bam.charCodeAt(i);
  return khac === 0;
}

export async function taoTaiKhoan(
  ds: NguoiDung[],
  vao: { ten: string; hoTen: string; chucVu: string; vaiTro: VaiTro; matKhau: string },
  vongLap = VONG_LAP,
): Promise<NguoiDung> {
  const ten = vao.ten.trim().toLowerCase();
  const l = kiemTraTenDangNhap(ten);
  if (l) throw new LoiTaiKhoan(l);
  if (ds.some((u) => u.ten === ten)) throw new LoiTaiKhoan(`Tên đăng nhập "${ten}" đã có`);
  if (!vao.hoTen.trim()) throw new LoiTaiKhoan("Chưa nhập họ tên");
  return datMatKhau({ ten, hoTen: vao.hoTen.trim(), chucVu: vao.chucVu.trim(), vaiTro: vao.vaiTro, hoatDong: true, taoLuc: new Date().toISOString() }, vao.matKhau, vongLap);
}

/** Không để hệ thống mất tài khoản quản trị đang hoạt động cuối cùng. */
export function kiemTraThayDoi(ds: NguoiDung[], moi: NguoiDung): string | null {
  const sau = ds.map((u) => (u.ten === moi.ten ? moi : u));
  if (!sau.some((u) => u.hoatDong && u.vaiTro === "QUAN_TRI")) return "Phải còn ít nhất một tài khoản Quản trị đang hoạt động";
  return null;
}

/** Xác nhận bước: người gửi duyệt không tự xác nhận (tách người lập – người duyệt). */
export function kiemTraDuyetBuoc(vt: VaiTro, tenNguoi: string, buoc: { trangThai: string; guiBoi?: string }): string | null {
  if (!coQuyen(vt, "DUYET_BUOC")) return "Tài khoản không có quyền xác nhận hoàn thành bước — dùng \"Gửi duyệt\"";
  if (buoc.trangThai === "CHO_DUYET" && buoc.guiBoi === tenNguoi) return "Người gửi duyệt không tự xác nhận bước của mình — cần người khác có quyền duyệt";
  return null;
}

export const tenHienThi = (u: NguoiDung | null) => (u ? `${u.hoTen}${u.chucVu ? ` (${u.chucVu})` : ""}` : "—");
