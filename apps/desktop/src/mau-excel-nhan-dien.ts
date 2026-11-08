/**
 * 1.3.5 — Nhận diện tệp Excel phương án SẴN CÓ của xã/phường (không có trường {{…}}) và chuyển thành biểu mẫu có trường để
 * phần mềm điền theo đúng bố cục, định dạng của xã (mau-excel.ts). Không đoán số liệu — chỉ đánh dấu chỗ điền:
 *  - Trang chi tiết của hộ: dòng tiêu đề có "Đơn giá" và "Thành tiền" (cùng bộ nhận diện cột của Kiểm tra phương án) → dòng
 *    dữ liệu đầu thành dòng lặp {{#dong}} (STT, nội dung, ĐVT, khối lượng, hệ số/tỷ lệ, đơn giá, thành tiền, căn cứ), các dòng dữ
 *    liệu còn lại bị xóa; dòng Tổng cộng / Làm tròn / Khấu trừ / Thực nhận gán trường tổng của hộ; ô "Họ và tên:", "Địa chỉ:",
 *    "Mã hồ sơ:", "Số CCCD:" … gán trường của hộ; trang được nhân thành một trang cho mỗi hộ ("{{stt}}. {{ten}}").
 *  - Trang tổng hợp (mỗi hộ một dòng): dòng tiêu đề có "Họ và tên/chủ sử dụng" và cột tiền → dòng lặp {{#ho}}; dòng Tổng cộng
 *    gán tổng của dự án.
 *  - Ô "Dự án/Công trình:" → {{ten_du_an}}.
 * Tệp đã có trường {{…}} giữ nguyên. Không nhận ra bảng nào → báo lỗi (cán bộ dùng mẫu có trường).
 */
import type ExcelJS from "exceljs";
import { nhanDienCot, type AnhXaCot, type O } from "./kiem-tra-pa";
import { khongDau } from "./tim-kiem";

const chu = (v: O) => (v == null ? "" : khongDau(String(v)).replace(/\s+/g, " ").trim());

function chuO(v: ExcelJS.CellValue): O {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return chuO(v.result as ExcelJS.CellValue);
    if ("formula" in v) return 0; // công thức chưa tính: coi như ô số
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
  }
  return null;
}

function maTran(ws: ExcelJS.Worksheet): O[][] {
  const o: O[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, r) => {
    const d: O[] = [];
    row.eachCell({ includeEmpty: true }, (c, col) => {
      d[col - 1] = c.isMerged && c.master.address !== c.address ? null : chuO(c.value);
    });
    o[r - 1] = d;
  });
  for (let i = 0; i < o.length; i++) o[i] ??= [];
  return o;
}

