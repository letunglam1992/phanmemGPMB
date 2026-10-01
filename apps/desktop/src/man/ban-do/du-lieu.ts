import { CAU_HINH_MAC_DINH, docDgn, dungThua, ghepBanDo, goiYCauHinh, timThamChieu, type CauHinhLop, type KetQuaDocDgn, type KetQuaDungThua } from "@gpmb/gis";
import { type DuAn } from "../../mo-hinh";

export interface DuLieuBanDo {
  ban: KetQuaDocDgn;
  kq: KetQuaDungThua;
  pham: { minX: number; minY: number; maxX: number; maxY: number };
  /** Cấu hình lớp đã dùng để dựng thửa */
  cauHinh: CauHinhLop;
  /** true: cấu hình do phần mềm gợi ý (cán bộ chưa chốt) */
  laGoiY: boolean;
  ghiChuGoiY: string[];
  /** Các tệp (tờ bản đồ) đã dựng chung — thông tin từng tệp. */
  tep?: ThongTinTep[];
}

export interface ThongTinTep {
  /** "" = tệp chính; còn lại là id tệp ghép */
  khoa: string;
  ten: string;
  soPhanTu: number;
  /** Phạm vi các phần tử hình của tệp (VN-2000) */
  pham: { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** Tên tệp DGN nhắc tới trong tệp (tham chiếu ngoài không dựng được — nạp chính các tệp này) */
  thamChieu: string[];
}

function thongTinTep(khoa: string, ten: string, bytes: Uint8Array, ban: KetQuaDocDgn): ThongTinTep {
  const pham = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const e of ban.phanTu)
    if ("diem" in e)
      for (const d of e.diem) {
        if (d.x < pham.minX) pham.minX = d.x;
        if (d.y < pham.minY) pham.minY = d.y;
        if (d.x > pham.maxX) pham.maxX = d.x;
        if (d.y > pham.maxY) pham.maxY = d.y;
      }
  return { khoa, ten, soPhanTu: ban.phanTu.length, pham: Number.isFinite(pham.minX) ? pham : null, thamChieu: timThamChieu(bytes, ten) };
}

/**
 * Bộ nhớ đệm bản đồ đã dựng, theo dự án. Gắn với lần nạp (`ngayNhap`): nạp tệp khác, xóa bản đồ,
 * hoặc máy khác (mạng nội bộ) nạp bản đồ mới thì bản đệm cũ không còn được dùng.
 */
export const boNho = new Map<string, { ngayNhap: string; d: DuLieuBanDo }>();

/** Khóa lần nạp: tệp chính + các tệp ghép và trạng thái bật/tắt từng tờ (thêm/bỏ/bật/tắt thì dựng lại). */
export const khoaNapBanDo = (b: NonNullable<DuAn["banDo"]>) => [b.ngayNhap + (b.anTepChinh ? "~" : ""), ...(b.tepGhep ?? []).map((t) => t.id + (t.an ? "~" : ""))].join("|");

/** Có ít nhất một tờ đang bật — tắt hết thì vẫn dựng tệp chính. */
export const tepDangBat = (b: NonNullable<DuAn["banDo"]>) => ({ chinh: !b.anTepChinh || !(b.tepGhep ?? []).some((t) => !t.an), ghep: (b.tepGhep ?? []).filter((t) => !t.an) });

export function layDem(duAn: DuAn): DuLieuBanDo | null {
  const c = boNho.get(duAn.id);
  return c && duAn.banDo && c.ngayNhap === khoaNapBanDo(duAn.banDo) ? c.d : null;
}

/** Khóa kho của tệp ghép: "{duAnId}#{id}". */
export const khoaTepGhep = (duAnId: string, id: string) => `${duAnId}#${id}`;

/** Đọc tệp chính và các tệp ghép (docs/08 §9.9) rồi dựng thửa trên bản vẽ đã ghép. */
export async function napTatCa(kho: { docBanDo(id: string): Promise<Uint8Array | null> }, duAn: DuAn): Promise<DuLieuBanDo | null> {
  if (!duAn.banDo) return null;
  const bat = tepDangBat(duAn.banDo);
  const chinh = await kho.docBanDo(duAn.id);
  if (!chinh) return null;
  const ds: { khoa: string; ten: string; bytes: Uint8Array }[] = bat.chinh ? [{ khoa: "", ten: duAn.banDo.tenTep, bytes: chinh }] : [];
  for (const t of bat.ghep) {
    const b = await kho.docBanDo(khoaTepGhep(duAn.id, t.id));
    if (b) ds.push({ khoa: t.id, ten: t.tenTep, bytes: b });
  }
  if (!ds.length) ds.push({ khoa: "", ten: duAn.banDo.tenTep, bytes: chinh });
  return phanTichNhieu(ds, duAn.banDo.cauHinh);
}

