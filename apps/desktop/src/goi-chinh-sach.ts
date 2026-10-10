/**
 * Gói chính sách nạp được (P2-1): bộ chính sách (BoChinhSach — mức hỗ trợ, tỷ lệ, cách tính có căn cứ) dạng tệp JSON,
 * Quản trị nạp vào phần mềm mà không phải phát hành lại. CHƯA KÝ SỐ (theo quyết định người dùng): mỗi gói có mã kiểm tra
 * SHA-256 để đối chiếu với đơn vị phát hành gói; phần mềm không xác thực được nguồn gốc gói.
 * Kiểm tra khi nạp: đúng cấu trúc so với bộ chính sách có sẵn (đủ mục, đúng kiểu), có mã, ngày hiệu lực; chạy thử tính toán.
 * 1.0.7: gói dạng bọc có thể kèm bảng đơn giá (`donGia`: { canCu, dong[] } — thay nhóm QĐ32/PL VIII/PL V tương ứng) và
 * bảng giá đất (`bangGiaDat`: cùng cấu trúc bảng NQ 152 trong policy/nguon) cho dự án dùng bộ chính sách của gói.
 */
import type { BoChinhSach } from "@gpmb/core";
import { BANG_GIA_GOI, BO_CHINH_SACH, DON_GIA_GOI, type BangGiaDat, type DongDonGia } from "./du-lieu";

export const KHOA_GOI = "goiChinhSach";
export const DINH_DANG_GOI = "gpmb-goi-chinh-sach";
export const GOI_GOC = "sonla-2026-03-31";
/** Bộ chính sách mới nhất có sẵn — mặc định cho dự án mới (QĐ 64/2026, hiệu lực 06/10/2026). */
export const GOI_MOI_NHAT = "sonla-2026-10-06";
/** Các bộ có sẵn trong phần mềm (không phải nạp). */
export const GOI_CO_SAN = [GOI_GOC, GOI_MOI_NHAT];

export interface GoiDaNap {
  /** Khóa gói — dự án tham chiếu bằng khóa này (DuAn.boChinhSach) */
  khoa: string;
  ten: string;
  ma: string;
  hieuLucTu: string;
  hieuLucDen: string | null;
  sha256: string;
  tenTep: string;
  napLuc: string;
  napBoi: string;
  ghiChu?: string;
  /** Nội dung BoChinhSach (JSON) */
  noiDung: string;
  /** Bảng đơn giá kèm gói (JSON DongDonGia[]) */
  donGia?: string;
  /** Bảng giá đất kèm gói (JSON BangGiaDat) */
  bangGiaDat?: string;
}

export async function sha256Hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const kieu = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/** So cấu trúc với bộ mẫu: thiếu mục, sai kiểu (đệ quy 3 mức — đủ nhận ra tệp không phải bộ chính sách). */
function soCauTruc(mau: unknown, x: unknown, duong: string, out: string[], muc = 0) {
  if (muc > 3 || out.length > 20) return;
  const km = kieu(mau), kx = kieu(x);
  if (km === "null" || km === "undefined") return; // mục tùy chọn trong bộ mẫu
  if (kx === "undefined") return void out.push(`Thiếu mục "${duong}"`);
  if (km !== kx && !(km === "number" && kx === "string") && !(km === "string" && kx === "number") && kx !== "null") return void out.push(`Mục "${duong}" sai kiểu (cần ${km}, có ${kx})`);
  if (km === "object" && kx === "object") for (const k of Object.keys(mau as object)) soCauTruc((mau as Record<string, unknown>)[k], (x as Record<string, unknown>)[k], duong ? `${duong}.${k}` : k, out, muc + 1);
}

export interface KetQuaDocGoi {
  loi: string[];
  goi?: { khoa: string; cs: BoChinhSach; ghiChu?: string; noiDung: string; sha256: string; donGia?: string; bangGiaDat?: string; soDongDonGia?: number; vanBanGiaDat?: string };
  /** Các mục khác bộ đang dùng (để cán bộ xem gói đổi gì) */
  mucKhac: string[];
}

