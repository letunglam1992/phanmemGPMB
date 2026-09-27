import type { CanCu } from "./types";
import type { KhoangThoiGian } from "./moc-thoi-gian";
import type { CachLamTron } from "./so";

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
  moMa: { canCu: CanCu[]; mucXay: string; mucKhongXay: string };
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
  chuyenDoiNghe: {
    canCu: CanCu[];
    heSoMacDinh: string;
    heSoTheoNhom: Record<string, string>;
    phanNhom: Record<string, string[]>;
  };
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
  return macDinh;
}
