/**
 * Dựng thửa đất từ bản đồ DGN: khép vùng từ đường ranh thửa, gắn nhãn (tờ, thửa,
 * loại đất, diện tích, chủ sử dụng), xác định vùng ranh GPMB ứng viên và diện tích
 * thu hồi của từng thửa.
 *
 * Nguyên tắc: kết quả đọc bản đồ là DỮ LIỆU ĐỀ XUẤT. Mọi trường hợp không chắc chắn
 * (nhiều nhãn, thiếu nhãn, diện tích ghi trên bản đồ lệch diện tích hình học…) được
 * gắn cờ để cán bộ kiểm tra; phần mềm không tự chọn ranh GPMB.
 */
import GeometryFactory from "jsts/org/locationtech/jts/geom/GeometryFactory.js";
import Coordinate from "jsts/org/locationtech/jts/geom/Coordinate.js";
import UnaryUnionOp from "jsts/org/locationtech/jts/operation/union/UnaryUnionOp.js";
import Polygonizer from "jsts/org/locationtech/jts/operation/polygonize/Polygonizer.js";
import InteriorPointArea from "jsts/org/locationtech/jts/algorithm/InteriorPointArea.js";
import OverlayOp from "jsts/org/locationtech/jts/operation/overlay/OverlayOp.js";
import DistanceOp from "jsts/org/locationtech/jts/operation/distance/DistanceOp.js";
import IsValidOp from "jsts/org/locationtech/jts/operation/valid/IsValidOp.js";
import type Geometry from "jsts/org/locationtech/jts/geom/Geometry.js";
import PolygonCls from "jsts/org/locationtech/jts/geom/Polygon.js";
type Polygon = PolygonCls;
import type { Diem, KetQuaDocDgn, PhanTu, PhanTuChu } from "./dgn.js";
import { phanTuGoc } from "./dgn.js";
import { giaiMaTcvn3 } from "./tcvn3.js";

export interface CauHinhLop {
  ranhThua: number[];
  nhanThua: number[];
  soThua: number[];
  soTo: number[];
  chuSuDung: number[];
  ranhGpmb: number[];
  /** Bỏ vùng nhỏ hơn ngưỡng (m²) — mảnh vụn do vẽ chồng nét. */
  dienTichToiThieu: number;
  /** Lệch tương đối cho phép giữa diện tích ghi trên bản đồ và diện tích hình học. */
  lechDienTichChoPhep: number;
  /**
   * Nút chữ thuộc tính thửa (text node nhiều dòng đặt trong thửa, vd. bản đồ lập bằng gCadas:
   * tờ / thửa / địa chỉ / loại đất / chủ). `dong` = chỉ số dòng (từ 0) của từng trường trong nút.
   */
  nutThuocTinh?: CauHinhNut | null;
  /**
   * Lớp chữ ghi hiện trạng GPMB đặt trong thửa (vd. DC5: lớp 62 "Đã GPMB", "Chưa GPMB", "NQH").
   * Chỉ dùng để đối chiếu với tiến độ trong phần mềm — không ghi đè. Nhiều bản đồ không có lớp này.
   */
  nhanHienTrang?: number[];
  /** 0.9.27: lớp chữ loại đất riêng (vd. "CLN" tách khỏi số thửa / diện tích). */
  loaiDat?: number[];
  /** 0.9.27: lớp chữ diện tích riêng (nhận cả số nguyên "1310"). */
  dienTich?: number[];
  /**
   * 1.3.6: dung sai nối đầu mút ranh thửa (m) — đầu mút cách đường khác không quá giá trị này thì được kéo nối vào (bản vẽ
   * không bắt điểm). 0 / bỏ trống = không nối (mặc định). Là tham số kỹ thuật vẽ do cán bộ chọn, không phải quy định.
   */
  dungSaiNoi?: number;
}

/**
 * Trường của nút thuộc tính. 1.3.6: thêm diện tích, người đồng sử dụng (dòng tên thứ hai, vd. vợ/chồng), địa chỉ, ghi chú
 * (vd. "Ngoài") — đối chiếu 4 tệp trích đo gCadas V8 thật (đọc tại chỗ, không lưu vào kho).
 */
export type TruongNut = "soTo" | "soThua" | "loaiDat" | "chuSuDung" | "chuSuDung2" | "dienTich" | "diaChi" | "ghiChu";
export interface CauHinhNut {
  lop: number[];
  dong: Partial<Record<TruongNut, number>>;
}

/**
 * Cấu hình mặc định suy ra từ tệp mẫu GPMB.dgn do người dùng cung cấp
 * (bản đồ địa chính MicroStation V7, chữ TCVN3). Người dùng chỉnh được cho tệp khác.
 */
export const CAU_HINH_MAC_DINH: CauHinhLop = {
  ranhThua: [10],
  nhanThua: [13],
  soThua: [4],
  soTo: [5],
  chuSuDung: [6],
  ranhGpmb: [30],
  dienTichToiThieu: 5,
  lechDienTichChoPhep: 0.05,
};

