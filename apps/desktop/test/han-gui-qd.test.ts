import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import goc from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { BO_CHINH_SACH } from "../src/du-lieu";
import { DINH_DANG_GOI, dangKyGoi, docGoi } from "../src/goi-chinh-sach";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, ghiThamDinh, pheDuyet } from "../src/phuong-an";
import { hanGuiQdBan } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { canhBaoDuAn } from "../src/trang-thai";
import { tinhHo } from "../src/tinh-ho";
import { lichTuBan } from "../src/tong-hop-tinh/goi-tinh";
import { docTepNhap, taoMauNhap } from "../src/nhap-excel";
import type { Ho } from "../src/mo-hinh";

const cs = goc as unknown as BoChinhSach;
const O = { ten: "PA 1", lyDo: "", nguoi: "A", luc: "2026-09-27T08:00:00.000Z" };

describe("1.0.14 — lịch đi kèm gói, hạn gửi QĐ (bước 11), nhập Excel theo bộ của hộ", () => {
  it("lịch ngày nghỉ của đơn vị gửi đọc từ gói; dữ liệu hỏng → chỉ trừ T7, CN", () => {
    expect(lichTuBan({ caiDat: { lichLamViec: { nghi: [{ ngay: "2026-10-13", ten: "Nghỉ bù" }, { ngay: "sai", ten: "" }, "x"], lamBu: [], namDaDu: [2026, "2027"] } } })).toEqual({ nghi: [{ ngay: "2026-10-13", ten: "Nghỉ bù" }], lamBu: [], namDaDu: [2026] });
    expect(lichTuBan({ caiDat: {} })).toEqual(LICH_TRONG);
    expect(lichTuBan({})).toEqual(LICH_TRONG);
  });

  it("hạn gửi QĐ phê duyệt đến từng người: 3 NLV từ ngày QĐ (hoặc ngày xong bước 9); hộ đã xong bước 11 không tính; theo lịch nghỉ", async () => {
    const { duAn, ho } = taoDuAnMau();
    const p = ghiThamDinh(await chotPhuongAn(cs, duAn, [ho[0]!], O), { so: "1", ngay: "2026-10-01", coQuan: "PKT", yKien: "THONG_NHAT" }, "B");
    expect(hanGuiQdBan(p, ho, "2026-10-10", LICH_TRONG)).toBeNull();
    const d = pheDuyet(p, { so: "5/QĐ-UBND", ngay: "2026-10-09", coQuan: "UBND xã" }, "L");
    const t = hanGuiQdBan(d, ho, "2026-10-15", LICH_TRONG)!;
    expect(t.hanChot).toBe("2026-10-14"); // T6 09/10 → 12, 13, 14/10
    expect(t.trangThai).toBe("QUA_HAN");
    // lịch có ngày nghỉ 13/10 → hạn lùi sang 15/10
    expect(hanGuiQdBan(d, ho, "2026-10-15", { nghi: [{ ngay: "2026-10-13", ten: "Nghỉ" }], lamBu: [], namDaDu: [2026] })!.hanChot).toBe("2026-10-15");
    const xong: Ho = { ...ho[0]!, tienDo: { ...ho[0]!.tienDo, "11": { trangThai: "XONG", ngay: "2026-10-12" } } };
    expect(hanGuiQdBan(d, [xong], "2026-10-15", LICH_TRONG)).toBeNull();
    expect(hanGuiQdBan({ ...d, pheDuyet: { ...d.pheDuyet!, ngay: "" } }, ho, "2026-10-15", LICH_TRONG)).toBeNull();
    const da = { ...duAn, phuongAn: [d] };
    const cb = canhBaoDuAn(da, ho.map((h) => ({ h, k: tinhHo(cs, da, h) })), "2026-10-15");
    expect(cb.filter((c) => /quá hạn gửi quyết định phê duyệt/.test(c.noiDung))).toHaveLength(1);
    expect(cb.some((c) => c.noiDung.startsWith(`${ho[0]!.ma} ·`) && /bước 11/.test(c.noiDung))).toBe(false);
  });

  it("nhập Excel kiểm đếm: mã đơn giá tra theo bộ chính sách của hộ (gói kèm bảng đơn giá riêng)", async () => {
    const c = structuredClone(goc) as unknown as Record<string, unknown>;
    c.ma = "SONLA-THU-2031";
    const donGia = { canCu: "Quyết định số 31/2031/QĐ-UBND (thử)", dong: [{ nguon: "PL VIII", ma: "Z9/9", nhom: "Cây ăn quả", ten: "Cây riêng của gói", donVi: "cây", donGia: 77000, matDo: 400 }] };
    const r = await docGoi(JSON.stringify({ dinhDang: DINH_DANG_GOI, khoa: "sonla-thu-2031", chinhSach: c, donGia }), Object.keys(BO_CHINH_SACH));
    expect(r.loi).toEqual([]);
    dangKyGoi([{ khoa: "sonla-thu-2031", ten: "Thử", ma: "SONLA-THU-2031", hieuLucTu: "2026-03-31", hieuLucDen: null, sha256: r.goi!.sha256, tenTep: "x.json", napLuc: "", napBoi: "", noiDung: r.goi!.noiDung, donGia: r.goi!.donGia }]);
    const { duAn, ho } = taoDuAnMau();
    const da = { ...duAn, boChinhSach: "sonla-2026-03-31" };
    const [a, b] = ho as [Ho, Ho];
    const hos = [{ ...a, boChinhSach: "sonla-thu-2031" }, b];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await taoMauNhap()).buffer as ArrayBuffer);
    const ws = wb.getWorksheet("KiemDem")!;
    ws.addRow([a.ma, a.thua[0]!.soTo, a.thua[0]!.soThua, "Z9/9", 3]);
    ws.addRow([b.ma, b.thua[0]!.soTo, b.thua[0]!.soThua, "Z9/9", 3]);
    const k = await docTepNhap(new Uint8Array(await wb.xlsx.writeBuffer()), da, hos);
    const loiMa = k.loi.filter((l) => l.cot === "maDonGia" || /Mã đơn giá/.test(l.noiDung));
    expect(loiMa).toHaveLength(1); // chỉ hộ dùng bộ của dự án báo không có mã
    expect(loiMa[0]!.noiDung).toMatch(/Z9\/9/);
    expect(k.hoBoSung.find((h) => h.id === a.id)!.taiSan.some((t) => "maDonGia" in t && t.maDonGia === "Z9/9")).toBe(true);
  });
});
