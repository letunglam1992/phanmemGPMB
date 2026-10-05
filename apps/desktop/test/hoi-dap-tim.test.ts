/** Hỏi đáp: tìm đoạn văn bản liên quan trong kho tri thức (chạy trên máy). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { taoChiMuc, timDoan, tachTu, boDau, type KhoTriThuc } from "../src/hoi-dap/tim-kiem";

const kho = JSON.parse(readFileSync(new URL("../public/tri-thuc/kho.json", import.meta.url), "utf8")) as KhoTriThuc;
const cm = taoChiMuc(kho.doan);
describe("Tìm đoạn tri thức", () => {
  it("bỏ dấu, từ dừng, cặp từ", () => {
    expect(boDau("Đất ở")).toBe("dat o");
    expect(tachTu("Hỗ trợ ổn định đời sống")).toContain("on_dinh");
  });
  it("hỗ trợ ổn định đời sống → Điều 12 NĐ 88 hoặc QĐ 106", () => {
    const r = timDoan(cm, "Hỗ trợ ổn định đời sống khi thu hồi đất nông nghiệp tính thế nào?", 5);
    expect(r.length).toBeGreaterThan(0);
    expect(r.slice(0, 3).some((x) => /Điều 12|ổn định đời sống/i.test(x.doan.tieuDe + x.doan.noiDung))).toBe(true);
  });
  it("hạn mức công nhận đất ở trước 1980 → Phụ lục I QĐ 106 Điều 3", () => {
    const r = timDoan(cm, "hạn mức công nhận đất ở sử dụng trước ngày 18/12/1980", 3);
    expect(r[0]!.doan.nguon).toContain("Phụ lục I");
    expect(r[0]!.doan.tieuDe).toMatch(/Điều 3/);
  });
  it("nêu số Điều được ưu tiên; câu hỏi rỗng trả rỗng", () => {
    const r = timDoan(cm, "Điều 6 hỗ trợ khác", 3);
    expect(r[0]!.doan.tieuDe).toMatch(/^Điều 6/);
    expect(timDoan(cm, "là của và", 3)).toEqual([]);
  });
  it("Luật Đất đai hợp nhất (VBHN 44/VBHN-VPQH): trình tự bồi thường, thu hồi → Điều 87; điều kiện bồi thường đất → Điều 95", () => {
    expect(kho.doan.filter((d) => d.nguon.startsWith("Luật Đất đai")).length).toBeGreaterThan(250);
    const r = timDoan(cm, "trình tự thủ tục bồi thường hỗ trợ tái định cư thu hồi đất Điều 87 Luật Đất đai", 5);
    expect(r.some((x) => x.doan.nguon.startsWith("Luật Đất đai") && /^Điều 87\./.test(x.doan.tieuDe))).toBe(true);
    const r2 = timDoan(cm, "điều kiện được bồi thường về đất khi Nhà nước thu hồi đất", 5);
    expect(r2.some((x) => x.doan.nguon.startsWith("Luật Đất đai") && /^Điều 95\./.test(x.doan.tieuDe))).toBe(true);
  });
});
