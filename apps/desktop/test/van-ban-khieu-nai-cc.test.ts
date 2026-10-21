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
  const tep = readFileSync(new URL(`../public/mau-van-ban/${m.tep}`, import.meta.url));
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
    const r = tao("T14", h, duAn, { can_cu_tham_quyen: "Luật Tổ chức chính quyền địa phương", kn_ket_luan: "Khiếu nại sai.", kn_nguoi_gq_lan_hai: "Chủ tịch UBND tỉnh", can_cu_luat_sua_doi: "Luật số 136/2025/QH15" });
    expect(r.chu).toContain("Về việc giải quyết khiếu nại của " + h.ten);
    expect(r.chu).toContain("Căn cứ Luật Khiếu nại ngày 11 tháng 11 năm 2011;\n");
    expect(r.chu).toContain("Căn cứ Luật số 136/2025/QH15;");
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
    expect(tao("T14", h, duAn, {}, "2026-06-15").chu).not.toContain("155/2026");
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
});
