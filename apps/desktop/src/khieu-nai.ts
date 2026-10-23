/**
 * 1.0.20 (B1) — Sổ theo dõi khiếu nại, kiến nghị của hộ trong bồi thường, hỗ trợ, tái định cư.
 * Thời hạn theo Luật Khiếu nại 2011 và Nghị định 124/2020/NĐ-CP:
 * - thụ lý (1.0.21): 10 ngày làm việc kể từ ngày nhận được khiếu nại thuộc thẩm quyền (khoản 1 Điều 16 NĐ 124/2020);
 *   đơn nhận từ 01/7/2026: 07 ngày làm việc (Điều 27, khoản 1 Điều 36 Luật Khiếu nại sửa bởi điểm b khoản 15 Điều 2 Luật
 *   136/2025/QH15; khoản 1 Điều 16 NĐ 124 sửa bởi Điều 10 NĐ 155/2026/NĐ-CP — cùng hiệu lực 01/7/2026);
 * - giải quyết lần đầu (Điều 28): ≤ 30 ngày kể từ ngày thụ lý, vụ việc phức tạp ≤ 45 ngày; vùng sâu, vùng xa đi lại
 *   khó khăn ≤ 45 ngày, phức tạp ≤ 60 ngày;
 * - giải quyết lần hai (Điều 37): ≤ 45 ngày, phức tạp ≤ 60 ngày; vùng sâu, vùng xa ≤ 60 ngày, phức tạp ≤ 70 ngày.
 * 1.0.21 (A1, A3): tạm đình chỉ (k1 Điều 11a Luật Khiếu nại bổ sung bởi Luật 136/2025): thời gian tạm đình chỉ không tính vào
 * thời hạn giải quyết (k4 Điều 11a); thời hạn tiếp tục tính từ ngày ban hành QĐ tiếp tục giải quyết (k2 Điều 28b NĐ 124/2020 bổ sung
 * bởi NĐ 155/2026) → hạn = ngày thụ lý + số ngày giải quyết + (ngày QĐ tiếp tục − ngày QĐ tạm đình chỉ). Đình chỉ (k2 Điều 11a);
 * vắng đối thoại không có lý do chính đáng thì vẫn giải quyết (k6 Điều 30 Luật; k5 Điều 28 NĐ 124 sửa bởi NĐ 155); gửi QĐ giải
 * quyết lần đầu trong 03 ngày làm việc, lần hai 07 ngày làm việc kể từ ngày ban hành (điểm a k2 Điều 29 NĐ 124/2020); gửi QĐ tạm
 * đình chỉ, đình chỉ, tiếp tục trong 03 ngày làm việc (Điều 28b).
 * "Phức tạp", "vùng sâu, vùng xa" do cán bộ đánh dấu (phần mềm không tự xác định). Kiến nghị, phản ánh không thuộc Luật
 * Khiếu nại → hạn do đơn vị nhập kèm căn cứ (không có thì không tính hạn). Hạn đếm theo ngày như câu chữ của Luật; ngày
 * thứ nhất là ngày liền sau ngày mốc (Điều 147 BLDS 2015), ngày cuối là ngày nghỉ thì sang ngày làm việc tiếp theo (k5 Đ148). Phần mềm ghi nhận, nhắc hạn — không kết luận đúng sai.
 */
import { hanChot, hanChotNgay, type LichLamViec } from "./lich-lam-viec";
import type { Ho } from "./mo-hinh";

export type LoaiDon = "KHIEU_NAI" | "KIEN_NGHI";
export const TEN_LOAI_DON: Record<LoaiDon, string> = { KHIEU_NAI: "Khiếu nại", KIEN_NGHI: "Kiến nghị, phản ánh" };

