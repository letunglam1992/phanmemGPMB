/** 1.3.5 (QD-46) — hạn mức của dự án theo Phụ lục I QĐ 106/2025: đất NN theo nhóm loại đất (Điều 7); đất ở theo vị trí (Điều 3–6). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-10-06.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { hanMucDatOThua, hanMucNNDuAn, tinhHo } from "../src/tinh-ho";
import { duAnTheoBan, type PhienBanPA } from "../src/phuong-an";
import type { DuAn, KhongGiayTo } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;

describe("Hạn mức đất nông nghiệp theo loại đất (khoản 1 Điều 7 Phụ lục I)", () => {
  const { duAn: da0 } = taoDuAnMau();
  const duAn: DuAn = { ...da0, hanMucNN: { m2: "5000", canCu: "Hạn mức chung (thử)" }, hanMucNNLoai: { hangNam: "20000", lauNam: "300000", canCu: "khoản 1 Điều 7 Phụ lục I QĐ 106/2025/QĐ-UBND (tại xã)" } };

  it("thửa lấy ô theo nhóm loại đất; ô trống / loại khác → hạn mức chung", () => {
    expect(hanMucNNDuAn(duAn, "LUC")!.m2).toBe("20000");
    expect(hanMucNNDuAn(duAn, "NTS")!.m2).toBe("20000");
    expect(hanMucNNDuAn(duAn, "CLN")!.m2).toBe("300000");
    expect(hanMucNNDuAn(duAn, "CLN")!.canCu).toContain("đất trồng cây lâu năm");
    expect(hanMucNNDuAn(duAn, "RSX")!.m2).toBe("5000"); // ô rừng trống → chung
    expect(hanMucNNDuAn(duAn, "RDD")!.m2).toBe("5000");
    expect(hanMucNNDuAn({ hanMucNN: null, hanMucNNLoai: { hangNam: "20000", canCu: "" } }, "CLN")).toBeNull();
    // dữ liệu trước 1.3.5: chỉ có hạn mức chung
    expect(hanMucNNDuAn({ hanMucNN: { m2: "30000", canCu: "x" } }, "CLN")!.m2).toBe("30000");
  });

  it("hỗ trợ chuyển đổi nghề: thửa đất lâu năm không bị chặn ở hạn mức đất hằng năm", () => {
    const { ho } = taoDuAnMau();
    const h0 = ho.find((h) => h.hoTro.chuyenDoiNghe)!;
    const t = { ...h0.thua[0]!, loaiDat: "CLN", dienTich: "25000", dienTichThuHoi: "25000" };
    const h = { ...h0, thua: [t] };
    const c06 = tinhHo(cs, duAn, h).tatCa.find((x) => x.dong.ma === "C06")!.dong;
    expect(c06.thamSo["Hạn mức"]).toContain("300.000");
    const chiHangNam: DuAn = { ...duAn, hanMucNN: null, hanMucNNLoai: { hangNam: "20000", canCu: "x" } };
    const thieu = tinhHo(cs, chiHangNam, h).tatCa.find((x) => x.dong.ma === "C06")!.dong;
    expect(thieu.trangThai).toBe("THIEU_CAN_CU");
  });

  it("bản phương án chốt trước 1.3.5 (không chụp hạn mức theo loại) không lấy hạn mức theo loại của dự án hiện tại", () => {
    const p = { thamSoDuAn: { xa: duAn.xa, giaGao: null, hanMucNN: { m2: "30000", canCu: "cũ" }, heSoGiaDat: null }, boChinhSach: duAn.boChinhSach } as unknown as PhienBanPA;
    const d = duAnTheoBan(duAn, p);
    expect(d.hanMucNNLoai).toBeUndefined();
    expect(hanMucNNDuAn(d, "CLN")!.m2).toBe("30000");
  });
});

describe("Hạn mức đất ở theo vị trí chọn ở dự án (Điều 3, 4, 5, 6 Phụ lục I)", () => {
  const { duAn: da0 } = taoDuAnMau();
  const k = (ngay: string, them: Partial<KhongGiayTo> = {}) => ({ dieu: "D8_K1", ngaySuDung: ngay, ...them }) as unknown as KhongGiayTo;
  const xa = (viTri: "TRUNG_TAM" | "DUONG_XA" | "CON_LAI"): DuAn => ({ ...da0, xa: "Xã Chiềng Mung", hanMucDatO: { congNhan: "", giao: "", canCu: "", viTri } });

  it("xã: trung tâm → Điều 3 400, Điều 4 350, Điều 5 150; chỉ giáp đường xã → Điều 3/4 như trung tâm, Điều 5 = 180", () => {
    const a = hanMucDatOThua(cs, xa("TRUNG_TAM"), k("1979-05-01"));
    expect([a.hmCn, a.hmGiao]).toEqual(["400", "150"]);
    expect(a.canCuCn).toContain("Điều 3 Phụ lục I");
    expect(a.canCuGiao).toContain("Điều 5 Phụ lục I");
    expect(hanMucDatOThua(cs, xa("TRUNG_TAM"), k("1985-05-01")).hmCn).toBe("350");
    const b = hanMucDatOThua(cs, xa("DUONG_XA"), k("1985-05-01"));
    expect([b.hmCn, b.hmGiao]).toEqual(["350", "180"]);
    const c = hanMucDatOThua(cs, xa("CON_LAI"), k("1979-05-01"));
    expect([c.hmCn, c.hmGiao]).toEqual(["450", "180"]);
  });

  it("phường: Điều 3 180/220, Điều 4 120/150, Điều 6 100/120", () => {
    const p = (viTri: "TRUNG_TAM" | "CON_LAI", ngay: string) => hanMucDatOThua(cs, { ...da0, xa: "Phường Tô Hiệu", hanMucDatO: { congNhan: "", giao: "", canCu: "", viTri } }, k(ngay));
    expect([p("TRUNG_TAM", "1979-01-01").hmCn, p("CON_LAI", "1979-01-01").hmCn]).toEqual(["180", "220"]);
    expect([p("TRUNG_TAM", "1990-01-01").hmCn, p("CON_LAI", "1990-01-01").hmCn]).toEqual(["120", "150"]);
    expect([p("TRUNG_TAM", "1990-01-01").hmGiao, p("CON_LAI", "1990-01-01").hmGiao]).toEqual(["100", "120"]);
  });

  it("vị trí chọn ở thửa ưu tiên hơn vị trí của dự án; hạn mức riêng của thửa ưu tiên nhất; chưa chọn → số tự nhập", () => {
    expect(hanMucDatOThua(cs, xa("TRUNG_TAM"), k("1979-01-01", { viTriHanMuc: "CON_LAI" })).hmCn).toBe("450");
    expect(hanMucDatOThua(cs, xa("TRUNG_TAM"), k("1979-01-01", { hanMuc: "300", canCuHanMuc: "QĐ riêng" })).hmCn).toBe("300");
    const tuNhap = hanMucDatOThua(cs, { ...da0, hanMucDatO: { congNhan: "500", giao: "200", canCu: "QĐ cũ" } }, k("1979-01-01"));
    expect([tuNhap.hmCn, tuNhap.hmGiao, tuNhap.canCuCn]).toEqual(["500", "200", "QĐ cũ"]);
  });
});
