import { afterEach, describe, expect, it } from "vitest";
import { CAC_BUOC_CHUYEN_DOI, PHIEN_BAN_CAU_TRUC, chuyenDoiDuAn, chuyenDoiHo } from "../src/chuyen-doi";
import { taoDuAnMau } from "../src/du-lieu-mau";

const soBuocGoc = CAC_BUOC_CHUYEN_DOI.length;
afterEach(() => void CAC_BUOC_CHUYEN_DOI.splice(soBuocGoc));

describe("Khung chuyển đổi mô hình dữ liệu (P2-6)", () => {
  it("các bước tăng dần, không trùng; phiên bản cấu trúc = bước cuối", () => {
    const den = CAC_BUOC_CHUYEN_DOI.map((b) => b.den);
    expect(den).toEqual([...new Set(den)].sort((a, b) => a - b));
    expect(PHIEN_BAN_CAU_TRUC).toBe(Math.max(...den));
  });
  it("mỗi bước hiện có: chạy trên dữ liệu cũ đổi đúng, chạy lần hai không đổi gì (bất biến), đóng dấu phiên bản, ghi nhật ký", () => {
    const { duAn, ho } = taoDuAnMau();
    const cu = { ...ho[0]!, phienBanCauTruc: undefined, thua: ho[0]!.thua.map((t, i) => (i === 0 ? { ...t, dienTichThuHoi: "9222,1" } : t)) };
    const r = chuyenDoiHo(cu)!;
    expect(r.h.thua[0]!.dienTichThuHoi).toBe("9222.1");
    expect(r.h.phienBanCauTruc).toBe(PHIEN_BAN_CAU_TRUC);
    expect(r.h.nhatKy.at(-1)!.noiDung).toContain('"9222,1" → 9222.1');
    expect(r.h.nhatKy.at(-1)!.nguoi).toContain("Chuẩn hóa định dạng số");
    expect(cu.thua[0]!.dienTichThuHoi).toBe("9222,1"); // không sửa bản gốc
    expect(chuyenDoiHo(r.h)).toBeNull();
    expect(chuyenDoiHo(ho[0]!)).toBeNull(); // dữ liệu đã chuẩn: không ghi lại
    const d = chuyenDoiDuAn({ ...duAn, giaGao: { dongKg: "15.000,5", nguon: "x" } } as typeof duAn)!;
    expect(d.d.giaGao!.dongKg).toBe("15000.5");
    expect(chuyenDoiDuAn(d.d)).toBeNull();
  });
  it("bước mới (không 'luôn chạy') chỉ chạy với bản ghi có phiên bản cũ hơn", () => {
    const { ho } = taoDuAnMau();
    CAC_BUOC_CHUYEN_DOI.push({ den: 99, ten: "Thử", ho: (h) => (h.dienThoai ? [] : ((h.dienThoai = "—"), [{ nhan: "Điện thoại", tu: "", thanh: "—" }])) });
    const r = chuyenDoiHo({ ...ho[0]!, dienThoai: "", phienBanCauTruc: 2 })!;
    expect(r.h.dienThoai).toBe("—");
    expect(r.h.phienBanCauTruc).toBe(99);
    expect(chuyenDoiHo({ ...ho[0]!, dienThoai: "", phienBanCauTruc: 99 })).toBeNull();
  });
});