/** Đọc, kiểm tra tệp gói: dạng bọc { dinhDang, khoa, chinhSach } hoặc nguyên BoChinhSach như policy/goi/*.json. */
export async function docGoi(chu: string, daCo: string[], mau: BoChinhSach = BO_CHINH_SACH[GOI_GOC]!): Promise<KetQuaDocGoi> {
  let v: unknown;
  try {
    v = JSON.parse(chu);
  } catch {
    return { loi: ["Tệp không phải JSON"], mucKhac: [] };
  }
  const boc = v as { dinhDang?: string; khoa?: string; chinhSach?: unknown; ghiChu?: string; donGia?: unknown; bangGiaDat?: unknown };
  const cs = (boc.dinhDang === DINH_DANG_GOI ? boc.chinhSach : v) as BoChinhSach;
  const loi: string[] = [];
  if (boc.dinhDang && boc.dinhDang !== DINH_DANG_GOI) loi.push(`Định dạng "${boc.dinhDang}" không phải gói chính sách GPMB`);
  if (!cs || kieu(cs) !== "object") return { loi: [...loi, "Không có nội dung bộ chính sách"], mucKhac: [] };
  soCauTruc(mau, cs, "", loi);
  if (!cs.ma || typeof cs.ma !== "string") loi.push("Thiếu mã bộ chính sách (ma)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(cs.hieuLucTu ?? ""))) loi.push("Ngày hiệu lực (hieuLucTu) phải dạng YYYY-MM-DD");
  const khoa = (boc.khoa ?? String(cs.ma ?? "").toLowerCase()).trim().replace(/\s+/g, "-");
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(khoa)) loi.push(`Khóa gói "${khoa}" không hợp lệ (chữ, số, - . _; 3–64 ký tự)`);
  if (daCo.includes(khoa)) loi.push(`Đã có bộ chính sách khóa "${khoa}" — gói mới cần khóa khác (không ghi đè bộ đang dùng)`);
  const mucKhac = Object.keys({ ...mau, ...cs }).filter((k) => JSON.stringify((mau as unknown as Record<string, unknown>)[k]) !== JSON.stringify((cs as unknown as Record<string, unknown>)[k]));
  const dg = boc.dinhDang === DINH_DANG_GOI && boc.donGia !== undefined ? docDonGiaGoi(boc.donGia, loi) : undefined;
  const bg = boc.dinhDang === DINH_DANG_GOI && boc.bangGiaDat !== undefined ? docBangGiaGoi(boc.bangGiaDat, loi) : undefined;
  const noiDung = JSON.stringify(cs);
  const donGia = dg ? JSON.stringify(dg) : undefined;
  const bangGiaDat = bg ? JSON.stringify(bg) : undefined;
  // Mã kiểm tra: chỉ bộ chính sách như trước; có bảng kèm thì băm cả bảng (đổi một đơn giá là đổi mã)
  const sha256 = await sha256Hex(donGia || bangGiaDat ? JSON.stringify({ chinhSach: noiDung, donGia: donGia ?? null, bangGiaDat: bangGiaDat ?? null }) : noiDung);
  return {
    loi,
    mucKhac: [...mucKhac, ...(dg ? [`bảng đơn giá (${dg.length} dòng)`] : []), ...(bg ? [`bảng giá đất (${bg.van_ban})`] : [])],
    goi: loi.length ? undefined : { khoa, cs, ghiChu: boc.ghiChu, noiDung, sha256, ...(donGia ? { donGia, soDongDonGia: dg!.length } : {}), ...(bangGiaDat ? { bangGiaDat, vanBanGiaDat: bg!.van_ban } : {}) },
  };
}

const NGUON_DON_GIA: DongDonGia["nguon"][] = ["QĐ32", "PL VIII", "PL V"];

/**
 * Bảng đơn giá kèm gói: { canCu: "Quyết định số …", dong: [{ nguon, ma, nhom, ten, donVi, donGia, matDo?, trang? }] }.
 * Bắt buộc có văn bản căn cứ; đơn giá là số dương — không tự điền giá thiếu.
 */
