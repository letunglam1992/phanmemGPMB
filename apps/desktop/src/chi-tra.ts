/**
 * Theo dõi chi trả tiền bồi thường, hỗ trợ và tiền chậm trả (khoản 3, 4 Điều 94 Luật Đất đai 2024).
 *
 * - Số phải trả lấy từ BẢN PHƯƠNG ÁN ĐÃ PHÊ DUYỆT gần nhất có hộ (không lấy số tạm tính).
 * - Hạn chi trả: 30 ngày kể từ ngày quyết định phê duyệt có hiệu lực (điểm a k3 Đ94); ngày đầu tính hạn
 *   là ngày liền sau (k2 Đ147 BLDS 2015).
 * - Tiền chậm trả (điểm b k3 Đ94): "bằng mức tiền chậm nộp theo quy định của Luật Quản lý thuế tính trên
 *   số tiền chậm trả và thời gian chậm trả". Phần mềm KHÔNG tự đặt mức: cán bộ nhập tỷ lệ theo từng giai
 *   đoạn kèm căn cứ; thiếu tỷ lệ cho ngày nào thì khoản này "Thiếu căn cứ".
 * - Tiền gửi ngân hàng khi người có đất không nhận / có tranh chấp (k4 Đ94) được coi là đã giải quyết khoản
 *   đó từ ngày gửi — không tính chậm trả sau ngày gửi.
 * - Nguyên nhân chậm do cơ quan, đơn vị thực hiện bồi thường hay không: cán bộ xác nhận; phần mềm chỉ tạm tính.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { Ho } from "./mo-hinh";
import { hoDaPheDuyet, type PhienBanPA } from "./phuong-an";

export type HinhThucChi = "TIEN_MAT" | "CHUYEN_KHOAN" | "GUI_NGAN_HANG";
export const TEN_HINH_THUC: Record<HinhThucChi, string> = { TIEN_MAT: "Tiền mặt", CHUYEN_KHOAN: "Chuyển khoản", GUI_NGAN_HANG: "Gửi ngân hàng (không nhận / tranh chấp — k4 Đ94)" };

export interface DotChi {
  id: string;
  ngay: string;
  soTien: string;
  hinhThuc: HinhThucChi;
  chungTu: string;
  ghiChu?: string;
  nguoiGhi: string;
  /** Đợt chi đã hủy (P0-4): giữ lại để truy vết chứng từ, không tính vào số đã chi. */
  huy?: { luc: string; nguoi: string; lyDo: string };
}

/** Các đợt chi còn hiệu lực (bỏ đợt đã hủy). */
export const dotHieuLuc = (ct: Pick<ChiTraHo, "dot"> | undefined | null) => (ct?.dot ?? []).filter((d) => !d.huy);

export interface ChiTraHo {
  /** Ngày QĐ phê duyệt có hiệu lực (mặc định = ngày QĐ); cán bộ sửa nếu QĐ ghi hiệu lực khác. */
  ngayHieuLuc?: string;
  dot: DotChi[];
  /** Cán bộ xác nhận nguyên nhân chậm (nếu có chậm). */
  nguyenNhanCham?: "DO_CO_QUAN" | "DO_NGUOI_DAN" | "";
  ghiChuCham?: string;
}

export interface GiaiDoanTyLe {
  tuNgay: string;
  /** Tỷ lệ %/ngày dạng chuỗi, vd. "0.03". */
  tyLe: string;
  canCu: string;
}

export const KHOA_TY_LE_CHAM = "tyLeChamTra";

const cong = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const soNgay = (tu: string, den: string) => Math.round((Date.parse(den) - Date.parse(tu)) / 86400000);

export interface KetQuaChiTra {
  ban: PhienBanPA | null;
  /** Số phải trả theo bản đã duyệt (sau khấu trừ). */
  phaiTra: Decimal | null;
  ngayHieuLuc: string | null;
  hanChi: string | null;
  daChi: Decimal;
  conLai: Decimal | null;
  chamTra: { dotId: string; ngay: string; soTien: Decimal; soNgay: number; tien: Decimal | null; dienGiai: string }[];
  tienChamTra: Decimal | null;
  trangThai: "CHUA_DUYET" | "CHUA_CHI" | "CHI_MOT_PHAN" | "DA_CHI_DU" | "CHI_VUOT";
  canhBao: string[];
}

