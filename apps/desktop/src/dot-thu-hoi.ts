/**
 * P3-1 — Đợt thu hồi trong một dự án.
 *
 * Quyết định của đơn vị (GĐ5): dự án nhiều đợt thì phương án bồi thường, hỗ trợ, tái định cư **chốt và phê duyệt theo
 * từng đợt**; **mã hồ sơ đánh số chung cho cả dự án** (không đánh lại theo đợt). Tổng hợp của dự án vẫn gồm mọi đợt.
 *
 * Thông tin của đợt (căn cứ, ngày thông báo thu hồi, bước chung 1–4, số/ngày văn bản) để trống thì lấy theo dự án.
 * Phần mềm không tự xếp hộ vào đợt — cán bộ chọn (từng hộ hoặc hàng loạt).
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { taoId, type DotThuHoi, type DuAn, type Ho } from "./mo-hinh";
import type { KetQuaHo } from "./tinh-ho";
import type { PhienBanPA } from "./phuong-an";
import { soD } from "./so";

/** Mã nhóm dùng cho hộ chưa xếp đợt (lọc, tổng hợp). */
export const CHUA_XEP_DOT = "__chua__";

export const dsDot = (duAn: Pick<DuAn, "dotThuHoi">): DotThuHoi[] => [...(duAn.dotThuHoi ?? [])].sort((a, b) => a.so - b.so);
export const coDot = (duAn: Pick<DuAn, "dotThuHoi">) => (duAn.dotThuHoi?.length ?? 0) > 0;
export const timDot = (duAn: Pick<DuAn, "dotThuHoi">, id: string | undefined) => (id ? duAn.dotThuHoi?.find((d) => d.id === id) : undefined);
export const dotCuaHo = (duAn: Pick<DuAn, "dotThuHoi">, h: Pick<Ho, "dotId">) => timDot(duAn, h.dotId);
export const tenDot = (d: DotThuHoi | undefined) => (d ? (d.ten.trim() || `Đợt ${d.so}`) : "Chưa xếp đợt");

export function dotMoi(duAn: Pick<DuAn, "dotThuHoi">): DotThuHoi {
  const so = (duAn.dotThuHoi ?? []).reduce((m, d) => Math.max(m, d.so), 0) + 1;
  return { id: taoId(), so, ten: `Đợt ${so}` };
}

/** Lỗi nhập đợt (null = hợp lệ). */
export function loiDot(d: DotThuHoi, ds: DotThuHoi[]): string | null {
  if (!d.ten.trim()) return "Chưa đặt tên đợt";
  if (!Number.isInteger(d.so) || d.so < 1) return "Số thứ tự đợt phải là số nguyên từ 1";
  if (ds.some((x) => x.id !== d.id && x.so === d.so)) return `Trùng số thứ tự đợt ${d.so}`;
  if (ds.some((x) => x.id !== d.id && x.ten.trim().toLowerCase() === d.ten.trim().toLowerCase())) return `Trùng tên đợt "${d.ten.trim()}"`;
  if (d.ngayThongBao && !/^\d{4}-\d{2}-\d{2}$/.test(d.ngayThongBao)) return "Ngày thông báo không hợp lệ";
  return null;
}

/**
 * Xóa đợt: chặn khi còn hộ thuộc đợt hoặc có bản phương án (chưa hủy) của đợt — tránh hộ, phương án trỏ tới đợt không còn.
 */
export function lyDoKhongXoaDot(d: DotThuHoi, hos: Pick<Ho, "dotId" | "daXoa">[], dsPA: Pick<PhienBanPA, "dotId" | "trangThai" | "so">[]): string[] {
  const out: string[] = [];
  const n = hos.filter((h) => h.dotId === d.id).length;
  if (n) out.push(`còn ${n} hồ sơ thuộc đợt (kể cả hồ sơ trong thùng rác) — chuyển sang đợt khác trước`);
  const pa = dsPA.filter((p) => p.dotId === d.id && p.trangThai !== "DA_HUY");
  if (pa.length) out.push(`có bản phương án số ${pa.map((p) => p.so).join(", ")} của đợt`);
  return out;
}

