/**
 * Điều phối tính toán cho một hộ/đối tượng: gọi các hàm của lõi (@gpmb/core) theo dữ liệu hồ sơ,
 * nhóm kết quả theo cấu trúc biểu áp giá (A. Bồi thường, B. Hỗ trợ) và theo thửa.
 * Không chứa quy tắc pháp lý riêng — mọi mức, hệ số lấy từ bộ chính sách.
 */
import {
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
  tongHo,
  type BoChinhSach,
  type DongCayXen,
  type DongTinh,
  type TongHo,
} from "@gpmb/core";
import type Decimal from "decimal.js";
import { thuTinh } from "./bieu-thuc";
import type { DuAn, Ho, TaiSan, Thua } from "./mo-hinh";

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
  HT_KHAC: "Hỗ trợ khác (ổn định đời sống, tạm cư, di dời)",
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

export function tinhHo(cs: BoChinhSach, duAn: DuAn, ho: Ho): KetQuaHo {
  const nhom: NhomKetQua[] = [
    { ma: "A.I", ten: "Bồi thường về đất", dong: [] },
    { ma: "A.II", ten: "Bồi thường nhà, công trình, vật kiến trúc", dong: [] },
    { ma: "A.III", ten: "Bồi thường cây trồng, vật nuôi", dong: [] },
    { ma: "B.II", ten: "Hỗ trợ tài sản, vật kiến trúc", dong: [] },
    { ma: "B.IV", ten: "Hỗ trợ đào tạo, chuyển đổi nghề và tìm kiếm việc làm", dong: [] },
    { ma: "B.V", ten: "Hỗ trợ ổn định đời sống, tạm cư, di dời", dong: [] },
  ];
  const n = (ma: string) => nhom.find((x) => x.ma === ma)!;

  for (const t of ho.thua) {
    if (D(t.dienTichThuHoi || "0").gt(0)) {
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
        if (ts.phan === "BOI_THUONG") n("A.II").dong.push({ dong: d, bieu, cot: "BT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
        else n("B.II").dong.push({ dong: d, bieu, cot: "HT_TAI_SAN", thuaId: t.id, taiSanId: ts.id });
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
      } else if (ts.loai === "VAT_NUOI") {
        const kl = soLuong(ts, ts.khoiLuong, "C09");
        const d = kl.loi ?? diDoiVatNuoi(cs, { loaiDuong: ts.loaiDuong, loaiVatNuoi: ts.loaiVatNuoi, khoiLuong: kl.v!, quangDuongKm: ts.quangDuongKm || "0" });
        n("B.V").dong.push({ dong: d, cot: "HT_KHAC", thuaId: t.id, taiSanId: ts.id });
      }
    }
    const cay = tsThua.filter((x): x is Extract<TaiSan, { loai: "CAY" }> => x.loai === "CAY");
    if (cay.length) n("A.III").dong.push(...dongCayThua(cs, t, cay));

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
      n("B.IV").dong.push({ dong: d, bieu, cot: "HT_CDN", thuaId: t.id });
    }
  }

  if (ho.hoTro.moMa && ho.hoTro.moMa.xay + ho.hoTro.moMa.khongXay > 0)
    n("A.II").dong.push({ dong: moMa(cs, { soMoXay: ho.hoTro.moMa.xay, soMoKhongXay: ho.hoTro.moMa.khongXay }), cot: "BT_TAI_SAN" });

  const od = ho.hoTro.onDinh;
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

  const tatCa = nhom.flatMap((x) => x.dong);
  const tong = tongHo(cs, tatCa.map((x) => x.dong));
  const theoCot = Object.fromEntries(Object.keys(TEN_COT).map((k) => [k, D(0)])) as Record<CotTongHop, Decimal>;
  for (const x of tatCa) if (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien) theoCot[x.cot] = theoCot[x.cot].plus(x.dong.thanhTien);
  const tongBoiThuong = theoCot.BT_DAT.plus(theoCot.BT_CAY).plus(theoCot.BT_TAI_SAN);
  const tongHoTro = theoCot.HT_DAT.plus(theoCot.HT_TAI_SAN).plus(theoCot.HT_CAY).plus(theoCot.HT_CDN).plus(theoCot.HT_KHAC);
  const khauTru = D(ho.khauTru || "0");
  return {
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

export const SO_NGUYEN = (d: Decimal | null | undefined, le = 0) => (d ? dinhDang(d, le) : "—");
