/** B03, B04, B05 — Điều 8, 9, 10, 12 NĐ 88/2024 trong tính toán hộ (0.8.5). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho, KhongGiayTo, Thua } from "../src/mo-hinh";
import { tinhHo } from "../src/tinh-ho";

const cs = cs0 as unknown as BoChinhSach;
const { duAn: da0, ho } = taoDuAnMau();
const duAn: DuAn = { ...da0, heSoGiaDat: null, hanMucNN: { m2: "3000", canCu: "QĐ hạn mức (thử)" }, hanMucDatO: { congNhan: "400", giao: "200", canCu: "QĐ hạn mức đất ở (thử)" } };
const h0 = ho[0]!;
const thua = (k: KhongGiayTo, p: Partial<Thua> = {}): Ho => ({
  ...h0,
  taiSan: [],
  thua: [{ ...h0.thua[0]!, loaiDat: "ONT", dienTich: "600", dienTichThuHoi: "500", phanLop: undefined, gia: { giaNghinDong: "1000", nguon: "Bảng 05 (thử)" }, khongGiayTo: k, ...p }],
});
const dong = (h: Ho, d: DuAn = duAn) => tinhHo(cs, d, h).tatCa.filter((x) => x.thuaId === h.thua[0]!.id && x.cot.endsWith("DAT"));
const tien = (h: Ho, ma: string, d?: DuAn) => dong(h, d).find((x) => x.dong.ma === ma)?.dong;
const nn = { giaNghinDong: "50", nguon: "Bảng 01 (thử)", loaiDat: "CLN" };

describe("Điều 8 — không có giấy tờ", () => {
  it("k2: đất ở = hạn mức công nhận; SXKD; phần còn lại theo đất NN; thay dòng B01", () => {
    const h = thua({ dieu: "D8", ngaySuDung: "1990-01-01", dtSxkd: "50", giaSxkd: { giaNghinDong: "600", nguon: "Bảng 07 (thử)" }, giaConLai: nn });
    const ds = dong(h);
    expect(ds.some((x) => x.dong.ma === "B01")).toBe(false);
    expect(tien(h, "B03")!.thanhTien!.toString()).toBe("400000000");
    expect(tien(h, "B03.KD")!.thanhTien!.toString()).toBe("30000000");
    expect(tien(h, "B03.NN")!.thanhTien!.toString()).toBe("2500000");
    expect(tien(h, "B03")!.canCu[0]).toEqual({ vanBan: "NĐ 88/2024/NĐ-CP", viTri: "điểm a, c, d khoản 2 Điều 8" });
  });
  it("k1 đoạn 2 điểm a: DT xây dựng vượt hạn mức → trừ tiền SDĐ phải nộp (bắt buộc căn cứ)", () => {
    const k: KhongGiayTo = { dieu: "D8", ngaySuDung: "1975-01-01", dtXayDung: "450", giaConLai: nn };
    expect(tien(thua(k), "B03")!.thanhTien!.toString()).toBe("450000000");
    expect(tien(thua(k), "B03.T")!.trangThai).toBe("THIEU_CAN_CU");
    expect(tien(thua({ ...k, tienSdd: "20000000", canCuTienSdd: "TB thuế số 1 (thử)" }), "B03.T")!.thanhTien!.toString()).toBe("-20000000");
  });
  it("VM-39: k1, DT thu hồi < hạn mức ≤ DT thửa → Cần xác nhận; có lý do → Tạm tính", () => {
    const k: KhongGiayTo = { dieu: "D8", ngaySuDung: "1975-01-01" };
    expect(tien(thua(k, { dienTichThuHoi: "100" }), "B03")!.trangThai).toBe("CAN_XAC_NHAN");
    expect(tien(thua({ ...k, lyDoVm39: "Theo hướng dẫn của Sở (thử)" }, { dienTichThuHoi: "100" }), "B03")!.trangThai).toBe("TAM_TINH");
  });
  it("thiếu hạn mức đất ở → Thiếu căn cứ", () => {
    expect(tien(thua({ dieu: "D8", ngaySuDung: "1990-01-01" }), "B03", { ...duAn, hanMucDatO: undefined })!.trangThai).toBe("THIEU_CAN_CU");
  });
});

describe("Điều 9, 10", () => {
  it("Điều 9: ≤ hạn mức giao; phần còn lại người dùng chọn (bắt buộc lý do)", () => {
    const k: KhongGiayTo = { dieu: "D9", ngaySuDung: "2000-01-01" };
    expect(tien(thua(k), "B04")!.thanhTien!.toString()).toBe("200000000");
    expect(tien(thua(k), "B04.CL")!.trangThai).toBe("CAN_XAC_NHAN");
    expect(tien(thua({ ...k, conLai: { cach: "NN", lyDo: "x" }, giaConLai: nn }), "B04.CL")!.thanhTien!.toString()).toBe("15000000");
    expect(tien(thua({ ...k, conLai: { cach: "KHONG", lyDo: "x" } }), "B04.CL")!.thanhTien!.toString()).toBe("0");
  });
  it("Điều 10 k3 có điểm a, b k3 Đ140: đất ở theo hạn mức giao, còn lại theo hiện trạng", () => {
    const h = thua({ dieu: "D10", ngaySuDung: "2008-01-01", d140: true, giaConLai: nn });
    expect(tien(h, "B04")!.thanhTien!.toString()).toBe("200000000");
    expect(tien(h, "B04.NN")!.noiDung).toMatch(/hiện trạng/);
  });
});

describe("Điều 12 — đất nông nghiệp", () => {
  const nnHo = (k: KhongGiayTo) => thua(k, { loaiDat: "CLN", dienTich: "5000", dienTichThuHoi: "5000", gia: { giaNghinDong: "50", nguon: "Bảng 01 (thử)" } });
  it("≤ hạn mức; phần vượt hỗ trợ khác k7 (cán bộ nhập); trước 01/7/2004 không giấy tờ → toàn bộ", () => {
    expect(tien(nnHo({ dieu: "D12", ngaySuDung: "", truongHopNN: "K2" }), "B05")!.thanhTien!.toString()).toBe("150000000");
    expect(tien(nnHo({ dieu: "D12", ngaySuDung: "", truongHopNN: "K2" }), "B05.K7")!.trangThai).toBe("THIEU_CAN_CU");
    expect(tien(nnHo({ dieu: "D12", ngaySuDung: "", truongHopNN: "K2", hoTroK7: { soTien: "30000000", canCu: "QĐ UBND tỉnh (thử)" } }), "B05.K7")!.thanhTien!.toString()).toBe("30000000");
    expect(tien(nnHo({ dieu: "D12", ngaySuDung: "", truongHopNN: "K1", truoc2004TrucTiepSx: true }), "B05")!.thanhTien!.toString()).toBe("250000000");
  });
  it("đất tự khai hoang: hạn mức theo Điều 7 Phụ lục I QĐ 106/2025; loại đất không có trong Điều 7 → Thiếu căn cứ", () => {
    const b05 = tien(nnHo({ dieu: "D12", ngaySuDung: "", truongHopNN: "K2_KHAI_HOANG" }), "B05")!;
    expect(b05.thanhTien!.toString()).toBe("250000000");
    expect(b05.thamSo["Hạn mức"]).toContain("khoản 1 Điều 7 Phụ lục I QĐ 106/2025/QĐ-UBND, điểm b (tại xã)");
    const rdd = thua({ dieu: "D12", ngaySuDung: "", truongHopNN: "K2_KHAI_HOANG" }, { loaiDat: "RDD", dienTich: "5000", dienTichThuHoi: "5000", gia: { giaNghinDong: "50", nguon: "Bảng 01 (thử)" } });
    expect(tien(rdd, "B05")!.trangThai).toBe("THIEU_CAN_CU");
    expect(tien(thua({ dieu: "D12", ngaySuDung: "", truongHopNN: "K2_KHAI_HOANG" }, { loaiDat: "RSX", dienTich: "5000", dienTichThuHoi: "5000", gia: { giaNghinDong: "50", nguon: "x" } }), "B05")!.canhBao.join(" ")).toContain("rừng trồng");
  });
});

describe("Hạn mức đất ở theo Phụ lục I QĐ 106/2025 (vị trí thửa)", () => {
  it("xã: Điều 3 (trước 1980), Điều 4 (1980–1993) công nhận; Điều 5 giao — ưu tiên hơn hạn mức dự án", () => {
    expect(duAn.xa.startsWith("Xã")).toBe(true);
    const b03 = tien(thua({ dieu: "D8", ngaySuDung: "1975-01-01", viTriHanMuc: "CON_LAI", giaConLai: nn }), "B03")!;
    expect(b03.thanhTien!.toString()).toBe("450000000");
    expect(b03.thamSo["Hạn mức công nhận đất ở"]).toContain("Điều 3 Phụ lục I QĐ 106/2025/QĐ-UBND, điểm b khoản 1 (tại xã)");
    expect(tien(thua({ dieu: "D8", ngaySuDung: "1990-01-01", viTriHanMuc: "TRUNG_TAM", giaConLai: nn }), "B03")!.thanhTien!.toString()).toBe("350000000");
    expect(tien(thua({ dieu: "D9", ngaySuDung: "2000-01-01", viTriHanMuc: "TRUNG_TAM" }), "B04")!.thanhTien!.toString()).toBe("150000000");
    expect(tien(thua({ dieu: "D8", ngaySuDung: "2000-01-01", viTriHanMuc: "DUONG_XA", giaConLai: nn }), "B03")!.thamSo["Hạn mức giao đất ở"]).toContain("180,00 m² (Điều 5 Phụ lục I");
  });
  it("phường: Điều 4, Điều 6; hạn mức riêng của thửa vẫn được ưu tiên", () => {
    const p = { ...duAn, xa: "Phường Tô Hiệu" };
    expect(tien(thua({ dieu: "D8", ngaySuDung: "1990-01-01", viTriHanMuc: "CON_LAI", giaConLai: nn }), "B03", p)!.thanhTien!.toString()).toBe("150000000");
    expect(tien(thua({ dieu: "D8", ngaySuDung: "2000-01-01", viTriHanMuc: "TRUNG_TAM", giaConLai: nn }), "B03", p)!.thanhTien!.toString()).toBe("100000000");
    expect(tien(thua({ dieu: "D8", ngaySuDung: "2000-01-01", viTriHanMuc: "TRUNG_TAM", hanMuc: "90", canCuHanMuc: "x", giaConLai: nn }), "B03", p)!.thanhTien!.toString()).toBe("90000000");
  });
});

describe("VM-11 — biểu thức khối lượng đồng/ha/năm", () => {
  it("=(10-4)*0,5 → 3", async () => {
    const { thuTinh } = await import("../src/bieu-thuc");
    expect(thuTinh("=(10-4)*0,5").giaTri?.toString()).toBe("3");
  });
});
