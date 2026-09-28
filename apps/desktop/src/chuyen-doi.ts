/**
 * Khung chuyển đổi mô hình dữ liệu (P2-6). Mỗi lần đổi cấu trúc hồ sơ/dự án thêm MỘT bước vào CAC_BUOC_CHUYEN_DOI kèm kiểm
 * thử (test/chuyen-doi.test.ts): bước nhận bản sao, sửa tại chỗ, trả danh sách thay đổi "từ … thành …" để ghi nhật ký.
 * Bước chạy khi bản ghi có phienBanCauTruc < `den` (hoặc luôn chạy nếu `luonChay` — bước chuẩn hóa không làm đổi nghĩa).
 * Bản ghi chỉ được ghi lại (và đóng dấu phiên bản) khi có thay đổi thật — không ghi hàng loạt vô ích.
 * Cấu trúc CSDL máy chủ/máy đơn đổi theo PRAGMA user_version (may_chu.rs, chuyen_doi_csdl).
 * Bản phương án đã chốt/phê duyệt (bản sao đóng băng, có băm) KHÔNG bao giờ bị chuyển đổi.
 */
import type { DuAn, Ho } from "./mo-hinh";
import { docSoNhap, laSoMay, truongSoDuAn, truongSoHo, type TruongSo } from "./so";

export interface DoiTuDong {
  nhan: string;
  tu: string;
  thanh: string;
}

export interface BuocChuyenDoi {
  den: number;
  ten: string;
  luonChay?: boolean;
  ho?: (h: Ho) => DoiTuDong[];
  duAn?: (d: DuAn) => DoiTuDong[];
}

/** Đổi giá trị số một nghĩa sang chuẩn máy ("9222,1" → 9222.1); giá trị mơ hồ ("20.000") để cán bộ chọn (ra-soat-so.ts). */
function chuanHoaSo(ds: TruongSo[]): DoiTuDong[] {
  const doi: DoiTuDong[] = [];
  for (const x of ds) {
    const v = x.gt.trim();
    if (!v || laSoMay(v)) continue;
    const r = docSoNhap(v);
    if (r.so === null) continue; // không đọc được: để cán bộ sửa (tinhHo báo "Thiếu căn cứ")
    x.dat(r.so);
    doi.push({ nhan: x.nhan, tu: x.gt, thanh: r.so });
  }
  return doi;
}

export const CAC_BUOC_CHUYEN_DOI: BuocChuyenDoi[] = [
  { den: 2, ten: "Chuẩn hóa định dạng số (P0-2)", luonChay: true, ho: (h) => chuanHoaSo(truongSoHo(h)), duAn: (d) => chuanHoaSo(truongSoDuAn(d)) },
];

export const PHIEN_BAN_CAU_TRUC = Math.max(1, ...CAC_BUOC_CHUYEN_DOI.map((b) => b.den));

function chay<T extends { phienBanCauTruc?: number }>(goc: T, lay: (b: BuocChuyenDoi) => ((x: T) => DoiTuDong[]) | undefined): { ban: T; doi: DoiTuDong[]; buoc: string[] } | null {
  const ban = structuredClone(goc);
  const pb = goc.phienBanCauTruc ?? 1;
  const doi: DoiTuDong[] = [];
  const buoc: string[] = [];
  for (const b of CAC_BUOC_CHUYEN_DOI) {
    const f = lay(b);
    if (!f || (!b.luonChay && pb >= b.den)) continue;
    const d = f(ban);
    if (d.length) (doi.push(...d), buoc.push(b.ten));
  }
  if (!doi.length) return null;
  ban.phienBanCauTruc = Math.max(pb, ...CAC_BUOC_CHUYEN_DOI.map((b) => b.den));
  return { ban, doi, buoc };
}

/** Chuyển đổi hồ sơ trên bản sao; ghi nhật ký hồ sơ. Trả null nếu không có gì đổi. */
export function chuyenDoiHo(h: Ho): { h: Ho; doi: DoiTuDong[] } | null {
  const r = chay(h, (b) => b.ho);
  if (!r) return null;
  r.ban.nhatKy = [...r.ban.nhatKy, { luc: new Date().toISOString(), nguoi: `Phần mềm (chuyển đổi dữ liệu: ${r.buoc.join("; ")})`, noiDung: `Đổi: ${r.doi.map((d) => `${d.nhan}: "${d.tu}" → ${d.thanh}`).join("; ")}` }];
  return { h: r.ban, doi: r.doi };
}

export function chuyenDoiDuAn(d: DuAn): { d: DuAn; doi: DoiTuDong[] } | null {
  const r = chay(d, (b) => b.duAn);
  return r && { d: r.ban, doi: r.doi };
}
