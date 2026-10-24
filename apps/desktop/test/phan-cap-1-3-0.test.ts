import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { QD27_MAC_DINH, canhBaoThamQuyen, cauHinhThamQuyen, datCauHinhThamQuyen, ghiChuThamQuyen, hanBaoCaoPhanCap, loiCauHinh } from "../src/van-ban/tham-quyen";
import { apDungThamQuyenMau, mauTheoMa } from "../src/van-ban/danh-muc";
import { duLieuBaoCaoPhanCap, thongKePhanCap } from "../src/bao-cao-phan-cap";
import { canhBaoChung } from "../src/trang-thai";
import { dienMau } from "../src/van-ban/dien-mau";
import type { VanBanDi } from "../src/so-van-ban";

const vb = (p: Partial<VanBanDi>): VanBanDi => ({ so: 1, kyHieu: "QĐ-UBND", soDayDu: "1/QĐ-UBND", ngay: "2026-08-10", ma: "15", tenMau: "QĐ thu hồi đất", duAnId: "d1", duAnTen: "Dự án A", ...p });
afterEach(() => { datCauHinhThamQuyen(null); apDungThamQuyenMau(); });

describe("1.3.0 (A3) — văn bản phân cấp cấu hình được", () => {
  it("mặc định QĐ 27; đổi sang văn bản thay thế thì mô tả mẫu, cảnh báo ngày ký theo văn bản mới", () => {
    expect(cauHinhThamQuyen().so).toBe("27/2026/QĐ-UBND");
    expect(mauTheoMa("15").moTa).toContain("khoản 1, 2 mục I Phụ lục II QĐ 27/2026/QĐ-UBND");
    const moi = { ...QD27_MAC_DINH, so: "05/2027/QĐ-UBND", hieuLucTu: "2027-03-01", hetHieuLucTu: "", nhiemVu: QD27_MAC_DINH.nhiemVu.map((n) => (n.ma === "THU_HOI" ? { ...n, viTri: "khoản 1 Điều 2" } : n)) };
    expect(loiCauHinh(moi)).toBeNull();
    datCauHinhThamQuyen(moi);
    apDungThamQuyenMau();
    expect(mauTheoMa("15").moTa).toContain("khoản 1 Điều 2 QĐ 05/2027/QĐ-UBND");
    expect(mauTheoMa("15").moTa).not.toContain("27/2026");
    expect(mauTheoMa("15").moTa!.match(/Thẩm quyền:/g)).toHaveLength(1);
    expect(canhBaoThamQuyen("15", "2027-05-01")).toEqual([]);
    expect(canhBaoThamQuyen("15", "2027-02-01")[0]).toContain("trước ngày QĐ 05/2027/QĐ-UBND có hiệu lực");
    expect(ghiChuThamQuyen("15")).not.toContain("đến trước");
    // nhiệm vụ không còn phân cấp: bỏ mẫu → mô tả không còn ghi thẩm quyền
    datCauHinhThamQuyen({ ...moi, nhiemVu: moi.nhiemVu.map((n) => (n.ma === "THU_HOI" ? { ...n, mau: [] } : n)) });
    apDungThamQuyenMau();
    expect(mauTheoMa("15").moTa).not.toContain("Thẩm quyền:");
    expect(loiCauHinh({ ...moi, hetHieuLucTu: "2026-01-01" })).toContain("phải sau");
  });
});

