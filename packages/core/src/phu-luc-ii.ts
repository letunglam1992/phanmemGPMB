/**
 * Các khoản theo Phụ lục II QĐ 106/2025/QĐ-UBND (Quy định một số nội dung về bồi thường, hỗ trợ, tái định cư) còn hiệu
 * lực sau QĐ 14/2026: Điều 3 (chi phí đầu tư vào đất còn lại), Điều 7 (hành lang bảo vệ an toàn), Điều 11 (người đang sử
 * dụng nhà ở thuộc sở hữu nhà nước), Điều 13 (ổn định sản xuất, kinh doanh). Tham số lấy từ `cs.phuLucII`; bộ chính
 * sách không có mục này → "Thiếu căn cứ". Định mức, thu nhập, doanh thu do cán bộ nhập kèm căn cứ.
 */
import { nhomDiaBan, type BoChinhSach } from "./chinh-sach";
import { dong } from "./dong";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";
import type { CanCu, DongTinh } from "./types";

const thieu = (ma: string, noiDung: string, canhBao: string, canCu: CanCu[] = []): DongTinh =>
  dong({ ma, noiDung, congThuc: "—", thanhTien: null, canCu: canCu.length ? canCu : [{ vanBan: "QĐ 106/2025/QĐ-UBND", viTri: "Phụ lục II" }], trangThai: "THIEU_CAN_CU", canhBao: [canhBao] });
const khongCs = (ma: string, noiDung: string, cs: BoChinhSach) => thieu(ma, noiDung, `Bộ chính sách ${cs.ma} không có tham số Phụ lục II QĐ 106/2025`);
const phanTram = (v: SoVao) => `${dinhDang(D(v).mul(100), 2)}%`;

/** Tỷ lệ thời hạn sử dụng đất còn lại (đối với tổ chức) — Điều 3 PL II: thời hạn còn lại / thời hạn theo k4 Đ17 NĐ 88. */
export interface TyLeThoiHan {
  conLaiNam: SoVao;
  thoiHanNam: SoVao;
}

/**
 * B07 – khoản 2 Điều 3 PL II: không đủ căn cứ lập dự toán → chi phí đầu tư vào đất còn lại = 01 lần giá đất trong Bảng
 * giá đất của loại đất thu hồi × DT, có tính tỷ lệ thời hạn còn lại (đối với tổ chức).
 */
export function chiPhiDauTuTheoGiaDat(
  cs: BoChinhSach,
  p: { loaiDat: string; dienTichM2: SoVao; giaNghinDong: SoVao; nguonGia: string; tyLeThoiHan?: TyLeThoiHan },
): DongTinh {
  const nd = `Chi phí đầu tư vào đất còn lại – ${p.loaiDat}`;
  const k = cs.phuLucII?.chiPhiDauTu;
  if (!k) return khongCs("B07", nd, cs);
  const dt = lamTronDienTich(p.dienTichM2);
  const gia = D(p.giaNghinDong).mul(1000);
  const lan = D(k.lanGiaDat);
  let tien = dt.mul(gia).mul(lan);
  const thamSo: Record<string, string> = {
    "DT": `${dinhDang(dt, 2)} m²`,
    "Giá đất bảng giá": `${dinhDang(gia)} đ/m² (${p.nguonGia})`,
    "Số lần giá đất": dinhDang(lan, 2),
  };
  let congThuc = "DT × Giá đất bảng giá × Số lần";
  if (p.tyLeThoiHan) {
    const { conLaiNam: a, thoiHanNam: b } = p.tyLeThoiHan;
    if (!D(b).gt(0)) return thieu("B07", nd, "Thời hạn sử dụng đất (k4 Đ17 NĐ 88) phải lớn hơn 0", k.canCu);
    tien = tien.mul(a).div(b);
    thamSo["Thời hạn còn lại / thời hạn"] = `${dinhDang(a, 2)} / ${dinhDang(b, 2)} năm`;
    congThuc += " × Thời hạn còn lại / Thời hạn";
  }
  return dong({
    ma: "B07",
    noiDung: nd,
    thamSo,
    congThuc,
    thanhTien: tien,
    canCu: [...k.canCu, { vanBan: "NQ 152/2025/NQ-HĐND", viTri: p.nguonGia }],
    canhBao: ["Khoản 2 Điều 3 PL II: chỉ áp dụng khi không đủ căn cứ, thông tin để lập dự toán giá trị đầu tư vào đất còn lại — cán bộ xác nhận"],
  });
}

