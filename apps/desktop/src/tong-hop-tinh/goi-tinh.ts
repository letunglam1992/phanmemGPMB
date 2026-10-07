/**
 * Gói dữ liệu gửi cấp tỉnh (.gpmbtinh) — phương án 1 (docs/21): xã, phường xuất gói, gửi về tỉnh bằng bất kỳ đường nào
 * (thư điện tử, Zalo, USB, ổ dùng chung) hoặc qua cổng Cloudflare (cong-tinh.ts); tỉnh nhập gói để xem tổng hợp và chi
 * tiết từng dự án như cấp xã (chỉ xem).
 *
 * Cấu trúc (zip, không nén):
 *   thong-tin.json – định dạng, đơn vị gửi, thời điểm, số lượng, vân tay khóa tỉnh, khóa ký của đơn vị gửi, chữ ký.
 *                    KHÔNG có tên người, số giấy tờ, số tiền.
 *   du-lieu.bin    – bản sao lưu phiên bản 1 (sao-luu.ts) chỉ gồm các dự án chọn, mã hóa AES-256-GCM bằng khóa ngẫu nhiên;
 *                    khóa này bọc bằng khóa công khai RSA-OAEP 3072 của cấp tỉnh → chỉ máy giữ khóa bí mật của tỉnh
 *                    (và biết mật khẩu khóa) mở được. Người chuyển gói, cổng Cloudflare không đọc được nội dung.
 * Chữ ký ECDSA P-256 của đơn vị gửi trên (thông tin + mã băm du-lieu.bin): phát hiện gói bị sửa, và — khi tỉnh đã nhận
 * gói trước đó của cùng đơn vị — phát hiện gói giả danh (khóa ký khác lần trước). Đây là chữ ký kỹ thuật của bản cài phần
 * mềm, không thay chữ ký số của cơ quan theo pháp luật về giao dịch điện tử.
 */
import { dsDoan, matBangTheoLyTrinh } from "../ly-trinh";
import PizZip from "pizzip";
import { D } from "@gpmb/core";
import type { Kho } from "../kho";
import type { DuAn, Ho } from "../mo-hinh";
import { tienDoHo } from "../mo-hinh";
import { taoBanSaoLuu, type BanSaoLuu, docBanSaoLuu } from "../sao-luu";
import { taoKhoaKhoiPhuc, thuMatKhauKhoiPhuc, type KhoaKhoiPhuc } from "../ma-hoa";
import { BO_CHINH_SACH } from "../du-lieu";
import { GOI_GOC, dangKyGoi, type GoiDaNap } from "../goi-chinh-sach";
import { tinhHo } from "../tinh-ho";
import { THU_TU_TRANG_THAI, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { hoDaPheDuyet } from "../phuong-an";

export const DINH_DANG_GOI = "gpmb-sonla-goi-tinh";
export const DINH_DANG_KHOA = "gpmb-sonla-khoa-tinh";
export const PHIEN_BAN_GOI = 1;
export const DUOI_GOI = ".gpmbtinh";
export const DUOI_KHOA = ".gpmbkhoa";
/** Cài đặt chung của kho cấp xã */
export const KHOA_CD_KHOA_TINH = "tinh.khoaCongKhai";
export const KHOA_CD_KY = "tinh.khoaKy";
export const KHOA_CD_GUI = "tinh.donViGui";

export class LoiGoiTinh extends Error {}

const RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const;
const EC = { name: "ECDSA", namedCurve: "P-256" } as const;
const KY = { name: "ECDSA", hash: "SHA-256" } as const;
const buf = (u: Uint8Array) => u as Uint8Array<ArrayBuffer>;
const b64 = (b: Uint8Array | ArrayBuffer) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (u: Uint8Array) => hex(await crypto.subtle.digest("SHA-256", buf(u)));
/** Vân tay hiển thị: 16 ký tự hex chia nhóm 4 — đọc qua điện thoại để đối chiếu. */
export const nhomVanTay = (v: string) => v.toUpperCase().match(/.{1,4}/g)?.join("-") ?? v;
const vanTayChuoi = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).slice(0, 16);

/* --------------------------- Khóa cấp tỉnh --------------------------- */

/** Khóa cấp tỉnh: cặp RSA (khóa bí mật mã hóa bằng mật khẩu khóa — PBKDF2 600.000 vòng). */
export interface KhoaTinh extends KhoaKhoiPhuc {
  donVi: string;
}
/** Tệp khóa công khai gửi cho các xã (không có khóa bí mật). */
export interface KhoaCongKhaiTinh {
  dinhDang: typeof DINH_DANG_KHOA;
  phienBan: number;
  donVi: string;
  congKhai: JsonWebKey;
  vanTay: string;
  taoLuc: string;
}

