/**
 * Điền biểu mẫu Excel (.xlsx) do đơn vị tự thiết kế — giữ nguyên định dạng, ô gộp, độ rộng cột, tiêu đề, chữ ký, thiết lập
 * trang in của tệp mẫu; phần mềm chỉ thay các trường {{…}} (QD-32). Cú pháp:
 *  - {{truong}}: thay bằng giá trị (ô chỉ có một trường và giá trị là số → ghi số, giữ định dạng số của ô mẫu).
 *  - Dòng lặp: ô đầu tiên có nội dung của dòng bắt đầu bằng {{#bang}} → dòng được nhân theo từng dòng của bảng "bang"
 *    (giữ định dạng, chiều cao, ô gộp trong dòng). Dòng {{#bang.phan}} / {{#bang.nhom}} (nếu có, đặt liền dòng lặp) là định
 *    dạng riêng cho dòng tiêu đề phần (A, B) và nhóm (I, II…) của bảng chi tiết.
 *  - Trang có tên chứa {{…}} (vd. "{{stt}}. {{ten}}") là trang mẫu của từng hộ: nhân thành một trang cho mỗi hộ.
 *  - Cột động (0.9.4): ô có {{@ds}} ở đầu → cột được nhân theo danh sách "ds" (vd. ký hiệu loại đất của dự án); trong cột,
 *    {{cot}} là giá trị của cột (vd. "LUC"), {{ten@}} đổi thành {{ten_LUC}}; {{@ds*}} là ô tiêu đề nhóm gộp qua mọi cột nhân.
 *  - Ô chữ bắt đầu bằng "=" có trường {{…}} → sau khi điền thành công thức (vd. ='{{trang}}'!{{o_tong_lam_tron}} tham chiếu
 *    sang trang chi tiết của hộ: {{trang}} là tên trang hộ, {{o_x}} là địa chỉ ô chứa trường {{x}} của trang đó).
 * Công thức nằm dưới dòng lặp được dời theo số dòng chèn thêm; vùng SUM kết thúc tại dòng lặp được mở rộng.
 * Tệp tạo trên máy, không gửi đi đâu.
 */
import type ExcelJS from "exceljs";

export const MA_MAU_EXCEL = "excel-phuong-an";

export type GiaTri = string | number | null;
export type DongMau = Record<string, GiaTri> & { _cap?: "phan" | "nhom" | null };
export interface DuLieuMauExcel {
  chung: Record<string, GiaTri>;
  bang: Record<string, DongMau[]>;
  /** Mỗi hộ: trường riêng (cộng thêm trường chung) và các bảng riêng (thửa, dòng chi tiết). */
  ho: { chung: Record<string, GiaTri>; bang: Record<string, DongMau[]> }[];
  /** Danh sách cho cột động {{@ten}} (vd. loai_dat: ["CLN", "LUC"]). */
  cot?: Record<string, string[]>;
}

const RE_TRUONG = /\{\{\s*([\w.]+)\s*\}\}/g;
const RE_LAP = /^\s*\{\{\s*#(\w+)(?:\.(phan|nhom))?\s*\}\}/;

/** Chữ của một ô (kể cả rich text); null nếu không phải chữ. */
function chuO(v: ExcelJS.CellValue): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "richText" in v) return v.richText.map((x) => x.text).join("");
  return null;
}