const coTruong = (wb: ExcelJS.Workbook) => {
  let co = false;
  wb.eachSheet((ws) => {
    if (/\{\{/.test(ws.name)) co = true;
    ws.eachRow((row) => row.eachCell((c) => { const v = chuO(c.value); if (typeof v === "string" && v.includes("{{")) co = true; }));
  });
  return co;
};

/** Trường của dòng chi tiết theo cột nhận diện. */
const TRUONG_DONG: [keyof AnhXaCot, string][] = [["stt", "stt"], ["ten", "noi_dung"], ["dvt", "dvt"], ["kl", "khoi_luong"], ["tyLe", "he_so"], ["dg", "don_gia"], ["tt", "thanh_tien"], ["canCu", "can_cu"]];

/** Nhãn thông tin hộ (ô "Nhãn: giá trị" hoặc ô nhãn rồi ô giá trị bên phải) → trường của trang hộ. */
const NHAN_HO: [RegExp, string][] = [
  [/^(ho va ten|ho ten|ho ten chu ho|ten chu ho|chu ho|chu su dung|ten chu su dung|nguoi su dung dat|ten to chuc|ho ong ba|ong ba)\b/, "ten"],
  [/^(dia chi|noi o|thuong tru|dia chi thuong tru)\b/, "dia_chi"],
  [/^(ma ho so|ma ho|ma so ho)\b/, "ma"],
  [/^(so cccd|cccd|so dinh danh|so can cuoc|cmnd|so cmnd)\b/, "so_dinh_danh"],
  [/^(so nhan khau|nhan khau)\b/, "so_nhan_khau"],
  [/^(dien tich thu hoi|tong dien tich thu hoi)\b/, "dt_thu_hoi"],
];
const NHAN_CHUNG: [RegExp, string][] = [[/^(du an|cong trinh|ten du an|ten cong trinh)\b/, "ten_du_an"]];

/** Dòng tổng của trang hộ (tìm theo chữ trong dòng) → trường. */
const TONG_HO: [RegExp, string][] = [
  [/lam tron/, "tong_lam_tron"],
  [/khau tru|nghia vu tai chinh/, "khau_tru"],
  [/thuc nhan|con lai|so tien duoc nhan|thuc linh/, "con_lai"],
  [/^tong cong|tong gia tri|tong so tien|cong \(a ?\+ ?b\)|a ?\+ ?b/, "tong_chua_lam_tron"],
];
/** Không có dòng tổng rõ nghĩa ở trên → "Cộng" / "Tổng" đứng đầu dòng (dòng cộng từng mục giữa bảng không dùng khi có dòng tổng rõ). */
const TONG_HO_YEU: [RegExp, string][] = [[/^cong\b|^tong\b/, "tong_chua_lam_tron"]];
const TONG_DU_AN: [RegExp, string][] = [[/lam tron/, "tong_lam_tron"], [/^tong cong|^cong\b|^tong\b/, "tong_lam_tron"]];

/** Cột của bảng tổng hợp mỗi hộ một dòng. */
const COT_HO: [string, RegExp, RegExp?][] = [
  ["stt", /^(stt|tt|so tt)$/],
  ["ten", /ho va ten|ho ten|chu su dung|ten chu|ten to chuc|ten ho/],
  ["dia_chi", /dia chi|noi o/],
  ["ma", /^ma (ho|ho so)|^ma$/],
  ["dt_thu_hoi", /dien tich thu hoi|dt thu hoi|dien tich/],
  ["tong_boi_thuong", /boi thuong/, /ho tro/],
  ["tong_ho_tro", /ho tro/, /boi thuong/],
  ["tong_lam_tron", /tong cong|tong gia tri|tong so tien|tong tien|thanh tien|^tong$|so tien/],
  ["ghi_chu", /ghi chu/],
];

export interface KetQuaNhanDien {
  bytes: Uint8Array;
  /** Mô tả từng trang đã nhận (để cán bộ đối chiếu). */
  moTa: string[];
  /** Tệp đã có trường {{…}} → dùng nguyên. */
  daCoTruong: boolean;
}

export async function nhanDienMauCoSan(bytes: Uint8Array): Promise<KetQuaNhanDien> {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  if (coTruong(wb)) return { bytes, moTa: ["Tệp đã có trường {{…}} — dùng nguyên mẫu."], daCoTruong: true };
  const moTa: string[] = [];
  const dsTrang: ExcelJS.Worksheet[] = [];
  wb.eachSheet((ws) => dsTrang.push(ws));
  let daCoTrangHo = false;
  for (const ws of dsTrang) {
    const o = maTran(ws);
    const chiTiet = nhanDienCot(o);
    if (chiTiet && chiTiet.anhXa.tt !== undefined && chiTiet.anhXa.dg !== undefined) {
      // tệp của xã có thể đã có sẵn mỗi hộ một trang chi tiết: lấy trang đầu làm mẫu, bỏ các trang chi tiết còn lại
      if (daCoTrangHo) {
        moTa.push(`Trang “${ws.name}”: bảng chi tiết của hộ khác — bỏ (dùng trang chi tiết đầu tiên làm mẫu).`);
        wb.removeWorksheet(ws.id);
        continue;
      }
      daCoTrangHo = true;
      moTa.push(datTrangHo(ws, o, chiTiet));
      continue;
    }
    const th = nhanDienTongHop(o);
    if (th) moTa.push(datTrangTongHop(ws, o, th));
  }
  if (!moTa.some((m) => !m.includes("— bỏ"))) throw new Error("Không nhận ra bảng phương án trong tệp (cần dòng tiêu đề có “Đơn giá”, “Thành tiền” — trang chi tiết hộ; hoặc “Họ và tên” và cột số tiền — trang tổng hợp). Dùng mẫu có trường {{…}}.");
  return { bytes: new Uint8Array(await wb.xlsx.writeBuffer()), moTa, daCoTruong: false };
}

/** Dòng tổng gần nhất phía dưới dòng dữ liệu đầu: chữ trong 3 ô đầu khớp mẫu tổng. */
function dongTong(o: O[][], tu: number, mau: [RegExp, string][]): Map<number, string> {
  const kq = new Map<number, string>();
  for (let r = tu; r < o.length; r++) {
    const d = o[r] ?? [];
    const chuDong = d.slice(0, 4).map((x) => (typeof x === "string" ? chu(x) : "")).filter(Boolean).join(" ");
    const m = mau.find(([re]) => re.test(chuDong));
    if (m && ![...kq.values()].includes(m[1])) kq.set(r, m[1]);
  }
  return kq;
}

function ghiTruongNhan(ws: ExcelJS.Worksheet, o: O[][], denDong: number, nhan: [RegExp, string][], daGan: string[]) {
  for (let r = 0; r < denDong; r++) {
    const d = o[r] ?? [];
    for (let c = 0; c < d.length; c++) {
      const v = d[c];
      if (typeof v !== "string" || !v.trim()) continue;
      const tho = v.trim();
      const tron = chu(tho);
      for (const [re, truong] of nhan) {
        const m = re.exec(tron);
        if (!m || daGan.includes(truong)) continue;
        const iHai = tho.search(/[:：]/);
        const o_ = ws.getCell(r + 1, c + 1);
        if (iHai >= 0 && iHai < tho.length - 1 && tho.slice(iHai + 1).trim()) {
          // "Họ và tên: Nguyễn Văn A" → "Họ và tên: {{ten}}"
          o_.value = `${tho.slice(0, iHai + 1)} {{${truong}}}`;
          daGan.push(truong);
        } else if (iHai >= 0 || tron.length <= 30) {
          // ô nhãn; giá trị ở ô có nội dung kế bên phải (hoặc ô trống kế bên)
          let c2 = c + 1;
          while (c2 < d.length && (d[c2] == null || String(d[c2]).trim() === "") && c2 < c + 4) c2++;
          const dich = c2 < d.length && d[c2] != null && String(d[c2]).trim() !== "" ? c2 : c + 1;
          if (iHai < 0 && dich === c + 1 && (d[c + 1] == null || String(d[c + 1]).trim() === "") && !/[:：]/.test(tho)) break;
          ws.getCell(r + 1, dich + 1).value = `{{${truong}}}`;
          daGan.push(truong);
        }
        break;
      }
    }
  }
}

function datTrangHo(ws: ExcelJS.Worksheet, o: O[][], nd: { dongTieuDe: number; anhXa: AnhXaCot; batDau: number }): string {
  const r0 = nd.batDau; // 0-based
  let tong = dongTong(o, r0 + 1, TONG_HO);
  if (!tong.size) tong = dongTong(o, r0 + 1, TONG_HO_YEU);
  const dauTong = tong.size ? Math.min(...tong.keys()) : null;
  // các dòng dữ liệu cũ: từ r0 + 1 đến trước dòng tổng đầu tiên (không có dòng tổng: tới dòng cuối có số ở cột thành tiền)
  let cuoi = dauTong !== null ? dauTong - 1 : r0;
  if (dauTong === null) for (let r = r0 + 1; r < o.length; r++) if (typeof o[r]?.[nd.anhXa.tt!] === "number") cuoi = r;
  // dòng lặp: ghi trường theo cột; ô đầu tiên có nội dung bắt đầu bằng {{#dong}}
  const cot = TRUONG_DONG.filter(([k]) => nd.anhXa[k] !== undefined).map(([k, t]) => ({ c: nd.anhXa[k]!, t })).sort((a, b) => a.c - b.c);
  const hang = ws.getRow(r0 + 1);
  hang.eachCell({ includeEmpty: true }, (c) => { if (!c.isMerged || c.master.address === c.address) c.value = null; });
  cot.forEach(({ c, t }, i) => { hang.getCell(c + 1).value = `${i === 0 ? "{{#dong}}" : ""}{{${t}}}`; });
  const soXoa = cuoi - r0;
  if (soXoa > 0) ws.spliceRows(r0 + 2, soXoa);
  // dòng tổng (sau khi xóa, dời lên soXoa dòng): cột thành tiền
  const tt = nd.anhXa.tt!;
  for (const [r, truong] of tong) ws.getCell(r - Math.max(0, soXoa) + 1, tt + 1).value = `{{${truong}}}`;
  // thông tin hộ phía trên tiêu đề (và phía dưới bảng: tên ký)
  const daGan: string[] = [];
  ghiTruongNhan(ws, o, nd.dongTieuDe, [...NHAN_HO, ...NHAN_CHUNG], daGan);
  const tenCu = ws.name;
  ws.name = "{{stt}}. {{ten}}";
  return `Trang “${tenCu}”: bảng chi tiết của hộ (tiêu đề dòng ${nd.dongTieuDe + 1}; cột ${cot.map((x) => `${x.t}`).join(", ")}) — mỗi hộ một trang; ${tong.size ? `dòng tổng: ${[...tong.values()].join(", ")}` : "không thấy dòng tổng"}${daGan.length ? `; thông tin: ${daGan.join(", ")}` : ""}.`;
}

function nhanDienTongHop(o: O[][]): { dongTieuDe: number; cot: Map<string, number>; batDau: number } | null {
  for (let r = 0; r < Math.min(o.length, 40); r++) {
    const d = o[r] ?? [];
    const duoi = o[r + 1] ?? [];
    const soCot = Math.max(d.length, duoi.length);
    const ghep = duoi.some((x) => typeof x === "string" && x.trim()) && !duoi.some((x) => typeof x === "number");
    const tieuDe = Array.from({ length: soCot }, (_, c) => [chu(d[c] ?? null), ghep ? chu(duoi[c] ?? null) : ""].filter(Boolean).join(" "));
    const cot = new Map<string, number>();
    for (const [t, re, tru] of COT_HO) {
      const c = tieuDe.findIndex((x, i) => x && re.test(x) && !(tru && tru.test(x)) && ![...cot.values()].includes(i));
      if (c >= 0) cot.set(t, c);
    }
    if (!cot.has("ten") || !(cot.has("tong_lam_tron") || cot.has("tong_boi_thuong") || cot.has("tong_ho_tro"))) continue;
    let batDau = r + (ghep ? 2 : 1);
    while (batDau < o.length && (o[batDau] ?? []).filter((x) => x != null && String(x).trim()).every((x) => /^\(?\d{1,2}\)?$/.test(String(x).trim())) && (o[batDau] ?? []).some((x) => x != null)) batDau++;
    return { dongTieuDe: r, cot, batDau };
  }
  return null;
}

function datTrangTongHop(ws: ExcelJS.Worksheet, o: O[][], th: { dongTieuDe: number; cot: Map<string, number>; batDau: number }): string {
  const r0 = th.batDau;
  const tong = dongTong(o, r0 + 1, TONG_DU_AN);
  const dauTong = tong.size ? Math.min(...tong.keys()) : null;
  let cuoi = dauTong !== null ? dauTong - 1 : r0;
  const cTien = th.cot.get("tong_lam_tron") ?? th.cot.get("tong_boi_thuong")!;
  if (dauTong === null) for (let r = r0 + 1; r < o.length; r++) if (typeof o[r]?.[cTien] === "number") cuoi = r;
  const cot = [...th.cot].map(([t, c]) => ({ c, t })).sort((a, b) => a.c - b.c);
  const hang = ws.getRow(r0 + 1);
  hang.eachCell({ includeEmpty: true }, (c) => { if (!c.isMerged || c.master.address === c.address) c.value = null; });
  cot.forEach(({ c, t }, i) => { hang.getCell(c + 1).value = `${i === 0 ? "{{#ho}}" : ""}{{${t}}}`; });
  const soXoa = cuoi - r0;
  if (soXoa > 0) ws.spliceRows(r0 + 2, soXoa);
  const truongTong: Record<string, string> = { tong_lam_tron: "tong_lam_tron", tong_boi_thuong: "tong_boi_thuong", tong_ho_tro: "tong_ho_tro", dt_thu_hoi: "tong_dt_thu_hoi" };
  for (const [r] of tong) for (const [t, c] of th.cot) if (truongTong[t] && typeof o[r]?.[c] === "number") ws.getCell(r - Math.max(0, soXoa) + 1, c + 1).value = `{{${truongTong[t]}}}`;
  const daGan: string[] = [];
  ghiTruongNhan(ws, o, th.dongTieuDe, NHAN_CHUNG, daGan);
  return `Trang “${ws.name}”: bảng tổng hợp mỗi hộ một dòng (tiêu đề dòng ${th.dongTieuDe + 1}; cột ${cot.map((x) => x.t).join(", ")})${tong.size ? "; dòng tổng cộng" : ""}.`;
}
