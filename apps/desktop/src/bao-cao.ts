/**
 * Báo cáo tổng hợp nhiều dự án (phục vụ họp, báo cáo cấp trên). Chỉ tổng hợp số liệu đã có trong phần mềm:
 * kinh phí tạm tính (bảng tính hiện tại), kinh phí đã duyệt (bản phương án đã phê duyệt), chi trả đã ghi,
 * hiện trạng GPMB từng hộ, cảnh báo tự động. Không ước tính, không nội suy.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import type { KetQuaHo } from "./tinh-ho";
import { canhBaoDuAn, thongKe, THU_TU_TRANG_THAI, type CanhBao, type TrangThaiGpmb } from "./trang-thai";
import { tinhChiTra, type GiaiDoanTyLe } from "./chi-tra";
import type { LichLamViec } from "./lich-lam-viec";
import { soD } from "./so";
import { CHUA_XEP_DOT, coDot, dsDot, duAnTheoDot, tenDot } from "./dot-thu-hoi";

export type TinhTrangDuAn = "HOAN_THANH" | "CO_VUONG_MAC" | "DANG_THUC_HIEN" | "CHUA_CO_HO_SO";
export const TEN_TINH_TRANG: Record<TinhTrangDuAn, string> = {
  HOAN_THANH: "Hoàn thành GPMB",
  CO_VUONG_MAC: "Có vướng mắc",
  DANG_THUC_HIEN: "Đang thực hiện",
  CHUA_CO_HO_SO: "Chưa có hồ sơ",
};

export interface SoLieu {
  soDuAn: number;
  soHo: number;
  dtThuHoi: Decimal;
  tamTinh: Decimal;
  /** Tổng số phải trả theo các bản phương án đã phê duyệt */
  daDuyet: Decimal;
  soHoDaDuyet: number;
  daChi: Decimal;
  soHoDaChiDu: number;
  /** Đã duyệt − đã chi (chỉ các hộ đã duyệt) */
  conPhaiChi: Decimal;
  /** Tiền chậm trả tạm tính (k3 Đ94 LĐĐ); trừ hộ đã xác nhận chậm do người có đất */
  chamTra: Decimal;
  soHoChamTraThieuTyLe: number;
  theoTrangThai: Record<TrangThaiGpmb, number>;
  canhBaoCao: number;
  canhBaoTheoDoi: number;
}

export interface DongBaoCao extends SoLieu {
  duAn: DuAn;
  tinhTrang: TinhTrangDuAn;
  /** Tỷ lệ hộ hoàn thành GPMB (0–1) */
  tyLeHoanThanh: number;
  /** Số bước đã hoàn thành / (số hộ × 16) */
  tienDoChung: number;
  /** Chặng xa nhất có hộ đã qua */
  changHienTai: string;
  vuongMac: CanhBao[];
  /** P3-1 (0.9.27): dự án có đợt thu hồi — số liệu tách theo từng đợt (hộ chưa xếp đợt gộp một dòng cuối). */
  theoDot?: DongDot[];
}

/** Một dòng đợt thu hồi trong báo cáo (không tính là một dự án: soDuAn = 0). */
export interface DongDot extends SoLieu {
  dotId: string;
  ten: string;
  tyLeHoanThanh: number;
  changHienTai: string;
}

export interface LocBaoCao {
  xa?: string;
  tinhTrang?: TinhTrangDuAn;
  /** Tính đến ngày (ISO): chi trả ghi sau ngày này không tính */
  denNgay: string;
}

export interface BaoCao {
  loc: LocBaoCao;
  dong: DongBaoCao[];
  theoXa: { xa: string; dong: DongBaoCao[]; tong: SoLieu }[];
  tong: SoLieu;
}

const rong = (): SoLieu => ({
  soDuAn: 0, soHo: 0, dtThuHoi: D(0), tamTinh: D(0), daDuyet: D(0), soHoDaDuyet: 0, daChi: D(0), soHoDaChiDu: 0,
  conPhaiChi: D(0), chamTra: D(0), soHoChamTraThieuTyLe: 0,
  theoTrangThai: Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, 0])) as Record<TrangThaiGpmb, number>,
  canhBaoCao: 0, canhBaoTheoDoi: 0,
});

function cong(a: SoLieu, b: SoLieu): SoLieu {
  return {
    soDuAn: a.soDuAn + b.soDuAn, soHo: a.soHo + b.soHo, dtThuHoi: a.dtThuHoi.plus(b.dtThuHoi), tamTinh: a.tamTinh.plus(b.tamTinh),
    daDuyet: a.daDuyet.plus(b.daDuyet), soHoDaDuyet: a.soHoDaDuyet + b.soHoDaDuyet, daChi: a.daChi.plus(b.daChi), soHoDaChiDu: a.soHoDaChiDu + b.soHoDaChiDu,
    conPhaiChi: a.conPhaiChi.plus(b.conPhaiChi), chamTra: a.chamTra.plus(b.chamTra), soHoChamTraThieuTyLe: a.soHoChamTraThieuTyLe + b.soHoChamTraThieuTyLe,
    theoTrangThai: Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, a.theoTrangThai[t] + b.theoTrangThai[t]])) as Record<TrangThaiGpmb, number>,
    canhBaoCao: a.canhBaoCao + b.canhBaoCao, canhBaoTheoDoi: a.canhBaoTheoDoi + b.canhBaoTheoDoi,
  };
}

/** Chỉ giữ các đợt chi trả đến hết ngày báo cáo. */
const hoDenNgay = (h: Ho, denNgay: string): Ho => (h.chiTra ? { ...h, chiTra: { ...h.chiTra, dot: h.chiTra.dot.filter((d) => d.ngay <= denNgay) } } : h);

