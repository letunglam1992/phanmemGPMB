/** Tài liệu cấp dự án (hoId rỗng): lưu, sao lưu khứ hồi, xóa hộ không xóa tài liệu dự án; đường dẫn trong tệp nén; ảnh điện thoại. */
import { describe, expect, it } from "vitest";
import { taoKhoBoNho, type DinhKem } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { docBanSaoLuu, khoiPhuc, taoBanSaoLuu } from "../src/sao-luu";
import { laAnhXemDuoc, loiTepDinhKem } from "../src/thanh-phan/DinhKemHo";
import { duongDanNen, tenNhom } from "../src/thanh-phan/TaiLieuDuAn";

const meta = (id: string, hoId: string, duAnId: string, ten = `${id}.pdf`, nhom?: string): DinhKem => ({ id, hoId, duAnId, buoc: "", ten, loai: "application/pdf", kichThuoc: 3, luc: "2026-10-03T00:00:00.000Z", nguoi: "cb", ...(nhom ? { nhom, soHieu: "12/QĐ-UBND" } : {}) });

describe("Tài liệu, văn bản của dự án", () => {
  it("tài liệu dự án lưu cùng tệp hộ; xóa hẳn hộ không xóa tài liệu dự án; có trong bản sao lưu", async () => {
    const { duAn, ho } = taoDuAnMau();
    const k = taoKhoBoNho();
    await k.ghiLo({ duAn: [duAn], ho, dinhKem: [{ meta: meta("da", "", duAn.id, "QĐ phê duyệt.pdf", "DU_AN"), bytes: new Uint8Array([1]) }, { meta: meta("h", ho[1]!.id, duAn.id), bytes: new Uint8Array([2]) }] });
    await k.ghiLo({ xoaHo: [ho[1]!.id] });
    expect((await k.dsDinhKem(duAn.id)).map((x) => x.id)).toEqual(["da"]);
    const ban = await docBanSaoLuu((await taoBanSaoLuu(k)).bytes);
    const k2 = taoKhoBoNho();
    await khoiPhuc(k2, ban, "THAY_THE");
    expect((await k2.dsDinhKem(duAn.id))[0]).toMatchObject({ id: "da", hoId: "", nhom: "DU_AN", soHieu: "12/QĐ-UBND" });
  });
  it("ảnh điện thoại (HEIC, WEBP) nhận được; xem trước JPG/PNG/WEBP", () => {
    expect(loiTepDinhKem("IMG_0001.HEIC", 10)).toBeNull();
    expect(loiTepDinhKem("anh.webp", 10)).toBeNull();
    expect(laAnhXemDuoc("IMG_1.JPG")).toBe(true);
    expect(laAnhXemDuoc("IMG_1.heic")).toBe(false);
  });
  it("đường dẫn trong tệp nén theo nhóm / theo hộ, bỏ dấu, không trùng", () => {
    const p = duongDanNen([
      { meta: meta("1", "", "d", "Quyết định số 12.pdf", "DU_AN") },
      { meta: meta("2", "", "d", "Quyết định số 12.pdf", "DU_AN") },
      { meta: meta("3", "h1", "d", "Biên bản kiểm đếm.JPG") , ho: { ma: "H01", ten: "Lò Văn A" } },
    ]);
    expect(p[0]).toBe(`Du-an/${"Chu-truong-quyet-dinh-phe-duyet-du-an-giao-dat-cho-thue-dat"}/Quyet-dinh-so-12.pdf`);
    expect(p[1]).toBe(`Du-an/Chu-truong-quyet-dinh-phe-duyet-du-an-giao-dat-cho-thue-dat/Quyet-dinh-so-12 (2).pdf`);
    expect(p[2]).toBe("Ho/H01_Lo-Van-A/Bien-ban-kiem-dem.jpg");
    expect(tenNhom(undefined)).toBe("Văn bản khác");
  });
});
