import { describe, expect, it } from "vitest";
import { dienBienTinh, type BanGui } from "../src/tong-hop-tinh/dien-bien";

const tt = (o: Partial<{ xa: string; soHo: number; ht: number; duyet: number; tien: string; ma: string }>) => ({
  id: "d", ten: "x", xa: o.xa ?? "Xã A", chuDauTu: "", soHo: o.soHo ?? 10, theoTrangThai: { HOAN_THANH: o.ht ?? 0 }, tongTamTinh: o.tien ?? "1000", dienTichThuHoi: "100",
  soVuongMac: 0, soHoDaChotPA: 0, soHoDaDuyetPA: o.duyet ?? 0, tienDoBinhQuan: 0, soTepDinhKem: 0, ...(o.ma ? { lienXa: { ma: o.ma } } : {}),
});

describe("1.0.5: diễn biến toàn tỉnh theo tháng", () => {
  const ban: BanGui[] = [
    { maGui: "a", luc: "2026-07-10T00:00:00Z", tomTat: [tt({ ht: 2 })] },
    { maGui: "a", luc: "2026-09-05T00:00:00Z", tomTat: [tt({ ht: 6, duyet: 8 })] },
    { maGui: "b", luc: "2026-08-20T00:00:00Z", tomTat: [tt({ xa: "Xã B", soHo: 5, ht: 1, ma: "LX-1" })] },
  ];
  it("mỗi kỳ lấy bản gần nhất trước cuối tháng; đơn vị chưa gửi không tính", () => {
    const k = dienBienTinh(ban, { loai: "TINH" }, "2026-10-08T00:00:00Z");
    expect(k.map((x) => x.ky)).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(k.map((x) => x.banGiao)).toEqual([2, 3, 7, 7]);
    expect(k.map((x) => x.soDonVi)).toEqual([1, 2, 2, 2]);
    expect(k[2]!.duyetPA).toBe(8);
    expect(k[3]!.tamTinh).toBe(2000);
  });
  it("lọc theo xã, theo dự án liên xã", () => {
    expect(dienBienTinh(ban, { loai: "XA", xa: "xã b" }, "2026-10-08T00:00:00Z").map((x) => x.soHo)).toEqual([0, 5, 5, 5]);
    expect(dienBienTinh(ban, { loai: "LIEN_XA", ma: "lx-1" }, "2026-10-08T00:00:00Z").map((x) => x.banGiao)).toEqual([0, 1, 1, 1]);
    expect(dienBienTinh([], { loai: "TINH" })).toEqual([]);
  });
});

describe("1.0.6: diễn biến theo tháng trong báo cáo Word cấp tỉnh", () => {
  const ban: BanGui[] = [
    { maGui: "a", luc: "2026-08-10T00:00:00Z", tomTat: [tt({ ht: 2, duyet: 4, tien: "1000000" })] },
    { maGui: "a", luc: "2026-09-05T00:00:00Z", tomTat: [tt({ ht: 6, duyet: 8, tien: "1500000" })] },
  ];
  it("bảng các tháng, câu so với tháng trước; ảnh biểu đồ chèn đúng chỗ, không có ảnh thì bỏ chỗ đặt", async () => {
    const { duLieuBaoCaoTinh, duLieuDienBien } = await import("../src/tong-hop-tinh/bao-cao-tinh");
    const { dienMau } = await import("../src/van-ban/dien-mau");
    const { chenAnhDocx } = await import("../src/van-ban/chen-anh");
    const { readFileSync } = await import("node:fs");
    const PizZip = (await import("pizzip")).default;
    const ky = dienBienTinh(ban, { loai: "TINH" }, "2026-09-30T00:00:00Z");
    const d = duLieuDienBien(ky);
    expect(d.co_dien_bien).toBe(true);
    expect(d.cau_dien_bien).toBe("So với tháng 08/2026, đến tháng 09/2026: số hộ đã bàn giao mặt bằng tăng 4 hộ (20% → 60%); số hộ đã có phương án được phê duyệt tăng 4 hộ (40% → 80%); giá trị tạm tính tăng 500.000 đồng.");
    expect(duLieuDienBien(ky.slice(0, 1)).co_dien_bien).toBe(false);
    const tt0 = { coQuanCapTren: "", coQuan: "Sở (thử)", kyHieu: "", diaDanh: "", kinhGui: "", so: "", ngayKy: "2026-10-01", moDau: "", khoKhanKhac: "", nhiemVu: "", kienNghi: "", ketThuc: "", noiNhan: "", quyenHan: "", nguoiKy: "" };
    const dl = duLieuBaoCaoTinh([], tt0, { phamVi: "tỉnh", denNgay: "2026-10-01", soDonVi: 1, cham: [], nguong: null, dienBien: ky });
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-tong-hop-tinh.docx", import.meta.url));
    const docx = dienMau(mau, dl);
    const chu = (u: Uint8Array) => new PizZip(u).file("word/document.xml")!.asText();
    expect(chu(docx).replace(/<[^>]+>/g, "")).toContain("4. Diễn biến theo tháng");
    expect(chu(docx).replace(/<[^>]+>/g, "")).toContain("09/2026");
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const coAnh = chenAnhDocx(docx, "[[BIEU_DO_DIEN_BIEN]]", png);
    const z = new PizZip(coAnh);
    expect(z.file("word/document.xml")!.asText()).toContain("<w:drawing>");
    expect(z.file("word/document.xml")!.asText()).not.toContain("BIEU_DO_DIEN_BIEN");
    expect(z.file("word/media/anh-1.png")).toBeTruthy();
    expect(z.file("word/_rels/document.xml.rels")!.asText()).toContain('Target="media/anh-1.png"');
    expect(z.file("[Content_Types].xml")!.asText()).toMatch(/Extension="png"/);
    const { DOMParser } = await import("@xmldom/xmldom");
    const loi: string[] = [];
    new DOMParser({ onError: (_l: string, m: string) => void loi.push(m) }).parseFromString(z.file("word/document.xml")!.asText(), "text/xml");
    expect(loi).toEqual([]);
    expect(chu(chenAnhDocx(docx, "[[BIEU_DO_DIEN_BIEN]]", null))).not.toContain("BIEU_DO_DIEN_BIEN");
    // không đủ 2 tháng: cả mục bị bỏ
    const dl1 = duLieuBaoCaoTinh([], tt0, { phamVi: "tỉnh", denNgay: "2026-10-01", soDonVi: 1, cham: [], nguong: null, dienBien: ky.slice(0, 1) });
    expect(chu(dienMau(mau, dl1)).replace(/<[^>]+>/g, "")).not.toContain("Diễn biến theo tháng");
  });
});
