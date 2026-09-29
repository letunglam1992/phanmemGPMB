/**
 * Điều phối tính toán cho một hộ/đối tượng: gọi các hàm của lõi (@gpmb/core) theo dữ liệu hồ sơ,
 * nhóm kết quả theo cấu trúc biểu áp giá (A. Bồi thường, B. Hỗ trợ) và theo thửa.
 * Không chứa quy tắc pháp lý riêng — mọi mức, hệ số lấy từ bộ chính sách.
 */
import {
  lamTronDienTich,
  boiThuongDat,
  cayTrong,
  cayTrongXenCanh,
  datTheoPhanLop,
  chuyenDoiNghe,
  D,
  diDoiVatNuoi,
  dinhDang,
  dong,
  giaTriXayMoi,
  moMa,
  nhaCongTrinhThietHaiThucTe,
  onDinhDoiSong,
  tamCu,
  hoTroTuLoChoO,
  hoTroSuatToiThieu,
  hoTroTienSddTdc,
  hoTroDoiTuongChinhSach,
  hoTroHoNgheo,
  hoTroXayLaiNha,
  hoTroTheoMocXayDung,
  chiPhiDauTuTheoGiaDat,
  boiThuongHanhLang,
  hoTroNhaHanhLang,
  hoTroNhaSoHuuNhaNuoc,
  hoTroOnDinhSanXuatDat,
  hoTroOnDinhSxkd,
  TEN_NHOM_HANH_LANG,
  phanBoDatO,
  phanBoDatNN,
  TEN_TRUONG_HOP_NN,
  tongHo,
  type BoChinhSach,
  type DongCayXen,
  type DongTinh,
  type TongHo,
} from "@gpmb/core";
import type Decimal from "decimal.js";
import { thuTinh } from "./bieu-thuc";
import type { DuAn, Ho, TaiDinhCuHo, TaiSan, Thua } from "./mo-hinh";
import { laSoMay, truongLoi, truongSoDuAn, truongSoHo } from "./so";
import { duAnCuaHo } from "./dot-thu-hoi";

export const LOAI_DAT_NN = ["LUC", "LUK", "LUN", "BHK", "NHK", "HNK", "CLN", "RSX", "RPH", "RDD", "NTS", "NKH", "LNP"];
export const laDatNN = (ma: string) => LOAI_DAT_NN.includes(ma.toUpperCase());

/** Cột của biểu "TH GIÁ TRỊ TRÌNH DUYỆT" mà dòng tính được cộng vào. */
export type CotTongHop = "BT_DAT" | "BT_CAY" | "BT_TAI_SAN" | "HT_DAT" | "HT_TAI_SAN" | "HT_CAY" | "HT_CDN" | "HT_KHAC";

export const TEN_COT: Record<CotTongHop, string> = {
  BT_DAT: "Bồi thường đất",
  BT_CAY: "Bồi thường cây trồng, vật nuôi",
  BT_TAI_SAN: "Bồi thường nhà, công trình",
  HT_DAT: "Hỗ trợ đất",
  HT_TAI_SAN: "Hỗ trợ tài sản, vật kiến trúc",
  HT_CAY: "Hỗ trợ cây cối, hoa màu",
  HT_CDN: "Hỗ trợ chuyển đổi nghề",
  HT_KHAC: "Hỗ trợ khác (ổn định đời sống, tạm cư, di dời, tái định cư)",
};

/** Dòng hiển thị theo cột biểu mẫu: ĐVT | Khối lượng | Hệ số/mức | Đơn giá (thành tiền = tích). */
export interface DongBieu {
  ghiChu?: string;
  dvt: string;
  kl: Decimal;
  heSo: Decimal | null;
  donGia: Decimal;
}

export interface DongKetQua {
  dong: DongTinh;
  bieu?: DongBieu[];
  cot: CotTongHop;
  thuaId?: string;
  taiSanId?: string;
}

export interface NhomKetQua {
  ma: string;
  ten: string;
  dong: DongKetQua[];
}

export interface KetQuaHo {
  nhom: NhomKetQua[];
  tatCa: DongKetQua[];
  tong: TongHo;
  theoCot: Record<CotTongHop, Decimal>;
  tongBoiThuong: Decimal;
  tongHoTro: Decimal;
  /** Cách làm tròn tổng đã áp dụng (VM-36), để in kèm bảng tính. */
  moTaLamTron: string;
  khauTru: Decimal;
  conLai: Decimal;
}

const thieu = (ma: string, noiDung: string, canhBao: string, canCu = "Hồ sơ"): DongTinh =>
  dong({
    ma,
    noiDung,
    congThuc: "—",
    thanhTien: null,
    canCu: [{ vanBan: canCu, viTri: "" }],
    trangThai: "THIEU_CAN_CU",
    canhBao: [canhBao],
  });

function soLuong(ts: { ten: string }, vao: string, ma: string): { v: Decimal | null; loi: DongTinh | null } {
  const r = thuTinh(vao);
  if (r.loi) return { v: null, loi: thieu(ma, ts.ten, `Khối lượng/số lượng: ${r.loi}`) };
  return { v: r.giaTri, loi: null };
}

/** Bảng 05 (đất ở) → tỷ lệ phân lớp đất ở; Bảng 06, 07 (TMDV, SXKD) → tỷ lệ đất PNN. */
export const nhomPhanLop = (bang: string): "DAT_O" | "PNN" => (bang === "05" ? "DAT_O" : "PNN");

const nhanThua = (t: Thua) => `Thửa ${t.soThua}, tờ ${t.soTo}`;

function dongDat(duAn: DuAn, t: Thua): DongTinh {
  if (!t.gia) return thieu("B01", `Bồi thường về đất – ${t.loaiDat} (${nhanThua(t)})`, "Chưa chọn giá đất từ bảng giá", "NQ 152/2025/NQ-HĐND");
  const hs = duAn.heSoGiaDat && !D(duAn.heSoGiaDat.heSo).eq(1) ? { heSo: duAn.heSoGiaDat.heSo, vanBan: duAn.heSoGiaDat.vanBan } : undefined;
  const d = boiThuongDat({
    loaiDat: `${t.loaiDat} (${nhanThua(t)})`,
    dienTichM2: t.dienTichThuHoi || "0",
    giaBangGiaNghinDong: t.gia.giaNghinDong,
    nguonGia: t.gia.nguon,
    heSoDuAn: hs,
    canCu: [{ vanBan: "NQ 152/2025/NQ-HĐND", viTri: t.gia.nguon }, { vanBan: "Quyết định nghiệp vụ QD-02", viTri: "docs/06" }],
  });
  return d;
}

/**
 * B13 – thửa nguồn gốc nông, lâm trường (k9 Đ6 QĐ 14/2026). Trả về khoản hỗ trợ về đất theo trường hợp cán bộ chọn;
 * null khi thửa không thuộc B13 (tính như thường).
 */
function nongLamTruong(cs: BoChinhSach, duAn: DuAn, t: Thua): { ma: string; dat: DongTinh; bieu?: DongBieu[]; cayHoTro: boolean; canCu: DongTinh["canCu"] } | null {
  if (!t.nongLamTruong) return null;
  const ma = t.nongLamTruong.truongHop;
  const nd = `${t.loaiDat} (${nhanThua(t)})`;
  const th = cs.nongLamTruong?.truongHop[ma];
  if (!th) {
    return { ma, dat: thieu("B13", `Hỗ trợ về đất nguồn gốc nông, lâm trường – ${nd}`, `Bộ chính sách ${cs.ma} không có quy định trường hợp ${ma}`, "QĐ 14/2026/QĐ-UBND"), cayHoTro: false, canCu: [] };
  }
  const canCu = th.canCu;
  const cayHoTro = th.cayTrong === "HO_TRO_100";
  const canhBaoHoSo = t.nongLamTruong.hoSo.trim() ? [] : ["Chưa ghi hồ sơ xác nhận nguồn gốc đất (hợp đồng giao khoán, xác nhận của công ty, quyết định thu hồi…) — VM-37"];
  const noiDung = `${th.tenKhoanDat} – ${nd}`;
  if (!th.datLan) {
    return {
      ma, cayHoTro, canCu,
      dat: dong({ ma: "B13", noiDung, congThuc: "Chưa tính tự động: đất ở trong hạn mức theo giá đất ở, phần còn lại theo giá đất NN, khấu trừ nghĩa vụ tài chính", thanhTien: null, canCu, trangThai: "CAN_XAC_NHAN", canhBao: ["Trường hợp " + ma + ": cán bộ tính và nhập khoản hỗ trợ ở thẻ Kiểm đếm (tài sản khác, phần Hỗ trợ) kèm căn cứ", ...canhBaoHoSo] }),
    };
  }
  if (!t.gia) return { ma, cayHoTro, canCu, dat: thieu("B13", noiDung, "Chưa chọn giá đất nông nghiệp từ bảng giá", "NQ 152/2025/NQ-HĐND") };
  if (!duAn.hanMucNN) return { ma, cayHoTro, canCu, dat: thieu("B13", noiDung, "Chưa nhập hạn mức đất nông nghiệp của dự án — diện tích tính hỗ trợ không vượt hạn mức công nhận cùng loại") };
  const dt = lamTronDienTich(t.dienTichThuHoi || "0");
  const han = D(duAn.hanMucNN.m2);
  const dtTinh = dt.lt(han) ? dt : han;
  const gia = D(t.gia.giaNghinDong).mul(1000);
  const lan = D(th.datLan);
  const dat = dong({
    ma: "B13",
    noiDung,
    thamSo: {
      "Trường hợp": `${ma} — ${th.ten}`,
      "DT thu hồi": `${dinhDang(dt, 2)} m²`,
      "Hạn mức công nhận đất NN cùng loại": `${dinhDang(han, 2)} m² (${duAn.hanMucNN.canCu || "chưa ghi căn cứ"})`,
      "DT tính hỗ trợ": `${dinhDang(dtTinh, 2)} m²`,
      "Giá đất NN theo bảng giá": `${dinhDang(gia)} đ/m² (${t.gia.nguon})`,
      "Số lần giá đất": dinhDang(lan, 2),
      "Hồ sơ nguồn gốc": t.nongLamTruong.hoSo || "chưa ghi",
    },
    congThuc: "DT tính hỗ trợ (≤ hạn mức) × Giá đất NN theo bảng giá × Số lần",
    thanhTien: dtTinh.mul(gia).mul(lan),
    canCu: [...canCu, { vanBan: "NQ 152/2025/NQ-HĐND", viTri: t.gia.nguon }],
    trangThai: canhBaoHoSo.length ? "CAN_XAC_NHAN" : "TAM_TINH",
    canhBao: [...canhBaoHoSo, ...(dt.gt(han) ? [`DT thu hồi vượt hạn mức: phần ${dinhDang(dt.minus(han), 2)} m² không tính hỗ trợ`] : []), ...(duAn.heSoGiaDat && !D(duAn.heSoGiaDat.heSo).eq(1) ? ["Văn bản quy định theo bảng giá đất: không nhân hệ số điều chỉnh giá đất của dự án"] : [])],
  });
  return { ma, cayHoTro, canCu, dat, bieu: [{ dvt: "m²", kl: dtTinh, heSo: lan, donGia: gia }] };
}

/** Khoản 3 Điều 6 QĐ 14/2026: bảng mốc theo trường hợp. */
const MA_K3 = { "3.1": "A08", "3.2": "A09", "3.3": "A10" } as const;
export const TEN_K3: Record<"3.1" | "3.2" | "3.3", string> = {
  "3.1": "3.1 — Xây trên đất nông nghiệp đủ điều kiện bồi thường về đất nhưng không đúng mục đích",
  "3.2": "3.2 — Xây trên đất không đủ điều kiện bồi thường về đất",
  "3.3": "3.3 — Trường hợp 3.1, 3.2 có biên bản xử lý vi phạm (đình chỉ / buộc tháo dỡ)",
};
export const bangK3 = (cs: BoChinhSach, th: "3.1" | "3.2" | "3.3") => (th === "3.1" ? cs.hoTroNhaDatDuDieuKienSaiMucDich : th === "3.2" ? cs.hoTroNhaDatKhongDuDieuKien : cs.hoTroThaoDoCoViPham);

