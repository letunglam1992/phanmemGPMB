/** Phụ lục II QĐ 106/2025 trong tính toán hộ (0.8.4): Điều 3, 7, 11, 12, 13; hệ số điều chỉnh k8/k10 linh động (QD-30). */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho, Thua } from "../src/mo-hinh";
import { tinhHo } from "../src/tinh-ho";
import { truongLoi, truongSoHo } from "../src/so";

const cs = cs0 as unknown as BoChinhSach;
const { duAn: da0, ho } = taoDuAnMau();
const duAn: DuAn = { ...da0, ngayThongBao: "2026-04-15", hanMucNN: { m2: "20000", canCu: "PL I QĐ 106 (thử)" }, giaGao: { dongKg: "15000", nguon: "thử" } };
const h0 = ho[0]!;
const t0: Thua = { ...h0.thua[0]!, gia: { giaNghinDong: "50", nguon: "Bảng thử" } };
const hoVoi = (p: Partial<Thua>, them: Partial<Ho> = {}): Ho => ({ ...h0, thua: [{ ...t0, ...p }], taiSan: [], ...them });
const tim = (h: Ho, ma: string, d: DuAn = duAn) => tinhHo(cs, d, h).tatCa.filter((x) => x.dong.ma === ma);

describe("Điều 3 — chi phí đầu tư vào đất còn lại", () => {
  it("k2: 01 lần giá đất × DT thu hồi; k1: theo dự toán (bắt buộc căn cứ)", () => {
    const k2 = tim(hoVoi({ dienTichThuHoi: "200", chiPhiDauTu: { cach: "GIA_DAT" } }), "B07")[0]!;
    expect(k2.dong.thanhTien!.toString()).toBe("10000000");
    expect(k2.cot).toBe("BT_DAT");
    expect(tim(hoVoi({ chiPhiDauTu: { cach: "DU_TOAN", soTien: "7000000" } }), "B07")[0]!.dong.trangThai).toBe("THIEU_CAN_CU");
    expect(tim(hoVoi({ chiPhiDauTu: { cach: "DU_TOAN", soTien: "7000000", canCu: "QĐ 12/QĐ-UBND xã" } }), "B07")[0]!.dong.thanhTien!.toString()).toBe("7000000");
  });
});

describe("Điều 7 — hành lang bảo vệ an toàn", () => {
  it("đất trong hành lang điện: giá thửa × hệ số dự án × tỷ lệ nhóm đất", () => {
    const h = hoVoi({ hanhLang: { loai: "DIEN", nhomDat: "CLN_RSX", dienTich: "100", canCu: "BB trích đo" } });
    expect(tim(h, "B08")[0]!.dong.thanhTien!.toString()).toBe("2500000");
    const hs = tim(h, "B08", { ...duAn, heSoGiaDat: { heSo: "1.2", vanBan: "QĐ hệ số (thử)" } })[0]!.dong;
    expect(hs.thanhTien!.toString()).toBe("3000000");
    expect(tim(hoVoi({ hanhLang: { loai: "DIEN", nhomDat: "HNK", dienTich: "100" } }), "B08")[0]!.dong.trangThai).toBe("CAN_XAC_NHAN"); // thiếu căn cứ DT
    expect(tim(hoVoi({ hanhLang: { loai: "KHAC", nhomDat: "HNK", dienTich: "100", canCu: "x" } }), "B09")[0]!.dong.trangThai).toBe("THIEU_CAN_CU");
  });
  it("nhà trong hành lang: điểm a 70% (bồi thường); điểm b theo mốc k3 × 70%, cần lý do (hỗ trợ)", () => {
    const nha = (hl: { diem: "a" | "b"; lyDo?: string }, k3?: { truongHop: "3.2"; ngayXayDung: string }): Ho =>
      hoVoi({}, { taiSan: [{ id: "n", thuaId: t0.id, dot: 1, loai: "NHA_CT", ten: "Nhà", maDonGia: "X", donVi: "m2", donGia: "1000000", khoiLuong: "10", cachTinh: "HANH_LANG", hanhLang: hl, k3, phan: "BOI_THUONG", canCu: "" }] });
    const a = tinhHo(cs, duAn, nha({ diem: "a" })).nhom.find((x) => x.ma === "A.II")!.dong[0]!.dong;
    expect([a.ma, a.thanhTien!.toString()]).toEqual(["A12", "7000000"]);
    const b0 = tinhHo(cs, duAn, nha({ diem: "b" })).nhom.find((x) => x.ma === "B.II")!.dong[0]!.dong;
    expect(b0.trangThai).toBe("THIEU_CAN_CU");
    const b1 = tinhHo(cs, duAn, nha({ diem: "b" }, { truongHop: "3.2", ngayXayDung: "2010-05-01" })).nhom.find((x) => x.ma === "B.II")!.dong[0]!.dong;
    expect([b1.thanhTien!.toString(), b1.trangThai]).toEqual(["3500000", "CAN_XAC_NHAN"]); // 10tr × 50% × 70%
    const b2 = tinhHo(cs, duAn, nha({ diem: "b", lyDo: "Áp dụng mức k3 Đ6 QĐ14 thay Đ17 hết hiệu lực" }, { truongHop: "3.2", ngayXayDung: "2010-05-01" })).nhom.find((x) => x.ma === "B.II")!.dong[0]!.dong;
    expect(b2.trangThai).toBe("TAM_TINH");
    expect(b2.luaChon.map((x) => x.ma)).toContain("Đ7.3b");
  });
});

