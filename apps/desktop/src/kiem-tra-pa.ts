/**
 * Kiểm tra tệp Excel phương án bồi thường, hỗ trợ, tái định cư do đơn vị khác lập (Phụ lục chi tiết):
 * - số học: Thành tiền = Khối lượng × Đơn giá × Tỷ lệ/hệ số; tổng nhóm, dòng Cộng/Tổng cộng;
 * - đơn giá: đối chiếu danh mục đã trích xuất (QĐ 32/2025, PL VIII và PL V QĐ 106/2025);
 * - giá đất: đối chiếu NQ 152/2025 theo xã được chọn; hệ số hỗ trợ chuyển đổi nghề theo bộ chính sách.
 * Mô-đun thuần (không phụ thuộc giao diện). Không tự đặt ra mức giá: chỉ so với dữ liệu nguồn đã nạp;
 * không tìm thấy thì báo "Không kiểm được" để cán bộ kiểm thủ công.
 */
import type ExcelJS from "exceljs";
import type Decimal from "decimal.js";
import { D, type BoChinhSach } from "@gpmb/core";
import type { BangGiaDat, DongDonGia } from "./du-lieu";
import { docSo } from "./nhap-excel";
import { khongDau } from "./tim-kiem";

export type O = string | number | null;
export interface TrangBang {
  ten: string;
  o: O[][];
  /** Nhãn vị trí từng dòng (tệp Word: "Bảng 2, dòng 5"); không có thì dùng số dòng Excel */
  viTri?: string[];
}

export type TruongCot = "stt" | "ten" | "dvt" | "kl" | "dg" | "tyLe" | "tt" | "canCu";
export const TEN_TRUONG_COT: Record<TruongCot, string> = {
  stt: "STT",
  ten: "Nội dung / tên tài sản",
  dvt: "Đơn vị tính",
  kl: "Khối lượng, số lượng, diện tích",
  dg: "Đơn giá",
  tyLe: "Tỷ lệ (%) / hệ số",
  tt: "Thành tiền",
  canCu: "Căn cứ",
};
export type AnhXaCot = Partial<Record<TruongCot, number>>;

export type MucDo = "LOI" | "CANH_BAO" | "DUNG" | "KHONG_KIEM" | "THONG_TIN";
export const TEN_MUC_DO: Record<MucDo, string> = { LOI: "Lỗi", CANH_BAO: "Cảnh báo", DUNG: "Đúng", KHONG_KIEM: "Không kiểm được", THONG_TIN: "Lưu ý" };
export type LoaiKiem = "SO_HOC" | "DON_GIA" | "GIA_DAT" | "HE_SO" | "TONG" | "DU_LIEU";
export const TEN_LOAI_KIEM: Record<LoaiKiem, string> = { SO_HOC: "Số học", DON_GIA: "Đơn giá", GIA_DAT: "Giá đất", HE_SO: "Hệ số", TONG: "Tổng", DU_LIEU: "Dữ liệu" };

export interface PhatHien {
  mucDo: MucDo;
  loai: LoaiKiem;
  noiDung: string;
  /** Nguồn đối chiếu (văn bản, mã, trang) */
  canCu?: string;
}

export type LoaiDong = "CHI_TIET" | "NHOM" | "TONG" | "LAM_TRON";
export interface DongPA {
  /** Số dòng trên Excel (bắt đầu từ 1) */
  dong: number;
  /** Vị trí hiển thị (tệp Word: bảng, dòng) */
  viTri: string;
  loai: LoaiDong;
  capNhom: number;
  stt: string;
  ten: string;
  dvt: string;
  kl: Decimal | null;
  dg: Decimal | null;
  /** Hệ số nhân (đã quy đổi: 30% → 0,3) */
  heSo: Decimal | null;
  tt: Decimal | null;
  canCu: string;
  phatHien: PhatHien[];
}

export interface KetQuaKiemTra {
  trang: string;
  dongTieuDe: number;
  anhXa: AnhXaCot;
  dong: DongPA[];
  /** Lưu ý chung (không gắn với dòng) */
  chung: PhatHien[];
  dem: Record<MucDo, number>;
}

export interface DuLieuKiemTra {
  donGia: DongDonGia[];
  bangGia?: BangGiaDat | null;
  chinhSach?: BoChinhSach | null;
  /** Xã/phường nơi có đất thu hồi (tên theo NQ 152) — cần để kiểm giá đất, hệ số chuyển đổi nghề */
  xa?: string;
}

/* ============================ Đọc Excel ============================ */

function chuO(v: ExcelJS.CellValue): O {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return chuO(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
  }
  return null;
}

/** Đọc mọi trang của tệp .xlsx thành bảng giá trị (ô gộp: giá trị nằm ở ô đầu). */
export async function docTepExcel(bytes: Uint8Array): Promise<TrangBang[]> {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  const kq: TrangBang[] = [];
  wb.eachSheet((ws) => {
    const o: O[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const dong: O[] = [];
      row.eachCell({ includeEmpty: true }, (c, col) => {
        dong[col - 1] = c.isMerged && c.master.address !== c.address ? null : chuO(c.value);
      });
      o[r - 1] = dong;
    });
    for (let i = 0; i < o.length; i++) o[i] ??= [];
    kq.push({ ten: ws.name, o });
  });
  return kq;
}

/* ============================ Đọc Word (.docx) ============================ */

/** Các phần tử con cân bằng `<w:ten …>…</w:ten>` ở cấp ngoài cùng của chuỗi XML (bỏ qua phần tử lồng cùng tên). */
function phanTuCon(xml: string, ten: string): string[] {
  const mo = new RegExp(`<${ten}(?=[\\s>/])[^>]*?(/?)>|</${ten}>`, "g");
  const kq: string[] = [];
  let sau = 0, batDau = -1;
  for (let m; (m = mo.exec(xml)); ) {
    if (m[0].startsWith("</")) {
      if (--sau === 0 && batDau >= 0) kq.push(xml.slice(batDau, mo.lastIndex));
    } else if (m[1] === "/") {
      if (sau === 0) kq.push(m[0]);
    } else {
      if (sau++ === 0) batDau = m.index;
    }
  }
  return kq;
}

const giaiMaXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, "&");

/** Chữ trong một ô: các đoạn nối bằng khoảng trắng; bỏ bảng lồng. */
function chuTrongO(tc: string): string {
  const khongLong = tc.replace(/<w:tbl[\s>][\s\S]*?<\/w:tbl>/g, " ");
  return phanTuCon(khongLong, "w:p")
    .map((p) => giaiMaXml((p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) ?? []).map((x) => (x.startsWith("<w:t") && !x.startsWith("<w:tab") ? x.replace(/<[^>]+>/g, "") : " ")).join("")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Số trong văn bản Word theo cách viết Việt Nam: dấu chấm phân cách nghìn, dấu phẩy thập phân ("5.523,2", "54.000").
 * Chuỗi khác (có chữ, "100%") giữ nguyên để bộ đọc số xử lý.
 */
export function soTuChuVN(s: string): O {
  const t = s.replace(/[\s\u00a0]/g, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^-?\d+(,\d+)?$/.test(t)) return Number(t.replace(",", "."));
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  return s;
}

function bangWord(tbl: string): O[][] {
  const o: O[][] = [];
  for (const tr of phanTuCon(tbl, "w:tr")) {
    const d: O[] = [];
    for (const tc of phanTuCon(tr, "w:tc")) {
      const pr = /<w:tcPr>[\s\S]*?<\/w:tcPr>/.exec(tc)?.[0] ?? "";
      const span = Number(/<w:gridSpan w:val="(\d+)"/.exec(pr)?.[1] ?? 1);
      const noiTiep = /<w:vMerge(?:\s*\/>|\s+w:val="continue")/.test(pr); // ô gộp dọc phía dưới: như ô gộp Excel
      d.push(noiTiep ? null : soTuChuVN(chuTrongO(tc)));
      for (let i = 1; i < span; i++) d.push(null);
    }
    o.push(d);
  }
  return o;
}

/**
 * Đọc các bảng trong tệp Word (.docx) thành bảng giá trị. Các bảng có cùng cấu trúc cột (phụ lục tách bảng theo hộ,
 * theo trang) được gộp thêm thành một bảng "Gộp …" để kiểm tổng thể.
 */
export async function docTepWord(bytes: Uint8Array): Promise<TrangBang[]> {
  const { default: PizZip } = await import("pizzip");
  let xml: string;
  try {
    xml = new PizZip(bytes).file("word/document.xml")?.asText() ?? "";
  } catch {
    throw new Error("Không đọc được tệp Word — tệp hỏng hoặc không phải .docx (tệp .doc cũ: mở bằng Word và lưu lại dạng .docx).");
  }
  if (!xml) throw new Error("Tệp .docx không có nội dung văn bản (word/document.xml).");
  const than = /<w:body>([\s\S]*)<\/w:body>/.exec(xml)?.[1] ?? xml;
  const ds: TrangBang[] = phanTuCon(than, "w:tbl").map((tbl, i) => {
    const o = bangWord(tbl);
    return { ten: `Bảng ${i + 1} (${o.length} dòng)`, o, viTri: o.map((_, r) => `B${i + 1}.${r + 1}`) };
  });
  if (!ds.length) throw new Error("Tệp Word không có bảng nào — phương án cần trình bày dạng bảng.");
  // Gộp các bảng cùng cấu trúc cột
  const nhom = new Map<string, { t: TrangBang; nd: NonNullable<ReturnType<typeof nhanDienCot>> }[]>();
  for (const t of ds) {
    const nd = nhanDienCot(t.o);
    if (!nd) continue;
    const k = JSON.stringify(nd.anhXa);
    nhom.set(k, [...(nhom.get(k) ?? []), { t, nd }]);
  }
  for (const g of nhom.values()) {
    if (g.length < 2) continue;
    const [dau, ...con] = g;
    const o = [...dau!.t.o], viTri = [...dau!.t.viTri!];
    for (const x of con) {
      o.push(...x.t.o.slice(x.nd.batDau));
      viTri.push(...x.t.viTri!.slice(x.nd.batDau));
    }
    ds.unshift({ ten: `Gộp ${g.length} bảng cùng cấu trúc (${g.map((x) => x.t.ten.split(" (")[0]).join(", ")})`, o, viTri });
  }
  return ds;
}

/** Đọc tệp phương án theo đuôi: .xlsx hoặc .docx. */
export async function docTepPhuongAn(ten: string, bytes: Uint8Array): Promise<TrangBang[]> {
  if (/\.xlsx$/i.test(ten)) return docTepExcel(bytes);
  if (/\.docx$/i.test(ten)) return docTepWord(bytes);
  if (/\.(xls|doc)$/i.test(ten)) throw new Error("Tệp định dạng cũ (.xls, .doc): mở bằng Excel/Word và lưu lại dạng .xlsx/.docx.");
  throw new Error("Chỉ đọc được tệp Excel (.xlsx) hoặc Word (.docx).");
}

/* ============================ Nhận diện cột ============================ */

const chu = (v: O) => (v == null ? "" : khongDau(String(v)).replace(/\s+/g, " ").trim());

const MAU_COT: [TruongCot, RegExp, RegExp?][] = [
  ["dg", /don gia/],
  ["tt", /thanh tien|so tien|gia tri (boi thuong|ho tro)|^gia tri$|kinh phi/, /don gia/],
  ["tyLe", /ty le|he so|muc huong|%/, /don gia|thanh tien/],
  ["kl", /khoi luong|so luong|dien tich thu hoi|^kl$|^sl$|dien tich/, /don gia|thanh tien/],
  ["dvt", /dvt|don vi tinh|^don vi$/, /don gia/],
  ["canCu", /can cu/],
  ["stt", /^(stt|tt|so tt|so thu tu)$/],
  ["ten", /noi dung|ten tai san|hang muc|danh muc|dien giai|loai tai san|ten cay|ten vat kien truc|ten loai|khoan muc|^ten$/, /ho va ten|ho ten|chu su dung|ten chu/],
];

/** Dòng đánh số cột "(1) (2) (3)" hoặc 1 2 3 … dưới tiêu đề */
function laDongDanhSo(d: O[]): boolean {
  const g = d.filter((x) => x != null && String(x).trim() !== "").map((x) => String(x).trim());
  return g.length >= 3 && g.every((x) => /^\(?\d{1,2}\)?(\s*[=x×*+\-/].*)?$/.test(x));
}

/** Tìm dòng tiêu đề (có "Đơn giá" và "Thành tiền"/tương đương) trong 40 dòng đầu, ghép 2 dòng khi tiêu đề gộp ô. */
export function nhanDienCot(o: O[][]): { dongTieuDe: number; anhXa: AnhXaCot; batDau: number } | null {
  for (let r = 0; r < Math.min(o.length, 40); r++) {
    const d = o[r] ?? [];
    const coDg = d.some((x) => /don gia/.test(chu(x)));
    const coTt = d.some((x) => /thanh tien|so tien|gia tri|kinh phi/.test(chu(x)));
    if (!coDg || !coTt) continue;
    const soCot = Math.max(d.length, o[r + 1]?.length ?? 0, o[r + 2]?.length ?? 0);
    // Tiêu đề 2 tầng: ghép với dòng dưới nếu dòng dưới không phải số liệu
    const duoi = o[r + 1] ?? [];
    const ghep = !laDongDanhSo(duoi) && duoi.some((x) => typeof x === "string" && x.trim()) && !duoi.some((x) => typeof x === "number" && x > 100);
    const tieuDe = Array.from({ length: soCot }, (_, c) => [chu(d[c] ?? null), ghep ? chu(duoi[c] ?? null) : ""].filter(Boolean).join(" "));
    const anhXa: AnhXaCot = {};
    const daDung = new Set<number>();
    for (const [truong, mau, tru] of MAU_COT) {
      // Tầng dưới cụ thể hơn: ưu tiên ô tầng dưới khớp mẫu
      // Tầng dưới được ưu tiên khi chính nó khớp mẫu ("Đơn giá" | "Thành tiền" dưới "Giá trị bồi thường"); không thì xét cả hai tầng
      const ungVien = tieuDe
        .map((t, c) => {
          const d = ghep ? chu(duoi[c] ?? null) : "";
          return { c, t: d && mau.test(d) ? d : t };
        })
        .filter((x) => !daDung.has(x.c) && mau.test(x.t) && !(tru && tru.test(x.t)));
      if (!ungVien.length) continue;
      // Khối lượng: ưu tiên "khối lượng/số lượng", rồi "diện tích thu hồi", rồi "diện tích"
      const chon = truong === "kl" ? ungVien.find((x) => /khoi luong|so luong/.test(x.t)) ?? ungVien.find((x) => /thu hoi/.test(x.t)) ?? ungVien[ungVien.length - 1]! : ungVien[0]!;
      anhXa[truong] = chon.c;
      daDung.add(chon.c);
    }
    let batDau = r + (ghep ? 2 : 1);
    while (batDau < o.length && laDongDanhSo(o[batDau] ?? [])) batDau++;
    return { dongTieuDe: r, anhXa, batDau };
  }
  return null;
}

/* ============================ Phân loại dòng ============================ */

const LA_MA = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,3})\.?$/i;
function capTheoStt(stt: string): number {
  const s = stt.trim();
  if (!s) return 3;
  if (LA_MA.test(s)) return 2;
  if (/^[A-HJ-UW-Z]\.?$/.test(s)) return 1;
  if (/^\d+\.?$/.test(s)) return 3;
  if (/^\d+(\.\d+)+\.?$/.test(s)) return 3 + s.split(".").filter(Boolean).length - 1;
  if (/^[a-zđ][.)]?$/.test(s)) return 6;
  return 3;
}

