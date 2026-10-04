/** Cảnh báo chậm gửi, xã tự gửi định kỳ, các bản gửi trước, báo cáo Word toàn tỉnh (docs/21). */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { taoKhoBoNho } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { dsChamGui, moTaCham, soNgayTu } from "../src/tong-hop-tinh/canh-bao";
import { denHanTuGui, lanTuGuiTiep, tuGuiNeuDenHan, type CaiDatGui } from "../src/tong-hop-tinh/tu-gui";
import { KHOA_CD_GUI, KHOA_CD_KHOA_TINH, congKhaiCua, docThongTinGoi, moKhoaTinh, taoKhoaTinh, type KhoaTinh } from "../src/tong-hop-tinh/goi-tinh";
import { duLieuBaoCaoTinh, type DongBaoCao } from "../src/tong-hop-tinh/bao-cao-tinh";
import { dienMau } from "../src/van-ban/dien-mau";
// @ts-expect-error tệp JS của Worker
import worker from "../../../tools/cong-tinh/worker.js";

const NOW = new Date("2026-10-20T08:00:00Z");
let tinh: KhoaTinh;
let biMat: CryptoKey;
beforeAll(async () => {
  const fake = await import("fake-indexeddb");
  Object.assign(globalThis, { indexedDB: fake.indexedDB, IDBKeyRange: fake.IDBKeyRange });
  tinh = await taoKhoaTinh("mat-khau-tinh-2026", "Sở (thử)", "qt");
  biMat = (await moKhoaTinh(tinh, "mat-khau-tinh-2026"))!;
}, 60_000);

describe("Cảnh báo xã lâu chưa gửi", () => {
  it("không đặt ngưỡng thì không cảnh báo; quá ngưỡng theo gói đã nhận và theo cổng (chưa gửi lần nào)", () => {
    const goi = [{ donViGui: "UBND xã A", thongTin: { luc: "2026-10-01T00:00:00Z" } }, { donViGui: "UBND xã B", thongTin: { luc: "2026-10-18T00:00:00Z" } }];
    const cong = [
      { ten: "Xã C", taoLuc: "2026-09-01T00:00:00Z" },
      { ten: "Xã D", taoLuc: "2026-09-01T00:00:00Z", goiCuoi: "2026-10-19T00:00:00Z" },
      { ten: "Xã E", taoLuc: "2026-09-01T00:00:00Z", thuHoi: "2026-09-02T00:00:00Z" },
    ];
    expect(dsChamGui(goi, cong, null, NOW)).toEqual([]);
    const c = dsChamGui(goi, cong, 7, NOW);
    expect(c.map((x) => x.ten)).toEqual(["Xã C", "UBND xã A"]);
    expect(c[1]!.soNgay).toBe(19);
    expect(moTaCham(c[0]!)).toContain("chưa gửi số liệu lên cổng lần nào");
    expect(moTaCham(c[1]!)).toContain("01/10/2026 (19 ngày)");
    expect(soNgayTu("2026-10-20T07:00:00Z", NOW)).toBe(0);
  });
});

