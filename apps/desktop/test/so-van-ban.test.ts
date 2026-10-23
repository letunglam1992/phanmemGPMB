import { describe, expect, it } from "vitest";
import { ghiVaoSo, vanBanGhiTay, MA_NGOAI, kyHieuMau, soThuTu, soTiepTheo, timTrung, type VanBanDi } from "../src/so-van-ban";
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

describe("1.2.0 (C1) — ghi tay văn bản soạn ngoài phần mềm", () => {
  const duAn = { id: "d1", ten: "Dự án A" };
  it("số kèm ký hiệu được ưu tiên; kiểm tra số, ngày, trích yếu", () => {
    expect(vanBanGhiTay({ so: "15/TB-UBND", kyHieu: "QĐ-UBND", ngay: "2026-10-20", trichYeu: "Thông báo họp", duAn })).toMatchObject({ so: 15, kyHieu: "TB-UBND", soDayDu: "15/TB-UBND", ma: MA_NGOAI, tenMau: "Thông báo họp" });
    expect(vanBanGhiTay({ so: "7", kyHieu: "QĐ-UBND", ngay: "2026-10-20", trichYeu: "QĐ thành lập tổ công tác", duAn })).toMatchObject({ soDayDu: "7/QĐ-UBND" });
    expect(vanBanGhiTay({ so: "abc", kyHieu: "QĐ-UBND", ngay: "2026-10-20", trichYeu: "x", duAn })).toContain("số thứ tự");
    expect(vanBanGhiTay({ so: "7", kyHieu: "QĐ-UBND", ngay: "", trichYeu: "x", duAn })).toContain("ngày ký");
    expect(vanBanGhiTay({ so: "7", kyHieu: "QĐ-UBND", ngay: "2026-10-20", trichYeu: " ", duAn })).toContain("trích yếu");
  });
  it("ghi tay vào sổ chung, báo trùng với văn bản phần mềm đã cấp", async () => {
    const kho = taoKhoBoNho();
    const a = vanBanGhiTay({ so: "3", kyHieu: "QĐ-UBND", ngay: "2026-10-20", trichYeu: "a", duAn }) as VanBanDi;
    expect((await kho.capSo([a])).trung).toEqual([]);
    expect((await kho.capSo([{ ...a, ma: "15" }])).trung[0]!.daCap.ma).toBe(MA_NGOAI);
    expect(soTiepTheo(await kho.docCaiDat("soVanBanDi"), "QĐ-UBND", "2026-11-01")).toBe(4);
  });
});