/**
 * Dự án "nhìn từ đợt": căn cứ, ngày thông báo, bước chung, văn bản của đợt ghi đè lên dự án. Dùng khi soạn văn bản,
 * cảnh báo thời hạn cho hộ thuộc đợt. Ghi nhớ theo (dự án, đợt) — dự án là đối tượng bất biến trong giao diện.
 */
const NHO = new WeakMap<DuAn, Map<string, DuAn>>();
export function duAnTheoDot(duAn: DuAn, dot: DotThuHoi | undefined): DuAn {
  if (!dot) return duAn;
  let m = NHO.get(duAn);
  if (!m) NHO.set(duAn, (m = new Map()));
  let v = m.get(dot.id);
  if (!v) {
    const vb: Record<string, string> = { ...(duAn.vanBan ?? {}), ...(dot.vanBan ?? {}) };
    if (dot.phamVi?.trim() && !dot.vanBan?.pham_vi_dot) vb.pham_vi_dot = dot.phamVi.trim();
    if (dot.canCuThuHoi?.trim() && !dot.vanBan?.can_cu_du_an && duAn.vanBan?.can_cu_du_an !== undefined)
      vb.can_cu_du_an = [duAn.vanBan.can_cu_du_an, `Căn cứ ${dot.canCuThuHoi.trim()};`].filter((x) => x.trim()).join("\n");
    v = {
      ...duAn,
      canCuThuHoi: dot.canCuThuHoi?.trim() || duAn.canCuThuHoi,
      ngayThongBao: dot.ngayThongBao || duAn.ngayThongBao,
      tienDoChung: dot.tienDoChung ? { ...(duAn.tienDoChung ?? {}), ...dot.tienDoChung } : duAn.tienDoChung,
      vanBan: vb,
    };
    m.set(dot.id, v);
  }
  return v;
}
export const duAnCuaHo = (duAn: DuAn, h: Pick<Ho, "dotId">) => duAnTheoDot(duAn, dotCuaHo(duAn, h));

/** Hộ theo bộ lọc đợt ("" = mọi đợt, CHUA_XEP_DOT = chưa xếp đợt). */
export const khopDot = (h: Pick<Ho, "dotId">, loc: string, duAn?: Pick<DuAn, "dotThuHoi">) =>
  !loc || (loc === CHUA_XEP_DOT ? !h.dotId || (duAn ? !timDot(duAn, h.dotId) : false) : h.dotId === loc);

/**
 * Phương án theo đợt: bản chốt phải thuộc một đợt khi dự án có đợt; mọi hộ trong bản phải thuộc đợt đó.
 * Trả danh sách lỗi (rỗng = hợp lệ).
 */
export function loiChotTheoDot(duAn: Pick<DuAn, "dotThuHoi">, hos: Pick<Ho, "ma" | "dotId">[], dotId: string | undefined): string[] {
  if (!coDot(duAn)) return dotId ? ["Dự án chưa khai báo đợt thu hồi"] : [];
  if (!dotId) return ["Dự án có nhiều đợt thu hồi — phương án chốt, phê duyệt theo từng đợt: chọn đợt"];
  const dot = timDot(duAn, dotId);
  if (!dot) return ["Đợt đã chọn không còn trong dự án"];
  const sai = hos.filter((h) => h.dotId !== dotId);
  return sai.length ? [`Hộ ${sai.map((h) => h.ma).join(", ")} không thuộc ${tenDot(dot)} — phương án của đợt chỉ gồm hộ thuộc đợt`] : [];
}

export interface DongTheoDot {
  dotId: string;
  ten: string;
  soHo: number;
  dtThuHoi: Decimal;
  /** Tổng tạm tính (đã làm tròn cấp hộ) của hộ trong đợt. */
  tamTinh: Decimal;
  /** Tổng theo bản phương án đã phê duyệt còn hiệu lực của đợt (bản số lớn nhất cho mỗi hộ). */
  daPheDuyet: Decimal;
  soHoDaPheDuyet: number;
  banPa: { so: number; trangThai: PhienBanPA["trangThai"]; qd?: string }[];
  soHoBanGiao: number;
  ngayThongBao?: string;
}