function dongNhaCongTrinh(cs: BoChinhSach, ts: Extract<TaiSan, { loai: "NHA_CT" }>, ngayTB = ""): DongTinh {
  const kl = soLuong(ts, ts.khoiLuong, "A03");
  if (kl.loi) return kl.loi;
  const canCu = [{ vanBan: "QĐ 32/2025/QĐ-UBND", viTri: `${ts.maDonGia}${ts.canCu ? " – " + ts.canCu : ""}` }];
  const xm = giaTriXayMoi({ ten: ts.ten, khoiLuong: kl.v!, donVi: ts.donVi, donGia: ts.donGia, maDonGia: ts.maDonGia, canCu });
  if (ts.cachTinh === "MOC_K3") {
    const k3 = ts.k3;
    const nd = `Hỗ trợ nhà, công trình – ${ts.ten}`;
    if (!k3) return thieu("A09", nd, "Chưa chọn trường hợp (điểm 3.1, 3.2, 3.3 khoản 3 Điều 6 QĐ 14/2026)", "QĐ 14/2026/QĐ-UBND khoản 3 Điều 6");
    if (!k3.ngayXayDung) return thieu(MA_K3[k3.truongHop], nd, "Chưa nhập ngày (thời điểm) xây dựng", "QĐ 14/2026/QĐ-UBND khoản 3 Điều 6");
    if (!ngayTB) return thieu(MA_K3[k3.truongHop], nd, "Dự án (hoặc đợt) chưa có ngày thông báo thu hồi đất — mốc cuối của khoản 3", "QĐ 14/2026/QĐ-UBND khoản 3 Điều 6");
    const d = hoTroTheoMocXayDung(bangK3(cs, k3.truongHop), { ma: MA_K3[k3.truongHop], ten: ts.ten, giaTriTheoDonGia: xm.thanhTien!, ngayXayDung: k3.ngayXayDung, ngayThongBao: ngayTB, luaChon: k3.chonMoc });
    const them = k3.truongHop === "3.1" ? ["Điểm 3.1: nhà, công trình xây trên đất nông nghiệp — cán bộ xác nhận"] : [];
    return { ...d, thamSo: { ...xm.thamSo, "Trường hợp": TEN_K3[k3.truongHop], ...d.thamSo }, canCu: [...d.canCu, ...canCu], canhBao: [...d.canhBao, ...them] };
  }
  if (ts.cachTinh === "HANH_LANG") {
    const hl = ts.hanhLang ?? { diem: "a" as const };
    const a = hoTroNhaHanhLang(cs, { ten: ts.ten, giaTriTheoDonGia: xm.thanhTien! });
    if (hl.diem === "a") return { ...a, thamSo: { ...xm.thamSo, "Điểm": "a — đất đủ điều kiện bồi thường", ...a.thamSo }, canCu: [...a.canCu, ...canCu] };
    // Điểm b: văn bản dẫn chiếu điểm 4.2, 4.3 k4 Điều 17 PL II (đã hết hiệu lực) — người dùng chọn áp dụng mức theo k3 Điều 6 QĐ 14/2026.
    const nd = `Hỗ trợ nhà, công trình trong hành lang lưới điện (đất không đủ điều kiện) – ${ts.ten}`;
    const cc = [{ vanBan: "QĐ 106/2025/QĐ-UBND", viTri: "điểm b khoản 3 Điều 7 Phụ lục II" }];
    const tl = cs.phuLucII?.hanhLangNha;
    if (!tl) return thieu("A12", nd, `Bộ chính sách ${cs.ma} không có tham số Phụ lục II QĐ 106/2025`);
    const k3 = ts.k3;
    if (!k3 || !k3.ngayXayDung || !ngayTB) return thieu("A12", nd, "Điểm b dẫn chiếu điểm 4.2, 4.3 k4 Điều 17 PL II (đã hết hiệu lực từ 31/3/2026): chọn trường hợp, ngày xây dựng theo khoản 3 Điều 6 QĐ 14/2026 làm mức hỗ trợ (và dự án phải có ngày thông báo thu hồi đất)", "QĐ 106/2025/QĐ-UBND điểm b khoản 3 Điều 7 PL II");
    const m = hoTroTheoMocXayDung(bangK3(cs, k3.truongHop), { ma: MA_K3[k3.truongHop], ten: ts.ten, giaTriTheoDonGia: xm.thanhTien!, ngayXayDung: k3.ngayXayDung, ngayThongBao: ngayTB, luaChon: k3.chonMoc });
    const lyDo = hl.lyDo?.trim() ?? "";
    const tyLe = D(tl.tyLe);
    return {
      ...m,
      ma: "A12",
      noiDung: nd,
      thamSo: { ...xm.thamSo, "Trường hợp (k3 Đ6 QĐ 14/2026)": TEN_K3[k3.truongHop], ...m.thamSo, "Tỷ lệ Điều 7": `${dinhDang(tyLe.mul(100))}%` },
      congThuc: `(${m.congThuc}) × ${dinhDang(tyLe.mul(100))}%`,
      thanhTien: m.thanhTien ? m.thanhTien.mul(tyLe) : null,
      canCu: [...cc, ...m.canCu, ...canCu],
      trangThai: !lyDo && m.trangThai === "TAM_TINH" ? "CAN_XAC_NHAN" : m.trangThai,
      luaChon: lyDo ? [...m.luaChon, { ma: "Đ7.3b", giaTri: "Mức hỗ trợ theo khoản 3 Điều 6 QĐ 14/2026 thay điểm 4.2, 4.3 k4 Điều 17 PL II", lyDo }] : m.luaChon,
      canhBao: [...m.canhBao, ...(lyDo ? [] : ["Chưa ghi lý do áp dụng mức khoản 3 Điều 6 QĐ 14/2026 thay cho điểm 4.2, 4.3 k4 Điều 17 PL II đã hết hiệu lực"])],
    };
  }
  if (ts.cachTinh === "HE_SO") {
    const hs = D(ts.heSo || "1");
    return dong({
      ma: ts.phan === "BOI_THUONG" ? "A03" : "A11",
      noiDung: `${ts.phan === "BOI_THUONG" ? "Bồi thường" : "Hỗ trợ"} – ${ts.ten}`,
      thamSo: { ...xm.thamSo, "Hệ số / mức hỗ trợ": dinhDang(hs, 2) },
      congThuc: "Khối lượng × Hệ số × Đơn giá",
      thanhTien: xm.thanhTien!.mul(hs),
      canCu,
    });
  }
  if (!ts.T || !ts.T1) {
    return dong({
      ...xm,
      ma: "A03",
      noiDung: `Bồi thường nhà, công trình – ${ts.ten}`,
      thanhTien: null,
      trangThai: "CAN_XAC_NHAN",
      canhBao: ["Chưa nhập thời gian khấu hao T / thời gian đã sử dụng T1 (QD-11)"],
    });
  }
  const d = nhaCongTrinhThietHaiThucTe(cs, { ten: ts.ten, G1: xm.thanhTien!, T: ts.T, T1: ts.T1, canCuKhauHao: ts.canCuKhauHao || "chưa ghi căn cứ" });
  return { ...d, thamSo: { ...xm.thamSo, ...d.thamSo }, canCu: [...canCu, ...d.canCu] };
}

function dongCayThua(cs: BoChinhSach, t: Thua, cay: Extract<TaiSan, { loai: "CAY" }>[]): DongKetQua[] {
  const out: DongKetQua[] = [];
  const theoMatDo: { ts: (typeof cay)[number]; dong: DongCayXen }[] = [];
  const khongMatDo: { ts: (typeof cay)[number]; sl: Decimal }[] = [];
  for (const c of cay) {
    const sl = soLuong(c, c.soLuong, "A14");
    if (sl.loi) {
      out.push({ dong: sl.loi, cot: "BT_CAY", thuaId: t.id, taiSanId: c.id });
      continue;
    }
    const donViCay = c.donVi !== "m²" && c.donVi !== "m";
    if (donViCay && c.matDoHa) {
      theoMatDo.push({ ts: c, dong: { ten: c.ten, maDonGia: c.maDonGia, donVi: c.donVi, donGia: c.donGia, soLuong: sl.v!, matDoHa: c.matDoHa } });
    } else khongMatDo.push({ ts: c, sl: sl.v! });
  }
  // VM-35: thửa đã có cây tính theo quỹ mật độ (trồng xen) → dòng không có mật độ phải được cán bộ chọn cách tính.
  const xen = theoMatDo.length > 0;
  const chon = t.cayXen?.khongMatDo;
  const lyDo = t.cayXen?.lyDoKhongMatDo?.trim() ?? "";
  for (const { ts: c, sl } of khongMatDo) {
    const d0 = cayTrong(cs, { ten: c.ten, maDonGia: c.maDonGia, donVi: (c.donVi as "cây" | "m²" | "trụ" | "m") ?? "cây", donGia: c.donGia, soLuong: sl });
    const kl = c.donVi === "m²" ? sl.toDecimalPlaces(2) : sl;
    if (!xen) {
      out.push({ dong: d0, bieu: [{ dvt: c.donVi, kl, heSo: D(1), donGia: D(c.donGia) }], cot: "BT_CAY", thuaId: t.id, taiSanId: c.id });
      continue;
    }
    const heSo = chon === "TINH_30" ? D(cs.cayTrong.tyLePhanVuot) : D(1);
    const daChon = !!chon && !!lyDo;
    const d: DongTinh = {
      ...d0,
      thanhTien: d0.thanhTien ? d0.thanhTien.mul(heSo) : d0.thanhTien,
      congThuc: chon === "TINH_30" ? `${d0.congThuc} × ${heSo.mul(100).toString()}%` : d0.congThuc,
      trangThai: daChon ? d0.trangThai : "CAN_XAC_NHAN",
      luaChon: daChon ? [...d0.luaChon, { ma: "VM-35", giaTri: chon === "TINH_30" ? "Tính 30% như số cây còn lại (k4 Đ5 PL VIII)" : "Tính 100% đơn giá", lyDo }] : d0.luaChon,
      canhBao: [
        ...d0.canhBao,
        ...(daChon
          ? []
          : [
              chon
                ? "Đã chọn cách tính cây không có mật độ trên thửa trồng xen nhưng chưa ghi lý do (VM-35)"
                : "Thửa có cây trồng xen tính theo quỹ mật độ; dòng này không có mật độ quy định — chọn tính 100% hay 30% ở thẻ Thửa đất (VM-35)",
            ]),
      ],
    };
    out.push({ dong: d, bieu: [{ ...(chon === "TINH_30" ? { ghiChu: "Trồng xen, không có mật độ quy định" } : {}), dvt: c.donVi, kl, heSo, donGia: D(c.donGia) }], cot: "BT_CAY", thuaId: t.id, taiSanId: c.id });
  }
  if (theoMatDo.length) {
    const tuy = t.cayXen;
    const ds = theoMatDo.map((x) => x.dong);
    const kq = cayTrongXenCanh(cs, {
      dienTichM2: t.dienTichThuHoi || "0",
      dienTichTruM2: tuy?.dienTichTru || 0,
      lyDoTru: tuy?.lyDoTru,
      cachXep: tuy?.cachXep,
      thuTuChuSoHuu: ds,
      cay: ds,
    });
    kq.dong.forEach((d, i) => {
      const pc = kq.phanChia[i];
      const x = theoMatDo[i]!;
      const bieu = pc
        ? [
            ...(pc.du.gt(0) || pc.vuot.isZero() ? [{ dvt: x.dong.donVi, kl: pc.du, heSo: D(1), donGia: D(x.dong.donGia) }] : []),
            ...(pc.vuot.gt(0) ? [{ ghiChu: "Vượt mật độ quy định", dvt: x.dong.donVi, kl: pc.vuot, heSo: D(cs.cayTrong.tyLePhanVuot), donGia: D(x.dong.donGia) }] : []),
          ]
        : undefined;
      out.push({ dong: d, bieu, cot: "BT_CAY", thuaId: t.id, taiSanId: x.ts.id });
    });
  }
  return out;
}

/**
 * Tính một hộ. Không bao giờ ném lỗi (P0-1): giá trị số không đọc được (vd. "9222,1" từ dữ liệu cũ) → dòng
 * "Thiếu căn cứ" nêu đúng trường, giá trị; phần còn lại tính trên bản sao đã bỏ giá trị lỗi. Tổng không được chốt
 * khi còn dòng này (tongHo: duocChot = false). Lỗi bất ngờ trong khi tính cũng trả về dòng "Thiếu căn cứ".
 */
/**
 * Bộ nhớ đệm kết quả tính (P1-1): hồ sơ, dự án, bộ chính sách là dữ liệu bất biến trong giao diện (mỗi lần sửa tạo đối
 * tượng mới) nên kết quả được ghi nhớ theo bộ ba tham chiếu; đối tượng cũ bị thu hồi thì mục đệm tự mất (WeakMap).
 * Nơi sửa trực tiếp đối tượng rồi tính lại (không tạo đối tượng mới) phải dùng `tinhHoMoi`.
 */
const DEM = new WeakMap<Ho, WeakMap<DuAn, WeakMap<BoChinhSach, KetQuaHo>>>();
export function tinhHo(cs: BoChinhSach, duAn: DuAn, ho: Ho): KetQuaHo {
  let a = DEM.get(ho);
  if (!a) DEM.set(ho, (a = new WeakMap()));
  let b = a.get(duAn);
  if (!b) a.set(duAn, (b = new WeakMap()));
  let k = b.get(cs);
  if (!k) b.set(cs, (k = tinhHoMoi(cs, duAn, ho)));
  return k;
}

