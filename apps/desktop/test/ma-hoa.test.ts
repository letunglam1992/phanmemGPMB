/** P0-5: sao lưu mã hóa — mật khẩu sao lưu, mật khẩu khôi phục, DPAPI (giả lập), tệp cũ không mã hóa. */
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { taoKhoBoNho } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { LoiCanMatKhau, LoiSaoLuu, docBanSaoLuu, maHoaBanSaoLuu, taoBanSaoLuu, thongTinMaHoa } from "../src/sao-luu";
import { loiMatKhau, taoKhoaKhoiPhuc, thuMatKhauKhoiPhuc } from "../src/ma-hoa";

async function banMau() {
  const kho = taoKhoBoNho();
  const { duAn, ho } = taoDuAnMau();
  ho[0]!.soDinhDanh = "034123456789";
  await kho.ghiLo({ duAn: [duAn], ho });
  return taoBanSaoLuu(kho);
}
const coChuoi = (b: Uint8Array, s: string) => new TextDecoder("latin1").decode(b).includes(s);

describe("Sao lưu mã hóa", { timeout: 60_000 }, () => {
  it("mật khẩu sao lưu: mở đúng; sai mật khẩu → báo; không thấy số định danh ở dạng rõ", async () => {
    const ban = await banMau();
    expect(coChuoi(ban.bytes, "034123456789") || coChuoi(new PizZip(ban.bytes).file("du-lieu.json")!.asUint8Array(), "034123456789")).toBe(true);
    const tep = await maHoaBanSaoLuu(ban, { matKhau: "Gpmb-sao-luu-2026" });
    const zip = new PizZip(tep);
    expect(Object.keys(zip.files).sort()).toEqual(["du-lieu.bin", "thong-tin.json"]);
    expect(coChuoi(zip.file("du-lieu.bin")!.asUint8Array(), "034123456789")).toBe(false);
    expect(zip.file("thong-tin.json")!.asText()).not.toContain("034123456789");
    expect(thongTinMaHoa(tep)?.maHoa.boc.map((b) => b.loai)).toEqual(["MAT_KHAU"]);
    await expect(docBanSaoLuu(tep)).rejects.toBeInstanceOf(LoiCanMatKhau);
    await expect(docBanSaoLuu(tep, { matKhau: "sai-mat-khau-123" })).rejects.toThrow(/không đúng/);
    const doc = await docBanSaoLuu(tep, { matKhau: "Gpmb-sao-luu-2026" });
    expect(doc.ho[0]!.soDinhDanh).toBe("034123456789");
  });

  it("mật khẩu khôi phục mở được cả tệp sao lưu thủ công và tệp tự động; khóa công khai không mở được", async () => {
    const ban = await banMau();
    const k = await taoKhoaKhoiPhuc("Khoi-phuc-2026-don-vi", "quantri");
    expect(await thuMatKhauKhoiPhuc(k, "Khoi-phuc-2026-don-vi")).not.toBeNull();
    expect(await thuMatKhauKhoiPhuc(k, "khac")).toBeNull();
    const thuCong = await maHoaBanSaoLuu(ban, { matKhau: "Gpmb-sao-luu-2026", khoiPhuc: k });
    expect((await docBanSaoLuu(thuCong, { matKhau: "Khoi-phuc-2026-don-vi" })).ho.length).toBe(ban.thongTin.soHo);
    const tuDong = await maHoaBanSaoLuu(ban, { khoiPhuc: k });
    expect((await docBanSaoLuu(tuDong, { matKhau: "Khoi-phuc-2026-don-vi" })).duAn.length).toBe(1);
    await expect(docBanSaoLuu(tuDong, { matKhau: "Gpmb-sao-luu-2026" })).rejects.toBeInstanceOf(LoiCanMatKhau);
  });

  it("DPAPI (giả lập): mở không cần mật khẩu trên cùng máy; máy khác không có DPAPI thì cần mật khẩu", async () => {
    const ban = await banMau();
    const bocGia = async (b: Uint8Array) => b.map((x) => x ^ 0x5a);
    const tep = await maHoaBanSaoLuu(ban, { dpapi: bocGia, khoiPhuc: await taoKhoaKhoiPhuc("Khoi-phuc-2026-don-vi", "qt") });
    expect((await docBanSaoLuu(tep, { dpapiMo: bocGia })).ho.length).toBe(ban.thongTin.soHo);
    await expect(docBanSaoLuu(tep)).rejects.toBeInstanceOf(LoiCanMatKhau);
  });

  it("tệp bị sửa một byte → từ chối vì không qua kiểm tra toàn vẹn", async () => {
    const tep = await maHoaBanSaoLuu(await banMau(), { matKhau: "Gpmb-sao-luu-2026" });
    const zip = new PizZip(tep);
    const du = zip.file("du-lieu.bin")!.asUint8Array().slice();
    du[100] ^= 1;
    zip.file("du-lieu.bin", du);
    const hong = zip.generate({ type: "uint8array" });
    const loi = await docBanSaoLuu(hong, { matKhau: "Gpmb-sao-luu-2026" }).catch((e) => e);
    expect(loi).toBeInstanceOf(LoiSaoLuu);
    expect(loi).not.toBeInstanceOf(LoiCanMatKhau);
    expect(loi.message).toMatch(/hỏng|bị sửa/);
  });

  it("không có cách mã hóa → lỗi (không tạo tệp rõ); tệp cũ phiên bản 1 vẫn đọc được", async () => {
    const ban = await banMau();
    await expect(maHoaBanSaoLuu(ban, {})).rejects.toThrow(/Chưa có cách mã hóa/);
    expect(thongTinMaHoa(ban.bytes)).toBeNull();
    expect((await docBanSaoLuu(ban.bytes)).ho.length).toBe(ban.thongTin.soHo);
  });

  it("độ mạnh mật khẩu", () => {
    expect(loiMatKhau("abc123")).toMatch(/12 ký tự/);
    expect(loiMatKhau("abcdefghijkl")).toMatch(/chữ và số/);
    expect(loiMatKhau("Gpmb-sao-luu-2026")).toBeNull();
    expect(loiMatKhau("mot cum tu dai de nho")).toBeNull();
  });
});
