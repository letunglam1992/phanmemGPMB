/**
 * Đối chiếu diện tích ba nguồn (docs/17 §11.3): bản đồ (DT thu hồi đo trên bản đồ) ↔ hồ sơ (DT thu hồi nhập theo trích đo)
 * ↔ phương án (DT thu hồi trong bản phương án đã chốt/phê duyệt gần nhất); kèm DT thửa ↔ DT trên GCN.
 * Ngưỡng lệch do ĐƠN VỊ tự đặt kèm căn cứ (Cài đặt chung) — phần mềm không đặt sẵn; chưa đặt thì liệt kê mọi chênh lệch.
 * Chỉ để nhắc kiểm tra, không kết luận số liệu nào đúng.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import { laSoMay } from "./so";

export const KHOA_NGUONG_LECH = "nguongLechDt";

export interface NguongLechDt {
  /** Chênh lệch tuyệt đối tối đa (m², chuẩn máy); trống = không xét. */
  m2: string;
  /** Chênh lệch tương đối tối đa (%, chuẩn máy); trống = không xét. */
  phanTram: string;
  /** Căn cứ / quy định nội bộ của đơn vị (bắt buộc khi đặt ngưỡng). */
  canCu: string;
  nguoi?: string;
  luc?: string;
}

export const loiNguong = (n: NguongLechDt): string | null => {
  const co = (v: string) => v.trim() !== "";
  if (!co(n.m2) && !co(n.phanTram)) return null;
  if ((co(n.m2) && !laSoMay(n.m2)) || (co(n.phanTram) && !laSoMay(n.phanTram))) return "Ngưỡng phải là số (vd. 0.5 hoặc 1.5)";
  if ((co(n.m2) && D(n.m2).lt(0)) || (co(n.phanTram) && D(n.phanTram).lt(0))) return "Ngưỡng không được âm";
  if (!n.canCu.trim()) return "Ghi căn cứ đặt ngưỡng (quy định, văn bản của đơn vị)";
  return null;
};

export type CapDoiChieu = "BAN_DO_HO_SO" | "HO_SO_PHUONG_AN" | "THUA_GCN";
export const TEN_CAP: Record<CapDoiChieu, [string, string]> = {
  BAN_DO_HO_SO: ["DT thu hồi trên bản đồ", "DT thu hồi trong hồ sơ"],
  HO_SO_PHUONG_AN: ["DT thu hồi trong hồ sơ", "DT thu hồi trong phương án"],
  THUA_GCN: ["DT thửa trong hồ sơ", "DT trên GCN"],
};

export interface DongDoiChieu {
  hoId: string;
  ma: string;
  ten: string;
  thua: string;
  cap: CapDoiChieu;
  a: string;
  b: string;
  chenh: string;
  /** % so với giá trị b (nguồn đối chiếu); null nếu b = 0 */
  tyLe: string | null;
  vuot: boolean;
  /** Ghi chú nguồn b (vd. "bản 2 – đã phê duyệt") */
  nguonB?: string;
}

const so = (v: string | undefined | null): Decimal | null => (v && laSoMay(v) ? D(v) : null);

function vuotNguong(chenh: Decimal, tyLe: Decimal | null, n: NguongLechDt | null): boolean {
  if (chenh.isZero()) return false;
  const m2 = n?.m2.trim() ? D(n.m2) : null, pt = n?.phanTram.trim() ? D(n.phanTram) : null;
  if (!m2 && !pt) return true; // chưa đặt ngưỡng: mọi chênh lệch đều liệt kê
  return (!!m2 && chenh.abs().gt(m2)) || (!!pt && !!tyLe && tyLe.abs().gt(pt));
}

export function doiChieuDienTich(duAn: DuAn, hos: Ho[], nguong: NguongLechDt | null): DongDoiChieu[] {
  // DT thu hồi từng thửa trong bản phương án gần nhất (chưa hủy) có chứa hộ
  const paMoi = [...(duAn.phuongAn ?? [])].filter((p) => p.trangThai !== "DA_HUY").sort((a, b) => b.so - a.so);
  const out: DongDoiChieu[] = [];
  for (const h of hos) {
    const trongPa = paMoi.map((p) => ({ p, x: p.ho.find((y) => y.hoId === h.id) })).find((y) => y.x);
    for (const t of h.thua) {
      const ten = `Thửa ${t.soThua} tờ ${t.soTo}`;
      const them = (cap: CapDoiChieu, a: Decimal | null, b: Decimal | null, nguonB?: string) => {
        if (!a || !b) return;
        const chenh = a.minus(b);
        const tyLe = b.isZero() ? null : chenh.div(b).mul(100);
        out.push({ hoId: h.id, ma: h.ma, ten: h.ten, thua: ten, cap, a: a.toString(), b: b.toString(), chenh: chenh.toString(), tyLe: tyLe ? tyLe.toDecimalPlaces(2).toString() : null, vuot: vuotNguong(chenh, tyLe, nguong), nguonB });
      };
      if (t.dienTichBanDo !== undefined) them("BAN_DO_HO_SO", D(t.dienTichBanDo).toDecimalPlaces(2), so(t.dienTichThuHoi));
      if (trongPa) {
        const tPa = trongPa.x!.duLieu.thua.find((y) => y.id === t.id);
        if (tPa) them("HO_SO_PHUONG_AN", so(t.dienTichThuHoi), so(tPa.dienTichThuHoi), `bản ${trongPa.p.so} – ${trongPa.p.trangThai === "DA_PHE_DUYET" ? "đã phê duyệt" : "đã chốt"}`);
      }
      if (t.gcn?.dienTich) them("THUA_GCN", so(t.dienTich), so(t.gcn.dienTich));
    }
  }
  return out;
}