/** Tính không qua bộ nhớ đệm. */
export function tinhHoMoi(cs: BoChinhSach, duAn: DuAn, ho: Ho): KetQuaHo {
  const loiHo = truongLoi(truongSoHo(ho));
  const loiDa = truongLoi(truongSoDuAn(duAn));
  let hoTinh = ho, daTinh = duAn;
  if (loiHo.length) {
    hoTinh = structuredClone(ho);
    for (const x of truongLoi(truongSoHo(hoTinh))) x.dat("");
  }
  if (loiDa.length) {
    daTinh = structuredClone(duAn);
    for (const x of truongLoi(truongSoDuAn(daTinh))) x.dat("");
  }
  const dongLoi: DongKetQua[] = [...loiDa, ...loiHo].map((x) => ({
    dong: thieu("DL", x.nhan, `Giá trị không hợp lệ: "${x.gt}" — nhập lại số (dấu chấm phân cách nghìn, dấu phẩy thập phân)`),
    cot: "HT_KHAC",
  }));
  let kq: KetQuaHo;
  try {
    kq = tinhHoGoc(cs, daTinh, hoTinh);
  } catch (e) {
    kq = tinhHoGoc(cs, daTinh, { ...hoTinh, thua: [], taiSan: [], hoTro: { chuyenDoiNghe: false }, khauTru: "" });
    dongLoi.push({ dong: thieu("DL", "Lỗi khi tính hồ sơ", `Không tính được: ${(e as Error).message} — kiểm tra số liệu vừa nhập`), cot: "HT_KHAC" });
  }
  if (!dongLoi.length) return kq;
  const tatCa = [...dongLoi, ...kq.tatCa];
  const lt = duAn.lamTron?.lyDo?.trim() ? duAn.lamTron : null;
  const csTong: BoChinhSach = lt ? { ...cs, lamTron: { ...cs.lamTron, cach: lt.cach } } : cs;
  const tong = tongHo(csTong, tatCa.map((x) => x.dong));
  return { ...kq, nhom: [{ ma: "DL", ten: "Dữ liệu nhập chưa hợp lệ", dong: dongLoi }, ...kq.nhom], tatCa, tong, conLai: tong.tongLamTron.minus(kq.khauTru) };
}