/** Tổng hợp theo đợt (một dòng mỗi đợt + dòng "Chưa xếp đợt" nếu có hộ chưa xếp) — tổng hợp chung vẫn là tổng các dòng. */
export function tongHopTheoDot(duAn: DuAn, kq: { h: Ho; k: KetQuaHo }[]): DongTheoDot[] {
  const dsPA = duAn.phuongAn ?? [];
  const duyet = new Map<string, string>();
  for (const p of [...dsPA].sort((a, b) => a.so - b.so)) if (p.trangThai === "DA_PHE_DUYET") for (const x of p.ho) duyet.set(x.hoId, x.tong);
  const nhom = [...dsDot(duAn).map((d) => ({ id: d.id, ten: tenDot(d), d })), { id: CHUA_XEP_DOT, ten: "Chưa xếp đợt", d: undefined }];
  return nhom
    .map(({ id, ten, d }) => {
      const ds = kq.filter(({ h }) => khopDot(h, id, duAn));
      const daDuyet = ds.filter(({ h }) => duyet.has(h.id));
      return {
        dotId: id,
        ten,
        soHo: ds.length,
        dtThuHoi: ds.reduce((s, { h }) => h.thua.reduce((a, t) => a.plus(soD(t.dienTichThuHoi)), s), D(0)),
        tamTinh: ds.reduce((s, { k }) => s.plus(k.tong.tongLamTron), D(0)),
        daPheDuyet: daDuyet.reduce((s, { h }) => s.plus(duyet.get(h.id)!), D(0)),
        soHoDaPheDuyet: daDuyet.length,
        banPa: dsPA.filter((p) => (d ? p.dotId === d.id : !p.dotId)).sort((a, b) => a.so - b.so).map((p) => ({ so: p.so, trangThai: p.trangThai, qd: p.pheDuyet?.so })),
        soHoBanGiao: ds.filter(({ h }) => !!h.banGiao?.ngay).length,
        ngayThongBao: d?.ngayThongBao,
      };
    })
    .filter((x) => x.dotId !== CHUA_XEP_DOT || x.soHo > 0 || x.banPa.length > 0);
}

/**
 * Đổi đợt của hộ: chặn khi hộ đã có trong bản phương án (chưa hủy) của đợt khác — số liệu đã chốt/duyệt theo đợt cũ.
 */
export function lyDoKhongDoiDot(duAn: Pick<DuAn, "phuongAn" | "dotThuHoi">, h: Pick<Ho, "id" | "dotId">, dotMoiId: string | undefined): string | null {
  if ((h.dotId ?? "") === (dotMoiId ?? "")) return null;
  const p = (duAn.phuongAn ?? []).find((x) => x.trangThai !== "DA_HUY" && x.ho.some((y) => y.hoId === h.id) && (x.dotId ?? "") !== (dotMoiId ?? ""));
  if (!p) return null;
  return `hộ đã có trong bản phương án số ${p.so} (${p.trangThai === "DA_PHE_DUYET" ? "đã phê duyệt" : "đã chốt"}${p.dotId ? `, ${tenDot(timDot(duAn, p.dotId))}` : ""}) — hủy bản chốt hoặc giữ đợt cũ`;
}

/**
 * Thông tin chung của văn bản khi soạn cho một đợt: số/ngày văn bản của đợt, phạm vi đợt, căn cứ thu hồi của đợt ghi
 * đè lên thông tin chung của dự án (không sửa thông tin chung đã lưu của dự án).
 */
export function chungTheoDot(chung: Record<string, string>, dot: DotThuHoi | undefined): Record<string, string> {
  if (!dot) return chung;
  const out: Record<string, string> = { ...chung };
  if (dot.phamVi?.trim()) out.pham_vi_dot = dot.phamVi.trim();
  if (dot.canCuThuHoi?.trim()) out.can_cu_du_an = [chung.can_cu_du_an ?? "", `Căn cứ ${dot.canCuThuHoi.trim()};`].filter((x) => x.trim()).join("\n");
  return { ...out, ...(dot.vanBan ?? {}) };
}
