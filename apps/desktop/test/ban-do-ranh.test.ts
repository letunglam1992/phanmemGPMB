/** Ranh GPMB → cập nhật DT thu hồi vào hồ sơ; cảnh báo phần còn lại dưới ngưỡng tách thửa (docs/08 §9.1, §9.2). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import type { DienTichThuHoi, ThuaBanDo } from "@gpmb/gis";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { apDtVaoHoSo, canhBaoConLai, dongCapNhatDt, nguongTachThua } from "../src/man/ban-do/ranh";

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

  it("ngưỡng tách thửa: bộ chính sách chưa có nguyên văn → thiếu căn cứ; ngưỡng dự án phải có căn cứ", () => {
    expect(cs.tachThuaToiThieu).toBeUndefined();
    const hoSo = new Map();
    const kq0 = canhBaoConLai(cs, duAn, dsTb, m, khoa, hoSo);
    expect(kq0).toEqual([expect.objectContaining({ muc: "THIEU_CAN_CU", loaiDat: "ONT" })]);
    const d1 = { ...duAn, tachThuaToiThieu: [{ id: "a", loaiDat: "ONT, ODT", dienTich: "5000", canCu: "" }] };
    expect(nguongTachThua(cs, d1, "ONT")).toBeNull(); // thiếu căn cứ → không dùng
    const d2 = { ...duAn, tachThuaToiThieu: [{ id: "a", loaiDat: "ONT, ODT", dienTich: "5000", canCu: "Điều … PL I QĐ 106/2025 (thử)" }] };
    const kq = canhBaoConLai(cs, d2, dsTb, m, khoa, hoSo);
    expect(kq).toHaveLength(1);
    expect(kq[0]).toMatchObject({ muc: "NHO", nguong: { dienTich: 5000, nguon: "DU_AN" } });
    expect(kq[0]!.conLai).toBeCloseTo(4222.06, 2);
    // Bộ chính sách có mức (khi có nguyên văn) được ưu tiên
    const cs2 = { ...cs, tachThuaToiThieu: { ghiChu: "", muc: [{ ma: "x", moTa: "", loaiDat: ["ONT"], khuVuc: "XA" as const, dienTich: "40", canCu: [{ vanBan: "QĐ 106/2025/QĐ-UBND", viTri: "Điều … PL I" }] }] } };
    expect(nguongTachThua(cs2, d2, "ONT")).toMatchObject({ dienTich: 40, nguon: "BO_CHINH_SACH" });
    expect(canhBaoConLai(cs2, d2, dsTb, m, khoa, hoSo)).toEqual([]);
  });
});