function tinhHoGoc(cs: BoChinhSach, duAn: DuAn, ho: Ho): KetQuaHo {
  const nhom: NhomKetQua[] = [
    { ma: "A.I", ten: "Bồi thường về đất", dong: [] },
    { ma: "A.II", ten: "Bồi thường nhà, công trình, vật kiến trúc", dong: [] },
    { ma: "A.III", ten: "Bồi thường cây trồng, vật nuôi", dong: [] },
    { ma: "B.I", ten: "Hỗ trợ về đất", dong: [] },
    { ma: "B.II", ten: "Hỗ trợ tài sản, vật kiến trúc", dong: [] },
    { ma: "B.III", ten: "Hỗ trợ cây trồng", dong: [] },
    { ma: "B.IV", ten: "Hỗ trợ đào tạo, chuyển đổi nghề và tìm kiếm việc làm", dong: [] },
    { ma: "B.V", ten: "Hỗ trợ ổn định đời sống, tạm cư, di dời", dong: [] },
    { ma: "B.VI", ten: "Hỗ trợ tái định cư", dong: [] },
    { ma: "B.VII", ten: "Hỗ trợ khác (Điều 6 QĐ 14/2026; Phụ lục II QĐ 106/2025)", dong: [] },
  ];
  const n = (ma: string) => nhom.find((x) => x.ma === ma)!;

  for (const t of ho.thua) {
    const b13 = nongLamTruong(cs, duAn, t);
    if (b13 && D(t.dienTichThuHoi || "0").gt(0)) {
      n("B.I").dong.push({ dong: b13.dat, bieu: b13.bieu, cot: "HT_DAT", thuaId: t.id });
    } else if (t.khongGiayTo && D(t.dienTichThuHoi || "0").gt(0)) {
      for (const x of dongKhongGiayTo(cs, duAn, t)) n(x.nhom).dong.push(x.kq);
    } else if (D(t.dienTichThuHoi || "0").gt(0)) {
      const hs = duAn.heSoGiaDat && !D(duAn.heSoGiaDat.heSo).eq(1) ? { heSo: duAn.heSoGiaDat.heSo, vanBan: duAn.heSoGiaDat.vanBan } : undefined;
      if (t.phanLop && t.phanLop.lop.length) {
        const pl = t.phanLop;
        const kq = datTheoPhanLop(cs, {
          loaiDat: `${t.loaiDat} (${nhanThua(t)})`,
          nhom: nhomPhanLop(pl.tuyen.bang),
          nguonTuyen: `Bảng ${pl.tuyen.bang}, ${pl.tuyen.xa}, STT ${pl.tuyen.stt} (${pl.tuyen.tuyen})`,
          dienTichThuHoiM2: t.dienTichThuHoi,
          heSoDuAn: hs,
          lop: pl.lop.map((l) => ({
            lop: l.lop,
            viTri: l.viTri,
            giaViTriNghinDong: pl.tuyen.vt[l.viTri - 1] ?? 0,
            dienTichM2: l.dienTich || "0",
            giaTuyChinhNghinDong: l.giaTuyChinh,
            lyDo: l.lyDo,
          })),
        });
        const bieu = kq.chiTiet.map((x) => ({
          ghiChu: `Lớp ${x.lop}, VT${x.viTri}`,
          dvt: "m²",
          kl: x.dienTich,
          heSo: x.giaViTri.isZero() ? null : x.giaApDung.div(x.giaViTri).mul(hs ? D(hs.heSo) : 1),
          donGia: x.giaViTri,
        }));
        n("A.I").dong.push({ dong: kq.dong, bieu, cot: "BT_DAT", thuaId: t.id });
      } else {
        const d = dongDat(duAn, t);
        const bieu = t.gia && d.thanhTien ? [{ dvt: "m²", kl: D(t.dienTichThuHoi).toDecimalPlaces(2), heSo: hs ? D(hs.heSo) : D(1), donGia: D(t.gia.giaNghinDong).mul(1000) }] : undefined;
        n("A.I").dong.push({ dong: d, bieu, cot: "BT_DAT", thuaId: t.id });
      }
    }
    if (t.chiPhiDauTu) n("A.I").dong.push({ dong: dongChiPhiDauTu(cs, ho, t), cot: "BT_DAT", thuaId: t.id });
    if (t.hanhLang) n("A.I").dong.push({ dong: dongHanhLang(cs, duAn, t), cot: "BT_DAT", thuaId: t.id });
    if (t.chenhLech && D(t.dienTichThuHoi || "0").gt(0)) for (const x of dongChenhLech(cs, duAn, ho, t)) n(x.nhom).dong.push(x.kq);
    const tsThua = ho.taiSan.filter((x) => x.thuaId === t.id);
    for (const ts of tsThua) {
      if (ts.loai === "NHA_CT") {
        const d = dongNhaCongTrinh(cs, ts, duAnCuaHo(duAn, ho).ngayThongBao);
        const kl = thuTinh(ts.khoiLuong).giaTri;
        const bieu = kl && d.thanhTien
          ? [{ dvt: ts.donVi, kl: kl.toDecimalPlaces(2), heSo: ts.cachTinh === "HE_SO" ? D(ts.heSo || "1") : null, donGia: D(ts.donGia || "0"), ghiChu: ts.cachTinh === "THIET_HAI_THUC_TE" ? "Thiệt hại thực tế (T, T1)" : undefined }]
          : undefined;
        const dNha = b13 && b13.ma.startsWith("9.1") ? { ...d, canhBao: [...d.canhBao, `Thửa nguồn gốc nông, lâm trường (${b13.ma}): nhà, công trình phục vụ sản xuất nông nghiệp hỗ trợ 100% mức bồi thường; không phục vụ sản xuất nông nghiệp hỗ trợ theo điểm 3.2 k3 Đ6 QĐ 14/2026 — kiểm tra lựa chọn "Bồi thường/Hỗ trợ"`] } : d;
        const laBoiThuong = ts.cachTinh === "HANH_LANG" ? ts.hanhLang?.diem !== "b" : ts.phan === "BOI_THUONG" && ts.cachTinh !== "MOC_K3";
        if (laBoiThuong) n("A.II").dong.push({ dong: dNha, bieu, cot: "BT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
        else n("B.II").dong.push({ dong: dNha, bieu, cot: "HT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
      } else if (ts.loai === "KHAC") {
        const kl = soLuong(ts, ts.khoiLuong, "A03");
        const d =
          kl.loi ??
          dong({
            ma: ts.phan === "BOI_THUONG" ? "A03" : "A11",
            noiDung: `${ts.phan === "BOI_THUONG" ? "Bồi thường" : "Hỗ trợ"} – ${ts.ten}`,
            thamSo: {
              "Khối lượng": `${dinhDang(kl.v!, 2)} ${ts.donVi}`,
              "Hệ số / mức hỗ trợ": dinhDang(D(ts.heSo || "1"), 2),
              "Đơn giá": `${dinhDang(D(ts.donGia || "0"))} đ/${ts.donVi}`,
            },
            congThuc: "Khối lượng × Hệ số × Đơn giá",
            thanhTien: kl.v!.mul(ts.heSo || "1").mul(ts.donGia || "0"),
            canCu: [{ vanBan: ts.canCu || "Chưa ghi căn cứ", viTri: "" }],
            trangThai: ts.canCu ? "TAM_TINH" : "CAN_XAC_NHAN",
            canhBao: ts.canCu ? ["Đơn giá ngoài danh mục: cán bộ kiểm tra căn cứ"] : ["Đơn giá ngoài danh mục chưa ghi căn cứ"],
          });
        const bieu = kl.v ? [{ dvt: ts.donVi, kl: kl.v, heSo: D(ts.heSo || "1"), donGia: D(ts.donGia || "0") }] : undefined;
        if (ts.phan === "BOI_THUONG") n("A.II").dong.push({ dong: d, bieu, cot: "BT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
        else n("B.II").dong.push({ dong: d, bieu, cot: "HT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
      } else if (ts.loai === "SUA_CHUA") {
        n("A.II").dong.push({ dong: dongSuaChua(ho, ts), cot: "BT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
      } else if (ts.loai === "VAT_NUOI") {
        const kl = soLuong(ts, ts.khoiLuong, "C09");
        const d = kl.loi ?? diDoiVatNuoi(cs, { loaiDuong: ts.loaiDuong, loaiVatNuoi: ts.loaiVatNuoi, khoiLuong: kl.v!, quangDuongKm: ts.quangDuongKm || "0" });
        n("B.V").dong.push({ dong: d, cot: "HT_KHAC", thuaId: t.id, taiSanId: ts.id });
      }
    }
    const cay = tsThua.filter((x): x is Extract<TaiSan, { loai: "CAY" }> => x.loai === "CAY");
    if (cay.length) {
      let ds = dongCayThua(cs, t, cay);
      // VM-11 (QD-31): đơn giá đồng/ha/năm (Biểu 03 mục VIII PL VIII) nhân diện tích — khối lượng = số năm còn lại × DT (ha).
      ds = ds.map((x) => {
        const c = cay.find((y) => y.id === x.taiSanId);
        return c && /ha\/\s*năm/i.test(c.donVi) ? { ...x, dong: { ...x.dong, canhBao: [...x.dong.canhBao, "Đơn giá đồng/ha/năm: khối lượng = (tổng số năm được giao chăm sóc, bảo vệ − số năm đã chăm sóc, bảo vệ) × diện tích (ha), vd. =(10-4)*0,5 (VM-11, QD-31)"] } } : x;
      });
      const k7 = cs.hoTroKhac?.cayKhongDuDieuKien;
      if (t.cayK7 && b13) ds = ds.map((x) => ({ ...x, dong: { ...x.dong, canhBao: [...x.dong.canhBao, `Thửa có nguồn gốc nông, lâm trường (${b13.ma}) — cây trồng tính theo khoản 9, không áp dụng khoản 7 Điều 6`] } }));
      if (t.cayK7 && !b13 && k7) {
        const tyLe = D(t.cayK7 === "A" ? k7.tyLeA : k7.tyLeB);
        const cc = t.cayK7 === "A" ? k7.canCuA : k7.canCuB;
        n("B.III").dong.push(
          ...ds.map((x) => ({
            ...x,
            cot: "HT_CAY" as const,
            bieu: x.bieu?.map((b) => ({ ...b, heSo: b.heSo ? b.heSo.mul(tyLe) : tyLe })),
            dong: {
              ...x.dong,
              noiDung: x.dong.noiDung.replace(/^Cây trồng/, "Hỗ trợ cây trồng"),
              congThuc: tyLe.eq(1) ? x.dong.congThuc : `(${x.dong.congThuc}) × ${tyLe.mul(100).toString()}%`,
              thanhTien: x.dong.thanhTien ? x.dong.thanhTien.mul(tyLe) : x.dong.thanhTien,
              canCu: [...cc, ...x.dong.canCu],
              canhBao: [...x.dong.canhBao, `Khoản 7 Điều 6: ${k7.dieuKien} — cán bộ xác nhận`],
            },
          })),
        );
      } else if (t.cayK7 && !b13) {
        n("A.III").dong.push(...ds.map((x) => ({ ...x, dong: { ...x.dong, trangThai: "CAN_XAC_NHAN" as const, canhBao: [...x.dong.canhBao, `Bộ chính sách ${cs.ma} không có mức hỗ trợ cây trồng khoản 7 Điều 6 QĐ 14/2026`] } })));
      } else if (b13?.cayHoTro)
        n("B.III").dong.push(
          ...ds.map((x) => ({
            ...x,
            cot: "HT_CAY" as const,
            dong: { ...x.dong, noiDung: x.dong.noiDung.replace(/^Cây trồng/, "Hỗ trợ cây trồng"), canCu: [...b13.canCu, ...x.dong.canCu] },
          })),
        );
      else n("A.III").dong.push(...ds);
    }

    if (ho.hoTro.chuyenDoiNghe && laDatNN(t.loaiDat) && D(t.dienTichThuHoi || "0").gt(0)) {
      let d: DongTinh;
      if (!duAn.hanMucNN) d = thieu("C06", `Hỗ trợ chuyển đổi nghề – ${t.loaiDat} (${nhanThua(t)})`, "Chưa nhập hạn mức giao đất nông nghiệp của dự án (PL I QĐ 106 – TL-24)");
      else if (!t.gia) d = thieu("C06", `Hỗ trợ chuyển đổi nghề – ${t.loaiDat} (${nhanThua(t)})`, "Chưa chọn giá đất nông nghiệp cùng loại");
      else
        d = chuyenDoiNghe(cs, {
          xa: duAn.xa,
          loaiDat: `${t.loaiDat} (${nhanThua(t)})`,
          dienTichThuHoiM2: t.dienTichThuHoi,
          hanMucM2: duAn.hanMucNN.m2,
          canCuHanMuc: duAn.hanMucNN.canCu,
          giaDatNNNghinDong: t.gia.giaNghinDong,
        });
      let bieu: DongBieu[] | undefined;
      if (d.thanhTien && duAn.hanMucNN && t.gia) {
        const dt = D(t.dienTichThuHoi).toDecimalPlaces(2);
        const dtTinh = dt.lt(duAn.hanMucNN.m2) ? dt : D(duAn.hanMucNN.m2);
        const gia = D(t.gia.giaNghinDong).mul(1000);
        bieu = [{ dvt: "m²", kl: dtTinh, heSo: d.thanhTien.div(dtTinh.mul(gia)), donGia: gia }];
      }
      if (b13) {
        const gc = cs.nongLamTruong?.truongHop[b13.ma as keyof NonNullable<BoChinhSach["nongLamTruong"]>["truongHop"]]?.ghiChuChuyenDoiNghe;
        d = { ...d, canCu: [...d.canCu, ...b13.canCu], canhBao: gc ? [...d.canhBao, gc] : d.canhBao };
      }
      n("B.IV").dong.push({ dong: d, bieu, cot: "HT_CDN", thuaId: t.id });
    }
  }

  if (ho.hoTro.moMa && ho.hoTro.moMa.xay + ho.hoTro.moMa.khongXay > 0)
    n("A.II").dong.push({ dong: moMa(cs, { soMoXay: ho.hoTro.moMa.xay, soMoKhongXay: ho.hoTro.moMa.khongXay }), cot: "BT_TAI_SAN" });

  const od = ho.hoTro.onDinh;
  const thuaB13 = ho.thua.filter((t) => t.nongLamTruong && D(t.dienTichThuHoi || "0").gt(0));
  if (!od && thuaB13.length && cs.nongLamTruong) {
    // VM-38: k9 Đ6 QĐ 14/2026 có hỗ trợ ổn định đời sống theo tỷ lệ đất NN bị thu hồi — phải xác định, không bỏ qua im lặng.
    n("B.V").dong.push({
      dong: dong({
        ma: "C01",
        noiDung: "Hỗ trợ ổn định đời sống (đất nguồn gốc nông, lâm trường)",
        congThuc: "Theo tỷ lệ DT đất NN thu hồi / DT đất NN đang sử dụng",
        thanhTien: null,
        canCu: [...new Map(thuaB13.flatMap((t) => cs.nongLamTruong!.truongHop[t.nongLamTruong!.truongHop].canCu).map((c) => [c.viTri, c])).values(), ...cs.onDinhDoiSong.canCu],
        trangThai: "CAN_XAC_NHAN",
        canhBao: ["Chưa nhập DT đất NN đang sử dụng ở thẻ Hỗ trợ để xác định tỷ lệ thu hồi (dưới 10% thì không hỗ trợ) — VM-38"],
      }),
      cot: "HT_KHAC",
    });
  }
  if (od) {
    const dtNN = ho.thua.filter((t) => laDatNN(t.loaiDat)).reduce((s, t) => s.plus(t.dienTichThuHoi || "0"), D(0));
    let d: DongTinh;
    if (!duAn.giaGao) d = thieu("C01", "Hỗ trợ ổn định đời sống", "Chưa nhập giá gạo tẻ trung bình (TL-26)");
    else if (!od.dienTichNNDangSuDung || D(od.dienTichNNDangSuDung).lte(0)) d = thieu("C01", "Hỗ trợ ổn định đời sống", "Chưa nhập diện tích đất NN đang sử dụng");
    else if (khauOnDinh(ho) <= 0 || !Number.isInteger(khauOnDinh(ho))) d = thieu("C01", "Hỗ trợ ổn định đời sống", "Chưa có nhân khẩu");
    else
      d = onDinhDoiSong(cs, {
        dienTichNNThuHoi: dtNN,
        dienTichNNDangSuDung: od.dienTichNNDangSuDung,
        diChuyen: od.diChuyen,
        nhanKhau: khauOnDinh(ho),
        giaGaoDongKg: duAn.giaGao.dongKg,
        nguonGiaGao: duAn.giaGao.nguon,
        chonNhom: od.chonNhom,
      });
    if (od.nhanKhau?.trim() && d.thanhTien) d = { ...d, thamSo: { ...d.thamSo, "Nhân khẩu được hỗ trợ": `${khauOnDinh(ho)} (người có chung quyền sử dụng đất — điểm d k1 Đ19 NĐ 88 bổ sung bởi NĐ 226/2025; điểm b k1 Điều 12 PL II QĐ 106; hồ sơ có ${ho.nhanKhau.length})` } };
    n("B.V").dong.push({ dong: d, cot: "HT_KHAC" });
  }
  if (ho.hoTro.tamCu && ho.hoTro.tamCu.soThang > 0)
    n("B.V").dong.push({
      dong: tamCu(cs, { xa: duAn.xa, nhanKhau: Math.max(ho.nhanKhau.length, 1), soThang: ho.hoTro.tamCu.soThang, tdcBangDat: ho.hoTro.tamCu.tdcBangDat }),
      cot: "HT_KHAC",
    });

  if (ho.hoTro.khac) for (const d of dongHoTroKhac(cs, duAn, ho, ho.hoTro.khac)) n("B.VII").dong.push({ dong: d, cot: "HT_KHAC" });

  const tdc = ho.hoTro.taiDinhCu;
  if (tdc) for (const d of dongTaiDinhCu(cs, duAn, ho, tdc, tienBoiThuongDatO(ho, n("A.I").dong))) n("B.VI").dong.push({ dong: d, cot: "HT_KHAC" });

  const tatCa = nhom.flatMap((x) => x.dong);
  const lt = duAn.lamTron?.lyDo?.trim() ? duAn.lamTron : null;
  const csTong: BoChinhSach = lt ? { ...cs, lamTron: { ...cs.lamTron, cach: lt.cach } } : cs;
  const tong = tongHo(csTong, tatCa.map((x) => x.dong));
  const theoCot = Object.fromEntries(Object.keys(TEN_COT).map((k) => [k, D(0)])) as Record<CotTongHop, Decimal>;
  for (const x of tatCa) if (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien) theoCot[x.cot] = theoCot[x.cot].plus(x.dong.thanhTien);
  const tongBoiThuong = theoCot.BT_DAT.plus(theoCot.BT_CAY).plus(theoCot.BT_TAI_SAN);
  const tongHoTro = theoCot.HT_DAT.plus(theoCot.HT_TAI_SAN).plus(theoCot.HT_CAY).plus(theoCot.HT_CDN).plus(theoCot.HT_KHAC);
  const khauTru = D(ho.khauTru || "0");
  return {
    moTaLamTron: moTaLamTron(csTong.lamTron.cach, csTong.lamTron.tienBuoc, lt?.lyDo),
    nhom: nhom.filter((x) => x.dong.length),
    tatCa,
    tong,
    theoCot,
    tongBoiThuong,
    tongHoTro,
    khauTru,
    conLai: tong.tongLamTron.minus(khauTru),
  };
}

/** Loại đất ở (bồi thường về đất ở — dùng cho suất tái định cư tối thiểu, ghi nợ tiền SDĐ). */
export const laDatO = (loaiDat: string) => ["ONT", "ODT"].includes(loaiDat.trim().toUpperCase());

/** Tổng tiền bồi thường về đất ở của hộ (các dòng A.I đã tính của thửa ONT/ODT). */
export function tienBoiThuongDatO(ho: Ho, dongDat: DongKetQua[]): Decimal {
  const datO = new Set(ho.thua.filter((t) => laDatO(t.loaiDat)).map((t) => t.id));
  return dongDat.filter((x) => x.thuaId && datO.has(x.thuaId) && x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien).reduce((s, x) => s.plus(x.dong.thanhTien!), D(0));
}

/** Tiền SDĐ phải nộp của thửa TĐC: theo thông báo nếu có, không thì đơn giá × DT lô giao. */
export function tienSddTdc(t: TaiDinhCuHo): { tien: Decimal | null; moTa: string } {
  if (t.tienSddPhaiNop?.trim()) return { tien: D(t.tienSddPhaiNop), moTa: "theo thông báo, cán bộ nhập" };
  if (t.donGia?.trim() && t.dienTichGiao?.trim()) return { tien: D(t.donGia).mul(t.dienTichGiao), moTa: `${dinhDang(D(t.donGia))} đ/m² × ${t.dienTichGiao} m²` };
  return { tien: null, moTa: "" };
}

/** Các dòng hỗ trợ tái định cư (B.VI): C08 tự lo chỗ ở, C10 suất tối thiểu, C11 20% tiền SDĐ, khoản khác cán bộ nhập. */
function dongTaiDinhCu(cs: BoChinhSach, duAn: DuAn, ho: Ho, t: TaiDinhCuHo, btDatO: Decimal): DongTinh[] {
  const out: DongTinh[] = [];
  const coCs = !!cs.taiDinhCu;
  const khongCs = (ma: string, nd: string) => thieu(ma, nd, `Bộ chính sách ${cs.ma} không có quy định hỗ trợ tái định cư`, "Bộ chính sách");
  if (t.hinhThuc === "TU_LO") out.push(coCs ? hoTroTuLoChoO(cs, { xa: duAn.xa }) : khongCs("C08", "Hỗ trợ tái định cư – tự lo chỗ ở"));
  if ((t.hinhThuc === "DAT_O" || t.hinhThuc === "NHA_O") && t.suatToiThieu) {
    const nd = "Hỗ trợ đủ suất tái định cư tối thiểu";
    if (!coCs) out.push(khongCs("C10", nd));
    else if (!t.donGia?.trim()) out.push(thieu("C10", nd, t.hinhThuc === "NHA_O" ? "Chưa nhập giá bán nhà ở tái định cư (k3 Đ111 LĐĐ)" : "Chưa nhập giá đất ở tại khu tái định cư theo bảng giá (k3 Đ111 LĐĐ)"));
    else {
      const d = hoTroSuatToiThieu(cs, { xa: duAn.xa, hinhThuc: t.hinhThuc, donGiaDongM2: t.donGia, nguonGia: t.nguonGia ?? "", tienBoiThuongDatO: btDatO });
      if (!ho.thua.some((x) => laDatO(x.loaiDat))) d.canhBao.push("Hộ không có thửa đất ở (ONT/ODT) bị thu hồi — kiểm tra điều kiện khoản 8 Điều 111 Luật Đất đai");
      out.push(d);
    }
  }
  if (t.hinhThuc === "DAT_O" && t.hoTroTienSdd) {
    const nd = "Hỗ trợ tiền sử dụng đất thửa đất được giao tái định cư";
    const sdd = tienSddTdc(t);
    if (!coCs) out.push(khongCs("C11", nd));
    else if (!sdd.tien) out.push(thieu("C11", nd, "Chưa có tiền SDĐ phải nộp (nhập đơn giá và DT lô giao, hoặc số tiền theo thông báo)"));
    else {
      const d = hoTroTienSddTdc(cs, { tienSddPhaiNop: sdd.tien, moTa: sdd.moTa });
      if (!ho.thua.some((x) => laDatO(x.loaiDat))) d.canhBao.push("Khoản 11 Điều 6 QĐ 14/2026 áp dụng cho hộ bị thu hồi đất ở — hộ không có thửa ONT/ODT bị thu hồi, kiểm tra");
      out.push(d);
    }
  }
  for (const k of t.khoanKhac) {
    const nd = k.noiDung.trim() || "Khoản hỗ trợ tái định cư khác";
    if (!k.canCu.trim()) out.push(thieu("C.TĐC", nd, "Chưa ghi căn cứ (số, ngày văn bản của UBND xã hoặc văn bản quy định)"));
    else if (!k.soTien.trim() || !D(k.soTien).gt(0)) out.push(thieu("C.TĐC", nd, "Chưa nhập số tiền", k.canCu));
    else out.push(dong({ ma: "C.TĐC", noiDung: nd, thamSo: { "Số tiền": `${dinhDang(D(k.soTien))} đ` }, congThuc: "Theo văn bản (cán bộ nhập)", thanhTien: D(k.soTien), canCu: [{ vanBan: k.canCu, viTri: "" }] }));
  }
  return out;
}

/**
 * A06 – Điều 5 QĐ 14/2026: bồi thường chi phí sửa chữa phần nhà, công trình còn lại (phá dỡ một phần, phần còn lại vẫn
 * bảo đảm tiêu chuẩn kỹ thuật) theo dự toán được duyệt — cán bộ nhập số tiền, căn cứ dự toán, văn bản xác nhận.
 */
const CAN_CU_SUA_CHUA = [
  { vanBan: "QĐ 14/2026/QĐ-UBND", viTri: "Điều 5" },
  { vanBan: "Nghị quyết 254/2025/QH15", viTri: "điểm a khoản 11 Điều 3" },
];
function dongSuaChua(ho: Ho, ts: Extract<TaiSan, { loai: "SUA_CHUA" }>): DongTinh {
  const nd = ts.ten.trim() || "Bồi thường chi phí sửa chữa phần nhà, công trình còn lại";
  if (!ts.soTien.trim() || !laSoMay(ts.soTien) || !D(ts.soTien).gt(0)) return thieu("A06", nd, "Chưa nhập chi phí sửa chữa theo dự toán được duyệt", "QĐ 14/2026/QĐ-UBND Điều 5");
  if (!ts.canCu.trim()) return thieu("A06", nd, "Chưa ghi dự toán sửa chữa do UBND cấp xã lập (số, ngày)", "QĐ 14/2026/QĐ-UBND Điều 5");
  const canhBao: string[] = [];
  if (!ts.xacNhan.trim()) canhBao.push("Chưa ghi văn bản xác nhận phần còn lại vẫn bảo đảm tiêu chuẩn kỹ thuật theo quy định của pháp luật có liên quan (điều kiện Điều 5)");
  canhBao.push("Điều 5: bồi thường chi phí sửa chữa theo thực tế; UBND cấp xã lập dự toán, phê duyệt chi phí sửa chữa, hoàn thiện phần còn lại trong phương án");
  const goc = ts.taiSanGocId ? ho.taiSan.find((x) => x.id === ts.taiSanGocId) : undefined;
  if (ts.taiSanGocId && !goc) canhBao.push("Nhà, công trình bị phá dỡ một phần không còn trong danh sách kiểm đếm");
  return dong({
    ma: "A06",
    noiDung: nd,
    thamSo: { "Chi phí theo dự toán": `${dinhDang(D(ts.soTien))} đ`, "Dự toán": ts.canCu.trim(), ...(goc ? { "Nhà, công trình": goc.ten } : {}), "Xác nhận kỹ thuật": ts.xacNhan.trim() || "—" },
    congThuc: "Chi phí sửa chữa theo thực tế — dự toán UBND cấp xã lập (cán bộ nhập)",
    thanhTien: D(ts.soTien),
    canCu: [...CAN_CU_SUA_CHUA, { vanBan: ts.canCu.trim(), viTri: "" }],
    trangThai: ts.xacNhan.trim() ? "TAM_TINH" : "CAN_XAC_NHAN",
    canhBao,
  });
}

const CAN_CU_K = (k: string) => [{ vanBan: "QĐ 14/2026/QĐ-UBND", viTri: `khoản ${k} Điều 6` }];
export const TEN_KHOAN_KHAC: Record<"K4" | "K13_14" | "KHAC" | "D13_K4", { ten: string; canCu: { vanBan: string; viTri: string }[]; goiY: string }> = {
  K4: { ten: "Hỗ trợ công trình phục vụ sinh hoạt (gắn với nhà ở) nằm ngoài cọc GPMB bị ảnh hưởng", canCu: CAN_CU_K("4"), goiY: "Hộ bị thu hồi đất ở, phải di chuyển nhà ở; mức không vượt quá 100% đơn giá bồi thường tài sản cùng loại; Chủ tịch UBND cấp xã chỉ đạo, tổ chức thực hiện" },
  K13_14: { ten: "Hỗ trợ khác do UBND cấp xã quyết định cho dự án", canCu: [...CAN_CU_K("13"), ...CAN_CU_K("14")], goiY: "UBND cấp xã quyết định biện pháp, mức hỗ trợ cho từng dự án (k13); trên cơ sở kiến nghị, họp bàn thống nhất, lập biên bản có xác nhận của tổ, bản, tiểu khu, cơ quan chuyên môn UBND cấp xã (k14)" },
  KHAC: { ten: "Khoản hỗ trợ khác", canCu: [], goiY: "Chính sách chưa có sẵn — ghi đầy đủ văn bản làm căn cứ" },
  D13_K4: { ten: "Trợ cấp ngừng việc cho người lao động (k4 Điều 13 PL II QĐ 106)", canCu: [{ vanBan: "QĐ 106/2025/QĐ-UBND", viTri: "khoản 4 Điều 13 Phụ lục II" }, { vanBan: "NĐ 88/2024/NĐ-CP", viTri: "khoản 4 Điều 20" }], goiY: "Người lao động thuê theo hợp đồng của tổ chức kinh tế, hộ, cá nhân SXKD: trợ cấp ngừng việc theo pháp luật về lao động, tối đa 6 tháng — ghi hợp đồng lao động, bảng tính" },
};

/**
 * B.VII – Hỗ trợ khác (Điều 6 QĐ 14/2026): k1 đối tượng chính sách (mức cán bộ chọn, chỉ mức cao nhất), k2 hộ nghèo,
 * VM-17 (có cả k1, k2: cán bộ chọn cộng hay chỉ lấy khoản cao hơn, có lý do — chưa chọn thì "Cần xác nhận"),
 * k6 ổn định đời sống khi xây lại nhà (cán bộ tích; hộ có ổn định đời sống Điều 12 PL II thì nhắc kiểm tra, không tự loại),
 * k4, k13, k14 và khoản khác nhập tay kèm căn cứ.
 */
function dongHoTroKhac(cs: BoChinhSach, duAn: DuAn, ho: Ho, k: NonNullable<Ho["hoTro"]["khac"]>): DongTinh[] {
  const out: DongTinh[] = [];
  const khongDiChuyen = ho.hoTro.onDinh?.diChuyen === "KHONG_DI_CHUYEN";
  let c14 = k.doiTuongCs?.length ? hoTroDoiTuongChinhSach(cs, { doiTuong: k.doiTuongCs, coHoNgheo: !!k.hoNgheo }) : null;
  let c15 = k.hoNgheo ? hoTroHoNgheo(cs, { xacNhan: k.hoNgheo.xacNhan }) : null;
  if (c14 && khongDiChuyen) c14 = { ...c14, canhBao: [...c14.canhBao, "Thẻ Hỗ trợ ghi hộ không phải di chuyển chỗ ở — khoản 1 Điều 6 áp dụng cho hộ phải di chuyển chỗ ở, kiểm tra"] };
  if (c14 && c15 && c14.thanhTien && c15.thanhTien) {
    const v = k.vm17?.lyDo.trim() ? k.vm17 : undefined;
    if (!v) {
      const nhac = "VM-17: hộ vừa có đối tượng chính sách (k1) vừa là hộ nghèo (k2) — chọn cộng cả hai hay chỉ lấy khoản cao hơn, ghi lý do";
      c14 = { ...c14, trangThai: "CAN_XAC_NHAN", canhBao: [...c14.canhBao, nhac] };
      c15 = { ...c15, trangThai: "CAN_XAC_NHAN", canhBao: [...c15.canhBao, nhac] };
    } else {
      const lc = { ma: "VM-17", giaTri: v.cach === "CONG" ? "Cộng cả hai khoản k1, k2" : "Chỉ lấy khoản cao hơn", lyDo: v.lyDo.trim() };
      c14 = { ...c14, luaChon: [...c14.luaChon, lc] };
      c15 = { ...c15, luaChon: [...c15.luaChon, lc] };
      if (v.cach === "CAO_HON") {
        if (c14.thanhTien!.gte(c15.thanhTien!)) c15 = null;
        else c14 = null;
      }
    }
  }
  if (c14) out.push(c14);
  if (c15) out.push(c15);
  if (k.xayLaiNha) {
    const nd = "Hỗ trợ ổn định đời sống trong thời gian xây dựng lại nhà ở";
    const khau = k.khauXayLaiNha?.trim() ? Number(k.khauXayLaiNha) : ho.nhanKhau.length;
    let d: DongTinh;
    if (!duAn.giaGao) d = thieu("C16", nd, "Chưa nhập giá gạo tẻ trung bình (Thông tin dự án)");
    else if (!Number.isInteger(khau) || khau <= 0) d = thieu("C16", nd, "Chưa xác định số nhân khẩu được hỗ trợ");
    else d = hoTroXayLaiNha(cs, { nhanKhau: khau, giaGaoDongKg: duAn.giaGao.dongKg, nguonGiaGao: duAn.giaGao.nguon });
    if (ho.hoTro.onDinh) d = { ...d, canhBao: [...d.canhBao, "Hộ đồng thời có hỗ trợ ổn định đời sống theo Điều 12 Phụ lục II QĐ 106/2025 (thẻ Hỗ trợ) — cần kiểm tra, tránh hỗ trợ trùng"] };
    out.push(d);
  }
  if (k.onDinhSanXuat?.coSo === "D13" || (k.onDinhSanXuat && k.onDinhSanXuat.dinhMuc)) out.push(dongOnDinhSanXuatDinhMuc(cs, k.onDinhSanXuat));
  else if (k.onDinhSanXuat) {
    const o = k.onDinhSanXuat;
    const ksx = cs.hoTroKhac?.onDinhSanXuat;
    const nd = o.noiDung?.trim() || "Hỗ trợ ổn định sản xuất (khoản 5 Điều 6 QĐ 14/2026)";
    if (!ksx) out.push(thieu("C03.K5", nd, `Bộ chính sách ${cs.ma} không có quy định khoản 5 Điều 6`));
    else {
      const thieuDk = ksx.dieuKien.filter((_, i) => !o.dk[i]);
      if (!o.canCu.trim()) out.push(thieu("C03.K5", nd, "Chưa ghi căn cứ mức hỗ trợ (định mức, văn bản) theo khoản 1 Điều 13 Phụ lục II QĐ 106/2025", "QĐ 14/2026/QĐ-UBND khoản 5 Điều 6"));
      else if (!o.soTien.trim() || !laSoMay(o.soTien) || !D(o.soTien).gt(0)) out.push(thieu("C03.K5", nd, "Chưa nhập số tiền hỗ trợ", o.canCu));
      else
        out.push(
          dong({
            ma: "C03.K5",
            noiDung: nd,
            thamSo: { "Số tiền": `${dinhDang(D(o.soTien))} đ`, "Điều kiện": thieuDk.length ? `còn thiếu ${thieuDk.length}/${ksx.dieuKien.length}` : "đủ 4 điều kiện" },
            congThuc: "Như hộ quy định tại khoản 1 Điều 13 PL II QĐ 106/2025 — mức theo định mức (cán bộ nhập)",
            thanhTien: D(o.soTien),
            canCu: [...ksx.canCu, { vanBan: o.canCu.trim(), viTri: "" }],
            trangThai: thieuDk.length ? "CAN_XAC_NHAN" : "TAM_TINH",
            canhBao: thieuDk.length ? [`Chưa xác nhận điều kiện: ${thieuDk.join("; ")}`] : [],
          }),
        );
    }
  }
  if (k.nhaNhaNuoc) {
    const x = k.nhaNhaNuoc;
    const khau = x.nhanKhau?.trim() ? Number(x.nhanKhau) : ho.nhanKhau.length;
    out.push(hoTroNhaSoHuuNhaNuoc(cs, { cach: x.cach, nhanKhau: khau, soThang: Number(x.soThang || "0"), xa: duAn.xa }));
  }
  if (k.sxkd) {
    const x = k.sxkd;
    out.push(hoTroOnDinhSxkd(cs, { cach: x.cach, thuNhapBinhQuanNam: laSoMay(x.thuNhap) ? x.thuNhap : "", doanhThuNam: laSoMay(x.doanhThu) ? x.doanhThu : "", canCuSoLieu: x.canCu }));
  }
  for (const x of k.khoan) {
    const loai = TEN_KHOAN_KHAC[x.loai];
    const nd = x.noiDung.trim() || loai.ten;
    const ma = x.loai === "K4" ? "C17.4" : x.loai === "K13_14" ? "C17" : x.loai === "D13_K4" ? "C05" : "C17.K";
    if (!x.canCu.trim()) out.push(thieu(ma, nd, "Chưa ghi căn cứ (số, ngày văn bản quyết định mức hỗ trợ)", loai.canCu[0] ? `${loai.canCu[0].vanBan} ${loai.canCu[0].viTri}` : "Hồ sơ"));
    else if (!x.soTien.trim() || !laSoMay(x.soTien) || !D(x.soTien).gt(0)) out.push(thieu(ma, nd, "Chưa nhập số tiền", x.canCu));
    else
      out.push(
        dong({
          ma,
          noiDung: nd,
          thamSo: { "Số tiền": `${dinhDang(D(x.soTien))} đ` },
          congThuc: "Theo văn bản (cán bộ nhập)",
          thanhTien: D(x.soTien),
          canCu: [...loai.canCu, { vanBan: x.canCu.trim(), viTri: "" }],
          canhBao: [
            ...(x.loai === "K4" ? ["Mức không vượt quá 100% đơn giá bồi thường tài sản cùng loại (khoản 4 Điều 6 QĐ 14/2026) — cán bộ kiểm tra"] : []),
            ...(x.loai === "D13_K4"
              ? ["Trợ cấp ngừng việc theo pháp luật về lao động, thời gian trợ cấp tối đa không quá 6 tháng (k4 Điều 13 PL II QĐ 106/2025) — cán bộ kiểm tra"]
              : ["Khoản 14 Điều 6: hỗ trợ khác phải công khai, minh bạch; xác định người còn khó khăn trên cơ sở kiến nghị, họp bàn thống nhất, lập biên bản có xác nhận của tổ, bản, tiểu khu, cơ quan chuyên môn UBND cấp xã"]),
          ],
        }),
      );
  }
  return out;
}

/** Số nhân khẩu tính ổn định đời sống (Điều 12 PL II QĐ 106): số người dùng nhập, trống = nhân khẩu trong hồ sơ. */
export const khauOnDinh = (ho: Ho): number => (ho.hoTro.onDinh?.nhanKhau?.trim() ? Number(ho.hoTro.onDinh.nhanKhau) : ho.nhanKhau.length);

/** C03 – ổn định sản xuất theo định mức (k1 Điều 13 PL II QĐ 106), cơ sở D13 (bồi thường bằng đất) hoặc k5 Điều 6 QĐ 14/2026. */
function dongOnDinhSanXuatDinhMuc(cs: BoChinhSach, o: NonNullable<NonNullable<Ho["hoTro"]["khac"]>["onDinhSanXuat"]>): DongTinh {
  const k5 = o.coSo !== "D13";
  const nd = o.noiDung?.trim() || (k5 ? "Hỗ trợ ổn định sản xuất (khoản 5 Điều 6 QĐ 14/2026)" : "Hỗ trợ ổn định sản xuất khi bồi thường bằng đất nông nghiệp");
  const ma = k5 ? "C03.K5" : "C03";
  const m = o.dinhMuc;
  let d: DongTinh;
  if (!m) {
    // D13 nhập tay số tiền
    if (!o.canCu.trim()) return thieu(ma, nd, "Chưa ghi căn cứ mức hỗ trợ (định mức, văn bản)", "QĐ 106/2025/QĐ-UBND khoản 1 Điều 13 PL II");
    if (!o.soTien.trim() || !laSoMay(o.soTien) || !D(o.soTien).gt(0)) return thieu(ma, nd, "Chưa nhập số tiền hỗ trợ", o.canCu);
    d = dong({ ma, noiDung: nd, thamSo: { "Số tiền": `${dinhDang(D(o.soTien))} đ` }, congThuc: "Theo định mức (cán bộ nhập)", thanhTien: D(o.soTien), canCu: [...(cs.phuLucII?.onDinhSanXuatDat.canCu ?? []), { vanBan: o.canCu.trim(), viTri: "" }] });
  } else {
    const so = (v: string) => v.trim() && laSoMay(v) && D(v).gt(0);
    const hn = so(m.hnDt) && so(m.hnDinhMuc) ? { dienTichM2: m.hnDt, dinhMucDongHaVu: m.hnDinhMuc } : undefined;
    const ln = so(m.lnDt) && so(m.lnChiPhi) ? { dienTichM2: m.lnDt, chiPhiDongHa: m.lnChiPhi } : undefined;
    d = { ...hoTroOnDinhSanXuatDat(cs, { hangNam: hn, lauNam: ln, canCuDinhMuc: o.canCu, noiDung: nd }), ma };
  }
  if (k5) {
    const ksx = cs.hoTroKhac?.onDinhSanXuat;
    const thieuDk = ksx ? ksx.dieuKien.filter((_, i) => !o.dk[i]) : [];
    if (ksx) d = { ...d, canCu: [...ksx.canCu, ...d.canCu] };
    if (thieuDk.length && d.trangThai === "TAM_TINH") d = { ...d, trangThai: "CAN_XAC_NHAN", canhBao: [...d.canhBao, `Chưa xác nhận điều kiện: ${thieuDk.join("; ")}`] };
  } else d = { ...d, canhBao: [...d.canhBao, "Điều kiện: hộ gia đình, cá nhân bị thu hồi đất nông nghiệp được bồi thường bằng đất nông nghiệp (k1 Điều 13 PL II QĐ 106/2025) — cán bộ xác nhận"] };
  return d;
}

/** B07 – Điều 3 PL II QĐ 106/2025: chi phí đầu tư vào đất còn lại (không có giấy tờ k3 Đ17 NĐ 88, thực tế đã đầu tư). */
function dongChiPhiDauTu(cs: BoChinhSach, ho: Ho, t: Thua): DongTinh {
  const c = t.chiPhiDauTu!;
  const nd = `Chi phí đầu tư vào đất còn lại – ${t.loaiDat} (${nhanThua(t)})`;
  const dk = "Điều kiện: người có đất thu hồi không có giấy tờ quy định tại k3 Đ17 NĐ 88/2024 nhưng thực tế đã có đầu tư vào đất — cán bộ xác nhận";
  if (c.cach === "DU_TOAN") {
    if (!c.canCu?.trim()) return thieu("B07", nd, "Chưa ghi dự toán giá trị đầu tư vào đất còn lại được Chủ tịch UBND cấp xã phê duyệt (số, ngày)", "QĐ 106/2025/QĐ-UBND khoản 1 Điều 3 PL II");
    if (!c.soTien?.trim() || !laSoMay(c.soTien) || !D(c.soTien).gt(0)) return thieu("B07", nd, "Chưa nhập giá trị theo dự toán được duyệt", c.canCu);
    return dong({
      ma: "B07",
      noiDung: nd,
      thamSo: { "Giá trị theo dự toán": `${dinhDang(D(c.soTien))} đ`, "Dự toán": c.canCu.trim() },
      congThuc: "Theo dự toán được Chủ tịch UBND cấp xã phê duyệt (cán bộ nhập)",
      thanhTien: D(c.soTien),
      canCu: [{ vanBan: "QĐ 106/2025/QĐ-UBND", viTri: "khoản 1 Điều 3 Phụ lục II" }, { vanBan: c.canCu.trim(), viTri: "" }],
      canhBao: [dk],
    });
  }
  if (!t.gia) return thieu("B07", nd, "Chưa chọn giá đất của loại đất thu hồi từ bảng giá", "QĐ 106/2025/QĐ-UBND khoản 2 Điều 3 PL II");
  const coTyLe = !!(c.thoiHanNam?.trim() || c.conLaiNam?.trim());
  if (coTyLe && !(laSoMay(c.thoiHanNam ?? "") && laSoMay(c.conLaiNam ?? ""))) return thieu("B07", nd, "Nhập đủ thời hạn sử dụng đất còn lại và thời hạn sử dụng đất (năm)", "QĐ 106/2025/QĐ-UBND khoản 2 Điều 3 PL II");
  const d = chiPhiDauTuTheoGiaDat(cs, { loaiDat: `${t.loaiDat} (${nhanThua(t)})`, dienTichM2: t.dienTichThuHoi || "0", giaNghinDong: t.gia.giaNghinDong, nguonGia: t.gia.nguon, tyLeThoiHan: coTyLe ? { conLaiNam: c.conLaiNam!, thoiHanNam: c.thoiHanNam! } : undefined });
  const them = [dk];
  if (ho.loai === "TO_CHUC" && !coTyLe) them.push("Tổ chức: tính đến tỷ lệ thời hạn sử dụng đất còn lại so với thời hạn sử dụng đất (k4 Đ17 NĐ 88) — nhập thời hạn");
  if (ho.loai !== "TO_CHUC" && coTyLe) them.push("Tỷ lệ thời hạn còn lại áp dụng đối với tổ chức — kiểm tra");
  return { ...d, canhBao: [...d.canhBao, ...them] };
}

/** B08, B09 – Điều 7 PL II QĐ 106/2025: đất trong hành lang bảo vệ an toàn (không thu hồi). */
function dongHanhLang(cs: BoChinhSach, duAn: DuAn, t: Thua): DongTinh {
  const h = t.hanhLang!;
  const ma = h.loai === "DIEN" ? "B08" : "B09";
  const nd = `Bồi thường đất trong hành lang – ${t.loaiDat} (${nhanThua(t)})`;
  if (!t.gia) return thieu(ma, nd, "Chưa chọn giá đất cho thửa (giá đất cụ thể bồi thường về đất cùng loại)", "QĐ 106/2025/QĐ-UBND Điều 7 PL II");
  if (!h.dienTich.trim() || !laSoMay(h.dienTich) || !D(h.dienTich).gt(0)) return thieu(ma, nd, "Chưa nhập DT đất nằm trong hành lang", "QĐ 106/2025/QĐ-UBND Điều 7 PL II");
  const hs = duAn.heSoGiaDat && !D(duAn.heSoGiaDat.heSo).eq(1) ? duAn.heSoGiaDat : null;
  const gia = D(t.gia.giaNghinDong).mul(1000).mul(hs ? hs.heSo : 1);
  const d = boiThuongHanhLang(cs, { loai: h.loai, nhomDat: h.nhomDat, loaiDat: `${t.loaiDat} (${nhanThua(t)})`, dienTichM2: h.dienTich, giaDongM2: gia, nguonGia: `${t.gia.nguon}${hs ? ` × hệ số ${hs.heSo} (${hs.vanBan || "chưa ghi văn bản"})` : ""}` });
  const them: string[] = [];
  if (!h.canCu?.trim()) them.push("Chưa ghi căn cứ xác định DT trong hành lang (biên bản, trích đo, văn bản của chủ đầu tư công trình)");
  if (D(h.dienTich).gt(D(t.dienTich || "0")) && D(t.dienTich || "0").gt(0)) them.push("DT trong hành lang lớn hơn DT thửa — kiểm tra");
  return { ...d, canCu: h.canCu?.trim() ? [...d.canCu, { vanBan: h.canCu.trim(), viTri: "" }] : d.canCu, trangThai: them.length && d.trangThai === "TAM_TINH" ? "CAN_XAC_NHAN" : d.trangThai, canhBao: [...d.canhBao, ...them], thamSo: { ...d.thamSo, "Nhóm đất": TEN_NHOM_HANH_LANG[h.nhomDat] } };
}

export const TEN_CHENH_LECH: Record<"K8_RSX" | "K8_RPH_RDD" | "K10", string> = {
  K8_RSX: "Khoản 8 — GCN đất rừng sản xuất, đang sản xuất nông nghiệp",
  K8_RPH_RDD: "Khoản 8 — GCN đất rừng phòng hộ, đặc dụng, đang sản xuất nông nghiệp",
  K10: "Khoản 10 — đất NN sử dụng không đúng mục đích ghi trên GCN (chưa đăng ký biến động)",
};

/**
 * B14 – khoản 8, 10 Điều 6 QĐ 14/2026: hỗ trợ về đất bằng chênh lệch giá đất tính tiền bồi thường (hiện trạng − theo GCN;
 * rừng phòng hộ, đặc dụng: bằng giá hiện trạng), khoản 8 không vượt hạn mức công nhận; chuyển đổi nghề bằng chênh lệch giá
 * đất NN cùng loại trong bảng giá (hiện trạng − theo GCN), không vượt hạn mức, tính theo Điều 14 PL II QĐ 106/2025.
 */
function dongChenhLech(cs: BoChinhSach, duAn: DuAn, ho: Ho, t: Thua): { nhom: "B.I" | "B.IV"; kq: DongKetQua }[] {
  const c = t.chenhLech!;
  const k = cs.hoTroKhac?.chenhLechDat;
  const ten = `${t.loaiDat} → hiện trạng ${c.loaiHienTrang || "?"} (${nhanThua(t)})`;
  const ndDat = `Hỗ trợ về đất – ${ten}`;
  const cvb = "QĐ 14/2026/QĐ-UBND " + (c.truongHop === "K10" ? "khoản 10 Điều 6" : "khoản 8 Điều 6");
  if (!k) return [{ nhom: "B.I", kq: { dong: thieu("B14", ndDat, `Bộ chính sách ${cs.ma} không có quy định khoản 8, 10 Điều 6`, cvb), cot: "HT_DAT", thuaId: t.id } }];
  const canCu = c.truongHop === "K10" ? k.canCuK10 : c.diem8 === "b" ? k.canCuK8b : k.canCuK8;
  if (!c.giaHienTrang.trim() || !laSoMay(c.giaHienTrang)) return [{ nhom: "B.I", kq: { dong: thieu("B14", ndDat, "Chưa nhập giá đất theo loại đất hiện trạng (bảng giá, nghìn đ/m²)", cvb), cot: "HT_DAT", thuaId: t.id } }];
  const out: { nhom: "B.I" | "B.IV"; kq: DongKetQua }[] = [];
  const dt = lamTronDienTich(t.dienTichThuHoi || "0");
  const hanStr = c.hanMuc?.trim() || duAn.hanMucNN?.m2 || "";
  const canCuHan = c.hanMuc?.trim() ? c.canCuHanMuc?.trim() || "chưa ghi căn cứ" : duAn.hanMucNN?.canCu || "";
  const han = hanStr && laSoMay(hanStr) ? D(hanStr) : null;
  const giaHT = D(c.giaHienTrang);
  const giaGcn = t.gia ? D(t.gia.giaNghinDong) : null;
  const hs = duAn.heSoGiaDat && !D(duAn.heSoGiaDat.heSo).eq(1) ? D(duAn.heSoGiaDat.heSo) : null;
  // Phần đất
  const canHanDat = c.truongHop !== "K10";
  if (canHanDat && !han) out.push({ nhom: "B.I", kq: { dong: thieu("B14", ndDat, "Chưa có hạn mức công nhận quyền sử dụng đất NN cùng loại (nhập ở thửa hoặc hạn mức của dự án)", cvb), cot: "HT_DAT", thuaId: t.id } });
  else if (c.truongHop !== "K8_RPH_RDD" && !giaGcn) out.push({ nhom: "B.I", kq: { dong: thieu("B14", ndDat, "Chưa chọn giá đất theo loại đất ghi trên GCN cho thửa", cvb), cot: "HT_DAT", thuaId: t.id } });
  else {
    const dtTinh = canHanDat && han && dt.gt(han) ? han : dt;
    const donGia = c.truongHop === "K8_RPH_RDD" ? giaHT : giaHT.minus(giaGcn!);
    const canhBao: string[] = [];
    if (donGia.lte(0)) canhBao.push("Giá đất hiện trạng không cao hơn giá theo GCN — không có chênh lệch");
    if (canHanDat && han && dt.gt(han)) canhBao.push(`DT thu hồi vượt hạn mức: phần ${dinhDang(dt.minus(han), 2)} m² không tính hỗ trợ`);
    // Hệ số điều chỉnh giá đất của dự án: linh động — người dùng chọn áp dụng hay không, ghi lý do (QD-30).
    const chonHs = hs && c.heSo?.lyDo.trim() ? c.heSo : undefined;
    const nhanHs = hs && (chonHs ? chonHs.apDung : true) ? hs : null;
    if (hs && !chonHs) canhBao.push(`Chưa chọn áp dụng hệ số điều chỉnh giá đất của dự án (${hs.toString()}) cho khoản hỗ trợ này — đang tạm nhân hệ số; chọn và ghi lý do ở thẻ Thửa đất`);
    const gia = (donGia.gt(0) ? donGia : D(0)).mul(1000).mul(nhanHs ?? 1);
    out.push({
      nhom: "B.I",
      kq: {
        dong: dong({
          ma: "B14",
          noiDung: ndDat,
          thamSo: {
            "Trường hợp": `${TEN_CHENH_LECH[c.truongHop]}${c.truongHop !== "K10" ? ` (điểm ${c.diem8 ?? "a"})` : ""}`,
            "Giá đất hiện trạng": `${dinhDang(giaHT.mul(1000))} đ/m² (${c.nguonGia || "chưa ghi nguồn"})`,
            ...(c.truongHop !== "K8_RPH_RDD" ? { "Giá đất theo GCN": `${dinhDang(giaGcn!.mul(1000))} đ/m² (${t.gia!.nguon})` } : {}),
            "DT thu hồi": `${dinhDang(dt, 2)} m²`,
            ...(canHanDat ? { "Hạn mức công nhận": `${dinhDang(han!, 2)} m² (${canCuHan})`, "DT tính hỗ trợ": `${dinhDang(dtTinh, 2)} m²` } : {}),
            ...(hs ? { "Hệ số điều chỉnh của dự án": chonHs ? (chonHs.apDung ? `× ${hs.toString()} (người dùng chọn áp dụng)` : `không nhân ${hs.toString()} (người dùng chọn)`) : `× ${hs.toString()} (chưa chọn)` } : {}),
          },
          congThuc: (c.truongHop === "K8_RPH_RDD" ? "Giá đất hiện trạng × DT (≤ hạn mức)" : `(Giá hiện trạng − giá theo GCN) × DT${canHanDat ? " (≤ hạn mức)" : ""}`) + (nhanHs ? " × Hệ số điều chỉnh" : ""),
          thanhTien: gia.mul(dtTinh),
          trangThai: hs && !chonHs ? "CAN_XAC_NHAN" : "TAM_TINH",
          luaChon: chonHs ? [{ ma: "QD-30", giaTri: chonHs.apDung ? "Nhân hệ số điều chỉnh giá đất của dự án" : "Không nhân hệ số điều chỉnh giá đất của dự án", lyDo: chonHs.lyDo.trim() }] : [],
          canCu: [...canCu, { vanBan: "NQ 152/2025/NQ-HĐND", viTri: c.nguonGia || "" }],
          canhBao: [...canhBao, `Điều kiện: ${c.truongHop === "K10" ? "chuyển mục đích không phải xin phép nhưng chưa đăng ký biến động, chưa bị lập biên bản xử lý vi phạm" : c.diem8 === "b" ? "sử dụng ổn định vào sản xuất NN sau khi cấp GCN đất lâm nghiệp và trước 01/7/2004, không có biên bản xử lý vi phạm, thửa không nằm trong quy hoạch 03 loại rừng" : "sử dụng ổn định vào sản xuất NN trước thời điểm cấp GCN và quy hoạch 03 loại rừng"} — cán bộ xác nhận`],
        }),
        bieu: [{ dvt: "m²", kl: dtTinh, heSo: nhanHs, donGia: donGia.gt(0) ? donGia.mul(1000) : D(0) }],
        cot: "HT_DAT",
        thuaId: t.id,
      },
    });
  }
  // Phần chuyển đổi nghề
  if (ho.hoTro.chuyenDoiNghe && ho.loai !== "TO_CHUC") {
    const ndCdn = `Hỗ trợ chuyển đổi nghề theo chênh lệch giá đất – ${ten}`;
    let d: DongTinh;
    if (!giaGcn) d = thieu("B14.CĐN", ndCdn, "Chưa chọn giá đất theo loại đất ghi trên GCN cho thửa", cvb);
    else if (!han) d = thieu("B14.CĐN", ndCdn, "Chưa có hạn mức công nhận quyền sử dụng đất NN cùng loại", cvb);
    else if (giaHT.lte(giaGcn)) d = dong({ ma: "B14.CĐN", noiDung: ndCdn, congThuc: "Chênh lệch giá ≤ 0", thanhTien: D(0), canCu, canhBao: ["Giá đất NN hiện trạng không cao hơn giá theo GCN — không có chênh lệch"] });
    else {
      const x = chuyenDoiNghe(cs, { xa: duAn.xa, loaiDat: ten, dienTichThuHoiM2: t.dienTichThuHoi, hanMucM2: han.toString(), canCuHanMuc: canCuHan, giaDatNNNghinDong: giaHT.minus(giaGcn).toString() });
      d = { ...x, ma: "B14.CĐN", noiDung: ndCdn, thamSo: { ...x.thamSo, "Giá đất NN cùng loại (hiện trạng)": `${dinhDang(giaHT.mul(1000))} đ/m²`, "Giá theo GCN": `${dinhDang(giaGcn.mul(1000))} đ/m²` }, congThuc: `${x.congThuc} (giá = chênh lệch hiện trạng − GCN)`, canCu: [...canCu, ...x.canCu] };
    }
    out.push({ nhom: "B.IV", kq: { dong: d, cot: "HT_CDN", thuaId: t.id } });
  }
  return out;
}

export const SO_NGUYEN = (d: Decimal | null | undefined, le = 0) => (d ? dinhDang(d, le) : "—");

export const TEN_CACH_LAM_TRON: Record<"LEN" | "NUA_LEN" | "XUONG" | "KHONG", string> = {
  LEN: "Làm tròn lên",
  NUA_LEN: "Làm tròn nửa lên (từ 500 đ trở lên thì lên)",
  XUONG: "Làm tròn xuống",
  KHONG: "Không làm tròn",
};

export function moTaLamTron(cach: string, buoc: number, lyDo?: string): string {
  const ten = TEN_CACH_LAM_TRON[cach as keyof typeof TEN_CACH_LAM_TRON] ?? cach;
  const co = cach === "KHONG" ? ten : `${ten} đến ${buoc.toLocaleString("vi-VN")} đ ở cấp hộ`;
  return lyDo ? `${co} — lựa chọn của dự án: ${lyDo} (VM-36)` : `${co} (QD-03)`;
}

/** Giá đất ở (đ/m²) của thửa: giá đã chọn, hoặc đơn giá bình quân theo phân lớp. */
function giaDatOThua(cs: BoChinhSach, t: Thua): { gia: Decimal; nguon: string; binhQuan: boolean } | null {
  if (t.phanLop && t.phanLop.lop.length) {
    const pl = t.phanLop;
    const kq = datTheoPhanLop(cs, {
      loaiDat: t.loaiDat,
      nhom: nhomPhanLop(pl.tuyen.bang),
      nguonTuyen: `Bảng ${pl.tuyen.bang}, STT ${pl.tuyen.stt}`,
      dienTichThuHoiM2: t.dienTichThuHoi,
      lop: pl.lop.map((l) => ({ lop: l.lop, viTri: l.viTri, giaViTriNghinDong: pl.tuyen.vt[l.viTri - 1] ?? 0, dienTichM2: l.dienTich || "0", giaTuyChinhNghinDong: l.giaTuyChinh, lyDo: l.lyDo })),
    });
    const dt = D(t.dienTichThuHoi || "0");
    if (!kq.dong.thanhTien || dt.lte(0)) return null;
    return { gia: kq.dong.thanhTien.div(dt), nguon: `bình quân phân lớp — Bảng ${pl.tuyen.bang}, STT ${pl.tuyen.stt}`, binhQuan: true };
  }
  return t.gia ? { gia: D(t.gia.giaNghinDong).mul(1000), nguon: t.gia.nguon, binhQuan: false } : null;
}

export const TEN_KHONG_GIAY_TO = {
  D8: "Điều 8 — không có giấy tờ về quyền sử dụng đất",
  D9: "Điều 9 — làm nhà ở có vi phạm trước 01/7/2014",
  D10: "Điều 10 — giao không đúng thẩm quyền trước 01/8/2024",
  D12: "Điều 12 — đất nông nghiệp (không giấy tờ, vi phạm, giao sai thẩm quyền)",
} as const;

/**
 * B03, B04 (Điều 8, 9, 10 NĐ 88) và B05 (Điều 12): thay dòng bồi thường về đất của thửa bằng các dòng theo phân bổ DT.
 * Giá đất nhân hệ số điều chỉnh của dự án (giá đất tính tiền bồi thường, QD-02).
 */
function dongKhongGiayTo(cs: BoChinhSach, duAn: DuAn, t: Thua): { nhom: "A.I" | "B.I"; kq: DongKetQua }[] {
  const k = t.khongGiayTo!;
  const out: { nhom: "A.I" | "B.I"; kq: DongKetQua }[] = [];
  const ten = `${t.loaiDat} (${nhanThua(t)})`;
  const hs = duAn.heSoGiaDat && !D(duAn.heSoGiaDat.heSo).eq(1) ? duAn.heSoGiaDat : null;
  const nhanHs = (g: Decimal) => (hs ? g.mul(hs.heSo) : g);
  const moTaHs = hs ? ` × hệ số ${hs.heSo} (${hs.vanBan || "chưa ghi văn bản"})` : "";
  const push = (nhom: "A.I" | "B.I", d: DongTinh, bieu?: DongBieu[]) => out.push({ nhom, kq: { dong: d, bieu, cot: nhom === "A.I" ? "BT_DAT" : "HT_DAT", thuaId: t.id } });
  const vb = "NĐ 88/2024/NĐ-CP";
  const dongDt = (ma: string, noiDung: string, dt: Decimal, gia: { gia: Decimal; nguon: string } | null, canCu: DongTinh["canCu"], them: Partial<DongTinh> = {}, loiGia = "Chưa chọn giá đất từ bảng giá") => {
    if (dt.lte(0)) return;
    if (!gia) return push("A.I", thieu(ma, noiDung, loiGia, vb));
    const g = nhanHs(gia.gia);
    push("A.I", dong({ ma, noiDung, thamSo: { "Diện tích": `${dinhDang(dt, 2)} m²`, "Giá đất": `${dinhDang(gia.gia)} đ/m² (${gia.nguon})${moTaHs}` }, congThuc: `Diện tích × Giá đất${hs ? " × Hệ số" : ""}`, thanhTien: dt.mul(g), canCu: [...canCu, { vanBan: "NQ 152/2025/NQ-HĐND", viTri: gia.nguon }], ...them }), [{ dvt: "m²", kl: dt, heSo: hs ? D(hs.heSo) : D(1), donGia: gia.gia }]);
  };
  const giaCl = k.giaConLai?.giaNghinDong && laSoMay(k.giaConLai.giaNghinDong) ? { gia: D(k.giaConLai.giaNghinDong).mul(1000), nguon: `${k.giaConLai.loaiDat || "?"} — ${k.giaConLai.nguon}` } : null;

  if (k.dieu === "D12") {
    const nd = `Bồi thường về đất nông nghiệp – ${ten}`;
    if (!k.truongHopNN) return (push("A.I", thieu("B05", nd, "Chưa chọn trường hợp (khoản 1, 2, 3, 5 Điều 12 NĐ 88)", vb)), out);
    const hmStr = k.hanMuc?.trim() || (k.truongHopNN === "K2_KHAI_HOANG" ? "" : duAn.hanMucNN?.m2 || "");
    const canCuHm = k.hanMuc?.trim() ? k.canCuHanMuc?.trim() || "chưa ghi căn cứ" : duAn.hanMucNN?.canCu || "";
    if (k.truongHopNN !== "K5A" && (!hmStr || !laSoMay(hmStr)))
      return (push("A.I", thieu("B05", nd, k.truongHopNN === "K2_KHAI_HOANG" ? "Chưa nhập hạn mức giao đất nông nghiệp do UBND tỉnh quy định (đất tự khai hoang — đoạn 2 khoản 2 Điều 12)" : "Chưa có hạn mức giao đất nông nghiệp (Điều 176 LĐĐ) — nhập ở thửa hoặc Thông tin dự án", vb)), out);
    const r = phanBoDatNN({ truongHop: k.truongHopNN, dtThuHoi: t.dienTichThuHoi, hanMuc: hmStr || "0", truoc2004TrucTiepSx: k.truoc2004TrucTiepSx });
    const gia = t.gia ? { gia: D(t.gia.giaNghinDong).mul(1000), nguon: t.gia.nguon } : null;
    dongDt("B05", nd, r.boiThuong, gia, r.canCu, {
      thamSo: undefined,
      canhBao: [...r.canhBao, `Điều kiện: ${TEN_TRUONG_HOP_NN[k.truongHopNN]} — cán bộ xác nhận`],
    });
    const d = out[out.length - 1]?.kq.dong;
    if (d && d.thanhTien) d.thamSo = { "Trường hợp": TEN_TRUONG_HOP_NN[k.truongHopNN], "DT thu hồi": `${dinhDang(lamTronDienTich(t.dienTichThuHoi), 2)} m²`, ...(k.truongHopNN !== "K5A" ? { "Hạn mức": `${hmStr} m² (${canCuHm})` } : {}), "DT được bồi thường": `${dinhDang(r.boiThuong, 2)} m²`, ...d.thamSo, "Giá đất": `${dinhDang(gia!.gia)} đ/m² (${gia!.nguon})${moTaHs}` };
    if (r.vuot.gt(0)) {
      const ndK7 = `Hỗ trợ khác phần DT vượt hạn mức (${dinhDang(r.vuot, 2)} m²) – ${ten}`;
      const h = k.hoTroK7;
      if (!h?.canCu.trim()) push("B.I", thieu("B05.K7", ndK7, "Khoản 7 Điều 12: UBND cấp tỉnh quyết định hỗ trợ khác đối với từng dự án — nhập số tiền kèm văn bản quyết định", `${vb} khoản 7 Điều 12`));
      else if (!h.soTien.trim() || !laSoMay(h.soTien)) push("B.I", thieu("B05.K7", ndK7, "Chưa nhập số tiền hỗ trợ", h.canCu));
      else push("B.I", dong({ ma: "B05.K7", noiDung: ndK7, thamSo: { "DT vượt hạn mức": `${dinhDang(r.vuot, 2)} m²`, "Số tiền": `${dinhDang(D(h.soTien))} đ` }, congThuc: "Theo văn bản quyết định hỗ trợ (cán bộ nhập)", thanhTien: D(h.soTien), canCu: [{ vanBan: vb, viTri: "khoản 7 Điều 12" }, { vanBan: h.canCu.trim(), viTri: "" }] }));
    }
    return out;
  }

  // Điều 8, 9, 10
  const hmCn = k.hanMuc?.trim() || duAn.hanMucDatO?.congNhan || "";
  const hmGiao = k.hanMuc?.trim() || duAn.hanMucDatO?.giao || "";
  const r = phanBoDatO({ dieu: k.dieu, ngaySuDung: k.ngaySuDung, dtThuHoi: t.dienTichThuHoi, dtThua: t.dienTich || t.dienTichThuHoi, dtXayDung: laSoMay(k.dtXayDung ?? "") ? k.dtXayDung : 0, dtSxkd: laSoMay(k.dtSxkd ?? "") ? k.dtSxkd : 0, hanMucCongNhan: laSoMay(hmCn) ? hmCn : null, hanMucGiao: laSoMay(hmGiao) ? hmGiao : null, d140: k.d140, giayToNopTien: k.giayToNopTien, lanChiem: k.lanChiem });
  const nd0 = `Bồi thường về đất – ${ten}`;
  if (r.loi) return (push("A.I", thieu("B03", nd0, r.loi, `${vb} ${r.khoan || TEN_KHONG_GIAY_TO[k.dieu]}`)), out);
  const canCuHm = k.hanMuc?.trim() ? k.canCuHanMuc?.trim() || "chưa ghi căn cứ" : duAn.hanMucDatO?.canCu || "chưa ghi căn cứ";
  const thamSoChung: Record<string, string> = {
    "Trường hợp": `${r.khoan} — ${r.moTa}`,
    "Thời điểm sử dụng ổn định": k.ngaySuDung.split("-").reverse().join("/"),
    ...(r.hanMucM2 ? { [r.hanMuc === "GIAO" ? "Hạn mức giao đất ở" : "Hạn mức công nhận đất ở"]: `${dinhDang(r.hanMucM2, 2)} m² (${canCuHm})` } : {}),
    "DT thu hồi": `${dinhDang(lamTronDienTich(t.dienTichThuHoi), 2)} m²`,
  };
  const dieuKien = `Điều kiện: ${TEN_KHONG_GIAY_TO[k.dieu]} (${k.dieu === "D8" ? "khoản 1" : k.dieu === "D9" ? "khoản 2" : "khoản 3"} Điều 5 NĐ 88)${k.vungKhoKhan ? "; hộ thuộc đối tượng giao đất NN (k1 Đ118 LĐĐ), đăng ký thường trú tại vùng KT-XH khó khăn/ĐBKK (khoản 4 Điều 8)" : ""} — cán bộ xác nhận`;
  const xn = r.canXacNhan.length && !k.lyDoVm39?.trim();
  if (r.conLaiLoai === "KHONG_BT" && r.datO.isZero()) {
    push("A.I", dong({ ma: "B04", noiDung: nd0, thamSo: thamSoChung, congThuc: r.moTa, thanhTien: D(0), canCu: r.canCu, canhBao: [dieuKien] }));
    return out;
  }
  const giaO = giaDatOThua(cs, t);
  const maO = k.dieu === "D8" ? "B03" : "B04";
  dongDt(maO, `Bồi thường về đất ở – ${ten}`, r.datO, giaO, r.canCu, {
    thamSo: undefined,
    trangThai: xn ? "CAN_XAC_NHAN" : "TAM_TINH",
    luaChon: r.canXacNhan.length && !xn ? [{ ma: "VM-39", giaTri: "Bồi thường đất ở toàn bộ DT thu hồi (như khoản 2, 3 Điều 8)", lyDo: k.lyDoVm39!.trim() }] : [],
    canhBao: [...r.canhBao, ...r.canXacNhan, dieuKien, ...(giaO?.binhQuan ? ["Đơn giá đất ở bình quân theo phân lớp của thửa — cán bộ kiểm tra vị trí phần đất ở"] : [])],
  }, "Chưa chọn giá đất ở cho thửa");
  const dO = out.find((x) => x.kq.dong.ma === maO)?.kq.dong;
  if (dO && dO.thanhTien) dO.thamSo = { ...thamSoChung, "DT đất ở được bồi thường": `${dinhDang(r.datO, 2)} m²`, ...dO.thamSo };
  if (r.datOVuot.gt(0)) {
    const ndT = `Trừ tiền sử dụng đất phải nộp phần đất ở vượt hạn mức (${dinhDang(r.datOVuot, 2)} m²) – ${ten}`;
    if (!k.canCuTienSdd?.trim()) push("A.I", thieu(`${maO}.T`, ndT, "Chưa ghi căn cứ tiền sử dụng đất phải nộp như khi cấp GCN (thông báo của cơ quan thuế / bảng tính tại thời điểm phê duyệt phương án)", `${vb} đoạn 2 điểm a ${r.khoan.includes("khoản 2 Điều 8") ? "khoản 2" : "khoản 1"} Điều 8`));
    else if (!k.tienSdd?.trim() || !laSoMay(k.tienSdd)) push("A.I", thieu(`${maO}.T`, ndT, "Chưa nhập số tiền sử dụng đất phải nộp", k.canCuTienSdd));
    else push("A.I", dong({ ma: `${maO}.T`, noiDung: ndT, thamSo: { "Tiền SDĐ phải nộp": `${dinhDang(D(k.tienSdd))} đ` }, congThuc: "− Tiền sử dụng đất phải nộp như khi được cấp GCN đối với phần vượt hạn mức", thanhTien: D(k.tienSdd).neg(), canCu: [{ vanBan: vb, viTri: "đoạn 2 điểm a khoản 1, 2 Điều 8" }, { vanBan: k.canCuTienSdd.trim(), viTri: "" }] }));
  }
  const giaKd = k.giaSxkd?.giaNghinDong && laSoMay(k.giaSxkd.giaNghinDong) ? { gia: D(k.giaSxkd.giaNghinDong).mul(1000), nguon: k.giaSxkd.nguon } : null;
  dongDt(`${maO}.KD`, `Bồi thường đất sản xuất, kinh doanh phi nông nghiệp, thương mại, dịch vụ – ${ten}`, r.sxkd, giaKd, [{ vanBan: vb, viTri: `điểm c ${r.khoan.replace(/^điểm \w /, "")}` }], { canhBao: ["Loại đất tính bồi thường như đất được Nhà nước giao có thu tiền sử dụng đất, thời hạn ổn định lâu dài — chọn giá đất SXKD/TMDV phù hợp"] }, "Chưa chọn giá đất sản xuất, kinh doanh / thương mại, dịch vụ");
  if (r.conLai.gt(0)) {
    if (r.conLaiLoai === "CHUA_QUY_DINH") {
      const c = k.conLai?.lyDo.trim() ? k.conLai : undefined;
      const ndC = `Phần DT còn lại của thửa (${dinhDang(r.conLai, 2)} m²) – ${ten}`;
      if (!c) push("A.I", dong({ ma: `${maO}.CL`, noiDung: ndC, congThuc: "—", thanhTien: null, canCu: r.canCu, trangThai: "CAN_XAC_NHAN", canhBao: ["Điều 9 NĐ 88 không quy định phần DT thu hồi còn lại sau phần được bồi thường — chọn tính theo loại đất nông nghiệp hoặc không bồi thường về đất, ghi lý do"] }));
      else if (c.cach === "KHONG") push("A.I", dong({ ma: `${maO}.CL`, noiDung: ndC, congThuc: "Không bồi thường về đất (người dùng chọn)", thanhTien: D(0), canCu: r.canCu, luaChon: [{ ma: "Đ9-CL", giaTri: "Không bồi thường về đất phần còn lại", lyDo: c.lyDo.trim() }] }));
      else dongDt(`${maO}.CL`, `Bồi thường theo loại đất nông nghiệp phần còn lại – ${ten}`, r.conLai, giaCl, r.canCu, { luaChon: [{ ma: "Đ9-CL", giaTri: "Tính theo loại đất nông nghiệp", lyDo: c.lyDo.trim() }] }, "Chưa chọn giá đất nông nghiệp cho phần còn lại");
    } else
      dongDt(
        `${maO}.NN`,
        r.conLaiLoai === "HIEN_TRANG" ? `Bồi thường theo hiện trạng sử dụng đất phần còn lại – ${ten}` : `Bồi thường theo loại đất nông nghiệp phần còn lại – ${ten}`,
        r.conLai,
        giaCl,
        [{ vanBan: vb, viTri: r.conLaiLoai === "HIEN_TRANG" ? "điểm b khoản 3 Điều 10" : `điểm d ${r.khoan.replace(/^.*?(khoản \d Điều 8).*$/, "$1")}` }],
        {},
        r.conLaiLoai === "HIEN_TRANG" ? "Chưa chọn giá đất theo hiện trạng sử dụng cho phần còn lại" : "Chưa chọn giá đất nông nghiệp cho phần còn lại",
      );
  }
  return out;
}
