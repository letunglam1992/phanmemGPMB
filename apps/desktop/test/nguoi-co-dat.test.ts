import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho } from "../src/mo-hinh";
import { canhBaoHoTroTrung, chiMucNguoi, chuanDinhDanh, hoSoKhac, khoaNguoi, nguoiNhieuHoSo } from "../src/nguoi-co-dat";
import { soatPhuongAn } from "../src/soat-phuong-an";
import { tinhHo } from "../src/tinh-ho";
import { demPhanCong, viecCuaToi } from "../src/phan-cong";

const cs = cs0 as unknown as BoChinhSach;

function mau() {
  const m1 = taoDuAnMau();
  const m2 = taoDuAnMau();
  const d1: DuAn = { ...m1.duAn, ten: "Đường A" };
  const d2: DuAn = { ...m2.duAn, ten: "Khu CN B" };
  const tdc = { hinhThuc: "TU_LO" as const, khoanKhac: [] };
  const a: Ho = { ...m1.ho[0]!, soDinhDanh: "014 090 000 123", hoTro: { ...m1.ho[0]!.hoTro, taiDinhCu: tdc } };
  const b: Ho = { ...m2.ho[0]!, soDinhDanh: "014090000123", hoTro: { ...m2.ho[0]!.hoTro, taiDinhCu: tdc } };
  const c: Ho = { ...m2.ho[1]!, soDinhDanh: "123" };
  return { d1, d2, a, b, c };
}

describe("Người có đất dùng chung giữa dự án (P3-2)", () => {
  it("chuẩn hóa số định danh; số quá ngắn không dùng để khớp; tổ chức và cá nhân tách nhau", () => {
    expect(chuanDinhDanh(" 014.090-000 123 ")).toBe("014090000123");
    expect(chuanDinhDanh("123")).toBeNull();
    expect(khoaNguoi({ soDinhDanh: "0101234567", loai: "TO_CHUC" })).toBe("TC:0101234567");
    expect(khoaNguoi({ soDinhDanh: "0101234567", loai: "CA_NHAN" })).toBe("CN:0101234567");
  });

  it("khớp hồ sơ cùng người ở dự án khác; bỏ hồ sơ, dự án trong thùng rác", () => {
    const { d1, d2, a, b, c } = mau();
    const m = chiMucNguoi([d1, d2], [a, b, c]);
    expect(hoSoKhac(m, a).map((x) => x.duAn.ten)).toEqual(["Khu CN B"]);
    expect(hoSoKhac(m, c)).toEqual([]);
    expect(hoSoKhac(chiMucNguoi([d1, { ...d2, daXoa: { luc: "", nguoi: "", lyDo: "x" } }], [a, b]), a)).toEqual([]);
    expect(hoSoKhac(chiMucNguoi([d1, d2], [a, { ...b, daXoa: { luc: "", nguoi: "", lyDo: "x" } }]), a)).toEqual([]);
  });

  it("cảnh báo hỗ trợ cùng loại (TĐC) ở hồ sơ khác — cần kiểm tra, có căn cứ; đưa vào Soát phương án", () => {
    const { d1, d2, a, b } = mau();
    const m = chiMucNguoi([d1, d2], [a, b]);
    const cb = canhBaoHoTroTrung(m, a);
    const tdc = cb.find((x) => x.loai === "TDC")!;
    expect(tdc.noiDung).toMatch(/Khu CN B – /);
    expect(tdc.canCu).toBe("Điều 111 Luật Đất đai 2024");
    const s = soatPhuongAn(d1, [{ h: a, k: tinhHo(cs, d1, a) }], null, m);
    expect(s.filter((x) => x.quyTac === "HO_TRO_TRUNG").every((x) => x.muc === "CANH_BAO")).toBe(true);
    expect(s.some((x) => x.quyTac === "HO_TRO_TRUNG" && /tái định cư/.test(x.noiDung))).toBe(true);
    const n = nguoiNhieuHoSo(m);
    expect(n).toHaveLength(1);
    expect(n[0]!.hoTroTrung).toContain("TDC");
  });
});

