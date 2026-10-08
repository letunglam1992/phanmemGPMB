/**
 * 1.0.5 — Lưu PDF trực tiếp từ tài liệu đơn giản (bảng tính, giải trình hộ), không qua hộp in của hệ điều hành: dàn trang
 * A4 (lề 20/20/20/30 mm, Times New Roman), bảng tự xuống dòng trong ô, lặp dòng tiêu đề bảng khi sang trang, đánh số trang;
 * vẽ từng trang lên canvas rồi nhúng ảnh JPEG vào PDF nhiều trang (không thư viện ngoài, không gửi dữ liệu ra ngoài).
 * Dùng khi bản cài không in được (WebView2 không mở hộp in, máy không có máy in PDF). Hạn chế: chữ trong PDF là ảnh
 * (không chọn, không tìm được chữ), độ phân giải 150 dpi.
 */
import type { Chu, Doan, TaiLieu } from "./tai-lieu-don-gian";

export type Lenh =
  | { k: "chu"; x: number; y: number; t: string; font: string; mau: string }
  | { k: "nen"; x: number; y: number; w: number; h: number; mau: string }
  | { k: "khung"; x: number; y: number; w: number; h: number };
export interface BoCuc {
  rong: number;
  cao: number;
  kho: { w: number; h: number };
  trang: Lenh[][];
}
export type DoChu = (t: string, font: string) => number;

type Manh = { t: string; font: string; mau: string; w: number };
type Dong = { manh: Manh[]; rong: number };

const fontCua = (c: Chu, px: number) => `${c.nghieng ? "italic " : ""}${c.dam ? "bold " : ""}${px.toFixed(1)}px "Times New Roman", serif`;

/** Ngắt dòng một đoạn chữ nhiều kiểu trong bề rộng cho trước (theo từ; từ dài hơn dòng thì ngắt theo ký tự). */
export function ngatDong(chu: Chu[], px: number, rongToiDa: number, doChu: DoChu): Dong[] {
  const ds: Dong[] = [];
  let cur: Dong = { manh: [], rong: 0 };
  const xong = () => {
    while (cur.manh.length && !cur.manh[cur.manh.length - 1]!.t.trim()) cur.rong -= cur.manh.pop()!.w;
    ds.push(cur);
    cur = { manh: [], rong: 0 };
  };
  const them = (t: string, font: string, mau: string, w: number) => {
    cur.manh.push({ t, font, mau, w });
    cur.rong += w;
  };
  for (const c of chu) {
    const font = fontCua(c, px);
    const mau = c.mau ? `#${c.mau}` : "#000";
    c.t.split("\n").forEach((dongChu, i) => {
      if (i > 0) xong();
      for (const tu of dongChu.split(/(\s+)/).filter(Boolean)) {
        const trang = !tu.trim();
        if (trang && !cur.manh.length) continue;
        const w = doChu(tu, font);
        if (!trang && cur.rong + w > rongToiDa && cur.manh.length) xong();
        if (!trang && w > rongToiDa) {
          let phan = "";
          for (const k of tu) {
            if (doChu(phan + k, font) > rongToiDa - cur.rong && (phan || cur.manh.length)) {
              if (phan) them(phan, font, mau, doChu(phan, font));
              xong();
              phan = "";
            }
            phan += k;
          }
          if (phan) them(phan, font, mau, doChu(phan, font));
          continue;
        }
        them(tu, font, mau, w);
      }
    });
  }
  if (cur.manh.length || !ds.length) xong();
  return ds;
}

