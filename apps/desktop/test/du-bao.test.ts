import { describe, expect, it } from "vitest";
import { duBaoDuAn, duBaoHo, thoiGianBuoc } from "../src/du-bao";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { LICH_TRONG } from "../src/lich-lam-viec";
import type { Ho } from "../src/mo-hinh";

const { duAn, ho } = taoDuAnMau();
const xong = (ma: string[], ngay: string) => Object.fromEntries(ma.map((m) => [m, { trangThai: "XONG" as const, ngay }]));

describe("Dự báo tiến độ (§11.2)", () => {
  it("bước không có thời hạn luật định và đơn vị chưa nhập → không dự báo, nêu bước thiếu (không tự đặt thời gian)", () => {
    const h: Ho = { ...ho[0]!, tienDo: xong(["1", "2", "3", "4"], "2026-09-01") };
    const r = duBaoHo(duAn, h, "2026-09-28", LICH_TRONG);
    expect(r.ngay).toBeNull();
    expect(r.thieu).toEqual({ buoc: "5", ten: "Lập phương án" });
    expect(thoiGianBuoc(duAn, "8")).toMatchObject({ soNgay: 30, loai: "NLV", nguon: "LUAT" });
    expect(thoiGianBuoc(duAn, "7")).toBeNull();
  });
  it("cộng lần lượt thời hạn luật định + dự kiến đơn vị từ ngày xong gần nhất; hộ chậm nhất là ngày dự án; kéo lùi so với kế hoạch", () => {
    const da = { ...duAn, keHoach: { "12": "2026-12-01" }, duKienBuoc: { "5": { soNgay: 10, loai: "NLV" as const }, "7": { soNgay: 15, loai: "N" as const }, "10": { soNgay: 5, loai: "N" as const } } };
    // H1: xong đến bước 9 ngày 2026-11-20 → còn 10 (5 N) → 11 (3 NLV) → 12 (30 N)
    const h1: Ho = { ...ho[0]!, tienDo: xong(["1", "2", "3", "4", "5", "6", "7", "8", "9"], "2026-11-20") };
    const r1 = duBaoHo(da, h1, "2026-11-20", LICH_TRONG);
    // 20/11 + 5 N = 25/11 (thứ Tư); + 3 NLV = 30/11 (thứ Hai); + 30 N = 30/12 (thứ Tư)
    expect(r1.ngay).toBe("2026-12-30");
    expect(r1.treSoVoiKeHoach).toBe(29);
    // H2: đã chi trả xong → không tính
    const h2: Ho = { ...ho[1]!, tienDo: xong(["12"], "2026-10-01") };
    const r = duBaoDuAn(da, [h1, h2], "2026-11-20", LICH_TRONG);
    expect(r.ngayDuAn).toBe("2026-12-30");
    expect(r.keoLui.map((x) => x.ma)).toEqual([h1.ma]);
    expect(r.ds.find((x) => x.hoId === h2.id)!.daXong).toBe(true);
  });
  it("bước đã quá thời hạn mà chưa xong: dự kiến sớm nhất là hôm nay; bước 'Không áp dụng', bước tùy chọn bỏ qua", () => {
    const da = { ...duAn, duKienBuoc: { "10": { soNgay: 5, loai: "N" as const } } };
    const h: Ho = { ...ho[0]!, tienDo: { ...xong(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"], "2026-01-05") } };
    // xong bước 11 ngày 5/1 → hạn chi trả 30 N đã qua từ lâu: dự kiến sớm nhất hôm nay, đánh dấu quá hạn
    expect(duBaoHo(da, h, "2026-09-28", LICH_TRONG)).toMatchObject({ ngay: "2026-09-28", quaHan: true });
    const h2: Ho = { ...ho[0]!, tienDo: { ...xong(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"], "2026-09-20") } };
    expect(duBaoHo(da, h2, "2026-09-28", LICH_TRONG)).toMatchObject({ ngay: "2026-10-20", quaHan: false }); // 20/9 + 30 N
  });
});
