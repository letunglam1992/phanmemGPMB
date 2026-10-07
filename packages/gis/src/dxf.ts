/**
 * Bộ đọc tệp AutoCAD DXF dạng chữ (ASCII), mọi phiên bản R12–2018 — đưa về cùng cấu trúc với bộ đọc DGN
 * (KetQuaDocDgn) để dựng thửa, ranh, so sánh, ghép tờ như tệp DGN.
 *
 * - Lớp (layer) DXF là tên: tên là số ("10", "Level 10", "LV10" — thường gặp khi xuất từ MicroStation/Famis) giữ đúng số
 *   đó; tên khác được đánh số từ 1000 theo thứ tự tên (A→Z) — tên gốc trả trong `tenLop` để hiển thị ở cấu hình lớp.
 * - Phần tử: LINE, LWPOLYLINE/POLYLINE (có cung — bulge), CIRCLE, ARC, ELLIPSE, TEXT, MTEXT, ATTRIB; INSERT được bung từ
 *   định nghĩa khối (BLOCKS) theo điểm chèn, tỷ lệ, góc xoay. Bỏ qua HATCH, SPLINE, DIMENSION, 3DFACE… (có cảnh báo số lượng).
 * - Chữ: tệp R2007 trở lên lưu UTF-8; bản cũ lưu theo bảng mã của máy vẽ — chữ Việt TCVN3 (.VnTime) giữ nguyên byte
 *   để giải mã như DGN; chữ Unicode (có \U+xxxx hoặc ký tự tiếng Việt dựng sẵn) dùng trực tiếp.
 * - Tọa độ: lấy nguyên giá trị trong tệp (bản đồ địa chính VN-2000 vẽ theo mét); $INSUNITS khác mét thì cảnh báo.
 * Tệp DXF nhị phân và tệp DWG không đọc được (định dạng đóng) — báo cách lưu sang DXF.
 */
import { xapXiCung, LoiDgn, type Diem, type KetQuaDocDgn, type PhanTu, type PhanTuChu, type PhanTuHinh } from "./dgn.js";

export interface KetQuaDocDxf extends KetQuaDocDgn {
  /** Số lớp → tên lớp gốc trong tệp DXF */
  tenLop?: Record<number, string>;
}

/** Nhận dạng tệp DXF chữ: có nhóm "0 / SECTION" ở đầu tệp (bỏ khoảng trắng, chú thích 999). */
export function laDxf(u8: Uint8Array): boolean {
  const dau = new TextDecoder("latin1").decode(u8.subarray(0, Math.min(u8.length, 4096)));
  return /^\s*(999\r?\n[^\n]*\r?\n\s*)?0\s*\r?\n\s*SECTION\s*\r?\n/.test(dau);
}
export const laDxfNhiPhan = (u8: Uint8Array) => new TextDecoder("latin1").decode(u8.subarray(0, 22)) === "AutoCAD Binary DXF\r\n\x1a\0";
/** Tệp DWG bắt đầu bằng mã phiên bản "AC10xx" (AC1012…AC1032). */
export const laDwg = (u8: Uint8Array) => /^AC10\d\d/.test(new TextDecoder("latin1").decode(u8.subarray(0, 6)));

export const HUONG_DAN_DWG =
  "Tệp DWG là định dạng đóng của AutoCAD, phần mềm chưa đọc trực tiếp được. Lưu sang DXF rồi nạp lại: trong AutoCAD (hoặc phần mềm CAD khác) chọn Save As → AutoCAD DXF (*.dxf); hoặc dùng ODA File Converter (miễn phí) đổi DWG → DXF. MicroStation: File → Save As → DXF, hoặc giữ tệp DGN.";

type Nhom = [number, string];

/** Bảng màu AutoCAD (ACI 0–255) xấp xỉ — dùng khi tô theo màu gốc. ACI 7 (trắng/đen) tô đen trên nền sáng. */
export function bangMauAci(): string[] {
  const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
  const hsv = (h: number, s: number, v: number) => {
    const f = (n: number) => {
      const k = (n + h / 60) % 6;
      return v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1)));
    };
    return hex(f(5) * 255, f(3) * 255, f(1) * 255);
  };
  const out: string[] = ["#000000", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#202020", "#808080", "#c0c0c0"];
  const V = [1, 1, 0.8, 0.8, 0.6, 0.6, 0.5, 0.5, 0.3, 0.3];
  for (let i = 10; i < 250; i++) {
    const j = (i - 10) % 10;
    out.push(hsv(Math.floor((i - 10) / 10) * 15, j % 2 ? 0.5 : 1, V[j]!));
  }
  for (const g of [0.2, 0.33, 0.46, 0.6, 0.73, 1]) out.push(hex(g * 255, g * 255, g * 255));
  return out;
}

