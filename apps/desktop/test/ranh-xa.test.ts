/** Lớp ranh giới 75 xã, phường: tệp đủ 75 xã khớp danh mục, đổi sang VN-2000, tìm xã chứa điểm. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HE_SON_LA, wgs84SangVn2000 } from "@gpmb/gis";
import { chieuRanhXa, cungTenXa, xaChua, type TepRanhXa } from "../src/man/ban-do/ranh-xa";
import DM from "../src/danh-muc-xa.json";

const tep = JSON.parse(readFileSync(new URL("../public/ban-do/ranh-xa-son-la.json", import.meta.url), "utf8")) as TepRanhXa;
describe("Ranh giới xã, phường", () => {
  const ds = chieuRanhXa(tep, HE_SON_LA);
  it("đủ 75 xã, phường, tên trùng danh mục xã của phần mềm", () => {
    expect(ds).toHaveLength(75);
    expect(new Set(ds.map((x) => x.ten))).toEqual(new Set(DM as string[]));
  });
  it("tọa độ VN-2000 trong phạm vi Sơn La; nhãn nằm trong hộp bao", () => {
    for (const x of ds) {
      expect(x.hop.minX).toBeGreaterThan(300000);
      expect(x.hop.maxX).toBeLessThan(700000);
      expect(x.hop.minY).toBeGreaterThan(2200000);
      expect(x.hop.maxY).toBeLessThan(2450000);
      expect(x.nhan.x).toBeGreaterThanOrEqual(x.hop.minX);
      expect(x.nhan.y).toBeLessThanOrEqual(x.hop.maxY);
    }
  });
  it("xã chứa điểm: một điểm đầu tiên của ranh Phường Tô Hiệu dịch vào trong", () => {
    const to = ds.find((x) => x.ten === "Phường Tô Hiệu")!;
    expect(xaChua(ds, to.nhan)?.ten).toBe("Phường Tô Hiệu");
    expect(xaChua(ds, wgs84SangVn2000({ lon: 100, lat: 10 }))).toBeUndefined();
    expect(cungTenXa(" xã  Chiềng Mung", "Xã Chiềng Mung")).toBe(true);
  });
});
