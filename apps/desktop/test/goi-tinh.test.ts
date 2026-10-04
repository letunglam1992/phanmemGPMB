/** Gói dữ liệu gửi tỉnh (docs/21): mã hóa cho khóa tỉnh, chữ ký đơn vị gửi, nhận gói, tóm tắt, xem chỉ đọc. */
import { beforeAll, describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { taoKhoBoNho, type DinhKem } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { congKhaiCua, docTepKhoa, docThongTinGoi, giaiMaGoi, kiemVanTay, moKhoaTinh, taoGoiTinh, taoKhoaKy, taoKhoaTinh, tepDuPhongKhoa, tepKhoaCongKhai, type KhoaTinh } from "../src/tong-hop-tinh/goi-tinh";
import { khoChiXem, taoKhoXem } from "../src/tong-hop-tinh/xem-xa";

const MK = "mat-khau-tinh-2026";
let tinh: KhoaTinh;
let biMat: CryptoKey;

beforeAll(async () => {
  const fake = await import("fake-indexeddb");
  Object.assign(globalThis, { indexedDB: fake.indexedDB, IDBKeyRange: fake.IDBKeyRange });
  tinh = await taoKhoaTinh(MK, "Sở Nông nghiệp và Môi trường (thử)", "admin");
  biMat = (await moKhoaTinh(tinh, MK))!;
}, 60_000);

async function khoXa() {
  const kho = taoKhoBoNho();
  const a = taoDuAnMau();
  const b = taoDuAnMau();
  b.duAn.ten = "Dự án thứ hai";
  const meta: DinhKem = { id: "tep1", hoId: a.ho[0]!.id, duAnId: a.duAn.id, buoc: "", ten: "bien-ban.pdf", loai: "application/pdf", kichThuoc: 3, luc: "2026-10-01T00:00:00Z", nguoi: "cb" };
  await kho.ghiLo({ duAn: [a.duAn, b.duAn], ho: [...a.ho, ...b.ho], dinhKem: [{ meta, bytes: new Uint8Array([1, 2, 3]) }], banDo: [{ duAnId: a.duAn.id, bytes: new Uint8Array([9]) }, { duAnId: `${a.duAn.id}#to2`, bytes: new Uint8Array([8]) }, { duAnId: b.duAn.id, bytes: new Uint8Array([7]) }] });
  return { kho, a, b };
}
const tuyChon = async (duAnIds: string[], ky?: Awaited<ReturnType<typeof taoKhoaKy>>) => ({
  khoaTinh: congKhaiCua(tinh), khoaKy: ky ?? (await taoKhoaKy()), maGui: "xa-1", donViGui: "UBND xã Thử", duAnIds, kemDinhKem: true, kemBanDo: true, ungDung: "0.9.21", nguoiXuat: "cb",
});

describe("Gói gửi tỉnh", () => {
  it("khóa tỉnh: tệp công khai không có khóa bí mật; dự phòng khôi phục được; sai mật khẩu không mở", async () => {
    const ck = docTepKhoa(tepKhoaCongKhai(tinh));
    expect(ck.duPhong).toBeNull();
    expect(tepKhoaCongKhai(tinh)).not.toContain("biMat");
    expect(await kiemVanTay(ck.congKhai)).toBe(true);
    expect(await kiemVanTay({ ...ck.congKhai, vanTay: "0000000000000000" })).toBe(false);
    expect(docTepKhoa(tepDuPhongKhoa(tinh)).duPhong?.vanTay).toBe(tinh.vanTay);
    expect(await moKhoaTinh(tinh, "sai-mat-khau-123")).toBeNull();
  }, 30_000);

  it("chỉ dự án chọn; phần ngoài không có tên hộ; chỉ khóa tỉnh giải mã được; đủ hồ sơ, tệp, các tờ bản đồ", async () => {
    const { kho, a, b } = await khoXa();
    const g = await taoGoiTinh(kho, await tuyChon([a.duAn.id]));
    const ngoai = new PizZip(g.bytes).file("thong-tin.json")!.asText();
    for (const h of a.ho) expect(ngoai).not.toContain(h.ten);
    expect(g.thongTin).toMatchObject({ soDuAn: 1, soHo: a.ho.length, soDinhKem: 1, soBanDo: 2, tenDuAn: [a.duAn.ten] });
    const { thongTin, du } = await docThongTinGoi(g.bytes);
    const ban = await giaiMaGoi(thongTin, du, biMat, tinh.vanTay);
    expect(ban.duAn.map((d) => d.id)).toEqual([a.duAn.id]);
    expect(ban.ho.map((h) => h.ten).sort()).toEqual(a.ho.map((h) => h.ten).sort());
    expect(ban.ho.some((h) => h.duAnId === b.duAn.id)).toBe(false);
    expect([...ban.banDo.keys()].sort()).toEqual([a.duAn.id, `${a.duAn.id}#to2`].sort());
    // khóa tỉnh khác → không mở được
    const khac = await taoKhoaTinh("mat-khau-khac-2026", "Khác", "x");
    await expect(giaiMaGoi(thongTin, du, (await moKhoaTinh(khac, "mat-khau-khac-2026"))!, khac.vanTay)).rejects.toThrow(/khóa khác/);
    // bỏ tệp đính kèm, bản đồ
    const g2 = await taoGoiTinh(kho, { ...(await tuyChon([a.duAn.id, b.duAn.id])), kemDinhKem: false, kemBanDo: false });
    expect(g2.thongTin).toMatchObject({ soDuAn: 2, soDinhKem: 0, soBanDo: 0 });
  }, 60_000);

  it("gói bị sửa (dữ liệu hoặc thông tin ngoài) bị từ chối", async () => {
    const { kho, a } = await khoXa();
    const g = await taoGoiTinh(kho, await tuyChon([a.duAn.id]));
    const z = new PizZip(g.bytes);
    const du = z.file("du-lieu.bin")!.asUint8Array().slice();
    du[10] = du[10]! ^ 1;
    z.file("du-lieu.bin", du);
    await expect(docThongTinGoi(z.generate({ type: "uint8array" }))).rejects.toThrow(/không khớp mã kiểm tra/);
    const z2 = new PizZip(g.bytes);
    z2.file("thong-tin.json", JSON.stringify({ ...g.thongTin, donViGui: "UBND xã Giả" }));
    await expect(docThongTinGoi(z2.generate({ type: "uint8array" }))).rejects.toThrow(/Chữ ký/);
  }, 30_000);

  it("tỉnh nhận gói: mới → trùng → cập nhật; khóa ký đổi phải xác nhận; tóm tắt không có tên hộ", async () => {
    const { nhapGoi, dsGoi, dsNhanGoi, LoiDoiKhoaKy } = await import("../src/tong-hop-tinh/kho-tinh");
    const { kho, a } = await khoXa();
    const ky = await taoKhoaKy();
    const g1 = await taoGoiTinh(kho, await tuyChon([a.duAn.id], ky));
    const k = { tinh, biMat };
    const r1 = await nhapGoi(g1.bytes, k, "TEP", { homNay: "2026-10-04" });
    expect(r1.loai).toBe("MOI");
    expect((await nhapGoi(g1.bytes, k, "TEP", { homNay: "2026-10-04" })).loai).toBe("TRUNG");
    await new Promise((r) => setTimeout(r, 5));
    const g2 = await taoGoiTinh(kho, await tuyChon([a.duAn.id], ky));
    expect((await nhapGoi(g2.bytes, k, "CONG", { homNay: "2026-10-04" })).loai).toBe("CAP_NHAT");
    expect((await nhapGoi(g1.bytes, k, "TEP", { homNay: "2026-10-04" })).loai).toBe("CU_HON");
    await new Promise((r) => setTimeout(r, 5));
    const g3 = await taoGoiTinh(kho, await tuyChon([a.duAn.id])); // khóa ký mới (cài lại phần mềm / giả danh)
    await expect(nhapGoi(g3.bytes, k, "TEP", { homNay: "2026-10-04" })).rejects.toBeInstanceOf(LoiDoiKhoaKy);
    expect((await nhapGoi(g3.bytes, k, "TEP", { homNay: "2026-10-04", chapNhanDoiKhoa: true })).loai).toBe("CAP_NHAT");
    const ds = await dsGoi();
    expect(ds).toHaveLength(1);
    const tt = ds[0]!.tomTat[0]!;
    expect(tt).toMatchObject({ id: a.duAn.id, ten: a.duAn.ten, xa: a.duAn.xa, soHo: a.ho.length, soTepDinhKem: 1 });
    expect(Object.values(tt.theoTrangThai).reduce((s, n) => s + n, 0)).toBe(a.ho.length);
    expect(JSON.stringify(ds[0]!.tomTat)).not.toContain(a.ho[0]!.ten);
    expect((await dsNhanGoi()).length).toBe(6);
  }, 60_000);

  it("xem chi tiết: kho chỉ xem có đủ dữ liệu, chặn ghi", async () => {
    const { kho, a } = await khoXa();
    const g = await taoGoiTinh(kho, await tuyChon([a.duAn.id]));
    const { thongTin, du } = await docThongTinGoi(g.bytes);
    const xem = await taoKhoXem(await giaiMaGoi(thongTin, du, biMat, tinh.vanTay));
    expect((await xem.dsHo(a.duAn.id)).length).toBe(a.ho.length);
    expect(await xem.docDinhKem("tep1")).toEqual(new Uint8Array([1, 2, 3]));
    await expect(xem.luuHo(a.ho[0]!)).rejects.toThrow(/chỉ xem/);
    await expect(xem.ghiLo({ xoaTatCa: true })).rejects.toThrow(/chỉ xem/);
    await expect(khoChiXem(taoKhoBoNho()).xoaDuAn("x")).rejects.toThrow(/chỉ xem/);
    await xem.ghiNhatKy({ nguoi: "x", hoTen: "x", hanhDong: "Xuất Excel" }); // nhật ký trong bộ nhớ: không chặn
  }, 30_000);
});
