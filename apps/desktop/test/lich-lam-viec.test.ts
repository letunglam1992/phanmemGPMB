import { describe, expect, it } from "vitest";
import { hanChot, laNgayLamViec, namThieuLich, soNgayLamViec, type LichLamViec } from "../src/lich-lam-viec";
import { HAN_BUOC, tinhHanBuoc } from "../src/han-buoc";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { Ho } from "../src/mo-hinh";
import { canhBaoChung, canhBaoDuAn } from "../src/trang-thai";
import { tinhHo } from "../src/tinh-ho";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";

// 2026: 01/10 thứ Năm, 02/10 thứ Sáu, 03–04/10 cuối tuần
const lich: LichLamViec = { nghi: [{ ngay: "2026-10-05", ten: "Nghỉ giả định" }], lamBu: [{ ngay: "2026-10-10", ten: "Làm bù giả định (thứ Bảy)" }], namDaDu: [2026] };
const trong: LichLamViec = { nghi: [], lamBu: [], namDaDu: [] };

describe("Ngày làm việc (VM-25)", () => {
  it("thứ Bảy, Chủ nhật, ngày nghỉ nhập tay; ngày làm bù", () => {
    expect(laNgayLamViec("2026-10-02", lich)).toBe(true);
    expect(laNgayLamViec("2026-10-03", lich)).toBe(false);
    expect(laNgayLamViec("2026-10-05", lich)).toBe(false);
    expect(laNgayLamViec("2026-10-10", lich)).toBe(true);
  });
  it("hạn n NLV: ngày đầu là ngày liền sau mốc; bỏ cuối tuần, ngày nghỉ", () => {
    // mốc thứ Năm 01/10: NLV 1 = 02/10, 2 = 06/10 (bỏ 03, 04, nghỉ 05), 3 = 07/10
    expect(hanChot("2026-10-01", 3, "NLV", lich)).toBe("2026-10-07");
    expect(hanChot("2026-10-01", 3, "NLV", trong)).toBe("2026-10-06");
    expect(hanChot("2026-10-01", 10, "N", lich)).toBe("2026-10-11");
    expect(soNgayLamViec("2026-10-01", "2026-10-07", lich)).toBe(3);
    expect(soNgayLamViec("2026-10-07", "2026-10-01", lich)).toBe(-3);
    expect(namThieuLich("2026-12-20", "2027-01-10", lich)).toEqual([2027]);
  });
  it("hạn theo bước: mốc từ bước trước, mốc nhập tay; quá hạn, sắp hết, xong quá hạn; hạn ngày rơi vào ngày nghỉ được lùi", () => {
    const { ho } = taoDuAnMau();
    const h = (tienDo: Ho["tienDo"]): Ho => ({ ...ho[0]!, tienDo });
    const b11 = HAN_BUOC.find((x) => x.buoc === "11")!;
    const b13 = HAN_BUOC.find((x) => x.buoc === "13")!;
    expect(tinhHanBuoc(h({}), b11, "2026-10-01", lich).trangThai).toBe("CHUA_CO_MOC");
    const co9 = h({ "9": { trangThai: "XONG", ngay: "2026-10-01" } });
    expect(tinhHanBuoc(co9, b11, "2026-10-02", lich)).toMatchObject({ hanChot: "2026-10-07", trangThai: "CON_HAN", conLai: 2 });
    expect(tinhHanBuoc(co9, b11, "2026-10-06", lich).trangThai).toBe("SAP_HET");
    expect(tinhHanBuoc(co9, b11, "2026-10-08", lich).trangThai).toBe("QUA_HAN");
    expect(tinhHanBuoc(h({ "9": { trangThai: "XONG", ngay: "2026-10-01" }, "11": { trangThai: "XONG", ngay: "2026-10-09" } }), b11, "2026-10-20", lich).trangThai).toBe("XONG_QUA_HAN");
    // 10 N từ 24/09 → 04/10 (Chủ nhật) → lùi sang thứ Hai 05/10 (nghỉ) → 06/10
    expect(tinhHanBuoc(h({ "13": { trangThai: "DANG", mocHan: "2026-09-24" } }), b13, "2026-09-25", lich).hanChot).toBe("2026-10-06");
  });

  it("thời gian không tính vào thời hạn: có lý do mới tính; chưa có ngày kết thúc → tạm dừng", () => {
    const { ho } = taoDuAnMau();
    const b11 = HAN_BUOC.find((x) => x.buoc === "11")!;
    const h = (kt: { tu: string; den?: string; lyDo: string }[]): Ho => ({ ...ho[0]!, tienDo: { "9": { trangThai: "XONG", ngay: "2026-10-01" }, "11": { trangThai: "DANG", khongTinh: kt } } });
    const goc = tinhHanBuoc(h([]), b11, "2026-10-02", lich);
    expect(goc).toMatchObject({ hanChot: "2026-10-07", khongTinh: 0 });
    const r = tinhHanBuoc(h([{ tu: "2026-10-02", den: "2026-10-07", lyDo: "Chờ ý kiến cơ quan chuyên môn" }]), b11, "2026-10-08", lich);
    expect(r.khongTinh).toBeGreaterThan(0);
    expect(r.hanChot! > "2026-10-07").toBe(true);
    expect(r.trangThai).not.toBe("QUA_HAN");
    expect(tinhHanBuoc(h([{ tu: "2026-10-02", den: "2026-10-07", lyDo: " " }]), b11, "2026-10-08", lich)).toMatchObject({ khongTinh: 0, trangThai: "QUA_HAN" });
    expect(tinhHanBuoc(h([{ tu: "2026-10-02", lyDo: "Tạm dừng theo văn bản" }]), b11, "2026-10-20", lich).trangThai).toBe("TAM_DUNG");
  });

  it("cảnh báo: bước quá hạn theo ngày làm việc; chưa xác nhận lịch năm", () => {
    const { duAn, ho } = taoDuAnMau();
    const h: Ho = { ...ho[0]!, tienDo: { ...ho[0]!.tienDo, "9": { trangThai: "XONG", ngay: "2026-10-01" } } };
    const cb = canhBaoDuAn(duAn, [{ h, k: tinhHo(cs0 as unknown as BoChinhSach, duAn, h) }], "2026-10-08", lich);
    expect(cb.some((c) => c.muc === "CAO" && c.noiDung.includes("bước 11") && c.noiDung.includes("07/10/2026"))).toBe(true);
    expect(canhBaoChung("2026-10-08", trong).some((c) => c.caiDat)).toBe(true);
    expect(canhBaoChung("2026-10-08", lich).some((c) => c.caiDat)).toBe(false);
  });
});
