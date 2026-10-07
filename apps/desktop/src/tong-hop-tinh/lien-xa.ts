/**
 * Dự án liên xã (dự án tuyến: đường, đường dây, kênh… đi qua nhiều xã, phường) — 1.0.4.
 *
 * Mỗi xã lập hồ sơ, phương án cho phần đất trên địa bàn mình (khoản 2 Điều 83 Luật Đất đai 2024; thẩm quyền cấp huyện
 * chuyển cho cấp xã theo phân định thẩm quyền chính quyền hai cấp), nên ở cấp tỉnh một tuyến là nhiều "đoạn" do nhiều
 * xã gửi. Quy ước (người dùng quyết định 2026-10-07):
 *   - Tỉnh cấp **mã dự án dùng chung** cho mỗi tuyến và khai **danh sách xã dọc tuyến**; xã điền mã đó vào dự án của mình.
 *   - Tỉnh gom các đoạn theo mã: số dự án đếm theo mã (không đếm trùng); số hộ, DT, kinh phí cộng các đoạn; xã dọc tuyến
 *     chưa gửi đoạn của mình hiện "chưa có số liệu"; hoàn thành toàn tuyến chỉ khi mọi xã đã gửi và mọi hộ đã bàn giao.
 *   - Đoạn chưa ghi mã: phần mềm chỉ GỢI Ý ghép (cùng chủ đầu tư, tên gần giống) — cán bộ tỉnh xác nhận mới ghép.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { TomTatDuAn } from "./goi-tinh";

export interface TuyenLienXa {
  /** Mã dự án dùng chung do tỉnh cấp (vd. LX-2026-001) */
  ma: string;
  ten: string;
  chuDauTu: string;
  /** Xã, phường dọc tuyến theo quyết định chủ trương / phạm vi dự án */
  dsXa: string[];
  ghiChu?: string;
  /** Đoạn chưa ghi mã do cán bộ tỉnh ghép tay: khóa "maGui|duAnId" */
  ghep?: string[];
  taoLuc: string;
  taoBoi: string;
}

/** Thông tin liên xã xã ghi ở dự án (DuAn.lienXa) và đi kèm tóm tắt gói. */
export interface LienXaDuAn {
  ma: string;
  tenTuyen?: string;
  kmDau?: string;
  kmCuoi?: string;
}

/** Một đoạn (dự án của một xã) ở máy tỉnh. */
export type DoanTinh = TomTatDuAn & { maGui: string; donViGui: string; luc: string };

export const chuanMa = (s: string) => s.normalize("NFC").trim().toUpperCase().replace(/\s+/g, "");
const khongDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
/** So tên xã: bỏ "Xã/Phường/Đặc khu", dấu, hoa thường, khoảng trắng. */
export const chuanXa = (s: string) => khongDau(s).toLowerCase().replace(/^\s*(xa|phuong|dac khu|thi tran)\s+/, "").replace(/\s+/g, " ").trim();
export const khoaDoan = (d: Pick<DoanTinh, "maGui" | "id">) => `${d.maGui}|${d.id}`;

/** Mã kế tiếp gợi ý: LX-<năm>-<số thứ tự 3 chữ số>, tiếp số lớn nhất đã dùng trong năm (người dùng sửa được). */
export function maTiepTheo(ds: Pick<TuyenLienXa, "ma">[], nam = new Date().getFullYear()): string {
  const re = new RegExp(`^LX-${nam}-(\\d+)$`);
  const max = ds.reduce((m, t) => Math.max(m, Number(re.exec(chuanMa(t.ma))?.[1] ?? 0)), 0);
  return `LX-${nam}-${String(max + 1).padStart(3, "0")}`;
}

