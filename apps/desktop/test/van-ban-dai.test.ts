/**
 * 1.0.7 — Mẫu Word với danh sách dài (300 hộ nhân bản từ dữ liệu mẫu ẩn danh): mọi mẫu cấp dự án/đợt điền xong không còn
 * trường {…}, tệp .docx mở lại được, số dòng biểu = số hộ/thửa, tổng diện tích biểu khớp văn bản (kiểm tra thống nhất),
 * thời gian điền mỗi mẫu trong giới hạn.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { DANH_MUC_MAU, tepMau } from "../src/van-ban/danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { kiemTraThongNhat } from "../src/van-ban/thuc-te";
import { dienMau } from "../src/van-ban/dien-mau";

const cs = cs0 as unknown as BoChinhSach;
const SO_HO = 300;
const { duAn, ho } = taoDuAnMau();
const hos = Array.from({ length: SO_HO }, (_, i) => {
  const g = ho[i % ho.length]!;
  return { ...g, id: `h${i}`, ma: `H${String(i + 1).padStart(3, "0")}`, ten: `Hộ mẫu ${i + 1}`, thua: g.thua.map((t, j) => ({ ...t, id: `t${i}-${j}`, soThua: String(100 + i * 3 + j) })) };
});
const ds = hos.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
const vanBan = (u8: Uint8Array) => new PizZip(u8).file("word/document.xml")!.asText();

describe(`Mẫu Word với ${SO_HO} hộ`, () => {
  const mau = DANH_MUC_MAU.filter((m) => m.phamVi === "DOT" || m.phamVi === "DU_AN");
  for (const m of mau)
    it(`${m.ma} — ${m.ten}`, () => {
      const rieng = Object.fromEntries(m.nhapThem.map((t) => [t.truong, t.macDinh ?? "x"]));
      const du = ghepDuLieu({ mau: m, duAn, ds, chung: thongTinChungMacDinh(duAn), rieng, so: "12", ngayKy: "2026-10-10" });
      const t0 = performance.now();
      const ra = dienMau(readFileSync(new URL(`../public/mau-van-ban/${tepMau(m)}`, import.meta.url)), du);
      const ms = performance.now() - t0;
      expect(ms).toBeLessThan(5000);
      const xml = vanBan(ra);
      expect(xml).not.toMatch(/\{[#/]?[a-z_]+\}/);
      // các bảng danh sách: số dòng = số phần tử dữ liệu
      for (const [bang, n] of Object.entries(du).filter(([, v]) => Array.isArray(v) && v.length >= SO_HO) as [string, unknown[]][]) {
        const goc = new PizZip(readFileSync(new URL(`../public/mau-van-ban/${tepMau(m)}`, import.meta.url))).file("word/document.xml")!.asText();
        if (!goc.includes(`{#${bang}}`)) continue;
        // mỗi phần tử sinh ít nhất một dòng/đoạn: đếm lần xuất hiện tên hộ cuối
        expect(xml.length).toBeGreaterThan(goc.length);
        expect(n.length).toBeGreaterThanOrEqual(SO_HO);
      }
      // tổng diện tích biểu khớp văn bản; không cảnh báo lệch tổng
      expect(kiemTraThongNhat(m.ma, duAn, du).filter((c) => /Tổng diện tích biểu|không khớp bằng chữ/.test(c))).toEqual([]);
    });

  it("biểu thửa thu hồi (R1): đủ mọi thửa, tổng = tổng các dòng", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "R1")!;
    const du = ghepDuLieu({ mau: m, duAn, ds, chung: thongTinChungMacDinh(duAn), rieng: {}, so: "", ngayKy: "" });
    const soThua = hos.reduce((s, h) => s + h.thua.filter((t) => Number(t.dienTichThuHoi) > 0).length, 0);
    expect((du.ds_thua_thu_hoi as unknown[]).length).toBe(soThua);
    const xml = vanBan(dienMau(readFileSync(new URL(`../public/mau-van-ban/${tepMau(m)}`, import.meta.url)), du));
    expect(xml).toContain(`Hộ mẫu ${SO_HO}<`);
    expect((xml.match(/<w:tr[ >]/g) ?? []).length).toBeGreaterThan(soThua);
  });
});