export type KetQuaDon = "DUNG" | "DUNG_MOT_PHAN" | "SAI" | "RUT" | "DINH_CHI" | "KHONG_THU_LY" | "TRA_LOI";
export const TEN_KET_QUA_DON: Record<KetQuaDon, string> = {
  DUNG: "Khiếu nại đúng",
  DUNG_MOT_PHAN: "Đúng một phần",
  SAI: "Khiếu nại sai",
  RUT: "Rút đơn (đình chỉ)",
  DINH_CHI: "Đình chỉ (k2 Điều 11a)",
  KHONG_THU_LY: "Không thụ lý (Điều 11)",
  TRA_LOI: "Đã trả lời, giải thích",
};

export interface DonKhieuNai {
  id: string;
  loai: LoaiDon;
  /** Khiếu nại: lần giải quyết (1 hoặc 2) */
  lan?: 1 | 2;
  ngayNhan: string;
  ngayThuLy?: string;
  /** Quyết định, hành vi bị khiếu nại / nội dung kiến nghị */
  doiTuong?: string;
  noiDung: string;
  /** Người, cơ quan có thẩm quyền giải quyết */
  coQuan?: string;
  phucTap?: boolean;
  vungKhoKhan?: boolean;
  /** Kiến nghị: số ngày trả lời do đơn vị nhập, kèm căn cứ */
  hanNhap?: { soNgay: number; canCu: string };
  /** Kết quả: số, ngày quyết định giải quyết / văn bản trả lời */
  soVb?: string;
  ngayVb?: string;
  ketQua?: KetQuaDon;
  ghiChu?: string;
  nguoiGhi?: string;
  /** 1.0.21: thông báo thụ lý (Mẫu 03 NĐ 124 thay bởi NĐ 155) — số, ngày */
  tbThuLy?: { so: string; ngay: string };
  /** Không thụ lý: lý do (Điều 11 Luật Khiếu nại; Mẫu 04) */
  lyDoKhongThuLy?: string;
  tamDinhChi?: TamDinhChi[];
  /** Đình chỉ: trường hợp điểm a–d k2 Điều 11a */
  dinhChi?: { truongHop: "a" | "b" | "c" | "d"; ngay?: string; soQd?: string };
  /** Người khiếu nại vắng đối thoại (k6 Điều 30 Luật; k5 Điều 28 NĐ 124 sửa bởi NĐ 155) */
  vangDoiThoai?: { ngay: string; coLyDo: boolean };
  /** Ngày gửi QĐ giải quyết cho người khiếu nại (điểm a k2 Điều 29 NĐ 124/2020) */
  ngayGuiQd?: string;
  /** 1.1.0 (A2): tổ chức đối thoại — ngày đối thoại, ngày gửi thông báo (trước ít nhất 05 ngày — k1 Điều 28 NĐ 124 sửa bởi NĐ 155) */
  doiThoai?: { ngay: string; ngayTb?: string; diaDiem?: string };
  /** Đình chỉ: ngày gửi QĐ đình chỉ (k1 Điều 28b) */
  ngayGuiDinhChi?: string;
}

export interface TamDinhChi {
  id: string;
  /** Ngày ban hành QĐ tạm đình chỉ (Mẫu 14a) */
  tu: string;
  /** Ngày ban hành QĐ tiếp tục giải quyết (Mẫu 14b); trống = đang tạm đình chỉ */
  den?: string;
  /** Điểm a (bất khả kháng, trở ngại khách quan — Điều 28a NĐ 124) / điểm b (chờ kết quả cơ quan khác) k1 Điều 11a */
  truongHop: "a" | "b";
  lyDo: string;
  soQd?: string;
  soQdTiepTuc?: string;
  /** 1.1.0 (A1): ngày gửi QĐ tạm đình chỉ / QĐ tiếp tục cho người khiếu nại và các bên (k1, k2 Điều 28b NĐ 124 bổ sung bởi NĐ 155) */
  ngayGui?: string;
  ngayGuiTiepTuc?: string;
}

