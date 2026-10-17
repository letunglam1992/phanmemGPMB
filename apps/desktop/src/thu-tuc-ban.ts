/**
 * Thủ tục theo bản phương án (dùng chung cho Excel tiến độ thủ tục, cảnh báo, tóm tắt gửi tỉnh, hộp ghi ngày).
 * - 1.0.16: khâu chi trả (≤ 30 ngày kể từ ngày QĐ phê duyệt có hiệu lực — điểm a k3 Đ94 LĐĐ 2024).
 * - 1.0.17: chỉnh lý hồ sơ địa chính (bước 15, ≤ 3 NLV sau chi trả — Mục XVIII Sổ tay) theo bản; kiểm tra trước khi nhận
 *   hồ sơ thẩm định: niêm yết công khai 30 ngày, lấy ý kiến, đối thoại (điểm a k3 Đ87 LĐĐ 2024). Chỉ cảnh báo, không chặn.
 * Chỉ dùng ngày cán bộ đã ghi; thiếu mốc thì để trống, không suy đoán.
 */
import type { Ho } from "./mo-hinh";
import type { PhienBanPA } from "./phuong-an";
import { hoDaPheDuyet } from "./phuong-an";
import { dotHieuLuc, tinhChiTra } from "./chi-tra";
import { hanChot, soNgayLamViec, type LichLamViec } from "./lich-lam-viec";
import { hanCuaBuoc, ngayIsoTuChu, tinhHanBuoc, type TinhHan } from "./han-buoc";
import { trangThaiDoiThoai } from "./doi-thoai";

export interface KhauThuTuc {
  /** Ngày mốc bắt đầu tính hạn */
  moc: string | null;
  han: string | null;
  /** Ngày hoàn thành (theo văn bản đã ghi) */
  xong: string | null;
  /** Số ngày làm việc (khâu chi trả: số ngày) chậm (>0) — đã xong muộn, hoặc chưa xong mà đã quá hạn (tính đến hôm nay) */
  cham: number;
  dangCham: boolean;
}

export const khau = (moc: string | null, han: string | null, xong: string | null, homNay: string, lich: LichLamViec, loai: "NLV" | "N" = "NLV"): KhauThuTuc => {
  const dem = (a: string, b: string) => (loai === "NLV" ? soNgayLamViec(a, b, lich) : Math.round((Date.parse(b) - Date.parse(a)) / 86400000));
  if (!han) return { moc, han, xong, cham: 0, dangCham: false };
  if (xong) return { moc, han, xong, cham: xong > han ? dem(han, xong) : 0, dangCham: false };
  return { moc, han, xong, cham: homNay > han ? dem(han, homNay) : 0, dangCham: homNay > han };
};

/** Hộ mà bản `p` là bản phê duyệt hiện hành (bản phê duyệt sau cùng có hộ). */
const hoHienHanh = (p: PhienBanPA, hos: Ho[], dsPA: PhienBanPA[]) => {
  const hien = hoDaPheDuyet(dsPA);
  return hos.filter((h) => hien.get(h.id)?.id === p.id);
};

export type KhauChiTra = KhauThuTuc & { daChiDu: number; soHo: number };
export const CAN_CU_CHI_TRA = "điểm a khoản 3 Điều 94 Luật Đất đai 2024";

/** Khâu chi trả của bản đã phê duyệt: hạn sớm nhất của các hộ; xong khi mọi hộ đã chi đủ — ngày là ngày chi cuối cùng. */
export function khauChiTra(p: PhienBanPA, hos: Ho[], dsPA: PhienBanPA[], homNay: string, lich: LichLamViec): KhauChiTra {
  if (p.trangThai !== "DA_PHE_DUYET") return { ...khau(null, null, null, homNay, lich), daChiDu: 0, soHo: 0 };
  const ds = hoHienHanh(p, hos, dsPA).map((h) => ({ h, ct: tinhChiTra(h, dsPA, [], homNay) }));
  const han = ds.map((x) => x.ct.hanChi).filter((x): x is string => !!x).sort()[0] ?? null;
  const du = ds.filter((x) => x.ct.trangThai === "DA_CHI_DU" || x.ct.trangThai === "CHI_VUOT" || (x.ct.phaiTra?.lte(0) ?? false));
  const ngayCuoi = du.flatMap((x) => dotHieuLuc(x.h.chiTra).map((d) => d.ngay)).sort().at(-1) ?? null;
  const xong = ds.length && du.length === ds.length ? ngayCuoi : null;
  const moc = ds.map((x) => x.ct.ngayHieuLuc).filter((x): x is string => !!x).sort()[0] ?? null;
  return { ...khau(moc, han, xong, homNay, lich, "N"), daChiDu: du.length, soHo: ds.length };
}

