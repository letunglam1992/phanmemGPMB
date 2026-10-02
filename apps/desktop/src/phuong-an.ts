/**
 * Phiên bản phương án bồi thường, hỗ trợ, tái định cư (docs/04 §1 "Phương án"; QD-03).
 *
 * - "Tạm tính" là số liệu sống, thay đổi theo hồ sơ. Khi cán bộ CHỐT, phần mềm đóng băng một bản:
 *   dữ liệu hồ sơ từng hộ + tham số dự án + kết quả từng khoản + mã băm SHA-256.
 * - Chỉ hộ có tổng "được chốt" (không còn khoản Thiếu căn cứ / Cần xác nhận — QD-03) mới đưa vào bản chốt;
 *   phần mềm không tự loại hộ: trả danh sách để cán bộ quyết định.
 * - Bản đã chốt → Phê duyệt (bắt buộc số, ngày quyết định) hoặc Hủy (bắt buộc lý do).
 *   Bản đã phê duyệt không sửa, không xóa; thay đổi = lập bản mới có lý do điều chỉnh.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo, TEN_COT, type CotTongHop, type KetQuaHo } from "./tinh-ho";
import { taoId, type DuAn, type Ho } from "./mo-hinh";
import { soD } from "./so";
import { loiChotTheoDot, tenDot, timDot } from "./dot-thu-hoi";

export type TrangThaiPA = "DA_CHOT" | "DA_PHE_DUYET" | "DA_HUY";
export const TEN_TT_PA: Record<TrangThaiPA, string> = { DA_CHOT: "Đã chốt, chờ phê duyệt", DA_PHE_DUYET: "Đã phê duyệt", DA_HUY: "Đã hủy" };

export interface DongChot {
  ma: string;
  noiDung: string;
  cot: CotTongHop;
  thanhTien: string | null;
  trangThai: string;
  canCu: string;
}

export interface HoChot {
  hoId: string;
  ma: string;
  ten: string;
  dtThuHoi: string;
  theoCot: Record<CotTongHop, string>;
  tongBoiThuong: string;
  tongHoTro: string;
  /** Tổng đã làm tròn ở cấp hộ (QD-03). */
  tong: string;
  khauTru: string;
  conLai: string;
  dong: DongChot[];
  /** Bản sao hồ sơ tại thời điểm chốt — để tính lại, đối chiếu. */
  duLieu: Ho;
}

export interface PhienBanPA {
  id: string;
  so: number;
  ten: string;
  trangThai: TrangThaiPA;
  luc: string;
  nguoi: string;
  /** Lý do lập bản (bắt buộc khi điều chỉnh hộ đã có trong bản phê duyệt). */
  lyDo: string;
  boChinhSach: string;
  thamSoDuAn: Pick<DuAn, "xa" | "giaGao" | "hanMucNN" | "heSoGiaDat">;
  ho: HoChot[];
  tong: string;
  bam: string;
  /** Ghi nhận phê duyệt: số, ngày QĐ có thể để trống khi ghi nhận và bổ sung sau; `dot` = đợt phê duyệt thứ mấy của dự án. */
  pheDuyet?: { so: string; ngay: string; coQuan: string; luc: string; nguoi: string; dot?: number };
  huy?: { luc: string; nguoi: string; lyDo: string };
  /** P3-1: bản phương án của đợt thu hồi (dự án có đợt: chốt, phê duyệt theo đợt). Trống = cả dự án (dự án không chia đợt). */
  dotId?: string;
  /** Tên đợt tại thời điểm chốt (in trên bảng xuất). */
  dotTen?: string;
}

export class LoiPhuongAn extends Error {}

const s = (d: Decimal) => d.toFixed();

export async function sha256(x: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Nội dung được băm: mọi thứ quyết định số tiền (không gồm trạng thái, phê duyệt). */
/** Nội dung được băm; bản của đợt (P3-1) băm thêm mã đợt — bản cũ không có đợt giữ nguyên mã băm. */
const noiDungBam = (p: Pick<PhienBanPA, "boChinhSach" | "thamSoDuAn" | "ho" | "tong" | "dotId">) =>
  JSON.stringify(p.dotId ? [p.boChinhSach, p.thamSoDuAn, p.ho, p.tong, p.dotId] : [p.boChinhSach, p.thamSoDuAn, p.ho, p.tong]);

export function chupHo(h: Ho, k: KetQuaHo): HoChot {
  return {
    hoId: h.id,
    ma: h.ma,
    ten: h.ten,
    dtThuHoi: s(h.thua.reduce((a, t) => a.plus(soD(t.dienTichThuHoi)), D(0))),
    theoCot: Object.fromEntries(Object.entries(k.theoCot).map(([c, v]) => [c, s(v)])) as Record<CotTongHop, string>,
    tongBoiThuong: s(k.tongBoiThuong),
    tongHoTro: s(k.tongHoTro),
    tong: s(k.tong.tongLamTron),
    khauTru: s(k.khauTru),
    conLai: s(k.conLai),
    dong: k.tatCa.map((x) => ({
      ma: x.dong.ma,
      noiDung: x.dong.noiDung,
      cot: x.cot,
      thanhTien: x.dong.thanhTien ? s(x.dong.thanhTien) : null,
      trangThai: x.dong.trangThai,
      canCu: x.dong.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(" ")).join("; "),
    })),
    duLieu: structuredClone(h),
  };
}

