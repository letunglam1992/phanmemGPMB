import { describe, expect, it } from "vitest";
import { CAU_HINH_MAC_DINH, docDgn, dungThua, tinhDienTichThuHoi } from "@gpmb/gis";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnTapHuan } from "../src/tap-huan";
import { laDuAnMau } from "../src/giay-phep";
import { tinhHo } from "../src/tinh-ho";

describe("Dự án tập huấn (1.0.20, D2)", () => {
  it("bản đồ DXF giả lập: 18 thửa tờ 12, ranh GPMB cắt hàng giữa — thửa 7–12 thu hồi 450 m²", () => {
    const { banDo } = taoDuAnTapHuan("2026-10-19");
    const ban = docDgn(banDo);
    const kq = dungThua(ban, CAU_HINH_MAC_DINH);
    expect(kq.thua).toHaveLength(18);
    expect(new Set(kq.thua.map((t) => t.soTo))).toEqual(new Set(["12"]));
    expect(kq.thua.every((t) => Math.round(t.dienTichHinhHoc) === 750)).toBe(true);
    expect(kq.vungGpmb.length).toBeGreaterThan(0);
    const dt = tinhDienTichThuHoi(kq.thua, kq.vungGpmb.slice(0, 1).map((v) => v.vong));
    const theoSo = new Map(kq.thua.map((t, i) => [t.soThua, dt[i]!]));
    for (const so of ["7", "8", "9", "10", "11", "12"]) expect(Math.round(theoSo.get(so)!.dienTichThuHoi)).toBe(450);
    for (const so of ["1", "6", "13", "18"]) expect(theoSo.get(so)!.phamVi).toBe("NGOAI");
  });
  it("6 hộ khớp thửa trên bản đồ, đánh dấu tập huấn + mẫu (không tính bản dùng thử), không có số định danh", () => {
    const { duAn, ho } = taoDuAnTapHuan("2026-10-19");
    expect(duAn).toMatchObject({ tapHuan: true, mau: true, banDo: { tenTep: "Ban-do-tap-huan.dxf" } });
    expect(laDuAnMau(duAn)).toBe(true);
    expect(ho.map((h) => h.thua[0]!.soThua)).toEqual(["7", "8", "9", "10", "11", "12"]);
    expect(ho.every((h) => h.duAnId === duAn.id && !h.soDinhDanh && !h.dienThoai)).toBe(true);
    expect(ho.find((h) => h.ma === "H03")!.thua[0]!.gia).toBeNull(); // thực hành tra giá
    expect(ho.find((h) => h.ma === "H05")!.khieuNai).toHaveLength(1);
    // tính được, hộ thiếu giá có khoản "Thiếu căn cứ"
    const cs = cs0 as unknown as BoChinhSach;
    const k3 = tinhHo(cs, duAn, ho[2]!);
    expect(k3.tong.soDongThieuCanCu).toBeGreaterThan(0);
    expect(tinhHo(cs, duAn, ho[0]!).tong.tongLamTron.gt(0)).toBe(true);
  });
});
