/** PDF bản đồ tiến độ (docs/08 §9.5): cấu trúc tệp PDF một trang nhúng ảnh JPEG; thước tỷ lệ "đẹp". */
import { describe, expect, it } from "vitest";
import { doDaiThuoc, taoPdfAnh, KHO_GIAY, veTrangBanDo, type NoiDungIn } from "../src/man/ban-do/xuat-pdf";

describe("PDF bản đồ tiến độ", () => {
  it("một trang A3 ngang, ảnh DCTDecode đúng độ dài, bảng xref trỏ đúng vị trí đối tượng", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
    const pdf = taoPdfAnh(jpeg, 2480, 1754, KHO_GIAY.A3, "Bản đồ tiến độ");
    const chu = new TextDecoder("latin1").decode(pdf);
    expect(chu.startsWith("%PDF-1.4")).toBe(true);
    expect(chu).toContain("/MediaBox [0 0 1190.55 841.89]");
    expect(chu).toContain("/Width 2480 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 10");
    expect(chu.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(chu)![1]);
    expect(chu.slice(startxref, startxref + 4)).toBe("xref");
    const xref = [...chu.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(xref).toHaveLength(6);
    xref.forEach((vt, i) => expect(chu.slice(vt, vt + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(chu).toContain("/Title <FEFF0042");
  });
  it("thước tỷ lệ 1, 2, 5 × 10^n", () => {
    expect([0.8, 3, 7, 18, 45, 120, 260].map(doDaiThuoc)).toEqual([0.5, 2, 5, 10, 20, 100, 200]);
  });
});

describe("PDF vector từ lệnh vẽ canvas (1.0.6)", () => {
  it("màu kèm độ trong suốt, đường, vùng evenodd, cắt vùng, chữ căn giữa → lệnh PDF; đóng gói có phông, ExtGState", async () => {
    const { readFileSync } = await import("node:fs");
    const { inflateSync } = await import("node:zlib");
    const { NguCanhPdf, docMau } = await import("../src/van-ban/ngu-canh-pdf");
    const { napPhong, dongGoiPdf } = await import("../src/van-ban/pdf-chu");
    expect(docMau("rgba(255,0,0,0.5)")).toEqual(["1 0 0", 0.5]);
    expect(docMau("#000")).toEqual(["0 0 0", 1]);
    const bo = await napPhong(async (t) => new Uint8Array(readFileSync(new URL(`../public/phong/${t}`, import.meta.url))));
    const c = new NguCanhPdf(bo, 200, 100);
    c.save();
    c.beginPath();
    c.rect(10, 10, 50, 50);
    c.clip();
    c.fillStyle = "rgba(0,128,0,0.55)";
    c.beginPath();
    c.moveTo(10, 10);
    c.lineTo(60, 10);
    c.lineTo(60, 60);
    c.closePath();
    c.fill("evenodd");
    c.strokeStyle = "#d0021b";
    c.lineWidth = 2;
    c.stroke();
    c.restore();
    c.font = 'bold 12px "Times New Roman", serif';
    c.textAlign = "center";
    c.fillText("Thửa 85", 100, 50);
    const nd = c.noiDung;
    expect(nd).toContain("10 40 50 50 re W n");
    expect(nd).toMatch(/\/aca55 gs 0 0\.5 0 rg 10 90 m 60 90 l 60 40 l h f\*/);
    expect(nd).toMatch(/\/aCA100 gs 0\.82 0\.01 0\.11 RG 2 w \[\] 0 d 10 90 m/);
    expect(nd).toMatch(/BT .* \/dam 12 Tf [\d.]+ 50 Td <[0-9a-f]+> Tj ET/);
    const pdf = await dongGoiPdf({ trang: [nd], dung: c.dung, bo, rong: 200, cao: 100, tieuDe: "Thử", doTrong: c.doTrong });
    const s = Buffer.from(pdf).toString("latin1");
    expect(s).toContain("/ExtGState << /aca55 <<");
    expect(s).toContain("/FontFile2");
    const luong = [...s.matchAll(/\/FlateDecode \/Length (\d+) >>\nstream\n/g)].map((m) => inflateSync(Buffer.from(s.substr(m.index! + m[0].length, Number(m[1])), "latin1")).toString("latin1"));
    expect(luong.some((x) => x.includes("beginbfchar") && /<1eed>/i.test(x))).toBe(true); // "ử"
  });

  it("1.0.7 — in theo vùng chọn: chỉ vẽ, đếm thửa trong khung; ghi chú phạm vi; không chọn thì theo ranh thu hồi", () => {
    const chu: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_, k) => (k === "fillText" ? (t: string) => void chu.push(t) : k === "measureText" ? () => ({ width: 10 }) : () => undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const vuong = (x: number, y: number) => [[{ x, y }, { x: x + 20, y }, { x: x + 20, y: y + 20 }, { x, y: y + 20 }, { x, y }]];
    const thua = (ma: string, x: number, y: number) => ({ ma, soTo: "1", soThua: ma, loaiDatBanDo: null, dienTichGhi: null, dienTichHinhHoc: 400, chuSuDung: null, vong: vuong(x, y), tamNhan: { x: x + 10, y: y + 10 }, nhan: [], co: [] });
    const ds = [thua("1", 0, 0), thua("2", 1000, 1000)];
    const n: NoiDungIn = {
      dl: { kq: { thua: ds }, pham: { minX: 0, minY: 0, maxX: 1020, maxY: 1020 } } as unknown as NoiDungIn["dl"],
      tieuDe: "T", phuDe: "P", ngay: "10/10/2026", ranh: [],
      ttThua: new Map([["1", "HOAN_THANH"], ["2", "HOAN_THANH"]]),
      thuHoi: new Map(), khoaThua: (t) => t.ma,
    };
    veTrangBanDo(ctx, 1, KHO_GIAY.A4, n);
    expect(chu.some((t) => /\(2 thửa\)/.test(t))).toBe(true);
    expect(chu.join(" ")).not.toContain("In theo vùng chọn");
    chu.length = 0;
    veTrangBanDo(ctx, 1, KHO_GIAY.A4, { ...n, phamVi: { minX: -5, minY: -5, maxX: 50, maxY: 50 } });
    expect(chu.some((t) => /\(1 thửa\)/.test(t))).toBe(true);
    expect(chu).toContain("(số thửa trong phạm vi in)");
    expect(chu.join(" ")).toContain("In theo vùng chọn.");
  });
});
