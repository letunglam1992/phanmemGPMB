import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { VIEC_THU, taoBieuMauThu } from "../src/bieu-mau-thu";
import { docViecThu } from "../src/doc-viec-thu";

describe("Biểu ghi kết quả thử trên máy thật (1.0.5)", () => {
  it("đọc đúng các nhóm A… và dòng việc chưa đánh dấu từ docs/22", () => {
    const n = docViecThu("## 2\n### A. Thử x\n- [ ] Việc **một** `a.ts`\n- [x] đã xong\n### B. Lập trình\n- [ ] không lấy\n### A5. Thử 1.0.5\n- [ ] Việc hai\n## 3\n- [ ] không lấy");
    expect(n).toEqual([{ ten: "A. Thử x", viec: ["Việc một a.ts"] }, { ten: "A5. Thử 1.0.5", viec: ["Việc hai"] }]);
    expect(VIEC_THU.some((x) => x.ten.startsWith("A5."))).toBe(true);
    expect(VIEC_THU.every((x) => !x.ten.startsWith("B"))).toBe(true);
    // viec-thu.json khớp docs/22 — lệch thì chạy: node tools/tao-viec-thu.mjs
    expect(VIEC_THU).toEqual(docViecThu(readFileSync(new URL("../../../docs/22-ghi-chu-tien-do.md", import.meta.url), "utf8")));
  });
  it("tệp Excel có đủ mọi việc, cột Đạt / Không đạt / Ghi chú", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoBieuMauThu()).buffer as ArrayBuffer);
    const ws = wb.getWorksheet("Kết quả thử")!;
    const chu: string[] = [];
    ws.eachRow((r) => chu.push(String(r.getCell(2).value ?? "")));
    for (const n of VIEC_THU) for (const v of n.viec) expect(chu).toContain(v);
    const dau = ws.getRow(7).values as string[];
    expect(dau).toContain("Đạt (x)");
    expect(dau).toContain("Không đạt (x)");
  });
});
