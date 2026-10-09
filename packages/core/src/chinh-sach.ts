import type { CanCu } from "./types";
import type { KhoangThoiGian } from "./moc-thoi-gian";
import type { CachLamTron } from "./so";

export type MaNongLamTruong = "9.1.a" | "9.1.b" | "9.1.c" | "9.2.a" | "9.2.b";

/** Bộ chính sách: toàn bộ tham số có căn cứ, tách khỏi mã nguồn (P1, P2 – docs/00). */
export interface BoChinhSach {
  ma: string;
  ten: string;
  hieuLucTu: string;
  hieuLucDen: string | null;
  trangThai: "DU_THAO" | "CHO_DUYET" | "DA_DUYET" | "HET_HIEU_LUC";
  lamTron: { dienTichSoLe: number; tienBuoc: number; cach: CachLamTron; capLamTron: "HO"; canCu: CanCu[] };
  nhaCongTrinh: { tyLeCongThem: string; san: string; tran: string; canCu: CanCu[] };
  hoTroNhaDatDuDieuKienSaiMucDich: BangMoc;
  hoTroNhaDatKhongDuDieuKien: BangMoc;
  hoTroThaoDoCoViPham: BangMoc;
  vatNuoi: {
    nguongKm: string;
    canCu: CanCu[];
    donGia: Record<LoaiDuong, Record<LoaiVatNuoi, { donVi: "tấn" | "kg"; den5km: string; tren5km: string }>>;
  };
  cayTrong: { tyLeVuotMatDo: string; tyLePhanVuot: string; tyLeTreTrucBuiToiDa: string; canCu: CanCu[] };
  /** B13 – đất nguồn gốc nông, lâm trường (k9 Đ6 QĐ 14/2026). Không có → bộ chính sách không hỗ trợ B13. */
  nongLamTruong?: {
    ghiChu: string;
    truongHop: Record<
      MaNongLamTruong,
      {
        ten: string;
        /** Số lần giá đất NN theo bảng giá; null = chưa tính tự động (cán bộ nhập). */
        datLan: string | null;
        tenKhoanDat: string;
        /** HO_TRO_100: cây trồng hỗ trợ 100% đơn giá bồi thường; THEO_BOI_THUONG: văn bản không quy định riêng. */
        cayTrong: "HO_TRO_100" | "THEO_BOI_THUONG";
        canCu: CanCu[];
        /** Ghi chú căn cứ chuyển đổi nghề (vd. 9.1.b: văn bản ghi Điều 15, đơn vị áp dụng Điều 14 PL II — QD-29). */
        ghiChuChuyenDoiNghe?: string;
      }
    >;
  };
  moMa: { canCu: CanCu[]; mucXay: string; mucKhongXay: string };
  /**
   * Các trường hợp hỗ trợ khác (Điều 6 QĐ 14/2026): k1 hộ có đối tượng chính sách phải di chuyển chỗ ở (cán bộ chọn mức,
   * nhiều đối tượng chỉ hưởng mức cao nhất); k2 hộ nghèo; k6 ổn định đời sống khi phá dỡ nhà, làm lại nơi khác.
   * Không có → bộ chính sách không có các khoản này (tính "Thiếu căn cứ").
   */
  hoTroKhac?: {
    doiTuongChinhSach: { mucs: string[]; diem?: { ma: string; ten: string; muc: string; canCu: CanCu[] }[]; canCu: CanCu[]; ghiChu: string };
    hoNgheo: { soTien: string; canCu: CanCu[]; dieuKien: string };
    xayLaiNha: { kgGaoNhanKhauThang: string; soThang: number; canCu: CanCu[]; dieuKien: string; nhanKhau?: string };
    /** k7: cây trồng không đủ điều kiện bồi thường — a) đất đủ điều kiện nhưng sai mục đích; b) đất không đủ điều kiện. */
    cayKhongDuDieuKien?: { tyLeA: string; canCuA: CanCu[]; tyLeB: string; canCuB: CanCu[]; dieuKien: string };
    /** k8, k10: hỗ trợ chênh lệch giá đất và chuyển đổi nghề theo chênh lệch giá. */
    chenhLechDat?: { canCuK8: CanCu[]; canCuK8b: CanCu[]; canCuK10: CanCu[]; ghiChu: string };
    /** k5: ổn định sản xuất như khoản 1 Điều 13 PL II QĐ 106 — mức theo định mức, cán bộ nhập. */
    onDinhSanXuat?: { canCu: CanCu[]; dieuKien: string[] };
  };
  onDinhDoiSong: {
    kgGaoNhanKhauThang: string;
    canCu: CanCu[];
    nhom: NhomOnDinh[];
    nguongTuyChinh: { giaTri: string; nhomLuaChon: string[]; macDinh: string; ghiChu: string }[];
  };
  tamCu: {
    canCu: CanCu[];
    congThemMoiKhau: string;
    mocKhauCoSo: number;
    ghiChuCachTinh: string;
    nhomDiaBan: Record<string, { den2Khau: string; den4Khau: string }>;
    phanNhom: Record<string, string[]>;
    thangThemTdcBangDat: number;
  };
  giaDat: {
    canCu: CanCu[];
    thuTuDieuChinh: string;
    phanLop: Record<"DAT_O" | "PNN", { mocMet: number[]; tyLeSoVoiLopTruoc: string; canCu: string }>;
    matTiepGiap: { tyLeMoiMat: Record<LoaiMatTiepGiap, string>; haiMatDuong: string; toiDa: string; canCu: string; ghiChu: string };
    giamChenhCao: { nguongMet: string; heSo: string; canCu: string };
    duongDat: { heSo: string; apDungViTri: number[]; canCu: string };
    datNNXenKep: { heSo: string; canCu: string };
  };
  /** Hỗ trợ tái định cư (Đ111 LĐĐ 2024; Đ23, Đ24 NĐ 88/2024; Đ10, Đ16 PL II QĐ 106; k11 Đ6 QĐ 14/2026). */
  taiDinhCu?: {
    ghiChu: string;
    tuLoChoO: { canCu: CanCu[]; mucTheoNhom: Record<string, string>; phanNhom: Record<string, string[]>; ghiChuPhanNhom: string };
    suatToiThieu: { canCu: CanCu[]; datOPhuongM2: string; datOXaM2: string; nhaOM2: string };
    hoTroTienSdd: { canCu: CanCu[]; tyLe: string; ghiChu: string; /** QĐ 64/2026: không áp dụng khi giao đất có thu tiền theo k4 Đ111 LĐĐ */ ngoaiTruK4D111?: boolean; ghiChuNgoaiTru?: string };
  };
  /** Tham số Phụ lục II QĐ 106/2025 còn hiệu lực (Điều 3, 7, 11, 13) — xem phu-luc-ii.ts. */
  phuLucII?: {
    ghiChu: string;
    chiPhiDauTu: { lanGiaDat: string; canCu: CanCu[] };
    hanhLangDien: { O_PNN: string; CLN_RSX: string; HNK: string; canCu: CanCu[] };
    hanhLangKhac: { tyLe: string; canCu: CanCu[] };
    hanhLangNha: { tyLe: string; canCu: CanCu[] };
    onDinhSanXuatDat: { soVu: number; tyLeHangNam: string; tyLeLauNam: string; dtToiDaLauNamM2: string; canCu: CanCu[] };
    onDinhSxkd: { tyLeThuNhap: string; tyLeTamThoi: string; nguongDoanhThu: string; mucDuoiNguong: string; mucTrenNguong: string; canCuK2: CanCu[]; canCuK3: CanCu[]; canCuK4: CanCu[] };
    nhaSoHuuNhaNuoc: { thangToiDa: number; den2Khau: string; den4Khau: string; congThemMoiKhau: string; tyLeTuLo: string; canCu: CanCu[] };
  };
  /** Hạn mức Phụ lục I QĐ 106/2025 (Điều 3–7) — xem han-muc.ts. Không có → cán bộ nhập hạn mức kèm căn cứ. */
  hanMucPl1?: {
    ghiChu: string;
    congNhanTruoc1980: { xa: Record<"TRUNG_TAM" | "DUONG_XA" | "CON_LAI", string>; phuong: Record<"TRUNG_TAM" | "CON_LAI", string>; canCu: CanCu[] };
    congNhanTruoc1993: { xa: Record<"TRUNG_TAM" | "DUONG_XA" | "CON_LAI", string>; phuong: Record<"TRUNG_TAM" | "CON_LAI", string>; canCu: CanCu[] };
    giaoNongThon: { TRUNG_TAM: string; DUONG_XA: string; CON_LAI: string; canCu: CanCu[] };
    giaoDoThi: { TRUNG_TAM: string; CON_LAI: string; canCu: CanCu[] };
    khaiHoang: { hangNamNts: string; lauNam: { xa: string; phuong: string }; rung: { xa: string; phuong: string }; canCu: CanCu[] };
  };
  /**
   * Diện tích tối thiểu được tách thửa (Điều 13–16 Phụ lục I QĐ 106/2025) — dùng cảnh báo phần đất còn lại sau thu hồi
   * (docs/08 §9.2). Chỉ nhập khi có nguyên văn; không có → phần mềm báo "Thiếu căn cứ" hoặc dùng ngưỡng cán bộ nhập cho dự án.
   */
  tachThuaToiThieu?: {
    ghiChu: string;
    muc: {
      ma: string;
      moTa: string;
      loaiDat: string[];
      khuVuc?: "XA" | "PHUONG";
      /** Vị trí thửa áp dụng (như hạn mức PL I: TRUNG_TAM, DUONG_XA, CON_LAI); trống = mọi vị trí. */
      viTri?: ("TRUNG_TAM" | "DUONG_XA" | "CON_LAI")[];
      dienTich: string;
      /** Cạnh chiều rộng tối thiểu của hình chữ nhật dựng được trong ranh giới thửa (m), nếu văn bản quy định. */
      rongToiThieu?: string;
      /** Lưu ý áp dụng (cách hiểu loại đất, phạm vi đối tượng) — hiện kèm cảnh báo để cán bộ xác nhận. */
      luuY?: string;
      canCu: CanCu[];
    }[];
  };
  chuyenDoiNghe: {
    canCu: CanCu[];
    heSoMacDinh: string;
    heSoTheoNhom: Record<string, string>;
    phanNhom: Record<string, string[]>;
    /**
     * QĐ 64/2026 (sửa Điều 14 PL II QĐ 106/2025): hệ số theo tổ, thôn, bản, tiểu khu nơi có thửa đất; không thuộc danh
     * sách → heSoMacDinh. Có trường này thì phanNhom/heSoTheoNhom không dùng.
     */
    theoThon?: { heSo: string; canCu: string; ds: { xa: string; toanBo?: boolean; thon: string[] }[] }[];
    canCuMacDinh?: string;
    ghiChu?: string;
  };
  /** Điều khoản chuyển tiếp của văn bản sửa đổi (hiện ở màn dự án). */
  chuyenTiep?: { canCu: CanCu[]; noiDung: string; boCu: string };
}

