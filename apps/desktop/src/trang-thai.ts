/**
 * Hiện trạng GPMB của hồ sơ, thống kê dự án, mốc tiến độ và cảnh báo tự động.
 * Quy tắc xác định trạng thái (thứ tự ưu tiên):
 *   1. HOAN_THANH  – bước 12 "Chi trả" đã xác nhận hoàn thành;
 *   2. VUONG_MAC   – cán bộ ghi vướng mắc; hoặc bước quá hạn kế hoạch; hoặc phương án đã niêm yết
 *                    (bước 6 trở đi) mà còn khoản "Thiếu căn cứ" (khi đang lập hồ sơ, thiếu căn cứ là bình thường);
 *   3. DANG_XU_LY  – đã bắt đầu từ bước 5 (lập phương án) trở đi;
 *   4. DA_KIEM_DEM – bước 4 (điều tra, kiểm đếm) đã hoàn thành;
 *   5. CHUA_KIEM_DEM.
 */
import { CAC_BUOC, type DuAn, type Ho } from "./mo-hinh";
import type { KetQuaHo } from "./tinh-ho";

import { hoLechSauPheDuyet } from "./phuong-an";
import { HAN_BUOC, tinhHanBuoc } from "./han-buoc";
import { LICH_TRONG, type LichLamViec } from "./lich-lam-viec";
import { tinhChiTra, type GiaiDoanTyLe } from "./chi-tra";
import { dinhDang } from "@gpmb/core";
export type TrangThaiGpmb = "HOAN_THANH" | "DANG_XU_LY" | "DA_KIEM_DEM" | "VUONG_MAC" | "CHUA_KIEM_DEM";

export const THU_TU_TRANG_THAI: TrangThaiGpmb[] = ["HOAN_THANH", "DANG_XU_LY", "DA_KIEM_DEM", "VUONG_MAC", "CHUA_KIEM_DEM"];

export const TT_GPMB: Record<TrangThaiGpmb, { ten: string; mau: string; nen: string; bieuTuong: string }> = {
  HOAN_THANH: { ten: "Đã hoàn thành GPMB", mau: "#44872a", nen: "rgba(68,135,42,0.30)", bieuTuong: "✓" },
  DANG_XU_LY: { ten: "Đang xử lý", mau: "#c98a1e", nen: "rgba(201,138,30,0.30)", bieuTuong: "◔" },
  DA_KIEM_DEM: { ten: "Đã kiểm đếm", mau: "#2f6bd0", nen: "rgba(47,107,208,0.26)", bieuTuong: "▤" },
  VUONG_MAC: { ten: "Vướng mắc / chưa hoàn tất", mau: "#cc3b2e", nen: "rgba(204,59,46,0.28)", bieuTuong: "!" },
  CHUA_KIEM_DEM: { ten: "Chưa kiểm đếm", mau: "#8b918c", nen: "rgba(139,145,140,0.24)", bieuTuong: "○" },
};

const xong = (h: Ho, ma: string) => h.tienDo[ma]?.trangThai === "XONG";
const batDau = (h: Ho, ma: string) => {
  const t = h.tienDo[ma]?.trangThai;
  return t === "DANG" || t === "CHO_DUYET" || t === "XONG";
};

/** Phương án đã đưa ra niêm yết (bước 6 trở đi đã bắt đầu). */
export const daNiemYet = (h: Ho) => CAC_BUOC.slice(5).some((b) => batDau(h, b.ma));
const dangLapPhuongAn = (h: Ho) => CAC_BUOC.slice(4).some((b) => batDau(h, b.ma));

export function buocQuaHan(duAn: DuAn, h: Ho, homNay: string): string[] {
  const kh = duAn.keHoach ?? {};
  return CAC_BUOC.filter((b) => kh[b.ma] && kh[b.ma]! < homNay && !xong(h, b.ma)).map((b) => b.ma);
}

