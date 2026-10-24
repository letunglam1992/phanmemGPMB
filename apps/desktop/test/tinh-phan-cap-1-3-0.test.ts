import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { donViChuaGuiPhanCap, duLieuBaoCaoPhanCapTinh, phienBanTu } from "../src/tong-hop-tinh/dien-bien";
import { dienMau } from "../src/van-ban/dien-mau";

const chu = (b: Uint8Array) => new PizZip(b).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

describe("1.3.0 (C2) — đơn vị chưa gửi số liệu phân cấp", () => {
  it("so sánh phiên bản", () => {
    expect(phienBanTu("GPMB Sơn La 1.3.0", "1.3.0")).toBe(true);
    expect(phienBanTu("1.10.0", "1.3.0")).toBe(true);
    expect(phienBanTu("1.2.9", "1.3.0")).toBe(false);
    expect(phienBanTu("", "1.3.0")).toBe(false);
  });
  it("gói bản cũ hoặc gửi trước kỳ bị nêu; gói trong kỳ từ 1.3.0 không nêu", () => {
    const ds = donViChuaGuiPhanCap([
      { donViGui: "Xã B", thongTin: { luc: "2026-06-01T08:00:00Z", ungDung: "1.3.0" } },
      { donViGui: "Xã A", thongTin: { luc: "2026-07-01T08:00:00Z", ungDung: "1.2.0" } },
      { donViGui: "Xã C", thongTin: { luc: "2026-11-01T08:00:00Z", ungDung: "1.3.0" } },
    ], "2026-06-15");
    expect(ds.map((x) => x.donVi)).toEqual(["Xã A", "Xã B"]);
    expect(ds[0]!.lyDo).toContain("bản cũ");
    expect(ds[1]!.lyDo).toContain("01/06/2026");
  });
});

describe("1.3.0 (C1) — báo cáo Word phân cấp toàn tỉnh", () => {
  it("điền đủ, không còn thẻ trống", () => {
    const pc: { xa: string; theoNv: Record<string, number>; tong: number }[] = [{ xa: "Xã A", theoNv: { THU_HOI: 2, HOI_DONG: 1 }, tong: 3 }, { xa: "Xã B", theoNv: {}, tong: 0 }];
    const nv = [{ ma: "THU_HOI", noiDung: "Quyết định thu hồi đất", viTri: "Điều 1" }, { ma: "HOI_DONG", noiDung: "Thành lập Hội đồng", viTri: "Điều 1" }];
    const d = duLieuBaoCaoPhanCapTinh(pc, nv, [{ donVi: "Xã B", lyDo: "gói gửi từ bản cũ (1.2.0)" }], { tu: "2026-06-15", den: "2026-12-14" }, { so: "27/2026/QĐ-UBND", ten: "Quyết định phân cấp" }, {
      coQuanCapTren: "UBND tỉnh Sơn La", coQuan: "Sở Nông nghiệp và Môi trường", kyHieu: "SNNMT", so: "", diaDanh: "Sơn La", ngayKy: "2026-12-15", kinhGui: "Ủy ban nhân dân tỉnh Sơn La", khoKhan: "", kienNghi: "", noiNhan: "Như trên;\nLưu: VT.", quyenHan: "Giám đốc", nguoiKy: "",
    });
    expect(d.tong_quat).toBe("Trong kỳ, 1/2 xã, phường có văn bản thuộc nhiệm vụ được phân cấp, tổng cộng 3 văn bản.");
    expect((d.ds_nv as { so_vb: string; so_xa: string }[])[0]).toMatchObject({ so_vb: "2", so_xa: "1" });
    const t = chu(dienMau(readFileSync(new URL("../public/mau-van-ban/bao-cao-phan-cap-tinh.docx", import.meta.url)), d));
    expect(t).not.toMatch(/\{[^}]*\}/);
    expect(t).toContain("27/2026/QĐ-UBND");
    expect(t).toContain("Xã B (gói gửi từ bản cũ (1.2.0))");
    expect(t).toContain("15/06/2026");
    expect(t).toContain("Quyết định thu hồi đất: 2");
  });
});
