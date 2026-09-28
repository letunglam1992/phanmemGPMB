import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { DANH_MUC_MAU, tepMau } from "../src/van-ban/danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { dienMau, truongTrongMau } from "../src/van-ban/dien-mau";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
const docMau = (ma: string) => readFileSync(new URL(`../public/mau-van-ban/${tepMau(DANH_MUC_MAU.find((m) => m.ma === ma)!)}`, import.meta.url));
const vanBan = (u8: Uint8Array) => new PizZip(u8).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

describe("22 mẫu văn bản QĐ 1966/QĐ-UBND", () => {
  it("đủ 22 mẫu Sổ tay + 5 mẫu riêng, mỗi mẫu có tệp và trường hợp lệ", () => {
    expect(DANH_MUC_MAU.filter((m) => m.nguon !== "RIENG").map((m) => m.ma)).toEqual(Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, "0")));
    expect(DANH_MUC_MAU.filter((m) => m.nguon === "RIENG").map((m) => m.ma)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    for (const m of DANH_MUC_MAU) expect(truongTrongMau(docMau(m.ma)).length).toBeGreaterThan(3);
  });

  for (const m of DANH_MUC_MAU) {
    it(`Mẫu ${m.ma} – ${m.ten}: điền được, không còn trường {…}`, () => {
      const rieng = Object.fromEntries(m.nhapThem.map((t) => [t.truong, t.macDinh ?? ""]));
      const du = ghepDuLieu({ mau: m, duAn, ds, ho: m.phamVi === "HO" ? ds[0] : undefined, chung: { ...thongTinChungMacDinh(duAn), ten_don_vi_bt: "Ban Quản lý dự án mẫu", nguoi_ky: "Lê Văn Mẫu" }, rieng, so: "12", ngayKy: "2026-09-27" });
      const t = vanBan(dienMau(docMau(m.ma), du));
      expect(t).not.toMatch(/\{[#/]?[\w.]+\}/);
      expect(t).toMatch(/CỘNG HO(À|À) XÃ HỘI CHỦ NGHĨA VIỆT NAM|CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/);
      if (m.phamVi === "HO") expect(t).toContain("Hộ mẫu 01");
      if (m.coQuan === "UBND") expect(t).toMatch(/Số: 12\//);
      if (m.nguon === "RIENG") expect(t).not.toMatch(/Vân Hồ|Hòa Bình|UBND XÃ VÂN|Mai Sơn|Tô Hiệu|455/i);
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

  it("mẫu riêng: diện tích theo nhóm, danh sách thu hồi, căn cứ gạch đầu dòng, phạm vi đợt", () => {
    const hoTc = { ...ds[1]!.h, loai: "TO_CHUC" as const, thua: ds[1]!.h.thua.map((t, i) => (i === 0 ? { ...t, khongBoiThuong: true } : t)) };
    const ds2 = [{ ...ds[0]!, h: { ...ds[0]!.h, thua: ds[0]!.h.thua.map((t, i) => (i === 0 ? { ...t, gcn: { seri: "AB 000001", soTo: "5", soThua: "85", dienTich: "9222.1", loaiDat: "CLN", dtThuHoiCoGcn: "9000", loaiDatThuHoi: "CLN" } } : t)) } }, { h: hoTc, k: tinhHo(cs, duAn, hoTc) }];
    for (const ma of ["R1", "R2", "R3"]) {
      const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
      const du = ghepDuLieu({ mau: m, duAn, ds: ds2, chung: { ...thongTinChungMacDinh(duAn), ten_don_vi_bt: "Ban Quản lý dự án mẫu", ly_do_thu_hoi: "Xây dựng khu công nghiệp" }, rieng: { pham_vi_dot: "Phạm vi bản mẫu, đợt 1", noi_nhan: "Như trên\nLưu: VT" }, so: "", ngayKy: "" });
      const t = vanBan(dienMau(docMau(ma), du));
      expect(t).toContain("(Phạm vi bản mẫu, đợt 1)");
      if (ma !== "R2") expect(t).toContain("1 hộ gia đình, cá nhân và 1 tổ chức");
      // Hộ 01: CLN 9.665,30 (được BT); tổ chức: HNK 600 (không được BT), ONT 150,50 (được BT)
      expect(t).toContain("* Diện tích đất được bồi thường, hỗ trợ: 9.815,80 m2.");
      expect(t).toContain("- Đất của hộ gia đình, cá nhân: 9.665,30 m2, gồm:");
      expect(t).toContain("+ Đất trồng cây lâu năm: 9.665,30 m2.");
      expect(t).toContain("- Đất của tổ chức: 150,50 m2, gồm:");
      expect(t).toContain("+ Đất ở tại nông thôn: 150,50 m2.");
      expect(t).toContain("* Tổng diện tích đất không được bồi thường, hỗ trợ: 600,00 m2, gồm:");
      expect(t).toContain("+ Đất trồng cây hàng năm khác: 600,00 m2.");
      if (ma !== "R3") expect(t).toContain("TRƯỞNG PHÒNG");
      expect(t).toContain("- Như trên;");
      expect(t).toContain("- Lưu: VT.");
      if (ma !== "R2") {
        expect(t).toContain("AB 000001");
        expect(t).toContain("9.000,00");
      }
      if (ma === "R2") expect(t).toContain("- Luật Tổ chức chính quyền địa phương số 72/2025/QH15;");
      else expect(t).toContain("Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15;");
    }
  });

  it("mẫu riêng phê duyệt phương án (R4, R5): thửa, đối tượng, các khoản theo nhóm, dẫn Tờ trình", () => {
    const tong = ds.reduce((s, x) => s + x.k.tong.tongLamTron.toNumber(), 0);
    const chung = { ...thongTinChungMacDinh(duAn), ten_don_vi_bt: "Ban Quản lý dự án mẫu" };
    const duAnCoTt = { ...duAn, vanBan: { tt_phe_duyet_pa_so: "07/TTr-KT", tt_phe_duyet_pa_ngay: "20/9/2026" } };
    for (const ma of ["R4", "R5"]) {
      const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
      const rieng = Object.fromEntries(m.nhapThem.map((t) => [t.truong, t.macDinh ?? ""]));
      const du = ghepDuLieu({ mau: m, duAn: duAnCoTt, ds, chung, rieng: { ...rieng, ket_qua_tham_dinh: "Báo cáo thẩm định số 01/BC-HĐBT ngày 15/9/2026" }, so: "12", ngayKy: "2026-09-27" });
      const t = vanBan(dienMau(docMau(ma), du));
      expect(t).toContain("Thửa số 85; mảnh trích đo địa chính số 5, Diện tích 9.222,10 m², loại đất: CLN.");
      expect(t).toContain("Tổng số đối tượng có đất thu hồi: 02 hộ gia đình.");
      expect(t).toContain(`Tổng giá trị phương án: ${tong.toLocaleString("vi-VN")} đồng (`);
      expect(t).toMatch(/a, Bồi thường về đất: [\d.]+ đồng;/);
      expect(t).toContain("Hỗ trợ đào tạo, chuyển đổi nghề và tìm kiếm việc làm");
      expect(t).toContain("Chi phí bảo đảm cho việc tổ chức thực hiện bồi thường, hỗ trợ, tái định cư: Thực hiện theo quy định hiện hành.");
      if (ma === "R4") {
        expect(t).toContain("Căn cứ Báo cáo thẩm định số 01/BC-HĐBT ngày 15/9/2026.");
        expect(t).toContain("Số: 12/TTr-KT");
      } else {
        expect(t).toContain("tại Tờ trình số 07/TTr-KT ngày 20/9/2026.");
        expect(t).toContain("có tên tại Phụ lục kèm theo chịu trách nhiệm thi hành");
        expect(t).toContain("- Như Điều 4;");
        expect(t).toContain("Ban Quản lý dự án mẫu chủ trì");
      }
    }
    // Các khoản a, b, c… cộng lại đúng tổng sau làm tròn
    const du = ghepDuLieu({ mau: DANH_MUC_MAU.find((x) => x.ma === "R4")!, duAn, ds, chung, rieng: {}, so: "", ngayKy: "" });
    const cong = (du.khoan_pa as { tien: string }[]).reduce((s, x) => s + Number(x.tien.replace(/\./g, "").replace(",", ".")), 0);
    expect(cong).toBeCloseTo(tong, 2);
  });

  it("trường bỏ trống in thành dấu chấm", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "02")!;
    const du = ghepDuLieu({ mau: m, duAn, ds, ho: ds[0], chung: thongTinChungMacDinh(duAn), rieng: {}, so: "", ngayKy: "" });
    expect(vanBan(dienMau(docMau("02"), du))).toContain("Thời gian tiến hành kiểm kê hiện trạng: từ ………… đến …………");
  });
});

describe("Tự điền từ hồ sơ", () => {
  it("phương án: TĐC, chuyển đổi nghề, mồ mả lấy từ hồ sơ; giá trị đã lưu khác mặc định được giữ", async () => {
    const { macDinhTuHoSo, giaTriNhapThem } = await import("../src/van-ban/tao-nhanh");
    const h0 = { ...ho[0]!, hoTro: { ...ho[0]!.hoTro, taiDinhCu: { hinhThuc: "TU_LO" as const, khoanKhac: [] }, moMa: { xay: 2, khongXay: 1 } } };
    const ds2 = [h0, ...ho.slice(1)].map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    const md = macDinhTuHoSo(ds2);
    expect(md.pa_tai_dinh_cu).toMatch(/1 hộ tự lo chỗ ở, hỗ trợ 60\.000\.000 đồng/);
    expect(md.pa_chuyen_doi_nghe).toMatch(/cho 1 hộ/);
    expect(md.pa_mo_ma).toBe("Di dời 3 mộ (2 mộ xây, 1 mộ đất).");
    const m14 = DANH_MUC_MAU.find((m) => m.ma === "14")!;
    expect(giaTriNhapThem(m14, { ...duAn, vanBan: { pa_tai_dinh_cu: "Không", pa_mo_ma: "Tự ghi" } }, ds2)).toMatchObject({ pa_tai_dinh_cu: md.pa_tai_dinh_cu, pa_mo_ma: "Tự ghi" });
  });
});