/**
 * 1.0.17 — Hạn chỉnh lý hồ sơ địa chính (bước 15: ≤ 3 ngày làm việc kể từ ngày hoàn thành chi trả — bước 12) của bản đã
 * phê duyệt: chỉ hộ mà bản là bản hiện hành, chưa xong bước 15, đã xong bước 12 có ngày; hộ có hạn sớm nhất. null nếu không có.
 */
export function hanChinhLyBan(p: PhienBanPA, hos: Ho[], dsPA: PhienBanPA[], homNay: string, lich: LichLamViec): TinhHan | null {
  if (p.trangThai !== "DA_PHE_DUYET") return null;
  const han = hanCuaBuoc("15")!;
  const ds = hoHienHanh(p, hos, dsPA)
    .filter((h) => h.tienDo["15"]?.trangThai !== "XONG" && h.tienDo["15"]?.trangThai !== "KHONG_AP_DUNG")
    .map((h) => tinhHanBuoc(h, han, homNay, lich))
    .filter((t) => t.hanChot);
  if (!ds.length) return null;
  return ds.sort((a, b) => a.hanChot!.localeCompare(b.hanChot!))[0]!;
}

/** Khâu chỉnh lý của bản cho Excel: hạn sớm nhất; xong khi mọi hộ (đã chi trả xong) đã xong bước 15 — ngày xong muộn nhất. */
export function khauChinhLy(p: PhienBanPA, hos: Ho[], dsPA: PhienBanPA[], homNay: string, lich: LichLamViec): KhauThuTuc & { daXong: number; soHo: number } {
  if (p.trangThai !== "DA_PHE_DUYET") return { ...khau(null, null, null, homNay, lich), daXong: 0, soHo: 0 };
  const han = hanCuaBuoc("15")!;
  const ds = hoHienHanh(p, hos, dsPA).filter((h) => h.tienDo["15"]?.trangThai !== "KHONG_AP_DUNG");
  const tinh = ds.map((h) => tinhHanBuoc(h, han, homNay, lich)).filter((t) => t.hanChot);
  const hanSom = tinh.map((t) => t.hanChot!).sort()[0] ?? null;
  const mocSom = tinh.map((t) => t.moc!).sort()[0] ?? null;
  const xongDs = ds.filter((h) => h.tienDo["15"]?.trangThai === "XONG");
  const ngayXong = xongDs.map((h) => h.tienDo["15"]?.ngay).filter((x): x is string => !!x).sort().at(-1) ?? null;
  const xong = ds.length && xongDs.length === ds.length ? ngayXong : null;
  return { ...khau(mocSom, hanSom, xong, homNay, lich), daXong: xongDs.length, soHo: ds.length };
}

/**
 * 1.0.17 — Kiểm tra trước khi nhận hồ sơ thẩm định một bản (điểm a khoản 3 Điều 87 Luật Đất đai 2024: niêm yết công khai
 * phương án 30 ngày; lấy ý kiến; đối thoại nếu còn ý kiến không đồng ý). Trả các cảnh báo — không chặn ghi nhận.
 * Thời gian niêm yết lấy từ ô "Niêm yết từ … đến …" của mẫu 09/10 đã ghi (của đợt nếu bản thuộc đợt, không thì của dự án).
 */
