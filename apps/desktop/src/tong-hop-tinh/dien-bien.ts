/**
 * 1.0.5 — diễn biến toàn tỉnh theo tháng từ các bản gửi đã nhận (bản hiện tại + các bản trước của từng đơn vị): mỗi kỳ
 * (cuối tháng) lấy bản gửi gần nhất của từng đơn vị có thời điểm xuất ≤ cuối tháng; đơn vị chưa gửi trước kỳ thì không
 * tính. Phạm vi: toàn tỉnh, một xã, một dự án liên xã (mã dùng chung). Chỉ cộng số liệu đã gửi, không ước tính.
 */
import { D } from "@gpmb/core";
import type { TomTatDuAn } from "./goi-tinh";
import { chuanMa, chuanXa } from "./lien-xa";

export interface BanGui {
  maGui: string;
  luc: string;
  tomTat: TomTatDuAn[];
}
export type PhamViDienBien = { loai: "TINH" } | { loai: "XA"; xa: string } | { loai: "LIEN_XA"; ma: string };

export interface KyDienBien {
  ky: string; // yyyy-mm
  soDonVi: number;
  soHo: number;
  banGiao: number;
  duyetPA: number;
  tamTinh: number; // đồng (số để vẽ; tổng cộng bằng Decimal)
  dtThuHoi: number;
}

const thuoc = (d: TomTatDuAn, p: PhamViDienBien) =>
  p.loai === "TINH" ? true : p.loai === "XA" ? chuanXa(d.xa) === chuanXa(p.xa) : !!d.lienXa?.ma && chuanMa(d.lienXa.ma) === chuanMa(p.ma);

const cuoiThang = (ky: string) => {
  const [y, m] = ky.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1) - 1).toISOString();
};

export function dienBienTinh(ban: BanGui[], p: PhamViDienBien, denNgay = new Date().toISOString(), toiDa = 24): KyDienBien[] {
  if (!ban.length) return [];
  const dau = ban.reduce((m, b) => (b.luc < m ? b.luc : m), ban[0]!.luc).slice(0, 7);
  const cuoi = denNgay.slice(0, 7);
  const ky: string[] = [];
  for (let [y, m] = dau.split("-").map(Number) as [number, number]; `${y}-${String(m).padStart(2, "0")}` <= cuoi; m === 12 ? ((y += 1), (m = 1)) : (m += 1)) ky.push(`${y}-${String(m).padStart(2, "0")}`);
  const theoDv = new Map<string, BanGui[]>();
  for (const b of ban) theoDv.set(b.maGui, [...(theoDv.get(b.maGui) ?? []), b]);
  for (const ds of theoDv.values()) ds.sort((a, b) => a.luc.localeCompare(b.luc));
  return ky.slice(-toiDa).map((k) => {
    const het = k === cuoi ? denNgay : cuoiThang(k);
    let soDonVi = 0, soHo = 0, banGiao = 0, duyetPA = 0;
    let tamTinh = D(0), dt = D(0);
    for (const ds of theoDv.values()) {
      const b = [...ds].reverse().find((x) => x.luc <= het);
      if (!b) continue;
      const da = b.tomTat.filter((d) => thuoc(d, p));
      if (!da.length) continue;
      soDonVi++;
      for (const d of da) {
        soHo += d.soHo;
        banGiao += d.theoTrangThai.HOAN_THANH ?? 0;
        duyetPA += d.soHoDaDuyetPA;
        tamTinh = tamTinh.plus(D(d.tongTamTinh || "0"));
        dt = dt.plus(D(d.dienTichThuHoi || "0"));
      }
    }
    return { ky: k, soDonVi, soHo, banGiao, duyetPA, tamTinh: tamTinh.toNumber(), dtThuHoi: dt.toNumber() };
  });
}

/**
 * 1.2.0 (D3) — Đơn khiếu nại, kiến nghị theo tháng ở cấp tỉnh: cộng `khieuNai.theoThang` (12 tháng, đơn vị tính khi gửi) của các
 * dự án trong bản gửi hiện tại của từng đơn vị. Gói gửi trước 1.2.0 không có — không tính.
 */
export function donTinhTheoThang(tomTat: Pick<TomTatDuAn, "khieuNai">[]): import("../khieu-nai").DonThang[] {
  const m = new Map<string, import("../khieu-nai").DonThang>();
  for (const d of tomTat)
    for (const k of d.khieuNai?.theoThang ?? []) {
      const g = m.get(k.ky) ?? { ky: k.ky, moi: 0, daGiaiQuyet: 0, quaHan: 0 };
      g.moi += k.moi;
      g.daGiaiQuyet += k.daGiaiQuyet;
      g.quaHan += k.quaHan;
      m.set(k.ky, g);
    }
  return [...m.values()].sort((a, b) => a.ky.localeCompare(b.ky));
}

/** 1.3.0 (D1) — số văn bản thuộc từng nhiệm vụ phân cấp theo xã, trong kỳ [tu, den] (gói gửi từ 1.3.0). */
export function phanCapTheoXa(dong: Pick<TomTatDuAn, "xa" | "phanCap">[], tu: string, den: string): { xa: string; theoNv: Record<string, number>; tong: number }[] {
  const m = new Map<string, Record<string, number>>();
  for (const d of dong) {
    const xa = d.xa || "(Chưa ghi xã, phường)";
    const r = m.get(xa) ?? {};
    for (const x of d.phanCap ?? []) if (x.ngay >= tu && x.ngay <= den) r[x.nv] = (r[x.nv] ?? 0) + 1;
    m.set(xa, r);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi")).map(([xa, theoNv]) => ({ xa, theoNv, tong: Object.values(theoNv).reduce((s, n) => s + n, 0) }));
}

/** 1.3.0 (D2) — lịch cưỡng chế toàn tỉnh (ngày, xã, dự án, loại; gói không có tên hộ), theo thứ tự ngày. */
export function lichCuongCheTinh(dong: Pick<TomTatDuAn, "xa" | "ten" | "cuongChe">[], tuNgay = ""): { ngay: string; xa: string; duAn: string; loai: "KIEM_DEM" | "THU_HOI" }[] {
  return dong
    .flatMap((d) => (d.cuongChe?.lich ?? []).map((c) => ({ ngay: c.ngay, xa: d.xa || "(Chưa ghi xã, phường)", duAn: d.ten, loai: c.loai })))
    .filter((x) => x.ngay >= tuNgay)
    .sort((a, b) => a.ngay.localeCompare(b.ngay) || a.xa.localeCompare(b.xa, "vi"));
}

