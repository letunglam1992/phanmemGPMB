/**
 * Hình học cho trình xem bản đồ (kiểu MicroStation): chuẩn bị phần tử theo lớp, đo chiều dài / diện tích, bắt điểm,
 * tìm phần tử gần con trỏ. Tọa độ theo đơn vị chính của tệp (m, VN-2000) — không làm tròn khi đo; hiển thị 2 chữ số.
 */
import { giaiMaNhan, tenLopPl21, type Diem, type KetQuaDocDgn, type PhanTu } from "@gpmb/gis";

export interface HinhVe {
  stt: number;
  lop: number;
  loai: PhanTu["loai"];
  mau: number;
  /** Các đường cần vẽ (phần tử phức: từng thành phần). */
  duong: Diem[][];
  /** Vùng khép kín (VUNG, VUNG_PHUC, ELIP hoặc đường có điểm đầu trùng điểm cuối). */
  kin: boolean;
  hop: { minX: number; minY: number; maxX: number; maxY: number };
}
export interface ChuVe {
  stt: number;
  lop: number;
  x: number;
  y: number;
  chu: string;
  cao: number;
  xoay: number;
}
export interface LopDgn {
  lop: number;
  ten: string | null;
  soHinh: number;
  soChu: number;
}

const trung = (a: Diem, b: Diem) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

/**
 * Tách phần tử của tệp thành hình vẽ và chữ. Thành phần của chuỗi/vùng phức đã được bộ đọc gộp vào phần tử cha (không có
 * trong danh sách); thành phần còn lại là của ô (cell: ký hiệu, mốc…) và nút chữ — vẽ như phần tử thường.
 */
export function chuanBiVe(ban: KetQuaDocDgn): { hinh: HinhVe[]; chu: ChuVe[]; lop: LopDgn[] } {
  const hinh: HinhVe[] = [];
  const chu: ChuVe[] = [];
  const dem = new Map<number, LopDgn>();
  const lay = (lop: number) => {
    let x = dem.get(lop);
    if (!x) dem.set(lop, (x = { lop, ten: tenLopPl21(lop), soHinh: 0, soChu: 0 }));
    return x;
  };
  for (const e of ban.phanTu) {
    if (e.loai === "CHU") {
      const s = giaiMaNhan(e);
      if (!s) continue;
      chu.push({ stt: e.stt, lop: e.lop, x: e.goc.x, y: e.goc.y, chu: s, cao: e.chieuCao, xoay: e.gocXoay });
      lay(e.lop).soChu++;
      continue;
    }
    if (e.loai === "KHAC") continue;
    const duong =
      e.loai === "CHUOI_PHUC" || e.loai === "VUNG_PHUC"
        ? e.thanhPhan.length
          ? e.thanhPhan.map((t) => t.diem).filter((d) => d.length >= 2)
          : e.diem.length >= 2
            ? [e.diem]
            : []
        : e.diem.length >= 2
          ? [e.diem]
          : [];
    if (!duong.length) continue;
    const hop = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const d of duong)
      for (const p of d) {
        if (p.x < hop.minX) hop.minX = p.x;
        if (p.y < hop.minY) hop.minY = p.y;
        if (p.x > hop.maxX) hop.maxX = p.x;
        if (p.y > hop.maxY) hop.maxY = p.y;
      }
    const phang = duong.flat();
    const kin = e.loai === "VUNG" || e.loai === "VUNG_PHUC" || e.loai === "ELIP" || (phang.length > 3 && trung(phang[0]!, phang[phang.length - 1]!));
    hinh.push({ stt: e.stt, lop: e.lop, loai: e.loai, mau: e.mau, duong, kin, hop });
    lay(e.lop).soHinh++;
  }
  return { hinh, chu, lop: [...dem.values()].sort((a, b) => a.lop - b.lop) };
}

/** Hình vẽ từ các vòng của thửa đã dựng (để bắt điểm vào đỉnh thửa). */
export function hinhTuVong(vong: Diem[][]): HinhVe {
  const hop = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const d of vong)
    for (const p of d) {
      hop.minX = Math.min(hop.minX, p.x);
      hop.minY = Math.min(hop.minY, p.y);
      hop.maxX = Math.max(hop.maxX, p.x);
      hop.maxY = Math.max(hop.maxY, p.y);
    }
  return { stt: -1, lop: -1, loai: "VUNG", mau: 0, duong: vong, kin: true, hop };
}