function so(v: O): { gt: Decimal | null; loi: string | null } {
  if (v == null || v === "") return { gt: null, loi: null };
  if (typeof v === "number") return { gt: D(v), loi: null };
  const s = v.trim();
  if (!s || /^[-–—]$/.test(s)) return { gt: null, loi: null };
  const r = docSo(s.replace(/%$/, ""));
  return { gt: r.so == null ? null : D(r.so), loi: r.loi };
}

const dongTien = (d: Decimal) => Number(d.toFixed(0)).toLocaleString("vi-VN");
const soVN = (d: Decimal) => Number(d.toString()).toLocaleString("vi-VN", { maximumFractionDigits: 4 });

/* ============================ Đối chiếu danh mục ============================ */

const TU_BO = new Set(["cay", "trong", "cac", "loai", "va", "cua", "tren", "duoi", "den", "tu", "co", "nam", "thang", "nhom", "khac", "the", "khi", "voi", "thu", "hoach", "lan", "cm", "m2", "m3", "m", "so", "dong", "d"]);
const tuKhoa = (s: string) => [...new Set(khongDau(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !TU_BO.has(w)))];
const soTrong = (s: string) => (khongDau(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(",", "."));

function chuanDvt(s: string): string {
  return khongDau(s).replace(/^dong\s*\//, "").replace(/\s+/g, "").replace(/m²|m2/g, "m2").replace(/m³|m3/g, "m3");
}
function dvtHop(a: string, b: string): boolean {
  const x = chuanDvt(a), y = chuanDvt(b);
  if (!x || !y) return true;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

interface MucDanhMuc {
  r: DongDonGia;
  tu: Set<string>;
  so: string[];
}
const boNhoDanhMuc = new WeakMap<DongDonGia[], MucDanhMuc[]>();
function danhMuc(ds: DongDonGia[]): MucDanhMuc[] {
  let m = boNhoDanhMuc.get(ds);
  if (!m) {
    m = ds.map((r) => ({ r, tu: new Set(khongDau(`${r.nhom} ${r.ten}`).split(/[^a-z0-9]+/)), so: soTrong(r.ten) }));
    boNhoDanhMuc.set(ds, m);
  }
  return m;
}

const moTaMuc = (r: DongDonGia) => `${r.nhom ? `${r.nhom.split(/\s*›\s*|\s*>\s*/).slice(-1)[0]} › ` : ""}${r.ten}`;
const canCuMuc = (r: DongDonGia) =>
  `${r.nguon === "QĐ32" ? "QĐ 32/2025/QĐ-UBND" : r.nguon === "PL VIII" ? "Phụ lục VIII QĐ 106/2025/QĐ-UBND" : "Phụ lục V QĐ 106/2025/QĐ-UBND"}, mã ${r.ma}, trang ${r.trang}`;

function kiemDonGia(d: DongPA, ds: DongDonGia[]): void {
  const dg = d.dg!;
  const tu = tuKhoa(d.ten);
  const dm = danhMuc(ds);
  let tot = 0;
  let ungVien: MucDanhMuc[] = [];
  if (tu.length) {
    for (const m of dm) {
      const diem = tu.filter((w) => m.tu.has(w)).length;
      if (diem > tot) {
        tot = diem;
        ungVien = [m];
      } else if (diem === tot && diem > 0) ungVien.push(m);
    }
  }
  // Phải khớp ít nhất một nửa số từ khóa của tên (tránh khớp nhầm theo một từ chung chung)
  if (tot < Math.ceil(tu.length / 2)) ungVien = [];
  const cungDvt = ungVien.filter((m) => dvtHop(d.dvt, m.r.donVi));
  if (cungDvt.length) ungVien = cungDvt;
  const khop = ungVien.filter((m) => D(m.r.donGia).eq(dg));
  if (khop.length) {
    // Ưu tiên mục có kích thước (số) trùng tên dòng
    const soDong = soTrong(d.ten);
    const m = khop.find((x) => soDong.length && soDong.every((s) => x.so.includes(s))) ?? khop[0]!;
    d.phatHien.push({ mucDo: "DUNG", loai: "DON_GIA", noiDung: `Đơn giá ${dongTien(dg)} đ/${m.r.donVi} trùng danh mục: ${moTaMuc(m.r)}`, canCu: canCuMuc(m.r) });
    if (!dvtHop(d.dvt, m.r.donVi)) d.phatHien.push({ mucDo: "CANH_BAO", loai: "DON_GIA", noiDung: `Đơn vị tính "${d.dvt}" khác danh mục "${m.r.donVi}"`, canCu: canCuMuc(m.r) });
    kiemMatDo(d, m.r);
    return;
  }
  if (ungVien.length) {
    const soDong = soTrong(d.ten);
    const goiY = [...ungVien]
      .sort((a, b) => soDong.filter((s) => b.so.includes(s)).length - soDong.filter((s) => a.so.includes(s)).length)
      .slice(0, 3)
      .map((m) => `${moTaMuc(m.r)}: ${dongTien(D(m.r.donGia))} đ/${m.r.donVi} (${m.r.ma})`);
    d.phatHien.push({
      mucDo: "LOI",
      loai: "DON_GIA",
      noiDung: `Đơn giá ${dongTien(dg)} không trùng mức nào của danh mục cho "${d.ten}". Mức gần nhất theo tên: ${goiY.join("; ")}`,
      canCu: "Danh mục đơn giá QĐ 32/2025/QĐ-UBND, Phụ lục V, VIII QĐ 106/2025/QĐ-UBND (bản trích xuất — đối chiếu bản gốc, VM-02)",
    });
    return;
  }
  const cungGia = dm.filter((m) => D(m.r.donGia).eq(dg) && dvtHop(d.dvt, m.r.donVi)).slice(0, 3);
  if (cungGia.length)
    d.phatHien.push({ mucDo: "CANH_BAO", loai: "DON_GIA", noiDung: `Không nhận ra tên "${d.ten}" trong danh mục; đơn giá trùng mục: ${cungGia.map((m) => `${moTaMuc(m.r)} (${m.r.ma})`).join("; ")} — kiểm tra đúng loại tài sản`, canCu: canCuMuc(cungGia[0]!.r) });
  else d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "DON_GIA", noiDung: `Không tìm thấy "${d.ten}" trong danh mục đơn giá đã nạp — kiểm tra thủ công (có thể là đơn giá theo dự toán, chứng thư thẩm định hoặc khoản ngoài danh mục)` });
}

/** Cây trồng: áp tỷ lệ < 100% (phần vượt mật độ) — nhắc kiểm quỹ mật độ; cây không có mật độ trong danh mục thì cần xác nhận (VM-35). */
function kiemMatDo(d: DongPA, r: DongDonGia) {
  if (r.nguon !== "PL VIII" || !d.heSo || d.heSo.gte(1)) return;
  if (r.matDo)
    d.phatHien.push({ mucDo: "THONG_TIN", loai: "DON_GIA", noiDung: `Tính ${soVN(d.heSo.mul(100))}% đơn giá: kiểm tra phần vượt mật độ ${r.matDo.toLocaleString("vi-VN")} cây/ha theo danh mục`, canCu: "Khoản 4 Điều 5 Phụ lục VIII QĐ 106/2025/QĐ-UBND" });
  else
    d.phatHien.push({ mucDo: "CANH_BAO", loai: "DON_GIA", noiDung: `Tính ${soVN(d.heSo.mul(100))}% đơn giá nhưng danh mục không quy định mật độ cho cây này — cần xác nhận cách tính và ghi lý do (VM-35)`, canCu: "Khoản 4 Điều 5 Phụ lục VIII QĐ 106/2025/QĐ-UBND" });
}

/* ============================ Giá đất, hệ số ============================ */

const MA_DAT_NN = ["LUC", "LUK", "HNK", "BHK", "NHK", "CLN", "RSX", "RPH", "RDD", "NTS", "NKH"];
const MA_DAT_O = ["ONT", "ODT"];
function maDatTrong(s: string): string | null {
  const m = s.toUpperCase().match(/\b(LUC|LUK|LUN|HNK|BHK|NHK|CLN|RSX|RPH|RDD|NTS|NKH|ONT|ODT|SKC|TMD|SKK|SKN)\b/);
  return m ? m[1]! : null;
}
function laDongDat(d: DongPA): boolean {
  const t = khongDau(d.ten);
  return !!maDatTrong(d.ten) || (/\bdat\b/.test(t) && !/cay|nha|cong trinh|vat kien truc/.test(t) && /m2|m²/.test(chuanDvt(d.dvt) || "m2"));
}

function giaDatXa(bang: BangGiaDat, xa: string, ma: string | null): { gia: number; nguon: string }[] {
  const nx = khongDau(xa);
  const cungXa = (x: string) => khongDau(x) === nx;
  const kq: { gia: number; nguon: string }[] = [];
  for (const r of bang.dat_nong_nghiep)
    if (cungXa(r.xa) && (!ma || r.loai_dat === ma || (ma === "LUN" && r.loai_dat.startsWith("LU")) || (ma === "BHK" && r.loai_dat === "HNK") || (ma === "NHK" && r.loai_dat === "HNK")))
      kq.push({ gia: r.gia, nguon: `NQ 152/2025/NQ-HĐND, Bảng ${r.bang}, STT ${r.stt}, ${r.xa}, ${r.loai_dat}` });
  if (!ma || MA_DAT_O.includes(ma))
    for (const r of bang.dat_o)
      if (cungXa(r.xa)) r.vt.forEach((g, i) => g != null && kq.push({ gia: g, nguon: `NQ 152/2025/NQ-HĐND, Bảng ${r.bang}, ${r.xa}, STT ${r.stt}, VT${i + 1}: ${r.tuyen}` }));
  if (ma && ["SKC", "TMD"].includes(ma)) {
    for (const r of [...bang.dat_tmdv, ...bang.dat_skc])
      if (cungXa(r.xa) && (ma === "TMD" ? r.loai_dat.includes("TMD") : r.loai_dat.includes("SKC"))) r.vt.forEach((g, i) => g != null && kq.push({ gia: g, nguon: `NQ 152/2025/NQ-HĐND, Bảng ${r.bang}, ${r.xa}, STT ${r.stt}, VT${i + 1}` }));
  }
  if (ma && ["SKK", "SKN"].includes(ma)) for (const r of bang.dat_kcn_ccn) if (cungXa(r.xa)) kq.push({ gia: r.gia, nguon: `NQ 152/2025/NQ-HĐND, Bảng ${r.bang}, ${r.ten}` });
  return kq;
}

/** Bảng giá đất ghi nghìn đồng/m²; tệp phương án thường ghi đồng/m² — nhận cả hai. */
const trungGia = (dg: Decimal, giaNghin: number) => dg.eq(D(giaNghin).mul(1000)) || dg.eq(giaNghin);

function kiemGiaDat(d: DongPA, dl: DuLieuKiemTra): void {
  if (!dl.xa) return void d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "GIA_DAT", noiDung: "Chọn xã/phường nơi có đất thu hồi để đối chiếu giá đất" });
  if (!dl.bangGia) return void d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "GIA_DAT", noiDung: "Chưa nạp bảng giá đất" });
  const ma = maDatTrong(`${d.ten} ${d.dvt}`);
  const ds = giaDatXa(dl.bangGia, dl.xa, ma);
  const k = ds.find((x) => trungGia(d.dg!, x.gia));
  if (k) return void d.phatHien.push({ mucDo: "DUNG", loai: "GIA_DAT", noiDung: `Đơn giá ${dongTien(d.dg!)} đ/m² trùng bảng giá đất`, canCu: k.nguon });
  if (!ds.length) return void d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "GIA_DAT", noiDung: `Không có giá ${ma ?? "loại đất này"} của ${dl.xa} trong bảng giá đất đã nạp — kiểm tra thủ công` });
  const mucDo: MucDo = ma && MA_DAT_NN.includes(ma) ? "LOI" : "CANH_BAO";
  const lietKe = ds.slice(0, 4).map((x) => `${dongTien(D(x.gia).mul(1000))} đ/m² (${x.nguon.replace(/^NQ 152\/2025\/NQ-HĐND, /, "")})`);
  d.phatHien.push({
    mucDo,
    loai: "GIA_DAT",
    noiDung: `Đơn giá ${dongTien(d.dg!)} đ/m² không trùng bảng giá đất của ${dl.xa}${ma ? ` (${ma})` : ""}: ${lietKe.join("; ")}${ds.length > 4 ? "; …" : ""}. Nếu dự án áp dụng hệ số điều chỉnh hoặc giá đất cụ thể thì đối chiếu với quyết định đó`,
    canCu: "NQ 152/2025/NQ-HĐND (bảng giá đất)",
  });
}