describe("1.3.0 (A1) — báo cáo 06 tháng kết quả phân cấp", () => {
  it("hạn trước 15/6, 15/12; kỳ từ hạn trước (không trước ngày hiệu lực); hết hiệu lực thì không nhắc", () => {
    expect(hanBaoCaoPhanCap("2026-10-23")).toEqual({ han: "2026-12-15", tu: "2026-06-30", den: "2026-12-14" });
    expect(hanBaoCaoPhanCap("2027-01-10")).toBeNull(); // hạn 15/6/2027 sau ngày QĐ 27 hết hiệu lực
    expect(canhBaoChung("2026-12-02").some((c) => c.baoCaoPhanCap && c.canCu === "khoản 2 Điều 4 QĐ 27/2026/QĐ-UBND")).toBe(true);
    expect(canhBaoChung("2026-11-20").some((c) => c.baoCaoPhanCap)).toBe(false);
  });
  it("đếm theo nhiệm vụ từ Sổ văn bản đi (mẫu, ghi tay có nhiệm vụ), bỏ trùng, ngoài kỳ; điền mẫu Word", () => {
    const ds = [
      vb({}),
      vb({ soDayDu: "1/QĐ-UBND", luc: "x" }), // tạo lại cùng số → không đếm hai lần
      vb({ so: 2, soDayDu: "2/QĐ-UBND", ma: "T26", ngay: "2026-09-01" }),
      vb({ so: 3, soDayDu: "3/QĐ-UBND", ma: "NGOAI", nhiemVu: "HOI_DONG", tenMau: "QĐ thành lập Hội đồng" }),
      vb({ so: 4, soDayDu: "4/QĐ-UBND", ma: "T18" }), // không thuộc phân cấp
      vb({ so: 5, soDayDu: "5/QĐ-UBND", ngay: "2026-05-01" }), // ngoài kỳ
    ];
    const tk = thongKePhanCap(ds, "2026-06-30", "2026-12-14");
    const n = Object.fromEntries(tk.map((x) => [x.nv.ma, x.ds.length]));
    expect(n).toMatchObject({ THU_HOI: 1, PHE_DUYET_PA: 1, HOI_DONG: 1, THONG_BAO: 0 });
    const du = duLieuBaoCaoPhanCap(tk, "2026-06-30", "2026-12-14", { so: "12", ngayKy: "2026-12-10", tenXa: "Xã Chiềng Mung", diaDanh: "Chiềng Mung", kinhGui: "Ủy ban nhân dân tỉnh Sơn La (qua Sở Nông nghiệp và Môi trường)", khoKhan: "", kienNghi: "Không.", noiDungKhac: "", noiNhan: "Như trên\nLưu: VT", quyenHan: "Chủ tịch", nguoiKy: "Cán bộ mẫu" });
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-phan-cap.docx", import.meta.url));
    const t = new PizZip(dienMau(mau, du)).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
    expect(t).toContain("(Từ ngày 30/06/2026 đến ngày 14/12/2026)");
    expect(t).toContain("Thực hiện khoản 2 Điều 4 Quyết định số 27/2026/QĐ-UBND");
    expect(t).toContain("đã ban hành 3 văn bản thuộc 3 nhiệm vụ được phân cấp");
    expect(t).toContain("1/QĐ-UBND ngày 10/08/2026 (Dự án A)");
    expect(t).toContain("khoản 3 mục II Phụ lục II");
    expect(t).toContain("CHỦ TỊCH");
    expect(t).not.toMatch(/\{[#/^]?[\w.]+\}/);
  });
});

describe("1.3.0 (B) — dùng lại dữ liệu; so sánh kỳ trước", () => {
  it("kỳ trước liền kề cùng độ dài; báo cáo có cột Kỳ trước, câu so sánh", async () => {
    const { kyTruoc } = await import("../src/bao-cao-phan-cap");
    expect(kyTruoc("2026-06-30", "2026-12-14")).toEqual({ tu: "2026-01-13", den: "2026-06-29" });
    const ds = [vb({}), vb({ so: 9, soDayDu: "9/QĐ-UBND", ngay: "2026-03-01" }), vb({ so: 8, soDayDu: "8/QĐ-UBND", ngay: "2026-04-01" })];
    const k = kyTruoc("2026-06-30", "2026-12-14");
    const du = duLieuBaoCaoPhanCap(thongKePhanCap(ds, "2026-06-30", "2026-12-14"), "2026-06-30", "2026-12-14", { so: "", ngayKy: "", tenXa: "Xã A", diaDanh: "", kinhGui: "x", khoKhan: "", kienNghi: "", noiDungKhac: "", noiNhan: "", quyenHan: "", nguoiKy: "" }, undefined, { ...k, dong: thongKePhanCap(ds, k.tu, k.den) });
    expect(du.cau_ky_truoc).toBe("So với kỳ trước (13/01/2026–29/06/2026: 2 văn bản): giảm 1 văn bản.");
    expect((du.ds_nv as { so_truoc: string }[])[0]!.so_truoc).toBe("2");
  });
  it("T27, T28 lấy thành viên Ban (T16 đã soạn); T31 lấy căn nhà ở từ quỹ TĐC, giá = đ/m² × diện tích", async () => {
    const { macDinhDungLai } = await import("../src/van-ban/tao-nhanh");
    const da = { id: "d", ten: "A", xa: "Xã A", vanBan: { thanh_vien_ban: "Ông A – Phó Chủ tịch UBND xã, Trưởng ban\nBà B – thành viên" },
      quyTdc: { lo: [
        { id: "1", khu: "Khu TĐC bản Mẫu", soLo: "A1", loai: "NHA_O", dienTich: "60.5", gia: "14000000", canCuGia: "Chứng thư thẩm định giá số 12/CT" },
        { id: "2", khu: "Khu TĐC bản Mẫu", soLo: "A2", loai: "NHA_O", dienTich: "72", giuLai: "tranh chấp" },
        { id: "3", khu: "Khu TĐC bản Mẫu", soLo: "L1", loai: "DAT_O", dienTich: "100" },
      ] } } as unknown as import("../src/mo-hinh").DuAn;
    expect(macDinhDungLai("T27", da)).toEqual({ tp_ban: "Ông A – Phó Chủ tịch UBND xã, Trưởng ban\nBà B – thành viên" });
    expect(macDinhDungLai("T28", da)).toEqual({ tp_chu_tri: "Ông A – Phó Chủ tịch UBND xã, Trưởng ban" });
    expect(macDinhDungLai("T31", da)).toEqual({ gia_ban_chi_tiet: "Khu TĐC bản Mẫu – căn A1 | 60,5 | 847000000", can_cu_gia: "Căn cứ Chứng thư thẩm định giá số 12/CT;", dia_diem_nha_tdc: "Khu TĐC bản Mẫu" });
    expect(macDinhDungLai("T31", { ...da, quyTdc: { lo: [] } } as typeof da)).toEqual({});
  });
});