/** Phạm vi toàn bộ bản vẽ, bỏ 0,5% điểm lệch ở mỗi phía (phần tử ở tọa độ cục bộ, chú thích xa khung). */
export function phamViToanBo(hinh: HinhVe[], chu: ChuVe[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const xs: number[] = [], ys: number[] = [];
  for (const h of hinh) {
    xs.push(h.hop.minX, h.hop.maxX);
    ys.push(h.hop.minY, h.hop.maxY);
  }
  for (const c of chu) {
    xs.push(c.x);
    ys.push(c.y);
  }
  if (!xs.length) return null;
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const k = Math.floor(xs.length * 0.005);
  const r = { minX: xs[k]!, maxX: xs[xs.length - 1 - k]!, minY: ys[k]!, maxY: ys[ys.length - 1 - k]! };
  if (r.maxX - r.minX < 1e-6) r.maxX = r.minX + 1;
  if (r.maxY - r.minY < 1e-6) r.maxY = r.minY + 1;
  return r;
}

export const khoangCach = (a: Diem, b: Diem) => Math.hypot(a.x - b.x, a.y - b.y);

export function chieuDai(ds: Diem[]): number {
  let s = 0;
  for (let i = 1; i < ds.length; i++) s += khoangCach(ds[i - 1]!, ds[i]!);
  return s;
}

/** Diện tích đa giác (công thức Gauss), luôn dương; không cần điểm cuối trùng điểm đầu. */
export function dienTich(ds: Diem[]): number {
  if (ds.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < ds.length; i++) {
    const a = ds[i]!, b = ds[(i + 1) % ds.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Khoảng cách từ điểm tới đoạn thẳng. */
export function khoangCachDoan(p: Diem, a: Diem, b: Diem): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Bắt điểm: đỉnh gần nhất trong bán kính `r` (đơn vị bản đồ) của các hình đang hiện. */
export function batDiem(p: Diem, hinh: HinhVe[], r: number): Diem | null {
  let tot: Diem | null = null, dTot = r;
  for (const h of hinh) {
    if (p.x < h.hop.minX - r || p.x > h.hop.maxX + r || p.y < h.hop.minY - r || p.y > h.hop.maxY + r) continue;
    for (const d of h.duong)
      for (const q of d) {
        const k = khoangCach(p, q);
        if (k < dTot) {
          dTot = k;
          tot = q;
        }
      }
  }
  return tot;
}

/** Phần tử gần con trỏ nhất trong bán kính `r`: hình (theo cạnh) hoặc chữ (theo điểm đặt). */
export function timPhanTu(p: Diem, hinh: HinhVe[], chu: ChuVe[], r: number): { hinh?: HinhVe; chu?: ChuVe } | null {
  let tot: { hinh?: HinhVe; chu?: ChuVe } | null = null, dTot = r;
  for (const c of chu) {
    const k = khoangCach(p, c);
    if (k < dTot) {
      dTot = k;
      tot = { chu: c };
    }
  }
  for (const h of hinh) {
    if (p.x < h.hop.minX - r || p.x > h.hop.maxX + r || p.y < h.hop.minY - r || p.y > h.hop.maxY + r) continue;
    for (const d of h.duong)
      for (let i = 1; i < d.length; i++) {
        const k = khoangCachDoan(p, d[i - 1]!, d[i]!);
        if (k < dTot) {
          dTot = k;
          tot = { hinh: h };
        }
      }
  }
  return tot;
}

export const TEN_LOAI: Record<string, string> = {
  DUONG: "Đoạn thẳng",
  DUONG_GAP: "Đường gấp khúc",
  VUNG: "Vùng khép kín",
  CHUOI_PHUC: "Chuỗi phức",
  VUNG_PHUC: "Vùng phức",
  ELIP: "Elip / đường tròn",
  CUNG: "Cung tròn",
  CHU: "Chữ",
};

/** Màu theo lớp khi tệp không có màu (DGN V8) hoặc chọn "màu theo lớp". */
export function mauLop(lop: number, nenToi: boolean): string {
  const h = (lop * 47) % 360;
  return nenToi ? `hsl(${h} 70% 62%)` : `hsl(${h} 60% 34%)`;
}