export interface BangMoc {
  canCu: CanCu[];
  moc: KhoangThoiGian<string>[];
}

export type LoaiMatTiepGiap = "DUONG" | "NGO" | "NGACH" | "HEM";
export type LoaiDuong = "CUNG_HOA" | "DUONG_DAT";
export type LoaiVatNuoi = "TRAU_BO_NGUA" | "LON" | "DE_CUU_HUOU_CHO_THO_NHIM" | "GIA_CAM" | "CON_TRUNG_SINH_VAT_NHO";
export type DiChuyen = "KHONG_DI_CHUYEN" | "DI_CHUYEN" | "DEN_VUNG_KHO_KHAN";

export interface NhomOnDinh {
  ma: string;
  tu: string;
  baoGomTu: boolean;
  den: string;
  baoGomDen: boolean;
  thang: Record<DiChuyen, number>;
  toiDa?: boolean;
  canCu: string;
}

/** Tra nhóm địa bàn theo bảng phân nhóm riêng của từng quy định (QD-14). */
export function nhomDiaBan(phanNhom: Record<string, string[]>, xa: string, macDinh: string): string {
  for (const [nhom, ds] of Object.entries(phanNhom)) if (ds.includes(xa)) return nhom;
  // Mẫu kết thúc bằng "*" (vd. "Phường *" — văn bản ghi "các phường") khớp theo tiền tố, sau khi không khớp tên cụ thể.
  for (const [nhom, ds] of Object.entries(phanNhom)) if (ds.some((m) => m.endsWith("*") && xa.startsWith(m.slice(0, -1)))) return nhom;
  return macDinh;
}

