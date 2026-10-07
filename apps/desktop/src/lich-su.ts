/**
 * So sánh hai bản của hồ sơ theo từng trường — hiển thị "từ … thành …" trong lịch sử thay đổi (P1-5).
 * Máy chủ / kho lưu nguyên bản cũ; phần so sánh làm ở đây nên các bản lưu trước khi có tính năng này cũng xem được.
 */
import { TEN_TRANG_THAI_BUOC, TEN_DOI_TUONG, type Ho, type TrangThaiBuoc, type LoaiDoiTuong } from "./mo-hinh";
import { hienSo, laSoMay } from "./so";

export interface KhacBiet {
  truong: string;
  tu: string;
  thanh: string;
  /** Khóa ổn định của ô (vd. "thua:<id>.dienTichThuHoi", "ten") — lọc lịch sử theo ô (§11.5). */
  khoa: string;
}

const NHAN: Record<string, string> = {
  ma: "Mã hồ sơ", ten: "Họ tên / tên tổ chức", loai: "Đối tượng", diaChi: "Địa chỉ", soDinhDanh: "Số định danh", dienThoai: "Điện thoại",
  khauTru: "Khấu trừ", vuongMac: "Vướng mắc", banGiao: "Bàn giao mặt bằng", daXoa: "Thùng rác", chiTra: "Chi trả", vanBan: "Văn bản đã ban hành",
  hoTro: "Hỗ trợ", tienDo: "Tiến độ",
  soTo: "tờ", soThua: "số thửa", loaiDat: "loại đất", dienTich: "diện tích", dienTichThuHoi: "DT thu hồi", nguonGoc: "nguồn gốc", phapLy: "pháp lý",
  gia: "giá đất", giaNghinDong: "giá (nghìn đ/m²)", phanLop: "phân lớp", gcn: "GCN", cayXen: "cây trồng xen", khongBoiThuong: "không bồi thường về đất", ghiChu: "ghi chú",
  donGia: "đơn giá", soLuong: "số lượng", khoiLuong: "khối lượng", heSo: "hệ số", maDonGia: "mã đơn giá", donVi: "đơn vị", dot: "đợt", matDoHa: "mật độ", canCu: "căn cứ",
  hoTen: "họ tên", namSinh: "năm sinh", quanHe: "quan hệ", trangThai: "trạng thái", ngay: "ngày", guiBoi: "gửi bởi", duyetBoi: "xác nhận bởi",
  onDinh: "ổn định đời sống", dienTichNNDangSuDung: "DT đất NN đang sử dụng", chuyenDoiNghe: "chuyển đổi nghề", tamCu: "tạm cư", soThang: "số tháng",
  taiDinhCu: "tái định cư", hinhThuc: "hình thức", noiDung: "nội dung", lyDo: "lý do", bienBan: "biên bản",
  dotId: "Đợt thu hồi", phuTrach: "Cán bộ phụ trách", khac: "hỗ trợ khác", doiTuongCs: "đối tượng chính sách", muc: "mức", hoNgheo: "hộ nghèo", xayLaiNha: "xây lại nhà", vm17: "VM-17", soTien: "số tiền", xacNhan: "xác nhận", taiSanGocId: "nhà, công trình gốc", cayK7: "cây trồng khoản 7", lyTrinh: "lý trình", chenhLech: "chênh lệch giá đất (k8, k10)", giaHienTrang: "giá đất hiện trạng", k3: "mốc xây dựng (k3)", ngayXayDung: "ngày xây dựng", chonMoc: "mức chọn khi trùng mốc", onDinhSanXuat: "ổn định sản xuất (Đ13 k1 PL II; k5)", chiPhiDauTu: "chi phí đầu tư vào đất còn lại (Đ3 PL II)", khongGiayTo: "bồi thường đất không có giấy tờ (NĐ 88)", ngaySuDung: "thời điểm sử dụng ổn định", dtXayDung: "DT đã xây dựng", dtSxkd: "DT SXKD", tienSdd: "tiền SDĐ phải nộp", truongHopNN: "trường hợp Điều 12", hoTroK7: "hỗ trợ khác k7", hanMucDatO: "hạn mức đất ở", congNhan: "hạn mức công nhận", hanhLang: "hành lang bảo vệ an toàn (Đ7 PL II)", nhomDat: "nhóm đất", conLaiNam: "thời hạn còn lại", thoiHanNam: "thời hạn sử dụng đất", nhaNhaNuoc: "nhà ở thuộc sở hữu nhà nước (Đ11 PL II)", sxkd: "ổn định SXKD (Đ13 PL II)", thuNhap: "thu nhập sau thuế", doanhThu: "doanh thu", dinhMuc: "định mức", coSo: "cơ sở", cachTinh: "cách tính", loId: "lô tái định cư", khuTdc: "khu TĐC", viTriLo: "lô số", dienTichGiao: "DT giao", nguonGia: "văn bản giá",
};
const nhan = (k: string) => NHAN[k] ?? k;