export const TEN_TDC: Record<TamDinhChi["truongHop"], string> = {
  a: "Bất khả kháng, trở ngại khách quan (điểm a k1 Điều 11a)",
  b: "Chờ kết quả giải quyết vấn đề liên quan (điểm b k1 Điều 11a)",
};
export const TEN_DINH_CHI: Record<NonNullable<DonKhieuNai["dinhChi"]>["truongHop"], string> = {
  a: "Người khiếu nại rút toàn bộ khiếu nại (điểm a)",
  b: "Cá nhân chết / tổ chức giải thể, không có người kế thừa (điểm b)",
  c: "Không còn đối tượng, nội dung để giải quyết (điểm c)",
  d: "Tòa án đã thụ lý hoặc đã giải quyết (điểm d)",
};

/** Ngày NĐ 155/2026/NĐ-CP có hiệu lực (khoản 1 Điều 21) — thụ lý rút từ 10 xuống 07 ngày làm việc. */
export const NGAY_HL_ND155 = "2026-07-01";
/** Số ngày làm việc để thụ lý theo ngày nhận đơn (khoản 1 Điều 16 NĐ 124/2020/NĐ-CP, sửa bởi Điều 10 NĐ 155/2026/NĐ-CP). */
export const soNgayThuLy = (ngayNhan: string) => (ngayNhan >= NGAY_HL_ND155 ? 7 : 10);
export const CAN_CU_THU_LY = (lan: 1 | 2, ngayNhan = "") =>
  ngayNhan >= NGAY_HL_ND155
    ? `k1 Điều 16 NĐ 124/2020/NĐ-CP (sửa bởi Điều 10 NĐ 155/2026/NĐ-CP); ${lan === 1 ? "Điều 27" : "khoản 1 Điều 36"} Luật Khiếu nại (sửa bởi Luật 136/2025/QH15)`
    : `k1 Điều 16 NĐ 124/2020/NĐ-CP; Điều ${lan === 1 ? 27 : 36} Luật Khiếu nại 2011`;
export const CAN_CU_GIAI_QUYET = (lan: 1 | 2) => `Điều ${lan === 1 ? 28 : 37} Luật Khiếu nại 2011`;

/** Số ngày giải quyết theo Điều 28 (lần 1) / Điều 37 (lần 2) Luật Khiếu nại 2011. */
export function soNgayGiaiQuyet(lan: 1 | 2, phucTap: boolean, vungKhoKhan: boolean): number {
  const bang = lan === 1 ? [30, 45, 45, 60] : [45, 60, 60, 70];
  return bang[(vungKhoKhan ? 2 : 0) + (phucTap ? 1 : 0)]!;
}

export type TrangThaiDon = "CHO_THU_LY" | "QUA_HAN_THU_LY" | "DANG_GIAI_QUYET" | "SAP_HET" | "QUA_HAN" | "TAM_DINH_CHI" | "DA_GIAI_QUYET" | "KHONG_TINH_HAN";
export const TEN_TT_DON: Record<TrangThaiDon, string> = {
  CHO_THU_LY: "Chờ thụ lý",
  QUA_HAN_THU_LY: "Quá hạn thụ lý",
  DANG_GIAI_QUYET: "Đang giải quyết",
  SAP_HET: "Sắp hết hạn",
  QUA_HAN: "Quá hạn giải quyết",
  TAM_DINH_CHI: "Tạm đình chỉ",
  DA_GIAI_QUYET: "Đã giải quyết",
  KHONG_TINH_HAN: "Không tính hạn (thiếu căn cứ)",
};

export interface HanDon {
  tt: TrangThaiDon;
  /** Hạn thụ lý (khiếu nại chưa thụ lý) hoặc hạn giải quyết / trả lời */
  han?: string;
  soNgay?: number;
  canCu?: string;
  /** Số ngày còn lại (≥ 0) hoặc số ngày đã quá (< 0) tính đến hôm nay */
  conLai?: number;
  /** Số ngày tạm đình chỉ không tính vào thời hạn (k4 Điều 11a) */
  ngayTamDinhChi?: number;
}

