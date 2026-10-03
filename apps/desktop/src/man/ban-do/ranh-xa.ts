/**
 * Lớp ranh giới 75 xã, phường tỉnh Sơn La (tệp `public/ban-do/ranh-xa-son-la.json`, WGS-84, tác giả cung cấp, rút gọn bằng
 * tools/ranh-xa/rut-gon.py). Đổi sang VN-2000 theo kinh tuyến trục của bản đồ để vẽ chồng lên bản đồ địa chính — chỉ tham
 * khảo trực quan, không dùng xác định ranh giới hành chính. Đọc tệp trong máy, không gửi gì ra ngoài.
 */
import { diemTrongThua, wgs84SangVn2000, type Diem, type HeVn2000 } from "@gpmb/gis";

export interface TepRanhXa {
  mo_ta: string;
  xa: { stt: number; ten: string; da_giac: [number, number][][][] }[];
}
export interface RanhXa {
  ten: string;
  /** Các đa giác (mỗi đa giác: vòng ngoài + lỗ), VN-2000 x = Đông, y = Bắc */
  da_giac: Diem[][][];
  hop: { minX: number; minY: number; maxX: number; maxY: number };
  /** Điểm đặt nhãn: trọng tâm vòng ngoài lớn nhất */
  nhan: Diem;
}

let dangNap: Promise<TepRanhXa> | null = null;
export function napRanhXa(): Promise<TepRanhXa> {
  dangNap ??= fetch(`${import.meta.env.BASE_URL}ban-do/ranh-xa-son-la.json`).then((r) => {
    if (!r.ok) throw new Error(`Không đọc được tệp ranh giới xã (${r.status})`);
    return r.json() as Promise<TepRanhXa>;
  });
  dangNap.catch(() => { dangNap = null; });
  return dangNap;
}

const dienTichCoDau = (v: Diem[]) => v.reduce((s, a, i) => { const b = v[(i + 1) % v.length]!; return s + a.x * b.y - b.x * a.y; }, 0) / 2;
function trongTam(v: Diem[]): Diem {
  const A = dienTichCoDau(v);
  if (Math.abs(A) < 1e-9) return v[0]!;
  let cx = 0, cy = 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i]!, b = v[(i + 1) % v.length]!, k = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * k;
    cy += (a.y + b.y) * k;
  }
  return { x: cx / (6 * A), y: cy / (6 * A) };
}

/** Đổi ranh xã sang VN-2000 theo hệ của bản đồ (kinh tuyến trục, múi chiếu). */
export function chieuRanhXa(t: TepRanhXa, he: HeVn2000): RanhXa[] {
  return t.xa.map((x) => {
    const da_giac = x.da_giac.map((p) => p.map((v) => v.map(([lon, lat]) => wgs84SangVn2000({ lon, lat }, he))));
    const hop = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let lon: Diem[] = [], dt = -1;
    for (const p of da_giac) {
      for (const d of p[0]!) {
        if (d.x < hop.minX) hop.minX = d.x;
        if (d.y < hop.minY) hop.minY = d.y;
        if (d.x > hop.maxX) hop.maxX = d.x;
        if (d.y > hop.maxY) hop.maxY = d.y;
      }
      const a = Math.abs(dienTichCoDau(p[0]!));
      if (a > dt) { dt = a; lon = p[0]!; }
    }
    return { ten: x.ten, da_giac, hop, nhan: trongTam(lon) };
  });
}

/** Xã, phường chứa điểm (VN-2000). */
export function xaChua(ds: RanhXa[], d: Diem): RanhXa | undefined {
  return ds.find((x) => d.x >= x.hop.minX && d.x <= x.hop.maxX && d.y >= x.hop.minY && d.y <= x.hop.maxY && x.da_giac.some((p) => diemTrongThua(d, p)));
}

/** So tên xã không phân biệt hoa thường, khoảng trắng thừa. */
export const cungTenXa = (a: string | undefined, b: string | undefined) => !!a && !!b && a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