export function trangThaiHo(duAn: DuAn, h: Ho, kq: KetQuaHo, homNay: string): TrangThaiGpmb {
  if (xong(h, "12")) return "HOAN_THANH";
  if (h.vuongMac?.noiDung || buocQuaHan(duAn, h, homNay).length || (kq.tong.soDongThieuCanCu > 0 && daNiemYet(h))) return "VUONG_MAC";
  if (CAC_BUOC.slice(4).some((b) => batDau(h, b.ma))) return "DANG_XU_LY";
  if (xong(h, "4")) return "DA_KIEM_DEM";
  return "CHUA_KIEM_DEM";
}

export interface ThongKeDuAn {
  soHo: number;
  theoTrangThai: Record<TrangThaiGpmb, number>;
  soThua: number;
  soThuaDaKiemDem: number;
  /** Tiến độ chung = số bước đã hoàn thành / (số hộ × 16). */
  tienDoChung: number;
  /** Số hộ đã qua từng chặng. */
  chang: { ten: string; soHo: number; buoc: string }[];
  capNhatCuoi: string | null;
}

export const CAC_CHANG = [
  { ten: "Hồ sơ", buoc: "1" },
  { ten: "Kiểm đếm", buoc: "4" },
  { ten: "Lập phương án", buoc: "5" },
  { ten: "Phê duyệt", buoc: "9" },
  { ten: "Chi trả", buoc: "12" },
  { ten: "Thu hồi, bàn giao", buoc: "13" },
];

export function thongKe(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], homNay: string): ThongKeDuAn {
  const theoTrangThai = Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, 0])) as Record<TrangThaiGpmb, number>;
  let soThua = 0, soThuaDaKiemDem = 0, soBuocXong = 0;
  let capNhatCuoi: string | null = null;
  for (const { h, k } of ds) {
    theoTrangThai[trangThaiHo(duAn, h, k, homNay)]++;
    soThua += h.thua.length;
    if (xong(h, "4")) soThuaDaKiemDem += h.thua.length;
    else soThuaDaKiemDem += h.thua.filter((t) => h.taiSan.some((x) => x.thuaId === t.id)).length;
    soBuocXong += CAC_BUOC.filter((b) => xong(h, b.ma)).length;
    for (const n of h.nhatKy) if (!capNhatCuoi || n.luc > capNhatCuoi) capNhatCuoi = n.luc;
  }
  return {
    soHo: ds.length,
    theoTrangThai,
    soThua,
    soThuaDaKiemDem,
    tienDoChung: ds.length ? soBuocXong / (ds.length * CAC_BUOC.length) : 0,
    chang: CAC_CHANG.map((c) => ({ ...c, soHo: ds.filter(({ h }) => xong(h, c.buoc)).length })),
    capNhatCuoi,
  };
}

export type TrangThaiMoc = "HOAN_THANH" | "DANG_XU_LY" | "QUA_HAN" | "CHUA_DEN_HAN" | "CHUA_CO_KE_HOACH";

export const TT_MOC: Record<TrangThaiMoc, { ten: string; lop: string }> = {
  HOAN_THANH: { ten: "Hoàn thành", lop: "nhan-xanh" },
  DANG_XU_LY: { ten: "Đang xử lý", lop: "nhan-vang" },
  QUA_HAN: { ten: "Quá hạn kế hoạch", lop: "nhan-do" },
  CHUA_DEN_HAN: { ten: "Chưa đến hạn", lop: "nhan-xam" },
  CHUA_CO_KE_HOACH: { ten: "Chưa có kế hoạch", lop: "nhan-xam" },
};

export interface MocTienDo {
  ma: string;
  ten: string;
  ngayKeHoach: string | null;
  soXong: number;
  soHo: number;
  trangThai: TrangThaiMoc;
}