export async function taoKhoaTinh(matKhau: string, donVi: string, nguoi: string): Promise<KhoaTinh> {
  return { ...(await taoKhoaKhoiPhuc(matKhau, nguoi)), donVi: donVi.trim() };
}
export const congKhaiCua = (k: KhoaTinh): KhoaCongKhaiTinh => ({ dinhDang: DINH_DANG_KHOA, phienBan: 1, donVi: k.donVi, congKhai: k.congKhai, vanTay: k.vanTay, taoLuc: k.taoLuc });

/** Mở khóa bí mật bằng mật khẩu khóa (null = sai mật khẩu). */
export const moKhoaTinh = (k: KhoaTinh, matKhau: string) => thuMatKhauKhoiPhuc(k, matKhau);

/** Đọc tệp khóa công khai của tỉnh (xã nhập) hoặc tệp dự phòng khóa của tỉnh (tỉnh khôi phục — có biMat). */
export function docTepKhoa(chu: string): { congKhai: KhoaCongKhaiTinh; duPhong: KhoaTinh | null } {
  let x: Partial<KhoaTinh & KhoaCongKhaiTinh & { khoaTinh: KhoaTinh }>;
  try {
    x = JSON.parse(chu);
  } catch {
    throw new LoiGoiTinh("Tệp không phải tệp khóa cấp tỉnh (không đọc được JSON).");
  }
  if (x.dinhDang !== DINH_DANG_KHOA) throw new LoiGoiTinh("Tệp không đúng định dạng khóa cấp tỉnh của phần mềm GPMB Sơn La.");
  if (!x.congKhai?.n || !x.vanTay || !x.donVi) throw new LoiGoiTinh("Tệp khóa thiếu thông tin (khóa công khai, vân tay, đơn vị).");
  const congKhai: KhoaCongKhaiTinh = { dinhDang: DINH_DANG_KHOA, phienBan: x.phienBan ?? 1, donVi: x.donVi, congKhai: x.congKhai, vanTay: x.vanTay, taoLuc: x.taoLuc ?? "" };
  return { congKhai, duPhong: x.khoaTinh?.biMat ? x.khoaTinh : null };
}
export async function kiemVanTay(k: Pick<KhoaCongKhaiTinh, "congKhai" | "vanTay">): Promise<boolean> {
  return (await vanTayChuoi(`${k.congKhai.n}.${k.congKhai.e}`)) === k.vanTay;
}
export const tepKhoaCongKhai = (k: KhoaTinh) => JSON.stringify(congKhaiCua(k), null, 2);
/** Bản dự phòng khóa (khóa bí mật vẫn mã hóa bằng mật khẩu khóa) — cất USB, két; mất khóa thì không mở được gói cũ. */
export const tepDuPhongKhoa = (k: KhoaTinh) => JSON.stringify({ ...congKhaiCua(k), khoaTinh: k }, null, 2);

/* --------------------------- Khóa ký của đơn vị gửi --------------------------- */

export interface KhoaKy {
  congKhai: JsonWebKey;
  biMat: JsonWebKey;
  vanTay: string;
  taoLuc: string;
}
export async function taoKhoaKy(): Promise<KhoaKy> {
  const cap = await crypto.subtle.generateKey(EC, true, ["sign", "verify"]);
  const congKhai = await crypto.subtle.exportKey("jwk", cap.publicKey);
  return { congKhai, biMat: await crypto.subtle.exportKey("jwk", cap.privateKey), vanTay: await vanTayChuoi(`${congKhai.x}.${congKhai.y}`), taoLuc: new Date().toISOString() };
}

/* --------------------------- Tóm tắt (không có thông tin cá nhân) --------------------------- */

export interface TomTatDuAn {
  id: string;
  ten: string;
  xa: string;
  chuDauTu: string;
  soHo: number;
  theoTrangThai: Partial<Record<TrangThaiGpmb, number>>;
  /** Tổng giá trị bồi thường, hỗ trợ tạm tính (đồng, đã làm tròn) */
  tongTamTinh: string;
  /** Tổng diện tích thu hồi theo hồ sơ (m²) */
  dienTichThuHoi: string;
  /** Số hộ đang ghi vướng mắc (hồ sơ hoặc bước) */
  soVuongMac: number;
  soHoDaChotPA: number;
  soHoDaDuyetPA: number;
  /** Tỷ lệ bước quy trình đã hoàn thành bình quân (0–1) */
  tienDoBinhQuan: number;
  soTepDinhKem: number;
  /** 1.0.4: dự án liên xã — mã dùng chung do tỉnh cấp, tên tuyến, đoạn Km (gói cũ không có) */
  lienXa?: import("./lien-xa").LienXaDuAn;
  /** 1.0.4: mặt bằng theo lý trình (chỉ khi xã có ghi lý trình thửa) — mét */
  lyTrinh?: { tongM: number; sachM: number; chua: [number, number][] };
}

