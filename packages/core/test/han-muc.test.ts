import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import { hanMucDatOPl1, hanMucDieu7TheoNhom, hanMucKhaiHoangPl1, laPhuong, nhomDatNN, type BoChinhSach } from "../src";

const cs = cs0 as unknown as BoChinhSach;
const X = "Xã Chiềng Mung", P = "Phường Tô Hiệu";

describe("Hạn mức Phụ lục I QĐ 106/2025", () => {
  it("nhận biết phường theo tên đơn vị hành chính", () => {
    expect(laPhuong(P)).toBe(true);
    expect(laPhuong(X)).toBe(false);
  });

  it("công nhận đất ở: trước 18/12/1980 → Điều 3; đến trước 15/10/1993 → Điều 4; sau đó không có", () => {
    const cn = (ngay: string, xa: string, viTri: "TRUNG_TAM" | "DUONG_XA" | "CON_LAI") => hanMucDatOPl1(cs, { loai: "CONG_NHAN", ngaySuDung: ngay, xa, viTri });
    expect(cn("1975-01-01", X, "TRUNG_TAM")?.m2).toBe("400");
    expect(cn("1975-01-01", X, "DUONG_XA")?.m2).toBe("400");
    expect(cn("1975-01-01", X, "CON_LAI")?.m2).toBe("450");
    expect(cn("1980-12-17", P, "TRUNG_TAM")?.m2).toBe("180");
    expect(cn("1975-01-01", P, "CON_LAI")?.m2).toBe("220");
    expect(cn("1980-12-18", X, "TRUNG_TAM")?.m2).toBe("350");
    expect(cn("1990-01-01", X, "CON_LAI")?.m2).toBe("400");
    expect(cn("1990-01-01", P, "TRUNG_TAM")?.m2).toBe("120");
    expect(cn("1993-10-14", P, "CON_LAI")?.m2).toBe("150");
    expect(cn("1993-10-15", X, "CON_LAI")).toBeNull();
    expect(cn("1975-01-01", X, "CON_LAI")?.moTa).toContain("Điều 3 Phụ lục I");
    expect(cn("1990-01-01", P, "CON_LAI")?.moTa).toContain("điểm b khoản 2");
  });

  it("giao đất ở: xã theo Điều 5 (giáp đường xã thuộc 'vị trí còn lại'), phường theo Điều 6", () => {
    const g = (xa: string, viTri: "TRUNG_TAM" | "DUONG_XA" | "CON_LAI") => hanMucDatOPl1(cs, { loai: "GIAO", ngaySuDung: "2000-01-01", xa, viTri });
    expect(g(X, "TRUNG_TAM")?.m2).toBe("150");
    expect(g(X, "DUONG_XA")?.m2).toBe("180");
    expect(g(X, "CON_LAI")?.m2).toBe("180");
    expect(g(P, "TRUNG_TAM")?.m2).toBe("100");
    expect(g(P, "CON_LAI")?.m2).toBe("120");
    expect(g(P, "DUONG_XA")?.m2).toBe("120");
    expect(g(X, "TRUNG_TAM")?.canCu[0]?.viTri).toBe("Điều 5 Phụ lục I");
  });

  it("đất tự khai hoang (Điều 7): hằng năm, NTS 2 ha; CLN, rừng 30 ha xã / 20 ha phường; RDD không có", () => {
    const k = (loaiDat: string, xa: string) => hanMucKhaiHoangPl1(cs, { loaiDat, xa });
    expect(k("LUC", X)?.m2).toBe("20000");
    expect(k("NTS", P)?.m2).toBe("20000");
    expect(k("CLN", X)?.m2).toBe("300000");
    expect(k("CLN", P)?.m2).toBe("200000");
    expect(k("RPH", X)?.m2).toBe("300000");
    expect(k("RSX", P)?.luuY).toContain("rừng trồng");
    expect(k("RDD", X)).toBeNull();
  });

  it("bộ chính sách không có Phụ lục I → không tự đặt hạn mức", () => {
    const { hanMucPl1: _, ...khong } = cs;
    expect(hanMucDatOPl1(khong as BoChinhSach, { loai: "GIAO", ngaySuDung: "2000-01-01", xa: X, viTri: "CON_LAI" })).toBeNull();
    expect(hanMucKhaiHoangPl1(khong as BoChinhSach, { loaiDat: "LUC", xa: X })).toBeNull();
  });

  it("1.3.5: nhóm loại đất NN theo khoản 1 Điều 7; mức Điều 7 theo xã/phường để điền sẵn ở dự án", () => {
    expect(["LUC", "BHK", "HNK", "NTS"].map(nhomDatNN)).toEqual(["HANG_NAM", "HANG_NAM", "HANG_NAM", "HANG_NAM"]);
    expect(nhomDatNN("cln")).toBe("LAU_NAM");
    expect([nhomDatNN("RSX"), nhomDatNN("RPH")]).toEqual(["RUNG", "RUNG"]);
    expect([nhomDatNN("RDD"), nhomDatNN("NKH"), nhomDatNN("ONT")]).toEqual([null, null, null]);
    const x = hanMucDieu7TheoNhom(cs, X)!;
    expect(x.m2).toEqual({ HANG_NAM: "20000", LAU_NAM: "300000", RUNG: "300000" });
    expect(x.canCu).toContain("khoản 1 Điều 7 Phụ lục I");
    expect(x.canCu).toContain("tại xã");
    expect(hanMucDieu7TheoNhom(cs, P)!.m2).toEqual({ HANG_NAM: "20000", LAU_NAM: "200000", RUNG: "200000" });
  });

  it("1.3.5: Điều 5 (xã) — chỉ giáp đường xã thuộc vị trí còn lại (180 m²); Điều 3, 4 — đường xã thuộc điểm a", () => {
    const g = (viTri: "TRUNG_TAM" | "DUONG_XA" | "CON_LAI") => hanMucDatOPl1(cs, { loai: "GIAO", ngaySuDung: "2000-01-01", xa: X, viTri })!.m2;
    expect([g("TRUNG_TAM"), g("DUONG_XA"), g("CON_LAI")]).toEqual(["150", "180", "180"]);
    const c = (viTri: "TRUNG_TAM" | "DUONG_XA" | "CON_LAI") => hanMucDatOPl1(cs, { loai: "CONG_NHAN", ngaySuDung: "1979-01-01", xa: X, viTri })!.m2;
    expect([c("TRUNG_TAM"), c("DUONG_XA"), c("CON_LAI")]).toEqual(["400", "400", "450"]);
    const gp = (viTri: "TRUNG_TAM" | "CON_LAI") => hanMucDatOPl1(cs, { loai: "GIAO", ngaySuDung: "2000-01-01", xa: P, viTri })!.m2;
    expect([gp("TRUNG_TAM"), gp("CON_LAI")]).toEqual(["100", "120"]);
  });
});
