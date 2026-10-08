import { chotPhuongAn, pheDuyet } from "../src/phuong-an";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { DANH_MUC_MAU, tepMau } from "../src/van-ban/danh-muc";
import { CAN_CU_MAC_DINH, ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { kiemTraThongNhat } from "../src/van-ban/thuc-te";
import { dienMau, truongTrongMau } from "../src/van-ban/dien-mau";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
const docMau = (ma: string) => readFileSync(new URL(`../public/mau-van-ban/${tepMau(DANH_MUC_MAU.find((m) => m.ma === ma)!)}`, import.meta.url));
const vanBan = (u8: Uint8Array) => new PizZip(u8).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

describe("22 mẫu văn bản QĐ 1966/QĐ-UBND", () => {
  it("đủ 22 mẫu Sổ tay + 5 mẫu riêng, mỗi mẫu có tệp và trường hợp lệ", () => {
    expect(DANH_MUC_MAU.filter((m) => !m.nguon).map((m) => m.ma)).toEqual(Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, "0")));
    expect(DANH_MUC_MAU.filter((m) => m.nguon === "THUC_TE").map((m) => m.ma)).toEqual(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]);
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
      expect(t).toContain("Thửa số 85; mảnh trích đo địa chính số 5, Diện tích 9.222,10 m², loại đất: Đất trồng cây lâu năm (CLN).");
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

describe("Mẫu theo văn bản thực tế (T1–T7, docs/19)", () => {
  const chung = { ...thongTinChungMacDinh(duAn), ten_don_vi_bt: "Ban Quản lý dự án mẫu", ly_do_thu_hoi: "Xây dựng khu công nghiệp", ban_khu_dan_cu: "Tổ dân phố mẫu" };
  const tao = (ma: string, dsX = ds, hoX?: (typeof ds)[number], them: Record<string, string> = {}, duAnX = duAn) => {
    const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
    const rieng = { ...Object.fromEntries(m.nhapThem.map((t) => [t.truong, t.macDinh ?? ""])), ...them };
    const du = ghepDuLieu({ mau: m, duAn: duAnX, ds: dsX, ho: m.phamVi === "HO" ? (hoX ?? dsX[0]) : undefined, chung, rieng, so: "25", ngayKy: "2026-09-27" });
    return { du, t: vanBan(dienMau(docMau(ma), du)) };
  };

  it("T4/T5 phương án 01 hộ: 11 mục, tổng làm tròn khớp bằng chữ, hỗ trợ khác k13 có nội dung, lý do, mức, tổng", () => {
    const h0 = { ...ho[0]!, hoTro: { ...ho[0]!.hoTro, khac: { khoan: [{ id: "k1", loai: "K13_14" as const, noiDung: "Hỗ trợ di chuyển đường điện sinh hoạt", lyDo: "Hộ phải kéo lại đường điện", soTien: "3000000", canCu: "QĐ 45/QĐ-UBND ngày 10/9/2026 của UBND xã" }] } } };
    const x = { h: h0, k: tinhHo(cs, duAn, h0) };
    for (const ma of ["T4", "T5"]) {
      const { du, t } = tao(ma, [x], x);
      for (let i = 1; i <= 11; i++) expect(t).toMatch(new RegExp(`\\n${i}\\. `));
      expect(t).toContain("1. Tổng số hộ gia đình, cá nhân có đất thu hồi: Một (01) hộ. Hộ Hộ mẫu 01 (vợ: Thành viên A)");
      expect(t).toContain(`8.1. Tổng kinh phí bồi thường, hỗ trợ (đã làm tròn): ${du.tong_tien} đồng`);
      expect(t).toContain(`(Bằng chữ: ${du.tong_tien_chu})`);
      expect(t).toContain("Hỗ trợ khác theo khoản 13 Điều 6 Quyết định số 14/2026/QĐ-UBND: tổng giá trị 3.000.000 đồng, gồm:");
      expect(t).toContain("+ Nội dung: Hỗ trợ di chuyển đường điện sinh hoạt; lý do: Hộ phải kéo lại đường điện; mức hỗ trợ: 3.000.000 đồng");
      expect(kiemTraThongNhat(ma, duAn, du)).toEqual([]);
    }
    expect(tao("T5", [x], x).t).toContain("Số: 25/QĐ-UBND");
    // hộ không có khoản 13: in "Không."
    expect(tao("T4").t).toContain("khoản 13 Điều 6 Quyết định số 14/2026/QĐ-UBND: Không.");
  });

  it("T6/T7 thu hồi nhiều hộ: căn cứ tự lấy QĐ phê duyệt PA từng hộ; diện tích trích yếu khớp tổng biểu; kèm theo dùng đúng số", () => {
    const ds2 = ds.map((x, i) => ({ ...x, h: { ...x.h, vanBan: { ...(x.h.vanBan ?? {}), ...(i === 0 ? { qd_phe_duyet_so: "101/QĐ-UBND", qd_phe_duyet_ngay: "01/09/2026" } : {}) } } }));
    const { du, t } = tao("T7", ds2);
    expect(t).toContain("Về việc thu hồi 10.415,80 m² đất của 02 hộ gia đình, cá nhân");
    expect(t).toContain("Căn cứ Quyết định số 101/QĐ-UBND ngày 01/09/2026 của Chủ tịch Ủy ban nhân dân xã Chiềng Mung về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với hộ Hộ mẫu 01;");
    expect(t).toContain("Căn cứ Quyết định số …/QĐ-UBND ngày … của Chủ tịch Ủy ban nhân dân xã Chiềng Mung");
    expect(t).toContain("(Kèm theo Quyết định số 25/QĐ-UBND ngày 27/09/2026 của Chủ tịch Ủy ban nhân dân xã Chiềng Mung)");
    expect(t).toMatch(/TỔNG CỘNG\s*10\.415,80/);
    expect(kiemTraThongNhat("T7", duAn, du)).toEqual(["1 hộ chưa có số, ngày QĐ phê duyệt phương án (ghi khi tạo mẫu T5 có số, hoặc nhập ở hồ sơ hộ) — căn cứ in \"…\"."]);
    expect(tao("T6", ds2).t).toContain("(Kèm theo Tờ trình số 25/TTr-KT ngày 27/09/2026 của Phòng Kinh tế)");
  });

  it("1.0.6 T12 biên bản đối thoại (điểm a k3 Đ87) lấy ý kiến, giải trình từ bước 7; mẫu 08 tự đếm ý kiến", () => {
    const h0 = { ...ho[0]!, yKienPA: { loai: "KHONG_DONG_Y" as const, ngayLay: "2026-09-01", noiDung: "Đề nghị xem lại đơn giá cây nhãn", doiThoai: [{ ngay: "2026-09-20", ketQua: "CON_Y_KIEN" as const, noiDung: "Đơn giá theo PL VIII QĐ 106/2025" }] } };
    const h1 = { ...ho[1]!, yKienPA: { loai: "DONG_Y" as const, ngayLay: "2026-09-01" } };
    const ds2 = [{ h: h0, k: ds[0]!.k }, { h: h1, k: ds[1]!.k }];
    const { t, du } = tao("T12", ds2, ds2[0]);
    expect(t).toContain("Căn cứ điểm a khoản 3 Điều 87 Luật Đất đai năm 2024");
    expect(t).toContain("ngày 01/09/2026");
    expect(t).toContain("Đề nghị xem lại đơn giá cây nhãn");
    expect(t).toContain("Đơn giá theo PL VIII QĐ 106/2025");
    expect(t).toContain("Người có đất còn ý kiến không đồng ý");
    expect(t).toContain(h0.ten);
    expect(kiemTraThongNhat("T12", duAn, du).some((x) => /đối thoại chỉ bắt buộc/.test(x))).toBe(false);
    expect(kiemTraThongNhat("T12", duAn, tao("T12", ds2, ds2[1]).du).some((x) => /đối thoại chỉ bắt buộc/.test(x))).toBe(true);
    // mẫu 08: để trống thì đếm từ bước 7; nhập tay thì giữ số nhập
    const b = tao("08", ds2);
    expect([b.du.so_dong_y, b.du.so_khong_dong_y, b.du.so_y_kien_khac]).toEqual(["1", "1", "0"]);
    expect(tao("08", ds2, undefined, { so_dong_y: "15" }).du.so_dong_y).toBe("15");
  });

  it("1.0.6 Mẫu 20, 21 thưởng bàn giao sớm: danh sách, tổng, bằng chữ từ bàn giao; thiếu khai báo mốc thì báo", () => {
    const cauHinh = { moc: [{ ten: "Mốc 1", denNgay: "2026-10-31", tyLe: "10", toiDa: "20000000" }], coSo: ["BT_DAT" as const, "BT_TAI_SAN" as const], canCu: "Điều 15 Phụ lục II QĐ 106/2025/QĐ-UBND" };
    const duAnT = { ...duAn, thuongBanGiao: cauHinh };
    const h0 = { ...ho[0]!, banGiao: { ngay: "2026-10-05", bienBan: "01/BB", nguoiGhi: "a" } };
    const h1 = { ...ho[1]!, banGiao: { ngay: "2026-10-06", bienBan: "02/BB", nguoiGhi: "a", thuong: { moc: "Mốc 1", soTien: "7500000", canCu: "x" } } };
    const ds2 = [{ h: h0, k: tinhHo(cs, duAnT, h0) }, { h: h1, k: ds[1]!.k }, { h: ho[1]!, k: ds[1]!.k }];
    const { t, du } = tao("21", ds2, undefined, {}, duAnT);
    expect(du.so_ho_thuong).toBe("2");
    expect(t).toContain("7.500.000");
    expect(t).toContain("20.000.000"); // hộ 01: 10% cơ sở vượt mức tối đa
    expect(du.tong_tien_thuong).toBe("27.500.000");
    expect(String(du.tong_tien_thuong_chu)).toMatch(/^Hai mươi bảy triệu năm trăm nghìn đồng/);
    expect(t).toContain("05/10/2026");
    expect(kiemTraThongNhat("21", duAnT, du).some((x) => /chưa ghi bàn giao/.test(x))).toBe(true);
    // chưa khai báo mốc: hộ chưa lưu thưởng không có số, báo thiếu khai báo
    const k2 = tao("20", [{ h: h0, k: ds[0]!.k }]);
    expect(kiemTraThongNhat("20", duAn, k2.du).some((x) => /chưa khai báo đủ mốc/.test(x))).toBe(true);
  });

  it("1.0.5 T10/T11 chi trả bồi thường chậm (điểm b k3 Đ94): hộ chậm do cơ quan, tiền chậm trả theo tỷ lệ cán bộ nhập, bằng chữ", async () => {
    const hB = { ...ho[0]!, id: "ho-b", ma: "H99", ten: "Hộ thử chậm do người dân" };
    const pa = await chotPhuongAn(cs, duAn, [ho[0]!, hB], { ten: "B1", lyDo: "", nguoi: "x" });
    const daDuyet = pheDuyet(pa, { so: "5/QĐ-UBND", ngay: "2026-08-01", coQuan: "UBND xã" }, "x");
    const duAnPa = { ...duAn, phuongAn: [daDuyet] };
    const h0 = { ...ho[0]!, chiTra: { dot: [], nguyenNhanCham: "DO_CO_QUAN" as const } };
    const h1 = { ...hB, chiTra: { dot: [], nguyenNhanCham: "DO_NGUOI_DAN" as const } };
    const dsC = [{ h: h0, k: ds[0]!.k }, { h: h1, k: ds[0]!.k }];
    const m = DANH_MUC_MAU.find((x) => x.ma === "T10")!;
    const rieng = { ...Object.fromEntries(m.nhapThem.map((t) => [t.truong, t.macDinh ?? ""])), ly_do_cham: "Chậm bố trí vốn" };
    const du = ghepDuLieu({ mau: m, duAn: duAnPa, ds: dsC, chung, rieng, so: "3", ngayKy: "2026-10-01", tyLeCham: [{ tuNgay: "2026-01-01", tyLe: "0.03", canCu: "khoản 2 Điều 59 Luật Quản lý thuế" }] });
    expect(du.so_ho_cham).toBe(1); // hộ chậm do người có đất bị loại
    const t = vanBan(dienMau(docMau("T10"), du));
    expect(t).toContain("Căn cứ điểm b khoản 3 Điều 94 Luật Đất đai năm 2024");
    expect(t).toContain("Kính gửi: Chủ tịch Ủy ban nhân dân");
    expect(t).toContain("khoản 2 Điều 59 Luật Quản lý thuế");
    expect(t).toContain(ho[0]!.ten);
    expect(t).not.toContain("Hộ thử chậm do người dân");
    // hạn 31/08/2026; tạm tính đến 01/10/2026 = 31 ngày × 0,03%
    const phaiTra = Number(String(du.ds_cham_tra && (du.ds_cham_tra as { phai_tra: string }[])[0]!.phai_tra).replace(/\./g, ""));
    expect((du.ds_cham_tra as { tien_cham: string }[])[0]!.tien_cham).toBe(Math.round(phaiTra * 0.0003 * 31).toLocaleString("vi-VN"));
    expect(String(du.tong_cham_tra_chu)).toMatch(/đồng/);
    const k = kiemTraThongNhat("T10", duAnPa, du);
    expect(k.some((x) => /chưa xác nhận nguyên nhân/.test(x))).toBe(false);
  });

  it("1.0.5 T8/T9 bố trí tái định cư (Điều 111): quỹ lô, giá, dự kiến bố trí từng hộ, niêm yết 15 ngày; công bố có số QĐ", () => {
    const duAnTdc = { ...duAn, quyTdc: { lo: [{ id: "l1", khu: "Khu TĐC Bản Mẫu", soLo: "A-01", loai: "DAT_O" as const, dienTich: "120", gia: "1500000", canCuGia: "NQ 152/2025, Bảng 05" }, { id: "l2", khu: "Khu TĐC Bản Mẫu", soLo: "A-02", loai: "DAT_O" as const, dienTich: "100" }] } };
    const h0 = { ...ho[0]!, hoTro: { ...ho[0]!.hoTro, taiDinhCu: { hinhThuc: "DAT_O" as const, loId: "l1", dienTichGiao: "120", donGia: "1500000", khoanKhac: [] } } };
    const ds3 = [{ h: h0, k: tinhHo(cs, duAnTdc, h0) }];
    const { t, du } = tao("T8", ds3, undefined, { niem_yet_tu: "01/10/2026", niem_yet_den: "16/10/2026", han_y_kien: "16/10/2026", noi_niem_yet: "nhà văn hóa bản Mẫu" }, duAnTdc);
    expect(t).toContain("Căn cứ khoản 1 Điều 111 Luật Đất đai năm 2024");
    expect(t).toContain("Khu TĐC Bản Mẫu");
    expect(t).toContain("2 lô đất ở, tổng diện tích 220,00 m²");
    expect(t).toContain("ít nhất 15 ngày, từ ngày 01/10/2026 đến ngày 16/10/2026");
    expect(t).toContain("Dự kiến: Hộ mẫu 01");
    expect(t).toContain("Khu TĐC Bản Mẫu – lô A-01");
    expect(t).toContain("180.000.000"); // tiền SDĐ = 1.500.000 × 120
    expect(t).toContain("1.500.000");
    expect(du.so_ho_tdc).toBe(1);
    const c = tao("T9", ds3, undefined, { qd_tdc_so: "88/QĐ-UBND", qd_tdc_ngay: "20/10/2026", qd_tdc_co_quan: "Chủ tịch Ủy ban nhân dân xã Mẫu" }, duAnTdc).t;
    expect(c).toContain("Căn cứ Quyết định số 88/QĐ-UBND ngày 20/10/2026 của Chủ tịch Ủy ban nhân dân xã Mẫu");
    expect(c).toContain("khoản 2 Điều 111");
  });

  it("T3 Thông báo kèm danh sách: mỗi thửa một dòng, vợ/chồng dòng 2, ký hiệu loại đất", () => {
    const { t } = tao("T3");
    expect(t).toContain("(Kèm theo Thông báo số 25/TB-UBND ngày 27/09/2026 của Ủy ban nhân dân xã Chiềng Mung)");
    expect(t).toMatch(/1\s*Hộ mẫu 01\s*vợ: Thành viên A\s*Tổ dân phố mẫu\s*9\.222,10\s*5\s*85\s*CLN/);
    expect(t).toMatch(/Tổ dân phố mẫu\s*600,00\s*5\s*12\s*HNK\s*Thu hồi một phần/);
  });

  it("T1 Kế hoạch: mốc lấy từ lịch dự kiến của dự án", () => {
    const d2 = { ...duAn, keHoach: { "1": "2026-03-20", "3": "2026-03-25", "9": "2026-07-23", "13": "2026-08-02" } };
    const { du, t } = tao("T1", ds, undefined, {}, d2);
    expect(t).toContain("khu đất: dự kiến hoàn thành trước ngày 20/03/2026.");
    expect(t).toContain("phê duyệt phương án trước ngày 23/07/2026.");
    expect(t).toMatch(/9\s*Phê duyệt phương án\s*23\/07\/2026/);
    expect(kiemTraThongNhat("T1", d2, du)).toEqual([]);
    expect(kiemTraThongNhat("T1", duAn, tao("T1").du)[0]).toMatch(/chưa lập kế hoạch/);
  });

  it("kiểm tra thống nhất: tên cơ quan cũ, bằng chữ lệch, thiếu số văn bản, tổng biểu lệch", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "T3")!;
    const du = ghepDuLieu({ mau: m, duAn: { ...duAn, xa: "Thành phố Sơn La" }, ds, chung: { ...chung, can_cu_du_an: "Căn cứ Quyết định số 1/QĐ-UBND của UBND thành phố Sơn La về giao nhiệm vụ;" }, rieng: {}, so: "", ngayKy: "" });
    const cb = kiemTraThongNhat("T3", { ...duAn, xa: "Thành phố Sơn La" }, { ...du, tong_gia_tri_chu: "Một đồng", bang_thua_tong: "1,00" });
    expect(cb.some((c) => c.includes("không bắt đầu bằng \"Xã\""))).toBe(true);
    expect(cb.some((c) => c.includes("UBND thành phố Sơn La"))).toBe(true);
    expect(cb.some((c) => c.includes("Chưa nhập số văn bản"))).toBe(true);
    expect(cb.some((c) => c.includes("không khớp bằng chữ"))).toBe(true);
    expect(cb.some((c) => c.includes("khác diện tích ghi trong văn bản"))).toBe(true);
  });

  it("căn cứ bỏ chọn không in; NQ 254/2025/QH15 mặc định không in (chưa có nguyên văn)", () => {
    const m = DANH_MUC_MAU.find((x) => x.ma === "14")!;
    const c0 = thongTinChungMacDinh(duAn);
    const du = ghepDuLieu({ mau: m, duAn, ds, chung: c0, rieng: {}, so: "", ngayKy: "" });
    expect((du.can_cu as string[]).some((c) => c.includes("254/2025/QH15"))).toBe(false);
    const du2 = ghepDuLieu({ mau: m, duAn, ds, chung: { ...c0, can_cu_bo: CAN_CU_MAC_DINH[3]! }, rieng: {}, so: "", ngayKy: "" });
    expect((du2.can_cu as string[]).some((c) => c.includes("254/2025/QH15"))).toBe(true);
    expect((du2.can_cu as string[]).some((c) => c.includes("88/2024/NĐ-CP"))).toBe(false);
  });

  it("tài sản không bồi thường, hỗ trợ: dòng thành tiền 0 kèm lý do, căn cứ; thiếu lý do → cần xác nhận", () => {
    const ts0 = ho[0]!.taiSan[0]!;
    const h0 = { ...ho[0]!, taiSan: [{ ...ts0, khongBtHt: { lyDo: "Xây dựng sau thông báo thu hồi đất", canCu: "Điều 105 Luật Đất đai 2024" } }, ...ho[0]!.taiSan.slice(1)] };
    const k0 = tinhHo(cs, duAn, ho[0]!), k1 = tinhHo(cs, duAn, h0);
    const d = k1.tatCa.find((x) => x.taiSanId === ts0.id)!;
    expect(d.dong.noiDung).toBe(`Không bồi thường, hỗ trợ – ${ts0.ten}`);
    expect(d.dong.thanhTien!.toNumber()).toBe(0);
    expect(d.dong.trangThai).toBe("TAM_TINH");
    expect(d.dong.thamSo["Lý do"]).toBe("Xây dựng sau thông báo thu hồi đất");
    expect(k1.tong.tongChuaLamTron.lt(k0.tong.tongChuaLamTron)).toBe(true);
    const h1 = { ...h0, taiSan: [{ ...ts0, khongBtHt: { lyDo: "", canCu: "" } }] };
    expect(tinhHo(cs, duAn, h1).tatCa.find((x) => x.taiSanId === ts0.id)!.dong.trangThai).toBe("CAN_XAC_NHAN");
  });
});

