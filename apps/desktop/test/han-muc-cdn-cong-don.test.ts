/** 1.3.6 (QD-49, VM-42): hạn mức hỗ trợ đào tạo, chuyển đổi nghề cộng dồn theo hộ, riêng từng nhóm loại đất (Điều 7 PL I QĐ 106/2025). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-10-06.json";
import { D, type BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import type { DuAn } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;

describe("Hạn mức chuyển đổi nghề cộng dồn theo hộ", () => {
  const { duAn: da0, ho } = taoDuAnMau();
  const duAn: DuAn = { ...da0, hanMucNN: null, hanMucNNLoai: { hangNam: "1000", lauNam: "2000", canCu: "khoản 1 Điều 7 Phụ lục I QĐ 106/2025/QĐ-UBND (thử)" } };
  const h0 = ho.find((h) => h.hoTro.chuyenDoiNghe && h.thua.some((t) => t.gia))!;
  const mau = h0.thua.find((t) => t.gia)!;
  const thua = (id: string, loaiDat: string, dt: string) => ({ ...mau, id, soThua: id, loaiDat, dienTich: dt, dienTichThuHoi: dt, chenhLech: undefined, khongGiayTo: undefined, phanLop: undefined });
  const c06 = (h: typeof h0) => tinhHo(cs, duAn, h).tatCa.filter((x) => x.dong.ma === "C06").map((x) => x.dong);
  const dtTinh = (d: { thamSo: Record<string, string> }) => d.thamSo["Diện tích tính"];

  it("hai thửa cùng nhóm (LUC 700 + LUK 600, hạn mức 1.000) → thửa sau chỉ còn 300 m²", () => {
    const ds = c06({ ...h0, thua: [thua("a", "LUC", "700"), thua("b", "LUK", "600")] });
    expect(ds.map(dtTinh)).toEqual(["700,00 m²", "300,00 m²"]);
    expect(ds[1]!.thamSo["Hạn mức đã tính cho thửa khác của hộ"]).toBe("700,00 m²");
    expect(ds[1]!.canhBao.join(" ")).toMatch(/cộng dồn theo hộ.*phần 300,00 m² không tính/);
    // tổng diện tích tính = hạn mức
    const gia = D(mau.gia!.giaNghinDong).mul(1000);
    const tong = ds.reduce((s, d) => s.plus(d.thanhTien!), D(0));
    const heSo = ds[0]!.thanhTien!.div(gia.mul(700));
    expect(tong.toString()).toBe(heSo.mul(gia).mul(1000).toString());
  });

  it("đã hết hạn mức → thửa sau tính 0 m²; khác nhóm loại đất thì hạn mức riêng", () => {
    const ds = c06({ ...h0, thua: [thua("a", "LUC", "1200"), thua("b", "BHK", "100"), thua("c", "CLN", "1500")] });
    expect(ds.map(dtTinh)).toEqual(["1.000,00 m²", "0,00 m²", "1.500,00 m²"]);
    expect(ds[1]!.thanhTien!.isZero()).toBe(true);
    expect(ds[2]!.thamSo["Hạn mức đã tính cho thửa khác của hộ"]).toBeUndefined();
  });

  it("hộ khác không dùng chung hạn mức", () => {
    const h1 = { ...h0, thua: [thua("a", "LUC", "900")] };
    c06({ ...h0, thua: [thua("x", "LUC", "900")] });
    expect(c06(h1).map(dtTinh)).toEqual(["900,00 m²"]);
  });
});
