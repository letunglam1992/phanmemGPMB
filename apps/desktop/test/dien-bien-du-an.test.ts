import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { dienBienDuAn } from "../src/dien-bien-du-an";
import type { Ho } from "../src/mo-hinh";

describe("1.2.0 (D2) — tiến độ theo tháng của dự án", () => {
  it("lũy kế theo ngày đã ghi ở bước đã xong; mốc giao đất thực địa theo tháng", () => {
    const { duAn, ho } = taoDuAnMau();
    const xong = (ngay: string) => ({ trangThai: "XONG" as const, ngay });
    const hos: Ho[] = [0, 1, 2].map((i) => ({ ...ho[0]!, id: `h${i}`, ma: `H0${i}` })).map((h, i) => ({
      ...h,
      dotId: undefined,
      tienDo: {
        ...(i < 3 ? { "9": xong("2026-08-10") } : {}),
        ...(i < 2 ? { "12": xong("2026-09-05") } : {}),
        ...(i < 1 ? { "13": xong("2026-10-02") } : {}),
      },
      banGiao: i < 1 ? { ngay: "2026-10-15" } as Ho["banGiao"] : undefined,
    }));
    const d = { ...duAn, tienDoChung: undefined, phuongAn: [], dotThuHoi: [], banGiaoThucDia: [{ id: "b", ngay: "2026-10-20", benNhan: "Ban QLDA" }] };
    const ky = dienBienDuAn(d, hos, "2026-10-22");
    expect(ky.map((k) => k.ky)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(ky.map((k) => [k.duyetPA, k.chiTra, k.qdThuHoi, k.banGiao])).toEqual([[3, 0, 0, 0], [3, 2, 0, 0], [3, 2, 1, 1]]);
    expect(ky[2]!.giaoCdt).toBe(1);
    // bước chưa xong (chờ duyệt) không đếm
    const choDuyet = hos.map((h) => ({ ...h, banGiao: undefined, tienDo: { "9": { trangThai: "CHO_DUYET" as const, ngay: "2026-08-10" } } }));
    expect(dienBienDuAn({ ...d, banGiaoThucDia: [] }, choDuyet, "2026-10-22")).toEqual([]);
  });
});
