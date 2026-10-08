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
