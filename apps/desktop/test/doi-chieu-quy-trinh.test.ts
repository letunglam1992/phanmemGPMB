import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAC_BUOC } from "../src/mo-hinh";
import { DOI_CHIEU_QUY_TRINH, chuanHoaChu } from "../src/doi-chieu-quy-trinh";
import { HAN_BUOC as BUOC_CO_HAN } from "../src/han-buoc";

const doc = (tep: string) => chuanHoaChu(readFileSync(new URL(`../../../policy/nguon/${tep}`, import.meta.url), "utf8"));
const nd151 = doc("nd151-2025-phan-dinh-tham-quyen-dat-dai.md");
const soTay = doc("qd1966-2025-so-tay-gpmb.md");

describe("1.2.0 (A3) — đối chiếu 16 bước với mục IV Phần II Phụ lục I NĐ 151/2025 và Sổ tay QĐ 1966", () => {
  it("đủ 16 bước, đúng thứ tự", () => expect(DOI_CHIEU_QUY_TRINH.map((d) => d.buoc)).toEqual(CAC_BUOC.map((b) => b.ma)));
  for (const d of DOI_CHIEU_QUY_TRINH)
    it(`bước ${d.buoc}: trích dẫn có nguyên văn trong văn bản gốc`, () => {
      if (d.trichNd151) expect(nd151).toContain(chuanHoaChu(d.trichNd151));
      if (d.soTay) expect(soTay).toContain(chuanHoaChu(d.soTay.trich));
    });
  it("bước có hạn trong phần mềm khớp nhận định đối chiếu", () => {
    for (const b of BUOC_CO_HAN) {
      const d = DOI_CHIEU_QUY_TRINH.find((x) => x.buoc === b.buoc)!;
      expect(d.danhGia, `bước ${b.buoc}`).not.toBe("KHONG_TINH");
    }
    expect(DOI_CHIEU_QUY_TRINH.find((x) => x.buoc === "8")!.danhGia).toBe("THEO_NGHI_DINH");
  });
});