/** Dàn trang tài liệu → lệnh vẽ từng trang (đơn vị: điểm ảnh ở dpi cho trước). */
export function dungBoCuc(tl: TaiLieu, doChu: DoChu, dpi = 150): BoCuc {
  const kho = tl.ngang ? { w: 297, h: 210 } : { w: 210, h: 297 };
  const mm = (v: number) => (v / 25.4) * dpi;
  const pt = (v: number) => (v / 72) * dpi;
  const rong = Math.round(mm(kho.w)), cao = Math.round(mm(kho.h));
  const trai = mm(30), phai = rong - mm(20), tren = mm(20), duoi = cao - mm(20);
  const rongND = phai - trai;
  const trang: Lenh[][] = [[]];
  let y = tren;
  const tg = () => trang[trang.length - 1]!;
  const sangTrang = () => {
    trang.push([]);
    y = tren;
  };
  const veDong = (d: Dong, x0: number, w: number, canh: string | undefined, yy: number, ds: Lenh[]) => {
    let x = canh === "giua" ? x0 + (w - d.rong) / 2 : canh === "phai" ? x0 + w - d.rong : x0;
    for (const m of d.manh) {
      if (m.t.trim()) ds.push({ k: "chu", x, y: yy, t: m.t, font: m.font, mau: m.mau });
      x += m.w;
    }
  };
  const doan = (chu: Chu[], o: { co: number; canh?: string; truoc: number; sau: number }) => {
    const px = pt(o.co), cd = px * 1.25;
    const dong = ngatDong(chu, px, rongND, doChu);
    y += pt(o.truoc);
    if (y > tren && y + cd > duoi) sangTrang();
    for (const d of dong) {
      if (y + cd > duoi) sangTrang();
      veDong(d, trai, rongND, o.canh, y, tg());
      y += cd;
    }
    y += pt(o.sau);
  };
  const bang = (b: Extract<Doan, { loai: "bang" }>) => {
    const tong = b.cot.reduce((s, c) => s + c.rong, 0);
    const w = b.cot.map((c) => (c.rong / tong) * rongND);
    const px = pt(11), cd = px * 1.22, dem = pt(2.5);
    type O = { x: number; w: number; dong: Dong[]; canh?: string; cd: number };
    const dungDong = (oo: (string | Chu[])[], dam: boolean, gopO: number, laDau: boolean): O[] => {
      const ra: O[] = [];
      let i = 0, x = trai;
      oo.forEach((v, k) => {
        const g = k === 1 ? gopO : 1;
        const ww = w.slice(i, i + g).reduce((s, z) => s + z, 0);
        const chu = (typeof v === "string" ? [{ t: v }] : v).map((c) => ({ ...c, dam: c.dam || dam }));
        // ô hẹp: từ dài nhất (số tiền, chữ) không vừa thì giảm cỡ chữ của ô (tối thiểu 7,5 pt) thay vì ngắt giữa từ
        const dai = Math.max(0, ...chu.flatMap((c) => c.t.split(/\s+/).map((tu) => doChu(tu, fontCua(c, px)))));
        const pxO = dai > ww - 2 * dem ? Math.max(pt(7.5), (px * (ww - 2 * dem)) / dai) : px;
        ra.push({ x, w: ww, dong: ngatDong(chu, pxO, ww - 2 * dem, doChu), canh: laDau ? "giua" : g === 1 && b.cot[i]?.so ? "phai" : undefined, cd: pxO * 1.22 });
        x += ww;
        i += g;
      });
      while (i < b.cot.length) {
        ra.push({ x, w: w[i]!, dong: [], cd });
        x += w[i]!;
        i++;
      }
      return ra;
    };
    const caoDong = (oo: O[]) => Math.max(cd, ...oo.map((o) => o.dong.length * o.cd)) + 2 * dem;
    const ve = (oo: O[], h: number, nen?: string) => {
      for (const o of oo) {
        if (nen) tg().push({ k: "nen", x: o.x, y, w: o.w, h, mau: nen });
        tg().push({ k: "khung", x: o.x, y, w: o.w, h });
        o.dong.forEach((d, j) => veDong(d, o.x + dem, o.w - 2 * dem, o.canh, y + dem + j * o.cd, tg()));
      }
      y += h;
    };
    const dau = dungDong(b.cot.map((c) => c.ten), true, 1, true);
    const hDau = caoDong(dau);
    if (y + hDau + cd * 2 > duoi && y > tren) sangTrang();
    ve(dau, hDau, "#E8EEF6");
    for (const d of b.dong) {
      const oo = dungDong(d.o, d.kieu === "nhom" || d.kieu === "tong", d.gop ?? 1, false);
      const h = caoDong(oo);
      if (y + h > duoi) {
        sangTrang();
        ve(dau, hDau, "#E8EEF6");
      }
      ve(oo, h, d.kieu === "nhom" ? "#F2F2F2" : undefined);
    }
    y += pt(8);
  };
  for (const k of tl.khoi) {
    if (k.loai === "tieu-de") {
      // tiêu đề không đứng một mình cuối trang
      if (y + pt(13) * 1.25 * 3 > duoi && y > tren) sangTrang();
      doan([{ t: k.chu, dam: true }], { co: k.cap === 1 ? 14 : 13, canh: k.cap === 1 ? "giua" : undefined, truoc: k.cap === 1 ? 0 : 8, sau: 4 });
    } else if (k.loai === "doan") doan(k.chu.map((c) => (typeof c === "string" ? { t: c } : c)), { co: k.co ?? 13, canh: k.canh === "deu" ? undefined : k.canh, truoc: k.truoc ?? 0, sau: 3 });
    else bang(k);
  }
  const font = `${pt(10).toFixed(1)}px "Times New Roman", serif`;
  trang.forEach((ds, i) => {
    const t = `Trang ${i + 1}/${trang.length}`;
    ds.push({ k: "chu", x: phai - doChu(t, font), y: duoi + mm(6), t, font, mau: "#555" });
  });
  return { rong, cao, kho, trang };
}