function heSoChuyenDoiNghe(cs: BoChinhSach, xa: string): { heSo: string; canCu: string } | null {
  const c = (cs as unknown as { chuyenDoiNghe?: { heSoMacDinh: string; heSoTheoNhom: Record<string, string>; phanNhom: Record<string, string[]>; canCu: { vanBan: string; viTri: string }[] } }).chuyenDoiNghe;
  if (!c) return null;
  const nhom = Object.entries(c.phanNhom).find(([, ds]) => ds.some((x) => khongDau(x) === khongDau(xa)))?.[0];
  return { heSo: (nhom && c.heSoTheoNhom[nhom]) || c.heSoMacDinh, canCu: c.canCu.map((x) => `${x.viTri} ${x.vanBan}`).join("; ") };
}

function kiemChuyenDoiNghe(d: DongPA, dl: DuLieuKiemTra): void {
  if (!dl.xa || !dl.chinhSach) return void d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "HE_SO", noiDung: "Chọn xã/phường để kiểm hệ số hỗ trợ đào tạo, chuyển đổi nghề" });
  const q = heSoChuyenDoiNghe(dl.chinhSach, dl.xa);
  if (!q) return;
  // Hệ số: cột hệ số nếu có; không có thì suy từ Thành tiền / (KL × ĐG)
  let hs = d.heSo;
  if (!hs && d.kl && d.dg && d.tt && !d.kl.mul(d.dg).isZero()) hs = d.tt.div(d.kl.mul(d.dg)).toDecimalPlaces(4);
  if (!hs) return void d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "HE_SO", noiDung: "Không xác định được hệ số hỗ trợ chuyển đổi nghề trên dòng" });
  if (hs.eq(q.heSo)) d.phatHien.push({ mucDo: "DUNG", loai: "HE_SO", noiDung: `Hệ số ${soVN(hs)} lần giá đất nông nghiệp đúng mức áp dụng cho ${dl.xa}`, canCu: q.canCu });
  else d.phatHien.push({ mucDo: "LOI", loai: "HE_SO", noiDung: `Hệ số ${soVN(hs)} khác mức ${q.heSo} lần áp dụng cho ${dl.xa}`, canCu: q.canCu });
  // Đơn giá phải là giá đất nông nghiệp của xã
  if (d.dg && dl.bangGia) {
    const ds = giaDatXa(dl.bangGia, dl.xa, null).filter((x) => /Bảng 0[1-4]/.test(x.nguon));
    const k = ds.find((x) => trungGia(d.dg!, x.gia));
    if (k) d.phatHien.push({ mucDo: "DUNG", loai: "GIA_DAT", noiDung: `Đơn giá ${dongTien(d.dg)} đ/m² trùng giá đất nông nghiệp`, canCu: k.nguon });
    else if (ds.length) d.phatHien.push({ mucDo: "CANH_BAO", loai: "GIA_DAT", noiDung: `Đơn giá ${dongTien(d.dg)} đ/m² không trùng giá đất nông nghiệp nào của ${dl.xa} trong bảng giá đất`, canCu: "NQ 152/2025/NQ-HĐND" });
  }
}