export function kiemTraTruocThamDinh(
  duAn: { vanBan?: Record<string, string>; dotThuHoi?: { id: string; vanBan?: Record<string, string> }[] },
  p: Pick<PhienBanPA, "ho" | "dotId">,
  hos: Ho[],
  ngayNhan: string | null,
  homNay: string,
  lich: LichLamViec,
): string[] {
  const out: string[] = [];
  const ids = new Set(p.ho.map((x) => x.hoId));
  const trong = hos.filter((h) => ids.has(h.id));
  const dot = p.dotId ? duAn.dotThuHoi?.find((d) => d.id === p.dotId) : undefined;
  const vb = { ...(dot ? {} : duAn.vanBan ?? {}), ...(dot?.vanBan ?? {}) };
  const tu = ngayIsoTuChu(vb.tg_niem_yet_tu);
  const den = ngayIsoTuChu(vb.tg_niem_yet_den);
  const vn = (iso: string) => iso.split("-").reverse().join("/");
  if (tu) {
    // 30 ngày tính từ ngày liền sau ngày bắt đầu niêm yết (khoản 2 Điều 147 BLDS 2015)
    const du30 = hanChot(tu, 30, "N", lich);
    if (den && den < du30) out.push(`Thời gian niêm yết ghi ${vn(tu)} – ${vn(den)} chưa đủ 30 ngày (đủ vào ngày ${vn(du30)}).`);
    else if (ngayNhan && ngayNhan < du30) out.push(`Ngày nhận hồ sơ ${vn(ngayNhan)} trước khi hết 30 ngày niêm yết (niêm yết từ ${vn(tu)}, đủ 30 ngày vào ${vn(du30)}).`);
  } else out.push("Chưa ghi thời gian niêm yết công khai phương án (ô \"Niêm yết từ … đến …\" của mẫu 09/10) — chưa kiểm tra được đủ 30 ngày.");
  const chuaNy = trong.filter((h) => h.tienDo["6"]?.trangThai !== "XONG" && h.tienDo["6"]?.trangThai !== "KHONG_AP_DUNG").length;
  if (chuaNy) out.push(`${chuaNy}/${trong.length} hộ chưa xác nhận xong bước 6 (niêm yết công khai).`);
  const chuaYk = trong.filter((h) => !h.yKienPA?.loai).length;
  if (chuaYk) out.push(`${chuaYk}/${trong.length} hộ chưa ghi ý kiến về phương án.`);
  const canDt = trong.filter((h) => ["CAN_DOI_THOAI", "QUA_HAN"].includes(trangThaiDoiThoai(h.yKienPA, homNay, lich).tt)).length;
  if (canDt) out.push(`${canDt} hộ không đồng ý chưa được đối thoại.`);
  return out;
}

export const CAN_CU_TRUOC_THAM_DINH = "điểm a khoản 3 Điều 87 Luật Đất đai 2024";

/** Loại đất nông nghiệp (mã theo hồ sơ thửa) — để xác định thời hạn thông báo 90 ngày (NN) hay 180 ngày (PNN). */
export const laDatNongNghiep = (loaiDat: string) => /^(LUC|LUK|LUN|HNK|BHK|NHK|CLN|RSX|RPH|RDD|NTS|NKH|LNP)$/i.test(loaiDat.trim());
export const CAN_CU_THONG_BAO = "khoản 1 Điều 85 Luật Đất đai 2024";

const congNgay = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const congThang = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const cuoi = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate(); // tháng không có ngày tương ứng → ngày cuối tháng
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, cuoi))).toISOString().slice(0, 10);
};

export interface ThongBaoNhom {
  ngayTb: string;
  /** 90 (chỉ đất nông nghiệp) hoặc 180 (có đất phi nông nghiệp) — k1 Đ85 */
  soNgay: 90 | 180;
  /** Ngày sớm nhất ban hành QĐ thu hồi: đủ `soNgay` ngày kể từ ngày thông báo (trừ trường hợp k2 Đ85) */
  somNhat: string;
  /** Ngày cuối hiệu lực của thông báo: 12 tháng kể từ ngày ban hành thông báo (k5 Đ85) */
  hieuLucDen: string;
  /** Số hộ trong nhóm chưa xác nhận xong bước 13 */
  conLai: number;
}

/**
 * 1.0.18 (A4) — Thông báo thu hồi của một nhóm hộ (đợt / hộ chưa xếp đợt / cả dự án): ngày thông báo của đợt (trống thì
 * của dự án); thời hạn 90/180 ngày trước khi ban hành QĐ thu hồi (khoản 1 Điều 85 LĐĐ 2024 — người có đất đồng ý thu hồi
 * trước hạn thì không phải chờ, khoản 2); thông báo có hiệu lực 12 tháng (khoản 5). Không có ngày thông báo → null.
 */
export function thongBaoNhom(duAn: { ngayThongBao?: string; dotThuHoi?: { id: string; ngayThongBao?: string }[] }, nhomId: string, hos: Ho[]): ThongBaoNhom | null {
  const dot = duAn.dotThuHoi?.find((d) => d.id === nhomId);
  const ngayTb = dot?.ngayThongBao || duAn.ngayThongBao;
  if (!ngayTb || !/^\d{4}-\d{2}-\d{2}$/.test(ngayTb) || !hos.length) return null;
  const soNgay = hos.some((h) => h.thua.some((t) => !laDatNongNghiep(t.loaiDat))) ? 180 : 90;
  return {
    ngayTb,
    soNgay,
    somNhat: congNgay(ngayTb, soNgay),
    hieuLucDen: congThang(ngayTb, 12),
    conLai: hos.filter((h) => h.tienDo["13"]?.trangThai !== "XONG" && h.tienDo["13"]?.trangThai !== "KHONG_AP_DUNG").length,
  };
}
