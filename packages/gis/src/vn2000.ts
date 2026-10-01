/**
 * Đổi tọa độ phẳng VN-2000 (lưới chiếu UTM múi 3°/6°, ellipsoid WGS-84) ↔ kinh độ, vĩ độ WGS-84 và số hiệu ô ảnh nền
 * Web Mercator (XYZ) — để đặt ảnh vệ tinh dưới bản đồ địa chính (docs/08 §5, §9).
 *
 * Căn cứ tham số:
 * - Hệ VN-2000: Quyết định 83/2000/QĐ-TTg; ellipsoid WGS-84 (a = 6 378 137 m, f = 1/298,257223563), lưới chiếu UTM, gốc
 *   phẳng dời 500 km về phía Tây (FE = 500 000 m), FN = 0.
 * - Kinh tuyến trục theo tỉnh, hệ số k0 = 0,9999 với múi 3°: Thông tư 973/2001/TT-TCĐC (Sơn La: 104°00′). Cán bộ chỉnh được
 *   theo dự án (tệp bản đồ lập ở kinh tuyến trục khác).
 * - Tham số chuyển đổi VN-2000 → WGS-84 (7 tham số): Quyết định 05/2007/QĐ-BTNMT, ghi theo quy ước "position vector" như
 *   chuỗi +towgs84 của PROJ: ΔX −191,90441 m, ΔY −39,30318 m, ΔZ −111,45032 m, ωx 0,00928836″, ωy −0,01975479″,
 *   ωz 0,00427372″, m 0,252906278 ppm.
 * Độ chính xác: công thức chiếu sai số < 1 mm trong múi; sai lệch thực tế do ảnh nền (vài mét) lớn hơn nhiều — chỉ dùng tham
 * khảo trực quan, không dùng đo đạc.
 */
import type { Diem } from "./dgn.js";

const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);
const RAD = Math.PI / 180;
const GIAY = Math.PI / 648000;

export const THAM_SO_VN2000_WGS84 = { dx: -191.90441, dy: -39.30318, dz: -111.45032, rx: 0.00928836, ry: -0.01975479, rz: 0.00427372, ppm: 0.252906278 } as const;

export interface HeVn2000 {
  /** Kinh tuyến trục (độ thập phân), vd. 104 (104°00′, Sơn La); 105,75 (105°45′) */
  kinhTuyenTruc: number;
  /** Múi chiếu 3° (k0 = 0,9999 — bản đồ địa chính) hoặc 6° (k0 = 0,9996) */
  mui: 3 | 6;
}
export const HE_SON_LA: HeVn2000 = { kinhTuyenTruc: 104, mui: 3 };

export interface LonLat {
  lon: number;
  lat: number;
}

