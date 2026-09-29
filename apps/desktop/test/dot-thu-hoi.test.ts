import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, kiemTraToanVen, moTaBan, pheDuyet } from "../src/phuong-an";
import { hoHieuLuc, type DotThuHoi, type DuAn, type Ho } from "../src/mo-hinh";
import { CHUA_XEP_DOT, chungTheoDot, duAnCuaHo, khopDot, loiChotTheoDot, loiDot, lyDoKhongDoiDot, lyDoKhongXoaDot, tongHopTheoDot } from "../src/dot-thu-hoi";
import { canhBaoDuAn } from "../src/trang-thai";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA đợt 1", lyDo: "", nguoi: "A", luc: "2026-09-27T08:00:00.000Z" };

function mau() {
  const { duAn, ho } = taoDuAnMau();
  const d1: DotThuHoi = { id: "d1", so: 1, ten: "Đợt 1", ngayThongBao: "2026-01-10", canCuThuHoi: "TB 01/TB-UBND", phamVi: "Km0 – Km2", vanBan: { tb_thu_hoi_so: "01/TB-UBND" } };
  const d2: DotThuHoi = { id: "d2", so: 2, ten: "Đợt 2", tienDoChung: { "3": { trangThai: "DANG" } } };
  const da: DuAn = { ...duAn, dotThuHoi: [d2, d1], tienDoChung: { "3": { trangThai: "XONG", ngay: "2026-01-10" }, "4": { trangThai: "XONG" } } };
  const [a, b] = ho as [Ho, Ho];
  return { da, a: { ...a, dotId: "d1" }, b: { ...b, dotId: "d2" } };
}

