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

function dongNhaCongTrinh(cs: BoChinhSach, ts: Extract<TaiSan, { loai: "NHA_CT" }>): DongTinh {
  const kl = soLuong(ts, ts.khoiLuong, "A03");
  if (kl.loi) return kl.loi;
  const canCu = [{ vanBan: "QĐ 32/2025/QĐ-UBND", viTri: `${ts.maDonGia}${ts.canCu ? " – " + ts.canCu : ""}` }];
  const xm = giaTriXayMoi({ ten: ts.ten, khoiLuong: kl.v!, donVi: ts.donVi, donGia: ts.donGia, maDonGia: ts.maDonGia, canCu });
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
    { ma: "B.VII", ten: "Hỗ trợ khác (Điều 6 QĐ 14/2026)", dong: [] },
  ];
  const n = (ma: string) => nhom.find((x) => x.ma === ma)!;

  for (const t of ho.thua) {
    const b13 = nongLamTruong(cs, duAn, t);
    if (b13 && D(t.dienTichThuHoi || "0").gt(0)) {
      n("B.I").dong.push({ dong: b13.dat, bieu: b13.bieu, cot: "HT_DAT", thuaId: t.id });
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
    const tsThua = ho.taiSan.filter((x) => x.thuaId === t.id);
    for (const ts of tsThua) {
      if (ts.loai === "NHA_CT") {
        const d = dongNhaCongTrinh(cs, ts);
        const kl = thuTinh(ts.khoiLuong).giaTri;
        const bieu = kl && d.thanhTien
          ? [{ dvt: ts.donVi, kl: kl.toDecimalPlaces(2), heSo: ts.cachTinh === "HE_SO" ? D(ts.heSo || "1") : null, donGia: D(ts.donGia || "0"), ghiChu: ts.cachTinh === "THIET_HAI_THUC_TE" ? "Thiệt hại thực tế (T, T1)" : undefined }]
          : undefined;
        const dNha = b13 && b13.ma.startsWith("9.1") ? { ...d, canhBao: [...d.canhBao, `Thửa nguồn gốc nông, lâm trường (${b13.ma}): nhà, công trình phục vụ sản xuất nông nghiệp hỗ trợ 100% mức bồi thường; không phục vụ sản xuất nông nghiệp hỗ trợ theo điểm 3.2 k3 Đ6 QĐ 14/2026 — kiểm tra lựa chọn "Bồi thường/Hỗ trợ"`] } : d;
        if (ts.phan === "BOI_THUONG") n("A.II").dong.push({ dong: dNha, bieu, cot: "BT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
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
      const ds = dongCayThua(cs, t, cay);
      if (b13?.cayHoTro)
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
      if (b13) d = { ...d, canCu: [...d.canCu, ...b13.canCu] };
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
    else if (ho.nhanKhau.length === 0) d = thieu("C01", "Hỗ trợ ổn định đời sống", "Chưa có nhân khẩu");
    else
      d = onDinhDoiSong(cs, {
        dienTichNNThuHoi: dtNN,
        dienTichNNDangSuDung: od.dienTichNNDangSuDung,
        diChuyen: od.diChuyen,
        nhanKhau: ho.nhanKhau.length,
        giaGaoDongKg: duAn.giaGao.dongKg,
        nguonGiaGao: duAn.giaGao.nguon,
        chonNhom: od.chonNhom,
      });
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
const CAN_CU_SUA_CHUA = [{ vanBan: "QĐ 14/2026/QĐ-UBND", viTri: "Điều 5" }];
function dongSuaChua(ho: Ho, ts: Extract<TaiSan, { loai: "SUA_CHUA" }>): DongTinh {
  const nd = ts.ten.trim() || "Bồi thường chi phí sửa chữa phần nhà, công trình còn lại";
  if (!ts.soTien.trim() || !laSoMay(ts.soTien) || !D(ts.soTien).gt(0)) return thieu("A06", nd, "Chưa nhập chi phí sửa chữa theo dự toán được duyệt", "QĐ 14/2026/QĐ-UBND Điều 5");
  if (!ts.canCu.trim()) return thieu("A06", nd, "Chưa ghi số, ngày dự toán sửa chữa được duyệt", "QĐ 14/2026/QĐ-UBND Điều 5");
  const canhBao: string[] = [];
  if (!ts.xacNhan.trim()) canhBao.push("Chưa ghi văn bản xác nhận phần còn lại vẫn bảo đảm tiêu chuẩn kỹ thuật theo pháp luật về xây dựng (điều kiện Điều 5)");
  const goc = ts.taiSanGocId ? ho.taiSan.find((x) => x.id === ts.taiSanGocId) : undefined;
  if (ts.taiSanGocId && !goc) canhBao.push("Nhà, công trình bị phá dỡ một phần không còn trong danh sách kiểm đếm");
  return dong({
    ma: "A06",
    noiDung: nd,
    thamSo: { "Chi phí theo dự toán": `${dinhDang(D(ts.soTien))} đ`, "Dự toán": ts.canCu.trim(), ...(goc ? { "Nhà, công trình": goc.ten } : {}), "Xác nhận kỹ thuật": ts.xacNhan.trim() || "—" },
    congThuc: "Theo dự toán được duyệt (cán bộ nhập)",
    thanhTien: D(ts.soTien),
    canCu: [...CAN_CU_SUA_CHUA, { vanBan: ts.canCu.trim(), viTri: "" }],
    trangThai: ts.xacNhan.trim() ? "TAM_TINH" : "CAN_XAC_NHAN",
    canhBao,
  });
}

const CAN_CU_K = (k: string) => [{ vanBan: "QĐ 14/2026/QĐ-UBND", viTri: `khoản ${k} Điều 6` }];
export const TEN_KHOAN_KHAC: Record<"K4" | "K13_14" | "KHAC", { ten: string; canCu: { vanBan: string; viTri: string }[]; goiY: string }> = {
  K4: { ten: "Hỗ trợ công trình sinh hoạt nằm ngoài cọc GPMB (thu hồi đất ở, phải di chuyển nhà)", canCu: CAN_CU_K("4"), goiY: "Mức tối đa 100% đơn giá bồi thường, mức cụ thể do Chủ tịch UBND xã quyết định" },
  K13_14: { ten: "Hỗ trợ khác do UBND xã quyết định", canCu: [...CAN_CU_K("13"), ...CAN_CU_K("14")], goiY: "Theo quyết định của UBND xã cho dự án (ghi số, ngày quyết định)" },
  KHAC: { ten: "Khoản hỗ trợ khác", canCu: [], goiY: "Chính sách chưa có sẵn — ghi đầy đủ văn bản làm căn cứ" },
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
  let c14 = k.doiTuongCs?.length ? hoTroDoiTuongChinhSach(cs, { doiTuong: k.doiTuongCs }) : null;
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
    const nd = "Hỗ trợ ổn định đời sống khi phá dỡ nhà ở, làm lại nhà nơi khác";
    let d: DongTinh;
    if (!duAn.giaGao) d = thieu("C16", nd, "Chưa nhập giá gạo tẻ trung bình (Thông tin dự án)");
    else if (!ho.nhanKhau.length) d = thieu("C16", nd, "Chưa có nhân khẩu");
    else d = hoTroXayLaiNha(cs, { nhanKhau: ho.nhanKhau.length, giaGaoDongKg: duAn.giaGao.dongKg, nguonGiaGao: duAn.giaGao.nguon });
    if (ho.hoTro.onDinh) d = { ...d, canhBao: [...d.canhBao, "Hộ đồng thời có hỗ trợ ổn định đời sống theo Điều 12 Phụ lục II QĐ 106/2025 (thẻ Hỗ trợ) — cần kiểm tra, tránh hỗ trợ trùng"] };
    out.push(d);
  }
  for (const x of k.khoan) {
    const loai = TEN_KHOAN_KHAC[x.loai];
    const nd = x.noiDung.trim() || loai.ten;
    const ma = x.loai === "K4" ? "C17.4" : x.loai === "K13_14" ? "C17" : "C17.K";
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
          canhBao: x.loai === "K4" ? ["Mức tối đa 100% đơn giá bồi thường của công trình (khoản 4 Điều 6 QĐ 14/2026) — cán bộ kiểm tra theo quyết định của Chủ tịch UBND xã"] : [],
        }),
      );
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
