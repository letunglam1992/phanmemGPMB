import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import {
  type BoChinhSach, boiThuongDat, cayTrong, chiPhiDauTuConLai, chonTheoMoc, chuyenDoiNghe, D, datPnnCoThoiHan,
  diDoiVatNuoi, dieuChinhDatNNXenKep, dieuChinhGiaDatPnn, giaTriXayMoi, hoTroTheoMocXayDung, lamTronDienTich, lamTronTien, moMa, nhaCongTrinhThietHaiThucTe,
  onDinhDoiSong, tamCu, tongHo,
} from "../src";

const cs = cs0 as unknown as BoChinhSach;
const tien = (d: { thanhTien: unknown }) => (d.thanhTien as ReturnType<typeof D>).toString();

describe("Làm tròn (QD-03)", () => {
  it("diện tích 2 chữ số, nửa lên", () => {
    expect(lamTronDienTich("12.345").toString()).toBe("12.35");
    expect(lamTronDienTich("12.344").toString()).toBe("12.34");
  });
  it("tiền đến nghìn đồng", () => {
    expect(lamTronTien("847500").toString()).toBe("848000");
    expect(lamTronTien("847499").toString()).toBe("847000");
    expect(lamTronTien("847500", 1000, "XUONG").toString()).toBe("847000");
    expect(lamTronTien("847001", 1000, "LEN").toString()).toBe("848000");
    expect(lamTronTien("847000", 1000, "LEN").toString()).toBe("847000");
  });
  it("bộ chính sách dùng làm tròn lên ở cấp hộ (QD-03)", () => {
    expect(cs.lamTron.cach).toBe("LEN");
    const d = diDoiVatNuoi(cs, { loaiDuong: "CUNG_HOA", loaiVatNuoi: "LON", khoiLuong: "0.001", quangDuongKm: 1 });
    expect(tien(d)).toBe("150");
    expect(tongHo(cs, [d]).tongLamTron.toString()).toBe("1000");
  });
});

describe("Di dời vật nuôi – ví dụ tại Ghi chú PL V QĐ 106/2025", () => {
  it("1 tấn lợn, đường cứng hóa, 20 km = 847.500 đ; tổng hộ làm tròn 848.000 đ", () => {
    const d = diDoiVatNuoi(cs, { loaiDuong: "CUNG_HOA", loaiVatNuoi: "LON", khoiLuong: 1, quangDuongKm: 20 });
    expect(tien(d)).toBe("847500");
    expect(tongHo(cs, [d]).tongLamTron.toString()).toBe("848000");
  });
  it("quãng đường ≤ 5 km chỉ áp mục I; số lẻ mét quy ra km", () => {
    expect(tien(diDoiVatNuoi(cs, { loaiDuong: "DUONG_DAT", loaiVatNuoi: "GIA_CAM", khoiLuong: "0.5", quangDuongKm: "3.25" }))).toBe("292500");
  });
  it("côn trùng, sinh vật nhỏ tính theo kg", () => {
    expect(tien(diDoiVatNuoi(cs, { loaiDuong: "CUNG_HOA", loaiVatNuoi: "CON_TRUNG_SINH_VAT_NHO", khoiLuong: 100, quangDuongKm: 7 }))).toBe("96600");
  });
});

describe("Nhà, công trình (QD-10)", () => {
  const p = { ten: "Nhà kho", G1: 100_000_000, canCuKhauHao: "người dùng nhập" };
  it("1,2 × Tgt nằm giữa sàn và trần", () => {
    expect(tien(nhaCongTrinhThietHaiThucTe(cs, { ...p, T: 20, T1: 5 }))).toBe("90000000");
  });
  it("áp sàn 60% G1", () => {
    expect(tien(nhaCongTrinhThietHaiThucTe(cs, { ...p, T: 20, T1: 15 }))).toBe("60000000");
  });
  it("áp trần 100% G1", () => {
    expect(tien(nhaCongTrinhThietHaiThucTe(cs, { ...p, T: 20, T1: 0 }))).toBe("100000000");
  });
  it("thiếu T → thiếu căn cứ, không ra tiền", () => {
    const d = nhaCongTrinhThietHaiThucTe(cs, { ...p, T: 0, T1: 5 });
    expect(d.trangThai).toBe("THIEU_CAN_CU");
    expect(d.thanhTien).toBeNull();
  });
  it("giá trị xây mới = khối lượng × đơn giá QĐ 32", () => {
    const d = giaTriXayMoi({ ten: "Nhà 1 tầng 110 mm mái tôn, có WC", khoiLuong: "45.678", donVi: "m²xd", donGia: 3581000, maDonGia: "QĐ32/PL-I/1.2", canCu: [] });
    expect(tien(d)).toBe(D("45.68").mul(3581000).toString());
  });
});