/* ============================ Kiểm tra ============================ */

export function kiemTraBang(trang: TrangBang, dl: DuLieuKiemTra, anhXaTay?: AnhXaCot): KetQuaKiemTra | { loi: string } {
  const nd = nhanDienCot(trang.o);
  if (!nd && !anhXaTay) return { loi: `Trang "${trang.ten}": không tìm thấy dòng tiêu đề có "Đơn giá" và "Thành tiền" trong 40 dòng đầu — chọn cột thủ công` };
  const anhXa: AnhXaCot = { ...(nd?.anhXa ?? {}), ...(anhXaTay ?? {}) };
  if (anhXa.dg == null || anhXa.tt == null) return { loi: "Cần xác định cột Đơn giá và Thành tiền" };
  const batDau = nd?.batDau ?? 0;
  const tieuDeTyLe = nd ? chu(trang.o[nd.dongTieuDe]?.[anhXa.tyLe ?? -1] ?? null) + " " + chu(trang.o[nd.dongTieuDe + 1]?.[anhXa.tyLe ?? -1] ?? null) : "";
  const laPhanTram = /%|ty le|muc huong/.test(tieuDeTyLe);
  const chung: PhatHien[] = [];
  const dong: DongPA[] = [];
  const lay = (d: O[], t: TruongCot) => (anhXa[t] == null ? null : d[anhXa[t]!] ?? null);
  let coCanCu = false;

  for (let r = batDau; r < trang.o.length; r++) {
    const d = trang.o[r] ?? [];
    if (!d.some((x) => x != null && String(x).trim() !== "")) continue;
    const stt = lay(d, "stt") == null ? "" : String(lay(d, "stt")).trim();
    const ten = lay(d, "ten") == null ? "" : String(lay(d, "ten")).trim();
    const dvt = lay(d, "dvt") == null ? "" : String(lay(d, "dvt")).trim();
    const canCu = lay(d, "canCu") == null ? "" : String(lay(d, "canCu")).trim();
    if (canCu) coCanCu = true;
    const phatHien: PhatHien[] = [];
    const docSoO = (t: TruongCot, nhan: string) => {
      const x = so(lay(d, t));
      if (x.loi) phatHien.push({ mucDo: "LOI", loai: "DU_LIEU", noiDung: `${nhan}: ${x.loi}` });
      return x.gt;
    };
    const kl = docSoO("kl", "Khối lượng");
    const dg = docSoO("dg", "Đơn giá");
    const tt = docSoO("tt", "Thành tiền");
    let heSo = docSoO("tyLe", "Tỷ lệ/hệ số");
    if (heSo && (laPhanTram || (typeof lay(d, "tyLe") === "string" && String(lay(d, "tyLe")).includes("%")))) heSo = heSo.div(100);
    if (!ten && !stt && kl == null && dg == null && tt == null) continue;
    const t = chu(ten) || chu(stt);
    let loai: LoaiDong;
    if (/lam tron/.test(t)) loai = "LAM_TRON";
    else if (dg == null && (/^(tong|cong)\b/.test(t) || /^(tong|cong)/.test(chu(stt)))) loai = "TONG";
    else if (dg != null || kl != null) loai = "CHI_TIET";
    else if (tt != null) loai = "NHOM";
    else continue; // dòng ghi chú, tên hộ không có số liệu
    dong.push({ dong: r + 1, viTri: trang.viTri?.[r] ?? String(r + 1), loai, capNhom: capTheoStt(stt), stt, ten, dvt, kl, dg, heSo, tt, canCu, phatHien });
  }

  const chiTiet = dong.filter((x) => x.loai === "CHI_TIET");
  for (const d of chiTiet) kiemDong(d, dl);
  kiemTong(dong);

  if (!chiTiet.length) chung.push({ mucDo: "CANH_BAO", loai: "DU_LIEU", noiDung: "Không nhận ra dòng chi tiết nào (có khối lượng hoặc đơn giá) — kiểm tra lại cột đã chọn" });
  if (anhXa.canCu == null || !coCanCu) chung.push({ mucDo: "THONG_TIN", loai: "DU_LIEU", noiDung: "Bảng không có hoặc để trống cột Căn cứ — nên ghi căn cứ (văn bản, điều khoản) cho từng khoản" });
  if (anhXa.kl == null) chung.push({ mucDo: "CANH_BAO", loai: "DU_LIEU", noiDung: "Không xác định được cột Khối lượng — không kiểm được số học từng dòng" });

  const dem: Record<MucDo, number> = { LOI: 0, CANH_BAO: 0, DUNG: 0, KHONG_KIEM: 0, THONG_TIN: 0 };
  for (const d of dong) for (const p of d.phatHien) dem[p.mucDo]++;
  for (const p of chung) dem[p.mucDo]++;
  return { trang: trang.ten, dongTieuDe: (nd?.dongTieuDe ?? -1) + 1, anhXa, dong, chung, dem };
}

