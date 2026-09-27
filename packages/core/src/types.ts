import type Decimal from "decimal.js";

/** Trạng thái một dòng tính. Chỉ TAM_TINH mới được cộng vào tổng để chốt phương án. */
export type TrangThai = "TAM_TINH" | "CAN_XAC_NHAN" | "THIEU_CAN_CU";

/** Căn cứ pháp lý: văn bản + vị trí (Điều/Khoản/Điểm/Phụ lục/Biểu/STT). */
export interface CanCu {
  vanBan: string;
  viTri: string;
  ghiChu?: string;
}

/** Lựa chọn của người dùng tại điểm "linh động" (docs/06 §3): bắt buộc có lý do. */
export interface LuaChon {
  ma: string;
  giaTri: string;
  lyDo: string;
}

/** Một dòng tính có giải trình đầy đủ để truy vết từ tổng về từng khoản. */
export interface DongTinh {
  ma: string;
  noiDung: string;
  /** Các đại lượng đầu vào đã dùng, hiển thị đúng như trên phiếu giải trình. */
  thamSo: Record<string, string>;
  congThuc: string;
  thanhTien: Decimal | null;
  canCu: CanCu[];
  trangThai: TrangThai;
  luaChon: LuaChon[];
  canhBao: string[];
}
