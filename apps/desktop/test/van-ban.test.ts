import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { DANH_MUC_MAU } from "../src/van-ban/danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { dienMau, truongTrongMau } from "../src/van-ban/dien-mau";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
const docMau = (ma: string) => readFileSync(new URL(`../public/mau-van-ban/mau-${ma}.docx`, import.meta.url));
const vanBan = (u8: Uint8Array) => new PizZip(u8).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

describe("22 mẫu văn bản QĐ 1966/QĐ-UBND", () => {
  it("đủ 22 mẫu, mỗi mẫu có tệp và trường hợp lệ", () => {
    expect(DANH_MUC_MAU.map((m) => m.ma)).toEqual(Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, "0")));
    for (const m of DANH_MUC_MAU) expect(truongTrongMau(docMau(m.ma)).length).toBeGreaterThan(3);
  });

  for (const m of DANH_MUC_MAU) {
    it(`Mẫu ${m.ma} – ${m.ten}: điền được, không còn trường {…}`, () => {
      const rieng = Object.fromEntries(m.nhapThem.map((t) => [t.truong, t.macDinh ?? ""]));
      const du = ghepDuLieu({ mau: m, duAn, ds, ho: m.phamVi === "HO" ? ds[0] : undefined, chung: { ...thongTinChungMacDinh(duAn), ten_don_vi_bt: "Ban Quản lý dự án mẫu", nguoi_ky: "Nguyễn Văn Mẫu" }, rieng, so: "12", ngayKy: "2026-09-27" });
      const t = vanBan(dienMau(docMau(m.ma), du));
      expect(t).not.toMatch(/\{[#/]?[\w.]+\}/);
      expect(t).toContain("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
      if (m.phamVi === "HO") expect(t).toContain("Hộ mẫu 01");
      if (m.coQuan === "UBND") expect(t).toMatch(/Số: 12\//);
    });
  }

  it("QĐ phê duyệt phương án (Mẫu 14): số liệu tổng hợp và bằng chữ", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "14")!;
    const du = ghepDuLieu({ mau: m, duAn, ds, chung: thongTinChungMacDinh(duAn), rieng: { noi_nhan: "Như Điều 4\nLưu: VT" }, so: "", ngayKy: "" });
    const t = vanBan(dienMau(docMau("14"), du));
    expect(t).toContain("CLN: 9.665,30 m²");
    expect(t).toMatch(/Tổng giá trị phương án: [\d.]+ đồng \(bằng chữ: [A-ZĐ]/);
    expect(t).toContain("Căn cứ Nghị định số 88/2024/NĐ-CP");
    expect(t).toContain("- Như Điều 4;");
    expect(t).toContain("CHỦ TỊCH ỦY BAN NHÂN DÂN XÃ CHIỀNG MUNG");
  });

  it("QĐ thu hồi đất (Mẫu 15): diện tích, thửa, căn cứ riêng", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "15")!;
    const du = ghepDuLieu({ mau: m, duAn, ds, ho: ds[0], chung: { ...thongTinChungMacDinh(duAn), ly_do_thu_hoi: "Xây dựng khu công nghiệp" }, rieng: {}, so: "", ngayKy: "" });
    const t = vanBan(dienMau(docMau("15"), du));
    expect(t).toContain("Thu hồi 9.665,30 m² đất của Hộ mẫu 01, thuộc thửa đất số 85 (toàn bộ thửa đất), tờ bản đồ số 5; thửa đất số 73 (toàn bộ thửa đất), tờ bản đồ số 5");
    expect(t).toContain("Lý do thu hồi đất: Xây dựng khu công nghiệp.");
    expect(t).toContain("Căn cứ Thông báo thu hồi đất số …/TB-UBND (mẫu);");
  });

  it("tổng giá trị phương án cộng chi phí tổ chức thực hiện (9.2)", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "13")!;
    const tong = ds.reduce((s, x) => s + x.k.tong.tongLamTron.toNumber(), 0);
    const du = ghepDuLieu({ mau: m, duAn, ds, chung: thongTinChungMacDinh(duAn), rieng: { chi_phi_to_chuc: "50.000.000" }, so: "", ngayKy: "" });
    expect(du.tong_gia_tri).toBe((tong + 50000000).toLocaleString("vi-VN"));
    expect(du.tien_bthttdc).toBe(tong.toLocaleString("vi-VN"));
  });

  it("trường bỏ trống in thành dấu chấm", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "02")!;
    const du = ghepDuLieu({ mau: m, duAn, ds, ho: ds[0], chung: thongTinChungMacDinh(duAn), rieng: {}, so: "", ngayKy: "" });
    expect(vanBan(dienMau(docMau("02"), du))).toContain("Thời gian tiến hành kiểm kê hiện trạng: từ ………… đến …………");
  });
});
