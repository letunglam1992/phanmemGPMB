/**
 * Chuyển đổi dữ liệu số cũ và rà soát số liệu nghi vấn (P0-2; người dùng chốt: theo đề xuất docs/18 §5).
 * - Giá trị một nghĩa nhưng chưa chuẩn máy ("9222,1", "1.234,5") → tự đổi sang chuẩn máy, ghi nhật ký hồ sơ "từ … thành …".
 *   (Các giá trị này trước đây làm dừng tính toán nên không có số tiền nào đã dựa vào chúng.)
 * - Giá trị mơ hồ ("20.000"): trước đây phần mềm hiểu là 20, theo quy ước Việt Nam là 20.000 → KHÔNG tự đổi; đưa vào
 *   danh sách nghi vấn để cán bộ chọn cách hiểu (ghi nhật ký).
 * - Kiểm tra hợp lý (chỉ nhắc, không chặn): ngưỡng kỹ thuật để soát nhập liệu, KHÔNG phải quy định.
 * - Bản phương án đã chốt/phê duyệt (bản sao đóng băng, có băm) không bị sửa.
 */
import { D } from "@gpmb/core";
import type { DuAn, Ho } from "./mo-hinh";
import { docSoNhap, hienSo, laSoMay, soD, truongSoDuAn, truongSoHo, type TruongSo } from "./so";

export { PHIEN_BAN_CAU_TRUC, chuyenDoiDuAn, chuyenDoiHo, type DoiTuDong } from "./chuyen-doi";

/** "20.000", "1.500.000": đúng dạng nhóm nghìn — trước đây Decimal đọc là số thập phân (20; 1.5). */
export const laMoHo = (v: string) => /^-?\d{1,3}(\.\d{3})+$/.test(v.trim());

/** Ô khối lượng / số lượng (nhận biểu thức) — chỉ xét dạng mơ hồ của số thường. */
function truongBieuThucHo(h: Ho): TruongSo[] {
  const ds: TruongSo[] = [];
  for (const ts of h.taiSan) {
    const o = ts as unknown as Record<string, unknown>;
    for (const k of ["khoiLuong", "soLuong"])
      if (typeof o[k] === "string") ds.push({ nhan: `Tài sản "${ts.ten || "?"}" — ${k === "soLuong" ? "số lượng" : "khối lượng"}`, gt: o[k] as string, dat: (x) => (o[k] = x) });
  }
  return ds;
}

export interface MucRaSoat {
  loai: "MO_HO" | "KHONG_DOC_DUOC" | "HOP_LY";
  duAnId: string;
  hoId?: string;
  /** Mã – tên hồ sơ hoặc tên dự án */
  doiTuong: string;
  nhan: string;
  gt: string;
  noiDung: string;
  /** Mục mơ hồ: hai cách hiểu (chuẩn máy) để cán bộ chọn */
  chon?: { moi: string; cu: string };
}

const ktHopLyDuAn = (d: DuAn): Omit<MucRaSoat, "duAnId" | "doiTuong">[] => {
  const out: Omit<MucRaSoat, "duAnId" | "doiTuong">[] = [];
  const nhac = (nhan: string, gt: string, noiDung: string) => out.push({ loai: "HOP_LY", nhan, gt, noiDung });
  if (d.hanMucNN?.m2 && laSoMay(d.hanMucNN.m2) && D(d.hanMucNN.m2).lt(100)) nhac("Hạn mức giao đất NN (m²)", d.hanMucNN.m2, "Nhỏ hơn 100 m² — kiểm tra đơn vị (m², không phải ha) và cách ghi số");
  if (d.giaGao?.dongKg && laSoMay(d.giaGao.dongKg) && D(d.giaGao.dongKg).lt(1000)) nhac("Giá gạo (đ/kg)", d.giaGao.dongKg, "Nhỏ hơn 1.000 đ/kg — kiểm tra cách ghi số");
  if (d.heSoGiaDat?.heSo && laSoMay(d.heSoGiaDat.heSo) && (D(d.heSoGiaDat.heSo).lte(0) || D(d.heSoGiaDat.heSo).gt(10))) nhac("Hệ số điều chỉnh giá đất", d.heSoGiaDat.heSo, "Ngoài khoảng (0; 10] — kiểm tra");
  return out;
};

