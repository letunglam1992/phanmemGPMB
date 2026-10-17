/**
 * 1.0.18 — Chữ ký gói chính sách (B1): tác giả ký tệp gói bằng khóa riêng cấp mã kích hoạt (ECDSA P-256 / SHA-256,
 * tools/giay-phep/cap-ma.html → "Ký gói chính sách"); phần mềm kiểm bằng khóa công khai có sẵn (giay-phep-khoa.ts).
 * Đây là chữ ký điện tử nội bộ để biết gói do tác giả phát hành và không bị sửa sau khi ký — KHÔNG phải chữ ký số có
 * chứng thư theo Luật Giao dịch điện tử 2023, không thay văn bản ban hành đơn giá, chính sách.
 *
 * Dạng tệp đã ký: gói dạng bọc { dinhDang, khoa?, chinhSach, donGia?, bangGiaDat?, ghiChu?, chuKy }.
 * Nội dung ký = "GPMB-GOI-CS1\n" + JSON.stringify(gói bỏ chuKy) + "\n" + JSON.stringify({ v, donVi, nguoiKy, luc }).
 * Chuỗi JSON lấy theo thứ tự khóa trong tệp (JSON.parse rồi stringify lại cho cùng kết quả ở công cụ ký và phần mềm).
 * Gói không ký: phần mềm cảnh báo, cán bộ xác nhận đã đối chiếu nguồn gốc mới nạp; chữ ký sai (tệp bị sửa): không nạp.
 */
import { b64u } from "./giay-phep";
import { KHOA_CONG_GIAY_PHEP } from "./giay-phep-khoa";
/** Trùng DINH_DANG_GOI (goi-chinh-sach.ts) — không nhập để công cụ, kiểm thử Playwright dùng được mà không nạp bộ chính sách. */
const DINH_DANG_GOI = "gpmb-goi-chinh-sach";

export const DAU_KY_GOI = "GPMB-GOI-CS1\n";

export interface ThongTinKyGoi {
  v: 1;
  /** Đơn vị phát hành gói (vd. "Tác giả phần mềm GPMB Sơn La") */
  donVi: string;
  nguoiKy: string;
  /** ISO thời điểm ký */
  luc: string;
}
export interface ChuKyGoi extends ThongTinKyGoi {
  /** base64url chữ ký ECDSA P-256 (IEEE P1363, 64 byte) */
  ky: string;
}

export type KetQuaKyGoi =
  /** `ky`, `banKy` (base64url đúng nội dung đã ký) gửi kèm để máy chủ mạng nội bộ kiểm lại (giay_phep.rs `kiem_goi`) */
  | { tt: "DA_KY"; chuKy: ThongTinKyGoi; ky: string; banKy: string }
  | { tt: "CHUA_KY" }
  | { tt: "SAI"; lyDo: string };

const THUAT_TOAN = { name: "ECDSA", namedCurve: "P-256" } as const;
const KY = { name: "ECDSA", hash: "SHA-256" } as const;

const noiDungKy = (goi: Record<string, unknown>, tt: ThongTinKyGoi) =>
  new TextEncoder().encode(`${DAU_KY_GOI}${JSON.stringify(goi)}\n${JSON.stringify({ v: tt.v, donVi: tt.donVi, nguoiKy: tt.nguoiKy, luc: tt.luc })}`);

/** Gói dạng bọc (gói nguyên BoChinhSach được bọc lại), bỏ chữ ký cũ. */
function bocGoi(v: unknown): Record<string, unknown> {
  const o = v as Record<string, unknown>;
  if (o && o.dinhDang === DINH_DANG_GOI) {
    const { chuKy: _bo, ...con } = o;
    return con;
  }
  return { dinhDang: DINH_DANG_GOI, chinhSach: o };
}

/** Ký tệp gói (công cụ của tác giả và kiểm thử). Trả nội dung tệp đã ký (JSON có thụt dòng). */
export async function kyGoi(chu: string, tt: Omit<ThongTinKyGoi, "v" | "luc"> & { luc?: string }, khoaRieng: JsonWebKey): Promise<string> {
  const goi = bocGoi(JSON.parse(chu));
  const thongTin: ThongTinKyGoi = { v: 1, donVi: tt.donVi.trim(), nguoiKy: tt.nguoiKy.trim(), luc: tt.luc ?? new Date().toISOString() };
  const k = await crypto.subtle.importKey("jwk", khoaRieng, THUAT_TOAN, false, ["sign"]);
  const ky = new Uint8Array(await crypto.subtle.sign(KY, k, noiDungKy(goi, thongTin)));
  return JSON.stringify({ ...goi, chuKy: { ...thongTin, ky: b64u.ma(ky) } }, null, 2);
}

/** Kiểm chữ ký của tệp gói (chuỗi JSON). Tệp không phải JSON → CHUA_KY (lỗi cấu trúc do docGoi báo). */
export async function kiemChuKyGoi(chu: string, khoaCong: JsonWebKey = KHOA_CONG_GIAY_PHEP): Promise<KetQuaKyGoi> {
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(chu) as Record<string, unknown>;
  } catch {
    return { tt: "CHUA_KY" };
  }
  const ck = v?.chuKy as Partial<ChuKyGoi> | undefined;
  if (!ck) return { tt: "CHUA_KY" };
  if (v.dinhDang !== DINH_DANG_GOI) return { tt: "SAI", lyDo: "Chữ ký chỉ hợp lệ với gói dạng bọc" };
  if (ck.v !== 1 || typeof ck.donVi !== "string" || typeof ck.nguoiKy !== "string" || typeof ck.luc !== "string" || typeof ck.ky !== "string")
    return { tt: "SAI", lyDo: "Chữ ký không đúng định dạng" };
  const tt: ThongTinKyGoi = { v: 1, donVi: ck.donVi, nguoiKy: ck.nguoiKy, luc: ck.luc };
  let byteKy: Uint8Array<ArrayBuffer>;
  try {
    byteKy = b64u.giai(ck.ky);
  } catch {
    return { tt: "SAI", lyDo: "Chữ ký hỏng (sai ký tự)" };
  }
  const k = await crypto.subtle.importKey("jwk", khoaCong, THUAT_TOAN, false, ["verify"]);
  const ban = noiDungKy(bocGoi(v), tt);
  const dung = await crypto.subtle.verify(KY, k, byteKy, ban);
  return dung ? { tt: "DA_KY", chuKy: tt, ky: ck.ky, banKy: b64u.ma(ban) } : { tt: "SAI", lyDo: "Chữ ký không khớp nội dung — tệp đã bị sửa sau khi ký, hoặc không do tác giả ký" };
}