export type NhomDatHanhLang = "O_PNN" | "CLN_RSX" | "HNK";
export const TEN_NHOM_HANH_LANG: Record<NhomDatHanhLang, string> = {
  O_PNN: "Đất ở, đất khác cùng thửa với đất ở, đất PNN không phải đất ở",
  CLN_RSX: "Đất trồng cây lâu năm, đất rừng trồng sản xuất",
  HNK: "Đất trồng cây hàng năm",
};

/**
 * B08, B09 – Điều 7 PL II: đất trong hành lang bảo vệ an toàn không đổi mục đích nhưng hạn chế khả năng sử dụng.
 * Đường dây điện trên không (k1): 80% / 50% / 30% giá đất cụ thể × DT trong hành lang. Công trình khác (k2): 50% giá trị
 * bồi thường, trừ đất trồng cây hàng năm. `giaDongM2` = giá đất cụ thể bồi thường về đất cùng loại (đ/m²).
 */
export function boiThuongHanhLang(
  cs: BoChinhSach,
  p: { loai: "DIEN" | "KHAC"; nhomDat: NhomDatHanhLang; loaiDat: string; dienTichM2: SoVao; giaDongM2: SoVao; nguonGia: string },
): DongTinh {
  const ma = p.loai === "DIEN" ? "B08" : "B09";
  const nd = `Bồi thường đất trong hành lang ${p.loai === "DIEN" ? "an toàn đường dây dẫn điện trên không" : "bảo vệ công trình"} – ${p.loaiDat}`;
  const k = cs.phuLucII;
  if (!k?.hanhLangDien || !k.hanhLangKhac) return khongCs(ma, nd, cs);
  const canCu = p.loai === "DIEN" ? k.hanhLangDien.canCu : k.hanhLangKhac.canCu;
  if (p.loai === "KHAC" && p.nhomDat === "HNK")
    return thieu(ma, nd, "Khoản 2 Điều 7 PL II không áp dụng cho đất trồng cây hàng năm (hành lang công trình không phải đường dây điện)", canCu);
  const tyLe = D(p.loai === "DIEN" ? k.hanhLangDien[p.nhomDat] : k.hanhLangKhac.tyLe);
  const dt = lamTronDienTich(p.dienTichM2);
  const gia = D(p.giaDongM2);
  return dong({
    ma,
    noiDung: nd,
    thamSo: {
      "Nhóm đất": TEN_NHOM_HANH_LANG[p.nhomDat],
      "DT trong hành lang": `${dinhDang(dt, 2)} m²`,
      "Giá đất cụ thể": `${dinhDang(gia)} đ/m² (${p.nguonGia})`,
      "Tỷ lệ": phanTram(tyLe),
    },
    congThuc: "DT trong hành lang × Giá đất cụ thể × Tỷ lệ",
    thanhTien: dt.mul(gia).mul(tyLe),
    canCu,
    canhBao: [
      p.loai === "DIEN"
        ? "Điều kiện: đất đủ điều kiện được bồi thường, không thay đổi mục đích sử dụng nhưng hạn chế khả năng sử dụng (điểm c k1 Đ18 NĐ 88) — cán bộ xác nhận"
        : "Điều kiện: không làm thay đổi mục đích sử dụng đất nhưng làm hạn chế khả năng sử dụng; DT là DT bị hạn chế khả năng sử dụng — cán bộ xác nhận",
    ],
  });
}

