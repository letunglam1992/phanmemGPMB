import { describe, expect, it } from "vitest";
import { taoKhoBoNho } from "../src/kho";
import { docToanBo, khoTuDuLieu, moMayDon, type DuLieuMayDon } from "../src/may-don";
import type { GuiYeuCau } from "../src/kho-mang";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { taoTaiKhoan } from "../src/tai-khoan";

async function khoCu() {
  const { duAn, ho } = taoDuAnMau();
  const k = taoKhoBoNho();
  await k.ghiLo({ duAn: [{ ...duAn, phuongAn: [{ id: "p1", so: 1, trangThai: "DA_CHOT" } as never] }], ho, banDo: [{ duAnId: duAn.id, bytes: new Uint8Array([1, 2, 3]) }] });
  await k.luuMau("05", new Uint8Array([9]), "Mẫu 05.docx");
  await k.luuNguoiDung(await taoTaiKhoan([], { ten: "quantri", hoTen: "Q", chucVu: "", vaiTro: "QUAN_TRI", matKhau: "Matkhau2026" }));
  await k.ghiNhatKy({ nguoi: "quantri", hoTen: "Q", hanhDong: "Đăng nhập" });
  await k.luuCaiDat("donVi", [{ ten: "UBND xã" }]);
  return k;
}

describe("Máy đơn SQLite: chuyển dữ liệu IndexedDB cũ (Giai đoạn 3)", () => {
  it("CSDL SQLite trống + có dữ liệu cũ → gửi toàn bộ một lần (phương án nhúng, tệp base64, tài khoản, nhật ký, cài đặt)", async () => {
    let gui0: DuLieuMayDon | null = null;
    const gui: GuiYeuCau = async (pt, dd, o = {}) => {
      if (dd === "/api/trang-thai") return { ma: 200, meta: "", than: new TextEncoder().encode(JSON.stringify({ coTaiKhoan: false })) };
      if (dd === "/api/noi-bo/chuyen-du-lieu") {
        gui0 = JSON.parse(new TextDecoder().decode(o.than)) as DuLieuMayDon;
        return { ma: 200, meta: "", than: new TextEncoder().encode(JSON.stringify({ tomTat: "1 dự án, 2 hồ sơ" })) };
      }
      return { ma: 404, meta: "", than: new Uint8Array() };
    };
    const cu = await khoCu();
    const r = await moMayDon(gui, async () => cu);
    expect(r.daChuyen).toBe("1 dự án, 2 hồ sơ");
    expect(r.kho.noiBo).toBe(true);
    const d = gui0!;
    expect(d.duAn[0]!.phuongAn![0]!.id).toBe("p1");
    expect(d.ho).toHaveLength(2);
    expect(d.tep.map((t) => t.loai).sort()).toEqual(["banDo", "mau"]);
    expect(d.tep.find((t) => t.loai === "banDo")!.noiDung).toBe("AQID");
    expect(d.nguoiDung[0]!.ten).toBe("quantri");
    expect(d.nhatKy[0]!.hanhDong).toBe("Đăng nhập");
    expect(d.caiDat).toContainEqual({ khoa: "donVi", giaTri: [{ ten: "UBND xã" }] });
  });
  it("đã có tài khoản trên SQLite → không chuyển; lỗi chuyển → báo rõ, dữ liệu cũ nguyên vẹn; khứ hồi xuất ↔ kho", async () => {
    const nhat: string[] = [];
    const gui = (coTaiKhoan: boolean, maChuyen = 200): GuiYeuCau => async (_pt, dd) => {
      nhat.push(dd);
      if (dd === "/api/trang-thai") return { ma: 200, meta: "", than: new TextEncoder().encode(JSON.stringify({ coTaiKhoan })) };
      return { ma: maChuyen, meta: "", than: new TextEncoder().encode(JSON.stringify({ loi: "CSDL hỏng" })) };
    };
    expect((await moMayDon(gui(true), async () => await khoCu())).daChuyen).toBeNull();
    expect(nhat).toEqual(["/api/trang-thai"]);
    await expect(moMayDon(gui(false, 409), async () => await khoCu())).rejects.toThrow(/CSDL hỏng.*nguyên vẹn/);
    expect((await moMayDon(gui(false), async () => taoKhoBoNho())).daChuyen).toBeNull(); // kho cũ trống
    const du = await docToanBo(await khoCu());
    const k = await khoTuDuLieu(du);
    expect((await docToanBo(k)).ho).toEqual(du.ho);
    expect([...(await k.docBanDo(du.duAn[0]!.id))!]).toEqual([1, 2, 3]);
  });
});
