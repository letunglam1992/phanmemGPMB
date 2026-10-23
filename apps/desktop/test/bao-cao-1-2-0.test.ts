import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { donTheoThang, type DonKhieuNai } from "../src/khieu-nai";
import { donTinhTheoThang } from "../src/tong-hop-tinh/dien-bien";
import { duLieuBoSungBaoCaoXa, gopDienBien } from "../src/bao-cao-bo-sung";
import { duLieuBaoCaoTinh, type DongBaoCao } from "../src/tong-hop-tinh/bao-cao-tinh";
import { dienMau } from "../src/van-ban/dien-mau";
import { LICH_TRONG } from "../src/lich-lam-viec";
import type { DuAn, Ho } from "../src/mo-hinh";

const ho = (p: Partial<Ho> = {}): Ho => ({ id: "h1", duAnId: "d1", ma: "H01", loai: "HO_GIA_DINH", ten: "Hộ mẫu", diaChi: "", soDinhDanh: "", dienThoai: "", nhanKhau: [], thua: [], taiSan: [], hoTro: {} as Ho["hoTro"], khauTru: "0", tienDo: {}, nhatKy: [], ...p });
const don = (p: Partial<DonKhieuNai>): DonKhieuNai => ({ id: "k", loai: "KHIEU_NAI", lan: 1, ngayNhan: "2026-08-03", noiDung: "x", ...p });
const duAn = (id: string, ten: string): DuAn => ({ id, ten, xa: "Xã Mẫu" }) as DuAn;
const chu = (b: Uint8Array) => new PizZip(b).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