const ktHopLyHo = (h: Ho): Omit<MucRaSoat, "duAnId" | "doiTuong">[] => {
  const out: Omit<MucRaSoat, "duAnId" | "doiTuong">[] = [];
  for (const t of h.thua) {
    if (t.dienTich && t.dienTichThuHoi && laSoMay(t.dienTich) && laSoMay(t.dienTichThuHoi) && soD(t.dienTichThuHoi).gt(soD(t.dienTich)))
      out.push({ loai: "HOP_LY", nhan: `Thửa ${t.soThua}, tờ ${t.soTo} — DT thu hồi`, gt: t.dienTichThuHoi, noiDung: `Lớn hơn diện tích thửa (${hienSo(t.dienTich)} m²)` });
  }
  for (const x of truongSoHo(h)) if (laSoMay(x.gt) && D(x.gt).isNeg()) out.push({ loai: "HOP_LY", nhan: x.nhan, gt: x.gt, noiDung: "Số âm" });
  return out;
};

/** P1-1: kết quả rà soát từng hồ sơ ghi nhớ theo đối tượng hồ sơ (bất biến trong giao diện). */
const DEM_RS = new WeakMap<Ho, { duAnId: string; ds: MucRaSoat[] }>();

/** Danh sách rà soát của các dự án đang dùng (bỏ bản ghi trong thùng rác). */
export function raSoat(dsDuAn: DuAn[], hoCua: (id: string) => Ho[]): MucRaSoat[] {
  const out: MucRaSoat[] = [];
  const xet = (duAnId: string, doiTuong: string, hoId: string | undefined, ds: TruongSo[], bieuThuc: TruongSo[] = []) => {
    for (const x of [...ds, ...bieuThuc]) {
      const v = x.gt.trim();
      if (!v) continue;
      if (laMoHo(v)) {
        const moi = v.replace(/\./g, "");
        out.push({ loai: "MO_HO", duAnId, hoId, doiTuong, nhan: x.nhan, gt: v, noiDung: `Đang được tính là ${hienSo(D(v).toString())}; theo cách viết Việt Nam là ${hienSo(moi)}`, chon: { moi, cu: D(v).toString() } });
      } else if (ds.includes(x) && !laSoMay(v) && docSoNhap(v).so === null) {
        out.push({ loai: "KHONG_DOC_DUOC", duAnId, hoId, doiTuong, nhan: x.nhan, gt: v, noiDung: "Không đọc được số — mở hồ sơ, nhập lại" });
      }
    }
  };
  for (const d of dsDuAn) {
    xet(d.id, d.ten, undefined, truongSoDuAn(d));
    for (const m of ktHopLyDuAn(d)) out.push({ ...m, duAnId: d.id, doiTuong: d.ten });
    for (const h of hoCua(d.id)) {
      let c = DEM_RS.get(h);
      if (!c || c.duAnId !== d.id) {
        const truoc = out.length;
        const ten = `${h.ma} – ${h.ten}`;
        xet(d.id, ten, h.id, truongSoHo(h), truongBieuThucHo(h));
        for (const m of ktHopLyHo(h)) out.push({ ...m, duAnId: d.id, hoId: h.id, doiTuong: ten });
        DEM_RS.set(h, (c = { duAnId: d.id, ds: out.slice(truoc) }));
        continue;
      }
      out.push(...c.ds);
    }
  }
  return out;
}

/** Ghi cách hiểu cán bộ chọn cho một mục mơ hồ (trên bản sao). Trả false nếu giá trị đã đổi. */
export function apDungCachHieu(ban: Ho | DuAn, muc: MucRaSoat, giaTri: string): boolean {
  const ds = "thua" in ban ? [...truongSoHo(ban), ...truongBieuThucHo(ban)] : truongSoDuAn(ban);
  const x = ds.find((t) => t.nhan === muc.nhan && t.gt.trim() === muc.gt);
  if (!x) return false;
  x.dat(giaTri);
  return true;
}