/** A12 – điểm a khoản 3 Điều 7 PL II: nhà ở, công trình phục vụ sinh hoạt trong hành lang ≤ 220 kV không di dời — 70% giá trị phần nhà theo đơn giá xây mới. */
export function hoTroNhaHanhLang(cs: BoChinhSach, p: { ten: string; giaTriTheoDonGia: SoVao }): DongTinh {
  const nd = `Bồi thường, hỗ trợ nhà, công trình trong hành lang lưới điện – ${p.ten}`;
  const k = cs.phuLucII?.hanhLangNha;
  if (!k) return khongCs("A12", nd, cs);
  const gt = D(p.giaTriTheoDonGia);
  return dong({
    ma: "A12",
    noiDung: nd,
    thamSo: { "Giá trị phần trong hành lang theo ĐG xây mới": `${dinhDang(gt)} đ`, "Tỷ lệ": phanTram(k.tyLe) },
    congThuc: "Giá trị phần nhà trong hành lang × Tỷ lệ (một lần)",
    thanhTien: gt.mul(k.tyLe),
    canCu: k.canCu,
    canhBao: ["Điều kiện: không phải di dời khỏi hành lang đường dây ≤ 220 kV (k1 Đ16 NĐ 62/2025); xây trên đất đủ điều kiện bồi thường về đất trước ngày thông báo thu hồi đất — khối lượng nhập là phần nằm trong hành lang"],
  });
}

/**
 * C09 – khoản 1, 3 Điều 11 PL II: người đang sử dụng nhà ở thuộc sở hữu nhà nước phải phá dỡ, không còn chỗ ở khác trong
 * địa bàn cấp xã. Thuê nhà: mức theo nhân khẩu × số tháng thực tế (≤ 06 tháng); tự lo chỗ ở: 50% mức Điều 10.
 */
export function hoTroNhaSoHuuNhaNuoc(cs: BoChinhSach, p: { cach: "THUE" | "TU_LO"; nhanKhau: number; soThang: number; xa: string }): DongTinh {
  const nd = `Hỗ trợ người đang sử dụng nhà ở thuộc sở hữu nhà nước – ${p.cach === "THUE" ? "thuê nhà ở" : "tự lo chỗ ở mới"}`;
  const k = cs.phuLucII?.nhaSoHuuNhaNuoc;
  if (!k) return khongCs("C09", nd, cs);
  const dk = "Điều kiện: nằm trong phạm vi thu hồi đất phải phá dỡ nhà, không còn chỗ ở nào khác trong địa bàn cấp xã (k2 Đ24 NĐ 88) — cán bộ xác nhận";
  if (p.cach === "TU_LO") {
    const t = cs.taiDinhCu?.tuLoChoO;
    if (!t) return thieu("C09", nd, `Bộ chính sách ${cs.ma} không có mức hỗ trợ tự lo chỗ ở (Điều 10 PL II)`, k.canCu);
    const nhom = nhomDiaBan(t.phanNhom, p.xa, "XA_CON_LAI");
    const muc = D(t.mucTheoNhom[nhom]!);
    return dong({
      ma: "C09",
      noiDung: nd,
      thamSo: { "Địa bàn": `${p.xa} → nhóm ${nhom}`, "Mức Điều 10": `${dinhDang(muc)} đ/hộ`, "Tỷ lệ": phanTram(k.tyLeTuLo) },
      congThuc: "Mức hỗ trợ tự lo chỗ ở (Điều 10) × Tỷ lệ",
      thanhTien: muc.mul(k.tyLeTuLo),
      canCu: [...k.canCu, ...t.canCu],
      canhBao: [dk],
    });
  }
  if (!Number.isInteger(p.nhanKhau) || p.nhanKhau <= 0) return thieu("C09", nd, "Chưa có số nhân khẩu", k.canCu);
  if (!Number.isInteger(p.soThang) || p.soThang <= 0) return thieu("C09", nd, "Chưa nhập số tháng thuê nhà thực tế", k.canCu);
  const muc = p.nhanKhau <= 2 ? D(k.den2Khau) : p.nhanKhau <= 4 ? D(k.den4Khau) : D(k.den4Khau).plus(D(k.congThemMoiKhau).mul(p.nhanKhau - 4));
  const thang = Math.min(p.soThang, k.thangToiDa);
  return dong({
    ma: "C09",
    noiDung: nd,
    thamSo: { "Nhân khẩu": String(p.nhanKhau), "Mức/tháng": `${dinhDang(muc)} đ/hộ`, "Số tháng tính": `${thang} (thực tế ${p.soThang}, tối đa ${k.thangToiDa})` },
    congThuc: p.nhanKhau > 4 ? "(Mức hộ đến 4 khẩu + mức/khẩu tăng thêm × số khẩu tăng thêm) × số tháng" : "Mức theo nhân khẩu × số tháng",
    thanhTien: muc.mul(thang),
    canCu: k.canCu,
    canhBao: [dk, ...(p.soThang > k.thangToiDa ? [`Số tháng thực tế vượt tối đa ${k.thangToiDa} tháng — chỉ tính ${k.thangToiDa} tháng`] : [])],
  });
}