const chuanTen = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();

/** Ghi nhớ theo (bộ chính sách, tên xã) — gọi cho từng hộ khi tính, rà soát (1.0.7: tránh chuẩn hóa chuỗi lặp lại). */
const DEM_THON = new WeakMap<BoChinhSach, Map<string, readonly { thon: string; heSo: string; canCu: string }[]>>();

/** Tổ, thôn, bản, tiểu khu của một xã có trong danh sách hệ số chuyển đổi nghề (QĐ 64/2026), kèm hệ số. */
export function thonCoHeSo(cs: BoChinhSach, xa: string): readonly { thon: string; heSo: string; canCu: string }[] {
  let m0 = DEM_THON.get(cs);
  if (!m0) DEM_THON.set(cs, (m0 = new Map()));
  const co = m0.get(xa);
  if (co) return co;
  const out: { thon: string; heSo: string; canCu: string }[] = [];
  const k = chuanTen(xa);
  for (const m of cs.chuyenDoiNghe.theoThon ?? []) for (const x of m.ds) if (chuanTen(x.xa) === k) for (const t of x.thon) out.push({ thon: t, heSo: m.heSo, canCu: m.canCu });
  m0.set(xa, Object.freeze(out));
  return m0.get(xa)!;
}

/**
 * Hệ số chuyển đổi nghề của thửa theo địa bàn (QĐ 64/2026): xã thuộc diện "toàn bộ" → hệ số đó; thửa ghi tổ/thôn có
 * trong danh sách → hệ số cao nhất trong các tổ/thôn đã ghi (k4); xã có tổ/thôn trong danh sách mà thửa chưa ghi → cần
 * xác nhận. Bộ chính sách cũ (không có theoThon) → theo nhóm xã như trước.
 */