describe("Hỗ trợ nhà theo mốc thời gian (QĐ 14/2026 Đ6 k3; QD-12)", () => {
  const b = cs.hoTroNhaDatKhongDuDieuKien;
  const p = { ma: "A09" as const, ten: "Nhà", giaTriTheoDonGia: 100_000_000, ngayThongBao: "2026-05-01" };
  it("các khoảng thông thường", () => {
    expect(tien(hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "1993-10-14" }))).toBe("100000000");
    expect(tien(hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "1993-10-15" }))).toBe("70000000");
    expect(tien(hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "2010-01-01" }))).toBe("50000000");
    expect(tien(hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "2020-01-01" }))).toBe("30000000");
  });
  it("đúng ngày 01/7/2014 → cần xác nhận (khe văn bản VM-09)", () => {
    const d = hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "2014-07-01" });
    expect(d.trangThai).toBe("CAN_XAC_NHAN");
    expect(d.canhBao[0]).toContain("50%");
    expect(d.canhBao[0]).toContain("30%");
  });
  it("người dùng chọn mức khi trùng mốc → có lý do trong phiếu", () => {
    const d = hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "2014-07-01", luaChon: { moTaMoc: b.moc[2]!.moTa, lyDo: "Hội đồng BT thống nhất" } });
    expect(tien(d)).toBe("50000000");
    expect(d.luaChon[0]!.ma).toBe("QD-12");
  });
  it("xây sau thông báo thu hồi → không hỗ trợ", () => {
    expect(hoTroTheoMocXayDung(b, { ...p, ngayXayDung: "2026-06-01" }).trangThai).toBe("THIEU_CAN_CU");
  });
  it("tháo dỡ có vi phạm: đúng ngày 01/7/2004 là khe văn bản", () => {
    expect(chonTheoMoc("2004-07-01", cs.hoTroThaoDoCoViPham.moc).loai).toBe("KHOANG_TRONG");
  });
});

describe("Cây trồng theo mật độ (k4, k5 Đ5 PL VIII)", () => {
  it("Bưởi 400 cây/ha, 1.000 m², 80 cây: 60 cây 100% + 20 cây 30%", () => {
    const d = cayTrong(cs, { ten: "Bưởi ĐK 5–10 cm", maDonGia: "PL8/B02/I.1.d", donVi: "cây", donGia: 259000, soLuong: 80, dienTichTrongM2: 1000, matDoToiDaHa: 400 });
    expect(tien(d)).toBe(String(60 * 259000 + 20 * 259000 * 0.3));
  });
  it("mật độ thấp hơn quy định → tính theo thực tế", () => {
    const d = cayTrong(cs, { ten: "Bưởi", maDonGia: "x", donVi: "cây", donGia: 100000, soLuong: 30, dienTichTrongM2: 1000, matDoToiDaHa: 400 });
    expect(tien(d)).toBe("3000000");
  });
  it("cây hàng năm theo m²", () => {
    expect(tien(cayTrong(cs, { ten: "Lúa ruộng", maDonGia: "PL8/B01/1.b", donVi: "m²", donGia: 5500, soLuong: "250.555" }))).toBe(D("250.56").mul(5500).toString());
  });
});

