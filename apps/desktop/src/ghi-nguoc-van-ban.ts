/**
 * 1.0.21 (A3, B1) — Khi tạo văn bản của hộ có số (Văn bản → "Soạn, cấp số"), ghi ngược số, ngày vào đơn khiếu nại / hồ sơ
 * cưỡng chế để phần mềm tính hạn, khỏi nhập lại. Chỉ điền ô còn trống — không ghi đè số liệu cán bộ đã nhập.
 * Đơn được chọn giống khi tự điền mẫu (van-ban/thuc-te.ts): T14 đơn lần đầu, T18–T22 đơn khiếu nại chưa có kết quả mới nhất.
 */
import type { DonKhieuNai } from "./khieu-nai";
import type { CuongChe } from "./cuong-che";
import type { Ho } from "./mo-hinh";

const moiNhat = <T>(ds: T[], chuaXong: (x: T) => boolean): T | undefined => [...ds].reverse().find(chuaXong) ?? ds[ds.length - 1];

export function donChoMau(h: Ho, ma: string): DonKhieuNai | undefined {
  const kn = (h.khieuNai ?? []).filter((d) => d.loai === "KHIEU_NAI" && (ma !== "T14" || (d.lan ?? 1) === 1)).sort((a, b) => a.ngayNhan.localeCompare(b.ngayNhan));
  return moiNhat(kn, (d) => !d.ketQua);
}

/** Phần cập nhật của hồ sơ hộ (khieuNai / cuongChe) sau khi tạo mẫu `ma` số `so` ngày `ngay` (ISO); không có gì thì null. */
export function ghiNguocVanBan(h: Ho, ma: string, so: string, ngay: string): Partial<Ho> | null {
  if (!so.trim() || !ngay) return null;
  const doiDon = (d: DonKhieuNai | undefined, p: (d: DonKhieuNai) => Partial<DonKhieuNai> | null): Partial<Ho> | null => {
    const moi = d && p(d);
    return moi && Object.keys(moi).length ? { khieuNai: (h.khieuNai ?? []).map((x) => (x.id === d!.id ? { ...x, ...moi } : x)) } : null;
  };
  if (ma === "T14") return doiDon(donChoMau(h, ma), (d) => ({ ...(!d.soVb ? { soVb: so } : {}), ...(!d.ngayVb ? { ngayVb: ngay } : {}) }));
  if (ma === "T18") return doiDon(donChoMau(h, ma), (d) => (d.tbThuLy?.so ? null : { tbThuLy: { so, ngay }, ...(!d.ngayThuLy ? { ngayThuLy: ngay } : {}) }));
  if (ma === "T21")
    return doiDon(donChoMau(h, ma), (d) => {
      if (d.ketQua === "DINH_CHI") return d.dinhChi && !d.dinhChi.soQd ? { dinhChi: { ...d.dinhChi, soQd: so, ngay } } : null;
      const t = (d.tamDinhChi ?? []).find((x) => !x.den && !x.soQd);
      return t ? { tamDinhChi: d.tamDinhChi!.map((x) => (x.id === t.id ? { ...x, soQd: so, tu: ngay } : x)) } : null;
    });
  if (ma === "T22")
    return doiDon(donChoMau(h, ma), (d) => {
      const t = (d.tamDinhChi ?? []).find((x) => !x.den);
      return t ? { tamDinhChi: d.tamDinhChi!.map((x) => (x.id === t.id ? { ...x, den: ngay, soQdTiepTuc: so } : x)) } : null;
    });
  if (ma === "07" || ma === "22") {
    const loai: CuongChe["loai"] = ma === "07" ? "KIEM_DEM" : "THU_HOI";
    const c = [...(h.cuongChe ?? [])].reverse().find((x) => x.loai === loai && !x.soQd);
    return c ? { cuongChe: h.cuongChe!.map((x) => (x.id === c.id ? { ...x, soQd: so, ngayQd: ngay } : x)) } : null;
  }
  return null;
}
