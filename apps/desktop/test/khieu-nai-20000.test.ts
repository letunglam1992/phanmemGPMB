/**
 * 1.1.0 (C2) — Thử dữ liệu lớn: 20.000 hộ (nhân bản từ dữ liệu mẫu ẩn danh), 1/5 số hộ có đơn khiếu nại (một phần tạm đình chỉ,
 * có lịch đối thoại), 1/20 có hồ sơ cưỡng chế. Đo thời gian thống kê, cảnh báo dự án, xuất Excel khiếu nại, tạo mẫu T18/T21/T24
 * cho nhiều hộ; giới hạn đặt rộng để chạy được trên máy CI (máy Windows thật cần đo lại — docs/22).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { Ho } from "../src/mo-hinh";
import { thongKeDon } from "../src/khieu-nai";
import { canhBaoDuAn } from "../src/trang-thai";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { taoWorkbookKhieuNai } from "../src/xuat-excel";
import { DANH_MUC_MAU, tepMau } from "../src/van-ban/danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { dienMau } from "../src/van-ban/dien-mau";

const cs = cs0 as unknown as BoChinhSach;
const SO_HO = 20_000;
const HOM_NAY = "2026-10-30";
const { duAn, ho } = taoDuAnMau();
const kMau = ho.map((h) => tinhHo(cs, duAn, h));
const hos: Ho[] = Array.from({ length: SO_HO }, (_, i) => {
  const g = ho[i % ho.length]!;
  return {
    ...g,
    id: `h${i}`,
    ma: `H${String(i + 1).padStart(5, "0")}`,
    ten: `Hộ mẫu ${i + 1}`,
    khieuNai: i % 5
      ? []
      : [
          { id: `k${i}`, loai: "KHIEU_NAI", lan: 1, ngayNhan: "2026-09-01", ngayThuLy: "2026-09-08", noiDung: "Không đồng ý đơn giá", doiThoai: { ngay: "2026-10-20", ngayTb: i % 10 ? "2026-10-14" : undefined } },
          ...(i % 15 ? [] : [{ id: `k${i}b`, loai: "KHIEU_NAI" as const, lan: 1 as const, ngayNhan: "2026-09-10", ngayThuLy: "2026-09-15", noiDung: "Không đồng ý diện tích", tamDinhChi: [{ id: "t", tu: "2026-10-01", truongHop: "b" as const, lyDo: "Chờ đo đạc lại" }] }]),
        ],
    cuongChe: i % 20 ? [] : [{ id: `c${i}`, loai: "THU_HOI", vanDongTu: "2026-10-01", vanDongDen: "2026-10-10", soQd: `${i}/QĐ-UBND`, ngayQd: "2026-10-21" }],
  };
});
const ds = hos.map((h, i) => ({ h, k: kMau[i % kMau.length]! }));
const thoiGian: Record<string, number> = {};
const do_ = <T>(ten: string, f: () => T): T => {
  const t0 = performance.now();
  const r = f();
  thoiGian[ten] = Math.round(performance.now() - t0);
  return r;
};

describe(`1.1.0 (C2) — ${SO_HO.toLocaleString("vi-VN")} hộ có khiếu nại, cưỡng chế`, () => {
  it("thống kê đơn, cảnh báo dự án trong giới hạn", () => {
    const tk = do_("thongKeDon", () => thongKeDon(hos, HOM_NAY, LICH_TRONG));
    expect(tk.soHo).toBe(SO_HO / 5);
    expect(tk.tamDinhChi).toBe(Math.ceil(SO_HO / 15));
    expect(tk.thuTucCham).toBeGreaterThan(0);
    const cb = do_("canhBaoDuAn", () => canhBaoDuAn(duAn, ds, HOM_NAY, LICH_TRONG));
    expect(cb.length).toBeGreaterThan(0);
    expect(thoiGian.thongKeDon!).toBeLessThan(3000);
    expect(thoiGian.canhBaoDuAn!).toBeLessThan(15000);
  });

  it("Excel khiếu nại, cưỡng chế của dự án", async () => {
    const t0 = performance.now();
    const wb = await taoWorkbookKhieuNai(duAn, hos, HOM_NAY, LICH_TRONG);
    const buf = await wb.xlsx.writeBuffer();
    thoiGian.excelKhieuNai = Math.round(performance.now() - t0);
    expect(wb.getWorksheet("Đơn")!.rowCount).toBe(3 + hos.reduce((s, h) => s + (h.khieuNai?.length ?? 0), 0));
    expect(wb.getWorksheet("Cưỡng chế")!.rowCount).toBe(3 + SO_HO / 20);
    expect(buf.byteLength).toBeGreaterThan(0);
    expect(thoiGian.excelKhieuNai).toBeLessThan(60000);
  }, 120_000);

  it("tạo T18, T21, T24 cho 200 hộ liên tiếp (như tạo nhiều văn bản một lần)", () => {
    for (const ma of ["T18", "T21", "T24"]) {
      const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
      const tep = readFileSync(new URL(`../public/mau-van-ban/${tepMau(m)}`, import.meta.url));
      const chon = ds.filter((x) => x.h.khieuNai?.length).slice(0, 200);
      do_(`200 × ${ma}`, () => {
        for (const [i, x] of chon.entries()) {
          const du = ghepDuLieu({ mau: m, duAn, ds: [x], ho: x, chung: thongTinChungMacDinh(duAn), rieng: {}, so: String(10 + i), ngayKy: HOM_NAY });
          expect(dienMau(tep, du).byteLength).toBeGreaterThan(1000);
        }
      });
      expect(thoiGian[`200 × ${ma}`]!).toBeLessThan(60000);
    }
    console.log("Thời gian (ms):", JSON.stringify(thoiGian));
  }, 180_000);
});
