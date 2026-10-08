/**
 * 1.0.6 — PDF có chữ thật (chọn, tìm, chép được chữ): cùng dàn trang với pdf-tai-lieu.ts (dungBoCuc, đơn vị điểm 72 dpi),
 * chữ vẽ bằng phông Liberation Serif (SIL OFL 1.1, cùng kích thước chữ với Times New Roman) nhúng dạng tập con
 * (CIDFontType2, mã Identity-H, bảng ToUnicode). Không thư viện ngoài; nén luồng bằng CompressionStream của trình duyệt.
 */
import { dungBoCuc, type Lenh } from "./pdf-tai-lieu";
import { docTtf, type PhongTtf } from "./phong-ttf";
import type { TaiLieu } from "./tai-lieu-don-gian";

export type KieuChu = "thuong" | "dam" | "nghieng" | "damNghieng";
export type BoPhong = Record<KieuChu, PhongTtf>;
export const TEP_PHONG: Record<KieuChu, string> = {
  thuong: "LiberationSerif-Regular.ttf",
  dam: "LiberationSerif-Bold.ttf",
  nghieng: "LiberationSerif-Italic.ttf",
  damNghieng: "LiberationSerif-BoldItalic.ttf",
};

/** Nạp bộ phông đóng kèm (public/phong/) — `doc` để kiểm thử đọc từ đĩa. */
export async function napPhong(doc: (tep: string) => Promise<Uint8Array> = async (t) => new Uint8Array(await (await fetch(`/phong/${t}`)).arrayBuffer())): Promise<BoPhong> {
  const ra = {} as BoPhong;
  for (const k of Object.keys(TEP_PHONG) as KieuChu[]) ra[k] = docTtf(await doc(TEP_PHONG[k]), TEP_PHONG[k].replace(/\.ttf$/, ""));
  return ra;
}

const kieuCua = (font: string): KieuChu => {
  const d = /\bbold\b/.test(font), n = /\bitalic\b/.test(font);
  return d && n ? "damNghieng" : d ? "dam" : n ? "nghieng" : "thuong";
};
const coCua = (font: string) => Number(/([\d.]+)px/.exec(font)?.[1] ?? 12);
const glyph = (p: PhongTtf, t: string) => [...t].map((c) => p.cmap.get(c.codePointAt(0)!) ?? p.cmap.get(0x3f) ?? 0);

/** Đo chữ theo độ rộng glyph của phông nhúng (khớp đúng khi vẽ vào PDF). */
export const doChuPhong = (bo: BoPhong) => (t: string, font: string) => {
  const p = bo[kieuCua(font || "")];
  return glyph(p, t).reduce((s, g) => s + p.rong(g), 0) * (coCua(font) / p.upm);
};