export function dongDuAn(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], denNgay: string, lich?: LichLamViec, tyLeCham: GiaiDoanTyLe[] = []): DongBaoCao {
  const tk = thongKe(duAn, ds, denNgay);
  const cb = canhBaoDuAn(duAn, ds, denNgay, lich, tyLeCham);
  const s = rong();
  s.soDuAn = 1;
  s.soHo = ds.length;
  s.theoTrangThai = tk.theoTrangThai;
  for (const { h, k } of ds) {
    s.dtThuHoi = s.dtThuHoi.plus(h.thua.reduce((x, t) => x.plus(soD(t.dienTichThuHoi)), D(0)));
    s.tamTinh = s.tamTinh.plus(k.tong.tongLamTron);
    const ct = tinhChiTra(hoDenNgay(h, denNgay), duAn.phuongAn ?? [], tyLeCham, denNgay);
    s.daChi = s.daChi.plus(ct.daChi);
    if (ct.phaiTra) {
      s.soHoDaDuyet++;
      s.daDuyet = s.daDuyet.plus(ct.phaiTra);
      if (ct.conLai!.gt(0)) s.conPhaiChi = s.conPhaiChi.plus(ct.conLai!);
      if (ct.trangThai === "DA_CHI_DU" || ct.trangThai === "CHI_VUOT") s.soHoDaChiDu++;
      if (ct.chamTra.length && h.chiTra?.nguyenNhanCham !== "DO_NGUOI_DAN") {
        if (ct.tienChamTra) s.chamTra = s.chamTra.plus(ct.tienChamTra);
        else s.soHoChamTraThieuTyLe++;
      }
    }
  }
  s.canhBaoCao = cb.filter((c) => c.muc === "CAO").length;
  s.canhBaoTheoDoi = cb.length - s.canhBaoCao;
  const hoanThanh = s.theoTrangThai.HOAN_THANH;
  const tinhTrang: TinhTrangDuAn = !ds.length ? "CHUA_CO_HO_SO" : hoanThanh === ds.length ? "HOAN_THANH" : s.theoTrangThai.VUONG_MAC > 0 || s.canhBaoCao > 0 ? "CO_VUONG_MAC" : "DANG_THUC_HIEN";
  const changDaQua = [...tk.chang].reverse().find((c) => c.soHo > 0);
  return {
    ...s,
    duAn,
    tinhTrang,
    tyLeHoanThanh: ds.length ? hoanThanh / ds.length : 0,
    tienDoChung: tk.tienDoChung,
    changHienTai: changDaQua ? `${changDaQua.ten} (${changDaQua.soHo}/${ds.length} hộ)` : "Chưa bắt đầu",
    vuongMac: cb.filter((c) => c.muc === "CAO"),
  };
}

/** Tách số liệu dự án theo đợt thu hồi (đợt theo số thứ tự; hộ chưa xếp đợt ở cuối, chỉ khi có). */
export function dongTheoDot(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], denNgay: string, lich?: LichLamViec, tyLeCham: GiaiDoanTyLe[] = []): DongDot[] | undefined {
  if (!coDot(duAn)) return undefined;
  const nhom = [...dsDot(duAn).map((d) => ({ id: d.id, ten: tenDot(d), dot: d })), { id: CHUA_XEP_DOT, ten: "Chưa xếp đợt", dot: undefined }];
  const idDot = new Set(dsDot(duAn).map((d) => d.id));
  return nhom.flatMap(({ id, ten, dot }) => {
    const con = ds.filter(({ h }) => (h.dotId && idDot.has(h.dotId) ? h.dotId : CHUA_XEP_DOT) === id);
    if (id === CHUA_XEP_DOT && !con.length) return [];
    const d = dongDuAn(duAnTheoDot(duAn, dot), con, denNgay, lich, tyLeCham);
    const { duAn: _d, tinhTrang: _t, tienDoChung: _c, vuongMac: _v, theoDot: _x, ...so } = d;
    return [{ ...so, soDuAn: 0, dotId: id, ten }];
  });
}

export function lapBaoCao(
  dsDuAn: DuAn[],
  duLieu: (d: DuAn) => { h: Ho; k: KetQuaHo }[],
  loc: LocBaoCao,
  lich?: LichLamViec,
  tyLeCham: GiaiDoanTyLe[] = [],
): BaoCao {
  const dong = dsDuAn
    .filter((d) => !loc.xa || d.xa === loc.xa)
    .map((d) => {
      const ds = duLieu(d);
      const dong = dongDuAn(d, ds, loc.denNgay, lich, tyLeCham);
      const theoDot = dongTheoDot(d, ds, loc.denNgay, lich, tyLeCham);
      return theoDot ? { ...dong, theoDot } : dong;
    })
    .filter((x) => !loc.tinhTrang || x.tinhTrang === loc.tinhTrang)
    .sort((a, b) => a.duAn.xa.localeCompare(b.duAn.xa, "vi") || a.duAn.ten.localeCompare(b.duAn.ten, "vi"));
  const nhomXa = new Map<string, DongBaoCao[]>();
  for (const x of dong) nhomXa.set(x.duAn.xa, [...(nhomXa.get(x.duAn.xa) ?? []), x]);
  const theoXa = [...nhomXa].map(([xa, ds]) => ({ xa, dong: ds, tong: ds.reduce<SoLieu>((s, x) => cong(s, x), rong()) }));
  return { loc, dong, theoXa, tong: dong.reduce<SoLieu>((s, x) => cong(s, x), rong()) };
}
