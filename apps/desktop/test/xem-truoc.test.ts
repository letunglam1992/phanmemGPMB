import { readFileSync } from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { DANH_MUC_MAU, tepMau } from "../src/van-ban/danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { dienMau } from "../src/van-ban/dien-mau";
import { docxSangHtml } from "../src/van-ban/xem-truoc";

(globalThis as unknown as { DOMParser: unknown }).DOMParser ??= DOMParser;
const cs = cs0 as unknown as BoChinhSach;

describe("1.2.0 (C2) — xem trước văn bản (HTML từ .docx đã điền)", () => {
  const { duAn, ho } = taoDuAnMau();
  const h = ho[0]!;
  const ds = [{ h, k: tinhHo(cs, duAn, h) }];
  for (const ma of ["15", "T5", "T26", "R2"]) {
    it(`mẫu ${ma}: có quốc hiệu, tên hộ/dự án, bảng; ký tự đặc biệt được thoát`, () => {
      const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
      const du = ghepDuLieu({ mau: m, duAn: { ...duAn, ten: `${duAn.ten} <A&B>` }, ds, ho: m.phamVi === "HO" ? ds[0] : undefined, chung: thongTinChungMacDinh(duAn), rieng: {}, so: "12", ngayKy: "2026-10-20" });
      const html = docxSangHtml(dienMau(readFileSync(new URL(`../public/mau-van-ban/${tepMau(m)}`, import.meta.url)), du));
      expect(html).toMatch(/CỘNG H(ÒA|OÀ) XÃ HỘI CHỦ NGHĨA VIỆT NAM/);
      expect(html).toContain("text-align:center");
      expect(html).toContain("<table");
      expect(html).not.toContain("<A&B>");
      if (ma === "T5" || ma === "T26") expect(html).toContain("&lt;A&amp;B&gt;");
      expect(html).not.toMatch(/<script/i);
    });
  }
});
