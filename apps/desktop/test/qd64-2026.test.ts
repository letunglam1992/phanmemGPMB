/** QĐ 64/2026: hệ số chuyển đổi nghề theo tổ, thôn của thửa (tinh-ho), cột nhập Excel; bộ mặc định cho dự án mới. */
import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { BO_CHINH_SACH } from "../src/du-lieu";
import { GOI_MOI_NHAT } from "../src/goi-chinh-sach";

const cs = BO_CHINH_SACH[GOI_MOI_NHAT]!;

describe("QĐ 64/2026 trong tính toán hộ", () => {
  const { duAn, ho } = taoDuAnMau();
  const da = { ...duAn, xa: "Phường Chiềng An" };
  const cdn = (h: (typeof ho)[number]) => tinhHo(cs, da, h).tatCa.filter((x) => x.dong.ma === "C06");
  it("thửa chưa ghi tổ, thôn ở phường có danh sách → Cần xác nhận; ghi Bản Cá → 5 lần; Bản Tông Hụm → 4 lần", () => {
    const h0 = ho[0]!;
    expect(cdn(h0).every((x) => x.dong.trangThai === "CAN_XAC_NHAN")).toBe(true);
    const h5 = { ...h0, thua: h0.thua.map((t) => ({ ...t, thonBan: ["Bản Cá"] })) };
    const d5 = cdn(h5);
    expect(d5.every((x) => x.dong.trangThai === "TAM_TINH" && /hệ số 5/.test(x.dong.thamSo["Địa bàn"]!))).toBe(true);
    const h4 = { ...h0, thua: h0.thua.map((t) => ({ ...t, thonBan: ["Bản Tông Hụm"] })) };
    expect(cdn(h4)[0]!.dong.thanhTien!.mul(5).toString()).toBe(d5[0]!.dong.thanhTien!.mul(4).toString());
  });
  it("dữ liệu mẫu (Xã Chiềng Mung, không có trong Phụ lục) vẫn 3 lần như trước", () => {
    const k = tinhHo(cs, duAn, ho[0]!);
    const c = k.tatCa.find((x) => x.dong.ma === "C06")!;
    expect(c.dong.thanhTien!.toString()).toBe("1493980200");
    expect(duAn.boChinhSach).toBe(GOI_MOI_NHAT);
  });
});

import { goiYThon, raSoatQd64, thuaThieuThon } from "../src/qd64";
describe("1.0.5: rà soát QĐ 64, gợi ý tổ thôn", () => {
  const { duAn, ho } = taoDuAnMau();
  it("gợi ý theo nguyên cụm, không nhầm Tổ 1 với Tổ 10", () => {
    expect(goiYThon(cs, "Phường Chiềng An", "Bản Cá, phường Chiềng An")).toEqual([{ thon: "Bản Cá", heSo: "5" }]);
    expect(goiYThon(cs, "Phường Chiềng Sinh", "Tổ 10, phường Chiềng Sinh")).toEqual([{ thon: "Tổ 10", heSo: "5" }]);
    expect(goiYThon(cs, "Phường Chiềng An", "Bản Cáp")).toEqual([]);
    expect(goiYThon(cs, "Xã Chiềng Mung", "Bản Cá")).toEqual([]);
  });
  it("rà soát: dự án bộ cũ → đề xuất, tổng cũ/mới; thửa thiếu tổ thôn đếm ở xã có Phụ lục", () => {
    const daCu = { ...duAn, id: "cu", boChinhSach: "sonla-2026-03-31" };
    const daPhuong = { ...duAn, id: "p", xa: "Phường Chiềng An" };
    const hoCua = (id: string) => ho.map((h) => ({ ...h, duAnId: id }));
    const r = raSoatQd64([daCu, daPhuong, duAn], hoCua, BO_CHINH_SACH, GOI_MOI_NHAT);
    expect(r[0]!.dungBoCu).toBe(true);
    expect(r[0]!.deXuat).toMatch(/Chưa có phương án được duyệt/);
    expect(r[0]!.tongCu!.toString()).toBe(r[0]!.tongMoi!.toString()); // Chiềng Mung: 3 lần cả hai bộ
    expect(r[1]!.soThuaThieuThon).toBe(ho.reduce((s, h) => s + thuaThieuThon(cs, daPhuong, h).length, 0));
    expect(r[1]!.soThuaThieuThon).toBeGreaterThan(0);
    expect(r[2]!.deXuat).toBe("Không cần xử lý");
  });
});