function thayChu(s: string, tim: (t: string) => GiaTri | undefined, thieu: Set<string>): ExcelJS.CellValue {
  const mot = /^\s*\{\{\s*([\w.]+)\s*\}\}\s*$/.exec(s);
  if (mot) {
    const v = tim(mot[1]!);
    if (v === undefined) thieu.add(mot[1]!);
    return v === undefined || v === null ? "" : v;
  }
  return s.replace(RE_TRUONG, (_, t: string) => {
    const v = tim(t);
    if (v === undefined) thieu.add(t);
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Ô mẫu dạng "=…{{…}}…": sau khi thay trường thì ghi thành công thức. */
function thanhCongThuc(mau: string, v: ExcelJS.CellValue): ExcelJS.CellValue {
  return typeof v === "string" && mau.trimStart().startsWith("=") && mau.includes("{{") && v.trimStart().startsWith("=") ? ({ formula: v.trimStart().slice(1) } as ExcelJS.CellFormulaValue) : v;
}

/** Đổi số dòng của mọi tham chiếu ô (A1, $A$1) trong công thức; bỏ qua chữ trong ngoặc kép và tên hàm (LOG10(…)). */
function doiThamChieu(f: string, doi: (r: number) => number, vung?: (a: number, b: number) => [number, number]): string {
  return f
    .split(/("[^"]*")/)
    .map((phan, i) => {
      if (i % 2) return phan; // chuỗi trong ngoặc kép
      const quaVung = phan.replace(/(?<![!A-Za-z_\d$])(\$?[A-Z]{1,3}\$?)(\d+):(\$?[A-Z]{1,3}\$?)(\d+)/g, (_, c1: string, r1: string, c2: string, r2: string) => {
        const [a, b] = vung ? vung(Number(r1), Number(r2)) : [doi(Number(r1)), doi(Number(r2))];
        return `${c1}${a}\u0000:${c2}${b}\u0000`;
      });
      return quaVung.replace(/(^|[^A-Za-z_\d$!])(\$?[A-Z]{1,3}\$?)(\d+)(?![\d(\u0000])/g, (_, truoc: string, c: string, r: string) => `${truoc}${c}${doi(Number(r))}`).replace(/\u0000/g, "");
    })
    .join("");
}

/**
 * Dời tham chiếu khi các dòng mẫu [dau, cuoi] được thay bằng n dòng: dòng dưới vùng mẫu dời theo số dòng chênh; vùng
 * (A1:B2) kết thúc trong vùng mẫu và bắt đầu từ trước/tại vùng mẫu được mở rộng đến dòng chèn cuối (vd. SUM trên dòng tổng).
 */
export function doiCongThuc(f: string, dau: number, cuoi: number, n: number): string {
  const lech = n - (cuoi - dau + 1);
  const moi = (r: number) => (r > cuoi ? r + lech : r);
  return doiThamChieu(f, moi, (a, b) => {
    const b2 = b >= dau && b <= cuoi && a <= b ? Math.max(dau + Math.max(n, 1) - 1, a) : moi(b);
    return [moi(a), b2];
  });
}

interface DongMauO {
  so: number;
  cap: "phan" | "nhom" | null;
  cao: number | undefined;
  o: { cot: number; giaTri: ExcelJS.CellValue; kieu: Partial<ExcelJS.Style> }[];
  gop: [number, number][];
}

function dienTrang(ws: ExcelJS.Worksheet, chung: Record<string, GiaTri>, bang: Record<string, DongMau[]>, thieu: Set<string>, diaChi?: Record<string, string>) {
  // Ô gộp: gỡ hết trước khi chèn dòng rồi gộp lại theo số dòng mới (ExcelJS dời ô gộp không đúng khi có nhiều vùng lặp)
  const gopCu = [...((ws.model as { merges?: string[] }).merges ?? [])];
  const gopVung = gopCu
    .map((g) => /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(g))
    .filter((x): x is RegExpExecArray => !!x)
    .map((x) => ({ c1: ws.getColumn(x[1]!).number, r1: Number(x[2]), c2: ws.getColumn(x[3]!).number, r2: Number(x[4]), bo: false }));
  for (const g of gopCu) ws.unMergeCells(g);
  // 1. Nhóm dòng lặp theo tên bảng
  const nhom = new Map<string, DongMauO[]>();
  ws.eachRow({ includeEmpty: false }, (row, so) => {
    let dau: string | null = null;
    row.eachCell({ includeEmpty: false }, (c) => {
      if (dau !== null) return;
      const s = chuO(c.value);
      if (s !== null && s.trim()) dau = s;
      else if (c.value !== null && c.value !== undefined && s === null) dau = "";
    });
    const m = dau ? RE_LAP.exec(dau) : null;
    if (!m) return;
    const o: DongMauO["o"] = [];
    row.eachCell({ includeEmpty: true }, (c, cot) => o.push({ cot, giaTri: c.value, kieu: JSON.parse(JSON.stringify(c.style ?? {})) as Partial<ExcelJS.Style> }));
    const gop = gopVung.filter((g) => g.r1 === so && g.r2 === so).map((g) => [g.c1, g.c2] as [number, number]);
    const ds = nhom.get(m[1]!) ?? [];
    ds.push({ so, cap: (m[2] as "phan" | "nhom" | undefined) ?? null, cao: row.height, o, gop });
    nhom.set(m[1]!, ds);
  });
  // 2. Xử lý từ dưới lên để số dòng phía trên không đổi
  const cacNhom = [...nhom.entries()].sort((a, b) => b[1][0]!.so - a[1][0]!.so);
  for (const [ten, mau] of cacNhom) {
    const dau = Math.min(...mau.map((x) => x.so));
    const cuoi = Math.max(...mau.map((x) => x.so));
    const chinh = mau.find((x) => x.cap === null) ?? mau[0]!;
    const ds = bang[ten];
    if (!ds) thieu.add(`#${ten}`);
    const dong = ds ?? [];
    // ô gộp: trong vùng mẫu → bỏ (gộp lại theo từng dòng mới); phía dưới → dời theo số dòng chênh
    const lechGop = dong.length - (cuoi - dau + 1);
    for (const g of gopVung) {
      if (g.bo) continue;
      if (g.r1 >= dau && g.r2 <= cuoi) g.bo = true;
      else {
        if (g.r1 > cuoi) g.r1 += lechGop;
        if (g.r2 > cuoi) g.r2 += lechGop;
      }
    }
    ws.spliceRows(dau, cuoi - dau + 1, ...dong.map(() => []));
    // dời công thức các dòng còn lại (trước khi điền dòng mới)
    ws.eachRow({ includeEmpty: false }, (row) =>
      row.eachCell({ includeEmpty: false }, (c) => {
        const v = c.value as { formula?: string } | null;
        if (v && typeof v === "object" && typeof v.formula === "string") c.value = { formula: doiCongThuc(v.formula, dau, cuoi, dong.length) } as ExcelJS.CellFormulaValue;
      }),
    );
    const lech = dong.length - (cuoi - dau + 1);
    dong.forEach((d, i) => {
      const m = mau.find((x) => x.cap === (d._cap ?? null)) ?? chinh;
      const row = ws.getRow(dau + i);
      if (m.cao) row.height = m.cao;
      const tim = (t: string) => (t in d ? d[t] : chung[t]);
      for (const o of m.o) {
        const c = row.getCell(o.cot);
        c.style = JSON.parse(JSON.stringify(o.kieu)) as Partial<ExcelJS.Style>;
        let s = chuO(o.giaTri);
        const f = (o.giaTri as { formula?: string } | null)?.formula;
        if (s !== null) {
          s = s.replace(RE_LAP, "");
          c.value = thanhCongThuc(s, thayChu(s, tim, thieu));
        } else if (typeof f === "string")
          // công thức trong dòng lặp: tham chiếu chính dòng mẫu → dòng đang điền; dòng dưới vùng mẫu → dời theo số dòng chênh
          c.value = { formula: doiThamChieu(f, (r) => (r === m.so ? dau + i : r > cuoi ? r + lech : r)) } as ExcelJS.CellFormulaValue;
        else c.value = o.giaTri;
      }
      for (const [a, b] of m.gop) gopVung.push({ c1: a, r1: dau + i, c2: b, r2: dau + i, bo: false });
    });
  }
  for (const g of gopVung) {
    if (g.bo) continue;
    try {
      ws.mergeCells(g.r1, g.c1, g.r2, g.c2);
    } catch {
      /* ô gộp chồng nhau trong mẫu — bỏ qua */
    }
  }
  // 3. Trường đơn
  ws.eachRow({ includeEmpty: false }, (row) =>
    row.eachCell({ includeEmpty: false }, (c) => {
      const s = chuO(c.value);
      if (s === null || !s.includes("{{")) return;
      const mot = /^\s*\{\{\s*([\w.]+)\s*\}\}\s*$/.exec(s);
      if (mot && diaChi) diaChi[mot[1]!] = c.address;
      c.value = thanhCongThuc(s, thayChu(s, (t) => chung[t], thieu));
    }),
  );
}

const RE_COT = /^\s*\{\{\s*@(\w+)(\*?)\s*\}\}/;
const soCot = (ten: string) => ten.replace(/\$/g, "").split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const tenCot = (n: number) => {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/**
 * Dời cột trong công thức khi cột động c được nhân thành n cột: cột sau c dời n − 1; vùng nhiều cột chứa c (hoặc vùng một
 * cột c đặt NGOÀI cột động, vd. tổng các cột loại đất) mở rộng; trong bản sao thứ i của cột động, tham chiếu cột c → c + i.
 * Tham chiếu sang trang khác (Trang!A1) giữ nguyên.
 */
export function doiCotCongThuc(f: string, c: number, n: number, banSao: number | null): string {
  const moi = (k: number) => (k > c ? k + n - 1 : k === c && banSao !== null ? c + banSao : k);
  return f
    .split(/("[^"]*")/)
    .map((phan, i) => {
      if (i % 2) return phan;
      const qv = phan.replace(/(?<![!A-Za-z_\d$])(\$?)([A-Z]{1,3})(\$?\d+):(\$?)([A-Z]{1,3})(\$?\d+)/g, (_, d1: string, a: string, r1: string, d2: string, b: string, r2: string) => {
        const k1 = soCot(a), k2 = soCot(b);
        let m1 = moi(k1), m2 = moi(k2);
        if (banSao === null && k1 <= c && k2 >= c) {
          m1 = k1 === c ? c : m1;
          m2 = k2 + n - 1;
          if (n === 0 && k1 === c && k2 === c) return "0";
        }
        return `${d1}${tenCot(m1)}\u0000${r1}:${d2}${tenCot(m2)}\u0000${r2}`;
      });
      return qv
        .replace(/(^|[^A-Za-z_\d$!\u0000])(\$?)([A-Z]{1,3})(\$?\d+)(?![\d(\u0000])/g, (_, truoc: string, d: string, a: string, r: string) => `${truoc}${d}${tenCot(moi(soCot(a)))}${r}`)
        .replace(/\u0000/g, "");
    })
    .join("");
}

/** Nhân các cột động {{@ds}} của trang theo dl.cot (trước khi nhân dòng lặp). */
function moRongCot(ws: ExcelJS.Worksheet, cot: Record<string, string[]>, thieu: Set<string>) {
  for (;;) {
    let c = 0, ten = "";
    ws.eachRow({ includeEmpty: false }, (row) =>
      row.eachCell({ includeEmpty: false }, (o, k) => {
        const m = c ? null : RE_COT.exec(chuO(o.value) ?? "");
        if (m) (c = k), (ten = m[1]!);
      }),
    );
    if (!c) return;
    const ds = cot[ten];
    if (!ds) thieu.add(`@${ten}`);
    const n = ds?.length ?? 0;
    const gopCu = [...((ws.model as { merges?: string[] }).merges ?? [])];
    for (const g of gopCu) ws.unMergeCells(g);
    const rong = ws.getColumn(c).width;
    // chụp cột động (giá trị, kiểu) rồi chèn/bỏ cột
    const mauCot: { r: number; v: ExcelJS.CellValue; kieu: Partial<ExcelJS.Style> }[] = [];
    ws.eachRow({ includeEmpty: false }, (row, r) => {
      const o = row.getCell(c);
      mauCot.push({ r, v: o.value, kieu: JSON.parse(JSON.stringify(o.style ?? {})) as Partial<ExcelJS.Style> });
    });
    if (n === 0) ws.spliceColumns(c, 1);
    else if (n > 1) ws.spliceColumns(c + 1, 0, ...Array.from({ length: n - 1 }, () => []));
    // công thức ngoài cột động
    ws.eachRow({ includeEmpty: false }, (row) =>
      row.eachCell({ includeEmpty: false }, (o, k) => {
        if (k >= c && k < c + n) return;
        const f = (o.value as { formula?: string } | null)?.formula;
        if (typeof f === "string") o.value = { formula: doiCotCongThuc(f, c, n, null) } as ExcelJS.CellFormulaValue;
      }),
    );
    const nhomGop: number[] = [];
    for (let i = 0; i < n; i++) {
      if (rong) ws.getColumn(c + i).width = rong;
      for (const m of mauCot) {
        const o = ws.getRow(m.r).getCell(c + i);
        o.style = JSON.parse(JSON.stringify(m.kieu)) as Partial<ExcelJS.Style>;
        const s = chuO(m.v);
        const f = (m.v as { formula?: string } | null)?.formula;
        if (s !== null) {
          const mm = RE_COT.exec(s);
          if (mm?.[2] === "*") {
            // tiêu đề nhóm: chỉ ghi ở cột đầu, gộp qua mọi cột nhân
            o.value = i === 0 ? s.replace(RE_COT, "") : null;
            if (i === 0 && n > 1) nhomGop.push(m.r);
            continue;
          }
          o.value = s.replace(RE_COT, "").replace(/\{\{\s*cot\s*\}\}/g, ds![i]!).replace(/\{\{\s*(\w+)@\s*\}\}/g, (_, t: string) => `{{${t}_${ds![i]!}}}`);
        } else if (typeof f === "string") o.value = { formula: doiCotCongThuc(f, c, n, i) } as ExcelJS.CellFormulaValue;
        else o.value = m.v;
      }
    }
    // gộp lại ô gộp theo cột mới
    for (const g of gopCu) {
      const x = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(g);
      if (!x) continue;
      const c1 = soCot(x[1]!), c2 = soCot(x[3]!), r1 = Number(x[2]), r2 = Number(x[4]);
      const ds2: [number, number][] =
        c1 === c && c2 === c ? Array.from({ length: n }, (_, i) => [c + i, c + i]) : [[c1 > c ? c1 + n - 1 : c1, c2 >= c ? c2 + n - 1 : c2]];
      for (const [a, b] of ds2) {
        if (b < a) continue;
        try {
          ws.mergeCells(r1, a, r2, b);
        } catch {
          /* chồng nhau — bỏ qua */
        }
      }
    }
    for (const r of nhomGop) {
      try {
        ws.mergeCells(r, c, r, c + n - 1);
      } catch {
        /* bỏ qua */
      }
    }
  }
}

const TEN_CAM = /[\\/*?:[\]]/g;

/** Điền mẫu; trả về sổ tính và các trường mẫu có nhưng phần mềm không cung cấp (để báo khi thay mẫu). */
export async function dienMauExcel(bytes: Uint8Array, dl: DuLieuMauExcel): Promise<{ wb: ExcelJS.Workbook; thieu: string[] }> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  try {
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  } catch {
    throw new Error("Không đọc được tệp mẫu Excel (.xlsx)");
  }
  const thieu = new Set<string>();
  const daDung = new Set(wb.worksheets.filter((w) => !w.name.includes("{{")).map((w) => w.name));
  for (const w of wb.worksheets) moRongCot(w, dl.cot ?? {}, thieu);
  // Trang từng hộ điền trước để biết tên trang, địa chỉ ô → trang tổng hợp tham chiếu công thức sang ({{trang}}, {{o_x}})
  const thamChieu: Record<string, string>[] = dl.ho.map(() => ({}));
  const thuTu = [...wb.worksheets].sort((a, b) => Number(b.name.includes("{{")) - Number(a.name.includes("{{")));
  for (const src of thuTu) {
    if (!src.name.includes("{{")) {
      const bang = { ...dl.bang, ...(dl.bang.ho ? { ho: dl.bang.ho.map((d, i) => ({ ...d, ...thamChieu[i] })) } : {}) };
      dienTrang(src, dl.chung, bang, thieu);
      continue;
    }
    // Trang mẫu từng hộ: nhân trang (giữ định dạng, gộp lại ô gộp), điền theo hộ
    const gop = [...((src.model as { merges?: string[] }).merges ?? [])];
    for (const [iHo, h] of dl.ho.entries()) {
      const chung = { ...dl.chung, ...h.chung };
      let ten = String(thayChu(src.name, (t) => chung[t], thieu)).replace(TEN_CAM, " ").slice(0, 28).trim() || "Hộ";
      for (let i = 2; daDung.has(ten); i++) ten = `${ten.slice(0, 25)} ${i}`;
      daDung.add(ten);
      const ws = wb.addWorksheet(ten);
      ws.model = { ...src.model, name: ten, id: ws.id } as ExcelJS.WorksheetModel;
      for (const g of gop) {
        try {
          ws.mergeCells(g);
        } catch {
          /* ô gộp trùng — bỏ qua */
        }
      }
      const dc: Record<string, string> = {};
      dienTrang(ws, chung, { ...dl.bang, ...h.bang }, thieu, dc);
      if (!thamChieu[iHo]!.trang) Object.assign(thamChieu[iHo]!, { trang: ten.replace(/'/g, "''"), ...Object.fromEntries(Object.entries(dc).map(([k, v]) => [`o_${k}`, v])) });
    }
    wb.removeWorksheet(src.id);
  }
  return { wb, thieu: [...thieu].sort() };
}
