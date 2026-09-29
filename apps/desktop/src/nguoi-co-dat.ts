/**
 * P3-2 — Người có đất dùng chung giữa các dự án: khớp hồ sơ theo số định danh (CCCD/số định danh cá nhân của chủ hộ,
 * cá nhân; mã số thuế / số quyết định thành lập của tổ chức), cảnh báo **có thể** hỗ trợ trùng.
 *
 * Quyết định của đơn vị (GĐ5): đồng ý so khớp số định danh giữa các dự án. Việc so khớp chạy trên dữ liệu đã có trong
 * máy/mạng nội bộ (máy trạm đã tải hồ sơ của mọi dự án được xem), không gửi đi đâu, không lưu thêm bảng dữ liệu cá nhân.
 *
 * Phần mềm KHÔNG kết luận hộ được hay không được hỗ trợ lần nữa: chỉ liệt kê các khoản hỗ trợ cùng loại đã ghi ở hồ sơ
 * khác của cùng một người để cán bộ kiểm tra (vd. hộ đã được bố trí tái định cư ở dự án trước).
 */
import type { DuAn, Ho, LoaiDoiTuong } from "./mo-hinh";

/** Chuẩn hóa số định danh: bỏ khoảng trắng, dấu chấm, gạch; chữ in hoa. Chuỗi quá ngắn (< 9 ký tự) không dùng để khớp. */
export function chuanDinhDanh(s: string | undefined): string | null {
  const x = (s ?? "").replace(/[\s.\-_/]/g, "").toUpperCase();
  return x.length >= 9 ? x : null;
}
const nhom = (l: LoaiDoiTuong) => (l === "TO_CHUC" ? "TC" : "CN");
export const khoaNguoi = (h: Pick<Ho, "soDinhDanh" | "loai">) => {
  const x = chuanDinhDanh(h.soDinhDanh);
  return x ? `${nhom(h.loai)}:${x}` : null;
};

export type LoaiHoTroTheoDoi = "TDC" | "ON_DINH" | "CHUYEN_NGHE" | "TAM_CU";
export const HO_TRO_THEO_DOI: Record<LoaiHoTroTheoDoi, { ten: string; canCu: string }> = {
  TDC: { ten: "Bố trí tái định cư / hỗ trợ tái định cư", canCu: "Điều 111 Luật Đất đai 2024" },
  ON_DINH: { ten: "Hỗ trợ ổn định đời sống", canCu: "khoản 1 Điều 19 NĐ 88/2024" },
  CHUYEN_NGHE: { ten: "Hỗ trợ đào tạo, chuyển đổi nghề, tìm kiếm việc làm", canCu: "Điều 109 Luật Đất đai 2024" },
  TAM_CU: { ten: "Hỗ trợ tạm cư", canCu: "khoản 3, khoản 4 Điều 3 QĐ 14/2026" },
};

/** Các khoản hỗ trợ theo đối tượng đã ghi trong hồ sơ (dữ kiện nhập, không phải kết quả tính). */
export function hoTroDaGhi(h: Ho): LoaiHoTroTheoDoi[] {
  const out: LoaiHoTroTheoDoi[] = [];
  if (h.hoTro.taiDinhCu) out.push("TDC");
  if (h.hoTro.onDinh) out.push("ON_DINH");
  if (h.hoTro.chuyenDoiNghe && h.loai !== "TO_CHUC") out.push("CHUYEN_NGHE");
  if (h.hoTro.tamCu && h.hoTro.tamCu.soThang > 0) out.push("TAM_CU");
  return out;
}

export interface HoSoNguoi {
  h: Ho;
  duAn: DuAn;
}

/** Chỉ mục số định danh → các hồ sơ (bỏ hồ sơ, dự án trong thùng rác). */
export function chiMucNguoi(dsDuAn: DuAn[], hos: Ho[]): Map<string, HoSoNguoi[]> {
  const da = new Map(dsDuAn.filter((d) => !d.daXoa).map((d) => [d.id, d]));
  const m = new Map<string, HoSoNguoi[]>();
  for (const h of hos) {
    if (h.daXoa) continue;
    const d = da.get(h.duAnId);
    const k = khoaNguoi(h);
    if (!d || !k) continue;
    m.set(k, [...(m.get(k) ?? []), { h, duAn: d }]);
  }
  return m;
}

/** Hồ sơ khác của cùng người (cùng số định danh), ở dự án này hoặc dự án khác. */
export function hoSoKhac(chiMuc: Map<string, HoSoNguoi[]>, h: Pick<Ho, "id" | "soDinhDanh" | "loai">): HoSoNguoi[] {
  const k = khoaNguoi(h);
  return k ? (chiMuc.get(k) ?? []).filter((x) => x.h.id !== h.id) : [];
}

export interface CanhBaoNguoi {
  hoId: string;
  loai: LoaiHoTroTheoDoi;
  noiDung: string;
  canCu: string;
  khac: HoSoNguoi[];
}

/** Khoản hỗ trợ cùng loại đã ghi ở hồ sơ khác của cùng người → "cần kiểm tra" (không kết luận). */
export function canhBaoHoTroTrung(chiMuc: Map<string, HoSoNguoi[]>, h: Ho): CanhBaoNguoi[] {
  const khac = hoSoKhac(chiMuc, h);
  if (!khac.length) return [];
  const cua = new Set(hoTroDaGhi(h));
  return [...cua].flatMap((l) => {
    const ds = khac.filter((x) => hoTroDaGhi(x.h).includes(l));
    if (!ds.length) return [];
    const nd = `${HO_TRO_THEO_DOI[l].ten} đã ghi ở hồ sơ khác cùng số định danh: ${ds.map((x) => `${x.duAn.ten} – ${x.h.ma}`).join("; ")} — kiểm tra điều kiện, tránh hỗ trợ trùng`;
    return [{ hoId: h.id, loai: l, noiDung: nd, canCu: HO_TRO_THEO_DOI[l].canCu, khac: ds }];
  });
}

/** Người có từ hai hồ sơ trở lên (mọi dự án) — danh sách tra cứu, sắp theo số hồ sơ. */
export function nguoiNhieuHoSo(chiMuc: Map<string, HoSoNguoi[]>): { khoa: string; ds: HoSoNguoi[]; hoTroTrung: LoaiHoTroTheoDoi[] }[] {
  return [...chiMuc]
    .filter(([, ds]) => ds.length > 1)
    .map(([khoa, ds]) => {
      const dem = new Map<LoaiHoTroTheoDoi, number>();
      for (const x of ds) for (const l of hoTroDaGhi(x.h)) dem.set(l, (dem.get(l) ?? 0) + 1);
      return { khoa, ds, hoTroTrung: [...dem].filter(([, n]) => n > 1).map(([l]) => l) };
    })
    .sort((a, b) => b.hoTroTrung.length - a.hoTroTrung.length || b.ds.length - a.ds.length);
}