describe("Xã tự gửi định kỳ", () => {
  it("chưa bật / chưa có chu kỳ thì không gửi; chưa gửi lần nào thì đến hạn ngay; lỗi thì chờ 1 giờ", () => {
    const cd: CaiDatGui = { maGui: "m", ten: "UBND xã A" };
    expect(lanTuGuiTiep(cd)).toBeNull();
    expect(denHanTuGui({ ...cd, tuDong: { bat: true, soNgay: 0 } }, NOW)).toBe(false);
    expect(denHanTuGui({ ...cd, tuDong: { bat: true, soNgay: 7 } }, NOW)).toBe(true);
    const daGui = { ...cd, tuDong: { bat: true, soNgay: 7 }, lanGui: { luc: "2026-10-15T08:00:00Z", cach: "tệp" } };
    expect(lanTuGuiTiep(daGui)!.toISOString()).toBe("2026-10-22T08:00:00.000Z");
    expect(denHanTuGui(daGui, NOW)).toBe(false);
    expect(denHanTuGui({ ...daGui, lanGui: { luc: "2026-10-10T08:00:00Z", cach: "tệp" } }, NOW)).toBe(true);
    expect(denHanTuGui({ ...daGui, lanGui: { luc: "2026-10-10T08:00:00Z", cach: "tệp" }, loiTuGui: { luc: "2026-10-20T07:30:00Z", loi: "x" } }, NOW)).toBe(false);
  });

  it("đến hạn: tạo gói theo lựa chọn đã lưu (bỏ dự án đã bỏ ra), gửi lên cổng, ghi lần gửi; lỗi thì ghi lỗi", async () => {
    const env = { MA_QUAN_TRI: "ma-quan-tri-thu-nghiem-0123456789", KHO: (() => { const m = new Map<string, Uint8Array>(); const e = new TextEncoder(); return { m, put: async (k: string, v: string | Uint8Array) => void m.set(k, typeof v === "string" ? e.encode(v) : v), get: async (k: string) => (m.has(k) ? { body: m.get(k)!, json: async () => JSON.parse(new TextDecoder().decode(m.get(k)!)) } : null), list: async (o: { prefix: string }) => ({ objects: [...m.entries()].filter(([k]) => k.startsWith(o.prefix)).map(([key, v]) => ({ key, size: v.length })), truncated: false }), delete: async (k: string) => void m.delete(k) }; })() };
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => worker.fetch(new Request(url, init), env));
    const quanTri = { diaChi: "https://cong.test", ma: env.MA_QUAN_TRI };
    const { token } = await (await worker.fetch(new Request("https://cong.test/api/xa", { method: "POST", headers: { authorization: `Bearer ${env.MA_QUAN_TRI}` }, body: JSON.stringify({ ma: "xa-a", ten: "Xã A" }) }), env)).json();
    const kho = taoKhoBoNho();
    const a = taoDuAnMau();
    const b = taoDuAnMau();
    await kho.ghiLo({ duAn: [a.duAn, b.duAn], ho: [...a.ho, ...b.ho] });
    await kho.luuCaiDat(KHOA_CD_KHOA_TINH, congKhaiCua(tinh));
    await kho.luuCaiDat(KHOA_CD_GUI, { maGui: "m1", ten: "UBND xã A", boQua: [b.duAn.id], tuDong: { bat: true, soNgay: 7 } } satisfies CaiDatGui);
    const r = await tuGuiNeuDenHan(kho, { diaChi: "https://cong.test", ma: token }, { ungDung: "t", nguoiXuat: "Tự động", bayGio: NOW });
    expect(r?.ok).toBe(true);
    const cd = (await kho.docCaiDat<CaiDatGui>(KHOA_CD_GUI))!;
    expect(cd.lanGui?.cach).toContain("tự động");
    // lần sau chưa đến hạn
    expect(await tuGuiNeuDenHan(kho, { diaChi: "https://cong.test", ma: token }, { ungDung: "t", nguoiXuat: "x" })).toBeNull();
    // gói trên cổng chỉ có dự án a
    const goi = await (await worker.fetch(new Request("https://cong.test/api/goi/xa-a", { headers: { authorization: `Bearer ${quanTri.ma}` } }), env)).arrayBuffer();
    const { thongTin } = await docThongTinGoi(new Uint8Array(goi));
    expect(thongTin.tenDuAn).toEqual([a.duAn.ten]);
    expect(thongTin.soHo).toBe(a.ho.length);
    // mã bị thu hồi → lỗi được ghi, không ném ra
    await worker.fetch(new Request("https://cong.test/api/xa/xa-a", { method: "DELETE", headers: { authorization: `Bearer ${env.MA_QUAN_TRI}` } }), env);
    await kho.luuCaiDat(KHOA_CD_GUI, { ...cd, lanGui: { luc: "2026-01-01T00:00:00Z", cach: "tệp" } });
    const r2 = await tuGuiNeuDenHan(kho, { diaChi: "https://cong.test", ma: token }, { ungDung: "t", nguoiXuat: "x", bayGio: NOW });
    expect(r2).toMatchObject({ ok: false });
    expect((await kho.docCaiDat<CaiDatGui>(KHOA_CD_GUI))!.loiTuGui?.loi).toMatch(/thu hồi/);
    vi.unstubAllGlobals();
  }, 60_000);
});

