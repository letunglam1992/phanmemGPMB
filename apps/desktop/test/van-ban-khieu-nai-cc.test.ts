import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho } from "../src/mo-hinh";
import { tinhHo } from "../src/tinh-ho";
import { DANH_MUC_MAU } from "../src/van-ban/danh-muc";
import { ghepDuLieu, thongTinChungMacDinh } from "../src/van-ban/du-lieu";
import { dienMau } from "../src/van-ban/dien-mau";
import { docDuToan, kiemTraThongNhat } from "../src/van-ban/thuc-te";

const cs = cs0 as unknown as BoChinhSach;
const chu = (u8: Uint8Array) => new PizZip(u8).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

function tao(ma: string, h: Ho, duAn: DuAn, rieng: Record<string, string>, ngayKy = "2026-10-20") {
  const m = DANH_MUC_MAU.find((x) => x.ma === ma)!;
  const k = tinhHo(cs, duAn, h);
  const du = ghepDuLieu({ mau: m, duAn, ds: [{ h, k }], ho: { h, k }, chung: thongTinChungMacDinh(duAn), rieng, so: "", ngayKy });
  const tep = readFileSync(new URL(`../public/mau-van-ban/${m.tep ?? `mau-${m.ma}.docx`}`, import.meta.url));
  return { du, chu: chu(dienMau(tep, du)), canhBao: kiemTraThongNhat(ma, duAn, du) };
}

