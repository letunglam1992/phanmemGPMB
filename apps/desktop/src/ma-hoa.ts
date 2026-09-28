/**
 * Mã hóa tệp sao lưu (P0-5). Chạy bằng WebCrypto trong WebView2 — không thư viện ngoài, không gọi mạng.
 *
 * Mã hóa phong bì: dữ liệu mã hóa AES-256-GCM bằng một khóa dữ liệu ngẫu nhiên K; K được "bọc" bằng một hoặc nhiều cách:
 * - MAT_KHAU:  khóa dẫn xuất từ mật khẩu sao lưu (PBKDF2-SHA256, 600.000 vòng, muối 16 byte) — sao lưu thủ công;
 * - KHOI_PHUC: khóa công khai RSA-OAEP 3072 của "mật khẩu khôi phục" do quản trị đặt một lần; khóa bí mật (đã mã hóa bằng
 *   mật khẩu khôi phục) đi kèm trong tệp → khôi phục được trên máy khác khi nhập mật khẩu khôi phục;
 *   máy không lưu mật khẩu, chỉ lưu khóa công khai và khóa bí mật đã mã hóa;
 * - DPAPI:     bọc bằng Windows DPAPI của tài khoản Windows đang dùng (lệnh Rust) — tự khôi phục trên cùng máy, cùng tài khoản.
 * Thẻ xác thực GCM bảo đảm toàn vẹn: sai mật khẩu hoặc tệp bị sửa → từ chối.
 */

export const VONG_LAP = 600_000;

const b64 = (b: Uint8Array | ArrayBuffer) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ngauNhien = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const buf = (u: Uint8Array) => u as Uint8Array<ArrayBuffer>;

export class LoiMaHoa extends Error {}

async function khoaTuMatKhau(matKhau: string, muoi: Uint8Array, vongLap: number): Promise<CryptoKey> {
  const goc = await crypto.subtle.importKey("raw", new TextEncoder().encode(matKhau.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: buf(muoi), iterations: vongLap }, goc, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function maHoaAes(khoa: CryptoKey, du: Uint8Array): Promise<{ iv: string; du: string }> {
  const iv = ngauNhien(12);
  return { iv: b64(iv), du: b64(await crypto.subtle.encrypt({ name: "AES-GCM", iv: buf(iv) }, khoa, buf(du))) };
}
async function giaiMaAes(khoa: CryptoKey, iv: string, du: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(tuB64(iv)) }, khoa, buf(tuB64(du))));
}

/* ------------------------- Mật khẩu khôi phục ------------------------- */

export interface KhoaKhoiPhuc {
  /** Khóa công khai RSA-OAEP (JWK) — dùng để bọc khóa dữ liệu khi sao lưu. */
  congKhai: JsonWebKey;
  /** Khóa bí mật PKCS#8, mã hóa AES-GCM bằng khóa dẫn xuất từ mật khẩu khôi phục. */
  biMat: { muoi: string; vongLap: number; iv: string; du: string };
  /** Dấu nhận biết (SHA-256 khóa công khai, 16 ký tự đầu) — để biết tệp dùng khóa khôi phục nào. */
  vanTay: string;
  taoLuc: string;
  nguoi: string;
}

const RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const;