/** Tóm tắt từng dự án (chạy trên máy tỉnh sau khi giải mã, hoặc trên máy xã để xem trước). */
export function tomTatDuAn(duAn: DuAn[], ho: Ho[], soTep: (duAnId: string) => number, homNay: string): TomTatDuAn[] {
  return duAn.map((d) => {
    const cs = BO_CHINH_SACH[d.boChinhSach] ?? BO_CHINH_SACH[GOI_GOC]!;
    const hs = ho.filter((h) => h.duAnId === d.id && !h.daXoa);
    const theo: Partial<Record<TrangThaiGpmb, number>> = {};
    let tong = D(0);
    let dt = D(0);
    let vm = 0;
    let td = 0;
    for (const h of hs) {
      let k;
      try {
        k = tinhHo(cs, d, h);
      } catch {
        k = null;
      }
      if (k) {
        const t = trangThaiHo(d, h, k, homNay);
        theo[t] = (theo[t] ?? 0) + 1;
        tong = tong.plus(D(String(k.tong.tongLamTron)));
      }
      dt = dt.plus(h.thua.reduce((a, t) => a.plus(D(t.dienTichThuHoi || "0")), D(0)));
      if (h.vuongMac?.noiDung || Object.values(h.tienDo).some((b) => b?.vuongMac)) vm++;
      td += tienDoHo(h).tyLe;
    }
    const pa = (d.phuongAn ?? []).filter((p) => p.trangThai !== "DA_HUY");
    const ids = new Set(hs.map((h) => h.id));
    const chot = new Set(pa.flatMap((p) => p.ho.map((x) => x.hoId)).filter((id) => ids.has(id)));
    const duyet = [...hoDaPheDuyet(pa).keys()].filter((id) => ids.has(id));
    return {
      id: d.id,
      ten: d.ten,
      xa: d.xa,
      chuDauTu: d.chuDauTu,
      soHo: hs.length,
      theoTrangThai: theo,
      tongTamTinh: tong.toFixed(0),
      dienTichThuHoi: dt.toFixed(1),
      soVuongMac: vm,
      soHoDaChotPA: chot.size,
      soHoDaDuyetPA: duyet.length,
      tienDoBinhQuan: hs.length ? td / hs.length : 0,
      soTepDinhKem: soTep(d.id),
      ...(d.lienXa?.ma?.trim() ? { lienXa: d.lienXa } : {}),
      ...(() => {
        const ds = dsDoan(hs, (h) => !!h.banGiao?.ngay);
        if (!ds.length) return {};
        const mb = matBangTheoLyTrinh(ds);
        return { lyTrinh: { tongM: mb.tongM, sachM: mb.sachM, chua: mb.chua } };
      })(),
    };
  });
}
export const THU_TU_TT = THU_TU_TRANG_THAI;

/* --------------------------- Tạo gói --------------------------- */

export interface ThongTinGoi {
  dinhDang: typeof DINH_DANG_GOI;
  phienBan: number;
  /** Mã nhận diện bộ dữ liệu gửi (cố định theo kho của đơn vị) — tỉnh giữ bản mới nhất theo mã này */
  maGui: string;
  /** Tên đơn vị gửi, vd. "UBND xã Chiềng Mung" */
  donViGui: string;
  luc: string;
  ungDung: string;
  nguoiXuat: string;
  soDuAn: number;
  soHo: number;
  soBanDo: number;
  soDinhKem: number;
  /** Tên dự án (không phải thông tin cá nhân) — để tỉnh biết gói gồm gì trước khi mở */
  tenDuAn: string[];
  khoaTinh: { vanTay: string; donVi: string };
  khoaKy: { congKhai: JsonWebKey; vanTay: string };
  maHoa: { thuatToan: "AES-256-GCM"; iv: string; khoaBoc: string };
  bamDuLieu: string;
  /** Chữ ký ECDSA P-256 (base64) trên chuoiKy(thông tin không có trường chuKy) */
  chuKy: string;
}

