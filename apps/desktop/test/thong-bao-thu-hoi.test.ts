import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { thongBaoNhom } from "../src/thu-tuc-ban";
import { nhomThuHoi } from "../src/han-buoc";
import { canhBaoDuAn } from "../src/trang-thai";
import type { DuAn, Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const moc13 = (h: Ho, ngay: string): Ho => ({ ...h, tienDo: { ...h.tienDo, "13": { trangThai: "CHUA", mocHan: ngay } } });

describe("1.0.18 (A4) — thông báo thu hồi theo nhóm: 90/180 ngày (k1 Đ85), hiệu lực 12 tháng (k5 Đ85)", () => {
  it("ngày sớm nhất theo loại đất của nhóm; đợt có ngày thông báo riêng; hiệu lực 12 tháng", () => {
    const { duAn, ho } = taoDuAnMau();
    const nn = ho.map((h) => ({ ...h, thua: h.thua.map((t) => ({ ...t, loaiDat: "LUC" })) }));
    const pnn = nn.map((h, i) => (i === 0 ? { ...h, thua: [...h.thua, { ...h.thua[0]!, id: "x", loaiDat: "ONT" }] } : h));
    const da: DuAn = { ...duAn, ngayThongBao: "2026-01-31", dotThuHoi: [] };
    expect(thongBaoNhom(da, "__chua__", nn)).toMatchObject({ ngayTb: "2026-01-31", soNgay: 90, somNhat: "2026-05-01", hieuLucDen: "2027-01-31", conLai: nn.length });
    expect(thongBaoNhom(da, "__chua__", pnn)).toMatchObject({ soNgay: 180, somNhat: "2026-07-30" });
    // 31/01 + 1 tháng không có ngày 31 → ngày cuối tháng (kiểm qua 12 tháng từ 29/02)
    expect(thongBaoNhom({ ngayThongBao: "2028-02-29" }, "x", nn)!.hieuLucDen).toBe("2029-02-28");
    const daDot: DuAn = { ...da, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1", ngayThongBao: "2026-03-01" }] };
    expect(thongBaoNhom(daDot, "d1", nn)!.ngayTb).toBe("2026-03-01");
    expect(thongBaoNhom({}, "x", nn)).toBeNull();
  });

  it("cảnh báo một dòng cho nhóm: ngày đủ điều kiện trước ngày sớm nhất; thông báo hết hiệu lực", () => {
    const { duAn, ho } = taoDuAnMau();
    const nn = ho.map((h) => ({ ...h, thua: h.thua.map((t) => ({ ...t, loaiDat: "LUC" })) }));
    const da: DuAn = { ...duAn, ngayThongBao: "2026-01-31", dotThuHoi: [] };
    const cb = (hos: Ho[], homNay: string) => canhBaoDuAn(da, hos.map((h) => ({ h, k: tinhHo(cs, da, h) })), homNay).map((c) => c.noiDung);
    const som = cb(nn.map((h) => moc13(h, "2026-04-01")), "2026-04-02");
    expect(som.filter((c) => /trước ngày đủ 90 ngày kể từ thông báo \(01\/05\/2026\)/.test(c))).toHaveLength(1);
    expect(cb(nn.map((h) => moc13(h, "2026-05-02")), "2026-05-03").some((c) => /trước ngày đủ/.test(c))).toBe(false);
    const het = cb(nn, "2027-02-01");
    expect(het.filter((c) => /Cả dự án: thông báo thu hồi ngày 31\/01\/2026 đã hết hiệu lực 12 tháng \(đến 31\/01\/2027\)/.test(c))).toHaveLength(1);
    expect(cb(nn, "2027-01-31").some((c) => /hết hiệu lực/.test(c))).toBe(false);
    // xong bước 13 cả nhóm → không cảnh báo hiệu lực
    const xong = nn.map((h) => ({ ...h, tienDo: { ...h.tienDo, "13": { trangThai: "XONG" as const, ngay: "2026-06-01" } } }));
    expect(cb(xong, "2027-02-01").some((c) => /hết hiệu lực/.test(c))).toBe(false);
    expect(nhomThuHoi(da, nn)[0]!.ten).toBe("Cả dự án");
  });
});
