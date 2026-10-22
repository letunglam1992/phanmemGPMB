/**
 * 1.2.0 (D2) — Diễn biến theo tháng của một dự án: cuối mỗi tháng, số hộ đã duyệt phương án (bước 9), đã chi trả (bước 12), đã có
 * QĐ thu hồi đất (bước 13), đã bàn giao mặt bằng; kèm mốc bàn giao đất trên thực địa cho chủ đầu tư. Chỉ đếm theo ngày cán bộ đã ghi
 * (bước đã xong); không ước tính. Tối đa 24 tháng gần nhất.
 */
import { daQuaBuoc, hoHieuLuc, type DuAn, type Ho } from "./mo-hinh";

export interface KyDuAn {
  /** YYYY-MM */
  ky: string;
  soHo: number;
  duyetPA: number;
  chiTra: number;
  qdThuHoi: number;
  banGiao: number;
  /** Số lần bàn giao đất trên thực địa cho chủ đầu tư trong tháng */
  giaoCdt: number;
}

const cuoiThang = (ky: string) => {
  const [y, m] = ky.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const thangSau = (ky: string) => {
  const [y, m] = ky.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

export function dienBienDuAn(duAn: DuAn, hos0: Ho[], homNay: string, toiDa = 24): KyDuAn[] {
  const hos = hos0.map((h) => hoHieuLuc(duAn, h));
  const ngayBuoc = (h: Ho, ma: string) => (daQuaBuoc(h.tienDo[ma]?.trangThai) && h.tienDo[ma]?.ngay) || null;
  const moc = hos.flatMap((h) => [ngayBuoc(h, "9"), ngayBuoc(h, "12"), ngayBuoc(h, "13"), h.banGiao?.ngay ?? null]).filter((x): x is string => !!x && x <= homNay);
  for (const b of duAn.banGiaoThucDia ?? []) if (b.ngay <= homNay) moc.push(b.ngay);
  if (!moc.length) return [];
  let ky = moc.reduce((a, b) => (b < a ? b : a)).slice(0, 7);
  const kyCuoi = homNay.slice(0, 7);
  const ds: string[] = [];
  while (ky <= kyCuoi) {
    ds.push(ky);
    ky = thangSau(ky);
  }
  const dem = (den: string, f: (h: Ho) => string | null | undefined) => hos.filter((h) => { const n = f(h); return !!n && n <= den; }).length;
  return ds.slice(-toiDa).map((k) => {
    const den = k === kyCuoi ? homNay : cuoiThang(k);
    return {
      ky: k,
      soHo: hos.length,
      duyetPA: dem(den, (h) => ngayBuoc(h, "9")),
      chiTra: dem(den, (h) => ngayBuoc(h, "12")),
      qdThuHoi: dem(den, (h) => ngayBuoc(h, "13")),
      banGiao: dem(den, (h) => h.banGiao?.ngay),
      giaoCdt: (duAn.banGiaoThucDia ?? []).filter((b) => b.ngay.slice(0, 7) === k && b.ngay <= homNay).length,
    };
  });
}