const chuoiKy = (t: Omit<ThongTinGoi, "chuKy">) =>
  JSON.stringify([t.dinhDang, t.phienBan, t.maGui, t.donViGui, t.luc, t.ungDung, t.nguoiXuat, t.soDuAn, t.soHo, t.soBanDo, t.soDinhKem, t.tenDuAn, t.khoaTinh.vanTay, t.khoaKy.vanTay, t.maHoa.iv, t.maHoa.khoaBoc, t.bamDuLieu]);

export interface TuyChonGoi {
  khoaTinh: KhoaCongKhaiTinh;
  khoaKy: KhoaKy;
  maGui: string;
  donViGui: string;
  duAnIds: string[];
  kemDinhKem: boolean;
  kemBanDo: boolean;
  ungDung: string;
  nguoiXuat: string;
}

export async function taoGoiTinh(kho: Kho, o: TuyChonGoi): Promise<{ bytes: Uint8Array; thongTin: ThongTinGoi }> {
  if (!o.duAnIds.length) throw new LoiGoiTinh("Chưa chọn dự án nào để gửi.");
  if (!(await kiemVanTay(o.khoaTinh))) throw new LoiGoiTinh("Khóa công khai của tỉnh không hợp lệ (vân tay không khớp) — nhập lại tệp khóa do tỉnh gửi.");
  if (!o.donViGui.trim()) throw new LoiGoiTinh("Chưa nhập tên đơn vị gửi.");
  const ban = await taoBanSaoLuu(kho, o.ungDung, { duAnIds: o.duAnIds, boDinhKem: !o.kemDinhKem, boBanDo: !o.kemBanDo, boMau: false, boTepDaXoa: true, boLichSu: true });
  const dsDa = (await kho.dsDuAn()).filter((d) => o.duAnIds.includes(d.id));
  // mã hóa phong bì: K ngẫu nhiên → AES-GCM; K bọc RSA-OAEP bằng khóa công khai tỉnh
  const kRaw = crypto.getRandomValues(new Uint8Array(32));
  const k = await crypto.subtle.importKey("raw", kRaw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const du = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, buf(ban.bytes)));
  const pub = await crypto.subtle.importKey("jwk", o.khoaTinh.congKhai, RSA, false, ["encrypt"]);
  const khoaBoc = b64(await crypto.subtle.encrypt(RSA, pub, kRaw));
  kRaw.fill(0);
  const t: Omit<ThongTinGoi, "chuKy"> = {
    dinhDang: DINH_DANG_GOI,
    phienBan: PHIEN_BAN_GOI,
    maGui: o.maGui,
    donViGui: o.donViGui.trim(),
    luc: ban.thongTin.luc,
    ungDung: o.ungDung,
    nguoiXuat: o.nguoiXuat,
    soDuAn: ban.thongTin.soDuAn,
    soHo: ban.thongTin.soHo,
    soBanDo: ban.thongTin.soBanDo,
    soDinhKem: ban.thongTin.soDinhKem ?? 0,
    tenDuAn: dsDa.map((d) => d.ten),
    khoaTinh: { vanTay: o.khoaTinh.vanTay, donVi: o.khoaTinh.donVi },
    khoaKy: { congKhai: o.khoaKy.congKhai, vanTay: o.khoaKy.vanTay },
    maHoa: { thuatToan: "AES-256-GCM", iv: b64(iv), khoaBoc },
    bamDuLieu: await sha256(du),
  };
  const bm = await crypto.subtle.importKey("jwk", o.khoaKy.biMat, EC, false, ["sign"]);
  const chuKy = b64(await crypto.subtle.sign(KY, bm, new TextEncoder().encode(chuoiKy(t))));
  const thongTin: ThongTinGoi = { ...t, chuKy };
  const zip = new PizZip();
  zip.file("thong-tin.json", JSON.stringify(thongTin, null, 2));
  zip.file("du-lieu.bin", du);
  return { bytes: zip.generate({ type: "uint8array", compression: "STORE" }), thongTin };
}

export const tenTepGoi = (donVi: string, luc: string) =>
  `GPMB-gui-tinh_${donVi.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}_${luc.slice(0, 10)}_${luc.slice(11, 16).replace(":", "")}${DUOI_GOI}`;

/* --------------------------- Đọc gói (cấp tỉnh) --------------------------- */

