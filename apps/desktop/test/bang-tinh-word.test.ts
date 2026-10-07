import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { taiLieuBangTinh } from "../src/van-ban/bang-tinh-ho";
import { taoDocx, taoHtmlIn } from "../src/van-ban/tai-lieu-don-gian";

const cs = cs0 as unknown as BoChinhSach;

describe("Bảng tính, giải trình hộ → Word / in (1.0.4)", () => {
  const { duAn, ho } = taoDuAnMau();
  const h = { ...ho[0]!, thua: ho[0]!.thua.map((t, i) => (i === 0 ? { ...t, lyTrinh: { tu: 1200, den: 1350 } } : t)) };
  const kq = tinhHo(cs, duAn, h);
  const tl = taiLieuBangTinh(duAn, h, kq, new Date("2026-10-07T00:00:00"));

  it("docx hợp lệ, đủ các phần, mọi khoản và căn cứ, tổng thực nhận khớp kết quả tính", () => {
    const zip = new PizZip(taoDocx(tl));
    for (const f of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels"]) expect(zip.file(f)).toBeTruthy();
    const xml = zip.file("word/document.xml")!.asText();
    const loi: string[] = [];
    new DOMParser({ onError: (_l: string, m: string) => void loi.push(m) }).parseFromString(xml, "text/xml");
    expect(loi).toEqual([]);
    const chu = xml.replace(/<w:br\/>/g, "\n").replace(/<[^>]+>/g, "").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
    for (const s of ["BẢNG TÍNH CHI TIẾT BỒI THƯỜNG, HỖ TRỢ VÀ GIẢI TRÌNH", "I. THỬA ĐẤT BỊ THU HỒI", "II. BẢNG TÍNH CHI TIẾT", "III. GIẢI TRÌNH TỪNG KHOẢN", h.ten, "Km1+200 – Km1+350", "Số tiền thực nhận"]) expect(chu).toContain(s);
    for (const x of kq.tatCa) {
      expect(chu).toContain(x.dong.noiDung);
      for (const c of x.dong.canCu) expect(chu).toContain(c.vanBan);
    }
    expect(chu).toContain(kq.conLai.toNumber().toLocaleString("vi-VN"));
    // số ô mỗi dòng bảng khớp lưới cột (tính cả ô gộp)
    for (const tbl of xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g)!) {
      const soCot = (tbl.match(/<w:gridCol /g) ?? []).length;
      for (const tr of tbl.match(/<w:tr>[\s\S]*?<\/w:tr>/g)!) {
        const o = (tr.match(/<w:tc>/g) ?? []).length + (tr.match(/<w:gridSpan w:val="(\d+)"\/>/g) ?? []).reduce((s, g) => s + Number(/\d+/.exec(g)![0]) - 1, 0);
        expect(o).toBe(soCot);
      }
    }
  });

  it("HTML in: khổ ngang/dọc, bảng có tiêu đề lặp, thoát ký tự", () => {
    const html = taoHtmlIn({ ...tl, khoi: [...tl.khoi, { loai: "doan", chu: ["<script>a & b</script>"] }] });
    expect(html).toContain("size: A4 portrait");
    expect(html).toContain("thead { display: table-header-group; }");
    expect(html).toContain("&lt;script&gt;a &amp; b&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