/** Mốc tiến độ cấp dự án: tổng hợp trạng thái bước của mọi hộ so với kế hoạch. */
export function mocTienDo(duAn: DuAn, hos: Ho[], homNay: string): MocTienDo[] {
  return CAC_BUOC.map((b) => {
    const soXong = hos.filter((h) => xong(h, b.ma)).length;
    const coBatDau = hos.some((h) => batDau(h, b.ma));
    const kh = duAn.keHoach?.[b.ma] ?? null;
    let trangThai: TrangThaiMoc;
    if (hos.length && soXong === hos.length) trangThai = "HOAN_THANH";
    else if (kh && kh < homNay) trangThai = "QUA_HAN";
    else if (coBatDau) trangThai = "DANG_XU_LY";
    else trangThai = kh ? "CHUA_DEN_HAN" : "CHUA_CO_KE_HOACH";
    return { ma: b.ma, ten: b.ten, ngayKeHoach: kh, soXong, soHo: hos.length, trangThai };
  });
}

export interface CanhBao {
  muc: "CAO" | "TRUNG_BINH" | "THONG_TIN";
  noiDung: string;
  canCu?: string;
  hoId?: string;
  duAnId: string;
}

const soNgay = (tu: string, den: string) => Math.round((Date.parse(den) - Date.parse(tu)) / 86400000);