/** Dựng thửa từ một hay nhiều tệp (tờ bản đồ) cùng hệ VN-2000. */
export function phanTichNhieu(ds: { khoa?: string; ten: string; bytes: Uint8Array }[], daChot?: CauHinhLop): DuLieuBanDo {
  const doc = ds.map((x) => ({ ten: x.ten, ban: docDgn(x.bytes) }));
  const tep = ds.map((x, i) => thongTinTep(x.khoa ?? "", x.ten, x.bytes, doc[i]!.ban));
  const ban = doc.length === 1 ? doc[0]!.ban : ghepBanDo(doc);
  const goiY = daChot ? null : goiYCauHinh(ban, CAU_HINH_MAC_DINH);
  return { ...dungLai(ban, daChot ?? goiY!.cauHinh, !daChot, goiY?.ghiChu ?? []), tep };
}

/** Các số tờ đọc được trên bản đồ đã dựng: số thửa, phạm vi — để chọn, phóng tới từng tờ. */
export function dsSoTo(dl: DuLieuBanDo): { soTo: string; soThua: number; pham: { minX: number; minY: number; maxX: number; maxY: number } }[] {
  const m = new Map<string, { soTo: string; soThua: number; pham: { minX: number; minY: number; maxX: number; maxY: number } }>();
  for (const t of dl.kq.thua) {
    const k = t.soTo ?? "?";
    const x = m.get(k) ?? { soTo: k, soThua: 0, pham: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity } };
    x.soThua++;
    for (const d of t.vong[0]!) {
      x.pham.minX = Math.min(x.pham.minX, d.x);
      x.pham.minY = Math.min(x.pham.minY, d.y);
      x.pham.maxX = Math.max(x.pham.maxX, d.x);
      x.pham.maxY = Math.max(x.pham.maxY, d.y);
    }
    m.set(k, x);
  }
  return [...m.values()].sort((a, b) => (a.soTo === "?" ? 1 : b.soTo === "?" ? -1 : a.soTo.localeCompare(b.soTo, "vi", { numeric: true })));
}

/** Tên tệp được tham chiếu nhưng dự án chưa có (so tên, không phân biệt hoa thường). */
export function thamChieuThieu(dl: DuLieuBanDo, banDo: NonNullable<DuAn["banDo"]>): { tu: string; ten: string }[] {
  const co = new Set([banDo.tenTep, ...(banDo.tepGhep ?? []).map((t) => t.tenTep)].map((x) => x.toLowerCase()));
  const out: { tu: string; ten: string }[] = [];
  for (const t of dl.tep ?? []) for (const ten of t.thamChieu) if (!co.has(ten.toLowerCase()) && !out.some((x) => x.ten.toLowerCase() === ten.toLowerCase())) out.push({ tu: t.ten, ten });
  return out;
}

export const TEN_CO: Record<string, string> = {
  THIEU_SO_THUA: "Thiếu số thửa",
  NHIEU_SO_THUA: "Nhiều số thửa",
  THIEU_SO_TO: "Thiếu số tờ",
  NHIEU_SO_TO: "Nhiều số tờ",
  THIEU_DIEN_TICH_GHI: "Thiếu nhãn DT",
  LECH_DIEN_TICH: "Lệch DT > 5%",
  THIEU_LOAI_DAT: "Thiếu loại đất",
  NHIEU_CHU: "Nhiều chủ",
  THIEU_CHU: "Thiếu chủ",
};

/** Đọc tệp và dựng thửa; không có cấu hình đã chốt thì dùng cấu hình gợi ý từ cấu trúc tệp. */
export function phanTich(bytes: Uint8Array, daChot?: CauHinhLop, ten = ""): DuLieuBanDo {
  return phanTichNhieu([{ khoa: "", ten, bytes }], daChot);
}

export function dungLai(ban: KetQuaDocDgn, cauHinh: CauHinhLop, laGoiY: boolean, ghiChuGoiY: string[]): DuLieuBanDo {
  const kq = dungThua(ban, cauHinh);
  const pham = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const t of kq.thua)
    for (const d of t.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  for (const v of kq.vungGpmb)
    for (const d of v.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  // Không dựng được thửa/vùng nào (sai cấu hình lớp): lấy phạm vi theo mọi phần tử hình để vẫn vẽ được nền
  if (!Number.isFinite(pham.minX))
    for (const e of ban.phanTu)
      if ("diem" in e)
        for (const d of e.diem) {
          pham.minX = Math.min(pham.minX, d.x);
          pham.minY = Math.min(pham.minY, d.y);
          pham.maxX = Math.max(pham.maxX, d.x);
          pham.maxY = Math.max(pham.maxY, d.y);
        }
  if (!Number.isFinite(pham.minX)) Object.assign(pham, { minX: 0, minY: 0, maxX: 1, maxY: 1 });
  if (pham.maxX - pham.minX < 1e-6) pham.maxX = pham.minX + 1;
  if (pham.maxY - pham.minY < 1e-6) pham.maxY = pham.minY + 1;
  return { ban, kq, pham, cauHinh, laGoiY, ghiChuGoiY };
}
