import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo, tinhHoMoi } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { hoHieuLuc } from "../src/mo-hinh";
import { mocTienDo, thongKe, trangThaiHo } from "../src/trang-thai";
import { raSoat } from "../src/ra-soat-so";

const cs = cs0 as unknown as BoChinhSach;

describe("Ghi nhớ kết quả (P1-1)", () => {
  it("cùng hồ sơ, dự án, bộ chính sách → dùng lại kết quả; hồ sơ mới (sửa) → tính lại", () => {
    const { duAn, ho } = taoDuAnMau();
    const a = tinhHo(cs, duAn, ho[0]!);
    expect(tinhHo(cs, duAn, ho[0]!)).toBe(a);
    const sua = { ...ho[0]!, thua: ho[0]!.thua.map((t, i) => (i === 0 ? { ...t, dienTichThuHoi: "100" } : t)) };
    const b = tinhHo(cs, duAn, sua);
    expect(b).not.toBe(a);
    expect(b.tong.tongLamTron.eq(tinhHoMoi(cs, duAn, sua).tong.tongLamTron)).toBe(true);
    expect(tinhHo(cs, { ...duAn }, ho[0]!)).not.toBe(a); // dự án đổi (vd. giá gạo) → tính lại
  });
  it("hồ sơ hiệu lực, hiện trạng, thống kê, mốc, rà soát dùng lại khi dữ liệu không đổi; đổi một hộ thì tính lại", () => {
    const { duAn: d0, ho } = taoDuAnMau();
    const duAn = { ...d0, tienDoChung: { "1": { trangThai: "XONG" as const } } };
    expect(hoHieuLuc(duAn, ho[0]!)).toBe(hoHieuLuc(duAn, ho[0]!));
    const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    expect(trangThaiHo(duAn, ds[0]!.h, ds[0]!.k, "2026-09-28")).toBe(trangThaiHo(duAn, ds[0]!.h, ds[0]!.k, "2026-09-28"));
    const tk = thongKe(duAn, ds, "2026-09-28");
    expect(thongKe(duAn, [...ds], "2026-09-28")).toBe(tk); // mảng mới, phần tử cũ
    expect(thongKe(duAn, ds, "2026-09-29")).not.toBe(tk);
    const moi = { ...ho[1]!, vuongMac: { noiDung: "x", ngay: "2026-09-01" } };
    const ds2 = [ds[0]!, { h: moi, k: tinhHo(cs, duAn, moi) }];
    expect(thongKe(duAn, ds2, "2026-09-28")).not.toBe(tk);
    const m = mocTienDo(duAn, ho, "2026-09-28");
    expect(mocTienDo(duAn, [...ho], "2026-09-28")).toBe(m);
    const r1 = raSoat([duAn], () => ho);
    expect(raSoat([duAn], () => ho)).toEqual(r1);
  });
});