import { CAN_CU_DA_THAY, capNhatCanCu } from "../src/van-ban/du-lieu";
describe("1.0.5: căn cứ mặc định theo QĐ 64/2026", () => {
  it("có QĐ 64/2026, NĐ 49/2026 (mặc định không in vì dẫn NQ 254), Luật sửa đổi 130/2025, 116/2025; cập nhật dòng cũ", () => {
    expect(CAN_CU_MAC_DINH.some((c) => c.includes("Quyết định số 64/2026/QĐ-UBND ngày 06 tháng 10 năm 2026"))).toBe(true);
    expect(CAN_CU_MAC_DINH[1]).toContain("số 130/2025/QH15, số 146/2025/QH15, số 147/2025/QH15 và số 116/2025/QH15");
    const c0 = thongTinChungMacDinh(duAn);
    expect(c0.can_cu_bo).toContain("49/2026/NĐ-CP");
    const cu = Object.keys(CAN_CU_DA_THAY)[0]!;
    const r = capNhatCanCu([cu, CAN_CU_MAC_DINH[0]!, "Căn cứ riêng X;"].join("\n"));
    expect(r.chu.split("\n")).not.toContain(cu);
    expect(r.chu.split("\n")).toContain(CAN_CU_MAC_DINH[1]);
    expect(r.chu).toContain("Căn cứ riêng X;");
    expect(r.chu.split("\n").filter((x) => x === CAN_CU_MAC_DINH[1]).length).toBe(1);
    expect(capNhatCanCu(CAN_CU_MAC_DINH.join("\n")).soDoi).toBe(0);
  });
});

import { canhBaoCanCu } from "../src/van-ban-can-cu";
describe("1.0.5: hiệu lực văn bản căn cứ", () => {
  it("dẫn QĐ 106/2025 mà thiếu QĐ 64/2026 sau 06/10/2026 → nhắc; trước ngày hiệu lực → không; căn cứ mặc định → không nhắc", () => {
    const cc = ["Căn cứ Quyết định số 106/2025/QĐ-UBND ngày 06 tháng 10 năm 2025;"];
    expect(canhBaoCanCu(cc, "2026-10-08").join(" ")).toMatch(/64\/2026\/QĐ-UBND/);
    expect(canhBaoCanCu(cc, "2026-10-01")).toEqual([]);
    expect(canhBaoCanCu(CAN_CU_MAC_DINH, "2026-10-08")).toEqual([]);
    expect(canhBaoCanCu(["Căn cứ Nghị định số 88/2024/NĐ-CP;"]).join(" ")).toMatch(/226\/2025/);
  });
});
