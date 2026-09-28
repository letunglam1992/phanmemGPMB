/** P0-6: ghi nhiều bản ghi trong một giao dịch — lỗi giữa chừng thì kho không đổi. */
import { describe, expect, it } from "vitest";
import { taoKhoBoNho } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { hoMoi } from "../src/mo-hinh";
import { docBanSaoLuu, khoiPhuc, taoBanSaoLuu } from "../src/sao-luu";

async function khoMau(thuLoi?: (b: number) => void) {
  const kho = taoKhoBoNho({ thuLoi });
  const { duAn, ho } = taoDuAnMau();
  await kho.ghiLo({ duAn: [duAn], ho, banDo: [{ duAnId: duAn.id, bytes: new Uint8Array([1, 2]) }] });
  return { kho, duAn, ho };
}

describe("Ghi lô nguyên tử (kho)", () => {
  it("nhập 50 hộ, lỗi ở hộ thứ 30 → không hộ nào được ghi", async () => {
    let bat = false;
    const { kho, duAn, ho } = await khoMau((b) => {
      if (bat && b === 29) throw new Error("mất kết nối giả lập");
    });
    bat = true;
    const moi = Array.from({ length: 50 }, (_, i) => hoMoi(duAn.id, `N${i + 1}`, `Hộ mới ${i + 1}`, "HO_GIA_DINH"));
    await expect(kho.ghiLo({ ho: moi })).rejects.toThrow("mất kết nối");
    expect((await kho.dsHo(duAn.id)).map((h) => h.id).sort()).toEqual(ho.map((h) => h.id).sort());
  });

  it("xóa dự án: dự án, hồ sơ, bản đồ cùng mất trong một lô", async () => {
    const { kho, duAn } = await khoMau();
    await kho.xoaDuAn(duAn.id);
    expect(await kho.dsDuAn()).toEqual([]);
    expect(await kho.dsHo(duAn.id)).toEqual([]);
    expect(await kho.docBanDo(duAn.id)).toBeNull();
  });

  it("khôi phục kiểu thay thế lỗi giữa chừng → dữ liệu cũ còn nguyên (không còn 'xóa hết rồi ghi dở')", async () => {
    let bat = false;
    const { kho, duAn, ho } = await khoMau((b) => {
      if (bat && b === 2) throw new Error("hỏng giữa chừng");
    });
    const nguon = taoKhoBoNho();
    const khac = taoDuAnMau();
    await nguon.ghiLo({ duAn: [{ ...khac.duAn, id: "da-khac" }], ho: khac.ho.map((h) => ({ ...h, id: `k-${h.id}`, duAnId: "da-khac" })) });
    const ban = await docBanSaoLuu((await taoBanSaoLuu(nguon)).bytes);
    bat = true;
    await expect(khoiPhuc(kho, ban, "THAY_THE")).rejects.toThrow("hỏng giữa chừng");
    expect((await kho.dsDuAn()).map((d) => d.id)).toEqual([duAn.id]);
    expect((await kho.dsHo(duAn.id)).length).toBe(ho.length);
    expect([...(await kho.docBanDo(duAn.id))!]).toEqual([1, 2]);
    bat = false;
    await khoiPhuc(kho, ban, "THAY_THE");
    expect((await kho.dsDuAn()).map((d) => d.id)).toEqual(["da-khac"]);
  });
});

describe("Ghi lô nguyên tử (IndexedDB — máy đơn)", () => {
  it("một bản ghi không ghi được → hủy cả giao dịch; xóa dự án gồm hồ sơ, bản đồ", async () => {
    await import("fake-indexeddb/auto");
    const { taoKhoIndexedDb } = await import("../src/kho");
    const kho = taoKhoIndexedDb();
    const { duAn, ho } = taoDuAnMau();
    await kho.ghiLo({ duAn: [duAn], ho, banDo: [{ duAnId: duAn.id, bytes: new Uint8Array([5]) }] });
    expect((await kho.dsHo(duAn.id)).length).toBe(ho.length);
    // bản ghi thứ hai không sao chép được (hàm) → DataCloneError → không bản ghi nào của lô được ghi
    const hong = { ...hoMoi(duAn.id, "X2", "Hỏng", "HO_GIA_DINH"), f: () => 1 } as unknown as ReturnType<typeof hoMoi>;
    await expect(kho.ghiLo({ ho: [hoMoi(duAn.id, "X1", "Mới", "HO_GIA_DINH"), hong] })).rejects.toThrow();
    expect((await kho.dsHo(duAn.id)).length).toBe(ho.length);
    await kho.xoaDuAn(duAn.id);
    expect(await kho.dsDuAn()).toEqual([]);
    expect(await kho.dsHo(duAn.id)).toEqual([]);
    expect(await kho.docBanDo(duAn.id)).toBeNull();
  });
});