export type CoThua =
  | "THIEU_SO_THUA"
  | "NHIEU_SO_THUA"
  | "THIEU_SO_TO"
  | "NHIEU_SO_TO"
  | "THIEU_DIEN_TICH_GHI"
  | "LECH_DIEN_TICH"
  | "THIEU_LOAI_DAT"
  | "NHIEU_CHU"
  | "THIEU_CHU"
  /** 1.3.6: chữ ở vị trí loại đất không phải ký hiệu loại đất (vd. "Mương", "2L") — giữ nguyên để cán bộ đối chiếu. */
  | "LOAI_DAT_LA"
  /** 1.3.6: nút / nhãn nằm ngoài mọi thửa, gán cho thửa gần nhất chưa có nhãn — cán bộ xác nhận. */
  | "GAN_THEO_KHOANG_CACH";

export interface NhanDoc {
  lop: number;
  chu: string;
  diem: Diem;
  stt: number;
  /** Trường lấy từ nút chữ thuộc tính (nếu dòng chữ thuộc nút đã cấu hình). */
  truongNut?: TruongNut;
  /** Vị trí dòng đầu của nút — nút được gán trọn cho thửa chứa điểm này. */
  neoNut?: Diem;
  /** Số tờ nhập tay của tệp chứa nhãn. */
  soToTep?: string;
}

export interface ThuaBanDo {
  /** Mã tạm trong phiên đọc: "T{tờ}-{thửa}" hoặc "V{chỉ số}" khi thiếu nhãn. */
  ma: string;
  soTo: string | null;
  soThua: string | null;
  loaiDatBanDo: string | null;
  dienTichGhi: number | null;
  dienTichHinhHoc: number;
  chuSuDung: string | null;
  vong: Diem[][]; // vòng ngoài + lỗ
  tamNhan: Diem;
  nhan: NhanDoc[];
  co: CoThua[];
  /** Chữ hiện trạng GPMB ghi trên bản đồ trong thửa (lớp nhanHienTrang), nếu có. */
  hienTrangBanDo?: string | null;
  /** Số tờ lấy theo số tờ cán bộ nhập cho tệp (1.3.5: ưu tiên hơn số tờ đọc trên bản đồ). */
  soToNhapTay?: boolean;
  /** 1.3.6: người đồng sử dụng (dòng tên thứ hai trong nút, hoặc tên thứ hai trong thửa). */
  dongSuDung?: string | null;
  /** 1.3.6: địa chỉ ghi trong nút thuộc tính. */
  diaChi?: string | null;
  /** 1.3.6: ghi chú trong nút thuộc tính (vd. "Ngoài"). Chỉ để đối chiếu, phần mềm không suy ra phạm vi thu hồi. */
  ghiChuBanDo?: string | null;
}

/** Phân loại chữ hiện trạng trên bản đồ: "Đã GPMB" → DA; "Chưa GPMB", "NQH" (ghi chú thửa chưa GPMB) → CHUA. */
export function loaiHienTrangBanDo(chu: string | null | undefined): "DA" | "CHUA" | null {
  if (!chu) return null;
  const c = chu.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toUpperCase();
  if (/CHUA\s*GPMB|^NQH$/.test(c)) return "CHUA";
  if (/DA\s*GPMB/.test(c)) return "DA";
  return null;
}

export interface VungUngVien {
  ma: string;
  /** 1.3.6: NOI_HAI_DAU — ranh dạng tuyến (hai nét song song không khép đầu): nối đầu mút hai nét dài nhất thành vùng. */
  nguon: "VUNG_KHEP_KIN" | "KHEP_TU_DUONG" | "NOI_HAI_DAU";
  sttPhanTu: number[];
  dienTich: number;
  chuVi: number;
  vong: Diem[][];
}

const gf = new GeometryFactory();

function laHinhTuyen(pt: PhanTu): pt is Extract<PhanTu, { diem: Diem[] }> {
  return "diem" in pt && Array.isArray(pt.diem) && pt.diem.length >= 2;
}

function thanhDuong(diem: Diem[]): Geometry | null {
  const toaDo = diem.map((d) => new Coordinate(d.x, d.y));
  if (toaDo.length < 2) return null;
  return gf.createLineString(toaDo);
}

function vongCua(p: Polygon): Diem[][] {
  const doc = (r: { getCoordinates(): Coordinate[] }) => r.getCoordinates().map((c: Coordinate) => ({ x: c.x, y: c.y }));
  const out = [doc(p.getExteriorRing())];
  for (let i = 0; i < p.getNumInteriorRing(); i++) out.push(doc(p.getInteriorRingN(i)));
  return out;
}

function trongVong(d: Diem, vong: Diem[]): boolean {
  let trong = false;
  for (let i = 0, j = vong.length - 1; i < vong.length; j = i++) {
    const a = vong[i]!;
    const b = vong[j]!;
    if (a.y > d.y !== b.y > d.y && d.x < ((b.x - a.x) * (d.y - a.y)) / (b.y - a.y) + a.x) trong = !trong;
  }
  return trong;
}

export function diemTrongThua(d: Diem, vong: Diem[][]): boolean {
  if (!vong[0] || !trongVong(d, vong[0])) return false;
  for (let i = 1; i < vong.length; i++) if (trongVong(d, vong[i]!)) return false;
  return true;
}