const soNgay = (tu: string, den: string) => Math.round((Date.parse(den) - Date.parse(tu)) / 86400000);
/** Còn ≤ 5 ngày thì nhắc "sắp hết hạn". */
export const NGAY_NHAC_DON = 5;

export function hanDon(d: DonKhieuNai, homNay: string, lich: LichLamViec): HanDon {
  if (d.ketQua) return { tt: "DA_GIAI_QUYET" };
  if (d.loai === "KIEN_NGHI") {
    if (!d.hanNhap?.soNgay || !d.hanNhap.canCu.trim()) return { tt: "KHONG_TINH_HAN" };
    const han = hanChotNgay(d.ngayNhan, d.hanNhap.soNgay, lich);
    const conLai = soNgay(homNay, han);
    return { tt: conLai < 0 ? "QUA_HAN" : conLai <= NGAY_NHAC_DON ? "SAP_HET" : "DANG_GIAI_QUYET", han, soNgay: d.hanNhap.soNgay, canCu: d.hanNhap.canCu, conLai };
  }
  const lan = d.lan ?? 1;
  if (!d.ngayThuLy) {
    const n = soNgayThuLy(d.ngayNhan);
    const han = hanChot(d.ngayNhan, n, "NLV", lich);
    const conLai = soNgay(homNay, han);
    return { tt: conLai < 0 ? "QUA_HAN_THU_LY" : "CHO_THU_LY", han, soNgay: n, canCu: CAN_CU_THU_LY(lan, d.ngayNhan), conLai };
  }
  const n = soNgayGiaiQuyet(lan, !!d.phucTap, !!d.vungKhoKhan);
  const tdc = d.tamDinhChi ?? [];
  const dang = tdc.find((t) => !t.den);
  const ngayTdc = tdc.filter((t) => t.den).reduce((s, t) => s + Math.max(0, soNgay(t.tu, t.den!)), 0);
  const canCu = CAN_CU_GIAI_QUYET(lan) + (tdc.length ? "; k4 Điều 11a Luật Khiếu nại (Luật 136/2025), k2 Điều 28b NĐ 124/2020 (NĐ 155/2026)" : "");
  if (dang) return { tt: "TAM_DINH_CHI", soNgay: n, canCu, ngayTamDinhChi: ngayTdc + Math.max(0, soNgay(dang.tu, homNay)) };
  const han = hanChotNgay(d.ngayThuLy, n + ngayTdc, lich);
  const conLai = soNgay(homNay, han);
  return { tt: conLai < 0 ? "QUA_HAN" : conLai <= NGAY_NHAC_DON ? "SAP_HET" : "DANG_GIAI_QUYET", han, soNgay: n, canCu, conLai, ...(ngayTdc ? { ngayTamDinhChi: ngayTdc } : {}) };
}

/** Đơn chưa có kết quả của hộ */
export const donDangMo = (h: Ho) => (h.khieuNai ?? []).filter((d) => !d.ketQua);

export interface ThongKeDon {
  tong: number;
  dangGiaiQuyet: number;
  quaHan: number;
  daGiaiQuyet: number;
  soHo: number;
  /** 1.1.0 (A4): đơn đang tạm đình chỉ (k1 Điều 11a Luật Khiếu nại); gói tỉnh trước 1.1.0 không có */
  tamDinhChi?: number;
  /** 1.1.0 (A4): đơn có việc gửi văn bản / thông báo quá hạn (Điều 28, 28b NĐ 124 sửa, bổ sung bởi NĐ 155) */
  thuTucCham?: number;
}

