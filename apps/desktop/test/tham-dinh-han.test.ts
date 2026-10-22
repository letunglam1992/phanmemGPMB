import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, demBanPA, ghiThamDinh, moTaDemBanPA, pheDuyet } from "../src/phuong-an";
import { giaTriNhapThem, ketQuaThamDinh } from "../src/van-ban/tao-nhanh";
import { mauTheoMa } from "../src/van-ban/danh-muc";
import { hanThamDinhBan, ghiChuDoiHanThamDinh } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { canhBaoDuAn } from "../src/trang-thai";
import { tinhHo } from "../src/tinh-ho";
import { dongDuAn } from "../src/bao-cao";
import { duAnTheoBoHo } from "../src/dot-thu-hoi";
import type { Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA 1", lyDo: "", nguoi: "A", luc: "2026-09-27T08:00:00.000Z" };
const datMoc = (h: Ho, ngay: string): Ho => ({ ...h, tienDo: { ...h.tienDo, "8": { ...(h.tienDo["8"] ?? { trangThai: "CHUA" as const }), mocHan: ngay } } });

describe("1.0.12 — thẩm định: mẫu tự điền, hạn 30 ngày, đếm trong báo cáo", () => {
  it("mẫu 13, R4 tự điền Kết quả thẩm định từ bản phương án (ưu tiên hơn giá trị lưu tay)", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = ghiThamDinh(await chotPhuongAn(cs, duAn, [ho[0]!], O), { so: "45/BC-KT", ngay: "2026-09-30", coQuan: "Phòng Kinh tế", yKien: "THONG_NHAT_CO_Y_KIEN", noiDung: "Bổ sung giá cây trồng" }, "B");
    const da = { ...duAn, phuongAn: [p], vanBan: { ket_qua_tham_dinh: "cũ" } };
    expect(ketQuaThamDinh(da, [ho[0]!.id])).toBe("Văn bản số 45/BC-KT ngày 30/09/2026 của Phòng Kinh tế về kết quả thẩm định phương án (bản 1): thống nhất, có ý kiến chỉnh sửa, bổ sung; Bổ sung giá cây trồng.");
    expect(ketQuaThamDinh(da, [ho[1]!.id])).toBeNull(); // hộ không có trong bản đã thẩm định
    const ds = [{ h: ho[0]!, k: tinhHo(cs, da, ho[0]!) }];
    expect(giaTriNhapThem(mauTheoMa("13"), da, ds).ket_qua_tham_dinh).toMatch(/^Văn bản số 45\/BC-KT/);
    expect(giaTriNhapThem(mauTheoMa("R4"), da, ds).ket_qua_tham_dinh).toMatch(/^Văn bản số 45\/BC-KT/);
    expect(giaTriNhapThem(mauTheoMa("13"), { ...duAn, vanBan: { ket_qua_tham_dinh: "cũ" } }, ds).ket_qua_tham_dinh).toBe("cũ");
  });

  it("hạn thẩm định theo bản: 30 ngày (k3 Đ3 NĐ 88) từ ngày nhận đủ hồ sơ; cảnh báo một lần cho cả bản; hết khi đã ghi thẩm định", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = await chotPhuongAn(cs, duAn, [ho[0]!], O);
    expect(hanThamDinhBan(p, ho, "2026-10-01", LICH_TRONG)?.trangThai).toBe("CHUA_CO_MOC");
    const hos = [datMoc(ho[0]!, "2026-09-01"), ...ho.slice(1)];
    const t = hanThamDinhBan(p, hos, "2026-10-20", LICH_TRONG)!;
    expect(t.hanChot).toBe("2026-10-01"); // 1.0.21: 30 ngày (k3 Đ3 NĐ 88 "không quá 30 ngày") kể từ sau 01/09/2026
    expect(t.trangThai).toBe("QUA_HAN");
    // 1.1.0 (B3): còn trong hạn nếu đếm 30 ngày làm việc (13/10/2026) → ghi chú giải thích; quá cả hạn cũ thì không ghi chú
    const t2 = hanThamDinhBan(p, hos, "2026-10-05", LICH_TRONG)!;
    expect(ghiChuDoiHanThamDinh(t2, "2026-10-05", LICH_TRONG)).toContain("hạn là 13/10/2026");
    expect(ghiChuDoiHanThamDinh(t, "2026-10-20", LICH_TRONG)).toBeNull();
    const da = { ...duAn, phuongAn: [p] };
    const cb = canhBaoDuAn(da, hos.map((h) => ({ h, k: tinhHo(cs, da, h) })), "2026-10-20");
    expect(cb.filter((c) => /thẩm định/.test(c.noiDung) && /quá hạn/.test(c.noiDung))).toHaveLength(1);
    expect(cb.some((c) => c.noiDung.startsWith(`${hos[0]!.ma} ·`) && /bước 8/.test(c.noiDung))).toBe(false);
    const daTd = ghiThamDinh(p, { so: "1", ngay: "2026-10-10", coQuan: "PKT", yKien: "THONG_NHAT" }, "B");
    expect(hanThamDinhBan(daTd, hos, "2026-10-20", LICH_TRONG)).toBeNull();
  });

  it("đếm bản phương án theo bước cho báo cáo", async () => {
    const { duAn, ho } = taoDuAnMau();
    const a = await chotPhuongAn(cs, duAn, [ho[0]!], O);
    const b = ghiThamDinh({ ...a, id: "b", so: 2 }, { so: "", ngay: "", coQuan: "PKT", yKien: "THONG_NHAT" }, "x");
    const c = ghiThamDinh({ ...a, id: "c", so: 3 }, { so: "", ngay: "", coQuan: "PKT", yKien: "KHONG_THONG_NHAT" }, "x");
    const d = pheDuyet(b, { so: "1/QĐ", ngay: "2026-10-05", coQuan: "" }, "x");
    const dem = demBanPA([a, b, c, { ...d, id: "d", so: 4 }, { ...a, id: "e", so: 5, trangThai: "DA_HUY" }]);
    expect(dem).toEqual({ choThamDinh: 1, daThamDinh: 1, khongThongNhat: 1, daPheDuyet: 1 });
    expect(moTaDemBanPA({ ...dem, quaHanTd: 1 })).toBe("1 bản chờ thẩm định (1 quá hạn); 1 bản đã thẩm định, chờ phê duyệt; 1 bản thẩm định không thống nhất; 1 bản đã phê duyệt");
    const hos = [datMoc(ho[0]!, "2026-09-01")];
    const da = { ...duAn, phuongAn: [a] };
    expect(dongDuAn(da, hos.map((h) => ({ h, k: tinhHo(cs, da, h) })), "2026-10-20").banPA).toMatchObject({ choThamDinh: 1, quaHanTd: 1 });
  });

  it("thẻ nhập hồ sơ dùng bộ chính sách riêng của hộ", () => {
    const { duAn, ho } = taoDuAnMau();
    const da = { ...duAn, boChinhSach: "sonla-2026-03-31" };
    expect(duAnTheoBoHo(da, ho[0]!).boChinhSach).toBe("sonla-2026-03-31");
    expect(duAnTheoBoHo(da, { ...ho[0]!, boChinhSach: "sonla-2026-10-06" }).boChinhSach).toBe("sonla-2026-10-06");
    expect(duAnTheoBoHo(da, ho[0]!)).toBe(da);
  });
});
