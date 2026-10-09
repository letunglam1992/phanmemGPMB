import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho } from "../src/mo-hinh";
import { ghiKetQuaBocTham, giaoLo, loMoi, loiLo, soatQuyTdc, thongKeQuy, thuHoiGiao, type LoTdc } from "../src/quy-tdc";
import { soatPhuongAn } from "../src/soat-phuong-an";
import { tinhHo } from "../src/tinh-ho";
import { taoWorkbookQuyTdc } from "../src/xuat-excel";

const cs = cs0 as unknown as BoChinhSach;

function mau() {
  const { duAn, ho } = taoDuAnMau();
  const tdc = { hinhThuc: "DAT_O" as const, khoanKhac: [{ id: "k", noiDung: "San lấp", soTien: "1000000", canCu: "QĐ 5" }], suatToiThieu: true };
  const [a, b] = ho as [Ho, Ho];
  const hos: Ho[] = [{ ...a, hoTro: { ...a.hoTro, taiDinhCu: tdc } }, { ...b, hoTro: { ...b.hoTro, taiDinhCu: tdc } }];
  const lo: LoTdc[] = [
    loMoi({ id: "l1", khu: "Khu TĐC bản Mé", soLo: "A1", dienTich: "150", gia: "2500000", canCuGia: "NQ 152/2025, Bảng 05, VT1" }),
    loMoi({ id: "l2", khu: "Khu TĐC bản Mé", soLo: "A2", dienTich: "160", gia: "2500000", canCuGia: "NQ 152/2025, Bảng 05, VT1" }),
    loMoi({ id: "l3", khu: "Khu TĐC bản Mé", soLo: "A3", dienTich: "150", giuLai: "Đang tranh chấp ranh" }),
  ];
  const da: DuAn = { ...duAn, quyTdc: { lo, bocTham: true } };
  return { da, hos };
}
const G = { ngay: "2026-10-01", hinhThuc: "XET_GIAO" as const, canCu: "QĐ giao đất 12/QĐ-UBND", nguoi: "A", luc: "2026-10-01T00:00:00Z" };