export function thongKeDon(hos: Ho[], homNay: string, lich: LichLamViec): ThongKeDon {
  const tk: ThongKeDon = { tong: 0, dangGiaiQuyet: 0, quaHan: 0, daGiaiQuyet: 0, soHo: 0, tamDinhChi: 0, thuTucCham: 0 };
  for (const h of hos) {
    const ds = h.khieuNai ?? [];
    if (ds.length) tk.soHo++;
    for (const d of ds) {
      tk.tong++;
      const t = hanDon(d, homNay, lich).tt;
      if (t === "DA_GIAI_QUYET") tk.daGiaiQuyet++;
      else {
        tk.dangGiaiQuyet++;
        if (t === "QUA_HAN" || t === "QUA_HAN_THU_LY") tk.quaHan++;
        if (t === "TAM_DINH_CHI") tk.tamDinhChi!++;
      }
      if (canhBaoThuTucDon(d, homNay, lich).some((c) => c.muc === "CAO")) tk.thuTucCham!++;
    }
  }
  return tk;
}

/** Kết quả đã có văn bản giải quyết (không tính đình chỉ, không thụ lý) — để tính hạn gửi QĐ (điểm a k2 Điều 29 NĐ 124/2020). */
const CO_QD_GIAI_QUYET: KetQuaDon[] = ["DUNG", "DUNG_MOT_PHAN", "SAI"];

/** A3: hạn gửi QĐ giải quyết khiếu nại: lần đầu 03, lần hai 07 ngày làm việc kể từ ngày ban hành (điểm a k2 Điều 29 NĐ 124/2020). */
export function hanGuiQd(d: DonKhieuNai, homNay: string, lich: LichLamViec): { han: string; soNgay: number; quaHan: boolean; canCu: string } | null {
  if (d.loai !== "KHIEU_NAI" || !d.ketQua || !CO_QD_GIAI_QUYET.includes(d.ketQua) || !d.ngayVb || d.ngayGuiQd) return null;
  const n = (d.lan ?? 1) === 2 ? 7 : 3;
  const han = hanChot(d.ngayVb, n, "NLV", lich);
  return { han, soNgay: n, quaHan: homNay > han, canCu: "điểm a khoản 2 Điều 29 NĐ 124/2020/NĐ-CP" };
}

export interface CanhBaoThuTuc {
  muc: "CAO" | "TRUNG_BINH";
  noiDung: string;
  canCu: string;
}

const CC_28B = "khoản 1, 2 Điều 28b NĐ 124/2020/NĐ-CP (bổ sung bởi NĐ 155/2026/NĐ-CP)";
const CC_28 = "khoản 1 Điều 28 NĐ 124/2020/NĐ-CP (sửa bởi NĐ 155/2026/NĐ-CP)";

/**
 * 1.1.0 (A1, A2): nhắc thủ tục của đơn khiếu nại — gửi QĐ tạm đình chỉ, đình chỉ, tiếp tục giải quyết trong 03 ngày làm việc kể từ
 * ngày ban hành (k1, k2 Điều 28b); gửi thông báo tổ chức đối thoại trước ngày đối thoại ít nhất 05 ngày (k1 Điều 28).
 */
