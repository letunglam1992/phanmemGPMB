/**
 * Dự báo tiến độ (docs/17 §11.2): từ ngày hoàn thành thực tế các bước và thời gian của các bước còn lại, tính ngày dự kiến
 * mỗi hộ chi trả xong (đủ điều kiện bàn giao mặt bằng) và cả dự án; nêu các hộ kéo lùi so với kế hoạch (đường găng).
 * Thời gian mỗi bước: thời hạn luật định (có căn cứ) nếu có; không có thì dùng thời gian dự kiến ĐƠN VỊ nhập (Lập kế hoạch).
 * Thiếu cả hai → không dự báo, nêu bước thiếu — phần mềm không tự đặt thời gian.
 * Đây là ước tính giả định mỗi bước dùng hết thời hạn; không phải cam kết tiến độ.
 */
import { CAC_BUOC, daQuaBuoc, hoHieuLuc, type DuAn, type Ho } from "./mo-hinh";
import { hanChot, laNgayLamViec, type LichLamViec } from "./lich-lam-viec";

export interface ThoiGianBuoc {
  soNgay: number;
  loai: "N" | "NLV";
  canCu: string;
  /** "LUAT": thời hạn luật định; "DON_VI": thời gian dự kiến đơn vị nhập */
  nguon: "LUAT" | "DON_VI";
}

/** Thời hạn luật định dùng cho dự báo (đồng bộ han-buoc.ts, docs/05). */
export const THOI_HAN_LUAT: Record<string, Omit<ThoiGianBuoc, "nguon">> = {
  "6": { soNgay: 30, loai: "N", canCu: "điểm a khoản 3 Điều 87 Luật Đất đai 2024 (niêm yết công khai 30 ngày)" },
  "8": { soNgay: 30, loai: "NLV", canCu: "khoản 3 Điều 3 NĐ 88/2024/NĐ-CP" },
  "9": { soNgay: 5, loai: "NLV", canCu: "điểm c khoản 3 Điều 87 Luật Đất đai 2024" },
  "11": { soNgay: 3, loai: "NLV", canCu: "điểm b khoản 4 Điều 87 Luật Đất đai 2024" },
  "12": { soNgay: 30, loai: "N", canCu: "khoản 3 Điều 94 Luật Đất đai 2024 (chi trả trong 30 ngày từ khi phê duyệt phương án)" },
  "13": { soNgay: 10, loai: "N", canCu: "khoản 5, 6 Điều 87 Luật Đất đai 2024" },
};

/** Bước đích: chi trả xong — đủ điều kiện bàn giao mặt bằng. */
export const BUOC_DICH = "12";

export function thoiGianBuoc(duAn: DuAn, ma: string): ThoiGianBuoc | null {
  const l = THOI_HAN_LUAT[ma];
  if (l) return { ...l, nguon: "LUAT" };
  const d = duAn.duKienBuoc?.[ma];
  return d && d.soNgay > 0 ? { soNgay: d.soNgay, loai: d.loai, canCu: "Thời gian dự kiến do đơn vị nhập", nguon: "DON_VI" } : null;
}

export interface DuBaoHo {
  hoId: string;
  ma: string;
  ten: string;
  /** ngày dự kiến chi trả xong; null = không dự báo được / đã xong */
  ngay: string | null;
  daXong: boolean;
  thieu?: { buoc: string; ten: string };
  /** chậm hơn kế hoạch của dự án cho bước đích (số ngày) */
  treSoVoiKeHoach: number | null;
  buocHienTai: string | null;
  /** có bước đã quá thời hạn (luật định / dự kiến) mà chưa xong */
  quaHan?: boolean;
}