/** Đọc kinh tuyến trục người dùng nhập: "104", "104°00'", "105 45", "105,75" → độ thập phân; sai thì null. */
export function docKinhTuyen(s: string): number | null {
  const t = s.trim().replace(",", ".");
  const m = /^(\d{2,3})(?:\s*[°º:\s]\s*(\d{1,2}(?:\.\d+)?)\s*['′]?)?$/.exec(t);
  if (m && m[2] !== undefined) {
    const p = Number(m[2]);
    return p < 60 ? Number(m[1]) + p / 60 : null;
  }
  const v = Number(t);
  return Number.isFinite(v) && v >= 100 && v <= 112 ? v : null;
}

/** Ghi kinh tuyến dạng độ, phút: 104 → "104°00′". */
export const ghiKinhTuyen = (v: number) => {
  const d = Math.floor(v + 1e-9);
  const p = Math.round((v - d) * 60);
  return `${d}°${String(p).padStart(2, "0")}′`;
};

const M0 = (phi: number) =>
  A *
  ((1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256) * phi -
    ((3 * E2) / 8 + (3 * E2 ** 2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * phi) +
    ((15 * E2 ** 2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * phi) -
    ((35 * E2 ** 3) / 3072) * Math.sin(6 * phi));

const k0 = (he: HeVn2000) => (he.mui === 6 ? 0.9996 : 0.9999);

/** Kinh, vĩ độ trên ellipsoid VN-2000 → tọa độ phẳng (x = Đông, y = Bắc như tọa độ DGN). */
export function chieuTm(ll: LonLat, he: HeVn2000): Diem {
  const phi = ll.lat * RAD;
  const s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
  const N = A / Math.sqrt(1 - E2 * s * s);
  const T = t * t, C = EP2 * c * c, a = (ll.lon - he.kinhTuyenTruc) * RAD * c;
  const k = k0(he);
  const x = k * N * (a + ((1 - T + C) * a ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * a ** 5) / 120);
  const y = k * (M0(phi) + N * t * (a ** 2 / 2 + ((5 - T + 9 * C + 4 * C * C) * a ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * a ** 6) / 720));
  return { x: 500000 + x, y };
}

/** Tọa độ phẳng (x = Đông, y = Bắc) → kinh, vĩ độ trên ellipsoid VN-2000. */
export function nguocTm(d: Diem, he: HeVn2000): LonLat {
  const k = k0(he);
  const x = d.x - 500000;
  const mu = d.y / k / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1);
  const C1 = EP2 * c * c, T1 = t * t;
  const N1 = A / Math.sqrt(1 - E2 * s * s);
  const R1 = (A * (1 - E2)) / (1 - E2 * s * s) ** 1.5;
  const D = x / (N1 * k);
  const phi = p1 - ((N1 * t) / R1) * (D * D / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6) / 720);
  const lam = (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5) / 120) / c;
  return { lon: he.kinhTuyenTruc + lam / RAD, lat: phi / RAD };
}

type Xyz = [number, number, number];
const sangDiaTam = (ll: LonLat, h = 0): Xyz => {
  const p = ll.lat * RAD, l = ll.lon * RAD;
  const N = A / Math.sqrt(1 - E2 * Math.sin(p) ** 2);
  return [(N + h) * Math.cos(p) * Math.cos(l), (N + h) * Math.cos(p) * Math.sin(l), (N * (1 - E2) + h) * Math.sin(p)];
};
const tuDiaTam = ([x, y, z]: Xyz): LonLat => {
  const p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - E2));
  for (let i = 0; i < 6; i++) {
    const N = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
    const h = p / Math.cos(lat) - N;
    lat = Math.atan2(z, p * (1 - (E2 * N) / (N + h)));
  }
  return { lon: Math.atan2(y, x) / RAD, lat: lat / RAD };
};

/** Helmert 7 tham số (position vector, như PROJ): chieu = 1 VN-2000 → WGS-84, −1 ngược lại. */
function helmert([x, y, z]: Xyz, chieu: 1 | -1): Xyz {
  const t = THAM_SO_VN2000_WGS84;
  const rx = t.rx * GIAY, ry = t.ry * GIAY, rz = t.rz * GIAY, m = 1 + t.ppm / 1e6;
  if (chieu === 1) return [t.dx + m * (x - rz * y + ry * z), t.dy + m * (rz * x + y - rx * z), t.dz + m * (-ry * x + rx * y + z)];
  const a = (x - t.dx) / m, b = (y - t.dy) / m, c = (z - t.dz) / m;
  return [a + rz * b - ry * c, -rz * a + b + rx * c, ry * a - rx * b + c];
}

/** Tọa độ phẳng VN-2000 (x = Đông, y = Bắc) → kinh, vĩ độ WGS-84. */
export const vn2000SangWgs84 = (d: Diem, he: HeVn2000 = HE_SON_LA): LonLat => tuDiaTam(helmert(sangDiaTam(nguocTm(d, he)), 1));
/** Kinh, vĩ độ WGS-84 → tọa độ phẳng VN-2000 (x = Đông, y = Bắc). */
export const wgs84SangVn2000 = (ll: LonLat, he: HeVn2000 = HE_SON_LA): Diem => chieuTm(tuDiaTam(helmert(sangDiaTam(ll), -1)), he);

/** Kinh, vĩ độ → số hiệu ô Web Mercator (phần lẻ là vị trí trong ô). */
export function sangO(ll: LonLat, z: number): { x: number; y: number } {
  const n = 2 ** z, p = ll.lat * RAD;
  return { x: ((ll.lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(p) + 1 / Math.cos(p)) / Math.PI) / 2) * n };
}
/** Góc trên-trái của ô (x, y có thể lẻ) → kinh, vĩ độ. */
export function tuO(x: number, y: number, z: number): LonLat {
  const n = 2 ** z;
  return { lon: (x / n) * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) / RAD };
}

