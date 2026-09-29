import type { BangMoc, BoChinhSach, LoaiDuong, LoaiVatNuoi } from "./chinh-sach";
import { dong } from "./dong";
import { chonTheoMoc } from "./moc-thoi-gian";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";
import type { CanCu, DongTinh, LuaChon } from "./types";

/** A01/A02: giá trị xây dựng mới = khối lượng × đơn giá (QĐ 32/2025). */
export function giaTriXayMoi(p: {
  ten: string;
  khoiLuong: SoVao;
  donVi: string;
  donGia: SoVao;
  maDonGia: string;
  canCu: CanCu[];
}): DongTinh {
  const kl = lamTronDienTich(p.khoiLuong);
  const tien = kl.mul(p.donGia);
  return dong({
    ma: "A01",
    noiDung: `Giá trị xây dựng mới – ${p.ten}`,
    thamSo: { "Khối lượng": `${dinhDang(kl, 2)} ${p.donVi}`, "Đơn giá": `${dinhDang(p.donGia)} đ (${p.maDonGia})` },
    congThuc: "Khối lượng × Đơn giá",
    thanhTien: tien,
    canCu: p.canCu,
  });
}

/**
 * A03 – bồi thường nhà, công trình khác theo thiệt hại thực tế (QD-10, QD-11):
 * Tgt = G1 − G1/T × T1; Mức BT = min(max((1 + tỷ lệ) × Tgt; sàn × G1); trần × G1).
 * T và T1 do người dùng nhập (có căn cứ), không tự suy.
 */
export function nhaCongTrinhThietHaiThucTe(
  cs: BoChinhSach,
  p: { ten: string; G1: SoVao; T: SoVao; T1: SoVao; canCuKhauHao: string },
): DongTinh {
  const k = cs.nhaCongTrinh;
  const G1 = D(p.G1), T = D(p.T), T1 = D(p.T1);
  const canhBao: string[] = [];
  if (T.lte(0)) {
    return dong({
      ma: "A03", noiDung: `Bồi thường nhà, công trình – ${p.ten}`, congThuc: "Tgt = G1 − G1/T × T1",
      thanhTien: null, canCu: k.canCu, trangThai: "THIEU_CAN_CU",
      canhBao: ["Chưa có thời gian khấu hao T"],
    });
  }
  if (T1.gt(T)) canhBao.push("Thời gian đã sử dụng lớn hơn thời gian khấu hao: Tgt âm, áp dụng mức sàn");
  const Tgt = G1.minus(G1.div(T).mul(T1));
  const coThem = Tgt.mul(D(1).plus(k.tyLeCongThem));
  const san = G1.mul(k.san), tran = G1.mul(k.tran);
  const muc = Decimal_min(Decimal_max(coThem, san), tran);
  return dong({
    ma: "A03",
    noiDung: `Bồi thường nhà, công trình – ${p.ten}`,
    thamSo: {
      "G1 (giá trị xây mới)": `${dinhDang(G1)} đ`,
      "T (khấu hao)": `${dinhDang(T, 2)} năm – ${p.canCuKhauHao}`,
      "T1 (đã sử dụng)": `${dinhDang(T1, 2)} năm`,
      "Tgt (giá trị hiện có)": `${dinhDang(Tgt)} đ`,
      "(1 + tỷ lệ) × Tgt": `${dinhDang(coThem)} đ`,
      "Sàn / trần": `${dinhDang(san)} / ${dinhDang(tran)} đ`,
    },
    congThuc: "min(max((1 + 20%) × Tgt; 60% × G1); 100% × G1), Tgt = G1 − G1/T × T1",
    thanhTien: muc,
    canCu: k.canCu,
    canhBao,
  });
}

const Decimal_min = (a: ReturnType<typeof D>, b: ReturnType<typeof D>) => (a.lt(b) ? a : b);
const Decimal_max = (a: ReturnType<typeof D>, b: ReturnType<typeof D>) => (a.gt(b) ? a : b);

/**
 * A08/A09/A10 – hỗ trợ nhà, công trình theo mốc thời gian xây dựng.
 * Ngày xây dựng rơi đúng khe mốc (VM-09) → CAN_XAC_NHAN, trừ khi người dùng đã chọn (QD-12).
 */
