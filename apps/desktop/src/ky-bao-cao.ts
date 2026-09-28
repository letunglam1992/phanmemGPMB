/**
 * Chốt số liệu kỳ báo cáo: lưu ảnh chụp số liệu tổng hợp của TẤT CẢ dự án tại một ngày (không theo bộ lọc),
 * kèm người chốt, thời điểm, mã băm SHA-256 — để theo dõi diễn biến giữa các kỳ và so sánh với kỳ trước.
 * Số liệu kỳ đã chốt không tính lại khi hồ sơ thay đổi sau đó.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { type BaoCao, type DongBaoCao, type LocBaoCao, type TinhTrangDuAn } from "./bao-cao";
import { sha256 } from "./phuong-an";

export const KHOA_KY_BAO_CAO = "kyBaoCao";

/** Số liệu một dự án tại kỳ (tiền, diện tích lưu dạng chuỗi thập phân). */
export interface DongKy {
  duAnId: string;
  ten: string;
  xa: string;
  tinhTrang: TinhTrangDuAn;
  soHo: number;
  hoanThanh: number;
  vuongMac: number;
  dtThuHoi: string;
  tamTinh: string;
  soHoDaDuyet: number;
  daDuyet: string;
  daChi: string;
  conPhaiChi: string;
  canhBaoCao: number;
}

export interface KyBaoCao {
  id: string;
  ten: string;
  /** Ngày số liệu (ISO) */
  denNgay: string;
  chotLuc: string;
  nguoi: string;
  dong: DongKy[];
  bam: string;
}

/** Tổng của một kỳ sau khi lọc (xã, tình trạng) — cùng cách lọc với báo cáo hiện tại. */
export interface TongKy {
  ky: KyBaoCao;
  soDuAn: number;
  soHo: number;
  hoanThanh: number;
  vuongMac: number;
  dtThuHoi: Decimal;
  tamTinh: Decimal;
  soHoDaDuyet: number;
  daDuyet: Decimal;
  daChi: Decimal;
  conPhaiChi: Decimal;
  canhBaoCao: number;
}

const dongTuBaoCao = (x: DongBaoCao): DongKy => ({
  duAnId: x.duAn.id,
  ten: x.duAn.ten,
  xa: x.duAn.xa,
  tinhTrang: x.tinhTrang,
  soHo: x.soHo,
  hoanThanh: x.theoTrangThai.HOAN_THANH,
  vuongMac: x.theoTrangThai.VUONG_MAC,
  dtThuHoi: x.dtThuHoi.toString(),
  tamTinh: x.tamTinh.toString(),
  soHoDaDuyet: x.soHoDaDuyet,
  daDuyet: x.daDuyet.toString(),
  daChi: x.daChi.toString(),
  conPhaiChi: x.conPhaiChi.toString(),
  canhBaoCao: x.canhBaoCao,
});

const noiDungBam = (k: Omit<KyBaoCao, "bam">) => JSON.stringify([k.id, k.ten, k.denNgay, k.chotLuc, k.nguoi, k.dong]);

/** Chốt kỳ từ báo cáo KHÔNG lọc (mọi dự án) tại ngày `bcToanBo.loc.denNgay`. */
export async function chotKy(bcToanBo: BaoCao, ten: string, nguoi: string, luc = new Date().toISOString()): Promise<KyBaoCao> {
  if (bcToanBo.loc.xa || bcToanBo.loc.tinhTrang) throw new Error("Chốt kỳ phải lấy số liệu của tất cả dự án (không lọc)");
  const k = { id: `ky-${bcToanBo.loc.denNgay}-${luc}`, ten: ten.trim(), denNgay: bcToanBo.loc.denNgay, chotLuc: luc, nguoi, dong: bcToanBo.dong.map(dongTuBaoCao) };
  return { ...k, bam: await sha256(noiDungBam(k)) };
}

export async function kiemTraKy(k: KyBaoCao): Promise<boolean> {
  const { bam, ...con } = k;
  return (await sha256(noiDungBam(con))) === bam;
}

export function tongKy(k: KyBaoCao, loc: Pick<LocBaoCao, "xa" | "tinhTrang">): TongKy {
  const ds = k.dong.filter((x) => (!loc.xa || x.xa === loc.xa) && (!loc.tinhTrang || x.tinhTrang === loc.tinhTrang));
  const cong = (f: (x: DongKy) => string) => ds.reduce((s, x) => s.plus(f(x)), D(0));
  const dem = (f: (x: DongKy) => number) => ds.reduce((s, x) => s + f(x), 0);
  return {
    ky: k,
    soDuAn: ds.length,
    soHo: dem((x) => x.soHo),
    hoanThanh: dem((x) => x.hoanThanh),
    vuongMac: dem((x) => x.vuongMac),
    dtThuHoi: cong((x) => x.dtThuHoi),
    tamTinh: cong((x) => x.tamTinh),
    soHoDaDuyet: dem((x) => x.soHoDaDuyet),
    daDuyet: cong((x) => x.daDuyet),
    daChi: cong((x) => x.daChi),
    conPhaiChi: cong((x) => x.conPhaiChi),
    canhBaoCao: dem((x) => x.canhBaoCao),
  };
}

/** Các kỳ theo thứ tự ngày số liệu (cũ → mới). */
export const sapXepKy = (ds: KyBaoCao[]) => [...ds].sort((a, b) => a.denNgay.localeCompare(b.denNgay) || a.chotLuc.localeCompare(b.chotLuc));

/** Kỳ gần nhất có ngày số liệu TRƯỚC ngày báo cáo hiện tại. */
export const kyTruoc = (ds: KyBaoCao[], denNgay: string) => sapXepKy(ds).filter((k) => k.denNgay < denNgay).at(-1) ?? null;

export interface SoSanhKy {
  truoc: TongKy;
  hoanThanh: number;
  soHoDaDuyet: number;
  daDuyet: Decimal;
  daChi: Decimal;
  vuongMac: number;
  canhBaoCao: number;
  /** Dự án mới so với kỳ trước (theo bộ lọc) */
  duAnMoi: string[];
}

/** So với kỳ trước: chênh lệch (hiện tại − kỳ trước) theo cùng bộ lọc. */
export function soSanhKyTruoc(bc: BaoCao, truocKy: KyBaoCao): SoSanhKy {
  const t = tongKy(truocKy, bc.loc);
  const s = bc.tong;
  const coTruoc = new Set(truocKy.dong.map((x) => x.duAnId));
  return {
    truoc: t,
    hoanThanh: s.theoTrangThai.HOAN_THANH - t.hoanThanh,
    soHoDaDuyet: s.soHoDaDuyet - t.soHoDaDuyet,
    daDuyet: s.daDuyet.minus(t.daDuyet),
    daChi: s.daChi.minus(t.daChi),
    vuongMac: s.theoTrangThai.VUONG_MAC - t.vuongMac,
    canhBaoCao: s.canhBaoCao - t.canhBaoCao,
    duAnMoi: bc.dong.filter((x) => !coTruoc.has(x.duAn.id)).map((x) => x.duAn.ten),
  };
}
