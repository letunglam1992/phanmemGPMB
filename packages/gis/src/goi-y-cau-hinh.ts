/**
 * Thống kê lớp và gợi ý cấu hình lớp cho tệp bản đồ lạ (vd. bản đồ lập bằng gCadas trên MicroStation V8i).
 * Gợi ý chỉ dựa trên cấu trúc dữ liệu thấy được trong tệp; cán bộ xem lại trước khi dùng.
 */
import type { KetQuaDocDgn, PhanTuChu } from "./dgn.js";
import { CAU_HINH_MAC_DINH, giaiMaNhan, type CauHinhLop, type CauHinhNut, type TruongNut } from "./thua.js";

export interface ThongKeLop {
  lop: number;
  /** Đường, đường gấp, chuỗi phức, cung */
  soDuong: number;
  /** Vùng, vùng phức, elip */
  soVung: number;
  soChu: number;
  /** Số nút chữ (text node) có dòng đầu nằm trên lớp */
  soNut: number;
  /** Vài dòng chữ mẫu (khác nhau) */
  mau: string[];
}

export function thongKeLop(ban: KetQuaDocDgn): ThongKeLop[] {
  const m = new Map<number, ThongKeLop & { daCo: Set<string>; nut: Set<number> }>();
  const lay = (lop: number) => {
    let x = m.get(lop);
    if (!x) m.set(lop, (x = { lop, soDuong: 0, soVung: 0, soChu: 0, soNut: 0, mau: [], daCo: new Set(), nut: new Set() }));
    return x;
  };
  for (const pt of ban.phanTu) {
    if (pt.loai === "DUONG" || pt.loai === "DUONG_GAP" || pt.loai === "CHUOI_PHUC" || pt.loai === "CUNG") lay(pt.lop).soDuong++;
    else if (pt.loai === "VUNG" || pt.loai === "VUNG_PHUC" || pt.loai === "ELIP") lay(pt.lop).soVung++;
    else if (pt.loai === "CHU") {
      const x = lay(pt.lop);
      x.soChu++;
      if (pt.nut !== undefined) x.nut.add(pt.nut);
      const c = giaiMaNhan(pt);
      if (c && x.mau.length < 6 && !x.daCo.has(c)) {
        x.daCo.add(c);
        x.mau.push(c);
      }
    }
  }
  return [...m.values()]
    .map(({ daCo: _d, nut, ...x }) => ({ ...x, soNut: nut.size }))
    .sort((a, b) => a.lop - b.lop);
}

const RE_SO = /^\d+$/;
const RE_MA_LOAI = /^[A-ZĐ]{2,4}(\+[A-ZĐ]{2,4})*$/;
const RE_NHIEU_TU = /^\p{L}+(\s+\p{L}+)+$/u;

/** Nút chữ theo lớp của dòng đầu: lop -> danh sách nút, mỗi nút là các dòng theo thứ tự trong tệp. */
function nutTheoLop(ban: KetQuaDocDgn): Map<number, string[][]> {
  const nut = new Map<number, { lop: number; dong: string[] }>();
  for (const pt of ban.phanTu) {
    if (pt.loai !== "CHU" || (pt as PhanTuChu).nut === undefined) continue;
    const k = (pt as PhanTuChu).nut!;
    const x = nut.get(k) ?? { lop: pt.lop, dong: [] };
    x.dong.push(giaiMaNhan(pt as PhanTuChu));
    nut.set(k, x);
  }
  const out = new Map<number, string[][]>();
  for (const { lop, dong } of nut.values()) out.set(lop, [...(out.get(lop) ?? []), dong]);
  return out;
}

/** Nhận dạng nút thuộc tính thửa: các dòng cùng vị trí có kiểu giá trị ổn định (số, mã loại đất, họ tên). */
export function nhanDangNutThuocTinh(ban: KetQuaDocDgn): (CauHinhNut & { soNut: number }) | null {
  let tot: (CauHinhNut & { soNut: number }) | null = null;
  for (const [lop, ds] of nutTheoLop(ban)) {
    const nut = ds.filter((d) => d.length >= 3);
    if (nut.length < 5) continue;
    const soDong = Math.max(...nut.map((d) => d.length));
    const cot = Array.from({ length: soDong }, (_, i) => {
      const v = nut.map((d) => d[i] ?? "").filter(Boolean);
      const ty = (re: RegExp) => (v.length ? v.filter((x) => re.test(x)).length / nut.length : 0);
      return { i, so: ty(RE_SO), loai: ty(RE_MA_LOAI), ten: ty(RE_NHIEU_TU), khac: v.length ? new Set(v).size / v.length : 0 };
    });
    const dong: Partial<Record<TruongNut, number>> = {};
    const cotSo = cot.filter((c) => c.so >= 0.8).sort((a, b) => b.khac - a.khac);
    if (!cotSo.length) continue;
    dong.soThua = cotSo[0]!.i;
    const to = cotSo.slice(1).sort((a, b) => a.khac - b.khac)[0];
    if (to && to.khac < cotSo[0]!.khac) dong.soTo = to.i;
    const loai = cot.filter((c) => c.loai >= 0.8 && c.i !== dong.soThua && c.i !== dong.soTo).sort((a, b) => b.loai - a.loai)[0];
    if (loai) dong.loaiDat = loai.i;
    const ten = cot.filter((c) => c.ten >= 0.6 && ![dong.soThua, dong.soTo, dong.loaiDat].includes(c.i)).sort((a, b) => b.khac - a.khac)[0];
    if (ten) dong.chuSuDung = ten.i;
    if (dong.soTo === undefined && dong.chuSuDung === undefined) continue;
    if (!tot || nut.length > tot.soNut) tot = { lop: [lop], dong, soNut: nut.length };
  }
  return tot;
}

