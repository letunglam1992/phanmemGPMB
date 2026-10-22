/**
 * 1.1.0 (D2) — Thể thức mọi mẫu Word theo Phụ lục I NĐ 30/2020/NĐ-CP (kỹ thuật trình bày văn bản hành chính): khổ A4; lề trên,
 * dưới 20–25 mm, trái 30–35 mm, phải 15–20 mm; phông Times New Roman (Symbol, Wingdings chỉ dùng cho ký hiệu đầu dòng); cỡ chữ
 * phần nội dung 13–14 — kiểm cỡ mặc định của tài liệu. In thử bằng LibreOffice: xem docs/22.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";

const THU_MUC = new URL("../public/mau-van-ban/", import.meta.url);
const tep = readdirSync(THU_MUC).filter((f) => f.endsWith(".docx")).sort();
const mm = (twip: number) => twip / 56.7;

describe("Thể thức mẫu văn bản (NĐ 30/2020/NĐ-CP)", () => {
  it("đủ 54 mẫu", () => expect(tep.length).toBe(54));
  for (const f of tep)
    it(f, () => {
      const z = new PizZip(readFileSync(new URL(f, THU_MUC)));
      const doc = z.file("word/document.xml")!.asText();
      const st = z.file("word/styles.xml")?.asText() ?? "";
      const pg = doc.match(/<w:pgSz [^>]*>/)![0];
      expect(Number(pg.match(/w:w="(\d+)"/)![1])).toBe(11906);
      expect(Number(pg.match(/w:h="(\d+)"/)![1])).toBe(16838);
      const mar = doc.match(/<w:pgMar [^>]*>/)![0];
      const le = (k: string) => mm(Number(mar.match(new RegExp(`w:${k}="(\\d+)"`))![1]));
      expect(le("top")).toBeGreaterThanOrEqual(19.9);
      expect(le("top")).toBeLessThanOrEqual(25.1);
      expect(le("bottom")).toBeGreaterThanOrEqual(19.9);
      expect(le("bottom")).toBeLessThanOrEqual(25.1);
      expect(le("left")).toBeGreaterThanOrEqual(29.9);
      expect(le("left")).toBeLessThanOrEqual(35.1);
      expect(le("right")).toBeGreaterThanOrEqual(14.9);
      expect(le("right")).toBeLessThanOrEqual(20.1);
      const phong = new Set([...(doc + st).matchAll(/w:(?:ascii|hAnsi|cs|eastAsia)="([^"]+)"/g)].map((m) => m[1]!));
      expect([...phong].filter((p) => !["Times New Roman", "Symbol", "Wingdings"].includes(p))).toEqual([]);
      const coMacDinh = st.match(/<w:docDefaults>[\s\S]*?<w:sz w:val="(\d+)"/)?.[1];
      // mẫu có văn bản gốc của địa phương (rieng-*) đặt cỡ ở từng đoạn; mẫu dựng bằng công cụ: mặc định 13–14
      if (!f.startsWith("rieng-")) expect(Number(coMacDinh)).toBeGreaterThanOrEqual(26);
    });
});
