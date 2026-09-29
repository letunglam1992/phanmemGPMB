import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { DuAn, Ho, TaiSan, Thua } from "../src/mo-hinh";
import { tinhHo } from "../src/tinh-ho";

const cs = cs0 as unknown as BoChinhSach;
const { duAn: da0, ho } = taoDuAnMau();
const duAn: DuAn = { ...da0, ngayThongBao: "2026-04-15", hanMucNN: { m2: "20000", canCu: "PL I QĐ 106 (thử)" } };
const h0 = ho[0]!;
const t0 = h0.thua[0]!;
const nhom = (h: Ho, ma: string, d: DuAn = duAn) => tinhHo(cs, d, h).nhom.find((x) => x.ma === ma)?.dong ?? [];

describe("Khoản 3 Điều 6 — hỗ trợ nhà, công trình theo mốc xây dựng", () => {
  const nha = (k3: Extract<TaiSan, { loai: "NHA_CT" }>["k3"]): Ho => ({
    ...h0,
    taiSan: [{ id: "n", thuaId: t0.id, dot: 1, loai: "NHA_CT", ten: "Nhà tạm", maDonGia: "X", donVi: "m2", donGia: "1000000", khoiLuong: "10", cachTinh: "MOC_K3", phan: "HO_TRO", canCu: "", k3 }],
  });
  const d = (h: Ho) => nhom(h, "B.II").find((x) => x.taiSanId === "n")!.dong;
  it("3.2: xây 2010 → 50% đơn giá; luôn thuộc phần hỗ trợ", () => {
    const x = d(nha({ truongHop: "3.2", ngayXayDung: "2010-05-01" }));
    expect(x.thanhTien!.toString()).toBe("5000000");
    expect(x.ma).toBe("A09");
    expect(x.canCu[0]!.viTri).toBe("điểm 3.2 khoản 3 Điều 6");
  });
  it("trùng đúng ngày mốc (01/7/2014 ở điểm 3.2) → Cần xác nhận; người dùng chọn mức + lý do → tính", () => {
    const chua = d(nha({ truongHop: "3.2", ngayXayDung: "2014-07-01" }));
    expect(chua.trangThai).toBe("CAN_XAC_NHAN");
    expect(chua.canhBao[0]).toMatch(/trùng đúng ngày mốc/);
    const khongLyDo = d(nha({ truongHop: "3.2", ngayXayDung: "2014-07-01", chonMoc: { moTaMoc: "Sau 01/7/2014 đến trước ngày thông báo thu hồi đất: 30%", lyDo: " " } }));
    expect(khongLyDo.trangThai).toBe("CAN_XAC_NHAN");
    const bang = cs.hoTroNhaDatKhongDuDieuKien.moc;
    const moTa = bang.find((m) => m.den === "2014-07-01")!.moTa;
    const chon = d(nha({ truongHop: "3.2", ngayXayDung: "2014-07-01", chonMoc: { moTaMoc: moTa, lyDo: "Hồ sơ xác nhận hoàn thành trước mốc" } }));
    expect(chon.thanhTien!.toString()).toBe("5000000");
    expect(chon.luaChon[0]!.ma).toBe("QD-12");
  });
  it("3.3: xây sau 01/7/2004 có biên bản vi phạm → không hỗ trợ; thiếu ngày thông báo → Thiếu căn cứ", () => {
    expect(d(nha({ truongHop: "3.3", ngayXayDung: "2010-01-01" })).thanhTien!.toString()).toBe("0");
    const x = tinhHo(cs, { ...duAn, ngayThongBao: "" }, nha({ truongHop: "3.1", ngayXayDung: "2000-01-01" })).nhom.find((g) => g.ma === "B.II")!.dong[0]!.dong;
    expect(x.trangThai).toBe("THIEU_CAN_CU");
  });
});

describe("Khoản 7 Điều 6 — cây trồng không đủ điều kiện bồi thường", () => {
  const coCay = h0.taiSan.some((x) => x.thuaId === t0.id && x.loai === "CAY");
  const vs = (k7?: "A" | "B", nlt = false): Ho => ({ ...h0, thua: h0.thua.map((t) => (t.id === t0.id ? { ...t, cayK7: k7, nongLamTruong: nlt ? { truongHop: "9.1.a", hoSo: "HĐ giao khoán (thử)" } : undefined } : t)) });
  it("a) 100%, b) 80% đơn giá bồi thường; chuyển sang hỗ trợ cây trồng", () => {
    expect(coCay).toBe(true);
    const bt = nhom(vs(), "A.III").filter((x) => x.thuaId === t0.id).reduce((s, x) => s + Number(x.dong.thanhTien ?? 0), 0);
    const a = nhom(vs("A"), "B.III").filter((x) => x.thuaId === t0.id);
    const b = nhom(vs("B"), "B.III").filter((x) => x.thuaId === t0.id);
    expect(a.reduce((s, x) => s + Number(x.dong.thanhTien ?? 0), 0)).toBeCloseTo(bt, 2);
    expect(b.reduce((s, x) => s + Number(x.dong.thanhTien ?? 0), 0)).toBeCloseTo(bt * 0.8, 2);
    expect(b[0]!.dong.canCu[0]!.viTri).toBe("điểm b khoản 7 Điều 6");
    expect(nhom(vs("B"), "A.III").filter((x) => x.thuaId === t0.id)).toHaveLength(0);
  });
  it("thửa nông, lâm trường (9.1) → theo khoản 9, không áp dụng khoản 7", () => {
    const b = nhom(vs("B", true), "B.III").filter((x) => x.thuaId === t0.id);
    expect(b[0]!.dong.canhBao.join(" ")).toMatch(/không áp dụng khoản 7/);
  });
});

