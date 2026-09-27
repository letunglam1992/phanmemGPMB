/**
 * Thời hạn theo bước (docs/05 §1) — chỉ các thời hạn có căn cứ VÀ có mốc bắt đầu xác định được.
 * Mốc "NHAP": cán bộ nhập ngày bắt đầu tính hạn (vd. ngày nhận đủ hồ sơ); mốc "BUOC": ngày hoàn thành bước trước.
 * Thời hạn tính theo "ngày": nếu ngày cuối rơi vào ngày nghỉ thì kết thúc ở ngày làm việc tiếp theo
 * (khoản 5 Điều 148 Bộ luật Dân sự 2015).
 */
import { hanChot, laNgayLamViec, namThieuLich, soNgayLamViec, type LichLamViec } from "./lich-lam-viec";
import type { BuocHo, Ho } from "./mo-hinh";

export interface HanBuoc {
  buoc: string;
  soNgay: number;
  loai: "N" | "NLV";
  moc: { loai: "NHAP"; nhan: string } | { loai: "BUOC"; buoc: string; nhan: string };
  canCu: string;
}

export const HAN_BUOC: HanBuoc[] = [
  { buoc: "8", soNgay: 30, loai: "NLV", moc: { loai: "NHAP", nhan: "Ngày nhận đủ hồ sơ thẩm định (thời gian bổ sung hồ sơ không tính — cán bộ điều chỉnh ngày mốc)" }, canCu: "khoản 3 Điều 3 NĐ 88/2024/NĐ-CP; Mục XII Sổ tay" },
  { buoc: "9", soNgay: 5, loai: "NLV", moc: { loai: "NHAP", nhan: "Ngày nhận tờ trình phê duyệt phương án" }, canCu: "điểm c khoản 3 Điều 87 Luật Đất đai 2024" },
  { buoc: "11", soNgay: 3, loai: "NLV", moc: { loai: "BUOC", buoc: "9", nhan: "ngày phê duyệt phương án (bước 9)" }, canCu: "điểm b khoản 4 Điều 87 Luật Đất đai 2024" },
  { buoc: "13", soNgay: 10, loai: "N", moc: { loai: "NHAP", nhan: "Ngày đủ điều kiện ban hành QĐ thu hồi (khoản 5 Điều 87)" }, canCu: "khoản 5, 6 Điều 87 Luật Đất đai 2024" },
  { buoc: "15", soNgay: 3, loai: "NLV", moc: { loai: "BUOC", buoc: "12", nhan: "ngày hoàn thành chi trả (bước 12)" }, canCu: "Mục XVIII Sổ tay" },
];

export const hanCuaBuoc = (buoc: string) => HAN_BUOC.find((x) => x.buoc === buoc);

export interface TinhHan {
  han: HanBuoc;
  moc: string | null;
  hanChot: string | null;
  /** Ngày làm việc (NLV) hoặc ngày (N) còn lại tới hạn; âm = đã quá. */
  conLai: number | null;
  trangThai: "CHUA_CO_MOC" | "CON_HAN" | "SAP_HET" | "QUA_HAN" | "XONG_DUNG_HAN" | "XONG_QUA_HAN";
  thieuLich: number[];
}

export function ngayMoc(h: Ho, han: HanBuoc): string | null {
  if (han.moc.loai === "NHAP") return h.tienDo[han.buoc]?.mocHan || null;
  const b = h.tienDo[han.moc.buoc];
  return b?.trangThai === "XONG" && b.ngay ? b.ngay : null;
}

export function tinhHanBuoc(h: Ho, han: HanBuoc, homNay: string, lich: LichLamViec): TinhHan {
  const moc = ngayMoc(h, han);
  const bh: BuocHo | undefined = h.tienDo[han.buoc];
  if (!moc) return { han, moc, hanChot: null, conLai: null, trangThai: "CHUA_CO_MOC", thieuLich: [] };
  let hc = hanChot(moc, han.soNgay, han.loai, lich);
  if (han.loai === "N") while (!laNgayLamViec(hc, lich)) hc = hanChot(hc, 1, "N", lich);
  const thieuLich = namThieuLich(moc, hc, lich);
  if (bh?.trangThai === "XONG") {
    const xong = bh.ngay ?? homNay;
    return { han, moc, hanChot: hc, conLai: null, trangThai: xong > hc ? "XONG_QUA_HAN" : "XONG_DUNG_HAN", thieuLich };
  }
  const conLai = han.loai === "NLV" ? soNgayLamViec(homNay, hc, lich) : Math.round((Date.parse(hc) - Date.parse(homNay)) / 86400000);
  const trangThai = homNay > hc ? "QUA_HAN" : conLai <= (han.loai === "NLV" ? 1 : 2) ? "SAP_HET" : "CON_HAN";
  return { han, moc, hanChot: hc, conLai, trangThai, thieuLich };
}
