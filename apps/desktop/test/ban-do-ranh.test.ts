/** Ranh GPMB → cập nhật DT thu hồi vào hồ sơ; cảnh báo phần còn lại dưới ngưỡng tách thửa (docs/08 §9.1, §9.2). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import type { DienTichThuHoi, ThuaBanDo } from "@gpmb/gis";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { apDtVaoHoSo, canhBaoConLai, dongCapNhatDt, nguongTachThua } from "../src/man/ban-do/ranh";
import type { Thua } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const tb = (ma: string, dt: number): ThuaBanDo => ({ ma, soTo: "5", soThua: ma, loaiDatBanDo: "ONT", dienTichGhi: null, dienTichHinhHoc: dt, chuSuDung: null, vong: [], tamNhan: { x: 0, y: 0 }, nhan: [], co: [] });
const th = (ma: string, dt: number, thuHoi: number, phamVi: DienTichThuHoi["phamVi"]): DienTichThuHoi => ({ ma, dienTichHinhHoc: dt, dienTichThuHoi: thuHoi, phamVi, vongThuHoi: [] });

describe("Cập nhật DT thu hồi từ ranh GPMB", () => {
  const { duAn, ho } = taoDuAnMau();
  const h0 = { ...ho[0]!, thua: ho[0]!.thua.map((t, i) => ({ ...t, maBanDo: i === 0 ? "85" : "73" })) };
  const dsTb = [tb("85", 9222.1), tb("73", 443.2)];
  const m = new Map([["85#0", th("85", 9222.1, 5000.04, "MOT_PHAN")], ["73#1", th("73", 443.2, 443.2, "TOAN_BO")]]);
  const khoa = (t: ThuaBanDo) => `${t.ma}#${dsTb.indexOf(t)}`;

  it("so hồ sơ với ranh: một phần làm tròn 0,1 m²; toàn bộ giữ DT thửa; DT còn lại", () => {
    const ds = dongCapNhatDt(dsTb, m, khoa, [h0]);
    expect(ds.map((d) => [d.thua.soThua, d.moi, d.khac])).toEqual([["85", "5000", true], ["73", "443.2", false]]);
    expect(ds[0]!.conLai).toBeCloseTo(4222.1, 6);
    const moi = apDtVaoHoSo(ds, new Set([ds[0]!.thua.id]), "cán bộ A", "thu.dgn");
    expect(moi).toHaveLength(1);
    expect(moi[0]!.thua[0]!.dienTichThuHoi).toBe("5000");
    expect(moi[0]!.thua[0]!.ghiChu).toMatch(/DT thu hồi 5000 m² tính theo ranh GPMB \(thu\.dgn\)/);
    expect(moi[0]!.nhatKy.at(-1)!.noiDung).toMatch(/9222\.1 → 5000 m²/);
    expect(moi[0]!.thua[1]).toBe(h0.thua[1]); // thửa không chọn giữ nguyên
  });

  it("ngưỡng tách thửa theo Điều 13, 15, 16 PL I QĐ 106/2025 (bộ chính sách): xã/phường, vị trí, cạnh rộng", () => {
    expect(nguongTachThua(cs, duAn, "ONT").map((x) => x.dienTich).sort()).toEqual([50, 60]);
    expect(nguongTachThua(cs, duAn, "ONT", "TRUNG_TAM")).toMatchObject([{ dienTich: 50, rong: 4, canCu: "điểm a khoản 2 Điều 13 Phụ lục I QĐ 106/2025/QĐ-UBND" }]);
    expect(nguongTachThua(cs, duAn, "ONT", "DUONG_XA")).toMatchObject([{ dienTich: 60 }]);
    expect(nguongTachThua(cs, { ...duAn, xa: "Phường Tô Hiệu" }, "ODT")).toMatchObject([{ dienTich: 35, rong: 3.5 }]);
    expect(nguongTachThua(cs, duAn, "CLN")).toMatchObject([{ dienTich: 1000, rong: null }]);
    expect(nguongTachThua(cs, { ...duAn, xa: "Phường Tô Hiệu" }, "LUC")[0]).toMatchObject({ dienTich: 200, luuY: expect.stringMatching(/đất trồng lúa/) });
    expect(nguongTachThua(cs, duAn, "TMD")).toMatchObject([{ dienTich: 200, rong: 4 }]);
    expect(nguongTachThua(cs, duAn, "DGT")).toEqual([]);
  });

  it("cảnh báo phần còn lại: dưới ngưỡng, cần vị trí, hẹp (không dựng được hình chữ nhật rộng 4 m), thiếu căn cứ", () => {
    const vu = (x0: number, w: number, h = 10) => [[{ x: x0, y: 0 }, { x: x0 + w, y: 0 }, { x: x0 + w, y: h }, { x: x0, y: h }, { x: x0, y: 0 }]];
    const thua = (ma: string, loai: string, w: number, h = 10): ThuaBanDo => ({ ...tb(ma, w * h), loaiDatBanDo: loai, vong: vu(0, w, h) });
    // còn lại = phần x < c (rộng c m)
    const ca: [ThuaBanDo, number][] = [[thua("a", "ONT", 20), 3], [thua("b", "ONT", 20), 5.5], [thua("c", "ONT", 30, 20), 3.5], [thua("d", "DGT", 20), 5]];
    const dsT = ca.map(([t]) => t);
    const m2 = new Map(ca.map(([t, c], i) => [`${t.ma}#${i}`, { ...th(t.ma, t.dienTichHinhHoc, t.dienTichHinhHoc - c * (t.ma === "c" ? 20 : 10), "MOT_PHAN" as const), vongThuHoi: [vu(c, (t.ma === "c" ? 30 : 20) - c, t.ma === "c" ? 20 : 10)] }]));
    const kh = (t: ThuaBanDo) => `${t.ma}#${dsT.indexOf(t)}`;
    const kq = canhBaoConLai(cs, duAn, dsT, m2, kh, new Map());
    const theo = Object.fromEntries(kq.map((x) => [x.tb.ma, x]));
    expect(theo.a).toMatchObject({ muc: "NHO", nguong: { dienTich: 50 } });
    expect(theo.a!.conLai).toBeCloseTo(30, 6);
    expect(theo.b).toMatchObject({ muc: "CAN_VI_TRI", nguong: { dienTich: 60 } });
    expect(theo.c).toMatchObject({ muc: "HEP" });
    expect(theo.c!.ghiChu.join(" ")).toMatch(/không dựng được hình chữ nhật có cạnh chiều rộng 4 m/i);
    expect(theo.d).toMatchObject({ muc: "THIEU_CAN_CU" });
    // Vị trí thửa trong hồ sơ (TRUNG_TAM → 50 m²): thửa b 55 m² không còn cảnh báo; ngưỡng dự án có căn cứ dùng cho DGT
    const hoSo = new Map([["b", { id: "x", soTo: "5", soThua: "b", loaiDat: "ONT", dienTich: "200", dienTichThuHoi: "145", nguonGoc: "", gia: null, khongGiayTo: { dieu: "D8", ngaySuDung: "", viTriHanMuc: "TRUNG_TAM" } } as unknown as Thua]]);
    const d2 = { ...duAn, tachThuaToiThieu: [{ id: "a", loaiDat: "DGT", dienTich: "100", canCu: "Căn cứ thử nghiệm" }] };
    const kq2 = canhBaoConLai(cs, d2, dsT, m2, kh, hoSo);
    expect(kq2.find((x) => x.tb.ma === "b")).toBeUndefined();
    expect(kq2.find((x) => x.tb.ma === "d")).toMatchObject({ muc: "NHO", nguong: { nguon: "DU_AN", dienTich: 100 } });
    // ngưỡng dự án thiếu căn cứ → không dùng
    expect(nguongTachThua(cs, { ...duAn, tachThuaToiThieu: [{ id: "a", loaiDat: "DGT", dienTich: "100", canCu: "" }] }, "DGT")).toEqual([]);
  });

  it("Điều 14, 17 PL I QĐ 106/2025: cán bộ chọn trường hợp (có căn cứ) — Đ14 đối chiếu mức đất ở, Đ17 không áp dụng; thiếu căn cứ thì như cũ", () => {
    const vu = (x0: number, w: number, h = 10) => [[{ x: x0, y: 0 }, { x: x0 + w, y: 0 }, { x: x0 + w, y: h }, { x: x0, y: h }, { x: x0, y: 0 }]];
    // thửa CLN 2.000 m², thu hồi 1.300 m², còn lại 700 m² (< 1.000 m² đất CLN tại xã; ≥ 60 m² đất ở)
    const t0: ThuaBanDo = { ...tb("e", 2000), loaiDatBanDo: "CLN", vong: vu(0, 100, 20) };
    const m3 = new Map([["e#0", { ...th("e", 2000, 1300, "MOT_PHAN"), vongThuHoi: [vu(35, 65, 20)] }]]);
    const kh = () => "e#0";
    const hs = (tachThua?: Thua["tachThua"]) => new Map([["e", { id: "e", soTo: "5", soThua: "e", loaiDat: "CLN", dienTich: "2000", dienTichThuHoi: "1300", nguonGoc: "", gia: null, tachThua } as unknown as Thua]]);
    expect(canhBaoConLai(cs, duAn, [t0], m3, kh, hs())[0]).toMatchObject({ muc: "NHO", nguong: { dienTich: 1000 } });
    const k1 = canhBaoConLai(cs, duAn, [t0], m3, kh, hs({ truongHop: "D14_K1", canCu: "GCN số AB 123" }));
    expect(k1).toEqual([]); // 700 m² ≥ mức đất ở tại xã
    const k2 = canhBaoConLai(cs, duAn, [{ ...t0, vong: vu(0, 100, 20) }], new Map([["e#0", { ...th("e", 2000, 1960, "MOT_PHAN"), vongThuHoi: [vu(2, 98, 20)] }]]), kh, new Map([["e", { id: "e", soTo: "5", soThua: "e", loaiDat: "CLN", dienTich: "2000", dienTichThuHoi: "1960", nguonGoc: "", gia: null, tachThua: { truongHop: "D14_K2", canCu: "Biên bản xác minh" } } as unknown as Thua]]));
    expect(k2[0]).toMatchObject({ muc: "NHO", nguong: { dienTich: 50 } });
    expect(k2[0]!.ghiChu.join(" ")).toMatch(/khoản 2 Điều 14 Phụ lục I .*căn cứ: Biên bản xác minh/);
    expect(canhBaoConLai(cs, duAn, [t0], m3, kh, hs({ truongHop: "D17_K2", canCu: "Văn bản tặng cho" }))).toEqual([]);
    // chưa ghi căn cứ → vẫn đối chiếu theo loại đất của thửa
    expect(canhBaoConLai(cs, duAn, [t0], m3, kh, hs({ truongHop: "D17_K2", canCu: " " }))[0]).toMatchObject({ muc: "NHO" });
  });
});