/** Đọc và kiểm tra phần ngoài: định dạng, chữ ký, mã băm dữ liệu (chưa cần khóa tỉnh). */
export async function docThongTinGoi(bytes: Uint8Array): Promise<{ thongTin: ThongTinGoi; du: Uint8Array }> {
  let zip: PizZip;
  try {
    zip = new PizZip(bytes);
  } catch {
    throw new LoiGoiTinh("Tệp không phải gói dữ liệu gửi tỉnh (không đọc được dạng nén).");
  }
  const tt = zip.file("thong-tin.json");
  const du = zip.file("du-lieu.bin")?.asUint8Array();
  if (!tt || !du) throw new LoiGoiTinh("Tệp thiếu thông tin hoặc dữ liệu (thong-tin.json, du-lieu.bin).");
  let t: ThongTinGoi;
  try {
    t = JSON.parse(tt.asText()) as ThongTinGoi;
  } catch {
    throw new LoiGoiTinh("Thông tin gói hỏng.");
  }
  if (t.dinhDang !== DINH_DANG_GOI) throw new LoiGoiTinh("Tệp không đúng định dạng gói gửi tỉnh của phần mềm GPMB Sơn La.");
  if (t.phienBan > PHIEN_BAN_GOI) throw new LoiGoiTinh(`Gói phiên bản ${t.phienBan} mới hơn phần mềm — cần cập nhật phần mềm.`);
  if ((await sha256(du)) !== t.bamDuLieu) throw new LoiGoiTinh("Dữ liệu trong gói không khớp mã kiểm tra — gói bị hỏng hoặc bị sửa. Không nhập.");
  let dung = false;
  try {
    if ((await vanTayChuoi(`${t.khoaKy.congKhai.x}.${t.khoaKy.congKhai.y}`)) === t.khoaKy.vanTay) {
      const { chuKy, ...con } = t;
      const pub = await crypto.subtle.importKey("jwk", t.khoaKy.congKhai, EC, false, ["verify"]);
      dung = await crypto.subtle.verify(KY, pub, buf(tuB64(chuKy)), new TextEncoder().encode(chuoiKy(con)));
    }
  } catch {
    dung = false;
  }
  if (!dung) throw new LoiGoiTinh("Chữ ký của đơn vị gửi không hợp lệ — gói bị sửa sau khi xuất. Không nhập.");
  return { thongTin: t, du };
}

/** Giải mã bằng khóa bí mật của tỉnh (đã mở bằng mật khẩu) → bản sao lưu đã kiểm tra (mã băm, số lượng). */
export async function giaiMaGoi(t: ThongTinGoi, du: Uint8Array, khoaBiMat: CryptoKey, vanTayTinh: string): Promise<BanSaoLuu> {
  if (t.khoaTinh.vanTay !== vanTayTinh) throw new LoiGoiTinh(`Gói được mã hóa cho khóa khác (vân tay ${nhomVanTay(t.khoaTinh.vanTay)}, ${t.khoaTinh.donVi}) — không phải khóa của máy này (${nhomVanTay(vanTayTinh)}).`);
  let trong: Uint8Array;
  try {
    const kRaw = new Uint8Array(await crypto.subtle.decrypt(RSA, khoaBiMat, buf(tuB64(t.maHoa.khoaBoc))));
    const k = await crypto.subtle.importKey("raw", kRaw, "AES-GCM", false, ["decrypt"]);
    kRaw.fill(0);
    trong = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(tuB64(t.maHoa.iv)) }, k, buf(du)));
  } catch {
    throw new LoiGoiTinh("Không giải mã được gói (khóa không đúng hoặc gói hỏng).");
  }
  const ban = await docBanSaoLuu(trong);
  if (ban.duAn.length !== t.soDuAn || ban.ho.length !== t.soHo) throw new LoiGoiTinh("Số dự án, hồ sơ trong gói không khớp thông tin ngoài.");
  return ban;
}

/** Tóm tắt một bản đã giải mã (đăng ký bộ chính sách đi kèm gói để tính đúng). */
export function tomTatBan(ban: BanSaoLuu, homNay: string): TomTatDuAn[] {
  if (Array.isArray(ban.caiDat?.goiChinhSach)) dangKyGoi(ban.caiDat.goiChinhSach as GoiDaNap[]);
  const dem = new Map<string, number>();
  for (const f of ban.dinhKem.filter((x) => !x.meta.daXoa)) dem.set(f.meta.duAnId, (dem.get(f.meta.duAnId) ?? 0) + 1);
  return tomTatDuAn(ban.duAn.filter((d) => !d.daXoa), ban.ho, (id) => dem.get(id) ?? 0, homNay);
}
