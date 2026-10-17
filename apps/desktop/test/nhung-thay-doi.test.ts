import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mucMoiHon, soPhienBan, tachThayDoi } from "../src/nhung-thay-doi";
// @ts-expect-error công cụ .mjs không có khai báo kiểu
import { ghiChu } from "../../../tools/ghi-chu-phat-hanh.mjs";

const md = readFileSync(new URL("../../../docs/nhung-thay-doi.md", import.meta.url), "utf8");
const pb = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;

describe("1.0.11 — Những thay đổi, ghi chú phát hành", () => {
  it("có mục cho phiên bản đang ghi trong package.json (thiếu thì CI phát hành dừng)", () => {
    expect(tachThayDoi(md)!.map((m) => m.pb)).toContain(pb);
    expect(ghiChu(md, pb)).toMatch(new RegExp(`^## ${pb.replace(/\./g, "\\.")}`));
    expect(ghiChu(md, "0.0.1")).toBeNull();
    // 1.0.18: tệp lấy về trên Windows có CRLF → ghi chú không còn \r, phần mềm đọc như nhau
    const crlf = md.replace(/\n/g, "\r\n");
    expect(ghiChu(crlf, pb)).toBe(ghiChu(md, pb));
    expect(ghiChu(crlf, pb)).not.toContain("\r");
    expect(tachThayDoi(crlf)).toEqual(tachThayDoi(md));
  });

  it("phần mềm hiện mọi mục mới hơn bản đang dùng, đến bản mới; ghi chú cũ không có mục → null", () => {
    const g = "## 1.0.11\n\n- A **đậm**\n  nối dòng\n- B\n\n## 1.0.10\n\n- C\n\n## 1.0.9\n\n- D";
    const muc = tachThayDoi(g)!;
    expect(muc[0]).toEqual({ pb: "1.0.11", dong: ["A đậm nối dòng", "B"] });
    expect(mucMoiHon(muc, "1.0.9", "1.0.11").map((m) => m.pb)).toEqual(["1.0.11", "1.0.10"]);
    expect(soPhienBan("1.0.10", "1.0.9")).toBeGreaterThan(0);
    expect(tachThayDoi("Ca kiểm thử trang cấp mã: chờ mã ký xong")).toBeNull();
  });
});
