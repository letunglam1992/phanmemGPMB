import type Decimal from "decimal.js";
import type { CanCu, DongTinh, LuaChon, TrangThai } from "./types";

export function dong(p: {
  ma: string;
  noiDung: string;
  thamSo?: Record<string, string>;
  congThuc: string;
  thanhTien: Decimal | null;
  canCu: CanCu[];
  trangThai?: TrangThai;
  luaChon?: LuaChon[];
  canhBao?: string[];
}): DongTinh {
  return {
    thamSo: {},
    luaChon: [],
    canhBao: [],
    trangThai: p.thanhTien === null ? "CAN_XAC_NHAN" : "TAM_TINH",
    ...p,
  } as DongTinh;
}
