import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { canhBaoTruocPheDuyet, chotPhuongAn, ghiThamDinh, huyBan, kiemTraToanVen, moTaBan, pheDuyet, tenTrangThai } from "../src/phuong-an";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA đợt 1", lyDo: "", nguoi: "Cán bộ A", luc: "2026-09-27T08:00:00.000Z" };

describe("1.0.11 — Thẩm định phương án tách khỏi phê duyệt", () => {
  it("ghi nhận thẩm định giữ trạng thái Đã chốt, khóa ý kiến và ô đã ghi, chỉ bổ sung ô trống; mã băm không đổi", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = await chotPhuongAn(cs, duAn, [ho[0]!], O);
    expect(canhBaoTruocPheDuyet(p)).toMatch(/chưa ghi nhận kết quả thẩm định.*Nghị định 88\/2024/);
    expect(() => ghiThamDinh(p, { so: "", ngay: "", coQuan: " ", yKien: "THONG_NHAT" }, "B")).toThrow(/cơ quan thẩm định/);
    const t = ghiThamDinh(p, { so: "", ngay: "2026-09-30", coQuan: "Phòng Kinh tế", yKien: "THONG_NHAT" }, "B");
    expect(t.trangThai).toBe("DA_CHOT");
    expect(tenTrangThai(t)).toBe("Đã thẩm định, chờ phê duyệt");
    expect(canhBaoTruocPheDuyet(t)).toBeNull();
    expect(await kiemTraToanVen(t)).toBe(true);
    expect(() => ghiThamDinh(t, { so: "", ngay: "", coQuan: "", yKien: "KHONG_THONG_NHAT" }, "B")).toThrow(/không sửa được/);
    const b = ghiThamDinh(t, { so: "45/BC-KT", ngay: "2026-01-01", coQuan: "Khác", yKien: "THONG_NHAT" }, "C");
    expect(b.thamDinh).toMatchObject({ so: "45/BC-KT", ngay: "2026-09-30", coQuan: "Phòng Kinh tế", nguoi: "B" });
    expect(moTaBan(b)).toMatch(/ĐÃ THẨM ĐỊNH \(văn bản 45\/BC-KT ngày 30\/09\/2026 của Phòng Kinh tế\), CHỜ PHÊ DUYỆT/);
    const d = pheDuyet(b, { so: "12/QĐ-UBND", ngay: "2026-10-05", coQuan: "UBND xã" }, "L");
    expect(d.thamDinh).toEqual(b.thamDinh);
    expect(() => ghiThamDinh(d, { so: "", ngay: "", coQuan: "x", yKien: "THONG_NHAT" }, "B")).toThrow(/Đã chốt/);
  });

  it("thẩm định không thống nhất: cảnh báo khi phê duyệt; hủy bản vẫn được", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = ghiThamDinh(await chotPhuongAn(cs, duAn, [ho[0]!], O), { so: "1/BC", ngay: "2026-09-30", coQuan: "Phòng KT", yKien: "KHONG_THONG_NHAT", noiDung: "Bổ sung đo đạc thửa 12" }, "B");
    expect(tenTrangThai(p)).toBe("Thẩm định không thống nhất");
    expect(canhBaoTruocPheDuyet(p)).toMatch(/hủy bản này/);
    expect(moTaBan(p)).toMatch(/THẨM ĐỊNH KHÔNG THỐNG NHẤT/);
    expect(huyBan(p, "Theo ý kiến thẩm định", "B").trangThai).toBe("DA_HUY");
  });
});
