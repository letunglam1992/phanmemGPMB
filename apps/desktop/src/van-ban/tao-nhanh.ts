/**
 * Tạo văn bản nhanh từ dữ liệu đã nhập (không qua form soạn): dùng thông tin chung đã lưu của dự án, Thiết lập
 * đơn vị, giá trị mặc định tự tính từ hồ sơ. Không ghi số, ngày văn bản — bản dự thảo để in/chỉnh trong Word.
 */
import { duAnCuaHo } from "../dot-thu-hoi";
import { D, dinhDang } from "@gpmb/core";
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

const tien = (x: number) => dinhDang(D(x), 0);

/**
 * Giá trị mặc định tự tính từ hồ sơ cho các trường tổng hợp của phương án (Mẫu 11, 13, 14, R4, R5):
 * tái định cư, chuyển đổi nghề, di dời mồ mả. Không có dữ liệu → undefined (giữ mặc định của mẫu).
 */
export function macDinhTuHoSo(ds: { h: Ho; k: KetQuaHo }[]): Record<string, string> {
  const out: Record<string, string> = {};
  const tdc = ds.filter(({ h }) => h.hoTro.taiDinhCu);
  if (tdc.length) {
    const dem = (ht: string) => tdc.filter(({ h }) => h.hoTro.taiDinhCu!.hinhThuc === ht);
    const tienTdc = (x: typeof tdc) => x.reduce((s, { k }) => s + (k.nhom.find((n) => n.ma === "B.VI")?.dong ?? []).reduce((a, d) => a + (d.dong.trangThai === "TAM_TINH" && d.dong.thanhTien ? d.dong.thanhTien.toNumber() : 0), 0), 0);
    const khu = [...new Set(tdc.map(({ h }) => h.hoTro.taiDinhCu!.khuTdc?.trim()).filter(Boolean))];
    const phan: string[] = [];
    if (dem("DAT_O").length) phan.push(`${dem("DAT_O").length} hộ được giao đất ở tái định cư${khu.length ? ` tại ${khu.join(", ")}` : ""}`);
    if (dem("NHA_O").length) phan.push(`${dem("NHA_O").length} hộ được giao nhà ở tái định cư`);
    if (dem("TU_LO").length) phan.push(`${dem("TU_LO").length} hộ tự lo chỗ ở, hỗ trợ ${tien(tienTdc(dem("TU_LO")))} đồng`);
    if (dem("TAI_CHO").length) phan.push(`${dem("TAI_CHO").length} hộ tái định cư tại chỗ`);
    out.pa_tai_dinh_cu = `Bố trí tái định cư cho ${tdc.length} hộ: ${phan.join("; ")}. Tổng hỗ trợ tái định cư ${tien(tienTdc(tdc))} đồng.`;
  }
  const cdn = ds.filter(({ k }) => k.theoCot.HT_CDN.gt(0));
  if (cdn.length) out.pa_chuyen_doi_nghe = `Hỗ trợ đào tạo, chuyển đổi nghề và tìm kiếm việc làm cho ${cdn.length} hộ, tổng số tiền ${tien(cdn.reduce((s, { k }) => s + k.theoCot.HT_CDN.toNumber(), 0))} đồng.`;
  const mo = ds.reduce((s, { h }) => ({ xay: s.xay + (h.hoTro.moMa?.xay ?? 0), dat: s.dat + (h.hoTro.moMa?.khongXay ?? 0) }), { xay: 0, dat: 0 });
  if (mo.xay + mo.dat > 0) out.pa_mo_ma = `Di dời ${mo.xay + mo.dat} mộ (${mo.xay} mộ xây, ${mo.dat} mộ đất).`;
  return out;
}

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