function docDonGiaGoi(v: unknown, loi: string[]): DongDonGia[] | undefined {
  const x = v as { canCu?: unknown; dong?: unknown };
  if (kieu(x) !== "object" || !Array.isArray(x.dong)) return void loi.push('Bảng đơn giá kèm gói cần dạng { "canCu": "…", "dong": [ … ] }');
  const canCu = typeof x.canCu === "string" ? x.canCu.trim() : "";
  if (!canCu) loi.push("Bảng đơn giá kèm gói thiếu văn bản căn cứ (canCu)");
  if (!x.dong.length) loi.push("Bảng đơn giá kèm gói không có dòng nào");
  const out: DongDonGia[] = [];
  const truoc = loi.length;
  x.dong.forEach((d: unknown, i) => {
    if (loi.length - truoc >= 10) return;
    const r = d as Record<string, unknown>;
    const gia = typeof r.donGia === "string" ? Number(r.donGia) : r.donGia;
    const ten = typeof r.ten === "string" ? r.ten.trim() : "";
    const nguon = r.nguon as DongDonGia["nguon"];
    const sai: string[] = [];
    if (!NGUON_DON_GIA.includes(nguon)) sai.push(`nhóm "${String(r.nguon)}" (cần ${NGUON_DON_GIA.join(", ")})`);
    if (!ten) sai.push("thiếu tên");
    if (typeof r.donVi !== "string" || !r.donVi.trim()) sai.push("thiếu đơn vị tính");
    if (typeof gia !== "number" || !Number.isFinite(gia) || gia <= 0) sai.push("đơn giá không phải số dương");
    if (r.matDo !== undefined && r.matDo !== null && (typeof r.matDo !== "number" || r.matDo <= 0)) sai.push("mật độ không hợp lệ");
    if (sai.length) return void loi.push(`Đơn giá dòng ${i + 1}: ${sai.join(", ")}`);
    out.push({
      nguon,
      ma: typeof r.ma === "string" && r.ma.trim() ? r.ma.trim() : `${nguon}/G${i + 1}`,
      nhom: typeof r.nhom === "string" ? r.nhom : "",
      ten,
      donVi: (r.donVi as string).replace(/^đồng\//i, ""),
      donGia: gia as number,
      matDo: (r.matDo as number | null | undefined) ?? null,
      trang: typeof r.trang === "number" ? r.trang : 0,
      canCu,
    });
  });
  return loi.length === truoc ? out : undefined;
}

/** Bảng giá đất kèm gói: cùng cấu trúc bảng NQ 152 (van_ban, danh_muc_xa, dat_nong_nghiep, dat_o, dat_tmdv, dat_skc, dat_kcn_ccn). */
function docBangGiaGoi(v: unknown, loi: string[]): BangGiaDat | undefined {
  const b = v as Partial<BangGiaDat>;
  if (kieu(b) !== "object") return void loi.push("Bảng giá đất kèm gói không phải đối tượng JSON");
  const truoc = loi.length;
  if (typeof b.van_ban !== "string" || !b.van_ban.trim()) loi.push("Bảng giá đất kèm gói thiếu văn bản ban hành (van_ban)");
  for (const k of ["danh_muc_xa", "dat_nong_nghiep", "dat_o", "dat_tmdv", "dat_skc", "dat_kcn_ccn"] as const) if (!Array.isArray(b[k])) loi.push(`Bảng giá đất kèm gói thiếu mục "${k}" (mảng)`);
  if (loi.length > truoc) return undefined;
  const xa = new Set(b.danh_muc_xa);
  const nn = b.dat_nong_nghiep!.find((r) => typeof r?.gia !== "number" || !(r.gia > 0) || !xa.has(r.xa));
  if (nn) loi.push(`Bảng giá đất nông nghiệp: dòng "${nn?.loai_dat ?? "?"}" ở "${nn?.xa ?? "?"}" thiếu giá hoặc xã ngoài danh mục`);
  for (const k of ["dat_o", "dat_tmdv", "dat_skc"] as const) {
    const sai = b[k]!.find((r) => !Array.isArray(r?.vt) || !xa.has(r.xa));
    if (sai) loi.push(`Bảng giá đất "${k}": tuyến "${sai?.tuyen ?? "?"}" thiếu giá vị trí (vt) hoặc xã ngoài danh mục`);
  }
  return loi.length > truoc ? undefined : (b as BangGiaDat);
}

/** Đưa các gói đã nạp vào danh mục bộ chính sách (dự án tham chiếu theo khóa). Bộ có sẵn không bị thay. */
export function dangKyGoi(ds: GoiDaNap[]): void {
  for (const g of ds)
    if (!(g.khoa in BO_CHINH_SACH) || (BO_CHINH_SACH[g.khoa] as unknown as { __goi?: boolean }).__goi) {
      try {
        BO_CHINH_SACH[g.khoa] = Object.assign(JSON.parse(g.noiDung) as BoChinhSach, { __goi: true });
        if (g.donGia) DON_GIA_GOI[g.khoa] = JSON.parse(g.donGia) as DongDonGia[];
        if (g.bangGiaDat) BANG_GIA_GOI[g.khoa] = JSON.parse(g.bangGiaDat) as BangGiaDat;
      } catch {
        /* gói hỏng: bỏ qua (dự án dùng gói này sẽ báo thiếu bộ chính sách) */
      }
    }
}

export const coBoChinhSach = (khoa: string) => khoa in BO_CHINH_SACH;
export const tenBoChinhSach = (khoa: string) => (BO_CHINH_SACH[khoa] as unknown as { ten?: string } | undefined)?.ten ?? khoa;
