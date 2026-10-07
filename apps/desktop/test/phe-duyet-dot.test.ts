/** Ghi nhận phê duyệt theo đợt; số, ngày QĐ không bắt buộc (bổ sung sau); chi trả khi chưa có ngày QĐ. */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { boSungQd, chotPhuongAn, dotPheDuyet, moTaBan, moTaQd, pheDuyet } from "../src/phuong-an";
import { tinhChiTra } from "../src/chi-tra";

const cs = cs0 as unknown as BoChinhSach;
describe("Phê duyệt theo đợt", () => {
  it("ghi nhận không cần số, ngày; đợt; bổ sung chỉ điền ô trống; chi trả chờ ngày QĐ", async () => {
    const { duAn, ho } = taoDuAnMau();
    const a = await chotPhuongAn(cs, duAn, [ho[0]!], { ten: "B1", lyDo: "", nguoi: "x" });
    expect(dotPheDuyet([a], a)).toBe(1);
    const d = pheDuyet(a, { so: "", ngay: "", coQuan: "UBND xã", dot: 1 }, "x");
    expect(d.trangThai).toBe("DA_PHE_DUYET");
    expect(moTaQd(d.pheDuyet)).toBe("(chưa ghi số, ngày QĐ)");
    expect(moTaBan(d)).toContain("ĐÃ PHÊ DUYỆT (đợt 1)");
    const ct = tinhChiTra(ho[0]!, [d], [], "2026-12-01");
    expect(ct.trangThai).toBe("CHUA_CHI");
    expect(ct.hanChi).toBeNull();
    expect(ct.canhBao.join()).toContain("Chưa có ngày quyết định phê duyệt");
    const b = boSungQd(d, { so: "12/QĐ-UBND", ngay: "2026-10-02", coQuan: "khác" });
    expect(b.pheDuyet).toMatchObject({ so: "12/QĐ-UBND", ngay: "2026-10-02", coQuan: "UBND xã", dot: 1 });
    expect(moTaQd(b.pheDuyet)).toBe("12/QĐ-UBND ngày 02/10/2026");
    expect(boSungQd(b, { so: "99", ngay: "2026-01-01", coQuan: "" }).pheDuyet!.so).toBe("12/QĐ-UBND");
    expect(tinhChiTra(ho[0]!, [b], [], "2026-12-01").hanChi).toBe("2026-11-01");
    // bản thứ hai → đợt 2
    const c = await chotPhuongAn(cs, { ...duAn, phuongAn: [b] }, [ho[0]!], { ten: "B2", lyDo: "điều chỉnh", nguoi: "x" });
    expect(dotPheDuyet([b, c], c)).toBe(2);
    // 0.9.27: đếm riêng trong từng đợt thu hồi
    const e = { ...c, id: "e", dotId: "dot2" };
    expect(dotPheDuyet([b, c, e], e)).toBe(1);
    const f = { ...pheDuyet(e, { so: "", ngay: "", coQuan: "" }, "x"), pheDuyet: { so: "", ngay: "", coQuan: "", luc: "2026-10-03T00:00:00.000Z", nguoi: "x" } };
    expect(dotPheDuyet([b, f, { ...c, id: "g", dotId: "dot2" }], { ...c, id: "g", dotId: "dot2" })).toBe(2);
  });
});