describe("1.2.0 (D3) — đơn khiếu nại theo tháng", () => {
  it("đơn mới, đã giải quyết theo ngày văn bản; quá hạn tại cuối tháng", () => {
    const h = ho({ khieuNai: [
      don({ id: "a", ngayNhan: "2026-08-03", ngayThuLy: "2026-08-05" }), // thụ lý 05/8 → hạn 30 ngày ≈ 04/9 → quá hạn cuối tháng 9
      don({ id: "b", ngayNhan: "2026-09-10", ngayThuLy: "2026-09-11", ketQua: "DUNG", ngayVb: "2026-10-05" }),
    ] });
    const ds = donTheoThang([h], "2026-10-23", LICH_TRONG);
    expect(ds.map((k) => k.ky)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(ds.map((k) => [k.moi, k.daGiaiQuyet])).toEqual([[1, 0], [1, 0], [0, 1]]);
    expect(ds[0]!.quaHan).toBe(0);
    expect(ds[1]!.quaHan).toBe(1);
    expect(ds[2]!.quaHan).toBe(1); // đơn b đã giải quyết 05/10, đơn a vẫn quá hạn
    expect(donTinhTheoThang([{ khieuNai: { tong: 2, dangGiaiQuyet: 1, quaHan: 1, daGiaiQuyet: 1, soHo: 1, theoThang: ds } }, { khieuNai: { tong: 1, dangGiaiQuyet: 1, quaHan: 0, daGiaiQuyet: 0, soHo: 1, theoThang: [{ ky: "2026-10", moi: 1, daGiaiQuyet: 0, quaHan: 0 }] } }, {}]).at(-1)).toEqual({ ky: "2026-10", moi: 1, daGiaiQuyet: 1, quaHan: 1 });
  });
});

describe("1.2.0 (D2) — báo cáo Word cấp xã, cấp tỉnh", () => {
  const xong = (ngay: string) => ({ trangThai: "XONG" as const, ngay });
  const A = duAn("a", "Dự án A"), B = duAn("b", "Dự án B");
  const hosA = [ho({ id: "1", ma: "A1", tienDo: { "9": xong("2026-09-10") } }), ho({ id: "2", ma: "A2", tienDo: { "9": xong("2026-10-02") }, banGiao: { ngay: "2026-10-10" } as Ho["banGiao"] })];
  const hosB = [ho({ id: "3", ma: "B1", duAnId: "b", khieuNai: [don({ ngayNhan: "2026-08-03", ngayThuLy: "2026-08-05" })], cuongChe: [{ id: "c", loai: "THU_HOI", ngayDuKien: "2026-11-05" }] })];
  it("gộp diễn biến các dự án theo tháng", () => {
    expect(gopDienBien([{ duAn: A, hos: hosA }, { duAn: B, hos: hosB }], "2026-10-23")).toEqual([
      { ky: "2026-09", soHo: 3, duyetPA: 1, banGiao: 0 },
      { ky: "2026-10", soHo: 3, duyetPA: 2, banGiao: 1 },
    ]);
  });
  it("mẫu cấp xã: tiến độ theo tháng, đơn quá hạn, lịch cưỡng chế", () => {
    const bs = duLieuBoSungBaoCaoXa([{ duAn: A, hos: hosA }, { duAn: B, hos: hosB }], "2026-10-23", LICH_TRONG);
    expect(bs.bieu_do_thang).toHaveLength(2);
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-tong-hop.docx", import.meta.url));
    const t = chu(dienMau(mau, { ...bs, vuong_mac: [], du_an: [], theo_dot: [], ho_vuong_mac: [], noi_nhan_ds: [] }));
    expect(t).toContain("Tiến độ theo tháng");
    expect(t).toContain("Đến tháng 10/2026: đã phê duyệt phương án 2/3 hộ");
    expect(t).toContain("[[BIEU_DO_TIEN_DO]]");
    expect(t).toContain("Đơn khiếu nại, kiến nghị quá hạn thụ lý, giải quyết: 1 đơn");
    expect(t).toContain("- Dự án B – B1 Hộ mẫu: Khiếu nại lần 1 nhận ngày 03/08/2026 (quá hạn giải quyết, hạn");
    expect(t).toContain("- 05/11/2026: Dự án B – B1 Hộ mẫu (thu hồi đất); đề nghị Công an bảo đảm trật tự gửi chậm nhất 29/10/2026");
    const rong = chu(dienMau(mau, { vuong_mac: [], du_an: [], theo_dot: [], ho_vuong_mac: [], noi_nhan_ds: [], ...duLieuBoSungBaoCaoXa([{ duAn: A, hos: [] }], "2026-10-23", LICH_TRONG) }));
    expect(rong).not.toContain("Tiến độ theo tháng");
    expect(rong).not.toContain("Lịch cưỡng chế");
  });
  it("mẫu cấp tỉnh: đơn theo tháng, lịch cưỡng chế (không có tên hộ)", () => {
    const d: DongBaoCao = { id: "a", ten: "Dự án 1", xa: "Xã Chiềng Mung", chuDauTu: "", soHo: 3, theoTrangThai: {}, tongTamTinh: "0", dienTichThuHoi: "1", soVuongMac: 0, soHoDaChotPA: 0, soHoDaDuyetPA: 0, tienDoBinhQuan: 0, soTepDinhKem: 0, donViGui: "UBND xã", luc: "2026-10-15T00:00:00Z",
      khieuNai: { tong: 2, dangGiaiQuyet: 1, quaHan: 1, daGiaiQuyet: 1, soHo: 1, theoThang: [{ ky: "2026-09", moi: 1, daGiaiQuyet: 0, quaHan: 1 }, { ky: "2026-10", moi: 2, daGiaiQuyet: 1, quaHan: 1 }] },
      cuongChe: { kiemDem: 0, thuHoi: 1, dangThucHien: 1, lich: [{ ngay: "2026-11-05", loai: "THU_HOI" }] } };
    const tt = { coQuanCapTren: "UBND tỉnh", coQuan: "Sở", kyHieu: "S", diaDanh: "Sơn La", kinhGui: "UBND tỉnh", so: "", ngayKy: "2026-10-20", moDau: "", khoKhanKhac: "", nhiemVu: "", kienNghi: "", ketThuc: "", noiNhan: "VT", quyenHan: "GĐ", nguoiKy: "X" };
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-tong-hop-tinh.docx", import.meta.url));
    const t = chu(dienMau(mau, duLieuBaoCaoTinh([d], tt, { phamVi: "tỉnh", denNgay: "2026-10-20", soDonVi: 1, cham: [], nguong: null })));
    expect(t).toContain("Đơn khiếu nại, kiến nghị tháng 10/2026 (đơn vị gửi từ bản 1.2.0): nhận mới 2 đơn, giải quyết 1 đơn, quá hạn 1 đơn; tháng 09/2026: nhận mới 1");
    expect(t).toContain("Lịch cưỡng chế (1 hồ sơ chưa kết thúc");
    expect(t).toContain("- 05/11/2026: Dự án 1 (Xã Chiềng Mung) (cưỡng chế thu hồi đất).");
    expect(t).not.toMatch(/\{[#/^]?[a-z_]+\}/);
    const t0 = chu(dienMau(mau, duLieuBaoCaoTinh([{ ...d, khieuNai: undefined, cuongChe: undefined }], tt, { phamVi: "tỉnh", denNgay: "2026-10-20", soDonVi: 1, cham: [], nguong: null })));
    expect(t0).not.toContain("Lịch cưỡng chế");
  });
});