export function canhBaoThuTucDon(d: DonKhieuNai, homNay: string, lich: LichLamViec): CanhBaoThuTuc[] {
  if (d.loai !== "KHIEU_NAI") return [];
  const out: CanhBaoThuTuc[] = [];
  const vn = (iso: string) => iso.split("-").reverse().join("/");
  const gui = (moc: string | undefined, da: string | undefined, ten: string) => {
    if (!moc || da) {
      if (moc && da) {
        const han = hanChot(moc, 3, "NLV", lich);
        if (da > han) out.push({ muc: "TRUNG_BINH", noiDung: `${ten} gửi ngày ${vn(da)}, quá hạn ${vn(han)} (03 ngày làm việc kể từ ngày ban hành)`, canCu: CC_28B });
      }
      return;
    }
    const han = hanChot(moc, 3, "NLV", lich);
    if (homNay > han) out.push({ muc: "CAO", noiDung: `Chưa ghi ngày gửi ${ten} (hạn ${vn(han)}, 03 ngày làm việc kể từ ngày ban hành ${vn(moc)})`, canCu: CC_28B });
  };
  for (const t of d.tamDinhChi ?? []) {
    gui(t.tu, t.ngayGui, "QĐ tạm đình chỉ");
    gui(t.den, t.ngayGuiTiepTuc, "QĐ tiếp tục giải quyết");
  }
  if (d.ketQua === "DINH_CHI") gui(d.dinhChi?.ngay, d.ngayGuiDinhChi, "QĐ đình chỉ");
  const dt = d.doiThoai;
  if (dt?.ngay && !d.ketQua) {
    const tbMuonNhat = hanChot(dt.ngay, -5, "N", lich);
    if (!dt.ngayTb) {
      if (homNay > tbMuonNhat) out.push({ muc: "CAO", noiDung: `Chưa ghi ngày gửi thông báo tổ chức đối thoại (đối thoại ${vn(dt.ngay)}; phải gửi chậm nhất ${vn(tbMuonNhat)} — trước ít nhất 05 ngày)`, canCu: CC_28 });
      else out.push({ muc: "TRUNG_BINH", noiDung: `Gửi thông báo tổ chức đối thoại chậm nhất ${vn(tbMuonNhat)} (đối thoại ${vn(dt.ngay)}, trước ít nhất 05 ngày)`, canCu: CC_28 });
    } else if (dt.ngayTb > tbMuonNhat) out.push({ muc: "CAO", noiDung: `Thông báo đối thoại gửi ${vn(dt.ngayTb)} — chưa đủ 05 ngày trước ngày đối thoại ${vn(dt.ngay)} (chậm nhất ${vn(tbMuonNhat)})`, canCu: CC_28 });
  }
  return out;
}

export interface DonThang {
  /** YYYY-MM */
  ky: string;
  /** Đơn nhận trong tháng */
  moi: number;
  /** Đơn có quyết định / văn bản giải quyết trong tháng */
  daGiaiQuyet: number;
  /** Đơn quá hạn thụ lý, giải quyết tại cuối tháng (tháng hiện tại: tại hôm nay) */
  quaHan: number;
}

/**
 * 1.2.0 (D3) — Diễn biến đơn khiếu nại, kiến nghị theo tháng (tối đa `soThang` tháng gần nhất đến tháng hiện tại): đơn mới, đã
 * giải quyết (theo ngày văn bản giải quyết đã ghi), quá hạn tại cuối tháng (đơn chưa giải quyết đến cuối tháng đó).
 */
export function donTheoThang(hos: Ho[], homNay: string, lich: LichLamViec, soThang = 12): DonThang[] {
  const ds = hos.flatMap((h) => h.khieuNai ?? []);
  if (!ds.length) return [];
  const ky: string[] = [];
  let [y, m] = homNay.slice(0, 7).split("-").map(Number) as [number, number];
  for (let i = 0; i < soThang; i++) {
    ky.unshift(`${y}-${String(m).padStart(2, "0")}`);
    if (--m === 0) { m = 12; y--; }
  }
  const dau = ds.reduce((a, d) => (d.ngayNhan < a ? d.ngayNhan : a), homNay).slice(0, 7);
  return ky
    .filter((k) => k >= dau)
    .map((k) => {
      const [yy, mm] = k.split("-").map(Number) as [number, number];
      const cuoi = k === homNay.slice(0, 7) ? homNay : new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10);
      let quaHan = 0;
      for (const d of ds) {
        if (d.ngayNhan > cuoi) continue;
        const xong = d.ketQua && (!d.ngayVb || d.ngayVb <= cuoi);
        if (xong) continue;
        const tt = hanDon({ ...d, ketQua: undefined }, cuoi, lich).tt;
        if (tt === "QUA_HAN" || tt === "QUA_HAN_THU_LY") quaHan++;
      }
      return {
        ky: k,
        moi: ds.filter((d) => d.ngayNhan.startsWith(k)).length,
        daGiaiQuyet: ds.filter((d) => d.ketQua && d.ngayVb?.startsWith(k)).length,
        quaHan,
      };
    });
}

