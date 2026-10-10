/**
 * P3-3 — Quỹ đất ở, nhà ở tái định cư cấp dự án (lô/căn, diện tích, giá, trạng thái giao).
 *
 * Quyết định của đơn vị (GĐ5):
 *  - Giá lô do đơn vị nhập **kèm căn cứ** (vd. giá đất ở tại khu TĐC theo bảng giá tại thời điểm phê duyệt phương án —
 *    khoản 3 Điều 111 Luật Đất đai 2024; giá bán nhà ở TĐC do UBND có thẩm quyền quyết định). Phần mềm không tự đặt giá.
 *  - Ghi nhận kết quả bốc thăm **khi dự án chọn hình thức bốc thăm** (ô tích). Phần mềm KHÔNG bốc thăm thay — chỉ ghi
 *    nhận kết quả theo biên bản do hội đồng/tổ công tác lập.
 *
 * Mỗi lô chỉ giao cho một hộ (cấu trúc `giao` một hộ; máy chủ kiểm lại). Giao lô ghi đồng thời vào hồ sơ hộ
 * (hoTro.taiDinhCu: khu, lô, DT, đơn giá, văn bản giá, `loId`) trong một giao dịch.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { taoId, type DuAn, type Ho, type TaiDinhCuHo } from "./mo-hinh";
import { laSoMay, soD } from "./so";

export type LoaiLo = "DAT_O" | "NHA_O";
export const TEN_LOAI_LO: Record<LoaiLo, string> = { DAT_O: "Lô đất ở", NHA_O: "Căn nhà ở" };
export type HinhThucGiao = "BOC_THAM" | "XET_GIAO";
export const TEN_HINH_THUC_GIAO: Record<HinhThucGiao, string> = { BOC_THAM: "Bốc thăm", XET_GIAO: "Xét giao (không bốc thăm)" };

export interface GiaoLo {
  hoId: string;
  ngay: string;
  hinhThuc: HinhThucGiao;
  /** Số, ngày biên bản bốc thăm / quyết định giao đất. */
  canCu: string;
  /** Kết quả bốc thăm liên quan (id), nếu giao theo bốc thăm. */
  bocThamId?: string;
  nguoi: string;
  luc: string;
}

export interface LoTdc {
  id: string;
  /** Khu, điểm tái định cư. */
  khu: string;
  /** Số lô / số căn. */
  soLo: string;
  loai: LoaiLo;
  /** Diện tích lô / căn (m², chuẩn máy). */
  dienTich: string;
  /** Giá đất ở tại khu TĐC hoặc giá bán nhà ở TĐC (đ/m², chuẩn máy) — đơn vị nhập. */
  gia?: string;
  /** Căn cứ giá (bắt buộc khi có giá). */
  canCuGia?: string;
  /** Tạm giữ, không đưa vào bốc thăm, không giao (vd. đang tranh chấp, dành cho đối tượng khác) — bắt buộc lý do. */
  giuLai?: string;
  giao?: GiaoLo;
  ghiChu?: string;
}

export interface KetQuaBocTham {
  id: string;
  ngay: string;
  /** Số, ngày biên bản bốc thăm. */
  bienBan: string;
  /** Thành phần chứng kiến, chủ trì (tóm tắt). */
  thanhPhan?: string;
  ketQua: { stt: number; hoId: string; loId: string }[];
  nguoi: string;
  luc: string;
  ghiChu?: string;
}

/** Nhật ký thu hồi giao lô (giữ vết khi giao nhầm, hộ đổi lô). */
export interface HuyGiao {
  loId: string;
  hoId: string;
  lyDo: string;
  nguoi: string;
  luc: string;
  giao: GiaoLo;
}

export interface QuyTdc {
  lo: LoTdc[];
  /** Dự án giao lô bằng hình thức bốc thăm (đơn vị tích chọn) → hiện phần ghi nhận kết quả bốc thăm. */
  bocTham?: boolean;
  ketQuaBocTham?: KetQuaBocTham[];
  huyGiao?: HuyGiao[];
}

