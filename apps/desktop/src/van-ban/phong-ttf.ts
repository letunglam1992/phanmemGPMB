/**
 * 1.0.6 — Đọc phông TrueType (bảng head, hhea, hmtx, maxp, cmap, loca, glyf) và tạo tập con chỉ gồm các glyph đã dùng
 * (giữ nguyên số hiệu glyph) để nhúng vào PDF. Không thư viện ngoài. Dùng cho phông Liberation Serif (SIL OFL 1.1)
 * đóng kèm ở public/phong/.
 */

export interface PhongTtf {
  ten: string;
  upm: number;
  ascender: number;
  descender: number;
  bbox: [number, number, number, number];
  italicAngle: number;
  soGlyph: number;
  /** điểm mã Unicode → số hiệu glyph */
  cmap: Map<number, number>;
  /** độ rộng (đơn vị phông) theo số hiệu glyph */
  rong: (gid: number) => number;
  /** tập con giữ nguyên số hiệu glyph; luôn có glyph 0 */
  tapCon: (gids: Iterable<number>) => Uint8Array;
}

const BO_BANG = new Set(["GSUB", "GPOS", "GDEF", "DSIG", "kern", "hdmx", "LTSH", "VDMX", "JSTF", "BASE", "gasp", "PCLT", "VORG"]);

export function docTtf(bytes: Uint8Array, ten: string): PhongTtf {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (o: number) => dv.getUint16(o), i16 = (o: number) => dv.getInt16(o), u32 = (o: number) => dv.getUint32(o);
  const bang = new Map<string, { off: number; len: number }>();
  const n = u16(4);
  for (let i = 0; i < n; i++) {
    const r = 12 + i * 16;
    bang.set(String.fromCharCode(bytes[r]!, bytes[r + 1]!, bytes[r + 2]!, bytes[r + 3]!), { off: u32(r + 8), len: u32(r + 12) });
  }
  const b = (t: string) => {
    const x = bang.get(t);
    if (!x) throw new Error(`Phông ${ten} thiếu bảng ${t}`);
    return x;
  };
  const head = b("head").off, hhea = b("hhea").off, maxp = b("maxp").off, hmtx = b("hmtx").off;
  const upm = u16(head + 18);
  const locFmt = i16(head + 50);
  const soGlyph = u16(maxp + 4);
  const soH = u16(hhea + 34);
  const rong = (g: number) => u16(hmtx + 4 * Math.min(g, soH - 1));
  // cmap: ưu tiên (3,10) định dạng 12, rồi (3,1) định dạng 4
  const cmap = new Map<number, number>();
  const c0 = b("cmap").off;
  const bangCon: { pid: number; eid: number; off: number }[] = [];
  for (let i = 0; i < u16(c0 + 2); i++) bangCon.push({ pid: u16(c0 + 4 + i * 8), eid: u16(c0 + 6 + i * 8), off: c0 + u32(c0 + 8 + i * 8) });
  const chon = bangCon.find((x) => x.pid === 3 && x.eid === 10 && u16(x.off) === 12) ?? bangCon.find((x) => x.pid === 3 && x.eid === 1 && u16(x.off) === 4) ?? bangCon.find((x) => x.pid === 0 && u16(x.off) === 4);
  if (!chon) throw new Error(`Phông ${ten} không có bảng cmap Unicode`);
  if (u16(chon.off) === 12) {
    const nNhom = u32(chon.off + 12);
    for (let i = 0; i < nNhom; i++) {
      const g = chon.off + 16 + i * 12;
      const dau = u32(g), cuoi = u32(g + 4), gid = u32(g + 8);
      for (let c = dau; c <= cuoi; c++) cmap.set(c, gid + c - dau);
    }
  } else {
    const o = chon.off, seg = u16(o + 6) / 2;
    const ends = o + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
    for (let i = 0; i < seg; i++) {
      const e = u16(ends + i * 2), s = u16(starts + i * 2), d = i16(deltas + i * 2), ro = u16(ranges + i * 2);
      for (let c = s; c <= e && c !== 0xffff; c++) {
        let g: number;
        if (ro === 0) g = (c + d) & 0xffff;
        else {
          const gi = u16(ranges + i * 2 + ro + (c - s) * 2);
          g = gi === 0 ? 0 : (gi + d) & 0xffff;
        }
        if (g) cmap.set(c, g);
      }
    }
  }
  const loca = b("loca").off, glyf = b("glyf").off;
  const viTri = (g: number) => (locFmt === 0 ? u16(loca + g * 2) * 2 : u32(loca + g * 4));
  const thanh = (g: number): [number, number] => [viTri(g), viTri(g + 1)];

  const tapCon = (gids: Iterable<number>): Uint8Array => {
    const giu = new Set<number>([0]);
    const them = (g: number) => {
      if (g >= soGlyph || giu.has(g)) return;
      giu.add(g);
      const [a, z] = thanh(g);
      if (z <= a || i16(glyf + a) >= 0) return;
      // glyph ghép: lấy cả các glyph thành phần
      let p = glyf + a + 10;
      for (;;) {
        const co = u16(p);
        them(u16(p + 2));
        p += 4 + (co & 1 ? 4 : 2) + (co & 8 ? 2 : co & 0x40 ? 4 : co & 0x80 ? 8 : 0);
        if (!(co & 0x20)) break;
      }
    };
    for (const g of gids) them(g);
    // glyf mới (giữ số hiệu), loca dạng dài
    const phan: Uint8Array[] = [];
    const locaMoi = new DataView(new ArrayBuffer((soGlyph + 1) * 4));
    let dai = 0;
    for (let g = 0; g < soGlyph; g++) {
      locaMoi.setUint32(g * 4, dai);
      if (!giu.has(g)) continue;
      const [a, z] = thanh(g);
      if (z <= a) continue;
      const d = bytes.subarray(glyf + a, glyf + z);
      const pad = (4 - (d.length % 4)) % 4;
      phan.push(d, new Uint8Array(pad));
      dai += d.length + pad;
    }
    locaMoi.setUint32(soGlyph * 4, dai);
    const glyfMoi = new Uint8Array(dai);
    let k = 0;
    for (const p of phan) {
      glyfMoi.set(p, k);
      k += p.length;
    }
    const ds: [string, Uint8Array][] = [];
    for (const [t, x] of bang) {
      if (BO_BANG.has(t) || t === "glyf" || t === "loca") continue;
      let d = bytes.slice(x.off, x.off + x.len);
      if (t === "head") {
        d = d.slice();
        const hv = new DataView(d.buffer);
        hv.setUint32(8, 0); // checkSumAdjustment
        hv.setInt16(50, 1); // loca dạng dài
      }
      ds.push([t, d]);
    }
    ds.push(["glyf", glyfMoi], ["loca", new Uint8Array(locaMoi.buffer)]);
    return ghepTtf(ds);
  };

  return {
    ten,
    upm,
    ascender: i16(hhea + 4),
    descender: i16(hhea + 6),
    bbox: [i16(head + 36), i16(head + 38), i16(head + 40), i16(head + 42)],
    italicAngle: bang.has("post") ? dv.getInt32(b("post").off + 4) / 65536 : 0,
    soGlyph,
    cmap,
    rong,
    tapCon,
  };
}