describe("Điều 11, 12, 13", () => {
  it("Điều 11 thuê nhà; Điều 13 SXKD, định mức ổn định sản xuất; k4 trợ cấp ngừng việc", () => {
    const h: Ho = {
      ...hoVoi({}),
      hoTro: {
        ...h0.hoTro,
        khac: {
          khoan: [{ id: "x", loai: "D13_K4", noiDung: "Trợ cấp ngừng việc", soTien: "5000000", canCu: "HĐLĐ số 1" }],
          nhaNhaNuoc: { cach: "THUE", soThang: "3", nhanKhau: "2" },
          sxkd: { cach: "K3", thuNhap: "", doanhThu: "150000000", canCu: "CV Thuế số 2" },
          onDinhSanXuat: { dk: [], soTien: "", canCu: "Định mức thử", coSo: "D13", dinhMuc: { hnDt: "10000", hnDinhMuc: "5000000", lnDt: "", lnChiPhi: "" } },
        },
      },
    };
    const kq = tinhHo(cs, duAn, h);
    const g = (ma: string) => kq.tatCa.find((x) => x.dong.ma === ma)!.dong;
    expect(g("C09").thanhTien!.toString()).toBe("6000000");
    expect(g("C04").thanhTien!.toString()).toBe("4800000");
    expect(g("C03").thanhTien!.toString()).toBe("10000000");
    expect(g("C05").thanhTien!.toString()).toBe("5000000");
    expect(g("C05").canhBao.join(" ")).toMatch(/tối đa không quá 6 tháng/);
  });
  it("Điều 12 điểm b k1: số nhân khẩu có chung quyền sử dụng đất nhập được", () => {
    const co = (nhanKhau?: string): Ho => ({ ...h0, hoTro: { ...h0.hoTro, onDinh: { dienTichNNDangSuDung: String(Number(h0.thua.reduce((s, t) => s + Number(t.dienTichThuHoi || 0), 0)) * 4), diChuyen: "KHONG_DI_CHUYEN", nhanKhau } } });
    const a = tim(co(), "C01")[0]!.dong;
    const b = tim(co("1"), "C01")[0]!.dong;
    expect(a.thanhTien!.div(b.thanhTien!).toNumber()).toBe(h0.nhanKhau.length);
    expect(truongLoi(truongSoHo(co("x")))).toHaveLength(1);
  });
});

describe("QD-30 — hệ số điều chỉnh giá đất cho khoản 8, 10: người dùng chọn", () => {
  const da = { ...duAn, heSoGiaDat: { heSo: "1.5", vanBan: "QĐ hệ số (thử)" } };
  const cl = (heSo?: { apDung: boolean; lyDo: string }) =>
    tim(hoVoi({ dienTichThuHoi: "100", chenhLech: { truongHop: "K10", loaiHienTrang: "CLN", giaHienTrang: "80", nguonGia: "Bảng thử", heSo } }), "B14", da)[0]!.dong;
  it("chưa chọn → nhân hệ số, Cần xác nhận; chọn không nhân + lý do → giá bảng giá", () => {
    expect([cl().thanhTien!.toString(), cl().trangThai]).toEqual(["4500000", "CAN_XAC_NHAN"]);
    expect([cl({ apDung: true, lyDo: "Theo giá đất tính tiền bồi thường" }).thanhTien!.toString(), cl({ apDung: true, lyDo: "x" }).trangThai]).toEqual(["4500000", "TAM_TINH"]);
    const k = cl({ apDung: false, lyDo: "Văn bản ghi giá đất trong bảng giá" });
    expect([k.thanhTien!.toString(), k.trangThai, k.luaChon[0]!.ma]).toEqual(["3000000", "TAM_TINH", "QD-30"]);
  });
});