/** Tiền chậm trả của một khoản: cộng theo từng ngày chậm với tỷ lệ của giai đoạn chứa ngày đó. */
export function tienChamTraKhoan(soTien: Decimal, tuNgay: string, denNgay: string, giaiDoan: GiaiDoanTyLe[]): { tien: Decimal | null; dienGiai: string } {
  const n = soNgay(tuNgay, denNgay);
  if (n <= 0) return { tien: D(0), dienGiai: "" };
  const gd = [...giaiDoan].sort((a, b) => a.tuNgay.localeCompare(b.tuNgay));
  let tong = D(0);
  const dem = new Map<GiaiDoanTyLe, number>();
  for (let i = 1; i <= n; i++) {
    const ngay = cong(tuNgay, i);
    const g = gd.filter((x) => x.tuNgay <= ngay).at(-1);
    if (!g) return { tien: null, dienGiai: `Chưa có tỷ lệ tiền chậm nộp áp dụng cho ngày ${ngay.split("-").reverse().join("/")}` };
    dem.set(g, (dem.get(g) ?? 0) + 1);
  }
  const phan: string[] = [];
  for (const [g, so] of dem) {
    tong = tong.plus(soTien.times(g.tyLe).div(100).times(so));
    phan.push(`${so} ngày × ${g.tyLe.replace(".", ",")}%/ngày (${g.canCu})`);
  }
  return { tien: tong.toDecimalPlaces(0), dienGiai: phan.join(" + ") };
}

export function tinhChiTra(h: Ho, dsPA: PhienBanPA[], giaiDoan: GiaiDoanTyLe[], homNay: string): KetQuaChiTra {
  const ban = hoDaPheDuyet(dsPA).get(h.id) ?? null;
  const ct0 = h.chiTra ?? { dot: [] };
  const ct = { ...ct0, dot: dotHieuLuc(ct0) };
  const daChi = ct.dot.reduce((s, x) => s.plus(x.soTien || "0"), D(0));
  const canhBao: string[] = [];
  if (!ban || !ban.pheDuyet) {
    if (ct.dot.length) canhBao.push("Đã ghi chi trả nhưng hộ chưa có trong bản phương án đã phê duyệt");
    return { ban: null, phaiTra: null, ngayHieuLuc: null, hanChi: null, daChi, conLai: null, chamTra: [], tienChamTra: null, trangThai: "CHUA_DUYET", canhBao };
  }
  const phaiTra = D(ban.ho.find((x) => x.hoId === h.id)!.conLai);
  const ngayHieuLuc = ct.ngayHieuLuc || ban.pheDuyet.ngay;
  const hanChi = cong(ngayHieuLuc, 30);
  const conLai = phaiTra.minus(daChi);
  const trangThai = daChi.isZero() ? "CHUA_CHI" : conLai.gt(0) ? "CHI_MOT_PHAN" : conLai.lt(0) ? "CHI_VUOT" : "DA_CHI_DU";
  if (trangThai === "CHI_VUOT") canhBao.push(`Đã chi vượt số được duyệt ${conLai.neg().toFixed(0)} đ — kiểm tra lại`);

  // Khoản chi sau hạn: chậm trả từ ngày liền sau hạn đến ngày chi; khoản còn nợ: tạm tính đến hôm nay
  const chamTra: KetQuaChiTra["chamTra"] = [];
  for (const d of [...ct.dot].sort((a, b) => a.ngay.localeCompare(b.ngay))) {
    if (d.ngay <= hanChi) continue;
    const r = tienChamTraKhoan(D(d.soTien || "0"), hanChi, d.ngay, giaiDoan);
    chamTra.push({ dotId: d.id, ngay: d.ngay, soTien: D(d.soTien || "0"), soNgay: soNgay(hanChi, d.ngay), tien: r.tien, dienGiai: r.dienGiai });
  }
  if (conLai.gt(0) && homNay > hanChi) {
    const r = tienChamTraKhoan(conLai, hanChi, homNay, giaiDoan);
    chamTra.push({ dotId: "", ngay: homNay, soTien: conLai, soNgay: soNgay(hanChi, homNay), tien: r.tien, dienGiai: `${r.dienGiai} — tạm tính đến hôm nay, khoản chưa chi` });
  }
  const thieu = chamTra.some((x) => x.tien === null);
  const tienChamTra = thieu ? null : chamTra.reduce((s, x) => s.plus(x.tien!), D(0));
  if (chamTra.length) {
    if (thieu) canhBao.push("Thiếu tỷ lệ tiền chậm nộp cho giai đoạn chậm trả — nhập ở Cài đặt chung → Tiền chậm trả");
    if (!ct.nguyenNhanCham) canhBao.push("Có khoản chi sau hạn 30 ngày: cần xác nhận nguyên nhân chậm (do cơ quan thực hiện bồi thường hay do người có đất)");
    if (ct.nguyenNhanCham === "DO_NGUOI_DAN") canhBao.push("Xác nhận chậm do người có đất: không tính tiền chậm trả; trường hợp không nhận tiền thực hiện gửi ngân hàng (k4 Đ94)");
  }
  return {
    ban,
    phaiTra,
    ngayHieuLuc,
    hanChi,
    daChi,
    conLai,
    chamTra,
    tienChamTra: ct.nguyenNhanCham === "DO_NGUOI_DAN" ? D(0) : tienChamTra,
    trangThai,
    canhBao,
  };
}