/**
 * C03 – khoản 1 Điều 13 PL II: hỗ trợ ổn định sản xuất (hộ được bồi thường bằng đất NN; hoặc khoản 5 Điều 6 QĐ 14/2026).
 * a) cây hàng năm: 100% giống, vật tư, hướng dẫn kỹ thuật trong 2 vụ — DT thu hồi × định mức (đ/ha/vụ) × số vụ;
 * b) cây lâu năm: 50% chi phí đầu tư năm đầu — min(DT, 01 ha) × chi phí (đ/ha). Định mức do cán bộ nhập kèm căn cứ.
 */
export function hoTroOnDinhSanXuatDat(
  cs: BoChinhSach,
  p: { hangNam?: { dienTichM2: SoVao; dinhMucDongHaVu: SoVao }; lauNam?: { dienTichM2: SoVao; chiPhiDongHa: SoVao }; canCuDinhMuc: string; noiDung?: string },
): DongTinh {
  const nd = p.noiDung || "Hỗ trợ ổn định sản xuất (khoản 1 Điều 13 PL II)";
  const k = cs.phuLucII?.onDinhSanXuatDat;
  if (!k) return khongCs("C03", nd, cs);
  if (!p.canCuDinhMuc.trim()) return thieu("C03", nd, "Chưa ghi căn cứ định mức (quy định của Bộ NN&PTNT, UBND tỉnh; quy trình kỹ thuật của loại cây)", k.canCu);
  if (!p.hangNam && !p.lauNam) return thieu("C03", nd, "Chưa nhập diện tích, định mức cây hàng năm hoặc cây lâu năm", k.canCu);
  const thamSo: Record<string, string> = {};
  const canhBao: string[] = [];
  const phan: string[] = [];
  let tien = D(0);
  if (p.hangNam) {
    const ha = lamTronDienTich(p.hangNam.dienTichM2).div(10000);
    const a = ha.mul(p.hangNam.dinhMucDongHaVu).mul(k.soVu).mul(k.tyLeHangNam);
    thamSo["a) Cây hàng năm"] = `${dinhDang(ha, 4)} ha × ${dinhDang(D(p.hangNam.dinhMucDongHaVu))} đ/ha/vụ × ${k.soVu} vụ × ${phanTram(k.tyLeHangNam)} = ${dinhDang(a)} đ`;
    phan.push("DT (ha) × định mức/ha/vụ × số vụ × tỷ lệ");
    tien = tien.plus(a);
  }
  if (p.lauNam) {
    const dt = lamTronDienTich(p.lauNam.dienTichM2);
    const toiDa = D(k.dtToiDaLauNamM2);
    const dtTinh = dt.gt(toiDa) ? toiDa : dt;
    const b = dtTinh.div(10000).mul(p.lauNam.chiPhiDongHa).mul(k.tyLeLauNam);
    thamSo["b) Cây lâu năm"] = `${dinhDang(dtTinh.div(10000), 4)} ha × ${dinhDang(D(p.lauNam.chiPhiDongHa))} đ/ha × ${phanTram(k.tyLeLauNam)} = ${dinhDang(b)} đ`;
    if (dt.gt(toiDa)) canhBao.push(`DT cây lâu năm vượt ${dinhDang(toiDa.div(10000), 2)} ha/hộ — chỉ tính ${dinhDang(toiDa.div(10000), 2)} ha`);
    phan.push("min(DT; 1 ha) × chi phí năm đầu/ha × tỷ lệ");
    tien = tien.plus(b);
  }
  thamSo["Căn cứ định mức"] = p.canCuDinhMuc.trim();
  return dong({
    ma: "C03",
    noiDung: nd,
    thamSo,
    congThuc: phan.join(" + "),
    thanhTien: tien,
    canCu: [...k.canCu, { vanBan: p.canCuDinhMuc.trim(), viTri: "" }],
    canhBao,
  });
}

