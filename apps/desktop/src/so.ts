/**
 * Quy ước số của phần mềm (QD-25, người dùng chốt 28/9/2026 — theo quy ước Việt Nam):
 * - NHẬP / HIỂN THỊ: dấu chấm phân cách nghìn, dấu phẩy thập phân ("1.234,5"; "20.000" = hai mươi nghìn);
 * - LƯU: chuỗi chuẩn máy ("1234.5") — lõi tính (Decimal) chỉ nhận dạng này.
 * Danh mục trường số của hồ sơ, dự án dùng chung cho: kiểm tra trước khi tính (P0-1), ô nhập số (P0-2),
 * chuyển đổi dữ liệu cũ (P0-2).
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";

/** Chuỗi chuẩn máy: -1234.5 */
export const laSoMay = (s: string) => /^-?\d+(\.\d+)?$/.test(s.trim());

/** Decimal của chuỗi chuẩn máy; giá trị trống/không hợp lệ → 0 (dùng cho hiển thị, cộng dồn; lỗi đã được tinhHo báo). */
export const soD = (v?: string | number | null): Decimal => (typeof v === "number" ? D(v) : v && laSoMay(v) ? D(v.trim()) : D(0));

/**
 * Đọc số người dùng gõ theo quy ước Việt Nam. Trả `so` dạng chuẩn máy, hoặc `loi`.
 * Nhận: "20000", "20.000", "1.234,5", "9222,1", "-5", khoảng trắng bất kỳ.
 * Từ chối: "9222.1" (dấu chấm không đúng nhóm nghìn — phần thập phân dùng dấu phẩy), "1,2,3", chữ.
 */
export function docSoNhap(vao: string): { so: string | null; loi: string | null } {
  const s = vao.replace(/[\s ]/g, "");
  if (!s) return { so: null, loi: null };
  const m = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/.exec(s);
  if (m) {
    const nguyen = m[2]!.replace(/\./g, "").replace(/^0+(?=\d)/, "");
    return { so: `${m[1]}${nguyen}${m[3] ? `.${m[3]}` : ""}`, loi: null };
  }
  if (/^-?\d+\.\d+$/.test(s)) return { so: null, loi: `"${vao.trim()}": dấu chấm là phân cách nghìn — phần thập phân dùng dấu phẩy (vd. ${s.replace(".", ",")})` };
  return { so: null, loi: `"${vao.trim()}" không phải số` };
}

/** Hiển thị chuỗi chuẩn máy theo kiểu Việt Nam: "1234.5" → "1.234,5". Giá trị không phải chuẩn máy giữ nguyên. */
export function hienSo(may: string | null | undefined, soLe?: number): string {
  if (may == null) return "";
  const s = String(may).trim();
  if (!laSoMay(s)) return s;
  let [nguyen, le = ""] = s.replace(/^-/, "").split(".");
  if (soLe != null) le = le.slice(0, soLe);
  const nhom = nguyen!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s.startsWith("-") ? "-" : ""}${nhom}${le ? `,${le}` : ""}`;
}

/** Một trường số trong bản ghi: nhãn để báo lỗi, giá trị đang lưu, hàm ghi (trên bản sao). */
export interface TruongSo {
  nhan: string;
  gt: string;
  dat: (v: string) => void;
}

const them = (ds: TruongSo[], nhan: string, obj: object | null | undefined, khoa: string) => {
  if (!obj) return;
  const o = obj as Record<string, unknown>;
  const v = o[khoa];
  if (typeof v !== "string") return;
  ds.push({ nhan, gt: v, dat: (x) => (o[khoa] = x) });
};

/**
 * Các trường số dạng chuỗi của hồ sơ (không gồm ô khối lượng/số lượng — ô đó nhận biểu thức "=5+6+3", đọc bằng bieu-thuc.ts).
 * `dat` sửa trực tiếp đối tượng truyền vào — gọi trên bản sao.
 */
export function truongSoHo(h: Ho): TruongSo[] {
  const ds: TruongSo[] = [];
  for (const t of h.thua) {
    const n = `Thửa ${t.soThua || "?"}, tờ ${t.soTo || "?"}`;
    them(ds, `${n} — diện tích thửa`, t, "dienTich");
    them(ds, `${n} — DT thu hồi`, t, "dienTichThuHoi");
    them(ds, `${n} — giá đất (nghìn đ/m²)`, t.gia, "giaNghinDong");
    for (const [i, l] of (t.phanLop?.lop ?? []).entries()) {
      them(ds, `${n} — phân lớp ${i + 1}: diện tích`, l, "dienTich");
      them(ds, `${n} — phân lớp ${i + 1}: giá tùy chỉnh`, l, "giaTuyChinh");
    }
    them(ds, `${n} — DT trên GCN`, t.gcn, "dienTich");
    them(ds, `${n} — DT thu hồi có GCN`, t.gcn, "dtThuHoiCoGcn");
    them(ds, `${n} — DT trừ (trồng xen)`, t.cayXen, "dienTichTru");
  }
  for (const ts of h.taiSan) {
    const n = `Tài sản "${ts.ten || "?"}"`;
    if (ts.loai === "NHA_CT") {
      them(ds, `${n} — đơn giá`, ts, "donGia");
      them(ds, `${n} — hệ số`, ts, "heSo");
      them(ds, `${n} — T (năm)`, ts, "T");
      them(ds, `${n} — T1 (năm)`, ts, "T1");
    } else if (ts.loai === "CAY") {
      them(ds, `${n} — đơn giá`, ts, "donGia");
      them(ds, `${n} — mật độ (cây/ha)`, ts, "matDoHa");
    } else if (ts.loai === "VAT_NUOI") {
      them(ds, `${n} — quãng đường (km)`, ts, "quangDuongKm");
    } else {
      them(ds, `${n} — hệ số`, ts, "heSo");
      them(ds, `${n} — đơn giá`, ts, "donGia");
    }
  }
  them(ds, "Hỗ trợ ổn định đời sống — DT đất NN đang sử dụng", h.hoTro.onDinh, "dienTichNNDangSuDung");
  const tdc = h.hoTro.taiDinhCu;
  if (tdc) {
    them(ds, "Tái định cư — DT giao", tdc, "dienTichGiao");
    them(ds, "Tái định cư — đơn giá", tdc, "donGia");
    them(ds, "Tái định cư — tiền SDĐ phải nộp", tdc, "tienSddPhaiNop");
    for (const k of tdc.khoanKhac) them(ds, `Tái định cư — khoản "${k.noiDung || "?"}"`, k, "soTien");
  }
  them(ds, "Khấu trừ", h, "khauTru");
  return ds;
}

export function truongSoDuAn(d: DuAn): TruongSo[] {
  const ds: TruongSo[] = [];
  them(ds, "Dự án — giá gạo (đ/kg)", d.giaGao, "dongKg");
  them(ds, "Dự án — hạn mức giao đất NN (m²)", d.hanMucNN, "m2");
  them(ds, "Dự án — hệ số điều chỉnh giá đất", d.heSoGiaDat, "heSo");
  return ds;
}

/** Trường có giá trị nhưng không phải chuẩn máy (không tính được). */
export const truongLoi = (ds: TruongSo[]) => ds.filter((x) => x.gt.trim() !== "" && !laSoMay(x.gt));