/** Hộ chưa đủ điều kiện chốt (còn khoản Thiếu căn cứ / Cần xác nhận). */
export function hoChuaDuDieuKien(ds: { h: Ho; k: KetQuaHo }[]): { h: Ho; lyDo: string }[] {
  return ds
    .filter(({ k }) => !k.tong.duocChot)
    .map(({ h, k }) => ({ h, lyDo: [k.tong.soDongThieuCanCu && `${k.tong.soDongThieuCanCu} khoản thiếu căn cứ`, k.tong.soDongCanXacNhan && `${k.tong.soDongCanXacNhan} khoản cần xác nhận`].filter(Boolean).join(", ") }));
}

/** Hộ đã có trong một bản đã phê duyệt còn hiệu lực. */
export function hoDaPheDuyet(dsPA: PhienBanPA[]): Map<string, PhienBanPA> {
  const m = new Map<string, PhienBanPA>();
  for (const p of [...dsPA].sort((a, b) => a.so - b.so)) if (p.trangThai === "DA_PHE_DUYET") for (const h of p.ho) m.set(h.hoId, p);
  return m;
}

export async function chotPhuongAn(
  cs: BoChinhSach,
  duAn: DuAn,
  hos: Ho[],
  o: { ten: string; lyDo: string; nguoi: string; luc?: string; dotId?: string },
): Promise<PhienBanPA> {
  if (!hos.length) throw new LoiPhuongAn("Chưa chọn hộ nào để chốt.");
  if (!o.ten.trim()) throw new LoiPhuongAn("Chưa đặt tên phiên bản phương án.");
  const loiDot = loiChotTheoDot(duAn, hos, o.dotId);
  if (loiDot.length) throw new LoiPhuongAn(loiDot.join("; "));
  const dot = timDot(duAn, o.dotId);
  const ds = hos.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
  const chua = hoChuaDuDieuKien(ds);
  if (chua.length) throw new LoiPhuongAn(`Không chốt được: ${chua.map((x) => `${x.h.ma} (${x.lyDo})`).join("; ")}. Bỏ các hộ này khỏi bản chốt hoặc xử lý các khoản trước.`);
  const dsPA = duAn.phuongAn ?? [];
  const dieuChinh = hos.filter((h) => hoDaPheDuyet(dsPA).has(h.id));
  if (dieuChinh.length && !o.lyDo.trim())
    throw new LoiPhuongAn(`Hộ ${dieuChinh.map((h) => h.ma).join(", ")} đã có trong phương án đã phê duyệt — phải ghi lý do điều chỉnh, bổ sung.`);
  const ho = ds.map(({ h, k }) => chupHo(h, k));
  const base = {
    boChinhSach: duAn.boChinhSach,
    thamSoDuAn: structuredClone({ xa: duAn.xa, giaGao: duAn.giaGao, hanMucNN: duAn.hanMucNN, heSoGiaDat: duAn.heSoGiaDat }),
    ho,
    tong: s(ds.reduce((a, x) => a.plus(x.k.tong.tongLamTron), D(0))),
    ...(dot ? { dotId: dot.id } : {}),
  };
  return {
    id: taoId(),
    so: dsPA.reduce((m, p) => Math.max(m, p.so), 0) + 1,
    ten: o.ten.trim(),
    trangThai: "DA_CHOT",
    luc: o.luc ?? new Date().toISOString(),
    nguoi: o.nguoi,
    lyDo: o.lyDo.trim(),
    ...base,
    ...(dot ? { dotTen: tenDot(dot) } : {}),
    bam: await sha256(noiDungBam(base)),
  };
}

export function pheDuyet(p: PhienBanPA, qd: { so: string; ngay: string; coQuan: string; dot?: number }, nguoi: string, luc = new Date().toISOString()): PhienBanPA {
  if (p.trangThai !== "DA_CHOT") throw new LoiPhuongAn(`Chỉ phê duyệt được bản "Đã chốt" (bản này: ${TEN_TT_PA[p.trangThai]}).`);
  return { ...p, trangThai: "DA_PHE_DUYET", pheDuyet: { so: qd.so.trim(), ngay: qd.ngay, coQuan: qd.coQuan.trim(), luc, nguoi, ...(qd.dot ? { dot: qd.dot } : {}) } };
}

