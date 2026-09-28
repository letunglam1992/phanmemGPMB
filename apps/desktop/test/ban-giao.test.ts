/** P1-4: diện tích đã bàn giao; thưởng bàn giao trước hạn theo mốc cán bộ khai báo (không tự đặt mức). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { dtDaBanGiao, dtThuHoiHo, loiCauHinhThuong, tinhThuong, type CauHinhThuong } from "../src/ban-giao";
import { thongKe } from "../src/trang-thai";

const cs = cs0 as unknown as BoChinhSach;
const cauHinh: CauHinhThuong = {
  moc: [
    { ten: "Mốc 2", denNgay: "2026-11-30", tyLe: "10", toiDa: "15000000" },
    { ten: "Mốc 1", denNgay: "2026-10-31", tyLe: "10", toiDa: "20000000" },
  ],
  coSo: ["BT_DAT", "BT_TAI_SAN"],
  canCu: "Điều 15 Phụ lục II QĐ 106/2025/QĐ-UBND (khai báo thử)",
};

describe("Bàn giao mặt bằng", () => {
  const { duAn, ho } = taoDuAnMau();
  const h = ho[0]!;
  const kq = tinhHo(cs, duAn, h);
  it("DT đã bàn giao: theo biên bản, trống = toàn bộ DT thu hồi; chưa bàn giao = 0", () => {
    expect(dtDaBanGiao(h).toString()).toBe("0");
    const bg = { ...h, banGiao: { ngay: "2026-10-01", bienBan: "01/BB", nguoiGhi: "a" } };
    expect(dtDaBanGiao(bg).eq(dtThuHoiHo(h))).toBe(true);
    expect(dtDaBanGiao({ ...bg, banGiao: { ...bg.banGiao, dienTich: "500" } }).toString()).toBe("500");
  });
  it("thưởng: chưa khai báo → Thiếu căn cứ; theo mốc chứa ngày bàn giao; không quá mức tối đa; sau mọi mốc → không thưởng", () => {
    const bg = (ngay: string) => ({ banGiao: { ngay, bienBan: "01", nguoiGhi: "a" } });
    expect(tinhThuong(duAn, bg("2026-10-01"), kq).loai).toBe("THIEU_CAN_CU");
    const da = { ...duAn, thuongBanGiao: cauHinh };
    const t1 = tinhThuong(da, bg("2026-10-15"), kq);
    expect(t1.loai).toBe("CO");
    if (t1.loai === "CO") {
      expect(t1.moc.ten).toBe("Mốc 1");
      const coSo = kq.theoCot.BT_DAT.plus(kq.theoCot.BT_TAI_SAN);
      expect(t1.coSo.eq(coSo)).toBe(true);
      expect(t1.soTien.toString()).toBe(coSo.mul(0.1).gt(20000000) ? "20000000" : coSo.mul(0.1).toFixed(0));
    }
    const t2 = tinhThuong(da, bg("2026-11-10"), kq);
    expect(t2.loai === "CO" && t2.moc.ten).toBe("Mốc 2");
    expect(tinhThuong(da, bg("2026-12-01"), kq).loai).toBe("KHONG");
  });
  it("kiểm tra khai báo", () => {
    expect(loiCauHinhThuong({ ...cauHinh, canCu: " " })).toMatch(/căn cứ/);
    expect(loiCauHinhThuong({ ...cauHinh, moc: [{ ten: "M", denNgay: "", tyLe: "10", toiDa: "" }] })).toMatch(/hạn/);
    expect(loiCauHinhThuong(cauHinh)).toBeNull();
  });
  it("thống kê: % mặt bằng đã bàn giao", () => {
    const ds = ho.map((x, i) => ({ h: i === 0 ? { ...x, banGiao: { ngay: "2026-10-01", bienBan: "01", nguoiGhi: "a" } } : x, k: tinhHo(cs, duAn, x) }));
    const tk = thongKe(duAn, ds, "2026-10-05");
    expect(tk.dtDaBanGiao).toBeCloseTo(dtThuHoiHo(ho[0]!).toNumber());
    expect(tk.dtThuHoi).toBeCloseTo(ho.reduce((s, x) => s + dtThuHoiHo(x).toNumber(), 0));
    expect(tk.theoTrangThai.HOAN_THANH).toBe(1);
  });
});