/** Lỗi khai báo tuyến (null = hợp lệ). */
export function loiTuyen(t: Pick<TuyenLienXa, "ma" | "ten" | "dsXa">, ds: Pick<TuyenLienXa, "ma">[], maCu?: string): string | null {
  const ma = chuanMa(t.ma);
  if (!ma) return "Chưa có mã dự án dùng chung";
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,39}$/.test(ma)) return "Mã chỉ gồm chữ không dấu, số, dấu - . _ / (2–40 ký tự)";
  if (ds.some((x) => chuanMa(x.ma) === ma && chuanMa(x.ma) !== chuanMa(maCu ?? ""))) return `Mã ${ma} đã dùng cho dự án khác`;
  if (!t.ten.trim()) return "Chưa có tên dự án";
  if (t.dsXa.length < 2) return "Dự án liên xã cần ít nhất hai xã, phường dọc tuyến";
  const trung = t.dsXa.map(chuanXa).find((x, i, a) => a.indexOf(x) !== i);
  if (trung) return `Trùng xã, phường trong danh sách: ${t.dsXa.find((x) => chuanXa(x) === trung)}`;
  return null;
}

/** Danh sách xã nhập tay: mỗi dòng hoặc cách nhau dấu phẩy, chấm phẩy. */
export const tachDsXa = (s: string) => s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);

export interface SoLieuDoan {
  soHo: number;
  banGiao: number;
  soVuongMac: number;
  chotPA: number;
  duyetPA: number;
  tamTinh: Decimal;
  dienTich: Decimal;
}
const cong = (ds: DoanTinh[]): SoLieuDoan => ({
  soHo: ds.reduce((s, d) => s + d.soHo, 0),
  banGiao: ds.reduce((s, d) => s + (d.theoTrangThai.HOAN_THANH ?? 0), 0),
  soVuongMac: ds.reduce((s, d) => s + d.soVuongMac, 0),
  chotPA: ds.reduce((s, d) => s + d.soHoDaChotPA, 0),
  duyetPA: ds.reduce((s, d) => s + d.soHoDaDuyetPA, 0),
  tamTinh: ds.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0)),
  dienTich: ds.reduce((s, d) => s.plus(D(d.dienTichThuHoi)), D(0)),
});

export interface DongXaTuyen {
  xa: string;
  /** Các đoạn (dự án) xã đó gửi cho tuyến — rỗng = chưa có số liệu */
  doan: DoanTinh[];
  soLieu: SoLieuDoan;
  /** Xã có đoạn nhưng không nằm trong danh sách xã dọc tuyến do tỉnh khai */
  ngoaiDs: boolean;
}

export interface TongHopTuyen {
  tuyen: TuyenLienXa | null;
  ma: string;
  ten: string;
  xa: DongXaTuyen[];
  tong: SoLieuDoan;
  /** Xã dọc tuyến chưa gửi đoạn */
  xaThieu: string[];
  /** Mọi xã dọc tuyến đã gửi và mọi hộ đã bàn giao mặt bằng */
  hoanThanh: boolean;
  /** Xã ghi mã nhưng tỉnh chưa khai mã này */
  chuaKhai: boolean;
}

export interface GoiYGhep {
  doan: DoanTinh;
  ma: string;
  lyDo: string;
}

const tu = (s: string) => new Set(khongDau(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1));
/**
 * Độ giống tên (theo từ, không dấu): tỷ lệ từ của tên ngắn hơn có trong tên dài hơn — tên đoạn ở xã thường là tên tuyến
 * thêm "đoạn qua xã…". Tên ngắn dưới 3 từ thì dùng Jaccard (tránh trùng ngẫu nhiên).
 */
export function doGiongTen(a: string, b: string): number {
  const x = tu(a), y = tu(b);
  if (!x.size || !y.size) return 0;
  let chung = 0;
  for (const w of x) if (y.has(w)) chung++;
  const ngan = Math.min(x.size, y.size);
  return ngan >= 3 ? chung / ngan : chung / (x.size + y.size - chung);
}

