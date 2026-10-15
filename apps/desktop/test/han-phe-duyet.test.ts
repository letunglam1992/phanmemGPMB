import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, ghiThamDinh, moTaDemBanPA } from "../src/phuong-an";
import { hanPheDuyetBan, ngayIsoTuChu, ngayToTrinhPA } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { canhBaoDuAn } from "../src/trang-thai";
import { tinhHo } from "../src/tinh-ho";
import { mauTheoMa } from "../src/van-ban/danh-muc";
import { taoExcelTinh } from "../src/tong-hop-tinh/excel-tinh";
import type { DongBaoCao } from "../src/tong-hop-tinh/bao-cao-tinh";
import { hoDaSuaSauLuu, taoSoSanhLuu } from "../src/man/ban-do/ranh";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA 1", lyDo: "", nguoi: "A", luc: "2026-09-27T08:00:00.000Z" };

describe("1.0.13 — hạn phê duyệt 5 NLV, Excel tỉnh, so sánh bản đồ đã lưu", () => {
  it("mẫu 13 ghi lại số, ngày tờ trình; ngày tờ trình (dự án / đợt) làm mốc hạn phê duyệt của bản đã thẩm định", async () => {
    expect(mauTheoMa("13").ghiLai).toMatchObject({ khoa: "tt_phe_duyet_pa", capDo: "DU_AN" });
    expect(ngayIsoTuChu("5/10/2026")).toBe("2026-10-05");
    expect(ngayIsoTuChu("ngày 5")).toBeNull();
    const { duAn, ho } = taoDuAnMau();
    const p = await chotPhuongAn(cs, duAn, [ho[0]!], O);
    expect(hanPheDuyetBan(p, ho, "2026-10-10", LICH_TRONG, "2026-10-05")).toBeNull(); // chưa thẩm định
    const td = ghiThamDinh(p, { so: "1", ngay: "2026-10-01", coQuan: "PKT", yKien: "THONG_NHAT" }, "B");
    expect(hanPheDuyetBan(ghiThamDinh(p, { so: "", ngay: "", coQuan: "PKT", yKien: "KHONG_THONG_NHAT" }, "B"), ho, "2026-10-10", LICH_TRONG, "2026-10-05")).toBeNull();
    const da = { ...duAn, phuongAn: [td], vanBan: { ...(duAn.vanBan ?? {}), tt_phe_duyet_pa_ngay: "05/10/2026" } };
    expect(ngayToTrinhPA(da, td)).toBe("2026-10-05");
    const coDotDa = { ...da, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1" }] };
    expect(ngayToTrinhPA(coDotDa, { dotId: "d1" })).toBeNull(); // bản của đợt chỉ lấy tờ trình của đợt
    expect(ngayToTrinhPA({ ...coDotDa, dotThuHoi: [{ ...coDotDa.dotThuHoi[0]!, vanBan: { tt_phe_duyet_pa_ngay: "07/10/2026" } }] }, { dotId: "d1" })).toBe("2026-10-07");
    expect(hanPheDuyetBan(td, ho, "2026-10-08", LICH_TRONG, null)?.trangThai).toBe("CHUA_CO_MOC");
    const t = hanPheDuyetBan(td, ho, "2026-10-14", LICH_TRONG, ngayToTrinhPA(da, td))!;
    expect(t.hanChot).toBe("2026-10-12"); // 5 ngày làm việc sau 05/10/2026 (CN)
    expect(t.trangThai).toBe("QUA_HAN");
    // mốc riêng của hộ (bước 9) được ưu tiên hơn ngày tờ trình
    const h9 = { ...ho[0]!, tienDo: { ...ho[0]!.tienDo, "9": { trangThai: "CHUA" as const, mocHan: "2026-10-09" } } };
    expect(hanPheDuyetBan(td, [h9], "2026-10-14", LICH_TRONG, "2026-10-05")!.hanChot).toBe("2026-10-16");
    const cb = canhBaoDuAn(da, ho.map((h) => ({ h, k: tinhHo(cs, da, h) })), "2026-10-14");
    expect(cb.filter((c) => /quá hạn phê duyệt/.test(c.noiDung))).toHaveLength(1);
    expect(moTaDemBanPA({ choThamDinh: 0, daThamDinh: 2, khongThongNhat: 0, daPheDuyet: 0, quaHanPd: 1 })).toBe("2 bản đã thẩm định, chờ phê duyệt (1 quá hạn phê duyệt)");
  });

  it("Excel tỉnh có trang bản phương án khi gói có số liệu; không có thì không thêm trang", async () => {
    const d = (id: string, xa: string, banPA?: DongBaoCao["banPA"]) => ({ id, ten: `Dự án ${id}`, xa, chuDauTu: "", soHo: 2, theoTrangThai: {}, tongTamTinh: "0", dienTichThuHoi: "0", soVuongMac: 0, soHoDaChotPA: 0, soHoDaDuyetPA: 0, tienDoBinhQuan: 0, soTepDinhKem: 0, donViGui: "UBND xã", luc: "2026-10-15T00:00:00.000Z", ...(banPA ? { banPA } : {}) }) as DongBaoCao;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoExcelTinh([d("a", "Xã A", { choThamDinh: 2, quaHanTd: 1, daThamDinh: 1, quaHanPd: 1, khongThongNhat: 0, daPheDuyet: 3 }), d("b", "Xã B")], "Sở", true)) as unknown as ArrayBuffer);
    const w = wb.getWorksheet("Ban phuong an")!;
    expect(w.getCell("A2").value).toBe("PHỤ LỤC 03");
    const tong = w.getRows(1, w.rowCount)!.find((r) => String(r.getCell(2).value).startsWith("TỔNG CỘNG"))!;
    expect([5, 6, 7, 8, 9, 10].map((c) => tong.getCell(c).value)).toEqual([2, 1, 1, 1, 0, 3]);
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load((await taoExcelTinh([d("b", "Xã B")], "Sở")) as unknown as ArrayBuffer);
    expect(wb2.getWorksheet("Ban phuong an")).toBeUndefined();
  });

  it("so sánh bản đồ đã lưu giữ hồ sơ lúc lưu; nêu hồ sơ đã sửa, mới có, không còn", () => {
    const h = (id: string, dtThua: string, dtThuHoi: string) => ({ id, ma: id.toUpperCase(), ten: id, dtThua, dtThuHoi });
    const x = { ma: "b", soTo: "7", soThua: "2", trangThai: "DOI_DT" as const, dtCu: 400, dtMoi: 500, khacBiet: 100 };
    const r = taoSoSanhLuu({ tep: "moi.dgn", ds: [x] }, "A", "", "2026-10-15T00:00:00.000Z", "s", [{ x, ho: [h("h1", "400", "100"), h("h2", "50", "50")] }]);
    expect(r.hoLuc?.b).toHaveLength(2);
    expect(hoDaSuaSauLuu(r.hoLuc?.b, [h("h1", "400", "120"), h("h3", "10", "10")])).toEqual(["H1: lúc lưu 400 / 100 m²", "H3: mới có thửa này sau khi lưu", "H2: không còn thửa này trong hồ sơ"]);
    expect(hoDaSuaSauLuu(undefined, [h("h1", "1", "1")])).toEqual([]);
  });
});
