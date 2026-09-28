/**
 * Bàn giao mặt bằng và thưởng bàn giao trước hạn (P1-4).
 *
 * Thưởng (C13 — Điều 15 Phụ lục II QĐ 106/2025/QĐ-UBND; Mục XV.3 Sổ tay): kho dữ liệu chưa có nguyên văn điều khoản
 * (ma trận nghiệp vụ docs/02 chỉ tóm tắt "mốc 1: 10%, ≤ 20 tr; mốc 2: 10%, ≤ 15 tr"), cơ sở tính còn linh động (VM-16,
 * QD-19). Vì vậy phần mềm KHÔNG tự đặt mức: cán bộ khai báo các mốc (hạn bàn giao, tỷ lệ, mức tối đa), cơ sở tính và
 * căn cứ ở Thông tin dự án; phần mềm chỉ tính số học: min(cơ sở × tỷ lệ, mức tối đa) theo mốc chứa ngày bàn giao.
 * Thưởng được quyết định sau khi bàn giao (Mẫu 20, 21) — không cộng vào tổng phương án bồi thường, hỗ trợ.
 */
import { D, dinhDang } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import type { CotTongHop, KetQuaHo } from "./tinh-ho";
import { laSoMay, soD } from "./so";

export interface MocThuong {
  ten: string;
  /** Bàn giao đến hết ngày này (ISO) thì thuộc mốc */
  denNgay: string;
  /** Tỷ lệ % (chuẩn máy) */
  tyLe: string;
  /** Mức tối đa (đồng, chuẩn máy); trống = không giới hạn */
  toiDa: string;
}

export interface CauHinhThuong {
  moc: MocThuong[];
  /** Cột của biểu tổng hợp dùng làm cơ sở tính (VM-16: cán bộ chọn) */
  coSo: CotTongHop[];
  /** Căn cứ (văn bản, điều khoản; quyết định phê duyệt phương án/kế hoạch có các mốc) — bắt buộc */
  canCu: string;
}

/** Mức theo ma trận nghiệp vụ docs/02 (C13) — CHỈ để điền nhanh, cán bộ phải đối chiếu nguyên văn trước khi dùng. */
export const GOI_Y_MA_TRAN: Omit<CauHinhThuong, "canCu"> & { canCu: string; canhBao: string } = {
  moc: [
    { ten: "Mốc 1", denNgay: "", tyLe: "10", toiDa: "20000000" },
    { ten: "Mốc 2", denNgay: "", tyLe: "10", toiDa: "15000000" },
  ],
  coSo: ["BT_DAT", "BT_TAI_SAN"],
  canCu: "Điều 15 Phụ lục II QĐ 106/2025/QĐ-UBND; Mục XV.3 Sổ tay (QĐ 1966/QĐ-UBND)",
  canhBao: "Điền theo bản tóm tắt ở ma trận nghiệp vụ (docs/02, C13) — đối chiếu nguyên văn Điều 15 Phụ lục II QĐ 106/2025 và nhập hạn của từng mốc theo văn bản của dự án trước khi dùng.",
};

/** Diện tích thu hồi của hộ (m²). */
export const dtThuHoiHo = (h: Pick<Ho, "thua">): Decimal => h.thua.reduce((s, t) => s.plus(soD(t.dienTichThuHoi)), D(0));

/** Diện tích đã bàn giao (m²): theo biên bản nếu có, không thì toàn bộ DT thu hồi. */
export const dtDaBanGiao = (h: Pick<Ho, "thua" | "banGiao">): Decimal =>
  !h.banGiao?.ngay ? D(0) : h.banGiao.dienTich && laSoMay(h.banGiao.dienTich) ? D(h.banGiao.dienTich) : dtThuHoiHo(h);

export function loiCauHinhThuong(c: CauHinhThuong | undefined | null): string | null {
  if (!c || !c.moc.length) return "Chưa khai báo mốc thưởng bàn giao trước hạn ở Thông tin dự án";
  if (!c.canCu.trim()) return "Chưa ghi căn cứ của mức thưởng";
  if (!c.coSo.length) return "Chưa chọn cơ sở tính thưởng";
  for (const m of c.moc) {
    if (!m.denNgay) return `${m.ten || "Mốc"}: chưa nhập hạn bàn giao`;
    if (!laSoMay(m.tyLe) || D(m.tyLe).lte(0)) return `${m.ten || "Mốc"}: tỷ lệ chưa hợp lệ`;
    if (m.toiDa && !laSoMay(m.toiDa)) return `${m.ten || "Mốc"}: mức tối đa chưa hợp lệ`;
  }
  return null;
}

export type KetQuaThuong =
  | { loai: "CO"; moc: MocThuong; coSo: Decimal; soTien: Decimal; dienGiai: string; canCu: string }
  | { loai: "KHONG"; lyDo: string }
  | { loai: "THIEU_CAN_CU"; lyDo: string };

const TEN_COT_NGAN: Partial<Record<CotTongHop, string>> = { BT_DAT: "BT đất", BT_TAI_SAN: "BT nhà, công trình", BT_CAY: "BT cây trồng, vật nuôi", HT_DAT: "HT đất", HT_TAI_SAN: "HT tài sản", HT_CAY: "HT cây" };

/** Thưởng bàn giao trước hạn của hộ theo ngày bàn giao đã ghi. */
export function tinhThuong(duAn: Pick<DuAn, "thuongBanGiao">, h: Pick<Ho, "banGiao">, kq: Pick<KetQuaHo, "theoCot">): KetQuaThuong {
  if (!h.banGiao?.ngay) return { loai: "KHONG", lyDo: "Chưa bàn giao mặt bằng" };
  const c = duAn.thuongBanGiao;
  const loi = loiCauHinhThuong(c);
  if (loi) return { loai: "THIEU_CAN_CU", lyDo: loi };
  const moc = [...c!.moc].sort((a, b) => a.denNgay.localeCompare(b.denNgay)).find((m) => h.banGiao!.ngay <= m.denNgay);
  if (!moc) return { loai: "KHONG", lyDo: `Bàn giao ngày ${h.banGiao.ngay.split("-").reverse().join("/")} sau hạn của mọi mốc thưởng` };
  const coSo = c!.coSo.reduce((s, k) => s.plus(kq.theoCot[k] ?? 0), D(0));
  const theoTyLe = coSo.mul(moc.tyLe).div(100);
  const soTien = (moc.toiDa && theoTyLe.gt(moc.toiDa) ? D(moc.toiDa) : theoTyLe).toDecimalPlaces(0);
  const dienGiai = `${moc.ten}: ${dinhDang(D(moc.tyLe), 2)}% × (${c!.coSo.map((k) => TEN_COT_NGAN[k] ?? k).join(" + ")} = ${dinhDang(coSo, 0)} đ) = ${dinhDang(theoTyLe, 0)} đ${moc.toiDa ? `; tối đa ${dinhDang(D(moc.toiDa), 0)} đ` : ""}`;
  return { loai: "CO", moc, coSo, soTien, dienGiai, canCu: c!.canCu };
}