export const quyCua = (duAn: Pick<DuAn, "quyTdc">): QuyTdc => duAn.quyTdc ?? { lo: [] };
export const tenLo = (l: Pick<LoTdc, "khu" | "soLo">) => `${l.khu.trim() || "—"} – lô ${l.soLo.trim() || "—"}`;
const khoaLo = (l: Pick<LoTdc, "khu" | "soLo">) => `${l.khu.trim().toLowerCase()}|${l.soLo.trim().toLowerCase()}`;

export function loMoi(p: Partial<LoTdc> = {}): LoTdc {
  return { id: taoId(), khu: "", soLo: "", loai: "DAT_O", dienTich: "", ...p };
}

/** Lỗi nhập lô (null = hợp lệ). */
export function loiLo(l: LoTdc, ds: LoTdc[]): string | null {
  if (!l.khu.trim()) return "Chưa ghi khu, điểm tái định cư";
  if (!l.soLo.trim()) return "Chưa ghi số lô / số căn";
  if (ds.some((x) => x.id !== l.id && khoaLo(x) === khoaLo(l))) return `Trùng ${tenLo(l)}`;
  if (l.dienTich.trim() && (!laSoMay(l.dienTich.trim()) || !D(l.dienTich).gt(0))) return "Diện tích phải là số dương";
  if (l.gia?.trim()) {
    if (!laSoMay(l.gia.trim()) || D(l.gia).lt(0)) return "Giá phải là số không âm";
    if (!l.canCuGia?.trim()) return "Giá lô phải ghi căn cứ (văn bản giá)";
  }
  if (l.giuLai !== undefined && !l.giuLai.trim()) return "Tạm giữ lô phải ghi lý do";
  return null;
}

export type TrangThaiLo = "TRONG" | "GIU_LAI" | "DA_GIAO";
export const trangThaiLo = (l: LoTdc): TrangThaiLo => (l.giao ? "DA_GIAO" : l.giuLai !== undefined ? "GIU_LAI" : "TRONG");
export const TEN_TT_LO: Record<TrangThaiLo, string> = { TRONG: "Còn trống", GIU_LAI: "Tạm giữ", DA_GIAO: "Đã giao" };

/** Hộ cần bố trí lô/căn: có hỗ trợ TĐC hình thức giao đất ở / nhà ở. */
export const canBoTriLo = (h: Ho) => !h.daXoa && (h.hoTro.taiDinhCu?.hinhThuc === "DAT_O" || h.hoTro.taiDinhCu?.hinhThuc === "NHA_O");

/** Thông tin TĐC của hộ theo lô được giao (giữ khoản khác, tự chọn suất tối thiểu, hỗ trợ tiền SDĐ đã có). */
export function tdcTheoLo(cu: TaiDinhCuHo | undefined, l: LoTdc): TaiDinhCuHo {
  return {
    ...(cu ?? { khoanKhac: [] }),
    hinhThuc: l.loai,
    khuTdc: l.khu.trim(),
    viTriLo: l.soLo.trim(),
    dienTichGiao: l.dienTich.trim() || undefined,
    donGia: l.gia?.trim() || undefined,
    nguonGia: l.gia?.trim() ? l.canCuGia?.trim() : cu?.nguonGia,
    loId: l.id,
  };
}

/** Bỏ thông tin lô khỏi hồ sơ hộ khi thu hồi giao (giữ hình thức, khoản khác do cán bộ nhập). */
export function tdcBoLo(cu: TaiDinhCuHo | undefined): TaiDinhCuHo | undefined {
  if (!cu) return cu;
  const { loId: _l, khuTdc: _k, viTriLo: _v, dienTichGiao: _d, donGia: _g, nguonGia: _n, ...con } = cu;
  return con;
}

export class LoiQuyTdc extends Error {}

/**
 * Giao lô cho hộ: trả dự án (quỹ đã cập nhật) và hồ sơ hộ (TĐC theo lô) để ghi trong một giao dịch.
 * Chặn: lô đã giao, lô tạm giữ, lô lỗi (thiếu căn cứ giá…), thiếu căn cứ giao, dự án bốc thăm mà giao ngoài bốc thăm
 * không ghi căn cứ.
 */
