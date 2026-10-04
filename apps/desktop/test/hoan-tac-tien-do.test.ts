/** Hoàn tác cập nhật tiến độ nhiều hộ: trả về trạng thái cũ, bỏ qua hộ đã sửa tiếp sau đó. */
import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { hoanTacCapNhat, type LanCapNhat } from "../src/thanh-phan/TienDoDuAn";

describe("Hoàn tác cập nhật tiến độ", () => {
  it("trả bước về trạng thái trước; xóa bước nếu trước đó chưa có; bỏ qua hộ đã sửa tiếp", () => {
    const { duAn, ho } = taoDuAnMau();
    const [a, b] = ho as [typeof ho[0], typeof ho[0]];
    const cuA = { trangThai: "DANG" as const, ngay: "2026-10-01" };
    const moi = { trangThai: "XONG" as const, ngay: "2026-10-04", duyetBoi: "qt" };
    const sau = [{ ...a, tienDo: { ...a.tienDo, "5": moi } }, { ...b, tienDo: { ...b.tienDo, "5": moi } }];
    const lan: LanCapNhat = { duAnId: duAn.id, buoc: "5", moTa: "x", luc: "", ds: [{ id: a.id, ma: a.ma, cu: cuA, moi }, { id: b.id, ma: b.ma, moi }] };
    const r = hoanTacCapNhat(lan, sau);
    expect(r.boQua).toEqual([]);
    expect(r.ghi[0]!.tienDo["5"]).toEqual(cuA);
    expect("5" in r.ghi[1]!.tienDo).toBe(false);
    // hộ b đã bị sửa tiếp sau lần cập nhật → bỏ qua
    const suaTiep = [sau[0]!, { ...sau[1]!, tienDo: { ...sau[1]!.tienDo, "5": { ...moi, ghiChu: "sửa sau" } } }];
    const r2 = hoanTacCapNhat(lan, suaTiep);
    expect(r2.ghi).toHaveLength(1);
    expect(r2.boQua[0]).toMatch(/đã sửa tiếp/);
  });
});
