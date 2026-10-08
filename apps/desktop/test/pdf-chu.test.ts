import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { taiLieuBangTinh } from "../src/van-ban/bang-tinh-ho";
import { docTtf } from "../src/van-ban/phong-ttf";
import { doChuPhong, napPhong, taoPdfChu } from "../src/van-ban/pdf-chu";

const doc = async (t: string) => new Uint8Array(readFileSync(new URL(`../public/phong/${t}`, import.meta.url)));
const cs = cs0 as unknown as BoChinhSach;

describe("PDF có chữ thật, nhúng tập con phông (1.0.6)", () => {
  it("đọc phông: đủ chữ Việt; độ rộng; tập con giữ số hiệu glyph, đọc lại được, nhỏ hơn nhiều", async () => {
    const p = docTtf(await doc("LiberationSerif-Regular.ttf"), "LiberationSerif-Regular");
    expect(p.upm).toBe(2048);
    for (const c of "ẢẠẮẰẲẴẶỆỨỮựỹđĐ₫²") expect(p.cmap.get(c.codePointAt(0)!), c).toBeGreaterThan(0);
    const bo = await napPhong(doc);
    const w = doChuPhong(bo);
    expect(w("Hộ", '13px "Times New Roman", serif')).toBeGreaterThan(0);
    expect(w("Hộ", 'bold 13px "Times New Roman", serif')).not.toBe(w("Hộ", '13px "Times New Roman", serif'));
    const gid = [..."Thửa đất"].map((c) => p.cmap.get(c.codePointAt(0)!)!);
    const tap = p.tapCon(gid);
    expect(tap.length).toBeLessThan(100_000);
    const p2 = docTtf(tap, "con");
    expect(p2.soGlyph).toBe(p.soGlyph);
    for (const g of gid) expect(p2.rong(g)).toBe(p.rong(g));
  });

  it("bảng tính hộ → PDF: cấu trúc hợp lệ, phông nhúng, ToUnicode chứa chữ Việt, xref đúng", async () => {
    const { duAn, ho } = taoDuAnMau();
    const tl = taiLieuBangTinh(duAn, ho[0]!, tinhHo(cs, duAn, ho[0]!), new Date("2026-10-07T00:00:00"));
    const pdf = await taoPdfChu(tl, await napPhong(doc));
    const s = Buffer.from(pdf).toString("latin1");
    expect(s.startsWith("%PDF-1.7")).toBe(true);
    expect(Number(/\/Count (\d+)/.exec(s)![1])).toBeGreaterThanOrEqual(2);
    expect(s).toContain("/Subtype /CIDFontType2");
    expect(s).toContain("/FontFile2");
    expect(s).toContain("/Encoding /Identity-H");
    const xref = s.slice(s.lastIndexOf("\nxref\n") + 1);
    const vt = [...xref.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    vt.forEach((v, i) => expect(s.slice(v, v + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
    // giải nén các luồng: có ToUnicode ánh xạ ký tự "ử" (U+1EED), có lệnh vẽ chữ
    const luong = [...s.matchAll(/\/FlateDecode \/Length (\d+) >>\nstream\n/g)].map((m) => inflateSync(Buffer.from(s.substr(m.index! + m[0].length, Number(m[1])), "latin1")).toString("latin1"));
    expect(luong.some((x) => x.includes("beginbfchar") && /<1eed>/i.test(x))).toBe(true);
    expect(luong.some((x) => / Tf .* Td <[0-9a-f]+> Tj ET/.test(x))).toBe(true);
    expect(pdf.length).toBeLessThan(600_000);
  });
});
