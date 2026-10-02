import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { moTaBan, chotPhuongAn, chupHo, hoChuaDuDieuKien, hoLechSauPheDuyet, huyBan, kiemTraToanVen, LoiPhuongAn, pheDuyet, soSanh, tinhLaiBan } from "../src/phuong-an";
import type { Ho } from "../src/mo-hinh";
import { canhBaoDuAn } from "../src/trang-thai";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const [h1, h2] = ho as [Ho, Ho];
const O = { ten: "Phương án đợt 1", lyDo: "", nguoi: "Cán bộ A", luc: "2026-09-27T08:00:00.000Z" };

describe("Phiên bản phương án", () => {
  it("không chốt hộ còn khoản thiếu căn cứ; báo rõ hộ và lý do, không tự loại", async () => {
    const chua = hoChuaDuDieuKien([h1, h2].map((h) => ({ h, k: tinhHo(cs, duAn, h) })));
    expect(chua.map((x) => x.h.ma)).toEqual([h2.ma]);
    await expect(chotPhuongAn(cs, duAn, [h1, h2], O)).rejects.toThrow(new RegExp(`${h2.ma}.*thiếu căn cứ`));
  });

  it("chốt đóng băng số liệu, mã băm; tổng = tổng làm tròn cấp hộ; tính lại khớp", async () => {
    const p = await chotPhuongAn(cs, duAn, [h1], O);
    const k = tinhHo(cs, duAn, h1);
    expect(p).toMatchObject({ so: 1, trangThai: "DA_CHOT", tong: k.tong.tongLamTron.toFixed() });
    expect(p.ho[0]!.dong.length).toBe(k.tatCa.length);
    expect(await kiemTraToanVen(p)).toBe(true);
    expect(tinhLaiBan(cs, duAn, p).lech).toEqual([]);
    // sửa hồ sơ sau khi chốt không làm đổi bản chốt
    h1.thua[0]!.dienTichThuHoi = "1";
    expect(p.ho[0]!.duLieu.thua[0]!.dienTichThuHoi).not.toBe("1");
    // sửa trực tiếp số liệu trong bản chốt → mất toàn vẹn
    expect(await kiemTraToanVen({ ...p, tong: "1" })).toBe(false);
  });

  it("phê duyệt không bắt buộc số, ngày QĐ (người dùng 02/10/2026); bản đã duyệt không hủy được; điều chỉnh phải có lý do", async () => {
    const { duAn: da, ho: hs } = taoDuAnMau();
    const p = await chotPhuongAn(cs, da, [hs[0]!], O);
    expect(pheDuyet(p, { so: "", ngay: "", coQuan: "UBND xã" }, "B").trangThai).toBe("DA_PHE_DUYET");
    expect(() => pheDuyet({ ...p, trangThai: "DA_HUY" }, { so: "1", ngay: "2026-10-01", coQuan: "" }, "B")).toThrow(LoiPhuongAn);
    const d = pheDuyet(p, { so: "123/QĐ-UBND", ngay: "2026-10-01", coQuan: "UBND xã" }, "B");
    expect(d.trangThai).toBe("DA_PHE_DUYET");
    expect(() => huyBan(d, "x", "B")).toThrow(/không hủy/);
    expect(await kiemTraToanVen(d)).toBe(true);
    const da2 = { ...da, phuongAn: [d] };
    await expect(chotPhuongAn(cs, da2, [hs[0]!], { ...O, ten: "Điều chỉnh" })).rejects.toThrow(/lý do điều chỉnh/);
    const p2 = await chotPhuongAn(cs, da2, [hs[0]!], { ...O, ten: "Điều chỉnh", lyDo: "Bổ sung cây trồng sót" });
    expect(p2.so).toBe(2);
    expect(huyBan(p2, "Nhập nhầm", "B").trangThai).toBe("DA_HUY");
    expect(moTaBan(d)).toBe("Phương án bản 1 – ĐÃ PHÊ DUYỆT theo Quyết định số 123/QĐ-UBND ngày 01/10/2026 của UBND xã (chốt ngày 27/09/2026)");
    expect(moTaBan(p2)).toContain("CHỜ PHÊ DUYỆT");
    expect(() => huyBan(p2, " ", "B")).toThrow(/lý do/);
  });

  it("so sánh: tăng/giảm/thêm/bỏ theo hộ, theo khoản, theo cột; cảnh báo hộ sửa sau phê duyệt", async () => {
    const { duAn: da, ho: hs } = taoDuAnMau();
    const a = hs[0]!;
    const b: Ho = structuredClone(a);
    b.thua[0]!.dienTichThuHoi = String(Number(b.thua[0]!.dienTichThuHoi) + 10);
    const x = chupHo(a, tinhHo(cs, da, a));
    const y = chupHo(b, tinhHo(cs, da, b));
    const ss = soSanh([x], [y]);
    expect(ss.dong[0]!.loai).toBe("TANG");
    expect(ss.dong[0]!.khoan.length).toBeGreaterThan(0);
    expect(ss.dong[0]!.cot.some((c) => c.cot === "BT_DAT")).toBe(true);
    expect(ss.chenh).toBe(ss.dong[0]!.chenh);
    expect(soSanh([x], []).dong[0]!.loai).toBe("BO");
    expect(soSanh([], [x]).dong[0]!.loai).toBe("THEM");
    expect(soSanh([x], [x]).dong[0]).toMatchObject({ loai: "GIU", khoan: [], cot: [] });

    const d = pheDuyet(await chotPhuongAn(cs, da, [a], O), { so: "1/QĐ", ngay: "2026-10-01", coQuan: "" }, "B");
    expect(hoLechSauPheDuyet([d], [{ h: a, k: tinhHo(cs, da, a) }])).toEqual([]);
    const lech = hoLechSauPheDuyet([d], [{ h: b, k: tinhHo(cs, da, b) }]);
    expect(lech.map((l) => l.h.ma)).toEqual([a.ma]);
    const cb = canhBaoDuAn({ ...da, phuongAn: [d] }, [{ h: b, k: tinhHo(cs, da, b) }], "2026-10-02");
    expect(cb.some((c) => c.muc === "CAO" && c.noiDung.includes("sửa sau khi phương án bản 1"))).toBe(true);
  });
});