/** Khép vùng từ tập đường (tự cắt tại giao điểm). `treo` nhận các đầu mút treo (đường không khép được). */
function khepVung(duong: Geometry[], treo?: Diem[]): Polygon[] {
  if (duong.length === 0) return [];
  const hop = UnaryUnionOp.union(gf.createGeometryCollection(duong));
  const pz = new Polygonizer();
  pz.add(hop);
  const out: Polygon[] = [];
  const it = pz.getPolygons().iterator();
  while (it.hasNext()) out.push(it.next() as Polygon);
  if (treo) {
    // Đầu mút của đường treo có bậc 1 (không nối đường nào khác) — chỗ hở cần xem
    const dem = new Map<string, { d: Diem; n: number }>();
    const di = pz.getDangles().iterator();
    while (di.hasNext()) {
      const cs = (di.next() as unknown as { getCoordinates(): Coordinate[] }).getCoordinates();
      for (const c of [cs[0], cs[cs.length - 1]]) {
        if (!c) continue;
        const k = `${c.x},${c.y}`;
        const x = dem.get(k) ?? { d: { x: c.x, y: c.y }, n: 0 };
        x.n++;
        dem.set(k, x);
      }
    }
    // điểm xuất hiện đúng một lần trong các đường treo và không nằm trên cạnh vùng nào là đầu tự do
    for (const { d, n } of dem.values()) if (n === 1) treo.push(d);
  }
  return out;
}

/**
 * 1.3.6 — Nối đầu mút: đầu mút cách một đoạn của đường khác (hoặc của chính đường đó, trừ đoạn kề) không quá `dungSai` (m) thì
 * kéo dài tới điểm chiếu trên đoạn đó, vượt thêm 1 mm để phép giao chắc chắn cắt (đoạn vượt là đường treo, bị bỏ khi khép vùng).
 * Trả số đầu mút đã nối. Không đổi tọa độ các đỉnh có sẵn.
 */
export function noiDauMut(ds: Diem[][], dungSai: number): { duong: Diem[][]; soNoi: number; diemNoi: Diem[]; diemVuot: Diem[] } {
  if (!(dungSai > 0)) return { duong: ds, soNoi: 0, diemNoi: [], diemVuot: [] };
  const o = Math.max(1, dungSai * 4);
  const luoi = new Map<string, number[]>();
  const khoa = (x: number, y: number) => `${Math.floor(x / o)},${Math.floor(y / o)}`;
  ds.forEach((l, i) => {
    for (let j = 0; j + 1 < l.length; j++) {
      const a = l[j]!, b = l[j + 1]!;
      for (let x = Math.floor((Math.min(a.x, b.x) - dungSai) / o); x <= Math.floor((Math.max(a.x, b.x) + dungSai) / o); x++)
        for (let y = Math.floor((Math.min(a.y, b.y) - dungSai) / o); y <= Math.floor((Math.max(a.y, b.y) + dungSai) / o); y++) {
          const k = `${x},${y}`;
          const v = luoi.get(k);
          if (v) v.push(i, j);
          else luoi.set(k, [i, j]);
        }
    }
  });
  const out = ds.map((l) => [...l]);
  const diemNoi: Diem[] = [];
  const diemVuot: Diem[] = [];
  ds.forEach((l, i) => {
    if (l.length < 2) return;
    for (const cuoi of [false, true]) {
      const e = cuoi ? l[l.length - 1]! : l[0]!;
      let tot: { p: Diem; d: number } | null = null;
      let dinhSan = false;
      const v = luoi.get(khoa(e.x, e.y)) ?? [];
      for (let q = 0; q < v.length; q += 2) {
        const li = v[q]!, j = v[q + 1]!;
        if (li === i && (cuoi ? j === l.length - 2 : j === 0)) continue;
        const ll = ds[li]!;
        const a = ll[j]!, b = ll[j + 1]!;
        const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
        const t = L2 ? Math.max(0, Math.min(1, ((e.x - a.x) * dx + (e.y - a.y) * dy) / L2)) : 0;
        const p = { x: a.x + t * dx, y: a.y + t * dy };
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < 1e-6) { dinhSan = true; break; }
        if (d <= dungSai && (!tot || d < tot.d)) tot = { p, d };
      }
      if (dinhSan || !tot) continue;
      const ux = (tot.p.x - e.x) / tot.d, uy = (tot.p.y - e.y) / tot.d;
      const q = { x: tot.p.x + ux * 0.001, y: tot.p.y + uy * 0.001 };
      if (cuoi) out[i]!.push(q);
      else out[i]!.unshift(q);
      diemNoi.push(e);
      diemVuot.push(q);
    }
  });
  return { duong: out, soNoi: diemNoi.length, diemNoi, diemVuot };
}

/**
 * Phông TCVN3 chữ hoa có dấu nằm ở phông riêng (.VnTimeH) nên khi giải mã thành chữ
 * thường ("Đinh Ngọc ánh"). Tên người: viết hoa chữ cái đầu mỗi từ, giữ nguyên phần còn lại.
 */
