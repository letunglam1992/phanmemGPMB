import { heSoChuyenDoiNghe, nhomDiaBan, type BoChinhSach, type DiChuyen } from "./chinh-sach";
import { dong } from "./dong";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";
import type { DongTinh, LuaChon } from "./types";

/**
 * C01/C02 – hỗ trợ ổn định đời sống theo tỷ lệ diện tích đất NN bị thu hồi.
 * Đúng ngưỡng tùy chỉnh (vd. 30% – QD-16): dùng nhóm mặc định trừ khi người dùng chọn khác, có lý do.
 */
export function onDinhDoiSong(
  cs: BoChinhSach,
  p: {
    dienTichNNThuHoi: SoVao;
    dienTichNNDangSuDung: SoVao;
    diChuyen: DiChuyen;
    nhanKhau: number;
    giaGaoDongKg: SoVao;
    nguonGiaGao: string;
    chonNhom?: { ma: string; lyDo: string };
    soThangTuyChinh?: { soThang: number; lyDo: string };
  },
): DongTinh {
  const k = cs.onDinhDoiSong;
  const tyLe = D(p.dienTichNNThuHoi).div(p.dienTichNNDangSuDung).mul(100);
  const tyLeHienThi = dinhDang(tyLe, 2) + "%";
  const luaChon: LuaChon[] = [];
  const nguong = k.nguongTuyChinh.find((n) => tyLe.eq(n.giaTri));
  let nhom = k.nhom.find((n) => {
    const tren = n.baoGomTu ? tyLe.gte(n.tu) : tyLe.gt(n.tu);
    const duoi = n.baoGomDen ? tyLe.lte(n.den) : tyLe.lt(n.den);
    return tren && duoi;
  });
  if (nguong) {
    const ma = p.chonNhom && nguong.nhomLuaChon.includes(p.chonNhom.ma) ? p.chonNhom.ma : nguong.macDinh;
    nhom = k.nhom.find((n) => n.ma === ma);
    if (p.chonNhom && ma === p.chonNhom.ma && ma !== nguong.macDinh) luaChon.push({ ma: "QD-16", giaTri: ma, lyDo: p.chonNhom.lyDo });
  }
  if (!nhom) {
    return dong({ ma: "C01", noiDung: "Hỗ trợ ổn định đời sống", congThuc: "", thanhTien: null, canCu: k.canCu, trangThai: "THIEU_CAN_CU", canhBao: [`Tỷ lệ ${tyLeHienThi} không thuộc nhóm nào`] });
  }
  let soThang = nhom.thang[p.diChuyen];
  const canhBao: string[] = [];
  if (nhom.toiDa && p.diChuyen === "DEN_VUNG_KHO_KHAN") canhBao.push(`Văn bản quy định "tối đa ${soThang} tháng"`);
  if (p.soThangTuyChinh) {
    if (p.soThangTuyChinh.soThang > soThang) canhBao.push("Số tháng tùy chỉnh vượt mức quy định");
    soThang = p.soThangTuyChinh.soThang;
    luaChon.push({ ma: "SO_THANG", giaTri: String(soThang), lyDo: p.soThangTuyChinh.lyDo });
  }
  const tien = D(k.kgGaoNhanKhauThang).mul(p.giaGaoDongKg).mul(p.nhanKhau).mul(soThang);
  return dong({
    ma: D(tyLe).gte(30) ? "C02" : "C01",
    noiDung: "Hỗ trợ ổn định đời sống",
    thamSo: {
      "Tỷ lệ đất NN thu hồi": tyLeHienThi,
      "Nhóm áp dụng": `${nhom.ma} (${nhom.canCu})`,
      "Số tháng": String(soThang),
      "Nhân khẩu": String(p.nhanKhau),
      "Giá gạo": `${dinhDang(p.giaGaoDongKg)} đ/kg (${p.nguonGiaGao})`,
    },
    congThuc: `${k.kgGaoNhanKhauThang} kg × Giá gạo × Nhân khẩu × Số tháng`,
    thanhTien: soThang === 0 ? D(0) : tien,
    canCu: k.canCu,
    luaChon,
    canhBao,
    trangThai: canhBao.some((c) => c.includes("vượt")) ? "CAN_XAC_NHAN" : "TAM_TINH",
  });
}

