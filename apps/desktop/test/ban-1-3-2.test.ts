/** 1.3.2 — A1 căn cứ bảng giá theo ngày ký; A2 kiểm tra phương án theo ngày phê duyệt dự kiến; A3 nguồn giá theo kỳ, cột 90% (k8 Đ7). */
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import PizZip from "pizzip";
import nq152 from "../../../policy/nguon/nq152-2025-bang-gia-dat.json";
import nq28 from "../../../policy/nguon/nq28-2026-sua-bang-gia-dat.json";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { bangGiaHaiKy, type SuaBangGia } from "../src/bang-gia-nq28";
import type { BangGiaDat } from "../src/du-lieu";
import { kiemTraBang, type KetQuaKiemTra, type TrangBang } from "../src/kiem-tra-pa";
import { CAN_CU_BANG_GIA_CU, CAN_CU_BANG_GIA_MOI, goiYCanCuBangGia } from "../src/van-ban-can-cu";
import { laGiaK8, moTaNguonGia, vanBanGiaDat, viTriGiaDat } from "../src/nguon-gia";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { taiLieuBangTinh } from "../src/van-ban/bang-tinh-ho";
import { taoDocx } from "../src/van-ban/tai-lieu-don-gian";
import { taoWorkbook } from "../src/xuat-excel";

const bang = nq152 as unknown as BangGiaDat;
const sua = nq28 as unknown as SuaBangGia;
const cs = cs0 as unknown as BoChinhSach;

describe("A1 — gợi ý căn cứ bảng giá đất theo ngày ký", () => {
  it("mẫu không dẫn giá đất: không gợi ý", () => {
    expect(goiYCanCuBangGia("01", "", "", "2026-11-05")).toBeUndefined();
  });
  it("ký trước 01/11/2026: gợi ý NQ 152; đã có NQ 152 thì thôi", () => {
    const g = goiYCanCuBangGia("14", "Căn cứ Kế hoạch sử dụng đất năm 2026;", "", "2026-10-30")!;
    expect(g.dong).toBe(CAN_CU_BANG_GIA_CU);
    expect(g.canCuMoi.split("\n")).toEqual(["Căn cứ Kế hoạch sử dụng đất năm 2026;", CAN_CU_BANG_GIA_CU]);
    expect(goiYCanCuBangGia("14", CAN_CU_BANG_GIA_CU, "", "2026-10-30")).toBeUndefined();
  });
  it("ký từ 01/11/2026: dòng NQ 152 cũ được thay bằng dòng có NQ 28; đủ thì thôi", () => {
    const g = goiYCanCuBangGia("T26", `A;\n${CAN_CU_BANG_GIA_CU}\nB;`, "", "2026-11-01")!;
    expect(g.dong).toBe(CAN_CU_BANG_GIA_MOI);
    expect(g.dong).toContain("được sửa đổi, bổ sung bởi Nghị quyết số 28/2026/NQ-HĐND ngày 19/10/2026");
    expect(g.canCuMoi.split("\n")).toEqual(["A;", CAN_CU_BANG_GIA_MOI, "B;"]);
    expect(g.lyDo).toContain("Điều 4 NQ 28");
    expect(goiYCanCuBangGia("T26", CAN_CU_BANG_GIA_MOI, "", "2026-11-01")).toBeUndefined();
    // căn cứ đã có ở căn cứ chung cũng tính
    expect(goiYCanCuBangGia("R5", "", CAN_CU_BANG_GIA_MOI, "2026-12-01")).toBeUndefined();
  });
});

// Dòng phương án dạng dọc: một dòng đất với đơn giá đ/m²
const trang = (ten: string, dg: number): TrangBang => ({
  ten: "PA",
  o: [["STT", "Nội dung", "Đơn vị tính", "Khối lượng", "Đơn giá (đồng)", "Tỷ lệ (%)", "Thành tiền (đồng)", "Căn cứ"], [1, ten, "m²", 10, dg, 100, dg * 10, null]],
});
const giaDat = (kq: KetQuaKiemTra | { loi: string }) => {
  if ("loi" in kq) throw new Error(kq.loi);
  return kq.dong[0]!.phatHien.filter((p) => p.loai === "GIA_DAT");
};

