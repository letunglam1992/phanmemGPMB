import { nhomDiaBan, type BoChinhSach, type DiChuyen } from "./chinh-sach";
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
  p: { xa: string; loaiDat: string; dienTichThuHoiM2: SoVao; hanMucM2: SoVao; canCuHanMuc: string; giaDatNNNghinDong: SoVao },
): DongTinh {
  const k = cs.chuyenDoiNghe;
  const nhom = nhomDiaBan(k.phanNhom, p.xa, "CON_LAI");
  const heSo = D(k.heSoTheoNhom[nhom] ?? k.heSoMacDinh);
  const dt = lamTronDienTich(p.dienTichThuHoiM2);
  const dtTinh = dt.lt(p.hanMucM2) ? dt : D(p.hanMucM2);
  const gia = D(p.giaDatNNNghinDong).mul(1000);
  return dong({
    ma: "C06",
    noiDung: `Hỗ trợ đào tạo, chuyển đổi nghề – ${p.loaiDat}`,
    thamSo: {
      "Địa bàn": `${p.xa} → nhóm ${nhom}, hệ số ${heSo}`,
      "Diện tích thu hồi": `${dinhDang(dt, 2)} m²`,
      "Hạn mức": `${dinhDang(p.hanMucM2, 2)} m² (${p.canCuHanMuc})`,
      "Diện tích tính": `${dinhDang(dtTinh, 2)} m²`,
      "Giá đất NN cùng loại": `${dinhDang(gia)} đ/m²`,
    },
    congThuc: "Hệ số × Giá đất NN × min(DT thu hồi; hạn mức)",
    thanhTien: heSo.mul(gia).mul(dtTinh),
    canCu: k.canCu,
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
export function hoTroTienSddTdc(cs: BoChinhSach, p: { tienSddPhaiNop: SoVao; moTa: string }): DongTinh {
  const k = tdc(cs).hoTroTienSdd;
  const tien = D(p.tienSddPhaiNop);
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
