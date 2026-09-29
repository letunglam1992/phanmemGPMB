/**
 * Gói chính sách nạp được (P2-1): bộ chính sách (BoChinhSach — mức hỗ trợ, tỷ lệ, cách tính có căn cứ) dạng tệp JSON,
 * Quản trị nạp vào phần mềm mà không phải phát hành lại. CHƯA KÝ SỐ (theo quyết định người dùng): mỗi gói có mã kiểm tra
 * SHA-256 để đối chiếu với đơn vị phát hành gói; phần mềm không xác thực được nguồn gốc gói.
 * Kiểm tra khi nạp: đúng cấu trúc so với bộ chính sách có sẵn (đủ mục, đúng kiểu), có mã, ngày hiệu lực; chạy thử tính toán.
 * Bảng đơn giá (QĐ 32, PL VIII, PL V) và bảng giá đất chưa nằm trong gói (vẫn theo phiên bản phần mềm).
 */
import type { BoChinhSach } from "@gpmb/core";
import { BO_CHINH_SACH } from "./du-lieu";

export const KHOA_GOI = "goiChinhSach";
export const DINH_DANG_GOI = "gpmb-goi-chinh-sach";
export const GOI_GOC = "sonla-2026-03-31";

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
  goi?: { khoa: string; cs: BoChinhSach; ghiChu?: string; noiDung: string; sha256: string };
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
  const boc = v as { dinhDang?: string; khoa?: string; chinhSach?: unknown; ghiChu?: string };
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
  const noiDung = JSON.stringify(cs);
  return { loi, mucKhac, goi: loi.length ? undefined : { khoa, cs, ghiChu: boc.ghiChu, noiDung, sha256: await sha256Hex(noiDung) } };
}

/** Đưa các gói đã nạp vào danh mục bộ chính sách (dự án tham chiếu theo khóa). Bộ có sẵn không bị thay. */
export function dangKyGoi(ds: GoiDaNap[]): void {
  for (const g of ds)
    if (!(g.khoa in BO_CHINH_SACH) || (BO_CHINH_SACH[g.khoa] as unknown as { __goi?: boolean }).__goi) {
      try {
        BO_CHINH_SACH[g.khoa] = Object.assign(JSON.parse(g.noiDung) as BoChinhSach, { __goi: true });
      } catch {
        /* gói hỏng: bỏ qua (dự án dùng gói này sẽ báo thiếu bộ chính sách) */
      }
    }
}

export const coBoChinhSach = (khoa: string) => khoa in BO_CHINH_SACH;
export const tenBoChinhSach = (khoa: string) => (BO_CHINH_SACH[khoa] as unknown as { ten?: string } | undefined)?.ten ?? khoa;