const laChuyenDoiNghe = (ten: string) => /chuyen doi nghe|dao tao.*nghe|tim kiem viec lam/.test(khongDau(ten));

function kiemDong(d: DongPA, dl: DuLieuKiemTra) {
  // Số học
  if (laChuyenDoiNghe(d.ten) && !d.heSo && d.kl != null && d.dg != null && d.tt != null && !d.kl.mul(d.dg).isZero()) {
    // Không có cột hệ số: Thành tiền = hệ số × giá đất NN × DT — hệ số suy ra được kiểm ở mục Hệ số
    d.phatHien.push({ mucDo: "THONG_TIN", loai: "SO_HOC", noiDung: `Thành tiền = ${soVN(d.tt.div(d.kl.mul(d.dg)).toDecimalPlaces(4))} × Khối lượng × Đơn giá (hệ số suy từ thành tiền)` });
  } else if (d.kl != null && d.dg != null && d.tt != null) {
    const hs = d.heSo ?? D(1);
    const du = d.kl.mul(d.dg).mul(hs);
    const lech = d.tt.minus(du).abs();
    if (lech.lte(1)) d.phatHien.push({ mucDo: "DUNG", loai: "SO_HOC", noiDung: "Thành tiền = Khối lượng × Đơn giá" + (d.heSo ? " × Tỷ lệ/hệ số" : "") });
    else if (lech.lt(1000) && d.tt.mod(1000).isZero())
      d.phatHien.push({ mucDo: "CANH_BAO", loai: "SO_HOC", noiDung: `Thành tiền ${dongTien(d.tt)} là số làm tròn của ${dongTien(du)} — làm tròn ở từng dòng làm tổng lệch; cách làm tròn do dự án chọn (VM-36)` });
    else {
      const ngam = d.kl.mul(d.dg).isZero() ? null : d.tt.div(d.kl.mul(d.dg));
      const goiY = !d.heSo && ngam && ngam.lt(1) && ngam.gt(0) ? ` — tương ứng tỷ lệ ${soVN(ngam.mul(100).toDecimalPlaces(2))}% nhưng bảng không có cột tỷ lệ` : "";
      d.phatHien.push({ mucDo: "LOI", loai: "SO_HOC", noiDung: `Thành tiền ${dongTien(d.tt)} ≠ ${soVN(d.kl)} × ${dongTien(d.dg)}${d.heSo ? ` × ${soVN(d.heSo)}` : ""} = ${dongTien(du)} (chênh ${dongTien(d.tt.minus(du))} đ)${goiY}` });
    }
  } else if (d.tt == null) d.phatHien.push({ mucDo: "CANH_BAO", loai: "DU_LIEU", noiDung: "Dòng có khối lượng/đơn giá nhưng không có thành tiền" });
  else if (d.kl == null) d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "SO_HOC", noiDung: "Thiếu khối lượng — không kiểm được số học" });
  if (d.kl?.isNeg() || d.dg?.isNeg() || d.tt?.isNeg()) d.phatHien.push({ mucDo: "LOI", loai: "DU_LIEU", noiDung: "Có số âm" });

  if (d.dg == null || d.dg.isZero()) return;
  const t = khongDau(d.ten);
  if (laChuyenDoiNghe(d.ten)) kiemChuyenDoiNghe(d, dl);
  else if (laDongDat(d)) kiemGiaDat(d, dl);
  else if (/ho tro|thuong|on dinh doi song|tam cu|tai dinh cu|di chuyen|thue nha/.test(t) && !/cay|vat nuoi/.test(t))
    d.phatHien.push({ mucDo: "KHONG_KIEM", loai: "DON_GIA", noiDung: "Khoản hỗ trợ tính theo mức/điều kiện riêng — phần mềm chỉ kiểm số học; đối chiếu mức hỗ trợ trong bộ chính sách (QĐ 106/2025, QĐ 14/2026) ở màn Tra cứu" });
  else kiemDonGia(d, dl.donGia);
}

