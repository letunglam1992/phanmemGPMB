/**
 * Kiểm thử nối thật máy trạm (TypeScript) ↔ máy chủ Rust qua HTTPS. Chỉ chạy khi có biến môi trường
 * GPMB_MAY_CHU="địa chỉ|vân tay" (máy chủ chạy bằng: cargo run --example may_chu_thu -- <thư mục> <cổng>).
 */
import { describe, expect, it } from "vitest";
import https from "node:https";
import { taoKhoMang, type GuiYeuCau } from "../src/kho-mang";
import { taoTaiKhoan, datMatKhau } from "../src/tai-khoan";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, pheDuyet } from "../src/phuong-an";
import { kiemTraChuoi } from "../src/nhat-ky";
import { docBanSaoLuu, khoiPhuc, taoBanSaoLuu } from "../src/sao-luu";
import { taoKhoBoNho } from "../src/kho";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";

const bien = process.env.GPMB_MAY_CHU;
const [diaChi, vanTay] = (bien ?? "|").split("|") as [string, string];

/** Gửi HTTPS từ Node, kiểm vân tay chứng chỉ như vỏ Rust. */
const guiNode: GuiYeuCau = (pt, dd, o = {}) =>
  new Promise((ok, loi) => {
    const [host, port] = diaChi.split(":");
    const rq = https.request({ host, port: Number(port), path: dd, method: pt, rejectUnauthorized: false, headers: { ...(o.token ? { authorization: `Bearer ${o.token}` } : {}), ...(o.meta ? { "x-meta": o.meta } : {}), "content-type": "application/octet-stream" } }, (r) => {
      const fp = (r.socket as import("node:tls").TLSSocket).getPeerCertificate().fingerprint256;
      if (fp !== vanTay) return loi(new Error(`Vân tay không khớp: ${fp}`));
      const ds: Buffer[] = [];
      r.on("data", (c: Buffer) => ds.push(c));
      r.on("end", () => ok({ ma: r.statusCode ?? 0, meta: String(r.headers["x-meta"] ?? ""), than: new Uint8Array(Buffer.concat(ds)) }));
    });
    rq.on("error", loi);
    if (o.than && pt !== "GET" && pt !== "DELETE") rq.write(Buffer.from(o.than));
    rq.end();
  });

const cs = cs0 as unknown as BoChinhSach;