/** C06 – hỗ trợ đào tạo, chuyển đổi nghề: hệ số theo nhóm địa bàn × giá đất NN × min(DT thu hồi, hạn mức). */
export function chuyenDoiNghe(
  cs: BoChinhSach,
  p: { xa: string; loaiDat: string; dienTichThuHoiM2: SoVao; hanMucM2: SoVao; canCuHanMuc: string; giaDatNNNghinDong: SoVao; thon?: string[] },
): DongTinh {
  const k = cs.chuyenDoiNghe;
  const hs = heSoChuyenDoiNghe(cs, p.xa, p.thon);
  const heSo = D(hs.heSo);
  const dt = lamTronDienTich(p.dienTichThuHoiM2);
  const dtTinh = dt.lt(p.hanMucM2) ? dt : D(p.hanMucM2);
  const gia = D(p.giaDatNNNghinDong).mul(1000);
  return dong({
    ma: "C06",
    noiDung: `Hỗ trợ đào tạo, chuyển đổi nghề – ${p.loaiDat}`,
    thamSo: {
      "Địa bàn": `${hs.moTa}, hệ số ${heSo}${hs.canCu ? ` (${hs.canCu})` : ""}`,
      "Diện tích thu hồi": `${dinhDang(dt, 2)} m²`,
      "Hạn mức": `${dinhDang(p.hanMucM2, 2)} m² (${p.canCuHanMuc})`,
      "Diện tích tính": `${dinhDang(dtTinh, 2)} m²`,
      "Giá đất NN cùng loại": `${dinhDang(gia)} đ/m²`,
    },
    congThuc: "Hệ số × Giá đất NN × min(DT thu hồi; hạn mức)",
    thanhTien: heSo.mul(gia).mul(dtTinh),
    canCu: k.canCu,
    ...(hs.canXacNhan ? { trangThai: "CAN_XAC_NHAN" as const, canhBao: [hs.canXacNhan] } : {}),
  });
}

/** C07 – hỗ trợ tạm cư (Đ3 QĐ 14/2026). Hộ ≥ 5 khẩu: theo QD-17 (mặc định, chờ xác nhận). */
export function tamCu(
  cs: BoChinhSach,
  p: { xa: string; nhanKhau: number; soThang: number; tdcBangDat: boolean; mucThangTuyChinh?: { soTien: SoVao; lyDo: string } },
): DongTinh {
  const k = cs.tamCu;
  const nhom = nhomDiaBan(k.phanNhom, p.xa, "XA_CON_LAI");
  const muc = k.nhomDiaBan[nhom]!;
  let mucThang = D(p.nhanKhau <= 2 ? muc.den2Khau : muc.den4Khau);
  const canhBao: string[] = [];
  if (p.nhanKhau > k.mocKhauCoSo) {
    mucThang = mucThang.plus(D(k.congThemMoiKhau).mul(p.nhanKhau - k.mocKhauCoSo));
    canhBao.push(k.ghiChuCachTinh);
  }
  const luaChon: LuaChon[] = [];
  if (p.mucThangTuyChinh) {
    luaChon.push({ ma: "QD-17", giaTri: `${dinhDang(p.mucThangTuyChinh.soTien)} đ/tháng (mặc định ${dinhDang(mucThang)} đ)`, lyDo: p.mucThangTuyChinh.lyDo });
    mucThang = D(p.mucThangTuyChinh.soTien);
  }
  const thang = p.soThang + (p.tdcBangDat ? k.thangThemTdcBangDat : 0);
  return dong({
    ma: "C07",
    noiDung: "Hỗ trợ tạm cư",
    thamSo: {
      "Địa bàn": `${p.xa} → nhóm ${nhom}`,
      "Nhân khẩu": String(p.nhanKhau),
      "Mức/tháng": `${dinhDang(mucThang)} đ`,
      "Số tháng": `${p.soThang}${p.tdcBangDat ? ` + ${k.thangThemTdcBangDat} (TĐC bằng đất)` : ""}`,
    },
    congThuc: "Mức/tháng × Số tháng",
    thanhTien: mucThang.mul(thang),
    canCu: k.canCu,
    canhBao,
    luaChon,
  });
}

/* ---------------- Hỗ trợ tái định cư ---------------- */

function tdc(cs: BoChinhSach) {
  if (!cs.taiDinhCu) throw new Error(`Bộ chính sách ${cs.ma} không có quy định hỗ trợ tái định cư`);
  return cs.taiDinhCu;
}

