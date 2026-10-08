import { describe, expect, it, vi } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { danhDauDaXem, hoMoiGiao } from "../src/phan-cong";

describe("Thông báo hồ sơ mới được giao (1.0.6)", () => {
  it("lần đầu không báo hồ sơ đang giao; giao thêm thì báo; mở Việc của tôi thì hết báo; theo từng tài khoản", () => {
    const kho = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => kho.get(k) ?? null, setItem: (k: string, v: string) => void kho.set(k, v) });
    vi.stubGlobal("window", { dispatchEvent: () => true });
    const { duAn, ho } = taoDuAnMau();
    let ds = [{ ...ho[0]!, phuTrach: "canbo1" }, ho[1]!];
    const hoCua = () => ds;
    expect(hoMoiGiao("canbo1", [duAn], hoCua)).toEqual([]); // lần đầu: ghi nhận, không báo
    ds = [ds[0]!, { ...ho[1]!, phuTrach: "canbo1" }];
    expect(hoMoiGiao("canbo1", [duAn], hoCua).map((x) => x.h.ma)).toEqual([ho[1]!.ma]);
    expect(hoMoiGiao("canbo2", [duAn], hoCua)).toEqual([]);
    danhDauDaXem("canbo1", ds.map((h) => h.id));
    expect(hoMoiGiao("canbo1", [duAn], hoCua)).toEqual([]);
    vi.unstubAllGlobals();
  });
});