describe("Đất", () => {
  it("B01: DT × giá bảng giá × điều chỉnh × hệ số", () => {
    const d = boiThuongDat({
      loaiDat: "ONT", dienTichM2: 100, giaBangGiaNghinDong: 720, nguonGia: "NQ152/B05/Xã Đoàn Kết/1.1/VT1",
      dieuChinh: [{ moTa: "Chênh cao ≥ 1,5 m", heSo: "0.7", canCu: { vanBan: "NQ 152/2025", viTri: "k3 Đ4" } }],
      heSoDuAn: { heSo: "1.1", vanBan: "QĐ số .../QĐ-UBND" }, canCu: [],
    });
    expect(tien(d)).toBe(D(100).mul(720000).mul("0.7").mul("1.1").toString());
  });
  it("B01: hệ số không có văn bản → cần xác nhận", () => {
    const d = boiThuongDat({ loaiDat: "LUC", dienTichM2: 100, giaBangGiaNghinDong: 78, nguonGia: "B01", heSoDuAn: { heSo: "1.2", vanBan: "" }, canCu: [] });
    expect(d.trangThai).toBe("CAN_XAC_NHAN");
  });
  it("B06: Tbt = G × S / T1 × T2", () => {
    expect(tien(datPnnCoThoiHan({ dienTichM2: 500, giaDong: 2_000_000, T1: 50, T2: 20, nguonGia: "x" }))).toBe("400000000");
  });
  it("B07: P = ΣP / T1 × T2", () => {
    expect(tien(chiPhiDauTuConLai({ P1: 100_000_000, P2: 0, P3: 20_000_000, P4: 0, T1: 50, T2: 25 }))).toBe("60000000");
  });
});

describe("Hỗ trợ", () => {
  const coSo = { diChuyen: "KHONG_DI_CHUYEN" as const, nhanKhau: 4, giaGaoDongKg: 15000, nguonGiaGao: "TB Sở TC" };
  it("ổn định đời sống 35%: 6 tháng × 30 kg × 15.000 × 4 khẩu", () => {
    expect(tien(onDinhDoiSong(cs, { ...coSo, dienTichNNThuHoi: 35, dienTichNNDangSuDung: 100 }))).toBe("10800000");
  });
  it("đúng 30%: mặc định nhóm 30–70% (NĐ 88); chọn nhóm 20–30% có lý do (QD-16)", () => {
    expect(tien(onDinhDoiSong(cs, { ...coSo, dienTichNNThuHoi: 30, dienTichNNDangSuDung: 100 }))).toBe("10800000");
    const d = onDinhDoiSong(cs, { ...coSo, dienTichNNThuHoi: 30, dienTichNNDangSuDung: 100, chonNhom: { ma: "20_30", lyDo: "áp Đ6 k9 QĐ14" } });
    expect(tien(d)).toBe("5400000");
    expect(d.luaChon[0]!.ma).toBe("QD-16");
  });
  it("dưới 10% không hỗ trợ", () => {
    expect(tien(onDinhDoiSong(cs, { ...coSo, dienTichNNThuHoi: 5, dienTichNNDangSuDung: 100 }))).toBe("0");
  });
  it("chuyển đổi nghề: phường hệ số 5, giới hạn hạn mức", () => {
    const d = chuyenDoiNghe(cs, { xa: "Phường Tô Hiệu", loaiDat: "HNK", dienTichThuHoiM2: 30000, hanMucM2: 20000, canCuHanMuc: "k1 Đ176 LĐĐ", giaDatNNNghinDong: 72 });
    expect(tien(d)).toBe(String(5 * 72000 * 20000));
  });
  it("chuyển đổi nghề: xã ngoài danh sách hệ số 3", () => {
    const d = chuyenDoiNghe(cs, { xa: "Xã Đoàn Kết", loaiDat: "HNK", dienTichThuHoiM2: 1000, hanMucM2: 20000, canCuHanMuc: "k1 Đ176 LĐĐ", giaDatNNNghinDong: 68 });
    expect(tien(d)).toBe(String(3 * 68000 * 1000));
  });
  it("tạm cư: phường, 6 khẩu, 4 tháng + 6 tháng TĐC bằng đất (QD-17)", () => {
    const d = tamCu(cs, { xa: "Phường Chiềng An", nhanKhau: 6, soThang: 4, tdcBangDat: true });
    expect(tien(d)).toBe(String((3_500_000 + 2 * 500_000) * 10));
  });
  it("tạm cư: người dùng chỉnh mức/tháng có lý do (QD-17)", () => {
    const d = tamCu(cs, { xa: "Xã Đoàn Kết", nhanKhau: 3, soThang: 2, tdcBangDat: false, mucThangTuyChinh: { soTien: 2_500_000, lyDo: "UBND xã quyết định" } });
    expect(tien(d)).toBe("5000000");
    expect(d.luaChon[0]!.ma).toBe("QD-17");
  });
  it("mồ mả", () => {
    expect(tien(moMa(cs, { soMoXay: 2, soMoKhongXay: 1 }))).toBe("65000000");
  });
});