/** Cảnh báo tự động — chỉ dùng các thời hạn có căn cứ (docs/05) hoặc kế hoạch do cán bộ nhập. */
export function canhBaoDuAn(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], homNay: string, lich: LichLamViec = LICH_TRONG, tyLeCham: GiaiDoanTyLe[] = []): CanhBao[] {
  const out: CanhBao[] = [];
  for (const m of mocTienDo(duAn, ds.map((x) => x.h), homNay))
    if (m.trangThai === "QUA_HAN")
      out.push({ muc: "CAO", duAnId: duAn.id, noiDung: `Bước ${m.ma}. ${m.ten}: quá hạn kế hoạch ${m.ngayKeHoach} (${m.soXong}/${m.soHo} hộ hoàn thành)` });
  for (const { h, k } of ds) {
    const ct = tinhChiTra(h, duAn.phuongAn ?? [], tyLeCham, homNay);
    if (ct.trangThai !== "CHUA_DUYET") {
      if (ct.conLai!.gt(0) && ct.hanChi! < homNay)
        out.push({ muc: "CAO", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: quá hạn chi trả (hạn ${ct.hanChi!.split("-").reverse().join("/")}), còn ${dinhDang(ct.conLai!, 0)} đ; tiền chậm trả tạm tính ${ct.tienChamTra ? `${dinhDang(ct.tienChamTra, 0)} đ` : "chưa tính được (thiếu tỷ lệ)"}`, canCu: "điểm a, b khoản 3 Điều 94 Luật Đất đai 2024" });
      else if (ct.chamTra.length && !(h.chiTra?.nguyenNhanCham))
        out.push({ muc: "TRUNG_BINH", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: có khoản chi sau hạn — cần xác nhận nguyên nhân chậm để lập phương án chi trả bồi thường chậm`, canCu: "điểm b khoản 3 Điều 94 Luật Đất đai 2024" });
      if (ct.trangThai === "CHI_VUOT") out.push({ muc: "CAO", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: đã chi vượt số được duyệt` });
    }
    const b9 = h.tienDo["9"];
    if (ct.trangThai === "CHUA_DUYET" && b9?.trangThai === "XONG" && b9.ngay && !xong(h, "12") && soNgay(b9.ngay, homNay) > 30)
      out.push({ muc: "CAO", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: quá 30 ngày kể từ phê duyệt phương án chưa chi trả (${soNgay(b9.ngay, homNay)} ngày)`, canCu: "khoản 3 Điều 94 Luật Đất đai 2024" });
    const b13 = h.tienDo["13"];
    if (b13?.ngay && duAn.ngayThongBao) {
      const kc = soNgay(duAn.ngayThongBao, b13.ngay);
      const coPnn = h.thua.some((t) => !/^(LUC|LUK|LUN|HNK|BHK|NHK|CLN|RSX|RPH|RDD|NTS|NKH|LNP)$/i.test(t.loaiDat));
      const toiThieu = coPnn ? 180 : 90;
      if (kc < toiThieu)
        out.push({ muc: "CAO", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: QĐ thu hồi cách thông báo ${kc} ngày (< ${toiThieu} ngày)`, canCu: "khoản 2 Điều 85 Luật Đất đai 2024" });
    }
    for (const han of HAN_BUOC) {
      const t = tinhHanBuoc(h, han, homNay, lich);
      const ten = CAC_BUOC.find((b) => b.ma === han.buoc)?.ten ?? "";
      const dv = han.loai === "NLV" ? "ngày làm việc" : "ngày";
      const hc = t.hanChot?.split("-").reverse().join("/");
      if (t.trangThai === "QUA_HAN") out.push({ muc: "CAO", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: bước ${han.buoc}. ${ten} quá hạn (hạn ${hc}, ${han.soNgay} ${dv})`, canCu: han.canCu });
      else if (t.trangThai === "SAP_HET") out.push({ muc: "TRUNG_BINH", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: bước ${han.buoc}. ${ten} sắp hết hạn (${hc}, còn ${t.conLai} ${dv})`, canCu: han.canCu });
    }
    if (h.vuongMac?.noiDung) out.push({ muc: "TRUNG_BINH", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: ${h.vuongMac.noiDung}` });
    if (k.tong.soDongThieuCanCu && dangLapPhuongAn(h))
      out.push({ muc: daNiemYet(h) ? "CAO" : "TRUNG_BINH", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: ${k.tong.soDongThieuCanCu} khoản thiếu căn cứ${daNiemYet(h) ? " (phương án đã niêm yết)" : ""}` });
    if (Object.values(h.tienDo).some((b) => b.trangThai === "CHO_DUYET")) out.push({ muc: "THONG_TIN", duAnId: duAn.id, hoId: h.id, noiDung: `${h.ma} · ${h.ten}: có bước chờ duyệt` });
  }
  for (const l of hoLechSauPheDuyet(duAn.phuongAn ?? [], ds))
    out.push({ muc: "CAO", duAnId: duAn.id, hoId: l.h.id, noiDung: `${l.h.ma} · ${l.h.ten}: hồ sơ đã sửa sau khi phương án bản ${l.ban.so} được phê duyệt (${l.ban.pheDuyet?.so ?? ""}) — tạm tính khác số đã duyệt; nếu đúng cần lập phương án điều chỉnh` });
  const chuaDu = ds.filter(({ h, k }) => k.tong.soDongThieuCanCu && !dangLapPhuongAn(h)).length;
  if (chuaDu) out.push({ muc: "THONG_TIN", duAnId: duAn.id, noiDung: `${chuaDu} hồ sơ đang điều tra, kiểm đếm chưa đủ số liệu tính (giá đất, khối lượng…)` });
  return out;
}

/** Cảnh báo chung: văn bản phân cấp, ủy quyền QĐ 27/2026 hết hiệu lực 01/3/2027 (VM-18) — báo trước 60 ngày. */
export function canhBaoChung(homNay: string, lich?: LichLamViec): { noiDung: string; canCu: string; muc?: "TRUNG_BINH"; caiDat?: boolean }[] {
  const het = "2027-03-01";
  const con = soNgay(homNay, het);
  const out: ReturnType<typeof canhBaoChung> = [];
  const nam = Number(homNay.slice(0, 4));
  if (lich && !lich.namDaDu.includes(nam))
    out.push({ noiDung: `Chưa xác nhận danh mục ngày nghỉ lễ, Tết năm ${nam} — hạn tính theo ngày làm việc hiện chỉ trừ thứ Bảy, Chủ nhật`, canCu: "VM-25 · bấm để mở Cài đặt → Lịch ngày nghỉ", muc: "TRUNG_BINH", caiDat: true });
  if (con <= 60) return [...out, { noiDung: con > 0 ? `QĐ 27/2026/QĐ-UBND (phân cấp, ủy quyền) hết hiệu lực sau ${con} ngày` : "QĐ 27/2026/QĐ-UBND đã hết hiệu lực — kiểm tra thẩm quyền", canCu: "Điều 6 QĐ 27/2026/QĐ-UBND (VM-18)" }];
  return out;
}

export const homNayIso = () => new Date().toISOString().slice(0, 10);
