/** 1.3.5 — số tờ nhập một lần: gợi ý, điền cho thửa trống; số tờ có dấu cách. */
import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { dienSoToTrong, soThuaTrongTo, soToGoiY } from "../src/so-to";
import { loiSoToTep } from "../src/man/ban-do/CauHinhLop";
import type { Ho } from "../src/mo-hinh";

describe("Số tờ bản đồ — điền một lần", () => {
  const { duAn, ho } = taoDuAnMau();
  const voiTo = (h: Ho, to: string[]) => ({ ...h, thua: h.thua.map((t, i) => ({ ...t, soTo: to[i] ?? "" })) });
  it("gợi ý: thửa trước của hộ → dùng nhiều nhất trong dự án → số tờ của tệp bản đồ", () => {
    const a = voiTo(ho[0]!, ["TĐ 52-2025", ""]);
    const b = voiTo(ho[1]!, ["", ""]);
    expect(soToGoiY(duAn, [a, b], a)).toBe("TĐ 52-2025");
    expect(soToGoiY(duAn, [a, b], b)).toBe("TĐ 52-2025");
    const rong = [voiTo(ho[0]!, []), voiTo(ho[1]!, [])];
    expect(soToGoiY({ banDo: { soTo: "7" } as never }, rong)).toBe("7");
    expect(soToGoiY({ banDo: null }, rong)).toBe("");
  });
  it("điền cho thửa còn trống, giữ thửa đã có số tờ", () => {
    const a = voiTo(ho[0]!, ["5", ""]);
    const b = voiTo(ho[1]!, ["5"]);
    expect(soThuaTrongTo([a, b])).toBe(1 + Math.max(0, b.thua.length - 1));
    const ds = dienSoToTrong([a, b], " TĐ 52-2025 ");
    expect(ds.find((h) => h.id === a.id)!.thua.map((t) => t.soTo)).toEqual(["5", "TĐ 52-2025"]);
    expect(soThuaTrongTo(ds)).toBe(0);
    expect(dienSoToTrong([a], "")).toEqual([]);
  });
  it("số tờ nhập tay cho tệp: cho phép dấu cách, ≤ 24 ký tự", () => {
    expect(loiSoToTep("TĐ 52-2025")).toBeNull();
    expect(loiSoToTep("21")).toBeNull();
    expect(loiSoToTep("TĐ/52.2025")).toBeNull();
    expect(loiSoToTep("#52")).not.toBeNull();
    expect(loiSoToTep("x".repeat(25))).not.toBeNull();
  });
});
