/** P0-4: chặn xóa hộ/dự án có phương án đã chốt/duyệt, chi trả; thùng rác 30 ngày. */
import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { duocXoaHan, lyDoKhongXoaDuAn, lyDoKhongXoaHo, soNgayTrongThungRac } from "../src/rang-buoc";
import { tinhChiTra } from "../src/chi-tra";
import type { PhienBanPA } from "../src/phuong-an";

const pa = (trangThai: PhienBanPA["trangThai"], hoId: string) => ({ id: "p", so: 2, trangThai, ho: [{ hoId }], pheDuyet: trangThai === "DA_PHE_DUYET" ? { so: "12/QĐ-UBND" } : undefined }) as unknown as PhienBanPA;

describe("Ràng buộc xóa", () => {
  const { duAn, ho } = taoDuAnMau();
  const h = ho[0]!;
  it("hộ thường xóa được; hộ trong PA đã chốt / đã duyệt thì không; PA đã hủy thì được", () => {
    expect(lyDoKhongXoaHo(duAn, h)).toEqual([]);
    expect(lyDoKhongXoaHo({ ...duAn, phuongAn: [pa("DA_CHOT", h.id)] }, h)[0]).toMatch(/bản phương án số 2 đã chốt/);
    expect(lyDoKhongXoaHo({ ...duAn, phuongAn: [pa("DA_PHE_DUYET", h.id)] }, h)[0]).toMatch(/đã phê duyệt \(12\/QĐ-UBND\)/);
    expect(lyDoKhongXoaHo({ ...duAn, phuongAn: [pa("DA_HUY", h.id)] }, h)).toEqual([]);
  });
  it("hộ đã chi trả không xóa được; đợt chi đã hủy không tính (kể cả số tiền đã chi)", () => {
    const dot = { id: "d1", ngay: "2026-10-01", soTien: "1000000", hinhThuc: "CHUYEN_KHOAN" as const, chungTu: "", nguoiGhi: "a" };
    expect(lyDoKhongXoaHo(duAn, { ...h, chiTra: { dot: [dot] } })).toEqual(["đã ghi 1 đợt chi trả"]);
    const huy = { ...h, chiTra: { dot: [{ ...dot, huy: { luc: "", nguoi: "a", lyDo: "ghi nhầm" } }] } };
    expect(lyDoKhongXoaHo(duAn, huy)).toEqual([]);
    expect(tinhChiTra(huy, [], [], "2026-10-05").daChi.toString()).toBe("0");
  });
  it("dự án có PA đã duyệt hoặc hộ đã chi trả không xóa được", () => {
    expect(lyDoKhongXoaDuAn(duAn, ho)).toEqual([]);
    expect(lyDoKhongXoaDuAn({ ...duAn, phuongAn: [pa("DA_PHE_DUYET", h.id)] }, ho)).toEqual(["có 1 bản phương án đã phê duyệt"]);
  });
  it("xóa hẳn sau 30 ngày trong thùng rác", () => {
    const d = { luc: "2026-09-01T00:00:00.000Z", nguoi: "a", lyDo: "x" };
    expect(soNgayTrongThungRac(d, new Date("2026-09-30T12:00:00Z"))).toBe(29);
    expect(duocXoaHan(d, new Date("2026-09-30T12:00:00Z"))).toBe(false);
    expect(duocXoaHan(d, new Date("2026-10-01T00:00:00Z"))).toBe(true);
  });
});
