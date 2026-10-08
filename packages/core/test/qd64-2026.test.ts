/** QĐ 64/2026/QĐ-UBND (hiệu lực 06/10/2026): hệ số hỗ trợ chuyển đổi nghề theo tổ, thôn; k11 Đ6 QĐ 14/2026 sửa đổi. */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-10-06.json";
import csCu0 from "../../../policy/goi/sonla-2026-03-31.json";
import { chuyenDoiNghe, heSoChuyenDoiNghe, hoTroTienSddTdc, thonCoHeSo, type BoChinhSach } from "../src";

const cs = cs0 as unknown as BoChinhSach;
const csCu = csCu0 as unknown as BoChinhSach;
const p = { loaiDat: "CLN", dienTichThuHoiM2: "1000", hanMucM2: "30000", canCuHanMuc: "PL I", giaDatNNNghinDong: "54" };

describe("QĐ 64/2026 — Điều 14 PL II QĐ 106/2025 sửa đổi", () => {
  it("toàn bộ phường Tô Hiệu: 5 lần, không cần ghi tổ", () => {
    expect(heSoChuyenDoiNghe(cs, "Phường Tô Hiệu").heSo).toBe("5");
    const d = chuyenDoiNghe(cs, { ...p, xa: "Phường Tô Hiệu" });
    expect(d.thanhTien!.toString()).toBe("270000000"); // 5 × 54.000 × 1.000
    expect(d.trangThai).toBe("TAM_TINH");
  });
  it("tổ thuộc mục 1 → 5; mục 2 → 4; không thuộc danh sách → 3; không phân biệt hoa thường, dấu cách", () => {
    expect(heSoChuyenDoiNghe(cs, "Phường Chiềng An", ["Tổ dân phố 1"]).heSo).toBe("5");
    expect(heSoChuyenDoiNghe(cs, "Phường Chiềng An", ["bản  tông hụm"]).heSo).toBe("4");
    expect(heSoChuyenDoiNghe(cs, "Phường Chiềng An", ["Bản Không Có"]).heSo).toBe("3");
    expect(heSoChuyenDoiNghe(cs, "Xã Mai Sơn", ["Tiểu khu 3 Cò Nòi"]).heSo).toBe("4");
  });
  it("thửa trên nhiều tổ, thôn → mức cao nhất (k4)", () => {
    const r = heSoChuyenDoiNghe(cs, "Phường Chiềng An", ["Bản Tông Hụm", "Bản Cá"]);
    expect(r.heSo).toBe("5");
    expect(r.moTa).toMatch(/cao nhất/);
  });
  it("xã có tổ, thôn trong danh sách mà thửa chưa ghi → Cần xác nhận (tính tạm mức chung)", () => {
    const d = chuyenDoiNghe(cs, { ...p, xa: "Xã Mai Sơn" });
    expect(d.trangThai).toBe("CAN_XAC_NHAN");
    expect(d.canhBao.join(" ")).toMatch(/chọn tổ, thôn, bản/);
  });
  it("xã không có trong Phụ lục → 3 lần, Tạm tính (cả phường không có tổ trong danh sách: mức chung)", () => {
    const d = chuyenDoiNghe(cs, { ...p, xa: "Xã Chiềng Mung" });
    expect(d.trangThai).toBe("TAM_TINH");
    expect(d.thanhTien!.toString()).toBe("162000000");
    expect(thonCoHeSo(cs, "Xã Chiềng Mung")).toEqual([]);
  });
  it("bộ cũ giữ cách tính theo nhóm xã (phường 5 lần)", () => {
    expect(heSoChuyenDoiNghe(csCu, "Phường Chiềng An").heSo).toBe("5");
    expect(heSoChuyenDoiNghe(csCu, "Xã Mai Sơn").heSo).toBe("4");
  });
  it("Phụ lục: 8 phường mục 1 (68 tổ + toàn bộ Tô Hiệu), 10 xã/phường mục 2 (97 tổ, thôn)", () => {
    const [m5, m4] = cs.chuyenDoiNghe.theoThon!;
    expect(m5!.ds.length).toBe(8);
    expect(m5!.ds.reduce((s, x) => s + x.thon.length, 0)).toBe(68);
    expect(m4!.ds.length).toBe(10);
    expect(m4!.ds.reduce((s, x) => s + x.thon.length, 0)).toBe(97);
  });
});

describe("QĐ 64/2026 — khoản 11 Điều 6 QĐ 14/2026 sửa đổi", () => {
  it("20% tiền SDĐ; giao đất theo k4 Đ111 → không áp dụng (0 đ, ghi căn cứ)", () => {
    expect(hoTroTienSddTdc(cs, { tienSddPhaiNop: "100000000", moTa: "x" }).thanhTien!.toString()).toBe("20000000");
    const d = hoTroTienSddTdc(cs, { tienSddPhaiNop: "100000000", moTa: "x", giaoDatK4D111: true });
    expect(d.thanhTien!.toString()).toBe("0");
    expect(d.canhBao.join(" ")).toMatch(/khoản 4 Điều 111/);
    expect(d.canCu[0]!.viTri).toMatch(/QĐ 64\/2026/);
    // bộ cũ không có ngoại lệ
    expect(hoTroTienSddTdc(csCu, { tienSddPhaiNop: "100000000", moTa: "x", giaoDatK4D111: true }).thanhTien!.toString()).toBe("20000000");
  });
});
