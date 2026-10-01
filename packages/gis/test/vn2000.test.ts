/** VN-2000 ↔ WGS-84, ô ảnh nền. Giá trị đối chiếu tính bằng PROJ (proj4js 2.x) với cùng tham số +towgs84 (QĐ 05/2007/QĐ-BTNMT). */
import { describe, expect, test } from "vitest";
import { docKinhTuyen, ghiKinhTuyen, mauUrlHopLe, oNenTrongKhung, sangO, tuO, urlO, vn2000SangWgs84, wgs84SangVn2000 } from "../src/index.js";

describe("VN-2000 ↔ WGS-84", () => {
  // [Đông, Bắc] (kinh tuyến trục 104°00′, múi 3°) → [kinh độ, vĩ độ] theo proj4js
  const mau: [number, number, number, number][] = [
    [500000, 2350000, 104.001888964, 21.244325661],
    [455123.4, 2360321.7, 103.569240552, 21.337006227],
    [548000, 2400000, 104.465791875, 21.695295543],
    [430000, 2290000, 103.329883433, 20.701041478],
  ];
  test.each(mau)("(%f, %f) khớp PROJ trong 1e-7 độ (~1 cm)", (x, y, lon, lat) => {
    const ll = vn2000SangWgs84({ x, y });
    expect(Math.abs(ll.lon - lon)).toBeLessThan(1e-7);
    expect(Math.abs(ll.lat - lat)).toBeLessThan(1e-7);
    const v = wgs84SangVn2000(ll);
    expect(Math.abs(v.x - x)).toBeLessThan(0.002);
    expect(Math.abs(v.y - y)).toBeLessThan(0.002);
  });
  test("múi 6° (UTM 48, k0 = 0,9996)", () => {
    const ll = vn2000SangWgs84({ x: 400000, y: 2350000 }, { kinhTuyenTruc: 105, mui: 6 });
    expect(Math.abs(ll.lon - 104.038118718)).toBeLessThan(1e-7);
    expect(Math.abs(ll.lat - 21.247941573)).toBeLessThan(1e-7);
  });
  test("đọc, ghi kinh tuyến trục", () => {
    expect(docKinhTuyen("104")).toBe(104);
    expect(docKinhTuyen("104°00'")).toBe(104);
    expect(docKinhTuyen("105 45")).toBe(105.75);
    expect(docKinhTuyen("105,75")).toBe(105.75);
    expect(docKinhTuyen("abc")).toBeNull();
    expect(docKinhTuyen("99")).toBeNull();
    expect(ghiKinhTuyen(105.75)).toBe("105°45′");
    expect(ghiKinhTuyen(104)).toBe("104°00′");
  });
});

describe("Ô ảnh nền Web Mercator", () => {
  test("sangO / tuO ngược nhau; ô chứa điểm", () => {
    const ll = { lon: 103.9, lat: 21.3 };
    const o = sangO(ll, 17);
    const lai = tuO(o.x, o.y, 17);
    expect(lai.lon).toBeCloseTo(ll.lon, 9);
    expect(lai.lat).toBeCloseTo(ll.lat, 9);
    expect(sangO({ lon: 0, lat: 0 }, 1)).toEqual({ x: 1, y: 1 });
  });
  test("khung 200 m ở 2 px/m → mức 18–19, các ô phủ kín khung; góc ô theo VN-2000", () => {
    const k = { minX: 500000, minY: 2350000, maxX: 500200, maxY: 2350200 };
    const ds = oNenTrongKhung(k, 2);
    expect(ds.length).toBeGreaterThan(0);
    const z = ds[0]!.z;
    expect(z).toBeGreaterThanOrEqual(18);
    // cạnh ô ở mức z ≈ 156543 cos φ / 2^z × 256 m
    const canh = ds[0]!.goc[1].x - ds[0]!.goc[0].x;
    expect(canh).toBeGreaterThan(0);
    expect(Math.abs(canh - (156543.03392 * Math.cos((21.244 * Math.PI) / 180) * 256) / 2 ** z)).toBeLessThan(2);
    // trục y ô hướng xuống (Nam): góc dưới-trái có Bắc nhỏ hơn
    expect(ds[0]!.goc[2].y).toBeLessThan(ds[0]!.goc[0].y);
    // phủ kín 4 góc khung
    const minX = Math.min(...ds.map((o) => o.goc[0].x)), maxX = Math.max(...ds.map((o) => o.goc[1].x));
    expect(minX).toBeLessThanOrEqual(k.minX + 1);
    expect(maxX).toBeGreaterThanOrEqual(k.maxX - 1);
  });
  test("giới hạn số ô: khung rộng thì giảm mức phóng", () => {
    const ds = oNenTrongKhung({ minX: 400000, minY: 2300000, maxX: 600000, maxY: 2400000 }, 2, undefined, 19, 50);
    expect(ds.length).toBeLessThanOrEqual(50);
    expect(ds[0]!.z).toBeLessThan(12);
  });
  test("URL ô: chỉ chứa z/x/y; kiểm tra mẫu URL", () => {
    expect(urlO("https://h/{z}/{y}/{x}", { z: 17, x: 1, y: 2 })).toBe("https://h/17/2/1");
    expect(urlO("https://{s}.h/{z}/{x}/{-y}.png", { z: 2, x: 1, y: 0 })).toBe("https://b.h/2/1/3.png");
    expect(mauUrlHopLe("https://h/{z}/{x}/{y}")).toBe(true);
    expect(mauUrlHopLe("http://h/{z}/{x}/{y}")).toBe(false);
    expect(mauUrlHopLe("https://h/{z}/{x}")).toBe(false);
  });
});

import { timThamChieu } from "../src/index.js";
describe("Dò tên tệp tham chiếu", () => {
  test("ASCII (V7) và UTF-16 (V8); bỏ đường dẫn, tệp mẫu, chính tệp", () => {
    const a = new TextEncoder().encode("\x00\x05xx C:\\BanDo\\To-12.dgn\x00\x00 seed2d.dgn\x00 Chinh.dgn\x00");
    const u = new Uint8Array([...("\x00D:/Tờ 13.DGN\x00")].flatMap((c) => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8]));
    const b = new Uint8Array([...a, 0, ...u]);
    expect(timThamChieu(b, "chinh.dgn")).toEqual(["To-12.dgn", "Tờ 13.DGN"]);
    expect(timThamChieu(new Uint8Array([1, 2, 3]))).toEqual([]);
  });
});
