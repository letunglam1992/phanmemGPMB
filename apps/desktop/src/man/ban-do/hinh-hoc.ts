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
  /** Phần tử dựng thêm từ tệp V8: "Ô dùng chung TÊN" hoặc "Kích thước". */
  nguon?: string;
  /** 1.0.7: tâm của cung tròn / elip (để bắt tâm). */
  tam?: Diem;
}
export interface ChuVe {
  stt: number;
  lop: number;
  x: number;
  y: number;
  chu: string;
  cao: number;
  xoay: number;
  /** Chỉ số màu gốc trong tệp (0 = theo lớp/không có) — 1.0.7 */
  mau?: number;
  nguon?: string;
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
    if (!x) dem.set(lop, (x = { lop, ten: ban.tenLop?.[lop] ?? tenLopPl21(lop), soHinh: 0, soChu: 0 }));
    return x;
  };
  const nguonCua = (e: PhanTu) => (e.oDungChung !== undefined ? `Ô dùng chung ${e.oDungChung}` : e.kichThuoc !== undefined ? "Kích thước" : undefined);
  for (const e of ban.phanTu) {
    if (e.loai === "CHU") {
      const s = giaiMaNhan(e);
      if (!s) continue;
      chu.push({ stt: e.stt, lop: e.lop, x: e.goc.x, y: e.goc.y, chu: s, cao: e.chieuCao, xoay: e.gocXoay, nguon: nguonCua(e), ...(e.mau ? { mau: e.mau } : {}) });
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
    const tam = e.loai === "ELIP" || e.loai === "CUNG" ? tamCung(phang, e.loai === "ELIP") : null;
    hinh.push({ stt: e.stt, lop: e.lop, loai: e.loai, mau: e.mau, duong, kin, hop, nguon: nguonCua(e), ...(tam ? { tam } : {}) });
    lay(e.lop).soHinh++;
  }
  return { hinh, chu, lop: [...dem.values()].sort((a, b) => a.lop - b.lop) };
}

/**
 * 1.0.7 — Tâm cung tròn / elip từ các điểm đã rời rạc hóa của bộ đọc: elip (khép kín) → trung bình các điểm (bỏ điểm
 * cuối trùng điểm đầu); cung → tâm đường tròn qua điểm đầu, giữa, cuối. Thẳng hàng → null.
 */
export function tamCung(d: Diem[], kin: boolean): Diem | null {
  if (d.length < 3) return null;
  if (kin) {
    const ds = trung(d[0]!, d[d.length - 1]!) ? d.slice(0, -1) : d;
    return { x: ds.reduce((s, p) => s + p.x, 0) / ds.length, y: ds.reduce((s, p) => s + p.y, 0) / ds.length };
  }
  const a = d[0]!, b = d[Math.floor(d.length / 2)]!, c = d[d.length - 1]!;
  const den = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(den) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  return { x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / den, y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / den };
}

/** Điểm gần nhất trên đoạn ab tới p. */
export function diemGanNhatDoan(p: Diem, a: Diem, b: Diem): Diem {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { x: a.x + t * dx, y: a.y + t * dy };
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

export type KieuBat = "DINH" | "TRUNG_DIEM" | "GIAO_DIEM" | "VUONG_GOC" | "TAM" | "GAN_NHAT";
export const TEN_KIEU_BAT: Record<KieuBat, string> = { DINH: "Đỉnh", TRUNG_DIEM: "Trung điểm", GIAO_DIEM: "Giao điểm", VUONG_GOC: "Vuông góc", TAM: "Tâm cung", GAN_NHAT: "Trên cạnh" };

/** Giao điểm hai đoạn thẳng (nếu có, kể cả đầu mút). */
export function giaoDoan(a: Diem, b: Diem, c: Diem, d: Diem): Diem | null {
  const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

/** Chân đường vuông góc hạ từ p xuống đường thẳng ab (chỉ nhận khi nằm trong đoạn). */
export function chanVuongGoc(p: Diem, a: Diem, b: Diem): Diem | null {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  if (l2 === 0) return null;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  return t < 0 || t > 1 ? null : { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * Bắt điểm nâng cao (docs/08 §9.10): đỉnh, trung điểm cạnh, giao điểm hai cạnh, chân vuông góc hạ từ điểm đo trước xuống cạnh
 * gần con trỏ; 1.0.7: tâm cung tròn/elip (khi con trỏ ở gần cung hoặc gần tâm), điểm gần nhất trên cạnh (ưu tiên thấp nhất
 * — các kiểu khác trong bán kính được chọn trước). Lấy ứng viên gần con trỏ nhất trong bán kính r; đỉnh được ưu tiên khi
 * trùng khoảng cách.
 */
export function batDiemNangCao(p: Diem, hinh: HinhVe[], r: number, kieu: Set<KieuBat>, diemTruoc?: Diem | null): { d: Diem; kieu: KieuBat } | null {
  const doan: [Diem, Diem][] = [];
  const tam: { d: Diem; kc: number }[] = [];
  for (const h of hinh) {
    if (kieu.has("TAM") && h.tam) {
      // con trỏ gần tâm, hoặc gần chính cung (hộp bao chưa chắc chứa tâm của cung nhỏ)
      let kc = khoangCach(p, h.tam);
      if (kc > r) for (const dg of h.duong) for (let i = 1; i < dg.length; i++) kc = Math.min(kc, khoangCachDoan(p, dg[i - 1]!, dg[i]!));
      if (kc <= r) tam.push({ d: h.tam, kc });
    }
    if (p.x < h.hop.minX - r || p.x > h.hop.maxX + r || p.y < h.hop.minY - r || p.y > h.hop.maxY + r) continue;
    for (const dg of h.duong) for (let i = 1; i < dg.length; i++) if (khoangCachDoan(p, dg[i - 1]!, dg[i]!) <= r) doan.push([dg[i - 1]!, dg[i]!]);
    if (doan.length > 400) break;
  }
  let tot: { d: Diem; kieu: KieuBat } | null = null, dTot = r;
  const thu = (d: Diem | null, k: KieuBat, uuTien = 0) => {
    if (!d) return;
    const kc = khoangCach(p, d) - uuTien;
    if (kc < dTot) (dTot = kc), (tot = { d, kieu: k });
  };
  for (const [a, b] of doan) {
    if (kieu.has("DINH")) (thu(a, "DINH", r * 0.15), thu(b, "DINH", r * 0.15));
    if (kieu.has("TRUNG_DIEM")) thu({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, "TRUNG_DIEM", r * 0.05);
    if (kieu.has("VUONG_GOC") && diemTruoc) thu(chanVuongGoc(diemTruoc, a, b), "VUONG_GOC");
  }
  if (kieu.has("GIAO_DIEM")) for (let i = 0; i < doan.length; i++) for (let j = i + 1; j < doan.length; j++) thu(giaoDoan(doan[i]![0], doan[i]![1], doan[j]![0], doan[j]![1]), "GIAO_DIEM", r * 0.1);
  for (const t of tam) if (t.kc - r * 0.1 < dTot) (dTot = t.kc - r * 0.1), (tot = { d: t.d, kieu: "TAM" });
  if (!tot && kieu.has("GAN_NHAT")) {
    let gTot = r;
    for (const [a, b] of doan) {
      const g = diemGanNhatDoan(p, a, b), kc = khoangCach(p, g);
      if (kc < gTot) (gTot = kc), (tot = { d: g, kieu: "GAN_NHAT" });
    }
  }
  return tot;
}