describe("1.0.21 (B2) — mẫu văn bản khiếu nại, cưỡng chế tự điền từ thẻ Khiếu nại", () => {
  const { duAn, ho } = taoDuAnMau();
  const h0 = ho[0]!;
  const h: Ho = {
    ...h0,
    khieuNai: [
      { id: "k1", loai: "KHIEU_NAI", lan: 1, ngayNhan: "2026-09-01", ngayThuLy: "2026-09-08", doiTuong: "Quyết định phê duyệt phương án số 12/QĐ-UBND", noiDung: "Không đồng ý đơn giá cây trồng", vungKhoKhan: true },
    ],
    cuongChe: [{ id: "c1", loai: "THU_HOI", vanDongTu: "2026-10-01", vanDongDen: "2026-10-10", soQd: "88/QĐ-UBND", ngayQd: "2026-10-21", qdBan: "90/QĐ-UBND ngày 22/10/2026", ngayDuKien: "2026-11-05" }],
  };

  it("T14 — Mẫu 15 NĐ 124/2020: căn cứ (NĐ 155/2026 khi ký từ 01/7/2026), đơn, thời hạn khiếu nại lần hai vùng sâu vùng xa 45 ngày", () => {
    const r = tao("T14", h, duAn, { can_cu_tham_quyen: "Luật Tổ chức chính quyền địa phương", kn_ket_luan: "Khiếu nại sai.", kn_nguoi_gq_lan_hai: "Chủ tịch UBND tỉnh" });
    expect(r.chu).toContain("Về việc giải quyết khiếu nại của " + h.ten);
    expect(r.chu).toContain("Căn cứ Luật Khiếu nại ngày 11 tháng 11 năm 2011;\n");
    expect(r.chu).toContain("Căn cứ Luật sửa đổi, bổ sung một số điều của Luật Tiếp công dân, Luật Khiếu nại, Luật Tố cáo ngày 10 tháng 12 năm 2025;");
    expect(tao("T14", h, duAn, {}).chu).toContain("có quyền khiếu nại đến Chủ tịch Ủy ban nhân dân tỉnh");
    expect(r.chu).toContain("Nghị định số 155/2026/NĐ-CP ngày 15 tháng 5 năm 2026");
    expect(r.chu).toContain("Căn cứ Luật Tổ chức chính quyền địa phương;");
    expect(r.chu).toContain("Xét đơn khiếu nại ngày 01 tháng 09 năm 2026");
    expect(r.chu).toContain("khiếu nại Quyết định phê duyệt phương án số 12/QĐ-UBND");
    expect(r.chu).toContain("Không đồng ý đơn giá cây trồng");
    expect(r.chu).toContain("Trong thời hạn 45 ngày");
    expect(r.chu).toContain("có quyền khiếu nại đến Chủ tịch UBND tỉnh");
    expect(r.chu).not.toContain("{");
    expect(r.canhBao.filter((c) => /khiếu nại|thụ lý/.test(c))).toEqual([]);
    // ký trước 01/7/2026 → chỉ NĐ 124/2020
    const truoc = tao("T14", h, duAn, {}, "2026-06-15").chu;
    expect(truoc).not.toContain("155/2026");
    expect(truoc).not.toContain("ngày 10 tháng 12 năm 2025");
    // không có đơn → cảnh báo
    expect(tao("T14", { ...h, khieuNai: [] }, duAn, {}).canhBao.some((c) => c.includes("chưa có đơn khiếu nại lần đầu"))).toBe(true);
  });

  it("T15, T16 — vận động 10 ngày (k7 Đ87), Ban cưỡng chế (điểm a k4 Đ89): số liệu lấy từ hồ sơ cưỡng chế", () => {
    const a = tao("T15", h, duAn, { ket_qua_van_dong: "Hộ chưa đồng ý bàn giao đất." });
    expect(a.chu).toContain("từ ngày 01/10/2026 đến ngày 10/10/2026");
    expect(a.chu).toContain("Hộ chưa đồng ý bàn giao đất.");
    expect(a.chu).not.toContain("{");
    const b = tao("T16", h, duAn, { thanh_vien_ban: "Ông A, Chủ tịch UBND xã — Trưởng ban\nÔng B, đại diện đơn vị bồi thường — thành viên" });
    expect(b.chu).toContain("Căn cứ Quyết định số 88/QĐ-UBND ngày 21/10/2026 về việc cưỡng chế");
    expect(b.chu).toContain("- Ông B, đại diện đơn vị bồi thường — thành viên");
    expect(b.chu).toContain("chậm nhất là 30 ngày kể từ ngày lập biên bản");
    expect(b.chu).not.toContain("{");
    expect(tao("T16", h, duAn, {}).canhBao.some((c) => c.includes("thành viên Ban cưỡng chế"))).toBe(true);
    expect(tao("T16", { ...h, cuongChe: [] }, duAn, {}).canhBao.some((c) => c.includes("chưa có hồ sơ cưỡng chế"))).toBe(true);
  });

  it("T17 — dự toán: cán bộ nhập từng dòng, cộng bằng Decimal, dòng sai không cộng (k6 Đ89)", () => {
    expect(docDuToan("Bồi dưỡng lực lượng | 5.000.000\nThuê phương tiện\t2500000,5\nVăn phòng phẩm | abc")).toMatchObject({ tong_du_toan: "7.500.001", du_toan_loi: 1 });
    const r = tao("T17", h, duAn, { du_toan_kinh_phi: "Bồi dưỡng lực lượng | 5.000.000\nThuê phương tiện | 2.000.000", can_cu_du_toan: "Văn bản định mức (thử)" });
    expect((r.du.ds_du_toan as unknown[]).length).toBe(2);
    expect(r.chu).toContain("Tổng dự toán: 7.000.000 đồng (Bằng chữ: Bảy triệu đồng");
    expect(r.chu).toContain("Thời gian dự kiến bắt đầu: 05/11/2026");
    expect(r.chu).toContain("90/QĐ-UBND ngày 22/10/2026");
    expect(r.chu).not.toContain("{");
    expect(tao("T17", h, duAn, {}).canhBao.some((c) => c.includes("Chưa nhập dự toán"))).toBe(true);
  });

  it("1.0.21 A2 — T18–T22 theo Phụ lục NĐ 155/2026: thụ lý, không thụ lý, đối thoại (vắng không lý do), tạm đình chỉ, tiếp tục", () => {
    const d0 = h.khieuNai![0]!;
    const hk: Ho = { ...h, khieuNai: [{ ...d0, tbThuLy: { so: "15/TB-UBND", ngay: "2026-09-08" }, vangDoiThoai: { ngay: "2026-09-20", coLyDo: false }, tamDinhChi: [{ id: "t", tu: "2026-09-25", den: "2026-10-05", truongHop: "a", lyDo: "Người khiếu nại điều trị tại bệnh viện", soQd: "20/QĐ-UBND" }] }] };
    const t18 = tao("T18", hk, duAn, {});
    expect(t18.chu).toContain("Về việc thụ lý giải quyết khiếu nại lần đầu");
    expect(t18.chu).toContain("Ngày 01/09/2026, Ủy ban nhân dân");
    expect(t18.chu).toContain("đủ điều kiện thụ lý");
    expect(t18.chu).not.toContain("{");
    const t19 = tao("T19", hk, duAn, {});
    expect(t19.canhBao.some((c) => c.includes("lý do không thụ lý"))).toBe(true);
    expect(tao("T19", { ...hk, khieuNai: [{ ...hk.khieuNai![0]!, ketQua: "KHONG_THU_LY", lyDoKhongThuLy: "đã có quyết định giải quyết khiếu nại lần hai" }] }, duAn, {}).chu).toContain("không đủ điều kiện để thụ lý giải quyết vì đã có quyết định giải quyết khiếu nại lần hai");
    const t20 = tao("T20", hk, duAn, { ket_qua_doi_thoai: "Thống nhất nội dung 1." });
    expect(t20.chu).toContain("vắng mặt ngày 20/09/2026 — không có lý do chính đáng; người giải quyết khiếu nại vẫn tiếp tục giải quyết khiếu nại theo khoản 6 Điều 30 Luật Khiếu nại");
    expect(t20.chu).toContain("BIÊN BẢN ĐỐI THOẠI VỚI NGƯỜI KHIẾU NẠI");
    expect(t20.chu).not.toContain("{");
    const t21 = tao("T21", hk, duAn, {});
    expect(t21.chu).toContain("Về việc tạm đình chỉ giải quyết khiếu nại");
    expect(t21.chu).toContain("theo Thông báo thụ lý giải quyết khiếu nại số 15/TB-UBND ngày 08/09/2026");
    expect(t21.chu).toContain("Người khiếu nại điều trị tại bệnh viện; thuộc trường hợp quy định tại điểm a khoản 1 Điều 11a Luật Khiếu nại (sự kiện bất khả kháng, trở ngại khách quan).");
    expect(t21.chu).not.toContain("{");
    const dc = tao("T21", { ...hk, khieuNai: [{ ...hk.khieuNai![0]!, ketQua: "DINH_CHI", dinhChi: { truongHop: "d" } }] }, duAn, {});
    expect(dc.chu).toContain("Về việc đình chỉ giải quyết khiếu nại");
    expect(dc.chu).toContain("Tòa án đã thụ lý hoặc đã giải quyết");
    const t22 = tao("T22", hk, duAn, {});
    expect(t22.chu).toContain("Quyết định tạm đình chỉ giải quyết khiếu nại số 20/QĐ-UBND ngày 25/09/2026");
    expect(t22.chu).toContain("Thời hạn giải quyết khiếu nại tiếp tục được tính từ ngày ban hành Quyết định này");
    expect(t22.chu).not.toContain("{");
    expect(tao("T22", h, duAn, {}).canhBao.some((c) => c.includes("chưa ghi tạm đình chỉ"))).toBe(true);
  });

  it("1.0.21 A3 — cấp số thì ghi ngược vào đơn, hồ sơ cưỡng chế; chỉ ô còn trống", async () => {
    const { ghiNguocVanBan } = await import("../src/ghi-nguoc-van-ban");
    const d0 = h.khieuNai![0]!;
    expect(ghiNguocVanBan(h, "T14", "30/QĐ-UBND", "2026-10-20")!.khieuNai![0]).toMatchObject({ soVb: "30/QĐ-UBND", ngayVb: "2026-10-20" });
    expect(ghiNguocVanBan({ ...h, khieuNai: [{ ...d0, soVb: "29/QĐ-UBND" }] }, "T14", "30/QĐ-UBND", "2026-10-20")!.khieuNai![0]).toMatchObject({ soVb: "29/QĐ-UBND", ngayVb: "2026-10-20" });
    expect(ghiNguocVanBan(h, "T18", "15/TB-UBND", "2026-09-08")!.khieuNai![0]!.tbThuLy).toEqual({ so: "15/TB-UBND", ngay: "2026-09-08" });
    const tdc: Ho = { ...h, khieuNai: [{ ...d0, tamDinhChi: [{ id: "t", tu: "2026-09-25", truongHop: "a", lyDo: "x" }] }] };
    expect(ghiNguocVanBan(tdc, "T21", "20/QĐ-UBND", "2026-09-26")!.khieuNai![0]!.tamDinhChi![0]).toMatchObject({ soQd: "20/QĐ-UBND", tu: "2026-09-26" });
    expect(ghiNguocVanBan(tdc, "T22", "25/QĐ-UBND", "2026-10-05")!.khieuNai![0]!.tamDinhChi![0]).toMatchObject({ den: "2026-10-05", soQdTiepTuc: "25/QĐ-UBND" });
    const cc: Ho = { ...h, cuongChe: [{ id: "c", loai: "THU_HOI" }] };
    expect(ghiNguocVanBan(cc, "22", "88/QĐ-UBND", "2026-10-21")!.cuongChe![0]).toMatchObject({ soQd: "88/QĐ-UBND", ngayQd: "2026-10-21" });
    expect(ghiNguocVanBan(h, "22", "88/QĐ-UBND", "2026-10-21")).toBeNull();
    expect(ghiNguocVanBan(h, "T14", "", "2026-10-20")).toBeNull();
  });

  it("1.0.21 B1, B2 — mẫu 22 lấy ngày dự kiến cưỡng chế, ghi chú Mẫu 01đ NĐ 102; T23 bàn giao đất trên thực địa (Mẫu 06 NĐ 102)", () => {
    expect(DANH_MUC_MAU.find((m) => m.ma === "22")!.moTa).toContain("Mẫu số 01đ");
    expect(DANH_MUC_MAU.find((m) => m.ma === "22")!.ghiLai?.khoa).toBe("qd_cc_thu_hoi");
    const m22 = tao("22", h, duAn, {});
    expect(m22.chu).toContain("Thời gian thực hiện cưỡng chế thu hồi đất từ ngày 05/11/2026");
    const t23 = tao("T23", h, { ...duAn, chuDauTu: "Ban QLDA thử" }, { qd_giao_dat_so: "99/QĐ-UBND", qd_giao_dat_ngay: "01/11/2026", co_quan_giao_dat: "Ủy ban nhân dân tỉnh Sơn La", moc_gioi: "Mốc 1 – mốc 2: 25,0 m\nMốc 2 – mốc 3: 40,0 m;" });
    expect(t23.chu).toContain("Thực hiện Quyết định số 99/QĐ-UBND ngày 01/11/2026 của Ủy ban nhân dân tỉnh Sơn La về việc giao đất");
    expect(t23.chu).toContain("cho Ban QLDA thử đã được giao đất");
    expect(t23.chu).toContain("- Mốc 2 – mốc 3: 40,0 m;");
    expect(t23.chu).not.toContain("{");
  });

  it("1.1.0 A2, A3 — T24 thông báo tổ chức đối thoại; T25 QĐ giải quyết lần hai (Mẫu 16), mặc định Chủ tịch UBND tỉnh", async () => {
    const d0 = h.khieuNai![0]!;
    const hd: Ho = { ...h, khieuNai: [{ ...d0, doiThoai: { ngay: "2026-10-15", diaDiem: "Nhà văn hóa bản Mòng" } }] };
    const t24 = tao("T24", hd, duAn, {});
    expect(t24.chu).toContain("ngày 15/10/2026");
    expect(t24.chu).toContain("Nhà văn hóa bản Mòng");
    expect(t24.chu).toContain(h.ten);
    expect(t24.chu).not.toContain("{");
    expect(tao("T24", h, duAn, {}).canhBao.some((c) => c.includes("chưa ghi ngày tổ chức đối thoại"))).toBe(true);
    const h2: Ho = {
      ...h,
      khieuNai: [
        { ...d0, ketQua: "SAI", soVb: "30/QĐ-UBND", ngayVb: "2026-10-01" },
        { id: "k2", loai: "KHIEU_NAI", lan: 2, ngayNhan: "2026-10-10", doiTuong: "Quyết định số 30/QĐ-UBND", noiDung: "Không đồng ý kết quả lần đầu" },
      ],
    };
    const t25 = tao("T25", h2, duAn, { kn2_thoi_han_khoi_kien: "theo Luật Tố tụng hành chính" });
    expect(t25.chu).toContain("CHỦ TỊCH ỦY BAN NHÂN DÂN TỈNH SƠN LA");
    expect(t25.chu).toContain("Không đồng ý kết quả lần đầu");
    expect(t25.chu).toContain("Quyết định số 30/QĐ-UBND ngày 01/10/2026");
    expect(t25.chu).not.toContain("{");
    expect(t25.canhBao.filter((c) => /lần hai|lần đầu|khởi kiện/.test(c))).toEqual([]);
    const thieu = tao("T25", h, duAn, {}).canhBao;
    expect(thieu.some((c) => c.includes("chưa có đơn khiếu nại lần hai"))).toBe(true);
    expect(thieu.some((c) => c.includes("thời hạn khởi kiện"))).toBe(true);
    const { ghiNguocVanBan } = await import("../src/ghi-nguoc-van-ban");
    const g = ghiNguocVanBan(h2, "T25", "45/QĐ-UBND", "2026-11-20")!.khieuNai!;
    expect(g[1]).toMatchObject({ soVb: "45/QĐ-UBND", ngayVb: "2026-11-20" });
    expect(g[0]!.soVb).toBe("30/QĐ-UBND");
  });

  it("1.1.0 A1, A2 — nhắc gửi QĐ tạm đình chỉ/tiếp tục/đình chỉ trong 03 ngày làm việc; thông báo đối thoại trước ít nhất 05 ngày", async () => {
    const { canhBaoThuTucDon } = await import("../src/khieu-nai");
    const { LICH_TRONG: lich } = await import("../src/lich-lam-viec");
    const d0 = h.khieuNai![0]!;
    // QĐ tạm đình chỉ ngày thứ Năm 01/10/2026 → hạn gửi thứ Ba 06/10/2026
    const tdc = { ...d0, tamDinhChi: [{ id: "t", tu: "2026-10-01", truongHop: "a" as const, lyDo: "x" }] };
    expect(canhBaoThuTucDon(tdc, "2026-10-06", lich)).toEqual([]);
    const c = canhBaoThuTucDon(tdc, "2026-10-07", lich);
    expect(c).toHaveLength(1);
    expect(c[0]!.muc).toBe("CAO");
    expect(c[0]!.noiDung).toContain("06/10/2026");
    expect(c[0]!.canCu).toContain("28b");
    expect(canhBaoThuTucDon({ ...tdc, tamDinhChi: [{ ...tdc.tamDinhChi[0]!, ngayGui: "2026-10-05" }] }, "2026-10-20", lich)).toEqual([]);
    expect(canhBaoThuTucDon({ ...tdc, tamDinhChi: [{ ...tdc.tamDinhChi[0]!, ngayGui: "2026-10-08" }] }, "2026-10-20", lich)[0]!.noiDung).toContain("quá hạn");
    // đình chỉ
    expect(canhBaoThuTucDon({ ...d0, ketQua: "DINH_CHI", dinhChi: { ngay: "2026-10-01" } as never }, "2026-10-20", lich)[0]!.noiDung).toContain("QĐ đình chỉ");
    // đối thoại 15/10/2026 → thông báo chậm nhất 10/10/2026
    const dt = { ...d0, doiThoai: { ngay: "2026-10-15" } };
    expect(canhBaoThuTucDon(dt, "2026-10-05", lich)[0]).toMatchObject({ muc: "TRUNG_BINH" });
    expect(canhBaoThuTucDon(dt, "2026-10-05", lich)[0]!.noiDung).toContain("10/10/2026");
    expect(canhBaoThuTucDon(dt, "2026-10-11", lich)[0]).toMatchObject({ muc: "CAO" });
    expect(canhBaoThuTucDon({ ...dt, doiThoai: { ngay: "2026-10-15", ngayTb: "2026-10-10" } }, "2026-10-11", lich)).toEqual([]);
    expect(canhBaoThuTucDon({ ...dt, doiThoai: { ngay: "2026-10-15", ngayTb: "2026-10-12" } }, "2026-10-11", lich)[0]!.noiDung).toContain("chưa đủ 05 ngày");
    expect(canhBaoThuTucDon({ ...dt, ketQua: "DUNG" }, "2026-10-11", lich)).toEqual([]);
  });
});