export interface ONen {
  z: number;
  x: number;
  y: number;
  /** Góc trên-trái, trên-phải, dưới-trái của ô theo tọa độ VN-2000 — dựng phép biến đổi affine khi vẽ ô ảnh. */
  goc: [Diem, Diem, Diem];
}

/**
 * Các ô ảnh nền phủ khung nhìn (tọa độ VN-2000) ở mức phóng hợp với tỷ lệ màn hình (pixel/mét). Mỗi ô 256 px; tối đa
 * `toiDaO` ô (vượt thì giảm mức phóng). Chỉ số ô (z/x/y) là thông tin duy nhất gửi tới máy chủ ảnh.
 */
export function oNenTrongKhung(k: { minX: number; minY: number; maxX: number; maxY: number }, pxMoiMet: number, he: HeVn2000 = HE_SON_LA, mucToiDa = 19, toiDaO = 120): ONen[] {
  const goc = [vn2000SangWgs84({ x: k.minX, y: k.minY }, he), vn2000SangWgs84({ x: k.maxX, y: k.minY }, he), vn2000SangWgs84({ x: k.minX, y: k.maxY }, he), vn2000SangWgs84({ x: k.maxX, y: k.maxY }, he)];
  if (goc.some((g) => !Number.isFinite(g.lat) || Math.abs(g.lat) > 85)) return [];
  const latTb = (goc[0]!.lat + goc[3]!.lat) / 2;
  let z = Math.max(0, Math.min(mucToiDa, Math.round(Math.log2(156543.03392 * Math.cos(latTb * RAD) * pxMoiMet))));
  for (;;) {
    const o = goc.map((g) => sangO(g, z));
    const x0 = Math.floor(Math.min(...o.map((v) => v.x))), x1 = Math.floor(Math.max(...o.map((v) => v.x)));
    const y0 = Math.floor(Math.min(...o.map((v) => v.y))), y1 = Math.floor(Math.max(...o.map((v) => v.y)));
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > toiDaO && z > 0) {
      z--;
      continue;
    }
    const n = 2 ** z;
    const ds: ONen[] = [];
    const vn = (x: number, y: number) => wgs84SangVn2000(tuO(x, y, z), he);
    for (let y = Math.max(0, y0); y <= Math.min(n - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(n - 1, x1); x++) ds.push({ z, x, y, goc: [vn(x, y), vn(x + 1, y), vn(x, y + 1)] });
    return ds;
  }
}

/** Nguồn ảnh nền trực tuyến (XYZ). Chỉ gửi z/x/y — không gửi tọa độ thửa, hồ sơ. */
export interface NguonAnhNen {
  ma: string;
  ten: string;
  url: string;
  ghiNguon: string;
  mucToiDa: number;
}
export const NGUON_ANH_NEN: NguonAnhNen[] = [
  { ma: "ESRI", ten: "Ảnh vệ tinh Esri World Imagery", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", ghiNguon: "Ảnh: Esri, Maxar, Earthstar Geographics", mucToiDa: 19 },
  { ma: "OSM", ten: "Bản đồ nền OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", ghiNguon: "© Những người đóng góp OpenStreetMap", mucToiDa: 19 },
];

/** Thay {z}/{x}/{y} (và {s} → a/b/c) trong mẫu URL ô ảnh. */
export const urlO = (mau: string, o: { z: number; x: number; y: number }) =>
  mau.replace("{z}", String(o.z)).replace("{x}", String(o.x)).replace("{y}", String(o.y)).replace("{-y}", String(2 ** o.z - 1 - o.y)).replace("{s}", "abc"[(o.x + o.y) % 3]!);

/** Mẫu URL hợp lệ: https, có {z}, {x}, {y} (hoặc {-y}). */
export const mauUrlHopLe = (s: string) => /^https:\/\/[^\s]+$/i.test(s.trim()) && s.includes("{z}") && s.includes("{x}") && (s.includes("{y}") || s.includes("{-y}"));