/** PDF nhiều trang, mỗi trang một ảnh JPEG phủ kín trang (mm). */
export function taoPdfNhieuAnh(ds: { jpeg: Uint8Array; rongPx: number; caoPx: number }[], khoMm: { w: number; h: number }, tieuDe: string): Uint8Array {
  const pt = (mm: number) => Math.round((mm / 25.4) * 72 * 100) / 100;
  const W = pt(khoMm.w), H = pt(khoMm.h);
  const enc = new TextEncoder();
  const hex = (s: string) => "FEFF" + [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase();
  const n = ds.length;
  // 1 Catalog, 2 Pages, 3 Info, rồi mỗi trang 3 đối tượng: Page, Image, Contents
  const so = (i: number, k: number) => 4 + i * 3 + k;
  const noiDung = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  const obj: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    [`<< /Type /Pages /Kids [${ds.map((_, i) => `${so(i, 0)} 0 R`).join(" ")}] /Count ${n} >>`],
    [`<< /Title <${hex(tieuDe)}> /Producer (GPMB Son La) >>`],
  ];
  ds.forEach((a, i) => {
    obj.push([`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${so(i, 1)} 0 R >> >> /Contents ${so(i, 2)} 0 R >>`]);
    obj.push([`<< /Type /XObject /Subtype /Image /Width ${a.rongPx} /Height ${a.caoPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${a.jpeg.length} >>\nstream\n`, a.jpeg, "\nendstream"]);
    obj.push([`<< /Length ${noiDung.length} >>\nstream\n${noiDung}\nendstream`]);
  });
  const phan: Uint8Array[] = [enc.encode("%PDF-1.4\n%âãÏÓ\n")];
  let vt = phan[0]!.length;
  const xref: number[] = [];
  obj.forEach((o, i) => {
    xref.push(vt);
    for (const d of [enc.encode(`${i + 1} 0 obj\n`), ...o.map((x) => (typeof x === "string" ? enc.encode(x) : x)), enc.encode("\nendobj\n")]) {
      phan.push(d);
      vt += d.length;
    }
  });
  phan.push(enc.encode(`xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${xref.map((x) => `${String(x).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${vt}\n%%EOF\n`));
  const out = new Uint8Array(phan.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of phan) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}

/** Tài liệu → PDF (vẽ bằng canvas của trình duyệt / WebView2). */
export async function taoPdfTaiLieu(tl: TaiLieu, dpi = 150): Promise<Uint8Array> {
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("Máy không hỗ trợ vẽ canvas để tạo PDF.");
  const doChu: DoChu = (t, font) => {
    if (font) ctx.font = font;
    return ctx.measureText(t).width;
  };
  const bc = dungBoCuc(tl, doChu, dpi);
  cv.width = bc.rong;
  cv.height = bc.cao;
  const anh: { jpeg: Uint8Array; rongPx: number; caoPx: number }[] = [];
  for (const ds of bc.trang) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, bc.rong, bc.cao);
    ctx.textBaseline = "top";
    ctx.lineWidth = Math.max(1, dpi / 150);
    ctx.strokeStyle = "#808080";
    for (const l of ds) {
      if (l.k === "nen") {
        ctx.fillStyle = l.mau;
        ctx.fillRect(l.x, l.y, l.w, l.h);
      } else if (l.k === "khung") ctx.strokeRect(l.x, l.y, l.w, l.h);
      else {
        ctx.font = l.font;
        ctx.fillStyle = l.mau;
        ctx.fillText(l.t, l.x, l.y);
      }
    }
    const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", 0.9));
    if (!blob) throw new Error("Không tạo được ảnh trang PDF.");
    anh.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), rongPx: bc.rong, caoPx: bc.cao });
  }
  return taoPdfNhieuAnh(anh, bc.kho, tl.tieuDe);
}
