import type Decimal from "decimal.js";
import type { BoChinhSach } from "./chinh-sach";
import { D, lamTronTien } from "./so";
import type { DongTinh } from "./types";

export interface TongHo {
  tongChuaLamTron: Decimal;
  tongLamTron: Decimal;
  chenhLechLamTron: Decimal;
  soDongCanXacNhan: number;
  soDongThieuCanCu: number;
  duocChot: boolean;
}

/** QD-03: cộng các dòng đủ điều kiện, làm tròn một lần ở cấp hộ. Còn dòng chưa xác nhận → không được chốt. */
export function tongHo(cs: BoChinhSach, dongs: DongTinh[]): TongHo {
  const hopLe = dongs.filter((d) => d.trangThai === "TAM_TINH" && d.thanhTien);
  const tong = hopLe.reduce((s, d) => s.plus(d.thanhTien!), D(0));
  const lamTron = lamTronTien(tong, cs.lamTron.tienBuoc, cs.lamTron.cach);
  const canXacNhan = dongs.filter((d) => d.trangThai === "CAN_XAC_NHAN").length;
  const thieu = dongs.filter((d) => d.trangThai === "THIEU_CAN_CU").length;
  return {
    tongChuaLamTron: tong,
    tongLamTron: lamTron,
    chenhLechLamTron: lamTron.minus(tong),
    soDongCanXacNhan: canXacNhan,
    soDongThieuCanCu: thieu,
    duocChot: canXacNhan === 0 && thieu === 0,
  };
}