/** C08 – hỗ trợ để tự lo chỗ ở (k8 Đ111 LĐĐ 2024; k1, k2 Đ23 NĐ 88/2024; Đ10 PL II QĐ 106/2025). */
export function hoTroTuLoChoO(cs: BoChinhSach, p: { xa: string }): DongTinh {
  const k = tdc(cs).tuLoChoO;
  const nhom = nhomDiaBan(k.phanNhom, p.xa, "XA_CON_LAI");
  const muc = D(k.mucTheoNhom[nhom]!);
  return dong({
    ma: "C08",
    noiDung: "Hỗ trợ tái định cư – tự lo chỗ ở",
    thamSo: { "Địa bàn": `${p.xa} → nhóm ${nhom}`, "Mức hỗ trợ": `${dinhDang(muc)} đ/hộ` },
    congThuc: "Mức hỗ trợ theo địa bàn (đ/hộ)",
    thanhTien: muc,
    canCu: k.canCu,
    canhBao: ["Điều kiện: hộ đủ điều kiện được hỗ trợ tái định cư theo khoản 8 Điều 111 Luật Đất đai và có nhu cầu tự lo chỗ ở — cán bộ xác nhận"],
  });
}

/** Diện tích một suất tái định cư tối thiểu (Đ16 PL II QĐ 106): đất ở 40 m² (phường) / 60 m² (xã); nhà ở 40 m². */
export function dienTichSuatToiThieu(cs: BoChinhSach, p: { xa: string; hinhThuc: "DAT_O" | "NHA_O" }): string {
  const k = tdc(cs).suatToiThieu;
  if (p.hinhThuc === "NHA_O") return k.nhaOM2;
  return p.xa.startsWith("Phường") ? k.datOPhuongM2 : k.datOXaM2;
}

/**
 * C10 – hỗ trợ đủ một suất tái định cư tối thiểu (k8 Đ111 LĐĐ 2024): người có đất ở thu hồi phải di chuyển chỗ ở,
 * được bồi thường bằng giao đất ở / nhà ở TĐC mà tiền bồi thường về đất ở không đủ một suất tối thiểu.
 * Giá trị suất = đơn giá (giá đất ở tại khu TĐC hoặc giá bán nhà TĐC) × diện tích suất tối thiểu (Đ16 PL II QĐ 106).
 */
export function hoTroSuatToiThieu(
  cs: BoChinhSach,
  p: { xa: string; hinhThuc: "DAT_O" | "NHA_O"; donGiaDongM2: SoVao; nguonGia: string; tienBoiThuongDatO: SoVao },
): DongTinh {
  const k = tdc(cs).suatToiThieu;
  const dt = D(dienTichSuatToiThieu(cs, p));
  const giaTri = D(p.donGiaDongM2).mul(dt);
  const bt = D(p.tienBoiThuongDatO);
  const chenh = giaTri.minus(bt);
  return dong({
    ma: "C10",
    noiDung: `Hỗ trợ đủ suất tái định cư tối thiểu (${p.hinhThuc === "NHA_O" ? "nhà ở" : "đất ở"})`,
    thamSo: {
      "Suất tối thiểu": `${dinhDang(dt)} m² ${p.hinhThuc === "NHA_O" ? "nhà ở" : `đất ở (${p.xa.startsWith("Phường") ? "phường" : "xã"})`}`,
      [p.hinhThuc === "NHA_O" ? "Giá bán nhà TĐC" : "Giá đất ở khu TĐC"]: `${dinhDang(p.donGiaDongM2)} đ/m² (${p.nguonGia || "chưa ghi văn bản"})`,
      "Giá trị suất": `${dinhDang(giaTri)} đ`,
      "Tiền bồi thường về đất ở": `${dinhDang(bt)} đ`,
    },
    congThuc: "max(0; Đơn giá × DT suất tối thiểu − Tiền bồi thường về đất ở)",
    thanhTien: chenh.gt(0) ? chenh : D(0),
    canCu: k.canCu,
    canhBao: chenh.gt(0) ? [] : ["Tiền bồi thường về đất ở đã đủ một suất tái định cư tối thiểu — không phát sinh hỗ trợ"],
  });
}

