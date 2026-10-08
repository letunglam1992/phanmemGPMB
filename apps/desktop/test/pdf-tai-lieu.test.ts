import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { taiLieuBangTinh } from "../src/van-ban/bang-tinh-ho";
import { dungBoCuc, ngatDong, taoPdfNhieuAnh, type DoChu } from "../src/van-ban/pdf-tai-lieu";

const cs = cs0 as unknown as BoChinhSach;
// đo chữ giả: mỗi ký tự rộng 0,5 × cỡ chữ
const doChu: DoChu = (t, font) => t.length * 0.5 * Number(/([\d.]+)px/.exec(font)?.[1] ?? 20);

describe("Lưu PDF trực tiếp từ bảng tính, giải trình (1.0.5)", () => {
  it("ngắt dòng theo từ, không vượt bề rộng; xuống dòng cứng; từ quá dài ngắt theo ký tự", () => {
    const d = ngatDong([{ t: "một hai ba bốn năm sáu bảy tám" }, { t: "\nchín", dam: true }], 10, 60, doChu);
    for (const x of d) expect(x.rong).toBeLessThanOrEqual(60);
    expect(d.map((x) => x.manh.map((m) => m.t).join(""))).toContain("chín");
    expect(d.length).toBeGreaterThan(2);
    const dai = ngatDong([{ t: "x".repeat(50) }], 10, 60, doChu);
    expect(dai.length).toBe(5);
    expect(dai.every((x) => x.rong <= 60)).toBe(true);
  });

  it("dàn trang A4: chữ nằm trong lề, bảng nhiều trang lặp dòng tiêu đề, đánh số trang, đủ nội dung", () => {
    const { duAn, ho } = taoDuAnMau();
    const h = ho[0]!;
    const kq = tinhHo(cs, duAn, h);
    const tl = taiLieuBangTinh(duAn, h, kq, new Date("2026-10-07T00:00:00"));
    const bc = dungBoCuc(tl, doChu);
    expect(bc.rong).toBe(1240);
    expect(bc.cao).toBe(1754);
    expect(bc.trang.length).toBeGreaterThan(1);
    const tatCa = bc.trang.flat();
    for (const l of tatCa) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.y).toBeLessThan(bc.cao);
      if (l.k === "chu") expect(l.x + doChu(l.t, l.font)).toBeLessThanOrEqual(bc.rong - 100);
    }
    const chu = bc.trang.map((ds) => ds.filter((l) => l.k === "chu").map((l) => (l as { t: string }).t).join(" "));
    expect(chu[0]).toContain("BẢNG");
    expect(chu[bc.trang.length - 1]).toContain(`Trang ${bc.trang.length}/${bc.trang.length}`);
    // trang nào có bảng (khung) thì dòng tiêu đề bảng được tô nền
    for (const ds of bc.trang) if (ds.some((l) => l.k === "khung")) expect(ds.some((l) => l.k === "nen" && l.mau === "#E8EEF6")).toBe(true);
    const gop = chu.join(" ");
    for (const s of ["thực", "nhận"]) expect(gop).toContain(s);
  });

  it("PDF nhiều trang: cấu trúc hợp lệ, đúng số trang, bảng xref trỏ đúng đối tượng", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const pdf = taoPdfNhieuAnh([{ jpeg, rongPx: 10, caoPx: 14 }, { jpeg, rongPx: 10, caoPx: 14 }, { jpeg, rongPx: 10, caoPx: 14 }], { w: 210, h: 297 }, "Bảng tính");
    const s = new TextDecoder("latin1").decode(pdf);
    expect(s.startsWith("%PDF-1.4")).toBe(true);
    expect(s).toContain("/Count 3");
    expect((s.match(/\/Type \/Page /g) ?? []).length).toBe(3);
    const xref = s.slice(s.lastIndexOf("\nxref\n") + 1);
    const vt = [...xref.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(vt.length).toBe(3 + 3 * 3);
    vt.forEach((v, i) => expect(s.slice(v, v + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
    expect(Number(/startxref\n(\d+)/.exec(s)![1])).toBe(s.lastIndexOf("\nxref\n") + 1);
  });
});