/** Bổ sung số, ngày, cơ quan QĐ cho bản đã ghi nhận phê duyệt mà còn trống — chỉ điền ô trống, không sửa số đã ghi. */
export function boSungQd(p: PhienBanPA, qd: { so: string; ngay: string; coQuan: string }): PhienBanPA {
  if (p.trangThai !== "DA_PHE_DUYET" || !p.pheDuyet) throw new LoiPhuongAn("Chỉ bổ sung cho bản đã ghi nhận phê duyệt.");
  const c = p.pheDuyet;
  return { ...p, pheDuyet: { ...c, so: c.so || qd.so.trim(), ngay: c.ngay || qd.ngay, coQuan: c.coQuan || qd.coQuan.trim() } };
}

/** Đợt phê duyệt thứ mấy: số đã ghi khi phê duyệt; bản cũ thì theo thứ tự ghi nhận phê duyệt trong dự án. */
export function dotPheDuyet(ds: PhienBanPA[], p: PhienBanPA): number {
  if (p.pheDuyet?.dot) return p.pheDuyet.dot;
  const da = ds.filter((x) => x.trangThai === "DA_PHE_DUYET" && x.pheDuyet).sort((a, b) => a.pheDuyet!.luc.localeCompare(b.pheDuyet!.luc));
  const i = da.findIndex((x) => x.id === p.id);
  return i >= 0 ? i + 1 : da.length + 1;
}

/** Số, ngày QĐ để hiển thị: "12/QĐ-UBND ngày 01/10/2026"; trống → "(chưa ghi số, ngày QĐ)". */
export function moTaQd(qd: { so: string; ngay: string } | undefined): string {
  if (!qd) return "";
  const n = qd.ngay ? qd.ngay.split("-").reverse().join("/") : "";
  if (!qd.so && !n) return "(chưa ghi số, ngày QĐ)";
  return `${qd.so || "(chưa ghi số)"}${n ? ` ngày ${n}` : " (chưa ghi ngày)"}`;
}

export function huyBan(p: PhienBanPA, lyDo: string, nguoi: string, luc = new Date().toISOString()): PhienBanPA {
  if (p.trangThai !== "DA_CHOT") throw new LoiPhuongAn("Bản đã phê duyệt không hủy được — lập bản điều chỉnh mới.");
  if (!lyDo.trim()) throw new LoiPhuongAn("Phải ghi lý do hủy.");
  return { ...p, trangThai: "DA_HUY", huy: { luc, nguoi, lyDo: lyDo.trim() } };
}

/** Mã băm còn khớp (bản chốt không bị sửa trong kho hoặc tệp sao lưu). */
export async function kiemTraToanVen(p: PhienBanPA): Promise<boolean> {
  return (await sha256(noiDungBam(p))) === p.bam;
}

/** Dựng lại dự án theo tham số đã đóng băng. */
export const duAnTheoBan = (duAn: DuAn, p: PhienBanPA): DuAn => ({ ...duAn, ...structuredClone(p.thamSoDuAn), boChinhSach: p.boChinhSach });

/**
 * Tính lại từ dữ liệu đã đóng băng và đối chiếu với số đã chốt. Khác nhau nghĩa là phần mềm hoặc bộ chính sách
 * đã thay đổi cách tính kể từ khi chốt → không dùng kết quả tính lại để xuất thay cho bản đã chốt.
 */
export function tinhLaiBan(cs: BoChinhSach, duAn: DuAn, p: PhienBanPA): { ds: { h: Ho; k: KetQuaHo }[]; lech: { ma: string; daChot: string; tinhLai: string }[] } {
  const da = duAnTheoBan(duAn, p);
  const ds = p.ho.map((x) => ({ h: x.duLieu, k: tinhHo(cs, da, x.duLieu) }));
  const lech = p.ho
    .map((x, i) => ({ ma: x.ma, daChot: x.tong, tinhLai: s(ds[i]!.k.tong.tongLamTron) }))
    .filter((x) => !D(x.daChot).eq(x.tinhLai));
  return { ds, lech };
}

export type LoaiThayDoi = "THEM" | "BO" | "TANG" | "GIAM" | "GIU";
export interface DongSoSanh {
  hoId: string;
  ma: string;
  ten: string;
  truoc: string | null;
  sau: string | null;
  chenh: string;
  loai: LoaiThayDoi;
  /** Chênh lệch theo từng khoản (so theo mã + nội dung). */
  khoan: { ma: string; noiDung: string; truoc: string | null; sau: string | null; chenh: string }[];
  /** Chênh lệch theo cột tổng hợp. */
  cot: { cot: CotTongHop; ten: string; chenh: string }[];
}