/**
 * Gom các đoạn theo mã dự án dùng chung: mã xã ghi (DoanTinh.lienXa.ma) hoặc ghép tay của tỉnh. Trả các tuyến (cả tuyến
 * đã khai chưa có đoạn nào), đoạn không thuộc tuyến nào, gợi ý ghép, và số dự án toàn tỉnh (đếm theo mã).
 */
export function gomLienXa(doan: DoanTinh[], dsTuyen: TuyenLienXa[]) {
  const theoMa = new Map<string, TuyenLienXa>(dsTuyen.map((t) => [chuanMa(t.ma), t]));
  const ghepTay = new Map<string, string>();
  for (const t of dsTuyen) for (const k of t.ghep ?? []) ghepTay.set(k, chuanMa(t.ma));
  const nhom = new Map<string, DoanTinh[]>();
  const le: DoanTinh[] = [];
  for (const d of doan) {
    const ma = (d.lienXa?.ma && chuanMa(d.lienXa.ma)) || ghepTay.get(khoaDoan(d));
    if (ma) nhom.set(ma, [...(nhom.get(ma) ?? []), d]);
    else le.push(d);
  }
  const ma = [...new Set([...theoMa.keys(), ...nhom.keys()])].sort((a, b) => a.localeCompare(b, "vi"));
  const tuyen: TongHopTuyen[] = ma.map((m) => {
    const t = theoMa.get(m) ?? null;
    const ds = nhom.get(m) ?? [];
    const theoXa = new Map<string, { xa: string; doan: DoanTinh[] }>();
    for (const x of t?.dsXa ?? []) theoXa.set(chuanXa(x), { xa: x, doan: [] });
    for (const d of ds) {
      const k = chuanXa(d.xa || "(Chưa ghi xã, phường)");
      const cu = theoXa.get(k) ?? { xa: d.xa || "(Chưa ghi xã, phường)", doan: [] };
      cu.doan.push(d);
      theoXa.set(k, cu);
    }
    const dsKhai = new Set((t?.dsXa ?? []).map(chuanXa));
    const xa: DongXaTuyen[] = [...theoXa.entries()].map(([k, v]) => ({ xa: v.xa, doan: v.doan, soLieu: cong(v.doan), ngoaiDs: !!t && !dsKhai.has(k) }));
    const xaThieu = xa.filter((x) => !x.doan.length).map((x) => x.xa);
    const tong = cong(ds);
    return {
      tuyen: t,
      ma: m,
      ten: t?.ten || ds.find((d) => d.lienXa?.tenTuyen)?.lienXa?.tenTuyen || ds[0]?.ten || m,
      xa,
      tong,
      xaThieu,
      hoanThanh: !xaThieu.length && tong.soHo > 0 && tong.banGiao === tong.soHo,
      chuaKhai: !t,
    };
  });
  // Gợi ý ghép: đoạn chưa có mã, cùng chủ đầu tư (không dấu) với tuyến đã khai và tên giống ≥ 0,5, xã có trong danh sách
  const goiY: GoiYGhep[] = [];
  for (const d of le)
    for (const t of dsTuyen) {
      const giong = Math.max(doGiongTen(d.ten, t.ten), d.lienXa?.tenTuyen ? doGiongTen(d.lienXa.tenTuyen, t.ten) : 0);
      const cungCdt = !!d.chuDauTu.trim() && chuanXa(d.chuDauTu) === chuanXa(t.chuDauTu);
      const coXa = t.dsXa.some((x) => chuanXa(x) === chuanXa(d.xa));
      if (giong >= 0.5 && (cungCdt || coXa)) goiY.push({ doan: d, ma: chuanMa(t.ma), lyDo: `tên giống ${Math.round(giong * 100)}%${cungCdt ? ", cùng chủ đầu tư" : ""}${coXa ? ", xã có trong danh sách dọc tuyến" : ""}` });
    }
  return { tuyen, le, goiY, soDuAn: le.length + tuyen.filter((t) => t.xa.some((x) => x.doan.length)).length };
}
