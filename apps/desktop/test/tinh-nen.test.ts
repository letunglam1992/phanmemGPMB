import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { daTinh, tinhHo, tinhHoMoi } from "../src/tinh-ho";
import { layTienDoNen, ngheTinhNen, tinhNen, type ViecTinh } from "../src/tinh-nen";

const cs = cs0 as unknown as BoChinhSach;
function tao(n: number) {
  const { duAn, ho } = taoDuAnMau();
  const hs = Array.from({ length: n }, (_, i) => ({ ...ho[i % ho.length]!, id: `h${i}` }));
  return { duAn, hs, viec: hs.map((h): ViecTinh => [cs, duAn, h]) };
}

describe("1.0.7 — tính nền lần mở đầu", () => {
  it("ít hộ chưa tính (≤ ngưỡng) → không tính nền, nơi gọi tính ngay", () => {
    const { viec } = tao(5);
    expect(tinhNen(viec, { nguong: 10 })).toBe(false);
  });

  it("nhiều hộ → chia lát, không tính hết trong lần gọi; xong thì mọi hộ có trong bộ nhớ đệm, kết quả như tính trực tiếp, lan tăng", () => {
    const { duAn, hs, viec } = tao(40);
    const hang: (() => void)[] = [];
    let gio = 0;
    const lan0 = layTienDoNen().lan;
    let bao = 0;
    const bo = ngheTinhNen(() => bao++);
    // mỗi hộ "tốn" 1 ms đồng hồ giả, lát 5 ms → mỗi lát ~5 hộ
    const dongHo = () => (gio += 1);
    expect(tinhNen(viec, { nguong: 10, lat: 5, hen: (f) => hang.push(f), dongHo })).toBe(true);
    expect(hs.some((h) => daTinh(cs, duAn, h))).toBe(false);
    expect(layTienDoNen()).toMatchObject({ xong: 0, tong: 40 });
    let soLat = 0;
    while (hang.length) {
      hang.shift()!();
      soLat++;
    }
    expect(soLat).toBeGreaterThan(3);
    expect(hs.every((h) => daTinh(cs, duAn, h))).toBe(true);
    expect(layTienDoNen()).toMatchObject({ xong: 0, tong: 0, lan: lan0 + 1 });
    expect(bao).toBeGreaterThan(1);
    bo();
    // lần gọi sau: đã có đủ → không tính nền
    expect(tinhNen(viec, { nguong: 10 })).toBe(false);
    // kết quả giống tính không qua bộ nhớ đệm
    expect(tinhHo(cs, duAn, hs[7]!).tong.tongLamTron.toString()).toBe(tinhHoMoi(cs, duAn, hs[7]!).tong.tongLamTron.toString());
  });

  it("gọi lại với danh sách mới thì hủy lần cũ, chỉ tính phần còn thiếu", () => {
    const { duAn, hs, viec } = tao(30);
    const hang: (() => void)[] = [];
    let gio = 0;
    const o = { nguong: 5, lat: 3, hen: (f: () => void) => hang.push(f), dongHo: () => (gio += 1) };
    tinhNen(viec, o);
    hang.shift()!(); // một lát
    const daXong = hs.filter((h) => daTinh(cs, duAn, h)).length;
    expect(daXong).toBeGreaterThan(0);
    const cu = hang.splice(0);
    expect(tinhNen(viec, o)).toBe(true);
    expect(layTienDoNen().tong).toBe(30 - daXong);
    cu.forEach((f) => f()); // lát của lần cũ bị hủy: không làm gì
    while (hang.length) hang.shift()!();
    expect(hs.every((h) => daTinh(cs, duAn, h))).toBe(true);
  });
});