describe("Tổng hộ", () => {
  it("dòng cần xác nhận không được cộng và chặn chốt", () => {
    const a = diDoiVatNuoi(cs, { loaiDuong: "CUNG_HOA", loaiVatNuoi: "LON", khoiLuong: 1, quangDuongKm: 20 });
    const b = hoTroTheoMocXayDung(cs.hoTroNhaDatKhongDuDieuKien, { ma: "A09", ten: "Nhà", giaTriTheoDonGia: 1e8, ngayXayDung: "2014-07-01", ngayThongBao: "2026-05-01" });
    const t = tongHo(cs, [a, b]);
    expect(t.tongChuaLamTron.toString()).toBe("847500");
    expect(t.duocChot).toBe(false);
    expect(t.soDongCanXacNhan).toBe(1);
  });
});

describe("Giá đất NQ 152 – thứ tự điều chỉnh đã xác nhận (VM-31)", () => {
  it("phân lớp đất ở: 100 m² lớp 1 + 100 m² lớp 2 → hệ số 0,8", () => {
    const r = dieuChinhGiaDatPnn(cs, { loai: "DAT_O", viTri: 1, giaViTriNghinDong: 1000, dienTichTheoLop: [100, 100] });
    expect(r.dieuChinh[0]!.heSo).toBe("0.8");
  });
  it("phân lớp không thấp hơn giá vị trí thấp nhất của tuyến", () => {
    const r = dieuChinhGiaDatPnn(cs, { loai: "DAT_O", viTri: 1, giaViTriNghinDong: 200, dienTichTheoLop: [10, 10, 10, 10, 200], giaThapNhatTuyenNghinDong: 150 });
    expect(r.dieuChinh).toHaveLength(2);
    const d = boiThuongDat({ loaiDat: "ONT", dienTichM2: 240, giaBangGiaNghinDong: r.giaCoSoNghinDong, nguonGia: "x", dieuChinh: r.dieuChinh, canCu: [] });
    expect(tien(d)).toBe(String(240 * 150000));
  });
  it("lô đấu giá đất ở không phân lớp", () => {
    expect(dieuChinhGiaDatPnn(cs, { loai: "DAT_O", viTri: 1, giaViTriNghinDong: 1000, dienTichTheoLop: [100, 100], laLoDauGia: true }).dieuChinh).toHaveLength(0);
  });
  it("mặt tiếp giáp: 2 đường +15%; đường + ngõ +12%; 3 đường bị chặn 20%", () => {
    const h = (m: ("DUONG" | "NGO" | "NGACH" | "HEM")[]) => dieuChinhGiaDatPnn(cs, { loai: "DAT_O", viTri: 1, giaViTriNghinDong: 1000, matTiepGiap: m }).dieuChinh[0]!.heSo;
    expect(h(["DUONG", "DUONG"])).toBe("1.15");
    expect(h(["DUONG", "NGO"])).toBe("1.12");
    expect(h(["NGO", "NGO"])).toBe("1.08");
    expect(h(["DUONG", "DUONG", "DUONG"])).toBe("1.2");
  });
  it("thứ tự: phân lớp → mặt tiếp giáp → chênh cao → đường đất", () => {
    const r = dieuChinhGiaDatPnn(cs, { loai: "PNN", viTri: 2, giaViTriNghinDong: 1000, dienTichTheoLop: [100, 100], matTiepGiap: ["NGO", "NGO"], chenhCaoMet: "-1.6", matDuongLaDuongDat: true });
    expect(r.dieuChinh.map((x) => x.heSo)).toEqual(["0.75", "1.08", "0.7", "0.7"]);
  });
  it("đường đất không áp cho vị trí 1", () => {
    expect(dieuChinhGiaDatPnn(cs, { loai: "PNN", viTri: 1, giaViTriNghinDong: 1000, matDuongLaDuongDat: true }).dieuChinh).toHaveLength(0);
  });
  it("đất NN xen kẹt đất ở +50%", () => {
    const d = boiThuongDat({ loaiDat: "CLN", dienTichM2: 100, giaBangGiaNghinDong: 68, nguonGia: "B02", dieuChinh: [dieuChinhDatNNXenKep(cs)], canCu: [] });
    expect(tien(d)).toBe(String(100 * 68000 * 1.5));
  });
});
