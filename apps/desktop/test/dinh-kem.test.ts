import { describe, expect, it } from "vitest";
import { taoKhoBoNho, TOI_DA_DINH_KEM, type DinhKem } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { docBanSaoLuu, khoiPhuc, taoBanSaoLuu } from "../src/sao-luu";
import { loiTepDinhKem } from "../src/thanh-phan/DinhKemHo";
import { conDung, khoiPhucTep, xoaHanTep, xoaMemTep } from "../src/dinh-kem-thung-rac";

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
  it("thùng rác: xóa mềm giữ nội dung, khôi phục được; xóa hẳn bỏ nội dung; bản sao lưu gửi tỉnh bỏ tệp đã xóa", async () => {
    const { duAn, ho } = taoDuAnMau();
    const k = taoKhoBoNho();
    await k.ghiLo({ duAn: [duAn], ho, dinhKem: [{ meta: meta("a", ho[0]!.id, duAn.id), bytes: new Uint8Array([1, 2]) }, { meta: meta("b", ho[0]!.id, duAn.id), bytes: new Uint8Array([3]) }] });
    const a = (await k.dsDinhKem(duAn.id)).find((x) => x.id === "a")!;
    await xoaMemTep(k, a, "cb");
    const ds = await k.dsDinhKem(duAn.id);
    expect(ds.filter(conDung).map((x) => x.id)).toEqual(["b"]);
    expect(ds.find((x) => x.id === "a")!.daXoa?.nguoi).toBe("cb");
    expect([...(await k.docDinhKem("a"))!]).toEqual([1, 2]);
    const ban = await docBanSaoLuu((await taoBanSaoLuu(k, "0.1", { boTepDaXoa: true })).bytes);
    expect(ban.thongTin.soDinhKem).toBe(1);
    await khoiPhucTep(k, ds.find((x) => x.id === "a")!);
    expect((await k.dsDinhKem(duAn.id)).filter(conDung).length).toBe(2);
    await xoaHanTep(k, a);
    expect(await k.docDinhKem("a")).toBeNull();
  });

  it("1.0.7 — phiên bản tệp: bản mới thay bản cũ (giữ nội dung), xem bản trước, dùng lại bản cũ; thùng rác, gói tỉnh bỏ bản trước", async () => {
    const { banTruoc, khoiPhucBan, thayTep } = await import("../src/dinh-kem-phien-ban");
    const { trongThungRac } = await import("../src/dinh-kem-thung-rac");
    const { duAn, ho } = taoDuAnMau();
    const k = taoKhoBoNho();
    await k.ghiLo({ duAn: [duAn], ho, dinhKem: [{ meta: { ...meta("a", ho[0]!.id, duAn.id, "4"), ghiChu: "Bản chưa ký", soHieu: "BB 01" }, bytes: new Uint8Array([1]) }] });
    const v1 = (await k.dsDinhKem(duAn.id))[0]!;
    const v2 = await thayTep(k, v1, { ten: "bb-da-ky.pdf", loai: "application/pdf", bytes: new Uint8Array([2, 2]) }, "cb2", "Bản đã ký");
    let ds = await k.dsDinhKem(duAn.id);
    expect(ds.filter(conDung).map((x) => x.id)).toEqual([v2.id]);
    expect(ds.filter(trongThungRac)).toEqual([]);
    expect(v2).toMatchObject({ buoc: "4", soHieu: "BB 01", ghiChu: "Bản đã ký", nhomPb: "a", kichThuoc: 2, nguoi: "cb2" });
    expect(banTruoc(ds, v2).map((x) => x.id)).toEqual(["a"]);
    expect([...(await k.docDinhKem("a"))!]).toEqual([1]);
    // bản thứ ba, rồi dùng lại bản đầu
    const v3 = await thayTep(k, v2, { ten: "bb-v3.pdf", loai: "application/pdf", bytes: new Uint8Array([3]) }, "cb", "");
    ds = await k.dsDinhKem(duAn.id);
    expect(v3.ghiChu).toBe("Bản đã ký");
    expect(banTruoc(ds, v3).map((x) => x.id).sort()).toEqual(["a", v2.id].sort());
    await khoiPhucBan(k, ds, ds.find((x) => x.id === "a")!, "cb");
    ds = await k.dsDinhKem(duAn.id);
    expect(ds.filter(conDung).map((x) => x.id)).toEqual(["a"]);
    expect(banTruoc(ds, ds.find((x) => x.id === "a")!).map((x) => x.id).sort()).toEqual([v2.id, v3.id].sort());
    // sao lưu giữ đủ 3 bản; gói gửi tỉnh (bỏ tệp đã xóa) chỉ kèm bản đang dùng
    expect((await docBanSaoLuu((await taoBanSaoLuu(k)).bytes)).thongTin.soDinhKem).toBe(3);
    expect((await docBanSaoLuu((await taoBanSaoLuu(k, "t", { boTepDaXoa: true })).bytes)).thongTin.soDinhKem).toBe(1);
  });
});