describe("Đợt thu hồi (P3-1)", () => {
  it("kiểm tra nhập đợt: tên, số thứ tự không trùng", () => {
    const { da } = mau();
    const ds = da.dotThuHoi!;
    expect(loiDot(ds[0]!, ds)).toBeNull();
    expect(loiDot({ ...ds[0]!, so: 1 }, ds)).toMatch(/Trùng số/);
    expect(loiDot({ ...ds[0]!, ten: " " }, ds)).toMatch(/tên/);
  });

  it("bước chung của đợt ghi đè từng bước lên bước chung dự án", () => {
    const { da, a, b } = mau();
    expect(hoHieuLuc(da, a).tienDo["3"]!.trangThai).toBe("XONG"); // đợt 1 không có bước riêng → theo dự án
    expect(hoHieuLuc(da, b).tienDo["3"]!.trangThai).toBe("DANG"); // đợt 2 ghi đè bước 3
    expect(hoHieuLuc(da, b).tienDo["4"]!.trangThai).toBe("XONG"); // bước 4 vẫn theo dự án
  });

  it("dự án nhìn từ đợt: căn cứ, ngày thông báo, văn bản của đợt; trống thì theo dự án", () => {
    const { da, a, b } = mau();
    const x = duAnCuaHo(da, a);
    expect(x.ngayThongBao).toBe("2026-01-10");
    expect(x.canCuThuHoi).toBe("TB 01/TB-UBND");
    expect(x.vanBan!.tb_thu_hoi_so).toBe("01/TB-UBND");
    expect(x.vanBan!.pham_vi_dot).toBe("Km0 – Km2");
    expect(duAnCuaHo(da, b).ngayThongBao).toBe(da.ngayThongBao);
    expect(duAnCuaHo(da, a)).toBe(x); // ghi nhớ
    const c = chungTheoDot({ can_cu_du_an: "Căn cứ KH SDĐ 2026;", tb_thu_hoi_so: "cũ" }, da.dotThuHoi![1]);
    expect(c.can_cu_du_an).toBe("Căn cứ KH SDĐ 2026;\nCăn cứ TB 01/TB-UBND;");
    expect(c.tb_thu_hoi_so).toBe("01/TB-UBND");
  });

  it("phương án chốt theo đợt: bắt buộc chọn đợt, chỉ gồm hộ thuộc đợt; mã băm gồm đợt", async () => {
    const { da, a, b } = mau();
    expect(loiChotTheoDot(da, [a], undefined)[0]).toMatch(/chọn đợt/);
    expect(loiChotTheoDot(da, [a, b], "d1")[0]).toMatch(new RegExp(`${b.ma}.*không thuộc Đợt 1`));
    await expect(chotPhuongAn(cs, da, [a], O)).rejects.toThrow(/chọn đợt/);
    const p = await chotPhuongAn(cs, da, [a], { ...O, dotId: "d1" });
    expect(p.dotId).toBe("d1");
    expect(p.dotTen).toBe("Đợt 1");
    expect(await kiemTraToanVen(p)).toBe(true);
    expect(await kiemTraToanVen({ ...p, dotId: "d2" })).toBe(false); // đổi đợt của bản chốt bị phát hiện
    expect(moTaBan(p)).toMatch(/Đợt 1, chốt ngày/);
    // dự án không chia đợt: như cũ
    const khong = { ...da, dotThuHoi: undefined };
    expect((await chotPhuongAn(cs, khong, [a], O)).dotId).toBeUndefined();
  });

  it("không đổi đợt hộ đã có trong phương án của đợt khác; không xóa đợt còn hộ hoặc phương án", async () => {
    const { da, a, b } = mau();
    const p = await chotPhuongAn(cs, da, [a], { ...O, dotId: "d1" });
    const da2 = { ...da, phuongAn: [p] };
    expect(lyDoKhongDoiDot(da2, a, "d2")).toMatch(/bản phương án số 1/);
    expect(lyDoKhongDoiDot(da2, a, "d1")).toBeNull();
    expect(lyDoKhongDoiDot(da2, b, "d1")).toBeNull();
    expect(lyDoKhongXoaDot(da.dotThuHoi![1]!, [a, b], [p])).toHaveLength(2);
    expect(lyDoKhongXoaDot(da.dotThuHoi![1]!, [b], [{ ...p, trangThai: "DA_HUY" }])).toEqual([]);
  });

  it("tổng hợp theo đợt: mỗi đợt một dòng, hộ chưa xếp đợt riêng; tổng các dòng = tổng dự án", async () => {
    const { da, a, b } = mau();
    const c: Ho = { ...b, id: "c", ma: "H99", dotId: undefined };
    const kq = [a, b, c].map((h) => ({ h, k: tinhHo(cs, da, h) }));
    const p = pheDuyet(await chotPhuongAn(cs, da, [a], { ...O, dotId: "d1" }), { so: "5/QĐ", ngay: "2026-09-28", coQuan: "" }, "B");
    const r = tongHopTheoDot({ ...da, phuongAn: [p] }, kq);
    expect(r.map((x) => x.ten)).toEqual(["Đợt 1", "Đợt 2", "Chưa xếp đợt"]);
    expect(r[0]!.soHoDaPheDuyet).toBe(1);
    expect(r[0]!.banPa[0]).toMatchObject({ so: 1, trangThai: "DA_PHE_DUYET", qd: "5/QĐ" });
    const tong = r.reduce((s, x) => s.plus(x.tamTinh), kq[0]!.k.tong.tongLamTron.minus(kq[0]!.k.tong.tongLamTron));
    expect(tong.eq(kq.reduce((s, x) => s.plus(x.k.tong.tongLamTron), tong.minus(tong)))).toBe(true);
    expect(khopDot(c, CHUA_XEP_DOT, da)).toBe(true);
    expect(khopDot({ dotId: "da-xoa" }, CHUA_XEP_DOT, da)).toBe(true);
  });

  it("cảnh báo QĐ thu hồi < 90/180 ngày tính từ ngày thông báo của đợt", () => {
    const { da, a } = mau();
    const h = { ...a, tienDo: { ...a.tienDo, "13": { trangThai: "XONG" as const, ngay: "2026-02-01" } } };
    const cb = canhBaoDuAn({ ...da, ngayThongBao: "2025-01-01" }, [{ h, k: tinhHo(cs, da, h) }], "2026-09-29");
    expect(cb.some((x) => /QĐ thu hồi cách thông báo 22 ngày/.test(x.noiDung))).toBe(true);
  });
});