export function vietHoaDauTu(s: string): string {
  return s.replace(/(^|\s)(\p{Ll})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

export function giaiMaNhan(pt: PhanTuChu): string {
  if (pt.chuUnicode !== undefined) return pt.chuUnicode.trim();
  return giaiMaTcvn3(pt.byteChu).chu.replace(/\s+/g, " ").trim();
}

const RE_GOP = /^(\d*[\p{L}+]+)\s*(\d+)\s*\/\s*(\d+(?:[.,]\d+)?)$/u;
const RE_LOAI = /^\d*[\p{L}+]+$/u;
const RE_DT = /^\d+[.,]\d+$/;
/** Diện tích viết kiểu Việt có phân cách hàng nghìn: "1.310,0", "1 310,5", "12.450". */
const RE_DT_VN = /^\d{1,3}([. ]\d{3})+(,\d+)?$/;
const RE_SO = /^\d+$/;
/** Tên người, tổ chức trong nhãn thửa: từ hai từ chữ trở lên ("Lèo Văn Pản", "UBND xã"). */
const RE_TEN = /^\p{L}[\p{L}.]*(\s+[\p{L}.]+)+$/u;
const soThuc = (s: string) => (RE_DT_VN.test(s) ? Number(s.replace(/[. ]/g, "").replace(",", ".")) : Number(s.replace(",", ".")));

function motHoacCo<T>(ds: T[], thieu: CoThua | null, nhieu: CoThua, co: CoThua[]): T | null {
  const duyNhat = [...new Set(ds)];
  if (duyNhat.length === 0) {
    if (thieu) co.push(thieu);
    return null;
  }
  if (duyNhat.length > 1) co.push(nhieu);
  return duyNhat[0] ?? null;
}

export interface KetQuaDungThua {
  thua: ThuaBanDo[];
  vungGpmb: VungUngVien[];
  nhanNgoaiThua: NhanDoc[];
  thongKe: {
    soDuongRanh: number;
    soVungTruocLoc: number;
    soVungBiLoai: number;
    /** 1.3.6: vùng nhỏ hơn ngưỡng nhưng có nút / nhãn số thửa — giữ lại (thửa nhỏ thật, vd. 0,1 m²). */
    soVungNhoGiuLai?: number;
    /** 1.3.6: số đầu mút đã nối theo dung sai. */
    soNoi?: number;
  };
  /** 1.3.6: đầu mút ranh thửa suýt chạm đường khác (≤ 0,5 m, chưa chạm) — chỗ hở do vẽ không bắt điểm, để cán bộ xem. */
  dauTreo?: Diem[];
}

/** 1.3.6: ký hiệu loại đất (chữ in hoa 2–4 ký tự, có thể ghép "+"), vd. "CLN", "ODT+CLN". */
export const RE_KY_HIEU_LOAI_DAT = /^[A-ZĐ]{2,4}(\+[A-ZĐ]{2,4})*$/u;

export function dungThua(ban: KetQuaDocDgn, ch: CauHinhLop = CAU_HINH_MAC_DINH): KetQuaDungThua {
  const thuoc = (ds: number[], lop: number) => ds.includes(lop);

  const duongRanhDiem: Diem[][] = [];
  const nhan: NhanDoc[] = [];
  const nutCh = ch.nutThuocTinh?.lop.length ? ch.nutThuocTinh : null;
  const truongTheoDong = new Map<number, TruongNut>();
  if (nutCh) for (const [k, v] of Object.entries(nutCh.dong)) if (v !== undefined) truongTheoDong.set(v, k as TruongNut);
  const dongTrongNut = new Map<number, number>(); // stt nút -> số dòng đã gặp
  const neo = new Map<number, Diem>(); // stt nút -> vị trí dòng đầu
  const nhanHt: NhanDoc[] = []; // chữ hiện trạng GPMB trên bản đồ
  for (const pt of phanTuGoc(ban)) {
    if (thuoc(ch.ranhThua, pt.lop) && laHinhTuyen(pt)) duongRanhDiem.push(pt.diem);
    if (pt.loai === "CHU") {
      if (nutCh && pt.nut !== undefined && thuoc(nutCh.lop, pt.lop)) {
        const i = dongTrongNut.get(pt.nut) ?? 0;
        dongTrongNut.set(pt.nut, i + 1);
        if (i === 0) neo.set(pt.nut, pt.goc);
        const truong = truongTheoDong.get(i);
        if (truong) nhan.push({ lop: pt.lop, chu: giaiMaNhan(pt), diem: pt.goc, stt: pt.stt, truongNut: truong, neoNut: neo.get(pt.nut) ?? pt.goc });
        continue;
      }
      if (ch.nhanHienTrang?.length && thuoc(ch.nhanHienTrang, pt.lop)) {
        nhanHt.push({ lop: pt.lop, chu: giaiMaNhan(pt), diem: pt.goc, stt: pt.stt });
        continue;
      }
      const laNhan = [ch.nhanThua, ch.soThua, ch.soTo, ch.chuSuDung, ch.loaiDat ?? [], ch.dienTich ?? []].some((ds) => thuoc(ds, pt.lop));
      if (laNhan) nhan.push({ lop: pt.lop, chu: giaiMaNhan(pt), diem: pt.goc, stt: pt.stt, ...(pt.soToTep ? { soToTep: pt.soToTep } : {}) });
    }
  }
  const tuNut = (ds: NhanDoc[], t: TruongNut) => ds.filter((n) => n.truongNut === t && n.chu);

  // Số tờ cán bộ nhập cho tệp: một giá trị cho cả bản vẽ thì dùng cho thửa không có nhãn mang số tờ
  const soToCacTep = new Set(phanTuGoc(ban).map((pt) => pt.soToTep).filter((x): x is string => !!x));
  const soToChung = soToCacTep.size === 1 ? [...soToCacTep][0]! : null;
  const noi = noiDauMut(duongRanhDiem, ch.dungSaiNoi ?? 0);
  const duongRanh = noi.duong.map(thanhDuong).filter((g): g is Geometry => !!g);
  const vung = khepVung(duongRanh);
  // Chỗ hở: đầu mút suýt chạm đường khác (0 < khoảng cách ≤ 0,5 m) — vẽ không bắt điểm. Không tính đầu mút tự do của nét đứng
  // riêng (gạch nhãn phân số, ký hiệu điểm) hay nét vượt qua đường khác (tệp thật TD111: 466 đầu tự do, phần lớn là gạch nhãn).
  const dauTreo = noiDauMut(noi.duong, 0.5).diemNoi.filter((d) => !noi.diemVuot.some((q) => Math.hypot(q.x - d.x, q.y - d.y) < 0.002));
  // 1.3.6: vùng nhỏ hơn ngưỡng vẫn giữ nếu có nút thuộc tính / nhãn số thửa (thửa nhỏ thật: 0,1–4,7 m² ở tệp trích đo thật)
  const neoThua = nhan.filter((n) => n.neoNut ? n.truongNut === "soThua" : thuoc(ch.soThua, n.lop) || thuoc(ch.nhanThua, n.lop)).map((n) => n.neoNut ?? n.diem);
  const coNeo = (p: Polygon) => {
    const env = p.getEnvelopeInternal();
    const v = vongCua(p);
    return neoThua.some((d) => env.contains(d.x, d.y) && diemTrongThua(d, v));
  };
  let soNhoGiu = 0;
  const giuLai = vung.filter((p) => {
    if (p.getArea() > ch.dienTichToiThieu) return true;
    if (p.getArea() > 0.01 && coNeo(p)) return ++soNhoGiu > 0;
    return false;
  });
  const daGan = new Set<number>();

  // Nhãn đơn: theo vị trí của chính nhãn; dòng của nút thuộc tính: theo vị trí dòng đầu của nút
  const nhanCua = giuLai.map((p) => {
    const vong = vongCua(p);
    const env = p.getEnvelopeInternal();
    const ds = nhan.filter((n) => {
      const d = n.neoNut ?? n.diem;
      return d.x >= env.getMinX() && d.x <= env.getMaxX() && d.y >= env.getMinY() && d.y <= env.getMaxY() && diemTrongThua(d, vong);
    });
    ds.forEach((n) => daGan.add(n.stt));
    return ds;
  });
  // 1.3.6: nút thuộc tính nằm ngoài mọi thửa (đặt lệch ra ngoài thửa nhỏ / hẹp) → thửa gần nhất (≤ 2 m) chưa có nút, gắn cờ để
  // cán bộ xác nhận. Nhãn rời (không thuộc nút) KHÔNG gán theo khoảng cách: trên tệp thật chúng thường là bộ nhãn khác (bản đồ
  // giao đất lâm nghiệp, hiện trạng cũ) đặt ngoài thửa — gán sẽ sai.
  const ganKc = new Set<number>();
  if (nutCh) {
    const moCoi = new Map<string, NhanDoc[]>();
    for (const n of nhan) if (n.neoNut && !daGan.has(n.stt)) {
      const k = `${n.neoNut.x},${n.neoNut.y}`;
      moCoi.set(k, [...(moCoi.get(k) ?? []), n]);
    }
    const coNut = nhanCua.map((ds) => ds.some((n) => n.truongNut));
    for (const ds of moCoi.values()) {
      const d = ds[0]!.neoNut!;
      const pt = gf.createPoint(new Coordinate(d.x, d.y));
      let tot = -1, kc = 2;
      giuLai.forEach((p, i) => {
        if (coNut[i]) return;
        const k = DistanceOp.distance(p, pt);
        if (k <= kc) [tot, kc] = [i, k];
      });
      if (tot < 0) continue;
      nhanCua[tot]!.push(...ds);
      ds.forEach((n) => daGan.add(n.stt));
      coNut[tot] = true;
      ganKc.add(tot);
    }
  }

  const thua: ThuaBanDo[] = giuLai.map((p, i) => {
    const vong = vongCua(p);
    const nhanTrong = nhanCua[i]!;
    const dtHinhHoc = p.getArea();
    const co: CoThua[] = ganKc.has(i) ? ["GAN_THEO_KHOANG_CACH"] : [];

    // Nhãn thửa: dạng gộp "LOẠI SỐ/DT" hoặc tách rời (loại, số, diện tích là 3 nhãn riêng)
    const gop: { loai: string; so: string; dt: number; n: NhanDoc }[] = [];
    const loai: NhanDoc[] = [];
    const dt: { dt: number; n: NhanDoc }[] = [];
    const so: NhanDoc[] = [];
    const tenTrongNhan: NhanDoc[] = []; // tên chủ ghi chung lớp nhãn thửa (nhãn nhiều nội dung)
    for (const n of nhanTrong.filter((n) => !n.truongNut && thuoc(ch.nhanThua, n.lop))) {
      const m = RE_GOP.exec(n.chu);
      if (m) gop.push({ loai: m[1]!, so: m[2]!, dt: soThuc(m[3]!), n });
      else if (RE_LOAI.test(n.chu)) loai.push(n);
      else if (RE_DT.test(n.chu) || RE_DT_VN.test(n.chu)) dt.push({ dt: soThuc(n.chu), n });
      else if (RE_SO.test(n.chu)) so.push(n);
      else if (RE_TEN.test(n.chu)) tenTrongNhan.push(n);
    }
    // Lớp loại đất, diện tích riêng (cán bộ chọn ở cấu hình lớp)
    for (const n of nhanTrong.filter((n) => !n.truongNut)) {
      if (ch.loaiDat?.length && thuoc(ch.loaiDat, n.lop) && RE_LOAI.test(n.chu)) loai.push(n);
      if (ch.dienTich?.length && thuoc(ch.dienTich, n.lop) && (RE_DT.test(n.chu) || RE_DT_VN.test(n.chu) || RE_SO.test(n.chu))) dt.push({ dt: soThuc(n.chu), n });
    }
    // Nhãn dạng phân số (số thửa trên, diện tích dưới) với diện tích là số nguyên ("13" / "1310"): khi chưa có nhãn diện tích
    // và có từ hai số, số gần diện tích hình học nhất (lệch ≤ 50%) là diện tích, các số còn lại là số thửa
    if (!dt.length && !gop.length && so.length >= 2) {
      const gan = so.reduce((a, b) => (Math.abs(soThuc(b.chu) - p.getArea()) < Math.abs(soThuc(a.chu) - p.getArea()) ? b : a));
      if (Math.abs(soThuc(gan.chu) - p.getArea()) / p.getArea() <= 0.5) {
        dt.push({ dt: soThuc(gan.chu), n: gan });
        so.splice(so.indexOf(gan), 1);
      }
    }
    loai.push(...tuNut(nhanTrong, "loaiDat").filter((n) => RE_LOAI.test(n.chu)));
    for (const n of tuNut(nhanTrong, "dienTich")) if (RE_DT.test(n.chu) || RE_DT_VN.test(n.chu) || RE_SO.test(n.chu)) dt.push({ dt: soThuc(n.chu), n });
    const soLop4 = [
      ...nhanTrong.filter((n) => !n.truongNut && thuoc(ch.soThua, n.lop) && RE_SO.test(n.chu)),
      ...tuNut(nhanTrong, "soThua").filter((n) => RE_SO.test(n.chu)),
    ];

    // Diện tích ghi: chọn giá trị gần diện tích hình học nhất (thửa có thể chứa nhãn của thửa lân cận)
    const tatCaDt = [...gop.map((g) => ({ dt: g.dt, n: g.n })), ...dt];
    let chon: { dt: number; n: NhanDoc } | null = null;
    for (const c of tatCaDt) if (!chon || Math.abs(c.dt - dtHinhHoc) < Math.abs(chon.dt - dtHinhHoc)) chon = c;
    const dienTichGhi = chon ? chon.dt : null;
    if (dienTichGhi === null) co.push("THIEU_DIEN_TICH_GHI");
    else if (Math.abs(dienTichGhi - dtHinhHoc) / dtHinhHoc > ch.lechDienTichChoPhep) co.push("LECH_DIEN_TICH");
    const gopKhop = chon ? gop.find((g) => g.n === chon!.n) : undefined;
    // Nhãn tách rời: lấy nhãn gần nhãn diện tích đã chọn nhất
    const ganNhat = (ds: NhanDoc[]): NhanDoc | undefined => {
      if (!chon || ds.length === 0) return ds.length === 1 ? ds[0] : undefined;
      const g = chon.n.diem;
      return ds.reduce((a, b) =>
        Math.hypot(b.diem.x - g.x, b.diem.y - g.y) < Math.hypot(a.diem.x - g.x, a.diem.y - g.y) ? b : a,
      );
    };

    let soThua: string | null;
    const soLop4DuyNhat = [...new Set(soLop4.map((n) => n.chu))];
    if (gopKhop) soThua = gopKhop.so;
    else if (soLop4DuyNhat.length === 1) soThua = soLop4DuyNhat[0]!;
    else if (so.length) soThua = ganNhat(so)?.chu ?? null;
    else soThua = ganNhat(soLop4)?.chu ?? null;
    if (!soThua) co.push("THIEU_SO_THUA");
    else if (soLop4DuyNhat.length > 1 && !soLop4DuyNhat.includes(soThua)) co.push("NHIEU_SO_THUA");
    if (soLop4DuyNhat.length > 1) co.push("NHIEU_SO_THUA");

    const loaiDatBanDo = gopKhop ? gopKhop.loai : (ganNhat(loai)?.chu ?? null);
    if (!loaiDatBanDo) co.push("THIEU_LOAI_DAT");
    else if (!RE_KY_HIEU_LOAI_DAT.test(loaiDatBanDo)) co.push("LOAI_DAT_LA");

    const soToDoc = [...nhanTrong.filter((n) => !n.truongNut && thuoc(ch.soTo, n.lop)), ...tuNut(nhanTrong, "soTo")].map((n) => n.chu);
    // 1.3.5: số tờ cán bộ nhập cho tệp (theo nhãn trong thửa, hoặc chung cả bản vẽ) dùng cho mọi thửa của tệp — số tờ thường
    // ghi ở khung tờ, không ghi trong thửa; chỉ khi tệp không có số tờ nhập tay mới nhận số tờ từ lớp chữ
    const soToTep = nhanTrong.find((n) => n.soToTep)?.soToTep ?? soToChung;
    const soTo = soToTep ?? motHoacCo(soToDoc, "THIEU_SO_TO", "NHIEU_SO_TO", co);
    const chuRieng = [...nhanTrong.filter((n) => !n.truongNut && thuoc(ch.chuSuDung, n.lop)), ...tuNut(nhanTrong, "chuSuDung")];
    const chuDs = (chuRieng.length ? chuRieng : tenTrongNhan).map((n) => vietHoaDauTu(n.chu));
    const chuSuDung = motHoacCo(chuDs, "THIEU_CHU", "NHIEU_CHU", co);
    // người đồng sử dụng: dòng tên thứ hai của nút; không có nút thì các tên khác cùng thửa (vẫn giữ cờ "Nhiều chủ")
    const chu2 = [...new Set([...tuNut(nhanTrong, "chuSuDung2").map((n) => vietHoaDauTu(n.chu)), ...(nutCh?.dong.chuSuDung2 === undefined ? chuDs : [])])].filter((x) => x !== chuSuDung);
    const motGiaTri = (t: TruongNut) => [...new Set(tuNut(nhanTrong, t).map((n) => n.chu.trim()).filter(Boolean))].join("; ") || null;

    const tam = InteriorPointArea.getInteriorPoint(p);
    return {
      ma: soTo && soThua ? `T${soTo}-${soThua}` : `V${i + 1}`,
      soTo,
      soThua,
      loaiDatBanDo,
      dienTichGhi,
      dienTichHinhHoc: dtHinhHoc,
      chuSuDung,
      vong,
      tamNhan: { x: tam.x, y: tam.y },
      nhan: nhanTrong,
      co: [...new Set(co)],
      hienTrangBanDo: nhanHt.length ? ([...new Set(nhanHt.filter((n) => diemTrongThua(n.diem, vong)).map((n) => n.chu))].join("; ") || null) : undefined,
      ...(soToTep ? { soToNhapTay: true } : {}),
      ...(chu2.length ? { dongSuDung: chu2.join("; ") } : {}),
      ...(nutCh?.dong.diaChi !== undefined ? { diaChi: motGiaTri("diaChi") } : {}),
      ...(nutCh?.dong.ghiChu !== undefined ? { ghiChuBanDo: motGiaTri("ghiChu") } : {}),
    };
  });

  // Vùng ranh GPMB ứng viên: vùng khép kín trên lớp ranh + vùng khép từ các đường
  const vungGpmb: VungUngVien[] = [];
  const duongGpmb: Geometry[] = [];
  const diemGpmb: Diem[][] = [];
  const sttGpmb: number[] = [];
  for (const pt of phanTuGoc(ban)) {
    if (!thuoc(ch.ranhGpmb, pt.lop) || !laHinhTuyen(pt)) continue;
    sttGpmb.push(pt.stt);
    const khepKin = pt.loai === "VUNG" || pt.loai === "VUNG_PHUC" || pt.loai === "ELIP";
    if (khepKin && pt.diem.length >= 4) {
      const vongDiem = [...pt.diem];
      const d0 = vongDiem[0]!;
      const dn = vongDiem[vongDiem.length - 1]!;
      if (d0.x !== dn.x || d0.y !== dn.y) vongDiem.push(d0);
      const pg = gf.createPolygon(gf.createLinearRing(vongDiem.map((d) => new Coordinate(d.x, d.y))));
      if (pg.getArea() > ch.dienTichToiThieu)
        vungGpmb.push({
          ma: `K${pt.stt}`,
          nguon: "VUNG_KHEP_KIN",
          sttPhanTu: [pt.stt],
          dienTich: pg.getArea(),
          chuVi: pg.getLength(),
          vong: vongCua(pg),
        });
    }
    const g = thanhDuong(pt.diem);
    if (g) {
      duongGpmb.push(g);
      if (!khepKin) diemGpmb.push(pt.diem);
    }
  }
  const khepDuoc = khepVung(duongGpmb).filter((p) => p.getArea() > ch.dienTichToiThieu);
  if (!khepDuoc.length && !vungGpmb.length) {
    const v = khepHaiDau(diemGpmb);
    if (v && v.getArea() > ch.dienTichToiThieu) vungGpmb.push({ ma: "N1", nguon: "NOI_HAI_DAU", sttPhanTu: sttGpmb, dienTich: v.getArea(), chuVi: v.getLength(), vong: vongCua(v) });
  }
  khepDuoc
    .filter((p) => p.getArea() > ch.dienTichToiThieu)
    .forEach((p, i) =>
      vungGpmb.push({
        ma: `D${i + 1}`,
        nguon: "KHEP_TU_DUONG",
        sttPhanTu: sttGpmb,
        dienTich: p.getArea(),
        chuVi: p.getLength(),
        vong: vongCua(p),
      }),
    );
  // Bỏ vùng khép từ đường trùng với vùng khép kín đã có (cùng diện tích, chu vi)
  const trung = (a: VungUngVien, b: VungUngVien) =>
    Math.abs(a.dienTich - b.dienTich) < 0.01 && Math.abs(a.chuVi - b.chuVi) < 0.01;
  const khepKin = vungGpmb.filter((v) => v.nguon === "VUNG_KHEP_KIN");
  const conLai = vungGpmb.filter((v) => v.nguon === "VUNG_KHEP_KIN" || !khepKin.some((k) => trung(k, v)));
  vungGpmb.length = 0;
  vungGpmb.push(...conLai.sort((a, b) => b.dienTich - a.dienTich));

  return {
    thua,
    vungGpmb,
    nhanNgoaiThua: nhan.filter((n) => !daGan.has(n.stt)),
    thongKe: { soDuongRanh: duongRanh.length, soVungTruocLoc: vung.length, soVungBiLoai: vung.length - giuLai.length, soVungNhoGiuLai: soNhoGiu, soNoi: noi.soNoi },
    dauTreo,
  };
}

const dai = (d: Diem[]) => d.reduce((a, p, i) => (i ? a + Math.hypot(p.x - d[i - 1]!.x, p.y - d[i - 1]!.y) : 0), 0);

/**
 * 1.3.6 (BĐ-9) — Ranh GPMB dạng tuyến (đường, kênh): hai nét mép tuyến không khép đầu. Lấy hai nét dài nhất (nét nối liền nhau
 * trước đó: nét gấp khúc), nối đầu mút theo cặp ngắn hơn (đầu–đầu, cuối–cuối hoặc chéo) thành vùng. Chỉ nhận khi mỗi đoạn nối
 * ngắn hơn 1/4 chiều dài nét ngắn và vùng hợp lệ (không tự cắt). Cán bộ xác nhận — không phải ranh do cơ quan có thẩm quyền vẽ.
 */
export function khepHaiDau(ds: Diem[][]): Polygon | null {
  const net = ds.filter((d) => d.length >= 2).sort((a, b) => dai(b) - dai(a));
  if (net.length < 2) return null;
  const [a, b] = [net[0]!, net[1]!];
  const kc = (p: Diem, q: Diem) => Math.hypot(p.x - q.x, p.y - q.y);
  const [a0, a1, b0, b1] = [a[0]!, a[a.length - 1]!, b[0]!, b[b.length - 1]!];
  const cung = kc(a1, b1) + kc(a0, b0); // a → b ngược
  const cheo = kc(a1, b0) + kc(a0, b1); // a → b xuôi
  const vong = cung <= cheo ? [...a, ...[...b].reverse()] : [...a, ...b];
  const noi = cung <= cheo ? [kc(a1, b1), kc(a0, b0)] : [kc(a1, b0), kc(a0, b1)];
  if (Math.max(...noi) > Math.min(dai(a), dai(b)) / 4) return null;
  vong.push(vong[0]!);
  try {
    const pg = gf.createPolygon(gf.createLinearRing(vong.map((d) => new Coordinate(d.x, d.y))));
    return new IsValidOp(pg).isValid() ? pg : null;
  } catch {
    return null;
  }
}

function thanhDaGiac(vong: Diem[][]): Polygon {
  const ring = (v: Diem[]) => gf.createLinearRing(v.map((d) => new Coordinate(d.x, d.y)));
  const [ngoai, ...lo] = vong;
  return gf.createPolygon(ring(ngoai!), lo.map(ring));
}

export interface DienTichThuHoi {
  ma: string;
  dienTichHinhHoc: number;
  dienTichThuHoi: number;
  /** "TOAN_BO" khi phần ngoài ranh ≤ dung sai; "MOT_PHAN"; "NGOAI" khi không giao. */
  phamVi: "TOAN_BO" | "MOT_PHAN" | "NGOAI";
  vongThuHoi: Diem[][][];
}

/**
 * Diện tích thu hồi = phần giao hình học giữa thửa và vùng ranh GPMB đã được cán bộ chọn.
 * Diện tích dùng lập phương án vẫn phải theo hồ sơ đo đạc/trích đo được duyệt; số liệu
 * này để đối chiếu.
 */
export function tinhDienTichThuHoi(
  thua: ThuaBanDo[],
  ranh: Diem[][][],
  dungSai = 0.05,
): DienTichThuHoi[] {
  const vungRanh = ranh.map(thanhDaGiac);
  const hopRanh = vungRanh.length === 1 ? vungRanh[0]! : UnaryUnionOp.union(gf.createGeometryCollection(vungRanh));
  const envR = hopRanh.getEnvelopeInternal();
  return thua.map((t) => {
    const p = thanhDaGiac(t.vong);
    let giao: Geometry | null = null;
    if (p.getEnvelopeInternal().intersects(envR)) giao = OverlayOp.intersection(p, hopRanh);
    const dt = giao ? giao.getArea() : 0;
    const vongThuHoi: Diem[][][] = [];
    if (giao)
      for (let i = 0; i < giao.getNumGeometries(); i++) {
        const g = giao.getGeometryN(i);
        if (g instanceof PolygonCls) vongThuHoi.push(vongCua(g));
      }
    const phamVi = dt <= dungSai ? "NGOAI" : t.dienTichHinhHoc - dt <= dungSai ? "TOAN_BO" : "MOT_PHAN";
    return { ma: t.ma, dienTichHinhHoc: t.dienTichHinhHoc, dienTichThuHoi: phamVi === "NGOAI" ? 0 : dt, phamVi, vongThuHoi };
  });
}