function hien(v: unknown, khoa?: string): string {
  if (v === undefined || v === null || v === "") return "(trống)";
  if (typeof v === "boolean") return v ? "có" : "không";
  if (typeof v === "number") return hienSo(String(v));
  if (typeof v === "string") {
    if (khoa === "trangThai" && v in TEN_TRANG_THAI_BUOC) return TEN_TRANG_THAI_BUOC[v as TrangThaiBuoc];
    if (khoa === "loai" && v in TEN_DOI_TUONG) return TEN_DOI_TUONG[v as LoaiDoiTuong];
    return laSoMay(v) ? hienSo(v) : v;
  }
  const s = JSON.stringify(v);
  return s.length > 120 ? s.slice(0, 117) + "…" : s;
}

const tenPhanTu = (mang: string, x: Record<string, unknown>): string =>
  mang === "thua" ? `Thửa ${x.soThua ?? "?"} tờ ${x.soTo ?? "?"}` : mang === "taiSan" ? `Tài sản "${x.ten ?? "?"}"` : mang === "nhanKhau" ? `Nhân khẩu ${x.hoTen ?? "?"}` : `${nhan(mang)} ${String(x.id ?? "")}`;

function so(duong: string, a: unknown, b: unknown, out: KhacBiet[], khoa: string | undefined, ma: string) {
  if (out.length >= 300 || JSON.stringify(a) === JSON.stringify(b)) return;
  const laDt = (x: unknown) => typeof x === "object" && x !== null && !Array.isArray(x);
  if (laDt(a) && laDt(b)) {
    const oa = a as Record<string, unknown>, ob = b as Record<string, unknown>;
    for (const k of new Set([...Object.keys(oa), ...Object.keys(ob)])) so(duong ? `${duong} › ${nhan(k)}` : nhan(k), oa[k], ob[k], out, k, ma ? `${ma}.${k}` : k);
    return;
  }
  out.push({ truong: duong, tu: hien(a, khoa), thanh: hien(b, khoa), khoa: ma });
}

/** Các thay đổi từ bản `truoc` sang bản `sau` (không tính nhật ký hồ sơ). */
export function khacBiet(truoc: Ho, sau: Ho): KhacBiet[] {
  const out: KhacBiet[] = [];
  const a = truoc as unknown as Record<string, unknown>, b = sau as unknown as Record<string, unknown>;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === "nhatKy" || k === "phienBanCauTruc") continue;
    if (k === "thua" || k === "taiSan" || k === "nhanKhau") {
      const da = (a[k] as Record<string, unknown>[] | undefined) ?? [], db = (b[k] as Record<string, unknown>[] | undefined) ?? [];
      for (const x of da) {
        const y = db.find((z) => z.id === x.id);
        if (!y) out.push({ truong: tenPhanTu(k, x), tu: "có", thanh: "(đã bỏ)", khoa: `${k}:${String(x.id)}` });
        else so(tenPhanTu(k, y), x, y, out, undefined, `${k}:${String(y.id)}`);
      }
      for (const y of db) if (!da.some((x) => x.id === y.id)) out.push({ truong: tenPhanTu(k, y), tu: "(chưa có)", thanh: "thêm mới", khoa: `${k}:${String(y.id)}` });
      continue;
    }
    if (k === "tienDo") {
      const ta = (a[k] as Record<string, unknown>) ?? {}, tb = (b[k] as Record<string, unknown>) ?? {};
      for (const ma of new Set([...Object.keys(ta), ...Object.keys(tb)])) so(`Bước ${ma}`, ta[ma], tb[ma], out, undefined, `tienDo.${ma}`);
      continue;
    }
    so(nhan(k), a[k], b[k], out, k, k);
  }
  return out;
}

/** Thay đổi thuộc ô `khoa` (chính ô đó hoặc ô con của nó, vd. "thua:<id>" gồm mọi trường của thửa). */
export const thuocO = (k: KhacBiet, khoa: string) => k.khoa === khoa || k.khoa.startsWith(`${khoa}.`) || (khoa.includes(".") && khoa.startsWith(`${k.khoa}.`) && /^(thua|taiSan|nhanKhau):[^.]+$/.test(k.khoa));
