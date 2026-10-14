import { describe, expect, it } from "vitest";
import { BO_CHINH_SACH } from "../src/du-lieu";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo, tinhHoMoi } from "../src/tinh-ho";
import { boCuaHo } from "../src/dot-thu-hoi";
import { datBoDot, datBoHo, excelChuyenBo, taiLieuGiaiTrinh, tinhChuyenBo } from "../src/chuyen-bo";
import { chotPhuongAn, kiemTraToanVen, tinhLaiBan } from "../src/phuong-an";
import { taoDocx } from "../src/van-ban/tai-lieu-don-gian";
import type { DuAn } from "../src/mo-hinh";

const CU = "sonla-2026-03-31";
const MOI = "sonla-2026-10-06";
const cs = BO_CHINH_SACH[CU]!;

describe("1.0.11 — Chuyển bộ chính sách theo hộ, đợt", () => {
  it("bộ áp dụng: hộ → đợt → dự án; tinhHo tự dùng bộ riêng; bỏ bộ riêng trở về như cũ", () => {
    const { duAn: d0, ho } = taoDuAnMau();
    const duAn: DuAn = { ...d0, boChinhSach: CU, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1" }] };
    const h = { ...ho[0]!, dotId: "d1" };
    expect(boCuaHo(duAn, h)).toBe(CU);
    const da2 = datBoDot(duAn, "d1", MOI);
    expect(boCuaHo(da2, h)).toBe(MOI);
    expect(boCuaHo(da2, datBoHo(h, CU))).toBe(CU);
    // tính theo bộ riêng = tính trực tiếp với bộ đó
    const rieng = tinhHo(cs, duAn, datBoHo(h, MOI));
    const thang = tinhHoMoi(BO_CHINH_SACH[MOI]!, { ...duAn, boChinhSach: MOI }, h);
    expect(rieng.tong.tongLamTron.toFixed()).toBe(thang.tong.tongLamTron.toFixed());
    expect(datBoHo(datBoHo(h, MOI), "")).not.toHaveProperty("boChinhSach");
  });

  it("bảng chênh lệch theo hộ: chỉ hộ đã chọn; tổng = tổng từng hộ; xuất được Excel, Word", async () => {
    const { duAn: d0, ho } = taoDuAnMau();
    const duAn = { ...d0, boChinhSach: CU };
    const kq = tinhChuyenBo(duAn, ho, { loai: "ho", hoIds: [ho[0]!.id], khoa: MOI });
    expect(kq.dong.map((d) => d.hoId)).toEqual([ho[0]!.id]);
    expect(kq.dong[0]).toMatchObject({ boTruoc: CU, boSau: MOI });
    expect(kq.dong[0]!.truoc).toBe(tinhHo(cs, duAn, ho[0]!).tong.tongLamTron.toFixed());
    const tl = taiLieuGiaiTrinh(duAn, { loai: "ho", hoIds: [ho[0]!.id], khoa: MOI }, kq, { lyDo: "Khoản 2 Điều 3 QĐ 64/2026", nguoi: "Cán bộ A", ngay: "2026-10-14" });
    expect(JSON.stringify(tl)).toMatch(/Khoản 2 Điều 3 QĐ 64\/2026/);
    expect(taoDocx(tl).length).toBeGreaterThan(1000);
    expect((await excelChuyenBo(duAn, { loai: "ho", hoIds: [ho[0]!.id], khoa: MOI }, kq, "x")).length).toBeGreaterThan(1000);
  });

  it("theo đợt: hộ có bộ riêng giữ nguyên; bản chốt ghi bộ của đợt, đổi bộ đợt sau đó không làm lệch bản", async () => {
    const { duAn: d0, ho } = taoDuAnMau();
    const duAn: DuAn = { ...d0, boChinhSach: CU, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1" }] };
    const hos = ho.map((h, i) => ({ ...h, dotId: "d1", ...(i === 1 ? { boChinhSach: CU } : {}) }));
    const kq = tinhChuyenBo(duAn, hos, { loai: "dot", dotId: "d1", khoa: MOI });
    expect(kq.giuBoRieng.map((h) => h.id)).toEqual([hos[1]!.id]);
    expect(kq.dong.every((d) => d.boSau === MOI)).toBe(true);
    const da2 = datBoDot(duAn, "d1", MOI);
    const p = await chotPhuongAn(cs, da2, [hos[0]!], { ten: "B1", lyDo: "", nguoi: "x", dotId: "d1" }).catch(() => null);
    expect(p, "hộ mẫu phải chốt được theo bộ của đợt").not.toBeNull();
    if (!p) return;
    expect(p.ho[0]!.duLieu.boChinhSach).toBe(MOI);
    expect(await kiemTraToanVen(p)).toBe(true);
    const da3 = datBoDot(da2, "d1", CU);
    expect(tinhLaiBan(cs, da3, p).lech).toEqual([]);
  });
});