export function hoTroTheoMocXayDung(
  bang: BangMoc,
  p: {
    ma: "A08" | "A09" | "A10";
    ten: string;
    giaTriTheoDonGia: SoVao;
    ngayXayDung: string;
    ngayThongBao: string;
    luaChon?: { moTaMoc: string; lyDo: string };
  },
): DongTinh {
  const kq = chonTheoMoc(p.ngayXayDung, bang.moc, p.ngayThongBao);
  const coSo = { ma: p.ma, noiDung: `Hỗ trợ nhà, công trình – ${p.ten}`, canCu: bang.canCu, congThuc: "Tỷ lệ theo mốc thời gian × giá trị theo đơn giá" };
  const vn = (iso: string) => iso.split("-").reverse().join("/");
  const thamSo = { "Giá trị theo đơn giá": `${dinhDang(p.giaTriTheoDonGia)} đ`, "Ngày xây dựng": vn(p.ngayXayDung), "Ngày thông báo thu hồi": vn(p.ngayThongBao) };
  if (kq.loai === "NGOAI_PHAM_VI") {
    return dong({ ...coSo, thamSo, thanhTien: null, trangThai: "THIEU_CAN_CU", canhBao: ["Ngày xây dựng không thuộc khoảng nào (có thể xây sau thông báo thu hồi đất)"] });
  }
  let khoang = kq.loai === "KHOP" ? kq.khoang : undefined;
  const luaChon: LuaChon[] = [];
  if (kq.loai === "KHOANG_TRONG") {
    const chon = p.luaChon?.lyDo.trim() ? kq.lienKe.find((k) => k.moTa === p.luaChon!.moTaMoc) : undefined;
    if (!chon) {
      return dong({
        ...coSo, thamSo, thanhTien: null, trangThai: "CAN_XAC_NHAN",
        canhBao: [`Ngày xây dựng trùng đúng ngày mốc — văn bản không xếp vào mức nào (VM-09). Người dùng chọn một trong: ${kq.lienKe.map((k) => k.moTa).join(" | ")} (ghi lý do)`],
      });
    }
    khoang = chon;
    luaChon.push({ ma: "QD-12", giaTri: chon.moTa, lyDo: p.luaChon!.lyDo });
  }
  const tyLe = D(khoang!.giaTri);
  return dong({
    ...coSo,
    thamSo: { ...thamSo, "Mức áp dụng": khoang!.moTa },
    thanhTien: D(p.giaTriTheoDonGia).mul(tyLe),
    luaChon,
  });
}

/** A19 – hỗ trợ di dời vật nuôi (PL V QĐ 106/2025): ≤ 5 km theo mục I, phần vượt theo mục II. */
export function diDoiVatNuoi(
  cs: BoChinhSach,
  p: { loaiDuong: LoaiDuong; loaiVatNuoi: LoaiVatNuoi; khoiLuong: SoVao; quangDuongKm: SoVao },
): DongTinh {
  const g = cs.vatNuoi.donGia[p.loaiDuong][p.loaiVatNuoi];
  const nguong = D(cs.vatNuoi.nguongKm);
  const km = D(p.quangDuongKm);
  const kmDau = km.lt(nguong) ? km : nguong;
  const kmSau = km.gt(nguong) ? km.minus(nguong) : D(0);
  const kl = D(p.khoiLuong);
  const tien = kl.mul(kmDau).mul(g.den5km).plus(kl.mul(kmSau).mul(g.tren5km));
  return dong({
    ma: "A19",
    noiDung: "Hỗ trợ di dời vật nuôi",
    thamSo: {
      "Khối lượng": `${dinhDang(kl, 3)} ${g.donVi}`,
      "Quãng đường": `${dinhDang(km, 2)} km (≤ ${nguong} km: ${dinhDang(kmDau, 2)}; phần vượt: ${dinhDang(kmSau, 2)})`,
      "Đơn giá": `${dinhDang(g.den5km, 1)} / ${dinhDang(g.tren5km, 1)} đ/${g.donVi}/km`,
    },
    congThuc: "KL × km(≤5) × ĐG mục I + KL × km(>5) × ĐG mục II",
    thanhTien: tien,
    canCu: cs.vatNuoi.canCu,
  });
}

/**
 * A13/A14 – cây trồng. Đơn vị theo cây: số cây ≤ mật độ × 150% × DT(ha) hưởng 100% đơn giá,
 * phần vượt hưởng 30% (k4, k5 Đ5 PL VIII). Không có mật độ quy định → tính toàn bộ số cây.
 */
