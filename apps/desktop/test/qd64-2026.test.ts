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
