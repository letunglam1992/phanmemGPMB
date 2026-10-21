/**
 * 1.0.20 — B3: kinh phí bảo đảm cho việc tổ chức thực hiện bồi thường, hỗ trợ, tái định cư (một phần của kinh phí bồi
 * thường, hỗ trợ, tái định cư — khoản 1 Điều 94 Luật Đất đai 2024); kinh phí cưỡng chế thu hồi đất được lập thành một
 * khoản trong kinh phí bồi thường, hỗ trợ, tái định cư (khoản 6 Điều 89). Mức trích, cơ sở tính, nội dung chi: phần mềm
 * 1.0.21 (C2): đối chiếu toàn văn NĐ 88 — dự toán chi phí tổ chức thực hiện do đơn vị bồi thường lập theo định mức hiện hành / thực
 * tế (k1 Điều 27), cơ quan phê duyệt phương án quyết định (k2, sửa bởi NĐ 226); dự toán kinh phí cưỡng chế trình cơ quan phê duyệt
 * phương án quyết định, nguồn bố trí theo điểm a, b, c k3 Điều 27. Phần mềm
 * KHÔNG tự đặt — đơn vị nhập tỷ lệ kèm căn cứ (thiếu căn cứ thì không tính mức tối đa), lập dự toán, ghi giải ngân.
 * B4: tổng hợp chi trả theo bản phương án đã phê duyệt (phải trả, đã chi theo hình thức, gửi ngân hàng, còn phải chi,
 * tiền chậm trả tạm tính) để đối chiếu, quyết toán. Số tiền dùng Decimal.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import { dotHieuLuc, tinhChiTra, type GiaiDoanTyLe } from "./chi-tra";
import { hoDaPheDuyet, type PhienBanPA } from "./phuong-an";

export type LoaiKhoanKp = "TO_CHUC" | "CUONG_CHE" | "KHAC";
export const TEN_LOAI_KHOAN_KP: Record<LoaiKhoanKp, string> = {
  TO_CHUC: "Tổ chức thực hiện bồi thường, hỗ trợ, TĐC",
  CUONG_CHE: "Cưỡng chế thu hồi đất (k6 Đ89)",
  KHAC: "Chi phí khác",
};

export interface KhoanKinhPhi {
  id: string;
  loai: LoaiKhoanKp;
  noiDung: string;
  /** Số tiền dự toán (đồng, chuẩn máy) */
  soTien: string;
  canCu?: string;
}

export interface GiaiNganKp {
  id: string;
  ngay: string;
  soTien: string;
  noiDung: string;
  chungTu: string;
  khoanId?: string;
  nguoiGhi?: string;
  huy?: { luc: string; nguoi: string; lyDo: string };
}

export interface KinhPhiTcth {
  /** Tỷ lệ trích (%) do đơn vị nhập kèm căn cứ — trống hoặc thiếu căn cứ thì không tính mức tối đa */
  tyLe?: string;
  canCuTyLe?: string;
  /** Cơ sở tính tỷ lệ (đồng) do đơn vị nhập khi căn cứ quy định cơ sở khác tổng tiền đã phê duyệt; trống = tổng phải trả theo các bản đã phê duyệt */
  coSo?: string;
  qdDuToan?: { so: string; ngay: string; coQuan?: string };
  khoan: KhoanKinhPhi[];
  giaiNgan: GiaiNganKp[];
}

export const CAN_CU_KINH_PHI = "khoản 1 Điều 94 Luật Đất đai 2024; khoản 1, 2, 4 Điều 27 NĐ 88/2024/NĐ-CP (khoản 2 sửa bởi NĐ 226/2025)";
export const CAN_CU_KP_CUONG_CHE = "khoản 6, điểm b khoản 5 Điều 89 Luật Đất đai 2024; khoản 3 Điều 27 NĐ 88/2024/NĐ-CP";

const so = (s: string | undefined) => (s && /^-?\d+(\.\d+)?$/.test(s.trim()) ? D(s.trim()) : D(0));

/* ------------------------------ B4: quyết toán chi trả ------------------------------ */

export interface SoLieuChiTra {
  soHo: number;
  phaiTra: Decimal;
  tienMat: Decimal;
  chuyenKhoan: Decimal;
  /** Gửi ngân hàng, chưa trả cho người có đất (k4 Đ94) */
  guiNHChuaTra: Decimal;
  /** Gửi ngân hàng, đã trả cho người có đất */
  guiNHDaTra: Decimal;
  /** Tiền lãi tiền gửi đã trả người có đất (theo sao kê, không cộng vào số phải trả) */
  tienLaiNH: Decimal;
  daChi: Decimal;
  conPhaiChi: Decimal;
  /** Chi vượt số được duyệt (tổng phần vượt của các hộ) */
  chiVuot: Decimal;
  soHoChuaChiDu: number;
  soHoCham: number;
  /** Tiền chậm trả tạm tính; null = có hộ thiếu tỷ lệ (Thiếu căn cứ) */
  tienChamTra: Decimal | null;
}

