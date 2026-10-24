/**
 * 1.3.0 (E2) — Thử dữ liệu lớn cho phần mới 1.2.0–1.3.0: sổ văn bản đi 5.000 dòng (gợi ý số, tìm trùng, ghi sổ, thống kê phân
 * cấp), diễn biến tháng dự án 20.000 hộ, phần bổ sung báo cáo Word cấp xã cho 20 dự án × 1.000 hộ, gói tỉnh có phân cấp, lịch
 * cưỡng chế. Giới hạn đặt rộng để chạy trên máy CI; số đo in ra để so với máy Windows thật (docs/22 mục A10).
 */
import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho } from "../src/mo-hinh";
import { ghiVaoSo, soTiepTheo, timTrung, type VanBanDi } from "../src/so-van-ban";
import { thongKePhanCap } from "../src/bao-cao-phan-cap";
import { dienBienDuAn } from "../src/dien-bien-du-an";
import { duLieuBoSungBaoCaoXa } from "../src/bao-cao-bo-sung";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { tinhTruocTheoLat, tomTatDuAn } from "../src/tong-hop-tinh/goi-tinh";
import { lichCuongCheTinh, phanCapTheoXa } from "../src/tong-hop-tinh/dien-bien";

const HOM_NAY = "2026-10-30";
const MAU = ["15", "14", "T3", "T18", "T26", "T29", "06"];
const so5000: VanBanDi[] = Array.from({ length: 5000 }, (_, i) => ({
  so: (i % 900) + 1, kyHieu: i % 3 ? "QĐ-UBND" : "TB-UBND", soDayDu: `${(i % 900) + 1}/${i % 3 ? "QĐ-UBND" : "TB-UBND"}`,
  ngay: `202${5 + (i % 2)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
  ma: MAU[i % MAU.length]!, tenMau: "Văn bản", duAnId: `d${i % 20}`, duAnTen: `Dự án ${i % 20}`,
}));
const { duAn, ho } = taoDuAnMau();
const xong = (ngay: string) => ({ trangThai: "XONG" as const, ngay });
const nhieuHo = (n: number, duAnId = duAn.id): Ho[] =>
  Array.from({ length: n }, (_, i) => {
    const g = ho[i % ho.length]!;
    const thang = String((i % 10) + 1).padStart(2, "0");
    return {
      ...g, id: `${duAnId}-h${i}`, duAnId, ma: `H${i}`, ten: `Hộ mẫu ${i}`,
      tienDo: { ...g.tienDo, "9": xong(`2026-${thang}-10`), ...(i % 2 ? { "12": xong(`2026-${thang}-20`) } : {}), ...(i % 3 ? {} : { "13": xong(`2026-${thang}-25`) }) },
      khieuNai: i % 25 ? [] : [{ id: `k${i}`, loai: "KHIEU_NAI", lan: 1, ngayNhan: "2026-06-01", ngayThuLy: "2026-06-05", noiDung: "x" }],
      cuongChe: i % 40 ? [] : [{ id: `c${i}`, loai: "THU_HOI", ngayDuKien: "2026-11-20" }],
    };
  });
const do_ = (f: () => unknown) => { const t = performance.now(); f(); return Math.round(performance.now() - t); };
const ketQua: Record<string, number> = {};

describe("1.3.0 (E2) — dữ liệu lớn", () => {
  it("sổ văn bản đi 5.000 dòng: gợi ý số, tìm trùng, ghi thêm 200, thống kê phân cấp", () => {
    ketQua["soTiepTheo×100"] = do_(() => { for (let i = 0; i < 100; i++) soTiepTheo({ ds: so5000 }, "QĐ-UBND", "2026-10-30"); });
    ketQua["timTrung×100"] = do_(() => { for (let i = 0; i < 100; i++) timTrung({ ds: so5000 }, { so: i + 1, kyHieu: "QĐ-UBND", ngay: "2026-10-30" }); });
    let n = 0;
    ketQua["ghiVaoSo 200"] = do_(() => { n = ghiVaoSo({ ds: so5000 }, so5000.slice(0, 200), "x").kq.trung.length; });
    expect(n).toBe(200);
    let tk: ReturnType<typeof thongKePhanCap> = [];
    ketQua["thongKePhanCap"] = do_(() => { tk = thongKePhanCap(so5000, "2026-01-01", "2026-12-31"); });
    expect(tk.reduce((s, x) => s + x.ds.length, 0)).toBeGreaterThan(0);
    expect(ketQua["soTiepTheo×100"]! + ketQua["timTrung×100"]! + ketQua["ghiVaoSo 200"]! + ketQua.thongKePhanCap!).toBeLessThan(8000);
  });
  it("diễn biến tháng 20.000 hộ; bổ sung báo cáo xã 20 dự án × 1.000 hộ", () => {
    const hos = nhieuHo(20_000);
    let ky: ReturnType<typeof dienBienDuAn> = [];
    ketQua["dienBienDuAn 20000"] = do_(() => { ky = dienBienDuAn(duAn, hos, HOM_NAY); });
    expect(ky.at(-1)!.duyetPA).toBe(20_000);
    const ds = Array.from({ length: 20 }, (_, i) => ({ duAn: { ...duAn, id: `d${i}`, ten: `Dự án ${i}` } as DuAn, hos: nhieuHo(1000, `d${i}`) }));
    let bs: ReturnType<typeof duLieuBoSungBaoCaoXa> | null = null;
    ketQua["boSungBaoCaoXa 20×1000"] = do_(() => { bs = duLieuBoSungBaoCaoXa(ds, HOM_NAY, LICH_TRONG); });
    expect(bs!.so_don_qua_han).toBe(20 * 40);
    expect((bs!.lich_cc as unknown[]).length).toBe(20 * 25);
    expect(ketQua["dienBienDuAn 20000"]! + ketQua["boSungBaoCaoXa 20×1000"]!).toBeLessThan(20000);
  });
  it("gói tỉnh: tóm tắt 20 dự án × 1.000 hộ kèm sổ 5.000 dòng; tỉnh gom phân cấp, lịch cưỡng chế", () => {
    const das = Array.from({ length: 20 }, (_, i) => ({ ...duAn, id: `d${i}`, ten: `Dự án ${i}`, xa: `Xã ${i % 5}` }) as DuAn);
    const hos = das.flatMap((d) => nhieuHo(1000, d.id));
    let tt: ReturnType<typeof tomTatDuAn> = [];
    ketQua["tomTatDuAn 20×1000 (không sổ)"] = do_(() => { tomTatDuAn(das, hos, () => 0, HOM_NAY, LICH_TRONG); });
    ketQua["tomTatDuAn 20×1000 + sổ"] = do_(() => { tt = tomTatDuAn(das, hos, () => 0, HOM_NAY, LICH_TRONG, so5000); });
    expect(tt.every((d) => d.phanCap?.every((x) => !("tenMau" in x)))).toBe(true);
    let pc: ReturnType<typeof phanCapTheoXa> = [];
    ketQua["phanCapTheoXa + lich"] = do_(() => { pc = phanCapTheoXa(tt, "2026-01-01", "2026-12-31"); lichCuongCheTinh(tt); });
    expect(pc).toHaveLength(5);
    console.log("Thời gian 1.3.0 (ms):", JSON.stringify(ketQua));
    expect(ketQua["tomTatDuAn 20×1000 + sổ"]).toBeLessThan(60000);
  }, 240_000);
});

describe("1.3.0 (D1, D2) — gói tỉnh có phân cấp (không tên, nội dung), lịch cưỡng chế", () => {
  it("phanCap chỉ có mã nhiệm vụ, ngày, số hiệu; tỉnh đếm theo xã trong kỳ; lịch theo ngày", () => {
    const d = { ...duAn, id: "dx", xa: "Xã A" } as DuAn;
    const so: VanBanDi[] = [
      { so: 1, kyHieu: "QĐ-UBND", soDayDu: "1/QĐ-UBND", ngay: "2026-08-01", ma: "15", tenMau: "QĐ thu hồi đất", duAnId: "dx", duAnTen: "x", hoMa: "H01" },
      { so: 1, kyHieu: "QĐ-UBND", soDayDu: "1/QĐ-UBND", ngay: "2026-08-01", ma: "15", tenMau: "QĐ thu hồi đất", duAnId: "dx", duAnTen: "x", hoMa: "H01" },
      { so: 2, kyHieu: "QĐ-UBND", soDayDu: "2/QĐ-UBND", ngay: "2026-09-01", ma: "T29", tenMau: "Hội đồng", duAnId: "dx", duAnTen: "x" },
      { so: 3, kyHieu: "TB-UBND", soDayDu: "3/TB-UBND", ngay: "2026-09-01", ma: "T18", tenMau: "TB thụ lý", duAnId: "dx", duAnTen: "x" },
    ];
    const [t] = tomTatDuAn([d], nhieuHo(40, "dx"), () => 0, HOM_NAY, LICH_TRONG, so);
    expect(t!.phanCap).toEqual([{ nv: "THU_HOI", ngay: "2026-08-01", so: "1/QĐ-UBND" }, { nv: "HOI_DONG", ngay: "2026-09-01", so: "2/QĐ-UBND" }]);
    expect(JSON.stringify(t!.phanCap)).not.toContain("H01");
    expect(phanCapTheoXa([t!, { xa: "Xã B", phanCap: [{ nv: "THU_HOI", ngay: "2025-01-01", so: "9" }] }], "2026-06-30", "2026-12-14")).toEqual([
      { xa: "Xã A", theoNv: { THU_HOI: 1, HOI_DONG: 1 }, tong: 2 },
      { xa: "Xã B", theoNv: {}, tong: 0 },
    ]);
    expect(lichCuongCheTinh([t!], HOM_NAY)[0]).toEqual({ ngay: "2026-11-20", xa: "Xã A", duAn: d.ten, loai: "THU_HOI" });
  });
});

describe("1.3.0 (D) — tóm tắt gói tỉnh tính theo lát", () => {
  it("nhường luồng giữa các lát, báo tiến độ; kết quả trùng tính một lần", async () => {
    const das = Array.from({ length: 3 }, (_, i) => ({ ...duAn, id: `L${i}`, ten: `Dự án L${i}`, xa: "Xã L" }) as DuAn);
    const hos = das.flatMap((d) => nhieuHo(400, d.id));
    const motLan = tomTatDuAn(das.map((d) => ({ ...d })), hos.map((h) => ({ ...h })), () => 0, HOM_NAY, LICH_TRONG);
    let nhuong = 0, lanLatDaiNhat = 0, t0 = performance.now();
    const td: [number, number][] = [];
    await tinhTruocTheoLat(das, hos, {
      lat: 5,
      tienDo: (x, t) => td.push([x, t]),
      nhuong: async () => { nhuong++; lanLatDaiNhat = Math.max(lanLatDaiNhat, performance.now() - t0); await Promise.resolve(); t0 = performance.now(); },
    });
    expect(nhuong).toBeGreaterThan(0);
    expect(td.at(-1)).toEqual([1200, 1200]);
    // mỗi lát ≤ lat + một hộ (máy CI chậm: nới rộng)
    expect(lanLatDaiNhat).toBeLessThan(500);
    // lần gọi sau dùng bộ nhớ đệm — không còn việc
    let lan2 = 0;
    await tinhTruocTheoLat(das, hos, { nhuong: async () => void lan2++ });
    expect(lan2).toBe(0);
    expect(JSON.stringify(tomTatDuAn(das, hos, () => 0, HOM_NAY, LICH_TRONG))).toBe(JSON.stringify(motLan));
  });
});