export function heSoChuyenDoiNghe(cs: BoChinhSach, xa: string, thon: string[] = []): { heSo: string; moTa: string; canCu: string; canXacNhan?: string } {
  const k = cs.chuyenDoiNghe;
  if (!k.theoThon) {
    const nhom = nhomDiaBan(k.phanNhom, xa, "CON_LAI");
    return { heSo: k.heSoTheoNhom[nhom] ?? k.heSoMacDinh, moTa: `${xa} → nhóm ${nhom}`, canCu: "" };
  }
  for (const m of k.theoThon) if (m.ds.some((x) => x.toanBo && chuanTen(x.xa) === chuanTen(xa))) return { heSo: m.heSo, moTa: `Toàn bộ ${xa}`, canCu: m.canCu };
  const dsXa = thonCoHeSo(cs, xa);
  const macDinh = { heSo: k.heSoMacDinh, canCu: k.canCuMacDinh ?? "" };
  if (!dsXa.length) return { ...macDinh, moTa: `${xa} không có tổ, thôn, bản trong Phụ lục → mức chung` };
  const ghi = thon.map((t) => t.trim()).filter(Boolean);
  if (!ghi.length) return { ...macDinh, moTa: `${xa}: chưa ghi tổ, thôn, bản của thửa`, canXacNhan: `${xa} có tổ, thôn, bản hưởng ${[...new Set(dsXa.map((x) => x.heSo))].sort().reverse().join("/")} lần — chọn tổ, thôn, bản nơi có thửa đất (ở thẻ Thửa đất) để xác định hệ số` };
  const khop = ghi.map((t) => dsXa.find((x) => chuanTen(x.thon) === chuanTen(t))).filter((x): x is NonNullable<typeof x> => !!x);
  if (!khop.length) return { ...macDinh, moTa: `${ghi.join(", ")} (${xa}) không thuộc danh sách → mức chung` };
  const cao = khop.reduce((a, b) => (Number(b.heSo) > Number(a.heSo) ? b : a));
  return { heSo: cao.heSo, moTa: `${ghi.join(", ")} (${xa})${ghi.length > 1 ? " → mức cao nhất (k4)" : ""}`, canCu: cao.canCu };
}
