/**
 * Lý trình (Km) của thửa đất trên tuyến — 1.0.4, không bắt buộc. Dùng cho dự án tuyến (đường, đường dây, kênh) để biết
 * mặt bằng sạch theo đoạn (phục vụ thi công cuốn chiếu). Lưu theo mét tính từ điểm đầu tuyến (Km0+000).
 *
 * Cách viết nhận được: "Km12+350", "km 12 + 350,5", "12+350", "12350" (mét), đoạn "Km12+350 – Km12+480" / "12+350-12+480"
 * / "12+350 đến 12+480". Phần sau dấu + là mét (0–999,…); cách viết khác thì báo lỗi, không đoán.
 */
import type { Ho } from "./mo-hinh";

export interface LyTrinh {
  /** Mét tính từ đầu tuyến */
  tu: number;
  den?: number;
}

const DIEM = /^\s*(?:km\s*)?(\d{1,4})\s*\+\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*$/i;
const MET = /^\s*(\d{1,7}(?:[.,]\d{1,2})?)\s*m?\s*$/i;

/** Một điểm lý trình → mét; null nếu không đọc được. */
export function docDiem(s: string): number | null {
  const a = DIEM.exec(s);
  if (a) {
    const m = Number(a[2]!.replace(",", "."));
    return m < 1000 ? Number(a[1]) * 1000 + m : null;
  }
  const b = MET.exec(s);
  return b ? Number(b[1]!.replace(",", ".")) : null;
}

/** Chữ nhập → lý trình (trống = không ghi). Lỗi trả { loi }. */
export function docLyTrinh(s: string): { ly: LyTrinh | null } | { loi: string } {
  const c = s.trim();
  if (!c) return { ly: null };
  const phan = c.split(/\s*(?:–|—|→|\s-\s|-(?=\s*(?:km)?\s*\d+\s*\+)|\s(?:đến|den)\s|~)\s*/i).filter(Boolean);
  if (phan.length > 2) return { loi: `"${c}": chỉ ghi một điểm hoặc một đoạn (từ – đến)` };
  const tu = docDiem(phan[0]!);
  if (tu === null) return { loi: `"${phan[0]}" không phải lý trình (vd. Km12+350)` };
  if (phan.length === 1) return { ly: { tu } };
  const den = docDiem(phan[1]!);
  if (den === null) return { loi: `"${phan[1]}" không phải lý trình (vd. Km12+480)` };
  return { ly: den >= tu ? { tu, den } : { tu: den, den: tu } };
}

/** Mét → "Km12+350" (phần lẻ dấu phẩy). */
export function hienDiem(m: number): string {
  const km = Math.floor(m / 1000);
  const du = Math.round((m - km * 1000) * 100) / 100;
  const [nguyen, le] = String(du).split(".");
  return `Km${km}+${nguyen!.padStart(3, "0")}${le ? `,${le}` : ""}`;
}
export const hienLyTrinh = (l: LyTrinh | null | undefined) => (!l ? "" : l.den !== undefined && l.den !== l.tu ? `${hienDiem(l.tu)} – ${hienDiem(l.den)}` : hienDiem(l.tu));

export interface DoanLyTrinh {
  hoId: string;
  ma: string;
  ten: string;
  thuaId: string;
  soTo: string;
  soThua: string;
  ly: LyTrinh;
  daBanGiao: boolean;
}

/** Các thửa có ghi lý trình, theo thứ tự Km. */
export function dsDoan(hos: Ho[], daBanGiao: (h: Ho) => boolean): DoanLyTrinh[] {
  const out: DoanLyTrinh[] = [];
  for (const h of hos)
    for (const t of h.thua) if (t.lyTrinh) out.push({ hoId: h.id, ma: h.ma, ten: h.ten, thuaId: t.id, soTo: t.soTo, soThua: t.soThua, ly: t.lyTrinh, daBanGiao: daBanGiao(h) });
  return out.sort((a, b) => a.ly.tu - b.ly.tu || (a.ly.den ?? a.ly.tu) - (b.ly.den ?? b.ly.tu));
}