describe("A2 — kiểm tra phương án theo ngày phê duyệt dự kiến", () => {
  const hai = bangGiaHaiKy(bang, sua);
  const giaXa = (xa: string) => hai.dat_o.filter((r) => r.xa === xa).flatMap((r) => r.vt.filter((g): g is number => g != null));
  const demGia = (xa: string, g: number) => giaXa(xa).filter((x) => x === g).length;
  // Tuyến bãi bỏ có giá VT1 không trùng dòng nào khác cùng xã
  const bo = hai.dat_o.find((r) => r.ky === "TRUOC" && r.vt[0] != null && demGia(r.xa, r.vt[0]!) === 1)!;
  const them = hai.dat_o.find((r) => r.ky === "TU" && r.vt[0] != null && demGia(r.xa, r.vt[0]!) === 1)!;
  const ma = (xa: string) => (xa.startsWith("Phường") ? "ODT" : "ONT");

  it("bảng gộp hai kỳ đánh dấu tuyến bãi bỏ (trước) và tuyến bổ sung (từ 01/11/2026)", () => {
    expect(hai.nq28_tu).toBe("2026-11-01");
    expect(bo).toBeTruthy();
    expect(them).toBeTruthy();
    expect(hai.dat_o.filter((r) => r.ky === "TU").length).toBe(132);
  });
  it("không nhập ngày: nhận cả hai kỳ như 1.3.1", () => {
    expect(giaDat(kiemTraBang(trang(`Đất ${ma(bo.xa)}`, bo.vt[0]! * 1000), { donGia: [], bangGia: hai, xa: bo.xa }))[0]!.mucDo).toBe("DUNG");
    expect(giaDat(kiemTraBang(trang(`Đất ${ma(them.xa)}`, them.vt[0]! * 1000), { donGia: [], bangGia: hai, xa: them.xa }))[0]!.mucDo).toBe("DUNG");
  });
  it("duyệt từ 01/11/2026 mà dùng tuyến bãi bỏ → cảnh báo; duyệt trước thì đúng", () => {
    const sau = giaDat(kiemTraBang(trang(`Đất ${ma(bo.xa)}`, bo.vt[0]! * 1000), { donGia: [], bangGia: hai, xa: bo.xa, ngayPheDuyet: "2026-11-10" }));
    expect(sau[0]!.mucDo).toBe("CANH_BAO");
    expect(sau[0]!.noiDung).toContain("tuyến đã bãi bỏ từ 01/11/2026");
    expect(sau[0]!.noiDung).toContain("khoản 1 Điều 3 NQ 28");
    const truoc = giaDat(kiemTraBang(trang(`Đất ${ma(bo.xa)}`, bo.vt[0]! * 1000), { donGia: [], bangGia: hai, xa: bo.xa, ngayPheDuyet: "2026-10-20" }));
    expect(truoc[0]!.mucDo).toBe("DUNG");
    expect(truoc[0]!.noiDung).toContain("kỳ trước 01/11/2026");
  });
  it("duyệt trước 01/11/2026 mà dùng tuyến bổ sung theo NQ 28 → cảnh báo", () => {
    const p = giaDat(kiemTraBang(trang(`Đất ${ma(them.xa)}`, them.vt[0]! * 1000), { donGia: [], bangGia: hai, xa: them.xa, ngayPheDuyet: "2026-10-25" }));
    expect(p[0]!.mucDo).toBe("CANH_BAO");
    expect(p[0]!.noiDung).toContain("chỉ áp dụng từ 01/11/2026");
    expect(giaDat(kiemTraBang(trang(`Đất ${ma(them.xa)}`, them.vt[0]! * 1000), { donGia: [], bangGia: hai, xa: them.xa, ngayPheDuyet: "2026-11-01" }))[0]!.mucDo).toBe("DUNG");
  });
  it("dòng ghi giảm do chênh cao, duyệt từ 01/11/2026 → cảnh báo Điều 2 NQ 28 (không tự suy tỷ lệ)", () => {
    const p = giaDat(kiemTraBang(trang(`Đất ${ma(bo.xa)} giảm do chênh cao`, 123456), { donGia: [], bangGia: hai, xa: bo.xa, ngayPheDuyet: "2026-11-02" }));
    expect(p.some((x) => x.mucDo === "CANH_BAO" && x.canCu === "Điều 2 NQ 28/2026/NQ-HĐND")).toBe(true);
    const truoc = giaDat(kiemTraBang(trang(`Đất ${ma(bo.xa)} giảm do chênh cao`, 123456), { donGia: [], bangGia: hai, xa: bo.xa, ngayPheDuyet: "2026-10-02" }));
    expect(truoc.some((x) => x.canCu === "Điều 2 NQ 28/2026/NQ-HĐND")).toBe(false);
  });
});