export function giaoLo(duAn: DuAn, h: Ho, loId: string, g: Omit<GiaoLo, "hoId" | "luc"> & { luc?: string }): { duAn: DuAn; ho: Ho } {
  const q = quyCua(duAn);
  const l = q.lo.find((x) => x.id === loId);
  if (!l) throw new LoiQuyTdc("Không tìm thấy lô");
  if (l.giao) throw new LoiQuyTdc(`${tenLo(l)} đã giao cho hộ khác — thu hồi giao trước (ghi lý do)`);
  if (l.giuLai !== undefined) throw new LoiQuyTdc(`${tenLo(l)} đang tạm giữ: ${l.giuLai}`);
  const loi = loiLo(l, q.lo);
  if (loi) throw new LoiQuyTdc(`${tenLo(l)}: ${loi}`);
  if (!g.canCu.trim()) throw new LoiQuyTdc("Phải ghi căn cứ giao (số, ngày biên bản bốc thăm hoặc văn bản giao)");
  if (!g.ngay) throw new LoiQuyTdc("Phải ghi ngày giao");
  if (h.daXoa) throw new LoiQuyTdc(`Hồ sơ ${h.ma} đang trong thùng rác`);
  const giao: GiaoLo = { ...g, canCu: g.canCu.trim(), hoId: h.id, luc: g.luc ?? new Date().toISOString() };
  const moi: QuyTdc = { ...q, lo: q.lo.map((x) => (x.id === loId ? { ...x, giao } : x)) };
  return { duAn: { ...duAn, quyTdc: moi }, ho: { ...h, hoTro: { ...h.hoTro, taiDinhCu: tdcTheoLo(h.hoTro.taiDinhCu, l) } } };
}

/**
 * 1.0.7 — Lô đã giao bị sửa diện tích, giá, căn cứ giá trong quỹ: ghi lại khu, lô, DT, đơn giá, căn cứ giá của lô vào hồ sơ
 * hộ được giao (giữ hình thức, các khoản khác). Chỉ chép số liệu đơn vị đã nhập ở lô — không tự đặt giá. Trả hồ sơ mới
 * và mô tả thay đổi để ghi nhật ký; null nếu không có gì khác.
 */
export function capNhatHoTheoLo(duAn: DuAn, h: Ho, loId: string): { ho: Ho; doi: string[] } | null {
  const l = quyCua(duAn).lo.find((x) => x.id === loId);
  if (!l) throw new LoiQuyTdc("Không tìm thấy lô");
  if (l.giao?.hoId !== h.id || h.hoTro.taiDinhCu?.loId !== loId) throw new LoiQuyTdc(`${tenLo(l)} không giao cho hồ sơ ${h.ma}`);
  const loi = loiLo(l, quyCua(duAn).lo);
  if (loi) throw new LoiQuyTdc(`${tenLo(l)}: ${loi}`);
  const cu = h.hoTro.taiDinhCu;
  const moi = tdcTheoLo(cu, l);
  const doi: string[] = [];
  const so = (a?: string, b?: string) => (a ?? "") === (b ?? "") || (!!a && !!b && laSoMay(a) && laSoMay(b) && D(a).eq(b));
  if (!so(cu.dienTichGiao, moi.dienTichGiao)) doi.push(`DT ${cu.dienTichGiao ?? "—"} → ${moi.dienTichGiao ?? "—"} m²`);
  if (!so(cu.donGia, moi.donGia)) doi.push(`đơn giá ${cu.donGia ?? "—"} → ${moi.donGia ?? "—"} đ/m²`);
  if ((cu.nguonGia ?? "") !== (moi.nguonGia ?? "")) doi.push(`căn cứ giá "${cu.nguonGia ?? ""}" → "${moi.nguonGia ?? ""}"`);
  if ((cu.khuTdc ?? "") !== (moi.khuTdc ?? "") || (cu.viTriLo ?? "") !== (moi.viTriLo ?? "")) doi.push(`vị trí → ${tenLo(l)}`);
  if (!doi.length) return null;
  return { ho: { ...h, hoTro: { ...h.hoTro, taiDinhCu: moi } }, doi };
}