/** So sánh hai tập hộ đã chụp (bản A → bản B). */
export function soSanh(a: HoChot[], b: HoChot[]): { dong: DongSoSanh[]; tongTruoc: string; tongSau: string; chenh: string } {
  const ma = new Map(a.map((x) => [x.hoId, x]));
  const mb = new Map(b.map((x) => [x.hoId, x]));
  const ids = [...new Set([...a.map((x) => x.hoId), ...b.map((x) => x.hoId)])];
  const dong: DongSoSanh[] = ids.map((id) => {
    const x = ma.get(id);
    const y = mb.get(id);
    const t = x ? D(x.tong) : D(0);
    const u = y ? D(y.tong) : D(0);
    const loai: LoaiThayDoi = !x ? "THEM" : !y ? "BO" : u.gt(t) ? "TANG" : u.lt(t) ? "GIAM" : "GIU";
    const khoa = (d: DongChot) => `${d.ma}|${d.noiDung}`;
    const kx = new Map<string, DongChot>((x?.dong ?? []).map((d) => [khoa(d), d]));
    const ky = new Map<string, DongChot>((y?.dong ?? []).map((d) => [khoa(d), d]));
    const khoan = [...new Set([...kx.keys(), ...ky.keys()])]
      .map((k) => {
        const p = kx.get(k);
        const q = ky.get(k);
        const tp = p?.thanhTien ?? null;
        const tq = q?.thanhTien ?? null;
        return { ma: (p ?? q)!.ma, noiDung: (p ?? q)!.noiDung, truoc: tp, sau: tq, chenh: s(D(tq ?? 0).minus(tp ?? 0)) };
      })
      .filter((k) => !D(k.chenh).isZero() || (k.truoc === null) !== (k.sau === null));
    const cot = (Object.keys(TEN_COT) as CotTongHop[])
      .map((c) => ({ cot: c, ten: TEN_COT[c], chenh: s(D(y?.theoCot[c] ?? 0).minus(x?.theoCot[c] ?? 0)) }))
      .filter((c) => !D(c.chenh).isZero());
    return { hoId: id, ma: (x ?? y)!.ma, ten: (y ?? x)!.ten, truoc: x?.tong ?? null, sau: y?.tong ?? null, chenh: s(u.minus(t)), loai, khoan, cot };
  });
  dong.sort((p, q) => p.ma.localeCompare(q.ma, "vi", { numeric: true }));
  const tongTruoc = a.reduce((m, x) => m.plus(x.tong), D(0));
  const tongSau = b.reduce((m, x) => m.plus(x.tong), D(0));
  return { dong, tongTruoc: s(tongTruoc), tongSau: s(tongSau), chenh: s(tongSau.minus(tongTruoc)) };
}

/** Hộ đã sửa hồ sơ sau khi phê duyệt: tổng tạm tính hiện tại khác bản đã phê duyệt. */
export function hoLechSauPheDuyet(dsPA: PhienBanPA[], hienTai: { h: Ho; k: KetQuaHo }[]): { h: Ho; ban: PhienBanPA; daDuyet: string; hienTai: string }[] {
  const m = hoDaPheDuyet(dsPA);
  return hienTai.flatMap(({ h, k }) => {
    const p = m.get(h.id);
    if (!p) return [];
    const x = p.ho.find((y) => y.hoId === h.id)!;
    return D(x.tong).eq(k.tong.tongLamTron) ? [] : [{ h, ban: p, daDuyet: x.tong, hienTai: s(k.tong.tongLamTron) }];
  });
}

/** Dòng trạng thái in trên bảng xuất của một bản phương án. */
export function moTaBan(p: PhienBanPA): string {
  const ngay = (iso: string) => iso.split("-").reverse().join("/");
  const chot = `${p.dotTen ? `${p.dotTen}, ` : ""}chốt ngày ${ngay(p.luc.slice(0, 10))}`;
  if (p.trangThai === "DA_PHE_DUYET" && p.pheDuyet) return `Phương án bản ${p.so} – ĐÃ PHÊ DUYỆT${p.pheDuyet.dot ? ` (đợt ${p.pheDuyet.dot})` : ""} theo Quyết định số ${moTaQd(p.pheDuyet)}${p.pheDuyet.coQuan ? ` của ${p.pheDuyet.coQuan}` : ""} (${chot})`;
  if (p.trangThai === "DA_HUY") return `Phương án bản ${p.so} – ĐÃ HỦY (${chot}) – không dùng để chi trả`;
  return `Phương án bản ${p.so} – ĐÃ CHỐT, CHỜ PHÊ DUYỆT (${chot})`;
}