describe("Khoản 8, 10 Điều 6 — chênh lệch giá đất, chuyển đổi nghề", () => {
  const vs = (cl: Thua["chenhLech"], gia = "50"): Ho => ({
    ...h0,
    hoTro: { ...h0.hoTro, chuyenDoiNghe: true },
    thua: [{ ...t0, loaiDat: "RSX", dienTichThuHoi: "1000", gia: { giaNghinDong: gia, nguon: "Bảng 03 (thử)" }, chenhLech: cl }],
  });
  const k8 = { truongHop: "K8_RSX" as const, loaiHienTrang: "CLN", giaHienTrang: "80", nguonGia: "Bảng 02 (thử)" };
  it("k8 rừng sản xuất: (giá hiện trạng − giá rừng) × DT ≤ hạn mức; chuyển đổi nghề theo chênh lệch", () => {
    const dat = nhom(vs(k8), "B.I").find((x) => x.dong.ma === "B14")!.dong;
    expect(dat.thanhTien!.toString()).toBe(String(30 * 1000 * 1000));
    expect(dat.canCu[0]!.viTri).toBe("điểm a khoản 8 Điều 6");
    const cdn = nhom(vs(k8), "B.IV").find((x) => x.dong.ma === "B14.CĐN")!.dong;
    expect(cdn.thanhTien!.gt(0)).toBe(true);
    const han = nhom(vs({ ...k8, hanMuc: "600", canCuHanMuc: "QĐ hạn mức (thử)" }), "B.I").find((x) => x.dong.ma === "B14")!.dong;
    expect(han.thanhTien!.toString()).toBe(String(30 * 1000 * 600));
  });
  it("k8 rừng phòng hộ, đặc dụng: bằng giá hiện trạng; k10: chênh lệch, đất không giới hạn hạn mức", () => {
    const rph = nhom(vs({ ...k8, truongHop: "K8_RPH_RDD" }), "B.I").find((x) => x.dong.ma === "B14")!.dong;
    expect(rph.thanhTien!.toString()).toBe(String(80 * 1000 * 1000));
    const k10 = nhom(vs({ ...k8, truongHop: "K10", hanMuc: "600", canCuHanMuc: "x" }), "B.I").find((x) => x.dong.ma === "B14")!.dong;
    expect(k10.thanhTien!.toString()).toBe(String(30 * 1000 * 1000));
    expect(k10.canCu[0]!.viTri).toBe("khoản 10 Điều 6");
  });
  it("thiếu giá hiện trạng → Thiếu căn cứ; giá hiện trạng thấp hơn → 0", () => {
    expect(nhom(vs({ ...k8, giaHienTrang: "" }), "B.I").find((x) => x.dong.ma === "B14")!.dong.trangThai).toBe("THIEU_CAN_CU");
    expect(nhom(vs({ ...k8, giaHienTrang: "40" }), "B.I").find((x) => x.dong.ma === "B14")!.dong.thanhTien!.toString()).toBe("0");
  });
});

describe("Khoản 5 Điều 6 — ổn định sản xuất; 9.1.b chuyển đổi nghề theo Điều 14", () => {
  it("đủ 4 điều kiện + căn cứ → tạm tính; thiếu điều kiện → Cần xác nhận", () => {
    const vs = (dk: boolean[]): Ho => ({ ...h0, hoTro: { ...h0.hoTro, khac: { khoan: [], onDinhSanXuat: { dk, soTien: "7000000", canCu: "Định mức (thử)" } } } });
    const d1 = nhom(vs([true, true, true, true]), "B.VII")[0]!.dong;
    expect(d1).toMatchObject({ ma: "C03.K5", trangThai: "TAM_TINH" });
    expect(d1.canCu[0]!.viTri).toBe("khoản 5 Điều 6");
    expect(nhom(vs([true, false, true, true]), "B.VII")[0]!.dong.trangThai).toBe("CAN_XAC_NHAN");
  });
  it("9.1.b: chuyển đổi nghề ghi chú áp dụng Điều 14 PL II (QD-29)", () => {
    const h: Ho = { ...h0, hoTro: { ...h0.hoTro, chuyenDoiNghe: true }, thua: [{ ...t0, nongLamTruong: { truongHop: "9.1.b", hoSo: "x" } }] };
    const cdn = nhom(h, "B.IV")[0]!.dong;
    expect(cdn.canhBao.join(" ")).toMatch(/Điều 14 Phụ lục II/);
  });
});