export function cayTrong(
  cs: BoChinhSach,
  p: { ten: string; maDonGia: string; donVi: "cây" | "m²" | "trụ" | "m"; donGia: SoVao; soLuong: SoVao; dienTichTrongM2?: SoVao; matDoToiDaHa?: SoVao | null },
): DongTinh {
  const k = cs.cayTrong;
  const dg = D(p.donGia);
  if (p.donVi === "m²" || p.donVi === "m" || !p.matDoToiDaHa) {
    const sl = p.donVi === "m²" ? lamTronDienTich(p.soLuong) : D(p.soLuong);
    return dong({
      ma: p.donVi === "m²" ? "A13" : "A14",
      noiDung: `Cây trồng – ${p.ten}`,
      thamSo: { "Số lượng": `${dinhDang(sl, p.donVi === "m²" ? 2 : 0)} ${p.donVi}`, "Đơn giá": `${dinhDang(dg)} đ/${p.donVi} (${p.maDonGia})` },
      congThuc: "Số lượng × Đơn giá",
      thanhTien: sl.mul(dg),
      canCu: k.canCu,
      canhBao: p.donVi !== "m²" && p.donVi !== "m" && !p.matDoToiDaHa ? ["Loại cây không quy định mật độ: tính theo số cây thực tế"] : [],
    });
  }
  if (p.dienTichTrongM2 === undefined) {
    return dong({ ma: "A14", noiDung: `Cây trồng – ${p.ten}`, congThuc: "Theo mật độ", thanhTien: null, canCu: k.canCu, trangThai: "CAN_XAC_NHAN", canhBao: ["Thiếu diện tích trồng để áp mật độ"] });
  }
  const dtHa = lamTronDienTich(p.dienTichTrongM2).div(10000);
  const toiDa = D(p.matDoToiDaHa).mul(k.tyLeVuotMatDo).mul(dtHa).floor();
  const sl = D(p.soLuong);
  const soDu = sl.lt(toiDa) ? sl : toiDa;
  const soVuot = sl.minus(soDu);
  const tien = soDu.mul(dg).plus(soVuot.mul(dg).mul(k.tyLePhanVuot));
  return dong({
    ma: "A14",
    noiDung: `Cây trồng – ${p.ten}`,
    thamSo: {
      "Số cây kiểm đếm": dinhDang(sl),
      "Diện tích trồng": `${dinhDang(dtHa.mul(10000), 2)} m²`,
      "Mật độ quy định": `${dinhDang(p.matDoToiDaHa)} ${p.donVi}/ha`,
      "Số cây hưởng 100% (≤ 150% mật độ)": dinhDang(soDu),
      "Số cây vượt (hưởng 30%)": dinhDang(soVuot),
      "Đơn giá": `${dinhDang(dg)} đ/${p.donVi} (${p.maDonGia})`,
    },
    congThuc: "Số cây trong mật độ × ĐG + Số cây vượt × ĐG × 30%",
    thanhTien: tien,
    canCu: k.canCu,
    canhBao: [
      "Số cây tối đa hưởng 100% làm tròn xuống số nguyên",
      ...(soVuot.gt(0) ? ["Có cây vượt mật độ: phần vượt chưa có giới hạn trên trong văn bản (VM-10)"] : []),
    ],
  });
}

/** A20 – di chuyển mồ mả (Đ8 PL II QĐ 106/2025). Mộ quy mô lớn tính theo dự toán được duyệt. */
export function moMa(cs: BoChinhSach, p: { soMoXay: number; soMoKhongXay: number }): DongTinh {
  const k = cs.moMa;
  return dong({
    ma: "A20",
    noiDung: "Bồi thường di chuyển mồ mả",
    thamSo: { "Mộ xây": `${p.soMoXay} × ${dinhDang(k.mucXay)} đ`, "Mộ không xây": `${p.soMoKhongXay} × ${dinhDang(k.mucKhongXay)} đ` },
    congThuc: "Số mộ xây × mức mộ xây + Số mộ không xây × mức mộ không xây",
    thanhTien: D(p.soMoXay).mul(k.mucXay).plus(D(p.soMoKhongXay).mul(k.mucKhongXay)),
    canCu: k.canCu,
  });
}
