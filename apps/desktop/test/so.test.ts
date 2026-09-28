/** P0-2: quy ước số Việt Nam; chuyển đổi dữ liệu cũ; rà soát số liệu nghi vấn. */
import { describe, expect, it } from "vitest";
import { docSoNhap, hienSo, laSoMay, soD } from "../src/so";
import { apDungCachHieu, chuyenDoiHo, laMoHo, raSoat } from "../src/ra-soat-so";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhBieuThuc } from "../src/bieu-thuc";

describe("Đọc số theo quy ước Việt Nam", () => {
  it.each([
    ["20000", "20000"], ["20.000", "20000"], ["1.234,5", "1234.5"], ["9222,1", "9222.1"], ["9.222,1", "9222.1"],
    [" 1 500 ", "1500"], ["-5", "-5"], ["0,03", "0.03"], ["007", "7"], ["1.000.000", "1000000"],
  ])("%s → %s", (vao, ra) => expect(docSoNhap(vao)).toEqual({ so: ra, loi: null }));
  it.each(["9222.1", "20.00", "1,2,3", "abc", "1.2345", "12.34.567"])("%s → lỗi", (vao) => {
    const r = docSoNhap(vao);
    expect(r.so).toBeNull();
    expect(r.loi).toBeTruthy();
  });
  it("gợi ý khi dùng dấu chấm thập phân", () => expect(docSoNhap("9222.1").loi).toMatch(/9222,1/));
  it("hiển thị kiểu Việt Nam", () => {
    expect(hienSo("1234.5")).toBe("1.234,5");
    expect(hienSo("20000")).toBe("20.000");
    expect(hienSo("-1234567.891", 2)).toBe("-1.234.567,89");
    expect(hienSo("abc")).toBe("abc");
  });
  it("chuẩn máy, soD an toàn", () => {
    expect(laSoMay("1234.5")).toBe(true);
    expect(laSoMay("1.234,5")).toBe(false);
    expect(soD("9222,1").toString()).toBe("0");
    expect(soD("9222.1").toString()).toBe("9222.1");
  });
  it("ô khối lượng: số thường theo quy ước Việt Nam, biểu thức kiểu Excel", () => {
    expect(tinhBieuThuc("1.500").toString()).toBe("1500");
    expect(tinhBieuThuc("2,5").toString()).toBe("2.5");
    expect(tinhBieuThuc("9.8").toString()).toBe("9.8"); // dữ liệu cũ chuẩn máy vẫn đọc đúng
    expect(tinhBieuThuc("=10*9.8").toString()).toBe("98");
  });
});

describe("Chuyển đổi dữ liệu cũ, rà soát", () => {
  it('"9222,1" tự đổi và ghi nhật ký; "20.000" không tự đổi mà vào danh sách nghi vấn', () => {
    const { duAn, ho } = taoDuAnMau();
    const h = structuredClone(ho[0]!);
    h.thua[0]!.dienTichThuHoi = "9222,1";
    h.thua[1]!.dienTich = "20.000";
    const r = chuyenDoiHo(h)!;
    expect(r.doi).toEqual([expect.objectContaining({ tu: "9222,1", thanh: "9222.1" })]);
    expect(r.h.thua[0]!.dienTichThuHoi).toBe("9222.1");
    expect(r.h.thua[1]!.dienTich).toBe("20.000");
    expect(r.h.phienBanCauTruc).toBe(2);
    expect(r.h.nhatKy.at(-1)!.noiDung).toMatch(/"9222,1" → 9222.1/);
    expect(chuyenDoiHo(r.h)).toBeNull();

    expect(laMoHo("20.000")).toBe(true);
    const ds = raSoat([duAn], () => [r.h]);
    const m = ds.find((x) => x.loai === "MO_HO")!;
    expect(m.gt).toBe("20.000");
    expect(m.chon).toEqual({ moi: "20000", cu: "20" });
    const ban = structuredClone(r.h);
    expect(apDungCachHieu(ban, m, m.chon!.moi)).toBe(true);
    expect(ban.thua[1]!.dienTich).toBe("20000");
    expect(raSoat([duAn], () => [ban]).some((x) => x.loai === "MO_HO")).toBe(false);
  });
  it("kiểm tra hợp lý: hạn mức < 100 m², DT thu hồi > DT thửa (chỉ nhắc)", () => {
    const { duAn, ho } = taoDuAnMau();
    const h = structuredClone(ho[0]!);
    h.thua[0]!.dienTichThuHoi = String(Number(h.thua[0]!.dienTich) + 10);
    const ds = raSoat([{ ...duAn, hanMucNN: { m2: "20", canCu: "" } }], () => [h]);
    expect(ds.filter((x) => x.loai === "HOP_LY").map((x) => x.nhan)).toEqual(expect.arrayContaining(["Hạn mức giao đất NN (m²)", expect.stringContaining("DT thu hồi")]));
  });
});