describe("Phân công, việc của tôi (P3-4)", () => {
  it("chỉ hồ sơ được giao cho tài khoản; ưu tiên hồ sơ có vướng mắc; đếm theo cán bộ", () => {
    const { d1, a } = mau();
    const x: Ho = { ...a, id: "x", ma: "H10", phuTrach: "canbo1" };
    const y: Ho = { ...a, id: "y", ma: "H11", phuTrach: "canbo1", vuongMac: { noiDung: "Chưa nhận tiền", ngay: "2026-09-01" } };
    const z: Ho = { ...a, id: "z", ma: "H12", phuTrach: "canbo2" };
    const ds = viecCuaToi("canbo1", [d1], () => [x, y, z], (d, h) => tinhHo(cs, d, h), "2026-09-29");
    expect(ds.map((v) => v.h.ma)).toEqual(["H11", "H10"]);
    expect(ds[0]!.vuongMac.length).toBeGreaterThan(0);
    expect(viecCuaToi("", [d1], () => [x], (d, h) => tinhHo(cs, d, h), "2026-09-29")).toEqual([]);
    expect(Object.fromEntries(demPhanCong([x, y, z, a]))).toEqual({ canbo1: 2, canbo2: 1, "": 1 });
  });
});

describe("1.0.7 — đối chiếu qua nhân khẩu", () => {
  it("chủ hồ sơ là nhân khẩu ở hồ sơ khác; nhân khẩu là chủ / nhân khẩu ở hồ sơ khác; bỏ hồ sơ trong thùng rác", async () => {
    const { chiMucNguoi, chiMucNhanKhau, lienQuanNhanKhau } = await import("../src/nguoi-co-dat");
    const { taoDuAnMau } = await import("../src/du-lieu-mau");
    const { duAn, ho } = taoDuAnMau();
    const [a0, b0] = ho as [typeof ho[number], typeof ho[number]];
    const a = { ...a0, soDinhDanh: "011 222 333 444", nhanKhau: [{ id: "n1", hoTen: "Con A", quanHe: "Con", soDinhDanh: "099888777666" }] };
    const b = { ...b0, soDinhDanh: "099.888.777.666", nhanKhau: [{ id: "n2", hoTen: a0.ten, quanHe: "Bố", soDinhDanh: "011222333444" }] };
    const c = { ...b0, id: "c", ma: "H09", ten: "Hộ C", soDinhDanh: "", nhanKhau: [{ id: "n3", hoTen: "Con A", quanHe: "Cháu", soDinhDanh: "099888777666" }] };
    const hos = [a, b, c];
    const cm = chiMucNguoi([duAn], hos), cmNk = chiMucNhanKhau([duAn], hos);
    const lq = lienQuanNhanKhau(cm, cmNk, a);
    expect(lq.map((x) => [x.vaiTro, x.khac.h.id]).sort()).toEqual([["CHU", b.id], ["NHAN_KHAU", b.id], ["NHAN_KHAU", "c"]].sort());
    expect(lq.find((x) => x.vaiTro === "CHU")!.moTa).toContain("Nhân khẩu Con A là chủ hồ sơ");
    // hồ sơ C trong thùng rác → không còn
    const cm2 = chiMucNhanKhau([duAn], [a, b, { ...c, daXoa: { luc: "x", nguoi: "y", lyDo: "z" } }]);
    expect(lienQuanNhanKhau(cm, cm2, a).some((x) => x.khac.h.id === "c")).toBe(false);
    // số quá ngắn không dùng để khớp
    expect(chiMucNhanKhau([duAn], [{ ...a, nhanKhau: [{ id: "x", hoTen: "X", quanHe: "", soDinhDanh: "123" }] }]).size).toBe(0);
  });
});