describe.skipIf(!bien)("Nối thật máy trạm ↔ máy chủ Rust", () => {
  it("khởi tạo, tài khoản, dữ liệu mẫu, bản đồ, mẫu văn bản, phương án, sao lưu khứ hồi, nhật ký", async () => {
    const qt = taoKhoMang({ diaChi, vanTay }, guiNode);
    expect((await qt.trangThai()).coTaiKhoan).toBe(false);
    const u = await taoTaiKhoan([], { ten: "quantri", hoTen: "Quản trị", chucVu: "", vaiTro: "QUAN_TRI", matKhau: "Gpmb2026qt" });
    const nd = await qt.khoiTao(u);
    expect(nd).not.toHaveProperty("bam");
    const ld = await taoTaiKhoan([], { ten: "lanhdao", hoTen: "Lãnh đạo Mẫu", chucVu: "Trưởng phòng", vaiTro: "LANH_DAO", matKhau: "Matkhau2026" });
    await qt.luuNguoiDung(ld);
    const cb = await taoTaiKhoan([], { ten: "canbo1", hoTen: "Cán bộ Mẫu", chucVu: "", vaiTro: "CAN_BO", matKhau: "Matkhau2026" });
    await qt.luuNguoiDung(cb);
    // đổi vai trò từ bản không có băm (máy chủ giữ mật khẩu cũ)
    const ds = await qt.dsNguoiDung();
    await qt.luuNguoiDung({ ...ds.find((x) => x.ten === "canbo1")!, chucVu: "Chuyên viên" });

    const k = taoKhoMang({ diaChi, vanTay }, guiNode);
    await expect(k.dangNhap("canbo1", "sai")).rejects.toThrow(/Sai tên đăng nhập/);
    await k.dangNhap("canbo1", "Matkhau2026");
    const { duAn, ho } = taoDuAnMau();
    await qt.luuDuAn(duAn); // dự án mẫu có bước chung đã hoàn thành — cán bộ không tự tạo được
    // hồ sơ mẫu có bước đã "Hoàn thành": cán bộ không tự tạo được (không có quyền xác nhận bước)
    await expect(k.luuHo(ho[0]!)).rejects.toThrow(/không có quyền xác nhận/);
    const l = taoKhoMang({ diaChi, vanTay }, guiNode);
    await l.dangNhap("lanhdao", "Matkhau2026");
    for (const h of ho) await l.luuHo(h);
    const daLuu = await k.dsHo(duAn.id);
    expect(daLuu.length).toBe(ho.length);
    expect(Object.values(daLuu[0]!.tienDo).some((b) => b.trangThai === "XONG" && b.duyetBoi === "lanhdao")).toBe(true);
    await k.luuBanDo(duAn.id, new Uint8Array([8, 9, 10]));
    expect([...(await k.docBanDo(duAn.id))!]).toEqual([8, 9, 10]);
    await k.xoaBanDo(duAn.id);
    expect(await k.docBanDo(duAn.id)).toBeNull();
    await k.luuBanDo(duAn.id, new Uint8Array([8, 9, 10]));
    // P0-6: ghi lô qua máy chủ — một hồ sơ sai phiên bản thì cả lô không ghi
    const hoLo = [0, 1].map((i) => ({ ...ho[1]!, id: `lo-${i}`, ma: `L0${i}`, tienDo: {} }));
    await k.ghiLo({ ho: hoLo, banDo: [{ duAnId: duAn.id, bytes: new Uint8Array([7, 7]) }] });
    expect((await k.dsHo(duAn.id)).length).toBe(ho.length + 2);
    expect([...(await k.docBanDo(duAn.id))!]).toEqual([7, 7]);
    const k2 = taoKhoMang({ diaChi, vanTay }, guiNode);
    await k2.dangNhap("canbo1", "Matkhau2026");
    await k2.dsHo(duAn.id);
    await k.luuHo({ ...hoLo[0]!, ten: "Sửa bởi k" }); // k2 giữ phiên bản cũ của lo-0
    await expect(k2.ghiLo({ ho: [{ ...hoLo[1]!, ten: "k2 sửa" }, { ...hoLo[0]!, ten: "k2 sửa" }] })).rejects.toThrow(/Hồ sơ L00/);
    expect((await k.dsHo(duAn.id)).find((h) => h.id === "lo-1")!.ten).toBe(hoLo[1]!.ten);
    await k.ghiLo({ xoaHo: ["lo-0", "lo-1"] });
    await k.luuBanDo(duAn.id, new Uint8Array([8, 9, 10]));
    await expect(k.luuMau("05", new Uint8Array([1]), "mẫu.docx")).rejects.toThrow(/THAY_MAU/);

    // lãnh đạo chốt và ghi nhận phê duyệt phương án
    const [da] = await l.dsDuAn();
    const hos = await l.dsHo(da!.id);
    const p = await chotPhuongAn(cs, da!, [hos[0]!], { ten: "Bản 1", lyDo: "", nguoi: "Lãnh đạo" });
    await l.luuDuAn({ ...da!, phuongAn: [p] });
    const d = pheDuyet(p, { so: "12/QĐ-UBND", ngay: "2026-10-01", coQuan: "UBND xã" }, "Lãnh đạo");
    await l.luuDuAn({ ...da!, phuongAn: [d] });
    await l.luuMau("05", new Uint8Array([1, 2]), "Mẫu 05 của xã.docx");
    expect((await k.docMau("05"))?.tenTep).toBe("Mẫu 05 của xã.docx");

    // cán bộ đang giữ bản cũ của dự án → xung đột
    await k.dsDuAn().then(() => undefined);
    const cu = taoKhoMang({ diaChi, vanTay }, guiNode);
    await cu.dangNhap("canbo1", "Matkhau2026");
    await cu.dsDuAn();
    await l.luuDuAn({ ...da!, phuongAn: [d], chuDauTu: "Sửa bởi lãnh đạo" });
    await expect(cu.luuDuAn({ ...da!, phuongAn: [d], ten: "sửa" })).rejects.toMatchObject({ ma: 409 });
    // bản phương án đã phê duyệt: sửa số liệu bị máy chủ chặn
    const [da2] = await k.dsDuAn();
    await expect(k.luuDuAn({ ...da2!, phuongAn: [{ ...d, tong: "1" }] })).rejects.toThrow(/không sửa được/);
    // thay đổi: cán bộ thấy lãnh đạo vừa sửa
    const td = await k.thayDoi(0);
    expect(td.ds.some((x) => x.boi === "lanhdao" && x.loai === "duAn")).toBe(true);

    // đổi mật khẩu qua máy chủ
    const moi = await datMatKhau({ ...(await k.dsNguoiDung())[0]! }, "Matkhau2027");
    await expect(k.doiMatKhau(moi, "sai")).rejects.toThrow(/không đúng/);
    await k.doiMatKhau(moi, "Matkhau2026");
    await k.dangXuat();
    await k.dangNhap("canbo1", "Matkhau2027");

    // sao lưu từ máy chủ rồi khôi phục vào máy đơn: đủ dữ liệu, phương án còn nguyên mã băm
    await qt.dangNhap("quantri", "Gpmb2026qt");
    const ban = await docBanSaoLuu((await taoBanSaoLuu(qt)).bytes);
    expect(ban.thongTin).toMatchObject({ soDuAn: 1, soHo: ho.length, soBanDo: 1, soMau: 1 });
    const may = taoKhoBoNho();
    await khoiPhuc(may, ban, "THAY_THE");
    expect((await may.dsDuAn())[0]!.phuongAn![0]!.trangThai).toBe("DA_PHE_DUYET");

    // nhật ký trên máy chủ: chuỗi băm kiểm tra được bằng mã giao diện
    await l.ghiNhatKy({ nguoi: "", hoTen: "", hanhDong: "Chốt phương án", chiTiet: "bản 1 – thử" });
    const nk = await qt.dsNhatKy();
    expect(await kiemTraChuoi(nk)).toBeNull();
    expect(nk.some((x) => x.nguoi === "lanhdao" && x.hanhDong === "Chốt phương án")).toBe(true);
  }, 60_000);
});
