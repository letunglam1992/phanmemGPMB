import { describe, expect, it } from "vitest";
import { ghiVaoSo, kyHieuMau, soThuTu, soTiepTheo, timTrung, type VanBanDi } from "../src/so-van-ban";
import { DANH_MUC_MAU } from "../src/van-ban/danh-muc";
import { taoKhoBoNho } from "../src/kho";

const vb = (so: number, kyHieu = "TB-UBND", ngay = "2026-10-20"): VanBanDi => ({ so, kyHieu, soDayDu: `${so}/${kyHieu}`, ngay, ma: "T18", tenMau: "Thông báo thụ lý", duAnId: "d1", duAnTen: "Dự án 1" });

describe("1.2.0 (C1) — sổ văn bản đi của đơn vị", () => {
  it("ký hiệu theo mẫu; biên bản không có số", () => {
    const m = (ma: string) => DANH_MUC_MAU.find((x) => x.ma === ma)!;
    expect(kyHieuMau(m("T18"))).toBe("TB-UBND");
    expect(kyHieuMau(m("T26"))).toBe("QĐ-UBND");
    expect(kyHieuMau(m("13"), "KT")).toBe("TTr-KT");
    expect(kyHieuMau(m("T27"))).toBe("");
    expect(soThuTu("15")).toBe(15);
    expect(soThuTu("15/TB-UBND")).toBe(15);
    expect(soThuTu("a15")).toBeNull();
  });
  it("số tiếp theo theo ký hiệu, năm; phát hiện trùng; ghi sổ báo trùng nhưng vẫn ghi", () => {
    let so = ghiVaoSo(null, [vb(15), vb(16), vb(3, "QĐ-UBND"), vb(40, "TB-UBND", "2025-12-30")], "canbo1", "t").so;
    expect(soTiepTheo(so, "TB-UBND", "2026-11-01")).toBe(17);
    expect(soTiepTheo(so, "QĐ-UBND", "2026-11-01")).toBe(4);
    expect(soTiepTheo(so, "TB-UBND", "2025-11-01")).toBe(41);
    expect(timTrung(so, { so: 16, kyHieu: "TB-UBND", ngay: "2026-12-01" })!.nguoi).toBe("canbo1");
    expect(timTrung(so, { so: 16, kyHieu: "TB-UBND", ngay: "2027-01-02" })).toBeUndefined();
    const r = ghiVaoSo(so, [vb(16), vb(17)], "canbo2");
    so = r.so;
    expect(r.kq.trung.map((t) => t.soDayDu)).toEqual(["16/TB-UBND"]);
    expect(so.ds).toHaveLength(6);
  });
  it("kho bộ nhớ: capSo ghi vào cài đặt soVanBanDi", async () => {
    const kho = taoKhoBoNho();
    expect((await kho.capSo([vb(1)])).trung).toEqual([]);
    expect((await kho.capSo([vb(1)])).trung).toHaveLength(1);
    expect((await kho.docCaiDat<{ ds: VanBanDi[] }>("soVanBanDi"))!.ds).toHaveLength(2);
  });
});
