import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { trangThaiHo, vuongMacBuoc, vuongMacHo } from "../src/trang-thai";
import { diemKhop } from "../src/thanh-phan/Chon";
import type { Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;

describe("Tái định cư trong tính hộ", () => {
  const { duAn, ho } = taoDuAnMau();
  const goc = ho[0]!;
  const voi = (tdc: NonNullable<Ho["hoTro"]["taiDinhCu"]>): Ho => ({ ...goc, hoTro: { ...goc.hoTro, taiDinhCu: tdc } });

  it("tự lo chỗ ở → dòng C08 trong nhóm B.VI, cộng vào hỗ trợ khác", () => {
    const k0 = tinhHo(cs, duAn, goc);
    const k = tinhHo(cs, duAn, voi({ hinhThuc: "TU_LO", khoanKhac: [] }));
    const n = k.nhom.find((x) => x.ma === "B.VI")!;
    expect(n.dong.map((x) => x.dong.ma)).toEqual(["C08"]);
    expect(k.theoCot.HT_KHAC.minus(k0.theoCot.HT_KHAC).toNumber()).toBe(n.dong[0]!.dong.thanhTien!.toNumber());
  });

  it("giao đất ở: thiếu giá đất khu TĐC → Thiếu căn cứ; có giá → C10, C11; khoản khác thiếu căn cứ bị chặn", () => {
    const thieu = tinhHo(cs, duAn, voi({ hinhThuc: "DAT_O", suatToiThieu: true, hoTroTienSdd: true, khoanKhac: [] }));
    expect(thieu.nhom.find((x) => x.ma === "B.VI")!.dong.every((x) => x.dong.trangThai === "THIEU_CAN_CU")).toBe(true);
    const k = tinhHo(cs, duAn, voi({ hinhThuc: "DAT_O", donGia: "2000000", dienTichGiao: "100", nguonGia: "NQ 152", suatToiThieu: true, hoTroTienSdd: true, khoanKhac: [{ id: "a", noiDung: "San lấp", soTien: "5000000", canCu: "" }, { id: "b", noiDung: "Hỗ trợ di chuyển", soTien: "3000000", canCu: "QĐ 45/QĐ-UBND" }] }));
    const ds = k.nhom.find((x) => x.ma === "B.VI")!.dong.map((x) => x.dong);
    expect(ds.map((d) => d.ma)).toEqual(["C10", "C11", "C.TĐC", "C.TĐC"]);
    expect(ds[1]!.thanhTien!.toString()).toBe("40000000"); // 20% × 2 tr × 100 m²
    expect(ds[2]!.trangThai).toBe("THIEU_CAN_CU");
    expect(ds[3]!.thanhTien!.toString()).toBe("3000000");
    // hộ mẫu không có thửa đất ở bị thu hồi → cảnh báo điều kiện
    expect(ds[0]!.canhBao.join(" ")).toContain("không có thửa đất ở");
  });
});

describe("Vướng mắc theo từng bước của hộ", () => {
  const { duAn, ho } = taoDuAnMau();
  it("ghi vướng mắc ở bước 7 → hộ Vướng mắc, có trong danh sách vướng mắc", () => {
    const h: Ho = { ...ho[0]!, vuongMac: null, tienDo: { ...ho[0]!.tienDo, "7": { trangThai: "DANG", vuongMac: "Không nhất trí đơn giá cây trồng" } } };
    const k = tinhHo(cs, duAn, h);
    expect(vuongMacBuoc(h)).toEqual([{ ma: "7", ten: expect.any(String), noiDung: "Không nhất trí đơn giá cây trồng", ngay: undefined }]);
    expect(trangThaiHo(duAn, h, k, "2026-09-28")).toBe("VUONG_MAC");
    expect(vuongMacHo(duAn, h, k, "2026-09-28").some((v) => v.noiDung.includes("Bước 7") && v.muc === "CAO")).toBe(true);
  });
});

describe("Ô chọn: tìm nhanh không dấu", () => {
  it("khớp đầu chuỗi, đầu từ, cụm bất kỳ, chữ cái đầu", () => {
    expect(diemKhop("Xã Chiềng Mung", "chieng")).toBe(2);
    expect(diemKhop("Xã Chiềng Mung", "xa ch")).toBe(3);
    expect(diemKhop("Xã Chiềng Mung", "mung")).toBe(2);
    expect(diemKhop("Xã Chiềng Mung", "ung")).toBe(1);
    expect(diemKhop("Xã Chiềng Mung", "xcm")).toBe(1);
    expect(diemKhop("Xã Chiềng Mung", "muong")).toBe(0);
  });
});
