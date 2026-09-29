import { describe, expect, it } from "vitest";
import { taoKhoBoNho, TOI_DA_DINH_KEM, type DinhKem } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { docBanSaoLuu, khoiPhuc, taoBanSaoLuu } from "../src/sao-luu";
import { loiTepDinhKem } from "../src/thanh-phan/DinhKemHo";

const meta = (id: string, hoId: string, duAnId: string, buoc = ""): DinhKem => ({ id, hoId, duAnId, buoc, ten: `${id}.pdf`, loai: "application/pdf", kichThuoc: 3, luc: "2026-09-29T00:00:00.000Z", nguoi: "cb" });

describe("Tệp đính kèm hồ sơ (P2-2)", () => {
  it("lưu, liệt kê theo dự án, đọc; quá 20 MB bị từ chối (cả lô không ghi); xóa hẳn hộ xóa tệp của hộ", async () => {
    const { duAn, ho } = taoDuAnMau();
    const k = taoKhoBoNho();
    await k.ghiLo({ duAn: [duAn], ho, dinhKem: [{ meta: meta("a", ho[0]!.id, duAn.id, "4"), bytes: new Uint8Array([1, 2, 3]) }, { meta: meta("b", ho[1]!.id, duAn.id), bytes: new Uint8Array([4, 5, 6]) }] });
    expect((await k.dsDinhKem(duAn.id)).map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect([...(await k.docDinhKem("a"))!]).toEqual([1, 2, 3]);
    await expect(k.ghiLo({ dinhKem: [{ meta: meta("c", ho[0]!.id, duAn.id), bytes: new Uint8Array([1]) }, { meta: meta("d", ho[0]!.id, duAn.id), bytes: new Uint8Array(TOI_DA_DINH_KEM + 1) }] })).rejects.toThrow(/20 MB/);
    expect(await k.docDinhKem("c")).toBeNull();
    await k.ghiLo({ xoaHo: [ho[1]!.id] });
    expect((await k.dsDinhKem(duAn.id)).map((x) => x.id)).toEqual(["a"]);
  });
  it("có trong bản sao lưu; khôi phục đủ tệp", async () => {
    const { duAn, ho } = taoDuAnMau();
    const k = taoKhoBoNho();
    await k.ghiLo({ duAn: [duAn], ho, dinhKem: [{ meta: meta("a", ho[0]!.id, duAn.id, "4"), bytes: new Uint8Array([9, 8, 7]) }] });
    const ban = await docBanSaoLuu((await taoBanSaoLuu(k)).bytes);
    expect(ban.thongTin.soDinhKem).toBe(1);
    const k2 = taoKhoBoNho();
    await khoiPhuc(k2, ban, "THAY_THE");
    expect((await k2.dsDinhKem(duAn.id))[0]).toMatchObject({ id: "a", buoc: "4", hoId: ho[0]!.id });
    expect([...(await k2.docDinhKem("a"))!]).toEqual([9, 8, 7]);
  });
  it("chỉ nhận loại tệp văn bản, bản quét, ảnh, bảng tính; ≤ 20 MB", () => {
    expect(loiTepDinhKem("bb.pdf", 10)).toBeNull();
    expect(loiTepDinhKem("QĐ.DOCX", 10)).toBeNull();
    expect(loiTepDinhKem("x.exe", 10)).toMatch(/chỉ nhận/);
    expect(loiTepDinhKem("x.pdf", TOI_DA_DINH_KEM + 1)).toMatch(/20 MB/);
  });
});
