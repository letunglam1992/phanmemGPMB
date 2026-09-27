import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { canhBaoChung, canhBaoDuAn, mocTienDo, thongKe, trangThaiHo } from "../src/trang-thai";
import type { Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const k = (h: Ho) => tinhHo(cs, duAn, h);
const voiBuoc = (h: Ho, buoc: Record<string, { trangThai: "XONG" | "DANG" | "CHO_DUYET" | "CHUA"; ngay?: string }>): Ho => ({ ...h, tienDo: { ...h.tienDo, ...buoc } });

describe("Hiện trạng GPMB của hồ sơ", () => {
  it("hộ mẫu 01 (đang lập phương án) = Đang xử lý; hộ mẫu 02 (đang kiểm đếm, thiếu căn cứ) chưa phải vướng mắc", () => {
    expect(trangThaiHo(duAn, ho[0]!, k(ho[0]!), "2026-09-27")).toBe("DANG_XU_LY");
    expect(trangThaiHo(duAn, ho[1]!, k(ho[1]!), "2026-09-27")).toBe("CHUA_KIEM_DEM");
  });
  it("phương án đã niêm yết mà còn thiếu căn cứ = Vướng mắc", () => {
    const h = voiBuoc(ho[1]!, { "6": { trangThai: "DANG" } });
    expect(trangThaiHo(duAn, h, k(h), "2026-09-27")).toBe("VUONG_MAC");
    expect(canhBaoDuAn(duAn, [{ h, k: k(h) }], "2026-09-27").some((c) => c.muc === "CAO" && c.noiDung.includes("niêm yết"))).toBe(true);
  });
  it("chi trả xong = Hoàn thành (ưu tiên cao nhất); ghi vướng mắc = Vướng mắc", () => {
    const h = voiBuoc(ho[1]!, { "12": { trangThai: "XONG" } });
    expect(trangThaiHo(duAn, h, k(h), "2026-09-27")).toBe("HOAN_THANH");
    const v = { ...ho[0]!, vuongMac: { noiDung: "Chưa nhận tiền", ngay: "2026-09-01" } };
    expect(trangThaiHo(duAn, v, k(v), "2026-09-27")).toBe("VUONG_MAC");
  });
  it("chỉ xong kiểm đếm = Đã kiểm đếm; quá hạn kế hoạch = Vướng mắc", () => {
    const h = { ...ho[0]!, tienDo: { "1": { trangThai: "XONG" as const }, "2": { trangThai: "XONG" as const }, "3": { trangThai: "XONG" as const }, "4": { trangThai: "XONG" as const } } };
    expect(trangThaiHo(duAn, h, k(h), "2026-09-27")).toBe("DA_KIEM_DEM");
    const da2 = { ...duAn, keHoach: { "5": "2026-09-01" } };
    expect(trangThaiHo(da2, h, k(h), "2026-09-27")).toBe("VUONG_MAC");
  });
});

describe("Thống kê, mốc tiến độ, cảnh báo", () => {
  it("thống kê dự án mẫu", () => {
    const tk = thongKe(duAn, ho.map((h) => ({ h, k: k(h) })), "2026-09-27");
    expect(tk.soHo).toBe(2);
    expect(tk.theoTrangThai.DANG_XU_LY).toBe(1);
    expect(tk.theoTrangThai.CHUA_KIEM_DEM).toBe(1);
    expect(tk.soThua).toBe(4);
    // H01: 4 bước xong; H02: 3 bước xong → 7 / 32
    expect(tk.tienDoChung).toBeCloseTo(7 / 32, 9);
    expect(tk.chang.find((c) => c.ten === "Kiểm đếm")!.soHo).toBe(1);
  });
  it("mốc: đủ hộ xong = Hoàn thành; kế hoạch đã qua = Quá hạn", () => {
    const m = mocTienDo({ ...duAn, keHoach: { "6": "2026-09-01", "9": "2026-12-01" } }, ho, "2026-09-27");
    expect(m[0]!.trangThai).toBe("HOAN_THANH");
    expect(m.find((x) => x.ma === "6")!.trangThai).toBe("QUA_HAN");
    expect(m.find((x) => x.ma === "9")!.trangThai).toBe("CHUA_DEN_HAN");
  });
  it("cảnh báo 30 ngày chi trả (k3 Đ94) và 90/180 ngày thông báo (k2 Đ85)", () => {
    const h = voiBuoc(ho[0]!, { "9": { trangThai: "XONG", ngay: "2026-08-01" }, "13": { trangThai: "XONG", ngay: "2026-06-01" } });
    const cb = canhBaoDuAn(duAn, [{ h, k: k(h) }], "2026-09-27");
    expect(cb.some((c) => c.canCu?.includes("Điều 94"))).toBe(true);
    // TB 15/4/2026 → QĐ 01/6/2026 = 47 ngày < 90 (đất NN)
    expect(cb.some((c) => c.canCu?.includes("Điều 85") && c.noiDung.includes("< 90"))).toBe(true);
  });
  it("QĐ 27/2026 hết hiệu lực: báo trước 60 ngày", () => {
    expect(canhBaoChung("2026-09-27")).toHaveLength(0);
    expect(canhBaoChung("2027-01-15")[0]!.noiDung).toContain("45 ngày");
  });
});
