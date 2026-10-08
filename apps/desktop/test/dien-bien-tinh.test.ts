import { describe, expect, it } from "vitest";
import { dienBienTinh, type BanGui } from "../src/tong-hop-tinh/dien-bien";

const tt = (o: Partial<{ xa: string; soHo: number; ht: number; duyet: number; tien: string; ma: string }>) => ({
  id: "d", ten: "x", xa: o.xa ?? "Xã A", chuDauTu: "", soHo: o.soHo ?? 10, theoTrangThai: { HOAN_THANH: o.ht ?? 0 }, tongTamTinh: o.tien ?? "1000", dienTichThuHoi: "100",
  soVuongMac: 0, soHoDaChotPA: 0, soHoDaDuyetPA: o.duyet ?? 0, tienDoBinhQuan: 0, soTepDinhKem: 0, ...(o.ma ? { lienXa: { ma: o.ma } } : {}),
});

describe("1.0.5: diễn biến toàn tỉnh theo tháng", () => {
  const ban: BanGui[] = [
    { maGui: "a", luc: "2026-07-10T00:00:00Z", tomTat: [tt({ ht: 2 })] },
    { maGui: "a", luc: "2026-09-05T00:00:00Z", tomTat: [tt({ ht: 6, duyet: 8 })] },
    { maGui: "b", luc: "2026-08-20T00:00:00Z", tomTat: [tt({ xa: "Xã B", soHo: 5, ht: 1, ma: "LX-1" })] },
  ];
  it("mỗi kỳ lấy bản gần nhất trước cuối tháng; đơn vị chưa gửi không tính", () => {
    const k = dienBienTinh(ban, { loai: "TINH" }, "2026-10-08T00:00:00Z");
    expect(k.map((x) => x.ky)).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(k.map((x) => x.banGiao)).toEqual([2, 3, 7, 7]);
    expect(k.map((x) => x.soDonVi)).toEqual([1, 2, 2, 2]);
    expect(k[2]!.duyetPA).toBe(8);
    expect(k[3]!.tamTinh).toBe(2000);
  });
  it("lọc theo xã, theo dự án liên xã", () => {
    expect(dienBienTinh(ban, { loai: "XA", xa: "xã b" }, "2026-10-08T00:00:00Z").map((x) => x.soHo)).toEqual([0, 5, 5, 5]);
    expect(dienBienTinh(ban, { loai: "LIEN_XA", ma: "lx-1" }, "2026-10-08T00:00:00Z").map((x) => x.banGiao)).toEqual([0, 1, 1, 1]);
    expect(dienBienTinh([], { loai: "TINH" })).toEqual([]);
  });
});
