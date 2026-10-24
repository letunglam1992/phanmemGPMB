/**
 * Tạo văn bản nhanh từ dữ liệu đã nhập (không qua form soạn): dùng thông tin chung đã lưu của dự án, Thiết lập
 * đơn vị, giá trị mặc định tự tính từ hồ sơ. Không ghi số, ngày văn bản — bản dự thảo để in/chỉnh trong Word.
 */
import { duAnCuaHo } from "../dot-thu-hoi";
import { quyCua, tenLo } from "../quy-tdc";
import { D } from "@gpmb/core";
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
import { moTaQd, TEN_Y_KIEN_TD, type PhienBanPA } from "../phuong-an";

/**
 * 1.0.12: bản phương án (chưa hủy) có ghi nhận thẩm định, gồm các hộ đang soạn (không có hộ nào → bản mới nhất có thẩm
 * định). Trả về null nếu chưa có.
 */
export function banDaThamDinh(duAn: Pick<DuAn, "phuongAn">, hoIds: string[]): PhienBanPA | null {
  const ids = new Set(hoIds);
  const ds = (duAn.phuongAn ?? []).filter((p) => p.trangThai !== "DA_HUY" && p.thamDinh && (!ids.size || p.ho.some((h) => ids.has(h.hoId))));
  return ds.sort((a, b) => b.so - a.so)[0] ?? null;
}

/** Câu "Kết quả thẩm định" điền vào mẫu 13, R4 — chỉ dữ kiện đã ghi nhận (số, ngày, cơ quan, ý kiến). */
export function ketQuaThamDinh(duAn: Pick<DuAn, "phuongAn">, hoIds: string[]): string | null {
  const p = banDaThamDinh(duAn, hoIds);
  if (!p?.thamDinh) return null;
  const t = p.thamDinh;
  const vb = t.so || t.ngay ? `Văn bản số ${moTaQd(t)}` : "Văn bản thẩm định (chưa ghi số, ngày)";
  return `${vb}${t.coQuan ? ` của ${t.coQuan}` : ""} về kết quả thẩm định phương án (bản ${p.so}): ${TEN_Y_KIEN_TD[t.yKien].toLowerCase()}${t.noiDung ? `; ${t.noiDung}` : ""}.`;
}

/** Giá trị ban đầu các trường nhập thêm: đã lưu cho dự án > tự tính từ hồ sơ > mặc định của mẫu. */
/**
 * 1.3.0 (B1, B2) — giá trị mặc định dùng lại từ dữ liệu đã có của dự án: thành viên Ban cưỡng chế (T16 đã soạn) cho biên bản
 * T27 (Ban cưỡng chế), T28 (người chủ trì — dòng đầu, Trưởng ban); bảng giá bán nhà ở T31 từ quỹ tái định cư (căn nhà ở chưa tạm giữ;
 * giá bán = giá đ/m² × diện tích đơn vị đã nhập kèm căn cứ — không có giá thì để trống).
 */
export function macDinhDungLai(ma: string, duAn: DuAn): Record<string, string> {
  const vb = duAn.vanBan ?? {};
  const ban = (vb.thanh_vien_ban ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  if (ma === "T27" && ban.length) return { tp_ban: ban.join("\n") };
  if (ma === "T28" && ban.length) return { tp_chu_tri: ban[0]! };
  if (ma === "T31") {
    const nha = quyCua(duAn).lo.filter((l) => l.loai === "NHA_O" && !l.giuLai?.trim());
    if (!nha.length) return {};
    const dong = nha.map((l) => {
      const dt = l.dienTich?.trim() ? D(l.dienTich) : null;
      const gia = l.gia?.trim() && dt ? D(l.gia).times(dt).toFixed(0) : "";
      return `${tenLo(l).replace(" – lô ", " – căn ")} | ${dt ? dt.toString().replace(".", ",") : ""} | ${gia}`;
    });
    const canCu = [...new Set(nha.map((l) => l.canCuGia?.trim()).filter((x): x is string => !!x))];
    const khu = [...new Set(nha.map((l) => l.khu.trim()).filter(Boolean))];
    return {
      gia_ban_chi_tiet: dong.join("\n"),
      ...(canCu.length ? { can_cu_gia: canCu.map((c) => (/^căn cứ/i.test(c) ? c : `Căn cứ ${c}`).replace(/[;.]?$/, ";")).join("\n") } : {}),
      ...(khu.length ? { dia_diem_nha_tdc: khu.join(", ") } : {}),
    };
  }
  return {};
}

export function giaTriNhapThem(mau: MauVanBan, duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Record<string, string> {
  const tu = { ...macDinhDungLai(mau.ma, duAn), ...macDinhTuHoSo(ds) };
  // 1.0.12: kết quả thẩm định đã ghi nhận ở bản phương án là nguồn chính (ưu tiên hơn giá trị lưu tay)
  const td = ketQuaThamDinh(duAn, ds.map((x) => x.h.id));
  return Object.fromEntries(
    mau.nhapThem.map((t) => {
      if (t.truong === "ket_qua_tham_dinh" && td) return [t.truong, td];
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