/** Dòng nhóm: bằng cộng các dòng chi tiết bên dưới đến nhóm cùng cấp kế tiếp; dòng Cộng/Tổng cộng: bằng cộng chi tiết từ dòng tổng trước. */
function kiemTong(dong: DongPA[]) {
  const soSanh = (d: DongPA, tong: Decimal, moTa: string) => {
    if (!d.tt) return;
    const lech = d.tt.minus(tong).abs();
    if (lech.lte(1)) d.phatHien.push({ mucDo: "DUNG", loai: "TONG", noiDung: `Bằng ${moTa}` });
    else if (lech.lt(1000) && d.tt.mod(1000).isZero()) d.phatHien.push({ mucDo: "CANH_BAO", loai: "TONG", noiDung: `${dongTien(d.tt)} là số làm tròn của ${moTa} = ${dongTien(tong)} (VM-36)` });
    else d.phatHien.push({ mucDo: "LOI", loai: "TONG", noiDung: `${dongTien(d.tt)} ≠ ${moTa} = ${dongTien(tong)} (chênh ${dongTien(d.tt.minus(tong))} đ). Phần mềm nhận nhóm theo STT — nếu bảng trình bày khác, kiểm tra lại` });
  };
  let moc = 0;
  dong.forEach((d, i) => {
    if (d.loai === "NHOM") {
      let tong = D(0), co = false;
      for (let j = i + 1; j < dong.length; j++) {
        const x = dong[j]!;
        if (x.loai === "TONG" || x.loai === "LAM_TRON" || (x.loai === "NHOM" && x.capNhom <= d.capNhom)) break;
        if (x.loai === "CHI_TIET" && x.tt) { tong = tong.plus(x.tt); co = true; }
      }
      if (co) soSanh(d, tong, "cộng các dòng chi tiết trong nhóm");
    } else if (d.loai === "TONG") {
      const tongCong = /tong cong/.test(chu(d.ten) || chu(d.stt));
      const tu = tongCong ? 0 : moc;
      let tong = D(0);
      for (let j = tu; j < i; j++) if (dong[j]!.loai === "CHI_TIET" && dong[j]!.tt) tong = tong.plus(dong[j]!.tt!);
      soSanh(d, tong, tongCong ? "cộng tất cả dòng chi tiết phía trên" : "cộng các dòng chi tiết từ dòng tổng trước");
      moc = i + 1;
    } else if (d.loai === "LAM_TRON") {
      const truoc = [...dong.slice(0, i)].reverse().find((x) => x.loai === "TONG" || x.loai === "NHOM");
      if (truoc?.tt && d.tt && truoc.tt.minus(d.tt).abs().gte(1000)) d.phatHien.push({ mucDo: "LOI", loai: "TONG", noiDung: `Số làm tròn ${dongTien(d.tt)} lệch ${dongTien(truoc.tt.minus(d.tt))} đ so với dòng tổng ${dongTien(truoc.tt)}` });
      else if (truoc?.tt && d.tt) d.phatHien.push({ mucDo: "THONG_TIN", loai: "TONG", noiDung: `Làm tròn từ ${dongTien(truoc.tt)} — đối chiếu cách làm tròn của dự án (VM-36); số ở Tờ trình, Quyết định phải thống nhất với số này` });
    }
  });
}