export interface DongQuyetToan extends SoLieuChiTra {
  ban: PhienBanPA;
}

const rong = (): SoLieuChiTra => ({ soHo: 0, phaiTra: D(0), tienMat: D(0), chuyenKhoan: D(0), guiNHChuaTra: D(0), guiNHDaTra: D(0), tienLaiNH: D(0), daChi: D(0), conPhaiChi: D(0), chiVuot: D(0), soHoChuaChiDu: 0, soHoCham: 0, tienChamTra: D(0) });

function cong(a: SoLieuChiTra, b: SoLieuChiTra): SoLieuChiTra {
  return {
    soHo: a.soHo + b.soHo,
    phaiTra: a.phaiTra.plus(b.phaiTra),
    tienMat: a.tienMat.plus(b.tienMat),
    chuyenKhoan: a.chuyenKhoan.plus(b.chuyenKhoan),
    guiNHChuaTra: a.guiNHChuaTra.plus(b.guiNHChuaTra),
    guiNHDaTra: a.guiNHDaTra.plus(b.guiNHDaTra),
    tienLaiNH: a.tienLaiNH.plus(b.tienLaiNH),
    daChi: a.daChi.plus(b.daChi),
    conPhaiChi: a.conPhaiChi.plus(b.conPhaiChi),
    chiVuot: a.chiVuot.plus(b.chiVuot),
    soHoChuaChiDu: a.soHoChuaChiDu + b.soHoChuaChiDu,
    soHoCham: a.soHoCham + b.soHoCham,
    tienChamTra: a.tienChamTra && b.tienChamTra ? a.tienChamTra.plus(b.tienChamTra) : null,
  };
}

/** Số liệu chi trả của một hộ theo bản phê duyệt hiện hành (null nếu hộ chưa có bản đã phê duyệt). */
export function soLieuHo(h: Ho, dsPA: PhienBanPA[], tyLe: GiaiDoanTyLe[], homNay: string): SoLieuChiTra | null {
  const r = tinhChiTra(h, dsPA, tyLe, homNay);
  if (r.trangThai === "CHUA_DUYET") return null;
  const x = rong();
  x.soHo = 1;
  x.phaiTra = r.phaiTra!;
  for (const d of dotHieuLuc(h.chiTra)) {
    const t = so(d.soTien);
    if (d.hinhThuc === "TIEN_MAT") x.tienMat = x.tienMat.plus(t);
    else if (d.hinhThuc === "CHUYEN_KHOAN") x.chuyenKhoan = x.chuyenKhoan.plus(t);
    else if (d.guiNH?.traLai) {
      x.guiNHDaTra = x.guiNHDaTra.plus(t);
      x.tienLaiNH = x.tienLaiNH.plus(so(d.guiNH.traLai.tienLai));
    } else x.guiNHChuaTra = x.guiNHChuaTra.plus(t);
  }
  x.daChi = r.daChi;
  x.conPhaiChi = r.conLai!.gt(0) ? r.conLai! : D(0);
  x.chiVuot = r.conLai!.lt(0) ? r.conLai!.neg() : D(0);
  x.soHoChuaChiDu = r.conLai!.gt(0) ? 1 : 0;
  x.soHoCham = r.chamTra.length ? 1 : 0;
  x.tienChamTra = r.tienChamTra;
  return x;
}

/** Tổng hợp chi trả theo bản phương án đã phê duyệt hiện hành của từng hộ. */
export function quyetToanChiTra(duAn: DuAn, hos: Ho[], tyLe: GiaiDoanTyLe[], homNay: string): { dong: DongQuyetToan[]; tong: SoLieuChiTra; hoChuaDuyetCoChi: number } {
  const dsPA = duAn.phuongAn ?? [];
  const hien = hoDaPheDuyet(dsPA);
  const theoBan = new Map<string, DongQuyetToan>();
  let hoChuaDuyetCoChi = 0;
  for (const h of hos) {
    if (h.daXoa) continue;
    const x = soLieuHo(h, dsPA, tyLe, homNay);
    if (!x) {
      if (dotHieuLuc(h.chiTra).length) hoChuaDuyetCoChi++;
      continue;
    }
    const ban = hien.get(h.id)!;
    const cu = theoBan.get(ban.id);
    theoBan.set(ban.id, cu ? { ...cong(cu, x), ban } : { ...x, ban });
  }
  const dong = [...theoBan.values()].sort((a, b) => a.ban.so - b.ban.so);
  return { dong, tong: dong.reduce<SoLieuChiTra>((a, b) => cong(a, b), rong()), hoChuaDuyetCoChi };
}