async function nen(d: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const w = cs.writable.getWriter();
  void w.write(d as Uint8Array<ArrayBuffer>);
  void w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

const so = (v: number) => (Math.round(v * 100) / 100).toString();
const mau = (hex: string) => {
  const h = hex.replace("#", "");
  const x = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => so(parseInt(x.slice(i, i + 2), 16) / 255)).join(" ");
};
const hex16 = (s: string) => "FEFF" + [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase();

export async function taoPdfChu(tl: TaiLieu, bo: BoPhong): Promise<Uint8Array> {
  const bc = dungBoCuc(tl, doChuPhong(bo), 72);
  const H = bc.cao;
  const dung = new Map<KieuChu, Map<number, string>>(); // glyph → ký tự (ToUnicode)
  const noiDung: string[] = bc.trang.map((ds: Lenh[]) => {
    const r: string[] = [];
    for (const l of ds) {
      if (l.k === "nen") r.push(`${mau(l.mau)} rg ${so(l.x)} ${so(H - l.y - l.h)} ${so(l.w)} ${so(l.h)} re f`);
      else if (l.k === "khung") r.push(`0.5 0.5 0.5 RG 0.5 w ${so(l.x)} ${so(H - l.y - l.h)} ${so(l.w)} ${so(l.h)} re S`);
      else {
        const k = kieuCua(l.font), p = bo[k], co = coCua(l.font);
        const g = glyph(p, l.t);
        const m = dung.get(k) ?? new Map<number, string>();
        [...l.t].forEach((c, i) => m.set(g[i]!, c));
        dung.set(k, m);
        r.push(`BT /${k} ${so(co)} Tf ${mau(l.mau)} rg ${so(l.x)} ${so(H - l.y - (p.ascender / p.upm) * co)} Td <${g.map((x) => x.toString(16).padStart(4, "0")).join("")}> Tj ET`);
      }
    }
    return r.join("\n");
  });

  // ---- đối tượng PDF
  const enc = new TextEncoder();
  const obj: (string | Uint8Array)[][] = [];
  const them = (...phan: (string | Uint8Array)[]) => (obj.push(phan), obj.length);
  const luong = async (tu: string, d: Uint8Array) => {
    const z = await nen(d);
    return them(`<< ${tu} /Filter /FlateDecode /Length ${z.length} >>\nstream\n`, z, "\nendstream");
  };
  const soCatalog = them(""); // điền sau
  const soPages = them("");
  const font: string[] = [];
  for (const [k, m] of dung) {
    const p = bo[k];
    const tap = p.tapCon(m.keys());
    const sFont = await luong(`/Length1 ${tap.length}`, tap);
    const ps = `GPMBA${"ABCD"["thuong dam nghieng damNghieng".split(" ").indexOf(k)]}+${p.ten.replace(/[^A-Za-z0-9-]/g, "")}`;
    const ty = (v: number) => Math.round((v * 1000) / p.upm);
    const sMoTa = them(`<< /Type /FontDescriptor /FontName /${ps} /Flags ${4 | 2 | (k === "nghieng" || k === "damNghieng" ? 64 : 0)} /FontBBox [${p.bbox.map(ty).join(" ")}] /ItalicAngle ${so(p.italicAngle)} /Ascent ${ty(p.ascender)} /Descent ${ty(p.descender)} /CapHeight ${ty(p.ascender)} /StemV ${k === "dam" || k === "damNghieng" ? 140 : 80} /FontFile2 ${sFont} 0 R >>`);
    const gids = [...m.keys()].sort((a, b) => a - b);
    const sCid = them(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${ps} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${sMoTa} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${gids.map((g) => `${g} [${ty(p.rong(g))}]`).join(" ")}] >>`);
    const khoi: string[] = [];
    for (let i = 0; i < gids.length; i += 100) {
      const lo = gids.slice(i, i + 100);
      khoi.push(`${lo.length} beginbfchar\n${lo.map((g) => `<${g.toString(16).padStart(4, "0")}> <${m.get(g)!.split("").map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).join("")}>`).join("\n")}\nendbfchar`);
    }
    const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${khoi.join("\n")}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
    const sUni = await luong("", enc.encode(cmap));
    const sType0 = them(`<< /Type /Font /Subtype /Type0 /BaseFont /${ps} /Encoding /Identity-H /DescendantFonts [${sCid} 0 R] /ToUnicode ${sUni} 0 R >>`);
    font.push(`/${k} ${sType0} 0 R`);
  }
  const trang: number[] = [];
  for (const nd of noiDung) {
    const sNd = await luong("", enc.encode(nd));
    trang.push(them(`<< /Type /Page /Parent ${soPages} 0 R /MediaBox [0 0 ${so(bc.rong)} ${so(H)}] /Resources << /Font << ${font.join(" ")} >> >> /Contents ${sNd} 0 R >>`));
  }
  obj[soCatalog - 1] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  obj[soPages - 1] = [`<< /Type /Pages /Kids [${trang.map((t) => `${t} 0 R`).join(" ")}] /Count ${trang.length} >>`];
  const soInfo = them(`<< /Title <${hex16(tl.tieuDe)}> /Producer (GPMB Son La) >>`);

  const phan: Uint8Array[] = [enc.encode("%PDF-1.7\n%âãÏÓ\n")];
  let vt = phan[0]!.length;
  const xref: number[] = [];
  obj.forEach((o, i) => {
    xref.push(vt);
    for (const d of [enc.encode(`${i + 1} 0 obj\n`), ...o.map((x) => (typeof x === "string" ? enc.encode(x) : x)), enc.encode("\nendobj\n")]) {
      phan.push(d);
      vt += d.length;
    }
  });
  phan.push(enc.encode(`xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${xref.map((x) => `${String(x).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R /Info ${soInfo} 0 R >>\nstartxref\n${vt}\n%%EOF\n`));
  const out = new Uint8Array(phan.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of phan) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}