const cong = (moc: string, t: ThoiGianBuoc, lich: LichLamViec) => {
  let d = hanChot(moc, t.soNgay, t.loai, lich);
  // hạn theo "ngày" rơi vào ngày nghỉ → ngày làm việc tiếp theo (khoản 5 Điều 148 Bộ luật Dân sự 2015)
  if (t.loai === "N") while (!laNgayLamViec(d, lich)) d = hanChot(d, 1, "N", lich);
  return d;
};
const soNgay = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function duBaoHo(duAn: DuAn, h0: Ho, homNay: string, lich: LichLamViec): DuBaoHo {
  const h = hoHieuLuc(duAn, h0);
  const co = { hoId: h0.id, ma: h0.ma, ten: h0.ten };
  const iDich = CAC_BUOC.findIndex((b) => b.ma === BUOC_DICH);
  if (h0.banGiao?.ngay || daQuaBuoc(h.tienDo[BUOC_DICH]?.trangThai)) return { ...co, ngay: null, daXong: true, treSoVoiKeHoach: null, buocHienTai: null };
  // mốc: ngày hoàn thành gần nhất của các bước đã xong trước bước đang làm; không có → hôm nay
  let mocMax = "";
  let iDau = 0;
  for (let i = 0; i <= iDich; i++) {
    const b = h.tienDo[CAC_BUOC[i]!.ma];
    if (!daQuaBuoc(b?.trangThai)) {
      iDau = i;
      break;
    }
    if (b?.ngay && b.ngay > mocMax) mocMax = b.ngay;
    iDau = i + 1;
  }
  let ngay = mocMax && mocMax < homNay ? mocMax : homNay;
  let quaHan = false;
  for (let i = iDau; i <= iDich; i++) {
    const b = CAC_BUOC[i]!;
    const tt = h.tienDo[b.ma]?.trangThai;
    if (daQuaBuoc(tt) || b.tuyChon) continue;
    const t = thoiGianBuoc(duAn, b.ma);
    if (!t) return { ...co, ngay: null, daXong: false, thieu: { buoc: b.ma, ten: b.ten }, treSoVoiKeHoach: null, buocHienTai: CAC_BUOC[iDau]?.ma ?? null };
    ngay = cong(ngay, t, lich);
    if (ngay < homNay) (ngay = homNay), (quaHan = true); // bước đã quá thời hạn mà chưa xong: sớm nhất là hôm nay
  }
  const kh = duAn.keHoach?.[BUOC_DICH];
  return { ...co, ngay, daXong: false, treSoVoiKeHoach: kh ? soNgay(kh, ngay) : null, buocHienTai: CAC_BUOC[iDau]?.ma ?? null, quaHan };
}

export interface DuBaoDuAn {
  ds: DuBaoHo[];
  /** ngày dự kiến toàn bộ hộ chi trả xong (hộ chậm nhất); null nếu còn hộ không dự báo được */
  ngayDuAn: string | null;
  soKhongDuBao: number;
  /** các bước thiếu thời gian (để đơn vị nhập dự kiến) */
  buocThieu: string[];
  keHoach: string | null;
  /** hộ kéo lùi: dự kiến muộn hơn kế hoạch, xếp muộn nhất trước */
  keoLui: DuBaoHo[];
}

export function duBaoDuAn(duAn: DuAn, hos: Ho[], homNay: string, lich: LichLamViec): DuBaoDuAn {
  const ds = hos.filter((h) => !h.daXoa).map((h) => duBaoHo(duAn, h, homNay, lich));
  const chua = ds.filter((x) => !x.daXong);
  const khong = chua.filter((x) => !x.ngay);
  const ngayDuAn = !chua.length ? null : khong.length ? null : chua.reduce((m, x) => (x.ngay! > m ? x.ngay! : m), "");
  const kh = duAn.keHoach?.[BUOC_DICH] ?? null;
  const keoLui = chua.filter((x) => x.ngay && kh && x.ngay > kh).sort((a, b) => b.ngay!.localeCompare(a.ngay!));
  return { ds, ngayDuAn, soKhongDuBao: khong.length, buocThieu: [...new Set(khong.map((x) => x.thieu!.buoc))], keHoach: kh, keoLui };
}