/** C11 – hỗ trợ 20% tiền sử dụng đất phải nộp của thửa đất được giao tái định cư (k11 Đ6 QĐ 14/2026; VM-28). */
export function hoTroTienSddTdc(cs: BoChinhSach, p: { tienSddPhaiNop: SoVao; moTa: string; giaoDatK4D111?: boolean }): DongTinh {
  const k = tdc(cs).hoTroTienSdd;
  const tien = D(p.tienSddPhaiNop);
  if (p.giaoDatK4D111 && k.ngoaiTruK4D111)
    return dong({
      ma: "C11",
      noiDung: "Hỗ trợ tiền sử dụng đất thửa đất được giao tái định cư",
      thamSo: { "Trường hợp": "Giao đất có thu tiền SDĐ theo khoản 4 Điều 111 Luật Đất đai" },
      congThuc: "Không áp dụng",
      thanhTien: D(0),
      canCu: k.canCu,
      canhBao: [k.ghiChuNgoaiTru ?? "Không áp dụng"],
    });
  return dong({
    ma: "C11",
    noiDung: "Hỗ trợ tiền sử dụng đất thửa đất được giao tái định cư",
    thamSo: { "Tiền SDĐ phải nộp": `${dinhDang(tien)} đ (${p.moTa})`, "Tỷ lệ": `${dinhDang(D(k.tyLe).mul(100))}%` },
    congThuc: "Tỷ lệ × Tiền sử dụng đất phải nộp",
    thanhTien: tien.mul(k.tyLe),
    canCu: k.canCu,
    canhBao: [k.ghiChu],
  });
}

const thieuCs = (ma: string, noiDung: string, cs: BoChinhSach): DongTinh =>
  dong({ ma, noiDung, congThuc: "—", thanhTien: null, canCu: [{ vanBan: "Bộ chính sách", viTri: cs.ma }], trangThai: "THIEU_CAN_CU", canhBao: [`Bộ chính sách ${cs.ma} không có quy định khoản này`] });

/**
 * C14 – khoản 1 Điều 6 QĐ 14/2026: hộ có người đang hưởng chế độ trợ cấp xã hội phải di chuyển chỗ ở. Cán bộ chọn
 * điểm (a–đ) cho từng đối tượng theo xác nhận của phòng chuyên môn — mức theo điểm; hộ có nhiều tiêu chuẩn chỉ hưởng
 * một mức cao nhất. Điểm đ trừ đối tượng khoản 2 (hộ nghèo) → hộ có khoản 2 không tính điểm đ.
 * Dữ liệu cũ chỉ có `muc` (không có điểm) vẫn tính nếu mức thuộc các mức quy định.
 */
export function hoTroDoiTuongChinhSach(cs: BoChinhSach, p: { doiTuong: { ten: string; diem?: string; muc?: SoVao; xacNhan: string }[]; coHoNgheo?: boolean }): DongTinh {
  const nd = "Hỗ trợ hộ gia đình có người hưởng chế độ trợ cấp xã hội phải di chuyển chỗ ở";
  const k = cs.hoTroKhac?.doiTuongChinhSach;
  if (!k) return thieuCs("C14", nd, cs);
  if (!p.doiTuong.length) return dong({ ma: "C14", noiDung: nd, congThuc: "—", thanhTien: null, canCu: k.canCu, trangThai: "THIEU_CAN_CU", canhBao: ["Chưa khai đối tượng"] });
  const canhBao: string[] = [];
  const ds = p.doiTuong.map((x) => {
    const dm = x.diem ? k.diem?.find((y) => y.ma === x.diem) : undefined;
    const muc = dm ? dm.muc : x.muc && k.mucs.some((m) => D(m).eq(D(x.muc!))) ? String(x.muc) : null;
    return { ...x, dm, muc };
  });
  const chuaChon = ds.filter((x) => !x.muc);
  if (chuaChon.length) canhBao.push(`Chưa chọn đối tượng (điểm a–đ khoản 1 Điều 6) cho: ${chuaChon.map((x) => x.ten || "(chưa ghi tên)").join(", ")}`);
  let hopLe = ds.filter((x) => x.muc);
  if (p.coHoNgheo && hopLe.some((x) => x.diem === "đ")) {
    canhBao.push("Điểm đ khoản 1 Điều 6 trừ đối tượng khoản 2 (hộ nghèo) — hộ đã hưởng khoản 2 không tính điểm đ");
    hopLe = hopLe.filter((x) => x.diem !== "đ");
  }
  if (!hopLe.length) return dong({ ma: "C14", noiDung: nd, congThuc: "—", thanhTien: null, canCu: k.canCu, trangThai: "THIEU_CAN_CU", canhBao });
  const cao = hopLe.reduce((a, x) => (D(x.muc!).gt(D(a.muc!)) ? x : a));
  const thieuXn = ds.filter((x) => !x.xacNhan.trim());
  if (thieuXn.length) canhBao.push(`Chưa ghi xác nhận của Phòng Văn hóa – Xã hội (hoặc Kinh tế, Văn hóa, Xã hội) UBND cấp xã cho: ${thieuXn.map((x) => x.ten || "(chưa ghi tên)").join(", ")}`);
  if (hopLe.length > 1) canhBao.push("Hộ có nhiều tiêu chuẩn: chỉ được xét hưởng một mức hỗ trợ cao nhất (khoản 1 Điều 6 QĐ 14/2026)");
  canhBao.push("Điều kiện: hộ phải di chuyển chỗ ở do bị thu hồi đất — cán bộ xác nhận");
  return dong({
    ma: "C14",
    noiDung: nd,
    thamSo: Object.fromEntries(ds.map((x, i) => [`Đối tượng ${i + 1}`, `${x.ten || "—"}: ${x.diem ? `điểm ${x.diem}, ` : ""}${x.muc ? `${dinhDang(D(x.muc))} đ/hộ` : "chưa chọn"}${x.xacNhan.trim() ? ` (${x.xacNhan.trim()})` : ""}`])),
    congThuc: hopLe.length > 1 ? "Mức cao nhất trong các tiêu chuẩn của hộ" : "Mức theo điểm của đối tượng (đ/hộ)",
    thanhTien: D(cao.muc!),
    canCu: cao.dm ? cao.dm.canCu : k.canCu,
    trangThai: thieuXn.length || chuaChon.length ? "CAN_XAC_NHAN" : "TAM_TINH",
    canhBao,
  });
}