describe("Quỹ tái định cư (P3-3)", () => {
  it("giá lô do đơn vị nhập phải kèm căn cứ; không trùng khu + lô; tạm giữ phải có lý do", () => {
    const { da } = mau();
    const ds = da.quyTdc!.lo;
    expect(loiLo(ds[0]!, ds)).toBeNull();
    expect(loiLo({ ...ds[0]!, canCuGia: " " }, ds)).toMatch(/căn cứ/);
    expect(loiLo({ ...ds[0]!, id: "x", soLo: " a1 " }, ds)).toMatch(/Trùng/);
    expect(loiLo({ ...ds[0]!, dienTich: "150,5" }, ds)).toMatch(/số dương/);
    expect(loiLo({ ...ds[2]!, giuLai: "" }, ds)).toMatch(/lý do/);
    expect(loiLo(loMoi({ khu: "K", soLo: "1" }), [])).toBeNull(); // chưa có giá: được (khoản C10 sẽ "Thiếu căn cứ")
  });

  it("giao lô ghi thông tin lô vào hồ sơ hộ, giữ khoản khác; lô đã giao / tạm giữ không giao được", () => {
    const { da, hos } = mau();
    const r = giaoLo(da, hos[0]!, "l1", G);
    const t = r.ho.hoTro.taiDinhCu!;
    expect(t).toMatchObject({ hinhThuc: "DAT_O", khuTdc: "Khu TĐC bản Mé", viTriLo: "A1", dienTichGiao: "150", donGia: "2500000", nguonGia: "NQ 152/2025, Bảng 05, VT1", loId: "l1", suatToiThieu: true });
    expect(t.khoanKhac).toHaveLength(1);
    expect(r.duAn.quyTdc!.lo[0]!.giao).toMatchObject({ hoId: hos[0]!.id, canCu: "QĐ giao đất 12/QĐ-UBND" });
    expect(() => giaoLo(r.duAn, hos[1]!, "l1", G)).toThrow(/đã giao/);
    expect(() => giaoLo(da, hos[1]!, "l3", G)).toThrow(/tạm giữ/);
    expect(() => giaoLo(da, hos[1]!, "l2", { ...G, canCu: " " })).toThrow(/căn cứ giao/);
    // tính toán dùng giá lô: C10 có đơn giá → không còn "Thiếu căn cứ" vì thiếu giá
    const c10 = (h: Ho) => tinhHo(cs, r.duAn, h).tatCa.find((x) => x.dong.ma === "C10")!.dong;
    expect(c10(hos[0]!).canhBao.join(" ")).toMatch(/Chưa nhập giá/);
    expect(c10(r.ho).canhBao.join(" ")).not.toMatch(/Chưa nhập giá/);
  });

  it("thu hồi giao bắt buộc lý do, bỏ thông tin lô khỏi hồ sơ, lưu vết", () => {
    const { da, hos } = mau();
    const g = giaoLo(da, hos[0]!, "l1", G);
    expect(() => thuHoiGiao(g.duAn, g.ho, "l1", " ", "A")).toThrow(/lý do/);
    const r = thuHoiGiao(g.duAn, g.ho, "l1", "Giao nhầm", "A", "2026-10-02T00:00:00Z");
    expect(r.duAn.quyTdc!.lo[0]!.giao).toBeUndefined();
    expect(r.duAn.quyTdc!.huyGiao![0]).toMatchObject({ loId: "l1", lyDo: "Giao nhầm" });
    expect(r.ho!.hoTro.taiDinhCu).toMatchObject({ hinhThuc: "DAT_O", suatToiThieu: true });
    expect(r.ho!.hoTro.taiDinhCu!.loId).toBeUndefined();
    expect(r.ho!.hoTro.taiDinhCu!.donGia).toBeUndefined();
  });

  it("ghi nhận bốc thăm: chỉ khi dự án chọn bốc thăm; kiểm trùng hộ, lô, thứ tự; giao theo kết quả", () => {
    const { da, hos } = mau();
    const kq = { ngay: "2026-10-05", bienBan: "05/BB-HĐ", ketQua: [{ stt: 1, hoId: hos[0]!.id, loId: "l2" }, { stt: 2, hoId: hos[1]!.id, loId: "l1" }] };
    expect(() => ghiKetQuaBocTham({ ...da, quyTdc: { ...da.quyTdc!, bocTham: undefined } }, hos, kq, "A")).toThrow(/chưa chọn/);
    expect(() => ghiKetQuaBocTham(da, hos, { ...kq, bienBan: "" }, "A")).toThrow(/biên bản/);
    expect(() => ghiKetQuaBocTham(da, hos, { ...kq, ketQua: [kq.ketQua[0]!, { ...kq.ketQua[1]!, loId: "l2" }] }, "A")).toThrow(/đã có ở dòng khác/);
    expect(() => ghiKetQuaBocTham(da, hos, { ...kq, ketQua: [kq.ketQua[0]!, { ...kq.ketQua[1]!, stt: 1 }] }, "A")).toThrow(/Trùng thứ tự/);
    expect(() => ghiKetQuaBocTham(da, hos, { ...kq, ketQua: [{ stt: 1, hoId: hos[0]!.id, loId: "l3" }] }, "A")).toThrow(/tạm giữ/);
    const r = ghiKetQuaBocTham(da, hos, kq, "A", "2026-10-05T09:00:00Z");
    expect(r.ho.map((h) => h.hoTro.taiDinhCu!.viTriLo)).toEqual(["A2", "A1"]);
    expect(r.duAn.quyTdc!.lo.find((l) => l.id === "l2")!.giao).toMatchObject({ hinhThuc: "BOC_THAM", bocThamId: r.ban.id, canCu: "Biên bản bốc thăm 05/BB-HĐ (thứ tự 1)" });
    expect(r.duAn.quyTdc!.ketQuaBocTham).toHaveLength(1);
    expect(thongKeQuy(r.duAn, r.ho)).toMatchObject({ soLo: 3, trong: 0, giuLai: 1, daGiao: 2, hoChoLo: 0 });
  });

  it("soát: hai hộ nhập tay cùng một lô là lỗi; hồ sơ khác lô đã giao, một hộ nhiều lô là cảnh báo", () => {
    const { da, hos } = mau();
    const tay = hos.map((h) => ({ ...h, hoTro: { ...h.hoTro, taiDinhCu: { ...h.hoTro.taiDinhCu!, khuTdc: "Khu X", viTriLo: "5" } } }));
    expect(soatQuyTdc(da, tay).find((x) => x.muc === "LOI")!.noiDung).toMatch(/cùng được ghi Khu X – lô 5/);
    const g1 = giaoLo(da, hos[0]!, "l1", G);
    const g2 = giaoLo(g1.duAn, g1.ho, "l2", G);
    const c = soatQuyTdc(g2.duAn, [g2.ho, hos[1]!]);
    expect(c.find((x) => /được giao 2 lô/.test(x.noiDung))).toMatchObject({ muc: "CANH_BAO", canCu: "Điều 111 Luật Đất đai 2024" });
    const sua = { ...g1.ho, hoTro: { ...g1.ho.hoTro, taiDinhCu: { ...g1.ho.hoTro.taiDinhCu!, dienTichGiao: "140" } } };
    expect(soatQuyTdc(g1.duAn, [sua, hos[1]!]).find((x) => /khác lô đã giao/.test(x.noiDung))!.muc).toBe("CANH_BAO");
    const nham = { ...hos[1]!, hoTro: { ...hos[1]!.hoTro, taiDinhCu: { ...hos[1]!.hoTro.taiDinhCu!, loId: "l1" } } };
    expect(soatQuyTdc(g1.duAn, [g1.ho, nham]).find((x) => /đã giao cho hộ khác/.test(x.noiDung))!.muc).toBe("LOI");
    // đưa vào Soát phương án
    const s = soatPhuongAn(da, tay.map((h) => ({ h, k: tinhHo(cs, da, h) })));
    expect(s.some((x) => x.quyTac === "TDC_LO" && x.muc === "LOI")).toBe(true);
  });

  it("xuất Excel quỹ TĐC: các trang quỹ, hộ chờ, lô trống, kết quả bốc thăm", async () => {
    const { da, hos } = mau();
    const g = giaoLo(da, hos[0]!, "l1", G);
    const wb = await taoWorkbookQuyTdc(g.duAn, [g.ho, hos[1]!]);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Quỹ TĐC", "Hộ chờ bố trí", "Lô trống", "Kết quả bốc thăm"]);
    expect(wb.getWorksheet("Hộ chờ bố trí")!.getRow(4).getCell(2).value).toBe(hos[1]!.ma);
    expect(wb.getWorksheet("Lô trống")!.getRow(4).getCell(3).value).toBe("A2");
  });

  it("1.0.7 — biên bản bốc thăm (T13): lô trống đưa vào bốc thăm, hộ cần bố trí; điền kết quả khi đã ghi nhận", async () => {
    const { readFileSync } = await import("node:fs");
    const { DANH_MUC_MAU } = await import("../src/van-ban/danh-muc");
    const { ghepDuLieu, thongTinChungMacDinh } = await import("../src/van-ban/du-lieu");
    const { kiemTraThongNhat } = await import("../src/van-ban/thuc-te");
    const { dienMau } = await import("../src/van-ban/dien-mau");
    const PizZip = (await import("pizzip")).default;
    const { da, hos } = mau();
    const m = DANH_MUC_MAU.find((x) => x.ma === "T13")!;
    const tep = readFileSync(new URL("../public/mau-van-ban/tt-bb-boc-tham-tdc.docx", import.meta.url));
    const chu = (u8: Uint8Array) => new PizZip(u8).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
    const tao = (duAn: DuAn, hs: Ho[]) => ghepDuLieu({ mau: m, duAn, ds: hs.map((h) => ({ h, k: tinhHo(cs, duAn, h) })), chung: thongTinChungMacDinh(duAn), rieng: { quy_che_boc_tham: "Quy chế bốc thăm số 1", nguyen_tac_boc_tham: "Bốc số thứ tự rồi bốc lô" }, so: "", ngayKy: "2026-10-05" });
    // trước bốc thăm: 2 lô trống (A3 tạm giữ bị bỏ), 2 hộ, cột kết quả trống
    const du = tao(da, hos);
    expect((du.ds_lo_boc as { so_lo: string }[]).map((x) => x.so_lo)).toEqual(["A1", "A2"]);
    expect((du.ds_ket_qua_boc as { thu_tu: string; lo: string }[]).map((x) => [x.thu_tu, x.lo])).toEqual([["", ""], ["", ""]]);
    expect(du.so_ho_boc_chu).toBe("hai (02)");
    expect(kiemTraThongNhat("T13", da, du).some((c) => c.includes("Chưa ghi nhận kết quả bốc thăm"))).toBe(true);
    const t = chu(dienMau(tep, du));
    expect(t).toContain("BIÊN BẢN");
    expect(t).toContain("Căn cứ Quy chế bốc thăm số 1;");
    expect(t).toContain("2. Nguyên tắc, trình tự bốc thăm: Bốc số thứ tự rồi bốc lô");
    expect(t).toContain("1. Quỹ lô đất ở, căn nhà ở đưa vào bốc thăm: 2 lô/căn tại Khu TĐC bản Mé");
    expect(t).toContain("NQ 152/2025, Bảng 05, VT1");
    expect(t).not.toContain("{");
    // sau khi ghi nhận: thứ tự, lô theo biên bản; lô đã giao theo lần này vẫn ở Biểu 01
    const r = ghiKetQuaBocTham(da, hos, { ngay: "2026-10-05", bienBan: "05/BB-HĐ", ketQua: [{ stt: 1, hoId: hos[1]!.id, loId: "l2" }, { stt: 2, hoId: hos[0]!.id, loId: "l1" }] }, "A", "2026-10-05T09:00:00Z");
    const du2 = tao(r.duAn, r.ho);
    expect((du2.ds_lo_boc as unknown[]).length).toBe(2);
    expect((du2.ds_ket_qua_boc as { ho_ten: string; thu_tu: string; lo: string }[]).map((x) => [x.ho_ten, x.thu_tu, x.lo])).toEqual([[hos[1]!.ten, "1", "Khu TĐC bản Mé – lô A2"], [hos[0]!.ten, "2", "Khu TĐC bản Mé – lô A1"]]);
    expect(kiemTraThongNhat("T13", r.duAn, du2).filter((c) => c.includes("bốc thăm"))).toEqual([]);
    // dự án không chọn bốc thăm → cảnh báo
    const du3 = tao({ ...da, quyTdc: { lo: da.quyTdc!.lo } }, hos);
    expect(kiemTraThongNhat("T13", da, du3).some((c) => c.includes("chưa chọn giao lô bằng hình thức bốc thăm"))).toBe(true);
  });
});
