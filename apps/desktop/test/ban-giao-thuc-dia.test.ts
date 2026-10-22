import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { dongDuAn } from "../src/bao-cao";
import { tomTatDuAn } from "../src/tong-hop-tinh/goi-tinh";
import { ghiBanGiaoThucDia, mocBanGiaoMoiNhat, xoaBanGiaoThucDia } from "../src/ban-giao-thuc-dia";

const cs = cs0 as unknown as BoChinhSach;

describe("1.1.0 (D3) — mốc bàn giao đất trên thực địa (Mẫu 06 NĐ 102/2024, T23)", () => {
  const { duAn, ho } = taoDuAnMau();
  it("ghi, thay bản cùng ngày cùng đợt, xóa; mốc mới nhất", () => {
    let d = ghiBanGiaoThucDia(duAn, { ngay: "2026-11-02", benNhan: "Ban QLDA", dienTich: "1200,5" });
    d = ghiBanGiaoThucDia(d, { ngay: "2026-11-02", benNhan: "Ban QLDA tỉnh", dienTich: "1250" });
    expect(d.banGiaoThucDia).toHaveLength(1);
    expect(d.banGiaoThucDia![0]!.benNhan).toBe("Ban QLDA tỉnh");
    d = ghiBanGiaoThucDia(d, { ngay: "2026-10-20", benNhan: "Ban QLDA", dotId: "dot1" });
    expect(d.banGiaoThucDia!.map((x) => x.ngay)).toEqual(["2026-10-20", "2026-11-02"]);
    expect(mocBanGiaoMoiNhat(d)!.ngay).toBe("2026-11-02");
    expect(mocBanGiaoMoiNhat(d, "dot1")!.ngay).toBe("2026-10-20");
    expect(xoaBanGiaoThucDia(d, d.banGiaoThucDia![0]!.id).banGiaoThucDia).toHaveLength(1);
  });
  it("báo cáo tiến độ (chặng hiện tại) và gói tỉnh có mốc; trước ngày bàn giao thì chưa ghi", () => {
    const d = ghiBanGiaoThucDia(ghiBanGiaoThucDia(duAn, { ngay: "2026-10-20", benNhan: "Ban QLDA" }), { ngay: "2026-11-02", benNhan: "Ban QLDA" });
    const ds = ho.map((h) => ({ h, k: tinhHo(cs, d, h) }));
    expect(dongDuAn(d, ds, "2026-11-10").changHienTai).toContain("; đã bàn giao đất trên thực địa 2 lần, lần gần nhất ngày 02/11/2026");
    expect(dongDuAn(d, ds, "2026-10-25").changHienTai).toMatch(/; đã bàn giao đất trên thực địa ngày 20\/10\/2026$/);
    expect(dongDuAn(d, ds, "2026-10-01").changHienTai).not.toContain("bàn giao đất trên thực địa");
    const [tt] = tomTatDuAn([d], ho, () => 0, "2026-11-10");
    expect(tt!.banGiaoThucDia).toEqual({ lan: 2, ngayCuoi: "2026-11-02" });
    expect(tomTatDuAn([duAn], ho, () => 0, "2026-11-10")[0]!.banGiaoThucDia).toBeUndefined();
  });
});