/** Hợp các đoạn [tu, den] (bỏ điểm đơn) → các khoảng rời nhau. */
export function hopDoan(ds: LyTrinh[]): [number, number][] {
  const k = ds.filter((x) => x.den !== undefined && x.den > x.tu).map((x) => [x.tu, x.den!] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of k) {
    const cuoi = out[out.length - 1];
    if (cuoi && a <= cuoi[1]) cuoi[1] = Math.max(cuoi[1], b);
    else out.push([a, b]);
  }
  return out;
}
const dai = (ds: [number, number][]) => ds.reduce((s, [a, b]) => s + (b - a), 0);

/**
 * Mặt bằng theo lý trình: chiều dài có ghi lý trình (hợp các đoạn), chiều dài sạch = phần chỉ có thửa đã bàn giao
 * (trừ chỗ chồng lên thửa chưa bàn giao), các khoảng còn vướng.
 */
export function matBangTheoLyTrinh(ds: DoanLyTrinh[]) {
  const tatCa = hopDoan(ds.map((x) => x.ly));
  const chua = hopDoan(ds.filter((x) => !x.daBanGiao).map((x) => x.ly));
  const sach: [number, number][] = [];
  for (const [a, b] of hopDoan(ds.filter((x) => x.daBanGiao).map((x) => x.ly))) {
    let dau = a;
    for (const [c, d] of chua) {
      if (d <= dau || c >= b) continue;
      if (c > dau) sach.push([dau, c]);
      dau = Math.max(dau, d);
    }
    if (dau < b) sach.push([dau, b]);
  }
  return { tongM: dai(tatCa), sachM: dai(sach), sach, chua, soThuaDiem: ds.filter((x) => x.ly.den === undefined || x.ly.den === x.ly.tu).length };
}

/** Excel "Mặt bằng theo lý trình": bảng thửa theo Km, các đoạn sạch / còn vướng. */
/** Một dòng đoạn Km cho trang "Theo doan Km" (từ dongTheoDoan, bao-cao.ts). */
export interface DongDoanExcel {
  ten: string;
  soHo: number;
  banGiao: number;
  dtThuHoi: string;
  tamTinh: string;
  daDuyet: string;
  mCoGhi?: number;
  mSach?: number;
}