export interface GoiYCauHinh {
  cauHinh: CauHinhLop;
  ghiChu: string[];
}

/** Gợi ý cấu hình: giữ cấu hình gốc, bổ sung nút thuộc tính nếu nhận dạng được; ghi chú lớp mặc định trống. */
export function goiYCauHinh(ban: KetQuaDocDgn, goc: CauHinhLop = CAU_HINH_MAC_DINH): GoiYCauHinh {
  const ghiChu: string[] = [];
  const cauHinh: CauHinhLop = { ...goc };
  const tk = new Map(thongKeLop(ban).map((x) => [x.lop, x]));
  const co = (ds: number[], f: (x: ThongKeLop) => number) => ds.some((l) => (tk.get(l) ? f(tk.get(l)!) : 0) > 0);

  if (!goc.nutThuocTinh) {
    const nut = nhanDangNutThuocTinh(ban);
    if (nut) {
      cauHinh.nutThuocTinh = { lop: nut.lop, dong: nut.dong };
      const ten: Record<TruongNut, string> = { soTo: "số tờ", soThua: "số thửa", loaiDat: "loại đất", chuSuDung: "chủ sử dụng" };
      const mo = (Object.keys(nut.dong) as TruongNut[])
        .sort((a, b) => nut.dong[a]! - nut.dong[b]!)
        .map((k) => `dòng ${nut.dong[k]! + 1} = ${ten[k]}`)
        .join(", ");
      ghiChu.push(`Nhận dạng ${nut.soNut} nút chữ thuộc tính thửa trên lớp ${nut.lop[0]} (${mo}) — kiểu bản đồ lập bằng gCadas.`);
      // Lớp nhãn chủ sử dụng đứng riêng: đối chiếu chéo với tên chủ trong nút (để phát hiện mâu thuẫn giữa hai nguồn)
      const lopChu = lopChuDoiChieu(ban, nut);
      if (lopChu && !co(goc.chuSuDung, (x) => x.soChu)) {
        cauHinh.chuSuDung = [lopChu.lop];
        ghiChu.push(
          `Lớp ${lopChu.lop} là nhãn chủ sử dụng đứng riêng (${Math.round(lopChu.tyLeKhop * 100)}% tên trùng với tên trong nút) — dùng để đối chiếu; thửa có tên khác nhau giữa hai nguồn sẽ bị gắn cờ "Nhiều chủ".`,
        );
      }
    }
  }
  if (!co(cauHinh.ranhThua, (x) => x.soDuong + x.soVung)) ghiChu.push(`Lớp ranh thửa (${cauHinh.ranhThua.join(", ")}) không có đường nào.`);
  if (!co(cauHinh.ranhGpmb, (x) => x.soDuong + x.soVung)) ghiChu.push(`Lớp ranh GPMB (${cauHinh.ranhGpmb.join(", ")}) không có đường nào — chọn lớp ranh GPMB trong cấu hình lớp.`);
  return { cauHinh, ghiChu };
}

const chuanTen = (x: string) => x.toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();

/** Lớp chữ đứng riêng (không thuộc nút) mà phần lớn giá trị trùng tên chủ trong nút thuộc tính. */
function lopChuDoiChieu(ban: KetQuaDocDgn, nut: CauHinhNut & { soNut: number }): { lop: number; tyLeKhop: number } | null {
  const iChu = nut.dong.chuSuDung;
  if (iChu === undefined) return null;
  const tenNut = new Set<string>();
  for (const ds of nutTheoLop(ban).get(nut.lop[0]!) ?? []) if (ds[iChu]) tenNut.add(chuanTen(ds[iChu]!));
  const theoLop = new Map<number, string[]>();
  for (const pt of ban.phanTu)
    if (pt.loai === "CHU" && pt.nut === undefined && !nut.lop.includes(pt.lop)) theoLop.set(pt.lop, [...(theoLop.get(pt.lop) ?? []), giaiMaNhan(pt)]);
  let tot: { lop: number; tyLeKhop: number } | null = null;
  for (const [lop, ds] of theoLop) {
    if (ds.length < nut.soNut * 0.5 || ds.length > nut.soNut * 1.5) continue;
    const tyLeKhop = ds.filter((x) => tenNut.has(chuanTen(x))).length / ds.length;
    if (tyLeKhop >= 0.5 && (!tot || tyLeKhop > tot.tyLeKhop)) tot = { lop, tyLeKhop };
  }
  return tot;
}