const K8 = "Khoản 8 Điều 7 (bổ sung bởi khoản 6 Điều 1 NQ 28/2026): 90% × Bảng 05, Phường Tô Hiệu, STT 1 (Đường A), VT1 = 90% × 10000 — NQ 152/2025/NQ-HĐND ngày 29/12/2025 (sửa đổi, bổ sung bởi NQ 28/2026/NQ-HĐND ngày 19/10/2026)";
const MOI = "Bảng 05, Phường Tô Hiệu, STT 9 (Đường B), VT1 — NQ 28/2026/NQ-HĐND ngày 19/10/2026, Phụ lục I";
const CU = "Bảng 05, Phường Tô Hiệu, STT 1 (Đường A), VT1";

describe("A3 — nguồn giá theo kỳ, đánh dấu 90% (k8 Đ7)", () => {
  it("đọc lại chuỗi nguồn: văn bản, vị trí, kỳ", () => {
    expect(vanBanGiaDat(CU)).toBe("NQ 152/2025/NQ-HĐND");
    expect(vanBanGiaDat(MOI)).toBe("NQ 152/2025/NQ-HĐND được sửa đổi, bổ sung bởi NQ 28/2026/NQ-HĐND");
    expect(viTriGiaDat(MOI)).toBe("Bảng 05, Phường Tô Hiệu, STT 9 (Đường B), VT1, Phụ lục I NQ 28/2026/NQ-HĐND");
    expect(viTriGiaDat(K8)).not.toContain("— NQ 152");
    expect(moTaNguonGia(CU)).toBe(`NQ 152/2025/NQ-HĐND: ${CU}`);
    expect(moTaNguonGia("Nhập tay: QĐ giá đất cụ thể số 1")).toBe("Nhập tay: QĐ giá đất cụ thể số 1");
    expect(laGiaK8(K8)).toBe(true);
    expect(laGiaK8(MOI)).toBe(false);
  });

  const { duAn, ho } = taoDuAnMau();
  const h0 = ho[0]!;
  const h = { ...h0, thua: h0.thua.map((t, i) => (i === 0 ? { ...t, gia: { giaNghinDong: "9000", nguon: K8 } } : i === 1 ? { ...t, gia: { giaNghinDong: "5000", nguon: MOI } } : t)) };
  const kq = tinhHo(cs, duAn, h);

  it("Excel phương án: cột giá đất, cột 90% (x), cột nguồn giá theo kỳ", async () => {
    const wb = await taoWorkbook(duAn, [{ h, k: kq }]);
    const buf = await wb.xlsx.writeBuffer();
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buf);
    const chu: string[][] = [];
    wb2.eachSheet((ws) => ws.eachRow((r) => chu.push((r.values as unknown[]).map((v) => String(v ?? "")))));
    const dau = chu.find((r) => r.includes("Nguồn giá đất (kỳ áp dụng)"))!;
    expect(dau).toContain("90% giá đất ở (k8 Đ7)");
    const iK8 = dau.indexOf("90% giá đất ở (k8 Đ7)"), iNg = dau.indexOf("Nguồn giá đất (kỳ áp dụng)");
    const d1 = chu.find((r) => r[iNg]?.startsWith("NQ 152/2025/NQ-HĐND được sửa đổi") && r[iK8] === "x")!;
    expect(d1).toBeTruthy();
    expect(chu.some((r) => r[iNg]?.includes("Phụ lục I NQ 28/2026/NQ-HĐND") && r[iK8] === "")).toBe(true);
  });

  it("Giải trình Word: bảng giá đất áp dụng ghi nguồn theo kỳ, chú thích k8 Đ7", () => {
    const xml = new PizZip(taoDocx(taiLieuBangTinh(duAn, h, kq, new Date("2026-11-05T00:00:00")))).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
    expect(xml).toContain("Giá đất áp dụng:");
    expect(xml).toContain("NQ 152/2025/NQ-HĐND được sửa đổi, bổ sung bởi NQ 28/2026/NQ-HĐND: Bảng 05, Phường Tô Hiệu, STT 9 (Đường B), VT1, Phụ lục I NQ 28/2026/NQ-HĐND");
    expect(xml).toContain("khoản 8 Điều 7 Quy định kèm NQ 152/2025/NQ-HĐND, bổ sung bởi khoản 6 Điều 1 NQ 28/2026/NQ-HĐND");
  });
});
