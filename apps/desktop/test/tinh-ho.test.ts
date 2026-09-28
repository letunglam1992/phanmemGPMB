import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhBieuThuc } from "../src/bieu-thuc";

const cs = cs0 as unknown as BoChinhSach;

describe("Biểu thức khối lượng", () => {
  it("tính như Excel, số thập phân chính xác", () => {
    expect(tinhBieuThuc("=10*9.8").toString()).toBe("98");
    expect(tinhBieuThuc("=5+6+3").toString()).toBe("14");
    expect(tinhBieuThuc("(2,5+1)*3").toString()).toBe("10.5");
    expect(tinhBieuThuc("0.1+0.2").toString()).toBe("0.3");
    expect(() => tinhBieuThuc("=2*abc")).toThrow();
    expect(() => tinhBieuThuc("1/0")).toThrow();
  });
});

describe("Tính hộ mẫu (từ biểu áp giá thửa 85, ẩn danh)", () => {
  const { duAn, ho } = taoDuAnMau();
  const kq = tinhHo(cs, duAn, ho[0]!);

  it("bồi thường đất = DT × 54.000 đ", () => {
    // (9.222,1 + 443,2) × 54.000
    expect(kq.theoCot.BT_DAT.toString()).toBe("521926200");
  });
  it("chuyển đổi nghề = 3 × giá đất NN × DT (khớp dòng 88 biểu mẫu: 1.493.980.200 đ cho thửa 85)", () => {
    const d85 = kq.tatCa.find((x) => x.cot === "HT_CDN" && x.dong.noiDung.includes("Thửa 85"));
    expect(d85!.dong.thanhTien!.toNumber()).toBe(1493980200);
  });
  it("cây trồng thửa 85 (nhãn, xoài, na) theo quỹ diện tích", () => {
    // Tổng G47–G68 biểu mẫu
    const bieuMau = 54600000 + 62400000 + 57000000 + 50400000 + 110400000 + 43125000 + 11115000 + 5160000 + 2430000
      + 32400000 + 72150000 + 74000000 + 29748000 + 61065000 + 51192000 + 6318000 + 504000 + 483000 + 162000 + 1844400 + 3600000;
    expect(kq.theoCot.BT_CAY.toNumber()).toBe(bieuMau);
  });
  it("tài sản ngoài danh mục có căn cứ", () => {
    expect(kq.theoCot.HT_TAI_SAN.toNumber()).toBe(202 * 50093);
  });
  it("tổng làm tròn lên nghìn đồng ở cấp hộ, được chốt khi không còn dòng cần xác nhận", () => {
    expect(kq.tong.tongLamTron.mod(1000).toNumber()).toBe(0);
    expect(kq.tong.tongLamTron.gte(kq.tong.tongChuaLamTron)).toBe(true);
    expect(kq.tong.duocChot).toBe(true);
  });
  it("hộ 2: thửa đất ở tính theo phân lớp (QD-21) — lớp 2 = 60% giá VT1", () => {
    const k2 = tinhHo(cs, duAn, ho[1]!);
    const d = k2.tatCa.find((x) => x.dong.noiDung.includes("phân lớp"))!;
    // 100 × 3.300.000 + 50,5 × 1.980.000
    expect(d.dong.thanhTien!.toString()).toBe(String(330000000 + 99990000));
    expect(d.dong.trangThai).toBe("TAM_TINH");
    expect(d.bieu!.map((b) => [b.kl.toString(), b.heSo!.toString(), b.donGia.toString()])).toEqual([["100", "1", "3300000"], ["50.5", "0.6", "3300000"]]);
  });
  it("hộ 2: thiếu giá đất, thiếu T/T1, thiếu giá gạo → không được chốt, có giải thích", () => {
    const k2 = tinhHo(cs, duAn, ho[1]!);
    expect(k2.tong.duocChot).toBe(false);
    const canhBao = k2.tatCa.flatMap((x) => x.dong.canhBao).join(" | ");
    expect(canhBao).toContain("Chưa chọn giá đất");
    expect(canhBao).toContain("QD-11");
    expect(canhBao).toContain("giá gạo");
  });
});

describe("P0-1: số không hợp lệ không làm dừng tính toán", () => {
  it('DT thu hồi "9222,1", đơn giá "abc", giá gạo "x" → không ném lỗi; dòng Thiếu căn cứ nêu đúng trường; không được chốt', () => {
    const { duAn, ho } = taoDuAnMau();
    const h = structuredClone(ho[0]!);
    h.thua[0]!.dienTichThuHoi = "9222,1";
    const ts = h.taiSan.find((x) => x.loai === "CAY")!;
    (ts as { donGia: string }).donGia = "abc";
    const kq = tinhHo(cs, { ...duAn, giaGao: { dongKg: "x", nguon: "" } }, h);
    const dl = kq.nhom.find((n) => n.ma === "DL")!;
    expect(dl.dong.map((x) => x.dong.canhBao[0])).toEqual(
      expect.arrayContaining([expect.stringContaining('"9222,1"'), expect.stringContaining('"abc"'), expect.stringContaining('"x"')]),
    );
    expect(dl.dong.some((x) => x.dong.noiDung.includes("DT thu hồi"))).toBe(true);
    expect(kq.tong.duocChot).toBe(false);
    // hồ sơ gốc không bị sửa
    expect(h.thua[0]!.dienTichThuHoi).toBe("9222,1");
  });
  it("dữ liệu hợp lệ: không có nhóm DL", () => {
    const { duAn, ho } = taoDuAnMau();
    expect(tinhHo(cs, duAn, ho[0]!).nhom.some((n) => n.ma === "DL")).toBe(false);
  });
});