/** Thu hồi giao lô (giao nhầm, hộ đổi lô…): bắt buộc lý do; lưu vết vào `huyGiao`. */
export function thuHoiGiao(duAn: DuAn, h: Ho | undefined, loId: string, lyDo: string, nguoi: string, luc = new Date().toISOString()): { duAn: DuAn; ho?: Ho } {
  const q = quyCua(duAn);
  const l = q.lo.find((x) => x.id === loId);
  if (!l?.giao) throw new LoiQuyTdc("Lô chưa giao");
  if (!lyDo.trim()) throw new LoiQuyTdc("Thu hồi giao lô phải ghi lý do");
  const { giao, ...con } = l;
  const moi: QuyTdc = { ...q, lo: q.lo.map((x) => (x.id === loId ? con : x)), huyGiao: [...(q.huyGiao ?? []), { loId, hoId: giao.hoId, lyDo: lyDo.trim(), nguoi, luc, giao }] };
  const ho = h && h.hoTro.taiDinhCu?.loId === loId ? { ...h, hoTro: { ...h.hoTro, taiDinhCu: tdcBoLo(h.hoTro.taiDinhCu) } } : undefined;
  return { duAn: { ...duAn, quyTdc: moi }, ho };
}

/**
 * Ghi nhận kết quả bốc thăm (theo biên bản): kiểm tra mỗi hộ, mỗi lô xuất hiện một lần, lô còn trống, thứ tự bốc hợp lệ;
 * giao các lô theo kết quả. Trả dự án và danh sách hộ đã cập nhật.
 */
export function ghiKetQuaBocTham(
  duAn: DuAn,
  hos: Ho[],
  kq: Omit<KetQuaBocTham, "id" | "luc" | "nguoi">,
  nguoi: string,
  luc = new Date().toISOString(),
): { duAn: DuAn; ho: Ho[]; ban: KetQuaBocTham } {
  const q = quyCua(duAn);
  if (!q.bocTham) throw new LoiQuyTdc("Dự án chưa chọn hình thức giao lô bằng bốc thăm");
  if (!kq.bienBan.trim()) throw new LoiQuyTdc("Phải ghi số, ngày biên bản bốc thăm");
  if (!kq.ngay) throw new LoiQuyTdc("Phải ghi ngày bốc thăm");
  const dong = kq.ketQua.filter((x) => x.hoId || x.loId);
  if (!dong.length) throw new LoiQuyTdc("Chưa có kết quả nào");
  const loi: string[] = [];
  const hoDa = new Set<string>();
  const loDa = new Set<string>();
  const sttDa = new Set<number>();
  for (const x of dong) {
    const h = hos.find((y) => y.id === x.hoId);
    const l = q.lo.find((y) => y.id === x.loId);
    const ten = `Thứ tự ${x.stt}`;
    if (!h) loi.push(`${ten}: chưa chọn hộ`);
    if (!l) loi.push(`${ten}: chưa chọn lô`);
    if (!Number.isInteger(x.stt) || x.stt < 1) loi.push(`${ten}: thứ tự bốc không hợp lệ`);
    else if (sttDa.has(x.stt)) loi.push(`Trùng thứ tự bốc ${x.stt}`);
    sttDa.add(x.stt);
    if (h && hoDa.has(h.id)) loi.push(`${ten}: hộ ${h.ma} đã có ở dòng khác`);
    if (l && loDa.has(l.id)) loi.push(`${ten}: ${tenLo(l)} đã có ở dòng khác`);
    if (l?.giao) loi.push(`${ten}: ${tenLo(l)} đã giao trước đó`);
    if (l && l.giuLai !== undefined) loi.push(`${ten}: ${tenLo(l)} đang tạm giữ`);
    if (l) {
      const e = loiLo(l, q.lo);
      if (e) loi.push(`${ten}: ${tenLo(l)} — ${e}`);
    }
    if (h) hoDa.add(h.id);
    if (l) loDa.add(l.id);
  }
  if (loi.length) throw new LoiQuyTdc(loi.join("; "));
  const ban: KetQuaBocTham = { ...kq, bienBan: kq.bienBan.trim(), ketQua: [...dong].sort((a, b) => a.stt - b.stt), id: taoId(), nguoi, luc };
  let d: DuAn = { ...duAn, quyTdc: { ...q, ketQuaBocTham: [...(q.ketQuaBocTham ?? []), ban] } };
  const out: Ho[] = [];
  for (const x of ban.ketQua) {
    const r = giaoLo(d, hos.find((y) => y.id === x.hoId)!, x.loId, { ngay: kq.ngay, hinhThuc: "BOC_THAM", canCu: `Biên bản bốc thăm ${ban.bienBan} (thứ tự ${x.stt})`, bocThamId: ban.id, nguoi, luc });
    d = r.duAn;
    out.push(r.ho);
  }
  return { duAn: d, ho: out, ban };
}

