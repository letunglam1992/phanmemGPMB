import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, ghiThamDinh, pheDuyet } from "../src/phuong-an";
import { tinhHo } from "../src/tinh-ho";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { DANH_MUC_MAU } from "../src/van-ban/danh-muc";
import { tienDoThuTuc } from "../src/tien-do-thu-tuc";
import { hanThuHoiDot } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { canhBaoDuAn } from "../src/trang-thai";
import { tomTatDuAn } from "../src/tong-hop-tinh/goi-tinh";
import type { DuAn, Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA 1", lyDo: "", nguoi: "A", luc: "2026-09-01T08:00:00.000Z" };
const moc = (h: Ho, buoc: string, ngay: string, xong?: string): Ho => ({ ...h, tienDo: { ...h.tienDo, [buoc]: { trangThai: xong ? "XONG" : "CHUA", ...(xong ? { ngay: xong } : {}), mocHan: ngay } } });

describe("1.0.15 — mẫu 14 tự điền, tiến độ thủ tục, hạn QĐ thu hồi theo đợt, chi tiết quá hạn ở tỉnh", () => {
  it("mẫu 14: căn cứ văn bản thẩm định và số, ngày tờ trình lấy từ bản phương án, tờ trình mẫu 13 đã ghi", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = ghiThamDinh(await chotPhuongAn(cs, duAn, [ho[0]!], O), { so: "45/BC-KT", ngay: "2026-09-30", coQuan: "Phòng Kinh tế", yKien: "THONG_NHAT" }, "B");
    const da: DuAn = { ...duAn, phuongAn: [p], vanBan: { ...(duAn.vanBan ?? {}), tt_phe_duyet_pa_so: "12/TTr-KT", tt_phe_duyet_pa_ngay: "02/10/2026" } };
    const ds = [{ h: ho[0]!, k: tinhHo(cs, da, ho[0]!) }];
    const m = DANH_MUC_MAU.find((x) => x.ma === "14")!;
    const du = ghepDuLieu({ mau: m, duAn: da, ds, chung: thongTinChungMacDinh(da), rieng: {}, so: "", ngayKy: "" });
    expect((du.can_cu as string[]).at(-1)).toBe("Căn cứ Văn bản số 45/BC-KT ngày 30/09/2026 của Phòng Kinh tế về kết quả thẩm định phương án bồi thường, hỗ trợ, tái định cư;");
    expect([du.to_trinh_so, du.to_trinh_ngay]).toEqual(["12/TTr-KT", "02/10/2026"]);
    // cán bộ đã ghi tờ trình khác → giữ của cán bộ
    const du2 = ghepDuLieu({ mau: m, duAn: da, ds, chung: { ...thongTinChungMacDinh(da), to_trinh_so: "99/TTr" }, rieng: {}, so: "", ngayKy: "" });
    expect(du2.to_trinh_so).toBe("99/TTr");
    // mẫu khác không thêm căn cứ thẩm định
    const m13 = DANH_MUC_MAU.find((x) => x.ma === "13")!;
    expect((ghepDuLieu({ mau: m13, duAn: da, ds, chung: thongTinChungMacDinh(da), rieng: {}, so: "", ngayKy: "" }).can_cu as string[]).some((c) => c.includes("45/BC-KT"))).toBe(false);
  });

  it("tiến độ thủ tục: hạn, ngày xong, số ngày làm việc chậm từng khâu", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p0 = await chotPhuongAn(cs, duAn, [ho[0]!], O);
    const p = pheDuyet(ghiThamDinh(p0, { so: "1", ngay: "2026-10-16", coQuan: "PKT", yKien: "THONG_NHAT" }, "B"), { so: "5/QĐ", ngay: "2026-10-26", coQuan: "UBND" }, "L");
    const da: DuAn = { ...duAn, phuongAn: [p], vanBan: { ...(duAn.vanBan ?? {}), tt_phe_duyet_pa_ngay: "19/10/2026" } };
    const hos = [moc(moc(ho[0]!, "8", "2026-09-01"), "11", "", "2026-10-28")];
    const [d] = tienDoThuTuc(da, hos, "2026-11-02", LICH_TRONG);
    expect(d!.thamDinh).toMatchObject({ moc: "2026-09-01", han: "2026-10-01", xong: "2026-10-16", cham: 11 }); // 1.0.21: 30 ngày (k3 Đ3 NĐ 88)
    expect(d!.pheDuyet).toMatchObject({ moc: "2026-10-19", han: "2026-10-26", xong: "2026-10-26", cham: 0 });
    expect(d!.guiQd).toMatchObject({ han: "2026-10-29", xong: "2026-10-28", cham: 0 });
  });

  it("hạn ban hành QĐ thu hồi theo đợt (10 ngày); cảnh báo một dòng cho đợt; tỉnh có chi tiết khâu quá hạn", async () => {
    const { duAn, ho } = taoDuAnMau();
    const da: DuAn = { ...duAn, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1" }] };
    const hos = ho.map((h) => moc({ ...h, dotId: "d1" }, "13", "2026-10-01"));
    const t = hanThuHoiDot("d1", hos, "2026-10-15", LICH_TRONG)!;
    expect(t.hanChot).toBe("2026-10-12"); // 11/10 là thứ Bảy → lùi sang thứ Hai (k5 Đ148 BLDS)
    expect(t.trangThai).toBe("QUA_HAN");
    expect(hanThuHoiDot("d1", hos.map((h) => moc(h, "13", "2026-10-01", "2026-10-05")), "2026-10-15", LICH_TRONG)).toBeNull();
    const cb = canhBaoDuAn(da, hos.map((h) => ({ h, k: tinhHo(cs, da, h) })), "2026-10-15");
    expect(cb.filter((c) => /quá hạn ban hành quyết định thu hồi/.test(c.noiDung))).toHaveLength(1);
    expect(cb.some((c) => /bước 13/.test(c.noiDung) && c.hoId)).toBe(false);
    const [tt] = tomTatDuAn([da], hos, () => 0, "2026-10-15");
    expect(tt!.quaHan).toEqual([expect.objectContaining({ doiTuong: "Đợt 1", khau: "Ban hành QĐ thu hồi đất", han: "2026-10-12" })]);
  });
});
