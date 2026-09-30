/**
 * Tạo văn bản nhanh từ dữ liệu đã nhập (không qua form soạn): dùng thông tin chung đã lưu của dự án, Thiết lập
 * đơn vị, giá trị mặc định tự tính từ hồ sơ. Không ghi số, ngày văn bản — bản dự thảo để in/chỉnh trong Word.
 */
import { duAnCuaHo } from "../dot-thu-hoi";
import type { Kho } from "../kho";
import type { DuAn, Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import type { DonVi } from "../don-vi";
import { truongVanBanTuDonVi } from "../don-vi";
import { mauTheoMa, tepMau, type MauVanBan } from "./danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "./du-lieu";
import { dienMau } from "./dien-mau";

export async function napMau(kho: Kho, ma: string): Promise<Uint8Array> {
  const tuy = await kho.docMau(ma);
  if (tuy) return tuy.bytes;
  const r = await fetch(`${import.meta.env.BASE_URL}mau-van-ban/${tepMau(mauTheoMa(ma))}`);
  if (!r.ok) throw new Error(`Không nạp được mẫu ${ma} (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

export { macDinhTuHoSo } from "./thuc-te";
import { macDinhTuHoSo } from "./thuc-te";

/** Giá trị ban đầu các trường nhập thêm: đã lưu cho dự án > tự tính từ hồ sơ > mặc định của mẫu. */
export function giaTriNhapThem(mau: MauVanBan, duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Record<string, string> {
  const tu = macDinhTuHoSo(ds);
  return Object.fromEntries(
    mau.nhapThem.map((t) => {
      const daLuu = t.truong !== "noi_nhan" ? duAn.vanBan?.[t.truong] : undefined;
      const dungDaLuu = daLuu && !(tu[t.truong] && daLuu === (t.macDinh ?? ""));
      return [t.truong, (dungDaLuu ? daLuu : tu[t.truong]) || t.macDinh || ""];
    }),
  );
}

export function thongTinChung(duAn: DuAn, dsDonVi: DonVi[]): Record<string, string> {
  return { ...thongTinChungMacDinh(duAn), ...truongVanBanTuDonVi(dsDonVi), ...(duAn.vanBan ?? {}) };
}

/** Tạo nhanh một văn bản (dự án hoặc cho một hộ) — trả về nội dung .docx. */
export async function taoNhanh(p: { kho: Kho; ma: string; duAn: DuAn; ds: { h: Ho; k: KetQuaHo }[]; ho?: { h: Ho; k: KetQuaHo }; dsDonVi: DonVi[] }): Promise<Uint8Array> {
  const mau = mauTheoMa(p.ma);
  const bytes = await napMau(p.kho, p.ma);
  const ds = mau.phamVi === "DOT" && p.ho ? [p.ho] : p.ds;
  // P3-1: văn bản của hộ thuộc đợt dùng căn cứ, ngày thông báo, số văn bản của đợt
  const duAn = p.ho ? duAnCuaHo(p.duAn, p.ho.h) : p.duAn;
  return dienMau(bytes, ghepDuLieu({ mau, duAn, ds, ho: mau.phamVi === "HO" ? p.ho : undefined, chung: thongTinChung(duAn, p.dsDonVi), rieng: giaTriNhapThem(mau, duAn, ds), so: "", ngayKy: "" }));
}