export interface ThongKeQuy {
  soLo: number;
  trong: number;
  giuLai: number;
  daGiao: number;
  dtTong: Decimal;
  dtDaGiao: Decimal;
  /** Hộ cần bố trí lô (TĐC đất ở/nhà ở) chưa có lô trong quỹ. */
  hoChoLo: number;
}

export function thongKeQuy(duAn: DuAn, hos: Ho[]): ThongKeQuy {
  const lo = quyCua(duAn).lo;
  const daGiao = new Set(lo.filter((l) => l.giao).map((l) => l.giao!.hoId));
  return {
    soLo: lo.length,
    trong: lo.filter((l) => trangThaiLo(l) === "TRONG").length,
    giuLai: lo.filter((l) => trangThaiLo(l) === "GIU_LAI").length,
    daGiao: lo.filter((l) => l.giao).length,
    dtTong: lo.reduce((s, l) => s.plus(soD(l.dienTich)), D(0)),
    dtDaGiao: lo.filter((l) => l.giao).reduce((s, l) => s.plus(soD(l.dienTich)), D(0)),
    hoChoLo: hos.filter((h) => canBoTriLo(h) && !daGiao.has(h.id)).length,
  };
}

export interface CanhBaoTdc {
  muc: "LOI" | "CANH_BAO" | "THONG_TIN";
  hoId?: string;
  loId?: string;
  noiDung: string;
  canCu?: string;
  /** 1.0.7: hồ sơ khác lô đã giao (DT, đơn giá, căn cứ giá) — có thể cập nhật hồ sơ theo lô (capNhatHoTheoLo). */
  lechLo?: boolean;
}

/**
 * Soát quỹ TĐC với hồ sơ hộ: hai hộ cùng một lô (nhập tay trùng khu + lô), hồ sơ trỏ tới lô đã giao hộ khác / không còn,
 * hồ sơ khác thông tin lô đã giao (DT, giá), một hộ nhận nhiều lô (cần kiểm tra điều kiện — không chặn).
 */