/** Chọn trang có nhiều dòng chi tiết nhất (phụ lục chi tiết). */
export function chonTrang(ds: TrangBang[]): number {
  let tot = -1, chon = 0;
  ds.forEach((t, i) => {
    const nd = nhanDienCot(t.o);
    if (!nd) return;
    const n = t.o.slice(nd.batDau).filter((d) => d.some((x) => typeof x === "number")).length;
    if (n > tot) { tot = n; chon = i; }
  });
  return chon;
}

/* ============================ Xuất báo cáo ============================ */

export async function xuatBaoCaoKiemTra(kq: KetQuaKiemTra, tenTep: string, xa: string | undefined): Promise<Uint8Array> {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Kết quả kiểm tra");
  ws.addRow(["BÁO CÁO KIỂM TRA PHƯƠNG ÁN BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ"]).font = { bold: true, size: 13 };
  ws.addRow([`Tệp: ${tenTep} · Trang: ${kq.trang} · Xã/phường: ${xa || "(chưa chọn)"} · Kiểm lúc: ${new Date().toLocaleString("vi-VN")}`]);
  ws.addRow([`Lỗi: ${kq.dem.LOI} · Cảnh báo: ${kq.dem.CANH_BAO} · Đúng: ${kq.dem.DUNG} · Không kiểm được: ${kq.dem.KHONG_KIEM} · Lưu ý: ${kq.dem.THONG_TIN}`]);
  ws.addRow(["Kết quả do phần mềm đối chiếu với dữ liệu đơn giá, giá đất đã trích xuất; cán bộ có thẩm quyền kiểm tra lại trước khi kết luận."]).font = { italic: true };
  for (const p of kq.chung) ws.addRow([`${TEN_MUC_DO[p.mucDo]}: ${p.noiDung}`]);
  ws.addRow([]);
  const dau = ws.addRow(["Vị trí (dòng)", "STT", "Nội dung", "ĐVT", "Khối lượng", "Đơn giá", "Tỷ lệ/hệ số", "Thành tiền", "Mức", "Loại kiểm", "Kết quả", "Nguồn đối chiếu"]);
  dau.font = { bold: true };
  const MAU: Partial<Record<MucDo, string>> = { LOI: "FFFDE2E1", CANH_BAO: "FFFFF4D6", KHONG_KIEM: "FFEFEFEF" };
  for (const d of kq.dong) {
    const ds = d.phatHien.length ? d.phatHien : [{ mucDo: "THONG_TIN" as MucDo, loai: "DU_LIEU" as LoaiKiem, noiDung: d.loai === "NHOM" ? "Dòng nhóm" : "" }];
    for (const p of ds) {
      const r = ws.addRow([d.viTri, d.stt, d.ten, d.dvt, d.kl ? Number(d.kl.toString()) : null, d.dg ? Number(d.dg.toString()) : null, d.heSo ? Number(d.heSo.toString()) : null, d.tt ? Number(d.tt.toString()) : null, TEN_MUC_DO[p.mucDo], TEN_LOAI_KIEM[p.loai], p.noiDung, p.canCu ?? ""]);
      const mau = MAU[p.mucDo];
      if (mau) r.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: mau } };
    }
  }
  [10, 8, 40, 8, 12, 14, 10, 16, 12, 11, 70, 45].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (const c of [5, 6, 8]) ws.getColumn(c).numFmt = "#,##0.##";
  ws.getColumn(11).alignment = { wrapText: true, vertical: "top" };
  ws.getColumn(12).alignment = { wrapText: true, vertical: "top" };
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