/** Ký tự Windows-1252 vùng 0x80–0x9F → byte (để giữ byte TCVN3 khi tệp UTF-8 đã đổi theo bảng 1252). */
const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
  0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};
/** Chữ tiếng Việt Unicode dựng sẵn (ă â đ ê ô ơ ư và các chữ có dấu vùng 1EA0–1EF9). */
const RE_VIET = /[ăâđêôơưĂÂĐÊÔƠƯẠ-ỹ]/;

/** Bỏ mã định dạng MTEXT, đổi \U+xxxx, %%c/%%d/%%p; trả các dòng (\P). */
export function chuMtext(s: string): string[] {
  const t = s
    .replace(/\\U\+([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\[Pp]/g, "\n")
    .replace(/\\[ACcFfHhQqTtWw][^;\\{}]*;/g, "")
    .replace(/\\[LlOoKkNn]/g, "")
    .replace(/\\S([^;]*);/g, (_, x: string) => x.replace(/[#^/]/, "/"))
    .replace(/\\~/g, " ")
    .replace(/\\([\\{}])/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/%%[cC]/g, "Ø").replace(/%%[dD]/g, "°").replace(/%%[pP]/g, "±").replace(/%%%/g, "%");
  return t.split("\n");
}
const chuText = (s: string) => chuMtext(s.replace(/%%[uUoO]/g, ""))[0] ?? "";

/** Byte gốc của chữ (giữ TCVN3) hoặc chữ Unicode. */
function maChu(s: string, utf8: boolean): Pick<PhanTuChu, "byteChu" | "chuUnicode"> {
  if (RE_VIET.test(s) || [...s].some((c) => c.charCodeAt(0) > 0xff && CP1252[c.charCodeAt(0)] === undefined)) return { byteChu: new Uint8Array(), chuUnicode: s };
  const b = new Uint8Array([...s].map((c) => CP1252[c.charCodeAt(0)] ?? c.charCodeAt(0)));
  // Tệp UTF-8 không có byte > 0x7F: chữ thường (không dấu) — dùng trực tiếp
  if (utf8 && b.every((x) => x < 0x80)) return { byteChu: b, chuUnicode: s };
  return { byteChu: b };
}

/** Số lớp từ tên lớp: "10", "Level 10", "LV_10", "L10" → 10. */
const soTuTen = (ten: string): number | null => {
  const m = /^(?:level|lv|l)?[\s_-]*(\d{1,6})$/i.exec(ten.trim());
  return m ? Number(m[1]) : null;
};

interface DinhNghiaKhoi {
  goc: Diem;
  nhom: Nhom[][];
}

export function docDxf(duLieu: ArrayBuffer | Uint8Array): KetQuaDocDxf {
  const u8 = duLieu instanceof Uint8Array ? duLieu : new Uint8Array(duLieu);
  if (laDxfNhiPhan(u8)) throw new LoiDgn("Tệp DXF dạng nhị phân chưa đọc được — lưu lại dạng DXF chữ (ASCII) rồi nạp.");
  // Phiên bản: R2007 (AC1021) trở lên lưu UTF-8
  const latin = new TextDecoder("latin1").decode(u8);
  const ver = /\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*(AC\d{4})/.exec(latin.slice(0, 20000))?.[1] ?? "AC1009";
  const utf8 = ver >= "AC1021";
  const chu = utf8 ? new TextDecoder("utf-8").decode(u8) : latin;
  const dong = chu.split(/\r?\n/);
  const nhom: Nhom[] = [];
  for (let i = 0; i + 1 < dong.length; i += 2) {
    const ma = Number(dong[i]!.trim());
    if (!Number.isInteger(ma)) throw new LoiDgn(`Tệp DXF hỏng: dòng ${i + 1} không phải mã nhóm.`);
    nhom.push([ma, dong[i + 1]!.replace(/^\s+/, "").replace(/\s+$/, "")]);
  }
  const canhBao: string[] = [];
  const insUnits = /\$INSUNITS\s*\r?\n\s*70\s*\r?\n\s*(\d+)/.exec(latin.slice(0, 40000))?.[1];
  if (insUnits && !["0", "6"].includes(insUnits)) canhBao.push(`Đơn vị bản vẽ ($INSUNITS = ${insUnits}) không phải mét — diện tích tính theo đơn vị trong tệp; kiểm tra với số liệu trích đo.`);

  // Tách phần tử theo nhóm 0, theo SECTION
  const thucThe: Nhom[][] = [];
  const khoi = new Map<string, DinhNghiaKhoi>();
  const mauLop = new Map<string, number>();
  let i = 0;
  const motPhanTu = (): Nhom[] => {
    const pt: Nhom[] = [nhom[i]!];
    i++;
    while (i < nhom.length && nhom[i]![0] !== 0) pt.push(nhom[i++]!);
    return pt;
  };
  while (i < nhom.length) {
    const [ma, gt] = nhom[i]!;
    if (ma === 0 && gt === "SECTION") {
      const ten = nhom[i + 1]?.[1] ?? "";
      i += 2;
      while (i < nhom.length && !(nhom[i]![0] === 0 && nhom[i]![1] === "ENDSEC")) {
        if (nhom[i]![0] !== 0) { i++; continue; }
        const pt = motPhanTu();
        if (ten === "ENTITIES") thucThe.push(pt);
        else if (ten === "TABLES" && pt[0]![1] === "LAYER") {
          const t = pt.find((x) => x[0] === 2)?.[1];
          const m = Number(pt.find((x) => x[0] === 62)?.[1] ?? 7);
          if (t) mauLop.set(t, Math.abs(m));
        } else if (ten === "BLOCKS" && pt[0]![1] === "BLOCK") {
          const t = pt.find((x) => x[0] === 2)?.[1] ?? "";
          const goc = { x: so(pt, 10), y: so(pt, 20) };
          const ds: Nhom[][] = [];
          while (i < nhom.length && !(nhom[i]![0] === 0 && (nhom[i]![1] === "ENDBLK" || nhom[i]![1] === "ENDSEC"))) {
            if (nhom[i]![0] !== 0) { i++; continue; }
            ds.push(motPhanTu());
          }
          if (nhom[i]?.[1] === "ENDBLK") motPhanTu();
          khoi.set(t, { goc, nhom: ds });
        }
      }
      i++;
    } else i++;
  }
  if (!thucThe.length && !khoi.size) throw new LoiDgn("Tệp DXF không có phần ENTITIES — không có phần tử để đọc.");

  // Đánh số lớp
  const tenDung = new Set<string>();
  const ghiLop = (ds: Nhom[][]) => ds.forEach((pt) => tenDung.add(pt.find((x) => x[0] === 8)?.[1] ?? "0"));
  ghiLop(thucThe);
  for (const k of khoi.values()) ghiLop(k.nhom);
  const soLop = new Map<string, number>();
  const daSo = new Set<number>();
  for (const t of tenDung) {
    const n = soTuTen(t);
    if (n !== null && !daSo.has(n)) {
      soLop.set(t, n);
      daSo.add(n);
    }
  }
  let tiep = 1000;
  for (const t of [...tenDung].filter((x) => !soLop.has(x)).sort((a, b) => a.localeCompare(b))) {
    while (daSo.has(tiep)) tiep++;
    soLop.set(t, tiep);
    daSo.add(tiep++);
  }
  const tenLop: Record<number, string> = {};
  for (const [t, n] of soLop) tenLop[n] = t;

  const phanTu: PhanTu[] = [];
  const boQua = new Map<string, number>();
  let nut = 0;
  type BienDoi = (d: Diem) => Diem;
  const dongNhat: BienDoi = (d) => d;

  const doc = (pt: Nhom[], bien: BienDoi, xoayThem: number, tyLe: number, lopCha: string | null, mauCha: number | null, sau: Nhom[][], vt: { i: number }) => {
    const loai = pt[0]![1];
    let lopTen = pt.find((x) => x[0] === 8)?.[1] ?? "0";
    if (lopTen === "0" && lopCha) lopTen = lopCha; // phần tử khối trên lớp 0 lấy lớp của INSERT
    const mau0 = Number(pt.find((x) => x[0] === 62)?.[1] ?? 256);
    const mau = mau0 === 256 ? mauLop.get(lopTen) ?? 7 : mau0 === 0 ? mauCha ?? 7 : Math.abs(mau0);
    const co = { stt: phanTu.length, kieu: 0, lop: soLop.get(lopTen) ?? 0, mau, netDay: 0, kieuNet: 0, laThanhPhan: false };
    const hinh = (l: PhanTuHinh["loai"], diem: Diem[]) => diem.length >= 2 && phanTu.push({ ...co, loai: l, diem: diem.map(bien) });
    const chuPt = (s: string, goc: Diem, cao: number, xoay: number, n?: number) => {
      if (!s.trim()) return;
      phanTu.push({ ...co, loai: "CHU", goc: bien(goc), ...maChu(s, utf8), chieuCao: cao * tyLe, gocXoay: xoay + xoayThem, font: 0, ...(n !== undefined ? { nut: n } : {}) });
    };
    switch (loai) {
      case "LINE":
        hinh("DUONG", [{ x: so(pt, 10), y: so(pt, 20) }, { x: so(pt, 11), y: so(pt, 21) }]);
        break;
      case "LWPOLYLINE": {
        const kin = (Number(gt(pt, 70) ?? 0) & 1) === 1;
        const dinh: { d: Diem; bulge: number }[] = [];
        for (const [m, v] of pt) {
          if (m === 10) dinh.push({ d: { x: Number(v), y: 0 }, bulge: 0 });
          else if (m === 20 && dinh.length) dinh[dinh.length - 1]!.d.y = Number(v);
          else if (m === 42 && dinh.length) dinh[dinh.length - 1]!.bulge = Number(v);
        }
        const d = moRongBulge(dinh, kin);
        hinh(kin ? "VUNG" : "DUONG_GAP", d);
        break;
      }
      case "POLYLINE": {
        const co70 = Number(gt(pt, 70) ?? 0);
        const dinh: { d: Diem; bulge: number }[] = [];
        while (vt.i < sau.length && sau[vt.i]![0]![1] === "VERTEX") {
          const v = sau[vt.i++]!;
          if (!(Number(gt(v, 70) ?? 0) & 16)) dinh.push({ d: { x: so(v, 10), y: so(v, 20) }, bulge: so(v, 42) });
        }
        if (sau[vt.i]?.[0]?.[1] === "SEQEND") vt.i++;
        if (co70 & (16 | 64)) {
          boQua.set("POLYLINE lưới 3D", (boQua.get("POLYLINE lưới 3D") ?? 0) + 1);
          break;
        }
        const kin = (co70 & 1) === 1;
        hinh(kin ? "VUNG" : "DUONG_GAP", moRongBulge(dinh, kin));
        break;
      }
      case "CIRCLE": {
        const r = so(pt, 40);
        if (r > 0) hinh("ELIP", xapXiCung({ x: so(pt, 10), y: so(pt, 20) }, r, r, 0, 0, 360));
        break;
      }
      case "ARC": {
        const r = so(pt, 40), a = so(pt, 50), b = so(pt, 51);
        if (r > 0) hinh("CUNG", xapXiCung({ x: so(pt, 10), y: so(pt, 20) }, r, r, 0, a, ((b - a) % 360 + 360) % 360 || 360));
        break;
      }
      case "ELLIPSE": {
        const mx = so(pt, 11), my = so(pt, 21), a = Math.hypot(mx, my), tl = so(pt, 40) || 1;
        const t0 = (so(pt, 41) * 180) / Math.PI, t1 = (Number(gt(pt, 42) ?? Math.PI * 2) * 180) / Math.PI;
        const quet = ((t1 - t0) % 360 + 360) % 360 || 360;
        if (a > 0) hinh(quet >= 359.99 ? "ELIP" : "CUNG", xapXiCung({ x: so(pt, 10), y: so(pt, 20) }, a, a * tl, (Math.atan2(my, mx) * 180) / Math.PI, t0, quet));
        break;
      }
      case "TEXT":
      case "ATTRIB": {
        const canh = Number(gt(pt, 72) ?? 0) !== 0 || Number(gt(pt, loai === "TEXT" ? 73 : 74) ?? 0) !== 0;
        const goc = canh && gt(pt, 11) !== undefined ? { x: so(pt, 11), y: so(pt, 21) } : { x: so(pt, 10), y: so(pt, 20) };
        if (!(Number(gt(pt, 70) ?? 0) & 1)) chuPt(chuText(gt(pt, 1) ?? ""), goc, so(pt, 40), so(pt, 50));
        break;
      }
      case "MTEXT": {
        const s = pt.filter((x) => x[0] === 3).map((x) => x[1]).join("") + (gt(pt, 1) ?? "");
        const dx = gt(pt, 11), xoay = dx !== undefined ? (Math.atan2(so(pt, 21), so(pt, 11)) * 180) / Math.PI : so(pt, 50);
        const cac = chuMtext(s).map((x) => x.trim()).filter(Boolean);
        const n = cac.length > 1 ? 1_000_000 + nut++ : undefined;
        const cao = so(pt, 40);
        cac.forEach((c, k) => chuPt(c, { x: so(pt, 10), y: so(pt, 20) - k * cao * 1.5 }, cao, xoay, n));
        break;
      }
      case "INSERT": {
        const k = khoi.get(gt(pt, 2) ?? "");
        const sx = Number(gt(pt, 41) ?? 1), sy = Number(gt(pt, 42) ?? 1), goc = (so(pt, 50) * Math.PI) / 180;
        const p0 = { x: so(pt, 10), y: so(pt, 20) };
        if (k) {
          const c = Math.cos(goc), s = Math.sin(goc);
          const bienK: BienDoi = (d) => {
            const x = (d.x - k.goc.x) * sx, y = (d.y - k.goc.y) * sy;
            return bien({ x: p0.x + x * c - y * s, y: p0.y + x * s + y * c });
          };
          const vk = { i: 0 };
          while (vk.i < k.nhom.length) {
            const con = k.nhom[vk.i++]!;
            if (con[0]![1] === "ATTDEF") continue; // giá trị thật ở ATTRIB của INSERT
            doc(con, bienK, xoayThem + (goc * 180) / Math.PI, tyLe * Math.abs(sy), lopTen, mau, k.nhom, vk);
          }
        }
        // ATTRIB theo sau INSERT (cờ 66): tọa độ đã là tọa độ bản vẽ
        if (Number(gt(pt, 66) ?? 0) === 1) {
          while (vt.i < sau.length && sau[vt.i]![0]![1] === "ATTRIB") doc(sau[vt.i++]!, bien, xoayThem, tyLe, lopCha, mauCha, sau, vt);
          if (sau[vt.i]?.[0]?.[1] === "SEQEND") vt.i++;
        }
        break;
      }
      case "VERTEX":
      case "SEQEND":
      case "POINT":
        break;
      default:
        boQua.set(loai, (boQua.get(loai) ?? 0) + 1);
    }
  };
  const vt = { i: 0 };
  while (vt.i < thucThe.length) doc(thucThe[vt.i++]!, dongNhat, 0, 1, null, null, thucThe, vt);
  if (boQua.size) canhBao.push(`Bỏ qua phần tử chưa hỗ trợ: ${[...boQua].map(([k, n]) => `${k} (${n})`).join(", ")}.`);
  if (!phanTu.length) canhBao.push("Không đọc được phần tử hình học, chữ nào trong tệp DXF.");
  return {
    tcb: { soChieu: 2, suTrenMu: 1, uorTrenSu: 1, donViChinh: "m", donViPhu: "", gocX: 0, gocY: 0, heSo: 1 },
    phanTu,
    bangMau: bangMauAci(),
    canhBao,
    tenLop,
  };
}

function gt(pt: Nhom[], ma: number): string | undefined {
  return pt.find((x) => x[0] === ma)?.[1];
}
function so(pt: Nhom[], ma: number): number {
  const v = Number(gt(pt, ma) ?? 0);
  return Number.isFinite(v) ? v : 0;
}

/** Đỉnh polyline kèm độ phồng (bulge = tan(góc ở tâm / 4)) → dãy điểm, cung xấp xỉ bằng đoạn thẳng. */
function moRongBulge(dinh: { d: Diem; bulge: number }[], kin: boolean): Diem[] {
  const out: Diem[] = [];
  const n = dinh.length;
  for (let k = 0; k < n; k++) {
    const { d: a, bulge } = dinh[k]!;
    out.push(a);
    const coTiep = k + 1 < n || kin;
    if (!coTiep || !bulge) continue;
    const b = dinh[(k + 1) % n]!.d;
    const goc = 4 * Math.atan(bulge);
    const dai = Math.hypot(b.x - a.x, b.y - a.y);
    if (dai === 0) continue;
    const r = dai / (2 * Math.sin(Math.abs(goc) / 2));
    const giua = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const h = Math.sqrt(Math.max(0, r * r - (dai / 2) ** 2));
    const ux = (b.x - a.x) / dai, uy = (b.y - a.y) / dai;
    // tâm nằm bên trái dây cung khi bulge > 0 và |góc| < 180°
    const ben = (bulge > 0 ? 1 : -1) * (Math.abs(goc) < Math.PI ? 1 : -1);
    const tam = { x: giua.x - uy * h * ben, y: giua.y + ux * h * ben };
    const t0 = (Math.atan2(a.y - tam.y, a.x - tam.x) * 180) / Math.PI;
    const cung = xapXiCung(tam, r, r, 0, t0, (goc * 180) / Math.PI);
    out.push(...cung.slice(1, -1));
  }
  if (kin && out.length > 2) {
    const [f, l] = [out[0]!, out[out.length - 1]!];
    if (f.x !== l.x || f.y !== l.y) out.push({ ...f });
  }
  return out;
}