/** C15 – khoản 2 Điều 6 QĐ 14/2026: hộ nghèo (điều kiện theo văn bản: dieuKien) — mức cố định/hộ, cần xác nhận hộ nghèo. */
export function hoTroHoNgheo(cs: BoChinhSach, p: { xacNhan: string }): DongTinh {
  const nd = "Hỗ trợ hộ nghèo";
  const k = cs.hoTroKhac?.hoNgheo;
  if (!k) return thieuCs("C15", nd, cs);
  const coXn = !!p.xacNhan.trim();
  return dong({
    ma: "C15",
    noiDung: nd,
    thamSo: { "Mức hỗ trợ": `${dinhDang(D(k.soTien))} đ/hộ`, "Xác nhận hộ nghèo": p.xacNhan.trim() || "—" },
    congThuc: "Mức cố định (đ/hộ)",
    thanhTien: D(k.soTien),
    canCu: k.canCu,
    trangThai: coXn ? "TAM_TINH" : "CAN_XAC_NHAN",
    canhBao: [`Điều kiện: ${k.dieuKien} — cán bộ xác nhận`, ...(coXn ? [] : ["Chưa ghi giấy tờ xác nhận hộ nghèo"])],
  });
}

/** C16 – khoản 6 Điều 6 QĐ 14/2026: ổn định đời sống khi nhà ở phải phá dỡ, làm lại nơi khác: kg gạo × giá gạo × nhân khẩu × số tháng. */
export function hoTroXayLaiNha(cs: BoChinhSach, p: { nhanKhau: number; giaGaoDongKg: SoVao; nguonGiaGao: string }): DongTinh {
  const nd = "Hỗ trợ ổn định đời sống trong thời gian xây dựng lại nhà ở";
  const k = cs.hoTroKhac?.xayLaiNha;
  if (!k) return thieuCs("C16", nd, cs);
  const tien = D(k.kgGaoNhanKhauThang).mul(D(p.giaGaoDongKg)).mul(p.nhanKhau).mul(k.soThang);
  const canhBao = [`Điều kiện: ${k.dieuKien} — cán bộ xác nhận`];
  if (k.nhanKhau) canhBao.push(k.nhanKhau);
  return dong({
    ma: "C16",
    noiDung: nd,
    thamSo: { "Gạo": `${k.kgGaoNhanKhauThang} kg/khẩu/tháng`, "Giá gạo": `${dinhDang(D(p.giaGaoDongKg))} đ/kg (${p.nguonGiaGao})`, "Nhân khẩu": String(p.nhanKhau), "Số tháng": String(k.soThang) },
    congThuc: "kg gạo × giá gạo × nhân khẩu × số tháng",
    thanhTien: tien,
    canCu: k.canCu,
    canhBao,
  });
}