function tongKiem(d: Uint8Array): number {
  const p = new Uint8Array(Math.ceil(d.length / 4) * 4);
  p.set(d);
  const v = new DataView(p.buffer);
  let s = 0;
  for (let i = 0; i < p.length; i += 4) s = (s + v.getUint32(i)) >>> 0;
  return s;
}

/** Ghép lại tệp TrueType từ danh sách bảng (sắp theo tên, căn 4 byte, tổng kiểm từng bảng). */
function ghepTtf(ds: [string, Uint8Array][]): Uint8Array {
  ds.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const n = ds.length;
  let mu = 1;
  while (mu * 2 <= n) mu *= 2;
  const dau = 12 + n * 16;
  let tong = dau;
  for (const [, d] of ds) tong += Math.ceil(d.length / 4) * 4;
  const ra = new Uint8Array(tong);
  const v = new DataView(ra.buffer);
  v.setUint32(0, 0x00010000);
  v.setUint16(4, n);
  v.setUint16(6, mu * 16);
  v.setUint16(8, Math.log2(mu));
  v.setUint16(10, n * 16 - mu * 16);
  let off = dau;
  ds.forEach(([t, d], i) => {
    const r = 12 + i * 16;
    for (let j = 0; j < 4; j++) ra[r + j] = t.charCodeAt(j);
    v.setUint32(r + 4, tongKiem(d));
    v.setUint32(r + 8, off);
    v.setUint32(r + 12, d.length);
    ra.set(d, off);
    off += Math.ceil(d.length / 4) * 4;
  });
  return ra;
}
