import { describe, expect, it } from "vitest";
import { LoiMayChu, chuanDiaChi, docCheDo, laKhoMang, taoKhoMang, type GuiYeuCau } from "../src/kho-mang";
import { taoKhoBoNho } from "../src/kho";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const dec = (b?: Uint8Array) => (b && b.length ? JSON.parse(new TextDecoder().decode(b)) : undefined);

/** Máy chủ giả tối giản: ghi lại yêu cầu, trả lời theo kịch bản. */
function giaLap(tra: (pt: string, dd: string, than: unknown, token?: string) => { ma: number; v?: unknown; bytes?: Uint8Array; meta?: string }) {
  const nhat: { pt: string; dd: string; than: unknown; token?: string }[] = [];
  const gui: GuiYeuCau = async (pt, dd, o = {}) => {
    const than = o.meta !== undefined || (o.than && pt === "PUT" && dd.startsWith("/api/tep")) ? o.than : dec(o.than);
    nhat.push({ pt, dd, than, token: o.token });
    const r = tra(pt, dd, than, o.token);
    return { ma: r.ma, meta: r.meta ?? "", than: r.bytes ?? (r.v === undefined ? new Uint8Array() : enc(r.v)) };
  };
  return { gui, nhat };
}

describe("Kho qua máy chủ mạng nội bộ (phía máy trạm)", () => {
  it("đăng nhập giữ phiên; gửi phiên bản trước khi lưu; xung đột trả lỗi rõ ràng", async () => {
    let pb = 1;
    const { gui, nhat } = giaLap((pt, dd, than) => {
      if (dd === "/api/dang-nhap") return { ma: 200, v: { token: "T1", nguoiDung: { ten: "canbo1" } } };
      if (pt === "GET" && dd === "/api/du-an") return { ma: 200, v: [{ duLieu: { id: "da1", ten: "A" }, phienBan: pb }] };
      if (pt === "GET" && dd === "/api/pa") return { ma: 200, v: [] };
      if (pt === "PUT" && dd === "/api/du-an/da1") {
        const t = than as { phienBanTruoc: number | null; duLieu: object };
        if (t.phienBanTruoc !== pb) return { ma: 409, v: { loi: 'Dữ liệu đã được "lanhdao" sửa' } };
        return { ma: 200, v: { duLieu: t.duLieu, phienBan: ++pb } };
      }
      return { ma: 404, v: { loi: "không có" } };
    });
    const k = taoKhoMang({ diaChi: "127.0.0.1:47800", vanTay: "AB" }, gui);
    expect(laKhoMang(k)).toBe(true);
    expect(laKhoMang(taoKhoBoNho())).toBe(false);
    expect(k.coPhien()).toBe(false);
    await k.dangNhap("canbo1", "x");
    expect(k.coPhien()).toBe(true);
    const [d] = await k.dsDuAn();
    await k.luuDuAn({ ...d!, ten: "B" });
    expect(nhat.at(-1)).toMatchObject({ pt: "PUT", token: "T1", than: { phienBanTruoc: 1 } });
    await k.luuDuAn({ ...d!, ten: "C" }); // phiên bản đã cập nhật sau lần lưu trước
    expect((nhat.at(-1)!.than as { phienBanTruoc: number }).phienBanTruoc).toBe(2);
    pb = 9; // người khác vừa lưu
    await expect(k.luuDuAn({ ...d!, ten: "D" })).rejects.toMatchObject({ ma: 409, message: 'Dữ liệu đã được "lanhdao" sửa' });
  });

  it("P1-6: phương án là bản ghi riêng — chốt bản mới chỉ gửi bản đó; sửa dự án chỉ gửi lõi dự án; P1-2 trả bản ghi đã lưu", async () => {
    const pa1 = { id: "p1", so: 1, trangThai: "DA_CHOT", ho: [] };
    const { gui, nhat } = giaLap((pt, dd, than) => {
      if (dd === "/api/dang-nhap") return { ma: 200, v: { token: "T", nguoiDung: {} } };
      if (pt === "GET" && dd === "/api/du-an") return { ma: 200, v: [{ duLieu: { id: "da1", ten: "A" }, phienBan: 3 }] };
      if (pt === "GET" && dd === "/api/pa") return { ma: 200, v: [{ duLieu: { id: "p1", duAnId: "da1", pa: pa1 }, phienBan: 1 }] };
      if (pt === "POST" && dd === "/api/lo") {
        const g = (than as { ghi: { loai: string; duLieu: { id: string } }[] }).ghi;
        return { ma: 200, v: { phienBan: g.map((x) => ({ loai: x.loai, id: x.duLieu.id, phienBan: 2, duLieu: x.loai === "pa" ? { ...x.duLieu, pa: { ...(x.duLieu as unknown as { pa: object }).pa, daKy: true } } : x.duLieu })) } };
      }
      if (pt === "PUT" && dd === "/api/du-an/da1") return { ma: 200, v: { duLieu: { ...(than as { duLieu: object }).duLieu, guiBoi: "may-chu" }, phienBan: 4 } };
      return { ma: 404, v: { loi: "không có" } };
    });
    const k = taoKhoMang({ diaChi: "a:1", vanTay: "v" }, gui);
    await k.dangNhap("a", "b");
    const [d] = await k.dsDuAn();
    expect(d!.phuongAn).toEqual([pa1]);
    const pa2 = { ...pa1, id: "p2", so: 2 } as unknown as NonNullable<typeof d>["phuongAn"] extends (infer T)[] | undefined ? T : never;
    const moi = await k.luuDuAn({ ...d!, phuongAn: [...d!.phuongAn!, pa2] });
    const lo = nhat.at(-1)!;
    expect(lo.dd).toBe("/api/lo");
    expect((lo.than as { ghi: { loai: string; duLieu: { id: string }; phienBanTruoc: number | null }[] }).ghi).toEqual([{ loai: "pa", duLieu: { id: "p2", duAnId: "da1", pa: pa2 }, phienBanTruoc: null }]);
    expect(moi.phuongAn!.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect((moi.phuongAn![1] as unknown as { daKy: boolean }).daKy).toBe(true); // bản máy chủ trả về
    const sua = await k.luuDuAn({ ...moi, ten: "Tên mới" });
    expect(nhat.at(-1)).toMatchObject({ pt: "PUT", dd: "/api/du-an/da1", than: { phienBanTruoc: 3 } });
    expect((nhat.at(-1)!.than as { duLieu: object }).duLieu).not.toHaveProperty("phuongAn");
    expect(sua).toMatchObject({ ten: "Tên mới", guiBoi: "may-chu" });
    expect(sua.phuongAn).toHaveLength(2);
    const n = nhat.length;
    expect(await k.luuDuAn(sua)).toBe(sua); // không đổi gì: không gửi
    expect(nhat.length).toBe(n);
  });

  it("401 xóa phiên; 404 tệp trả null; mẫu văn bản đọc tên tệp từ meta; ghi nhật ký không gửi tên người", async () => {
    const { gui, nhat } = giaLap((pt, dd) => {
      if (dd === "/api/dang-nhap") return { ma: 200, v: { token: "T", nguoiDung: {} } };
      if (dd === "/api/tep/banDo/x") return { ma: 404, v: { loi: "Không có tệp" } };
      if (pt === "GET" && dd === "/api/tep/mau/05") return { ma: 200, bytes: new Uint8Array([1, 2]), meta: encodeURIComponent(JSON.stringify({ tenTep: "Mẫu 05 xã.docx", luc: "L" })) };
      if (dd === "/api/nhat-ky") return { ma: 200, v: { stt: 1 } };
      return { ma: 401, v: { loi: "Phiên đăng nhập đã hết — đăng nhập lại" } };
    });
    const k = taoKhoMang({ diaChi: "a:1", vanTay: "v" }, gui);
    await k.dangNhap("a", "b");
    expect(await k.docBanDo("x")).toBeNull();
    expect(await k.docMau("05")).toMatchObject({ tenTep: "Mẫu 05 xã.docx", bytes: new Uint8Array([1, 2]) });
    await k.ghiNhatKy({ nguoi: "gia-mao", hoTen: "X", hanhDong: "Việc", chiTiet: "c" });
    expect(nhat.at(-1)!.than).toEqual({ hanhDong: "Việc", chiTiet: "c" });
    await expect(k.dsDuAn()).rejects.toBeInstanceOf(LoiMayChu);
    expect(k.coPhien()).toBe(false);
  });

  it("chuẩn hóa địa chỉ máy chủ; chế độ mặc định là máy đơn", () => {
    expect(chuanDiaChi(" 192.168.1.10 ")).toBe("192.168.1.10:47800");
    expect(chuanDiaChi("192.168.1.10:9000")).toBe("192.168.1.10:9000");
    expect(chuanDiaChi("may-chu-gpmb")).toBe("may-chu-gpmb:47800");
    expect(chuanDiaChi("http://192.168.1.10")).toBeNull();
    expect(chuanDiaChi("1.2.3.4:70000")).toBeNull();
    expect(docCheDo()).toEqual({ cheDo: "MAY_DON" });
  });
});
