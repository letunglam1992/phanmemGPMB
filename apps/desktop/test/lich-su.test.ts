import { describe, expect, it } from "vitest";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { khacBiet } from "../src/lich-su";
import { taoKhoBoNho } from "../src/kho";

describe("Lịch sử thay đổi hồ sơ (P1-5)", () => {
  it("so sánh từng trường: từ … thành …; thêm, bỏ thửa; bước tiến độ", () => {
    const { ho } = taoDuAnMau();
    const a = ho[0]!;
    const b = { ...a, ten: "Tên mới", thua: [{ ...a.thua[0]!, dienTichThuHoi: "100.5" }], tienDo: { ...a.tienDo, "5": { trangThai: "XONG" as const } }, nhatKy: [...a.nhatKy, { luc: "x", nguoi: "y", noiDung: "z" }] };
    const k = khacBiet(a, b);
    expect(k).toContainEqual({ truong: "Họ tên / tên tổ chức", tu: "Hộ mẫu 01", thanh: "Tên mới", khoa: "ten" });
    expect(k).toContainEqual({ truong: "Thửa 85 tờ 5 › DT thu hồi", tu: "9.222,1", thanh: "100,5", khoa: `thua:${a.thua[0]!.id}.dienTichThuHoi` });
    expect(k).toContainEqual({ truong: `Thửa ${a.thua[1]!.soThua} tờ ${a.thua[1]!.soTo}`, tu: "có", thanh: "(đã bỏ)", khoa: `thua:${a.thua[1]!.id}` });
    expect(k.find((x) => x.truong.startsWith("Bước 5"))!.khoa).toBe("tienDo.5.trangThai");
    expect(k.find((x) => x.truong.startsWith("Bước 5"))?.thanh).toBe("Hoàn thành");
    expect(k.some((x) => x.truong.includes("nhatKy") || x.truong.includes("Nhật ký"))).toBe(false);
    expect(khacBiet(a, a)).toEqual([]);
  });
  it("kho lưu bản cũ khi sửa, xóa hẳn; khôi phục (có lý do) ghi nhật ký hồ sơ; không lưu khi không đổi; thời hạn giữ", async () => {
    const { duAn, ho } = taoDuAnMau();
    const kho = taoKhoBoNho();
    kho.datNguoi("Quản trị (quantri)");
    await kho.ghiLo({ duAn: [duAn], ho });
    await kho.luuHo({ ...ho[0]!, ten: "Sửa lần 1" });
    await kho.luuHo({ ...ho[0]!, ten: "Sửa lần 1" }); // không đổi
    const ls = await kho.lichSu("ho", ho[0]!.id);
    expect(ls.ds).toHaveLength(1);
    expect((ls.ds[0]!.duLieu as { ten: string }).ten).toBe("Hộ mẫu 01");
    expect(ls.ds[0]!.luuBoi).toBe("Quản trị (quantri)");
    await expect(kho.khoiPhucBanLichSu(ls.ds[0]!.stt, " ", "qt")).rejects.toThrow(/lý do/);
    const h = (await kho.khoiPhucBanLichSu(ls.ds[0]!.stt, "sửa nhầm tên", "qt")).ho[0]!;
    expect(h.ten).toBe("Hộ mẫu 01");
    expect(h.nhatKy.at(-1)!.noiDung).toContain("sửa nhầm tên");
    expect((await kho.lichSu("ho", ho[0]!.id)).ds[0]!.lyDo).toMatch(/^Trước khi khôi phục/);
    // xóa hẳn → còn trong lịch sử, khôi phục được
    await kho.ghiLo({ xoaHo: [ho[1]!.id] });
    const dx = await kho.hoDaXoaHan(duAn.id);
    expect(dx.map((x) => x.id)).toEqual([ho[1]!.id]);
    await kho.khoiPhucBanLichSu(dx[0]!.stt, "xóa nhầm", "qt");
    expect(await kho.hoDaXoaHan(duAn.id)).toEqual([]);
    expect((await kho.dsHo(duAn.id)).length).toBe(2);
    // thời hạn giữ: bản cũ hơn hạn bị xóa khi đặt
    await kho.luuCaiDat("giuLichSu", { soNam: 1 });
    expect((await kho.lichSu("ho", ho[0]!.id)).soNamGiu).toBe(1);
    expect((await kho.lichSu("ho", ho[0]!.id)).ds.length).toBeGreaterThan(0); // bản vừa lưu còn trong hạn
  });
  it("0.9.27: khôi phục thông tin dự án về bản cũ — giữ phương án, dấu thùng rác hiện tại", async () => {
    const { duAn, ho } = taoDuAnMau();
    const kho = taoKhoBoNho();
    kho.datNguoi("qt");
    await kho.ghiLo({ duAn: [duAn], ho });
    const pa = [{ id: "pa1", so: 1, trangThai: "DA_PHE_DUYET" }] as unknown as NonNullable<typeof duAn.phuongAn>;
    await kho.luuDuAn({ ...duAn, ten: "Tên sửa nhầm", phuongAn: pa });
    const ls = await kho.lichSu("duAn", duAn.id);
    expect(ls.ds).toHaveLength(1);
    await expect(kho.khoiPhucBanLichSu(ls.ds[0]!.stt, "", "qt")).rejects.toThrow(/lý do/);
    const kq = await kho.khoiPhucBanLichSu(ls.ds[0]!.stt, "sửa nhầm tên dự án", "qt");
    expect(kq.ho).toEqual([]);
    expect(kq.duAn[0]!.ten).toBe(duAn.ten);
    expect(kq.duAn[0]!.phuongAn).toEqual(pa);
    const d = (await kho.dsDuAn()).find((x) => x.id === duAn.id)!;
    expect(d.ten).toBe(duAn.ten);
    expect(d.phuongAn).toEqual(pa);
    expect((await kho.lichSu("duAn", duAn.id)).ds[0]!.lyDo).toMatch(/^Trước khi khôi phục/);
  });
});

describe("1.0.7 — lịch sử ô thẻ Hỗ trợ, Tái định cư", () => {
  it("khóa ô hỗ trợ ổn định đời sống, TĐC khớp với khác biệt", async () => {
    const { khacBiet, thuocO } = await import("../src/lich-su");
    const { taoDuAnMau } = await import("../src/du-lieu-mau");
    const h = taoDuAnMau().ho[0]!;
    const a = { ...h, hoTro: { ...h.hoTro, onDinh: { dienTichNNDangSuDung: "1000", diChuyen: "KHONG" as never }, taiDinhCu: { hinhThuc: "DAT_O" as const, khoanKhac: [], donGia: "2000000" } } };
    const b = { ...a, hoTro: { ...a.hoTro, onDinh: { ...a.hoTro.onDinh!, dienTichNNDangSuDung: "1200" }, taiDinhCu: { ...a.hoTro.taiDinhCu!, donGia: "2500000" } } };
    const k = khacBiet(a, b);
    expect(k.filter((x) => thuocO(x, "hoTro.taiDinhCu.donGia")).map((x) => [x.tu, x.thanh])).toEqual([["2.000.000", "2.500.000"]]);
    expect(k.filter((x) => thuocO(x, "hoTro.onDinh.dienTichNNDangSuDung"))).toHaveLength(1);
    expect(k.filter((x) => thuocO(x, "hoTro.taiDinhCu.khuTdc"))).toHaveLength(0);
  });
});