export async function excelLyTrinh(tenDuAn: string, ds: DoanLyTrinh[], dtThuHoi: (d: DoanLyTrinh) => string, doan: DongDoanExcel[] = []): Promise<Uint8Array> {
  const { default: Excel } = await import("exceljs");
  const mb = matBangTheoLyTrinh(ds);
  const wb = new Excel.Workbook();
  const ws = wb.addWorksheet("Ly trinh", { views: [{ state: "frozen", ySplit: 4 }], pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 6 }, { width: 28 }, { width: 10 }, { width: 28 }, { width: 8 }, { width: 8 }, { width: 14 }, { width: 22 }];
  const vien = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `MẶT BẰNG THEO LÝ TRÌNH — ${tenDuAn.toUpperCase()}`;
  ws.getCell("A1").font = { bold: true, size: 13 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Chiều dài có ghi lý trình: ${(mb.tongM / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} km; mặt bằng sạch: ${(mb.sachM / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} km. Đoạn còn vướng: ${mb.chua.map(([a, b]) => `${hienDiem(a)} – ${hienDiem(b)}`).join("; ") || "không"}.`;
  ws.getCell("A2").alignment = { wrapText: true };
  ws.getRow(2).height = 32;
  const dau = ws.getRow(4);
  dau.values = ["STT", "Lý trình", "Mã hộ", "Họ và tên", "Tờ", "Thửa", "DT thu hồi (m²)", "Tình trạng"];
  dau.eachCell((c) => { c.font = { bold: true }; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = vien; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF6" } }; });
  ds.forEach((d, i) => {
    const r = ws.addRow([i + 1, hienLyTrinh(d.ly), d.ma, d.ten, d.soTo, d.soThua, Number(dtThuHoi(d)) || null, d.daBanGiao ? "Đã bàn giao" : "Chưa bàn giao"]);
    r.eachCell({ includeEmpty: true }, (c) => { c.border = vien; });
    r.getCell(7).numFmt = "#,##0.0";
    if (!d.daBanGiao) r.getCell(8).font = { color: { argb: "FFB03A2E" } };
  });
  if (doan.length) {
    const w2 = wb.addWorksheet("Theo doan Km", { views: [{ state: "frozen", ySplit: 3 }], pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    w2.columns = [{ width: 6 }, { width: 28 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 18 }];
    w2.mergeCells("A1:I1");
    w2.getCell("A1").value = `TIẾN ĐỘ GPMB THEO ĐOẠN TUYẾN — ${tenDuAn.toUpperCase()}`;
    w2.getCell("A1").font = { bold: true, size: 13 };
    w2.getCell("A1").alignment = { horizontal: "center" };
    const h = w2.getRow(3);
    h.values = ["STT", "Đoạn", "Số hộ", "Đã bàn giao", "Có ghi lý trình (km)", "Mặt bằng sạch (km)", "DT thu hồi (m²)", "Tạm tính (đ)", "Đã duyệt (đ)"];
    h.eachCell((c) => { c.font = { bold: true }; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = vien; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF6" } }; });
    h.height = 32;
    doan.forEach((d, i) => {
      const r = w2.addRow([i + 1, d.ten, d.soHo, d.banGiao, d.mCoGhi !== undefined ? d.mCoGhi / 1000 : null, d.mSach !== undefined ? d.mSach / 1000 : null, Number(d.dtThuHoi) || 0, Number(d.tamTinh) || 0, Number(d.daDuyet) || 0]);
      r.eachCell({ includeEmpty: true }, (c) => { c.border = vien; });
      r.getCell(5).numFmt = r.getCell(6).numFmt = "#,##0.000";
      r.getCell(7).numFmt = "#,##0.0";
      r.getCell(8).numFmt = r.getCell(9).numFmt = "#,##0";
    });
    const n = w2.rowCount + 2;
    w2.mergeCells(n, 1, n, 9);
    w2.getCell(n, 1).value = "Hộ xếp vào đoạn chứa điểm đầu lý trình nhỏ nhất trong các thửa của hộ; số liệu tiền, diện tích của hộ tính trọn ở đoạn đó. Mặt bằng sạch: phần tuyến chỉ có thửa của hộ đã bàn giao.";
    w2.getCell(n, 1).font = { italic: true, size: 10 };
    w2.getCell(n, 1).alignment = { wrapText: true };
    w2.getRow(n).height = 30;
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/* ============================ 1.0.5: tim tuyến → lý trình gợi ý ============================ */

export interface DiemXY { x: number; y: number }

/** Chiếu điểm lên đường gấp khúc: lý trình (m, tính từ đỉnh đầu) và khoảng cách vuông góc tới tim tuyến. */
export function chieuLenTuyen(tuyen: DiemXY[], p: DiemXY): { s: number; d: number } {
  let tot = { s: 0, d: Infinity };
  let tichLuy = 0;
  for (let i = 0; i + 1 < tuyen.length; i++) {
    const a = tuyen[i]!, b = tuyen[i + 1]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const l = Math.sqrt(l2);
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d < tot.d) tot = { s: tichLuy + t * l, d };
    tichLuy += l;
  }
  return tot;
}

export const daiTuyen = (tuyen: DiemXY[]) => tuyen.slice(1).reduce((s, b, i) => s + Math.hypot(b.x - tuyen[i]!.x, b.y - tuyen[i]!.y), 0);

/**
 * Lý trình gợi ý của một thửa (các vòng ranh): đoạn [min, max] lý trình chiếu các đỉnh ranh lên tim tuyến, cộng lý trình
 * điểm đầu (`gocM`, vd. Km12+000 = 12000), đảo chiều nếu Km0 ở cuối đường vẽ. Kèm khoảng cách gần nhất tới tim tuyến.
 * Làm tròn đến mét. Chỉ là gợi ý — cán bộ xác nhận mới ghi vào hồ sơ.
 */
export function lyTrinhThua(vong: DiemXY[][], tuyen: DiemXY[], gocM = 0, dao = false): { ly: LyTrinh; cach: number } | null {
  const dinh = vong.flat();
  if (!dinh.length || tuyen.length < 2) return null;
  const L = daiTuyen(tuyen);
  const ch = dinh.map((p) => chieuLenTuyen(tuyen, p));
  const s = ch.map((c) => (dao ? L - c.s : c.s));
  const tu = Math.round(gocM + Math.min(...s)), den = Math.round(gocM + Math.max(...s));
  return { ly: den > tu ? { tu, den } : { tu }, cach: Math.round(Math.min(...ch.map((c) => c.d)) * 10) / 10 };
}