export function soatQuyTdc(duAn: DuAn, hos: Ho[]): CanhBaoTdc[] {
  const out: CanhBaoTdc[] = [];
  const lo = quyCua(duAn).lo;
  const theoId = new Map(lo.map((l) => [l.id, l]));
  const con = hos.filter((h) => !h.daXoa);
  // Hai hộ cùng khu + lô (kể cả nhập tay, không qua quỹ)
  const nhom = new Map<string, Ho[]>();
  for (const h of con) {
    const t = h.hoTro.taiDinhCu;
    if (!t || (t.hinhThuc !== "DAT_O" && t.hinhThuc !== "NHA_O") || !t.khuTdc?.trim() || !t.viTriLo?.trim()) continue;
    const k = khoaLo({ khu: t.khuTdc, soLo: t.viTriLo });
    nhom.set(k, [...(nhom.get(k) ?? []), h]);
  }
  for (const [, ds] of nhom)
    if (ds.length > 1) {
      const t = ds[0]!.hoTro.taiDinhCu!;
      out.push({ muc: "LOI", hoId: ds[0]!.id, noiDung: `${ds.map((h) => `${h.ma} · ${h.ten}`).join("; ")} cùng được ghi ${tenLo({ khu: t.khuTdc!, soLo: t.viTriLo! })}` });
    }
  for (const h of con) {
    const t = h.hoTro.taiDinhCu;
    if (!t?.loId) continue;
    const l = theoId.get(t.loId);
    if (!l) out.push({ muc: "LOI", hoId: h.id, noiDung: `${h.ma} · ${h.ten}: hồ sơ ghi lô không còn trong quỹ tái định cư` });
    else if (l.giao?.hoId !== h.id) out.push({ muc: "LOI", hoId: h.id, loId: l.id, noiDung: `${h.ma} · ${h.ten}: hồ sơ ghi ${tenLo(l)} nhưng lô ${l.giao ? "đã giao cho hộ khác" : "chưa giao cho hộ"}` });
    else {
      const lech: string[] = [];
      if ((t.dienTichGiao ?? "") !== (l.dienTich.trim() || "") && !(t.dienTichGiao && l.dienTich && D(t.dienTichGiao).eq(l.dienTich))) lech.push(`DT ${t.dienTichGiao ?? "—"} ≠ ${l.dienTich || "—"} m²`);
      if ((t.donGia ?? "") !== (l.gia?.trim() ?? "") && !(t.donGia && l.gia && D(t.donGia).eq(l.gia))) lech.push(`đơn giá ${t.donGia ?? "—"} ≠ ${l.gia ?? "—"} đ/m²`);
      if (l.gia?.trim() && (t.nguonGia ?? "") !== (l.canCuGia?.trim() ?? "")) lech.push("căn cứ giá khác");
      if (lech.length) out.push({ muc: "CANH_BAO", hoId: h.id, loId: l.id, lechLo: true, noiDung: `${h.ma} · ${h.ten}: thông tin tái định cư khác lô đã giao (${lech.join("; ")}) — kiểm tra; bấm "Cập nhật hồ sơ theo lô" nếu thông tin lô là đúng` });
    }
  }
  const soLo = new Map<string, LoTdc[]>();
  for (const l of lo) if (l.giao) soLo.set(l.giao.hoId, [...(soLo.get(l.giao.hoId) ?? []), l]);
  for (const [hoId, ds] of soLo) {
    const h = hos.find((x) => x.id === hoId);
    if (!h) out.push({ muc: "LOI", loId: ds[0]!.id, noiDung: `${tenLo(ds[0]!)} giao cho hồ sơ không còn trong dự án` });
    else if (h.daXoa) out.push({ muc: "CANH_BAO", hoId, loId: ds[0]!.id, noiDung: `${tenLo(ds[0]!)} giao cho hồ sơ ${h.ma} đang trong thùng rác` });
    if (ds.length > 1)
      out.push({ muc: "CANH_BAO", hoId, noiDung: `${h ? `${h.ma} · ${h.ten}` : "Một hộ"} được giao ${ds.length} lô/căn (${ds.map(tenLo).join("; ")}) — kiểm tra trường hợp được bố trí nhiều hơn một lô (hộ nhiều thế hệ, nhiều cặp vợ chồng đủ điều kiện tách hộ…)`, canCu: "Điều 111 Luật Đất đai 2024" });
  }
  if (lo.length) {
    const daGiao = new Set(lo.filter((l) => l.giao).map((l) => l.giao!.hoId));
    const cho = con.filter((h) => canBoTriLo(h) && !daGiao.has(h.id) && !h.hoTro.taiDinhCu?.loId);
    if (cho.length) out.push({ muc: "THONG_TIN", noiDung: `${cho.length} hộ có hỗ trợ tái định cư giao đất ở / nhà ở chưa được giao lô trong quỹ: ${cho.slice(0, 8).map((h) => h.ma).join(", ")}${cho.length > 8 ? "…" : ""}` });
  }
  return out;
}