/* ------------------------------ B3: kinh phí tổ chức thực hiện ------------------------------ */

export interface KetQuaKinhPhi {
  /** Cơ sở tính tỷ lệ (đồng) và nguồn của cơ sở */
  coSo: Decimal;
  coSoNhap: boolean;
  /** Mức tối đa theo tỷ lệ; null = chưa nhập tỷ lệ hoặc thiếu căn cứ */
  mucToiDa: Decimal | null;
  duToan: Decimal;
  duToanTheoLoai: Record<LoaiKhoanKp, Decimal>;
  daGiaiNgan: Decimal;
  conLai: Decimal;
  canhBao: { muc: "CAO" | "TRUNG_BINH" | "THONG_TIN"; noiDung: string; canCu?: string }[];
}

export const kinhPhiRong = (): KinhPhiTcth => ({ khoan: [], giaiNgan: [] });
export const giaiNganHieuLuc = (kp: KinhPhiTcth | undefined) => (kp?.giaiNgan ?? []).filter((g) => !g.huy);

export function tinhKinhPhi(duAn: DuAn, hos: Ho[], tyLe: GiaiDoanTyLe[], homNay: string): KetQuaKinhPhi {
  const kp = duAn.kinhPhi ?? kinhPhiRong();
  const coSoNhap = !!kp.coSo?.trim() && /^\d+(\.\d+)?$/.test(kp.coSo.trim());
  const coSo = coSoNhap ? D(kp.coSo!.trim()) : quyetToanChiTra(duAn, hos, tyLe, homNay).tong.phaiTra;
  const coTyLe = !!kp.tyLe?.trim() && /^\d+(\.\d+)?$/.test(kp.tyLe.trim());
  const mucToiDa = coTyLe && kp.canCuTyLe?.trim() ? coSo.times(kp.tyLe!.trim()).div(100).toDecimalPlaces(0) : null;
  const duToanTheoLoai: Record<LoaiKhoanKp, Decimal> = { TO_CHUC: D(0), CUONG_CHE: D(0), KHAC: D(0) };
  for (const k of kp.khoan) duToanTheoLoai[k.loai] = duToanTheoLoai[k.loai].plus(so(k.soTien));
  const duToan = duToanTheoLoai.TO_CHUC.plus(duToanTheoLoai.CUONG_CHE).plus(duToanTheoLoai.KHAC);
  const daGiaiNgan = giaiNganHieuLuc(kp).reduce((s, g) => s.plus(so(g.soTien)), D(0));
  const canhBao: KetQuaKinhPhi["canhBao"] = [];
  if (coTyLe && !kp.canCuTyLe?.trim()) canhBao.push({ muc: "TRUNG_BINH", noiDung: "Đã nhập tỷ lệ trích nhưng chưa ghi căn cứ — Thiếu căn cứ, không tính mức tối đa" });
  if (mucToiDa && duToanTheoLoai.TO_CHUC.gt(mucToiDa))
    canhBao.push({ muc: "CAO", noiDung: `Dự toán tổ chức thực hiện ${duToanTheoLoai.TO_CHUC.toFixed(0)} đ vượt mức theo tỷ lệ ${kp.tyLe}% (${mucToiDa.toFixed(0)} đ)`, canCu: kp.canCuTyLe });
  if (daGiaiNgan.gt(duToan)) canhBao.push({ muc: "CAO", noiDung: `Đã giải ngân ${daGiaiNgan.toFixed(0)} đ vượt tổng dự toán ${duToan.toFixed(0)} đ` });
  if (daGiaiNgan.gt(0) && !kp.qdDuToan?.so?.trim()) canhBao.push({ muc: "TRUNG_BINH", noiDung: "Đã ghi giải ngân nhưng chưa ghi quyết định phê duyệt dự toán" });
  const coCuongChe = hos.some((h) => !h.daXoa && (h.cuongChe ?? []).some((c) => c.loai === "THU_HOI"));
  if (coCuongChe && duToanTheoLoai.CUONG_CHE.isZero())
    canhBao.push({ muc: "TRUNG_BINH", noiDung: "Dự án có hồ sơ cưỡng chế thu hồi đất nhưng dự toán chưa có khoản kinh phí cưỡng chế — kinh phí cưỡng chế được lập thành một khoản trong kinh phí bồi thường, hỗ trợ, tái định cư", canCu: CAN_CU_KP_CUONG_CHE });
  return { coSo, coSoNhap, mucToiDa, duToan, duToanTheoLoai, daGiaiNgan, conLai: duToan.minus(daGiaiNgan), canhBao };
}