describe("Các bản gửi trước", () => {
  it("bản mới thay bản cũ → bản cũ vào danh sách; nhập gói cũ hơn → lưu vào bản trước; xem lại được; xóa đơn vị xóa cả bản trước", async () => {
    const { nhapGoi, dsBanCu, docBanCu, moGoiDaLuu, xoaGoi } = await import("../src/tong-hop-tinh/kho-tinh");
    const { taoGoiTinh, taoKhoaKy } = await import("../src/tong-hop-tinh/goi-tinh");
    const kho = taoKhoBoNho();
    const a = taoDuAnMau();
    await kho.ghiLo({ duAn: [a.duAn], ho: a.ho });
    const ky = await taoKhoaKy();
    const tao = () => taoGoiTinh(kho, { khoaTinh: congKhaiCua(tinh), khoaKy: ky, maGui: "bc-1", donViGui: "UBND xã Bản cũ", duAnIds: [a.duAn.id], kemDinhKem: true, kemBanDo: true, ungDung: "t", nguoiXuat: "x" });
    const k = { tinh, biMat };
    const g1 = await tao();
    await new Promise((r) => setTimeout(r, 5));
    const g2 = await tao();
    await new Promise((r) => setTimeout(r, 5));
    const g3 = await tao();
    await nhapGoi(g1.bytes, k, "TEP", { homNay: "2026-10-20" });
    await nhapGoi(g3.bytes, k, "TEP", { homNay: "2026-10-20" });
    expect((await nhapGoi(g2.bytes, k, "TEP", { homNay: "2026-10-20" })).loai).toBe("CU_HON");
    const ds = await dsBanCu("bc-1");
    expect(ds.map((x) => x.thongTin.luc)).toEqual([g2.thongTin.luc, g1.thongTin.luc]);
    const b = (await docBanCu(ds[1]!.id))!;
    expect((await moGoiDaLuu(b, k)).ho.length).toBe(a.ho.length);
    await xoaGoi("bc-1");
    expect(await dsBanCu("bc-1")).toEqual([]);
  }, 60_000);
});

describe("Báo cáo Word toàn tỉnh", () => {
  it("điền mẫu: bảng theo xã, từng dự án, tình hình gửi, vướng mắc; không có tên hộ", () => {
    const d = (xa: string, ten: string, soHo: number, bg: number, vm: number): DongBaoCao => ({ id: ten, ten, xa, chuDauTu: "", soHo, theoTrangThai: { HOAN_THANH: bg, CHUA_KIEM_DEM: soHo - bg }, tongTamTinh: "1000000", dienTichThuHoi: "250.5", soVuongMac: vm, soHoDaChotPA: 1, soHoDaDuyetPA: 1, tienDoBinhQuan: 0.5, soTepDinhKem: 0, donViGui: `UBND ${xa}`, luc: "2026-10-15T00:00:00Z" });
    const dong = [d("Xã Chiềng Mung", "Dự án 1", 10, 4, 2), d("Xã Chiềng Mung", "Dự án 2", 5, 5, 0), d("Phường Tô Hiệu", "Dự án 3", 3, 0, 1)];
    const tt = { coQuanCapTren: "UBND tỉnh Sơn La", coQuan: "Sở Nông nghiệp và Môi trường", kyHieu: "SNNMT", diaDanh: "Sơn La", kinhGui: "Ủy ban nhân dân tỉnh", so: "", ngayKy: "2026-10-20", moDau: "Mở đầu.", khoKhanKhac: "", nhiemVu: "Nhiệm vụ.", kienNghi: "Kiến nghị.", ketThuc: "Kết./.", noiNhan: "Như trên\nLưu: VT", quyenHan: "Giám đốc", nguoiKy: "Người ký" };
    const dl = duLieuBaoCaoTinh(dong, tt, { phamVi: "tỉnh", denNgay: "2026-10-20", soDonVi: 2, cham: [{ ten: "UBND xã X", nguon: "GOI", lanCuoi: "2026-10-01T00:00:00Z", soNgay: 19 }], nguong: 7 });
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-tong-hop-tinh.docx", import.meta.url));
    const xml = new PizZip(dienMau(mau, dl)).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
    expect(xml).toContain("SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG");
    expect(xml).toContain("Tổng hợp từ số liệu của 2 đơn vị gửi (2 xã, phường): 3 dự án; 18 hộ");
    expect(xml).toContain("Đã bàn giao mặt bằng 9/18 hộ (50%)");
    expect(xml).toContain("Phường Tô Hiệu");
    expect(xml).toContain("Dự án 3 (Phường Tô Hiệu)");
    expect(xml).toContain("Có 1 đơn vị quá 7 ngày chưa gửi số liệu mới");
    expect(xml).toContain("UBND xã X: số liệu gửi gần nhất ngày 01/10/2026 (19 ngày)");
    expect(xml).toContain("Có 3 hộ đang ghi vướng mắc");
    expect(xml).toContain("3.000.000");
    expect(xml).not.toMatch(/\{[#/^]?[a-z_]+\}/); // không còn trường chưa điền
  });
});