async function vanTayKhoa(jwk: JsonWebKey): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${jwk.n}.${jwk.e}`));
  return [...new Uint8Array(h)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function taoKhoaKhoiPhuc(matKhau: string, nguoi: string): Promise<KhoaKhoiPhuc> {
  const cap = await crypto.subtle.generateKey({ ...RSA, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ["wrapKey", "unwrapKey", "encrypt", "decrypt"]);
  const congKhai = await crypto.subtle.exportKey("jwk", cap.publicKey);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", cap.privateKey));
  const muoi = ngauNhien(16);
  const bm = await maHoaAes(await khoaTuMatKhau(matKhau, muoi, VONG_LAP), pkcs8);
  return { congKhai, biMat: { muoi: b64(muoi), vongLap: VONG_LAP, ...bm }, vanTay: await vanTayKhoa(congKhai), taoLuc: new Date().toISOString(), nguoi };
}

/** Kiểm tra mật khẩu khôi phục (giải được khóa bí mật). */
export async function thuMatKhauKhoiPhuc(k: Pick<KhoaKhoiPhuc, "biMat">, matKhau: string): Promise<CryptoKey | null> {
  try {
    const pkcs8 = await giaiMaAes(await khoaTuMatKhau(matKhau, tuB64(k.biMat.muoi), k.biMat.vongLap), k.biMat.iv, k.biMat.du);
    return await crypto.subtle.importKey("pkcs8", buf(pkcs8), RSA, false, ["decrypt"]);
  } catch {
    return null;
  }
}

/* ------------------------- Gói mã hóa ------------------------- */

export type BocKhoa =
  | { loai: "MAT_KHAU"; muoi: string; vongLap: number; iv: string; du: string }
  | { loai: "KHOI_PHUC"; vanTay: string; du: string; biMat: KhoaKhoiPhuc["biMat"] }
  | { loai: "DPAPI"; du: string };

export interface GoiMaHoa {
  thuatToan: "AES-256-GCM";
  iv: string;
  boc: BocKhoa[];
}

export interface CachMaHoa {
  matKhau?: string;
  khoiPhuc?: KhoaKhoiPhuc | null;
  /** Bọc bằng DPAPI (vỏ Windows); lỗi thì bỏ qua cách này. */
  dpapi?: ((b: Uint8Array) => Promise<Uint8Array>) | null;
}

export async function maHoa(du: Uint8Array, cach: CachMaHoa): Promise<{ goi: GoiMaHoa; bytes: Uint8Array }> {
  const kRaw = ngauNhien(32);
  const k = await crypto.subtle.importKey("raw", kRaw, "AES-GCM", false, ["encrypt"]);
  const iv = ngauNhien(12);
  const bytes = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, buf(du)));
  const boc: BocKhoa[] = [];
  if (cach.matKhau) {
    const muoi = ngauNhien(16);
    boc.push({ loai: "MAT_KHAU", muoi: b64(muoi), vongLap: VONG_LAP, ...(await maHoaAes(await khoaTuMatKhau(cach.matKhau, muoi, VONG_LAP), kRaw)) });
  }
  if (cach.khoiPhuc) {
    const pub = await crypto.subtle.importKey("jwk", cach.khoiPhuc.congKhai, RSA, false, ["encrypt"]);
    boc.push({ loai: "KHOI_PHUC", vanTay: cach.khoiPhuc.vanTay, du: b64(await crypto.subtle.encrypt(RSA, pub, kRaw)), biMat: cach.khoiPhuc.biMat });
  }
  if (cach.dpapi) {
    try {
      boc.push({ loai: "DPAPI", du: b64(await cach.dpapi(kRaw)) });
    } catch {
      /* không có DPAPI (trình duyệt, lỗi hệ thống): dùng các cách còn lại */
    }
  }
  if (!boc.length) throw new LoiMaHoa("Chưa có cách mã hóa: cần mật khẩu sao lưu, mật khẩu khôi phục hoặc DPAPI của Windows");
  kRaw.fill(0);
  return { goi: { thuatToan: "AES-256-GCM", iv: b64(iv), boc }, bytes };
}

/** Giải mã: thử DPAPI (không cần mật khẩu), rồi mật khẩu như mật khẩu sao lưu, rồi như mật khẩu khôi phục. */
export async function giaiMa(goi: GoiMaHoa, bytes: Uint8Array, cach: { matKhau?: string; dpapiMo?: ((b: Uint8Array) => Promise<Uint8Array>) | null }): Promise<Uint8Array> {
  const thu = async (kRaw: Uint8Array) => {
    const k = await crypto.subtle.importKey("raw", buf(kRaw), "AES-GCM", false, ["decrypt"]);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(tuB64(goi.iv)) }, k, buf(bytes)));
  };
  let kRaw: Uint8Array | null = null;
  for (const b of goi.boc) {
    if (kRaw) break;
    try {
      if (b.loai === "DPAPI" && cach.dpapiMo) kRaw = await cach.dpapiMo(tuB64(b.du));
      else if (b.loai === "MAT_KHAU" && cach.matKhau) kRaw = await giaiMaAes(await khoaTuMatKhau(cach.matKhau, tuB64(b.muoi), b.vongLap), b.iv, b.du);
      else if (b.loai === "KHOI_PHUC" && cach.matKhau) {
        const bm = await thuMatKhauKhoiPhuc(b, cach.matKhau);
        if (bm) kRaw = new Uint8Array(await crypto.subtle.decrypt(RSA, bm, buf(tuB64(b.du))));
      }
    } catch {
      kRaw = null; // sai mật khẩu / không phải máy tạo tệp: thử cách khác
    }
  }
  if (!kRaw) throw new LoiMaHoa(cach.matKhau ? "Mật khẩu không đúng (không phải mật khẩu sao lưu hoặc mật khẩu khôi phục của tệp này)" : "Tệp sao lưu đã mã hóa — nhập mật khẩu sao lưu hoặc mật khẩu khôi phục");
  try {
    return await thu(kRaw);
  } catch {
    throw new LoiMaHoa("Tệp sao lưu bị hỏng hoặc bị sửa (không qua được kiểm tra toàn vẹn)");
  }
}

/** Các cách mở được tệp (để hướng dẫn người dùng). */
export const moTaCachMo = (goi: GoiMaHoa) =>
  goi.boc.map((b) => (b.loai === "MAT_KHAU" ? "mật khẩu sao lưu" : b.loai === "KHOI_PHUC" ? `mật khẩu khôi phục (khóa ${b.vanTay})` : "máy và tài khoản Windows đã tạo tệp")).join(" hoặc ");

/** Mật khẩu đủ mạnh: ≥ 12 ký tự, có chữ và số (hoặc cụm từ ≥ 16 ký tự). */
export function loiMatKhau(mk: string): string | null {
  if (mk.length >= 16) return null;
  if (mk.length < 12) return "Tối thiểu 12 ký tự (hoặc một cụm từ từ 16 ký tự)";
  if (!/\p{L}/u.test(mk) || !/\d/.test(mk)) return "Cần có cả chữ và số";
  return null;
}