export type CachSxkd = "K2" | "K2_TAM_THOI" | "K3";
export const TEN_SXKD: Record<CachSxkd, string> = {
  K2: "Khoản 2 — ngừng sản xuất kinh doanh (30% một năm thu nhập sau thuế bình quân 3 năm)",
  K2_TAM_THOI: "Khoản 2 — tháo dỡ một phần, ngừng hoạt động tạm thời (50% mức trên)",
  K3: "Khoản 3 — hộ SXKD không thực hiện chế độ kế toán (theo doanh thu bình quân tính thuế)",
};

/** C04 – khoản 2, 3 Điều 13 PL II: hỗ trợ ổn định sản xuất kinh doanh phi nông nghiệp có đăng ký kinh doanh (một lần). */
export function hoTroOnDinhSxkd(cs: BoChinhSach, p: { cach: CachSxkd; thuNhapBinhQuanNam?: SoVao; doanhThuNam?: SoVao; canCuSoLieu: string }): DongTinh {
  const nd = "Hỗ trợ ổn định sản xuất kinh doanh phi nông nghiệp";
  const k = cs.phuLucII?.onDinhSxkd;
  if (!k) return khongCs("C04", nd, cs);
  const canCu = p.cach === "K3" ? k.canCuK3 : k.canCuK2;
  if (!p.canCuSoLieu.trim()) return thieu("C04", nd, p.cach === "K3" ? "Chưa ghi văn bản của cơ quan thuế xác định doanh thu (điểm c k3)" : "Chưa ghi căn cứ thu nhập sau thuế (báo cáo tài chính, quyết toán thuế 3 năm liền kề)", canCu);
  if (p.cach === "K3") {
    if (p.doanhThuNam === undefined || p.doanhThuNam === "") return thieu("C04", nd, "Chưa nhập doanh thu bình quân tính thuế (đ/năm)", canCu);
    const dtThu = D(p.doanhThuNam);
    const tren = dtThu.gt(k.nguongDoanhThu);
    const muc = D(tren ? k.mucTrenNguong : k.mucDuoiNguong);
    return dong({
      ma: "C04",
      noiDung: nd,
      thamSo: { "Trường hợp": TEN_SXKD.K3, "Doanh thu bình quân": `${dinhDang(dtThu)} đ/năm (${p.canCuSoLieu.trim()})`, "Mức": `${dinhDang(muc)} đ/cơ sở (${tren ? "trên" : "từ"} ${dinhDang(D(k.nguongDoanhThu))} đ/năm${tren ? "" : " trở xuống"})` },
      congThuc: "Mức cố định theo doanh thu (đ/cơ sở)",
      thanhTien: muc,
      canCu: [...canCu, { vanBan: p.canCuSoLieu.trim(), viTri: "" }],
      canhBao: ["Điều kiện: hộ SXKD phi NN có đăng ký kinh doanh, nộp thuế đầy đủ nhưng không thực hiện chế độ kế toán, báo cáo tài chính — cán bộ xác nhận"],
    });
  }
  if (p.thuNhapBinhQuanNam === undefined || p.thuNhapBinhQuanNam === "") return thieu("C04", nd, "Chưa nhập thu nhập sau thuế bình quân năm của 3 năm liền kề", canCu);
  const tn = D(p.thuNhapBinhQuanNam);
  const tamThoi = p.cach === "K2_TAM_THOI";
  const tyLe = D(k.tyLeThuNhap).mul(tamThoi ? k.tyLeTamThoi : 1);
  return dong({
    ma: "C04",
    noiDung: nd,
    thamSo: { "Trường hợp": TEN_SXKD[p.cach], "Thu nhập sau thuế BQ 3 năm": `${dinhDang(tn)} đ/năm (${p.canCuSoLieu.trim()})`, "Tỷ lệ": tamThoi ? `${phanTram(k.tyLeThuNhap)} × ${phanTram(k.tyLeTamThoi)}` : phanTram(k.tyLeThuNhap) },
    congThuc: tamThoi ? "Thu nhập sau thuế BQ năm × 30% × 50%" : "Thu nhập sau thuế BQ năm × 30%",
    thanhTien: tn.mul(tyLe),
    canCu: [...canCu, { vanBan: p.canCuSoLieu.trim(), viTri: "" }],
    canhBao: ["Điều kiện: có đăng ký kinh doanh, bị ngừng sản xuất kinh doanh khi Nhà nước thu hồi đất; thu nhập sau thuế xác định theo pháp luật thuế TNCN, TNDN — cán bộ xác nhận"],
  });
}
