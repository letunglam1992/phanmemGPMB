/**
 * Thiết lập đơn vị (Công cụ → Thiết lập đơn vị): cơ quan, tổ chức sử dụng phần mềm và các cơ quan thường gặp
 * khi soạn văn bản (UBND xã, đơn vị làm nhiệm vụ bồi thường – Ban QLDA, TT phát triển quỹ đất…, phòng chuyên môn).
 * Lưu ở cài đặt chung (khóa "donVi"), đi kèm tệp sao lưu. Thông tin chỉ dùng để điền sẵn — cán bộ vẫn sửa được
 * trên từng văn bản.
 */
export type LoaiDonVi = "UBND" | "DON_VI_BT" | "PHONG" | "CHU_DAU_TU" | "KHAC";

export const TEN_LOAI_DON_VI: Record<LoaiDonVi, string> = {
  UBND: "Ủy ban nhân dân xã, phường",
  DON_VI_BT: "Đơn vị, tổ chức làm nhiệm vụ bồi thường, GPMB (Ban QLDA, TT phát triển quỹ đất…)",
  PHONG: "Phòng chuyên môn",
  CHU_DAU_TU: "Chủ đầu tư",
  KHAC: "Khác",
};

export interface DonVi {
  id: string;
  loai: LoaiDonVi;
  /** Tên đầy đủ, vd. "Ủy ban nhân dân xã Chiềng Mung", "Ban Quản lý dự án đầu tư xây dựng tỉnh". */
  ten: string;
  /** Cơ quan cấp trên (dòng trên tên cơ quan ở tiêu đề văn bản), vd. "ỦY BAN NHÂN DÂN TỈNH SƠN LA". */
  capTren: string;
  /** Chữ viết tắt dùng trong ký hiệu văn bản, vd. "UBND", "BQLDA", "KT". */
  kyHieu: string;
  /** Địa danh ghi ở dòng ngày tháng, vd. "Chiềng Mung". */
  diaDanh: string;
  diaChi: string;
  dienThoai: string;
  email: string;
  /** Quyền hạn, chức vụ người ký (có thể 2 dòng: "KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH"). */
  quyenHan: string;
  nguoiKy: string;
  /** Đơn vị đang sử dụng phần mềm (hiện trên thanh tiêu đề, điền sẵn báo cáo). Chỉ một đơn vị. */
  suDung?: boolean;
}

export const KHOA_DON_VI = "donVi";

export function donViMoi(loai: LoaiDonVi = "UBND"): DonVi {
  return {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
    loai, ten: "", capTren: loai === "UBND" || loai === "DON_VI_BT" ? "ỦY BAN NHÂN DÂN TỈNH SƠN LA" : "", kyHieu: loai === "UBND" ? "UBND" : "",
    diaDanh: "", diaChi: "", dienThoai: "", email: "",
    quyenHan: loai === "UBND" ? "CHỦ TỊCH" : loai === "PHONG" ? "TRƯỞNG PHÒNG" : loai === "DON_VI_BT" ? "GIÁM ĐỐC" : "", nguoiKy: "",
  };
}

export const donViSuDung = (ds: DonVi[]) => ds.find((d) => d.suDung) ?? null;
const dauTien = (ds: DonVi[], loai: LoaiDonVi) => ds.find((d) => d.loai === loai && d.suDung) ?? ds.find((d) => d.loai === loai) ?? null;

/** Kiểm tra trước khi lưu: tên bắt buộc, không trùng tên cùng loại, tối đa một đơn vị sử dụng. */
export function kiemTraDonVi(ds: DonVi[]): string[] {
  const loi: string[] = [];
  ds.forEach((d, i) => { if (!d.ten.trim()) loi.push(`Dòng ${i + 1}: chưa nhập tên đơn vị`); });
  const khoa = ds.map((d) => `${d.loai}|${d.ten.trim().toLocaleLowerCase("vi")}`);
  khoa.forEach((k, i) => { if (k.split("|")[1] && khoa.indexOf(k) !== i) loi.push(`Dòng ${i + 1}: trùng tên với dòng ${khoa.indexOf(k) + 1}`); });
  if (ds.filter((d) => d.suDung).length > 1) loi.push("Chỉ chọn một đơn vị sử dụng phần mềm");
  return loi;
}

/**
 * Trường thông tin chung của văn bản (van-ban/du-lieu.ts) điền từ danh sách đơn vị: đơn vị bồi thường, phòng chuyên môn,
 * người ký UBND. Trường trống ở đơn vị không ghi đè.
 */
export function truongVanBanTuDonVi(ds: DonVi[]): Record<string, string> {
  const out: Record<string, string> = {};
  const dat = (k: string, v: string | undefined) => { if (v && v.trim()) out[k] = v.trim(); };
  const ub = dauTien(ds, "UBND");
  if (ub) { dat("quyen_han", ub.quyenHan); dat("nguoi_ky", ub.nguoiKy); }
  const bt = dauTien(ds, "DON_VI_BT");
  if (bt) {
    dat("ten_don_vi_bt", bt.ten); dat("co_quan_cap_tren_bt", bt.capTren.toUpperCase()); dat("ky_hieu_don_vi", bt.kyHieu);
    dat("quyen_han_don_vi", bt.quyenHan); dat("nguoi_ky_don_vi", bt.nguoiKy);
  }
  const ph = dauTien(ds, "PHONG");
  if (ph) { dat("ten_phong", ph.ten); dat("ky_hieu_phong", ph.kyHieu); dat("quyen_han_phong", ph.quyenHan); dat("nguoi_ky_phong", ph.nguoiKy); }
  return out;
}
