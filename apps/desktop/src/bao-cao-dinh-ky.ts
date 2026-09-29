/**
 * Báo cáo định kỳ (docs/17 §11.4): danh sách hộ vướng mắc kèm bước đang thực hiện và số ngày tồn đọng; quản lý mẫu Word
 * báo cáo (mẫu gốc của phần mềm; đơn vị thay mẫu gốc hoặc thêm mẫu khác, tải mẫu đang dùng về sửa).
 * Số ngày tồn đọng = từ ngày ghi vướng mắc (nếu cán bộ ghi) hoặc từ ngày hoàn thành bước gần nhất, đến ngày báo cáo.
 */
import { CAC_BUOC, daQuaBuoc, hoHieuLuc, type DuAn, type Ho } from "./mo-hinh";
import type { KetQuaHo } from "./tinh-ho";
import { trangThaiHo, vuongMacHo } from "./trang-thai";

export interface HoVuongMac {
  duAnId: string;
  du_an: string;
  hoId: string;
  ma: string;
  ten: string;
  buoc: string;
  so_ngay: number | string;
  noi_dung: string;
}

export function dsHoVuongMac(dsDuAn: DuAn[], duLieu: (d: DuAn) => { h: Ho; k: KetQuaHo }[], denNgay: string): HoVuongMac[] {
  const out: HoVuongMac[] = [];
  for (const d of dsDuAn)
    for (const { h: h0, k } of duLieu(d)) {
      if (h0.daXoa || trangThaiHo(d, h0, k, denNgay) !== "VUONG_MAC") continue;
      const h = hoHieuLuc(d, h0);
      const i = CAC_BUOC.findIndex((b) => !daQuaBuoc(h.tienDo[b.ma]?.trangThai));
      const b = CAC_BUOC[i];
      const mocBuoc = CAC_BUOC.slice(0, Math.max(i, 0)).map((x) => h.tienDo[x.ma]?.ngay ?? "").filter(Boolean).sort().at(-1);
      const moc = h0.vuongMac?.ngay || mocBuoc || "";
      const soNgay = moc && moc <= denNgay ? Math.round((Date.parse(denNgay) - Date.parse(moc)) / 86400000) : "—";
      out.push({
        duAnId: d.id,
        du_an: d.ten,
        hoId: h0.id,
        ma: h0.ma,
        ten: h0.ten,
        buoc: b ? `${b.ma}. ${b.ten}` : "đã hết các bước",
        so_ngay: soNgay,
        noi_dung: vuongMacHo(d, h0, k, denNgay).filter((v) => v.muc === "CAO").map((v) => v.noiDung).join("; ") || "vướng mắc",
      });
    }
  return out.sort((a, b) => (typeof b.so_ngay === "number" ? b.so_ngay : -1) - (typeof a.so_ngay === "number" ? a.so_ngay : -1));
}

/** Mã mẫu báo cáo: "bao-cao-tong-hop" = mẫu gốc (có thể được đơn vị thay); "bcdk-…" = mẫu khác đơn vị thêm. */
export const MA_MAU_GOC = "bao-cao-tong-hop";
export const TIEN_TO_MAU_KHAC = "bcdk-";

/** Các trường dữ liệu điền vào mẫu (hướng dẫn cán bộ tự sửa mẫu). */
export const TRUONG_MAU_BAO_CAO: [string, string][] = [
  ["{CO_QUAN_CAP_TREN}, {CO_QUAN}", "Cơ quan chủ quản, cơ quan báo cáo (chữ hoa)"],
  ["{so}, {ky_hieu}, {dia_danh}, {ngay}, {thang}, {nam}", "Số, ký hiệu, địa danh, ngày ký"],
  ["{kinh_gui}, {mo_dau}, {tong_quat}, {den_ngay}", "Kính gửi, mở đầu, đoạn kết quả chung (tự tính), ngày số liệu"],
  ["{#co_pham_vi}…{pham_vi}…{/co_pham_vi}", "Phạm vi xã (khi lọc theo xã)"],
  ["{#du_an}{tt} {ten} {so_ho} {dt} {da_duyet} {da_chi} {hoan_thanh} {tinh_trang}{/du_an}", "Bảng từng dự án (dòng lặp)"],
  ["{so_ho} {dt} {da_duyet} {da_chi} {ho_hoan_thanh}", "Dòng tổng cộng"],
  ["{#vuong_mac}{du_an}: {noi_dung}{/vuong_mac}", "Vướng mắc cần xử lý ngay theo cảnh báo (theo dự án)"],
  ["{#ho_vuong_mac}{du_an} {ma} {ten} {noi_dung} {buoc} {so_ngay}{/ho_vuong_mac}", "Danh sách hộ vướng mắc: bước đang thực hiện, số ngày tồn đọng; {#co_ho_vuong_mac}…{/co_ho_vuong_mac} chỉ hiện khi có"],
  ["{kho_khan_khac}, {nhiem_vu}, {kien_nghi}, {ket_thuc}", "Nội dung cán bộ nhập"],
  ["{#noi_nhan_ds}{.}{/noi_nhan_ds}, {quyen_han}, {nguoi_ky}", "Nơi nhận, người ký"],
];
