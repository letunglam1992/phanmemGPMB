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
import type Geometry from "jsts/org/locationtech/jts/geom/Geometry.js";
import PolygonCls from "jsts/org/locationtech/jts/geom/Polygon.js";
type Polygon = PolygonCls;
import type { Diem, KetQuaDocDgn, PhanTu, PhanTuChu } from "./dgn.js";
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
}

export type TruongNut = "soTo" | "soThua" | "loaiDat" | "chuSuDung";
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
  | "THIEU_CHU";

export interface NhanDoc {
  lop: number;
  chu: string;
  diem: Diem;
  stt: number;
  /** Trường lấy từ nút chữ thuộc tính (nếu dòng chữ thuộc nút đã cấu hình). */
  truongNut?: TruongNut;
  /** Vị trí dòng đầu của nút — nút được gán trọn cho thửa chứa điểm này. */
  neoNut?: Diem;
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
}

export interface VungUngVien {
  ma: string;
  nguon: "VUNG_KHEP_KIN" | "KHEP_TU_DUONG";
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

/** Khép vùng từ tập đường (tự cắt tại giao điểm). */
function khepVung(duong: Geometry[]): Polygon[] {
  if (duong.length === 0) return [];
  const hop = UnaryUnionOp.union(gf.createGeometryCollection(duong));
  const pz = new Polygonizer();
  pz.add(hop);
  const out: Polygon[] = [];
  const it = pz.getPolygons().iterator();
  while (it.hasNext()) out.push(it.next() as Polygon);
  return out;
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
const RE_SO = /^\d+$/;
const soThuc = (s: string) => Number(s.replace(",", "."));

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
  thongKe: { soDuongRanh: number; soVungTruocLoc: number; soVungBiLoai: number };
}

export function dungThua(ban: KetQuaDocDgn, ch: CauHinhLop = CAU_HINH_MAC_DINH): KetQuaDungThua {
  const thuoc = (ds: number[], lop: number) => ds.includes(lop);

  const duongRanh: Geometry[] = [];
  const nhan: NhanDoc[] = [];
  const nutCh = ch.nutThuocTinh?.lop.length ? ch.nutThuocTinh : null;
  const truongTheoDong = new Map<number, TruongNut>();
  if (nutCh) for (const [k, v] of Object.entries(nutCh.dong)) if (v !== undefined) truongTheoDong.set(v, k as TruongNut);
  const dongTrongNut = new Map<number, number>(); // stt nút -> số dòng đã gặp
  const neo = new Map<number, Diem>(); // stt nút -> vị trí dòng đầu
  for (const pt of ban.phanTu) {
    if (thuoc(ch.ranhThua, pt.lop) && laHinhTuyen(pt)) {
      const g = thanhDuong(pt.diem);
      if (g) duongRanh.push(g);
    }
    if (pt.loai === "CHU") {
      if (nutCh && pt.nut !== undefined && thuoc(nutCh.lop, pt.lop)) {
        const i = dongTrongNut.get(pt.nut) ?? 0;
        dongTrongNut.set(pt.nut, i + 1);
        if (i === 0) neo.set(pt.nut, pt.goc);
        const truong = truongTheoDong.get(i);
        if (truong) nhan.push({ lop: pt.lop, chu: giaiMaNhan(pt), diem: pt.goc, stt: pt.stt, truongNut: truong, neoNut: neo.get(pt.nut) ?? pt.goc });
        continue;
      }
      const laNhan = [ch.nhanThua, ch.soThua, ch.soTo, ch.chuSuDung].some((ds) => thuoc(ds, pt.lop));
      if (laNhan) nhan.push({ lop: pt.lop, chu: giaiMaNhan(pt), diem: pt.goc, stt: pt.stt });
    }
  }
  const tuNut = (ds: NhanDoc[], t: TruongNut) => ds.filter((n) => n.truongNut === t && n.chu);

  const vung = khepVung(duongRanh);
  const giuLai = vung.filter((p) => p.getArea() > ch.dienTichToiThieu);
  const daGan = new Set<number>();

  const thua: ThuaBanDo[] = giuLai.map((p, i) => {
    const vong = vongCua(p);
    const env = p.getEnvelopeInternal();
    // Nhãn đơn: theo vị trí của chính nhãn; dòng của nút thuộc tính: theo vị trí dòng đầu của nút
    const nhanTrong = nhan.filter((n) => {
      const d = n.neoNut ?? n.diem;
      return d.x >= env.getMinX() && d.x <= env.getMaxX() && d.y >= env.getMinY() && d.y <= env.getMaxY() && diemTrongThua(d, vong);
    });
    nhanTrong.forEach((n) => daGan.add(n.stt));
    const dtHinhHoc = p.getArea();
    const co: CoThua[] = [];

    // Nhãn thửa: dạng gộp "LOẠI SỐ/DT" hoặc tách rời (loại, số, diện tích là 3 nhãn riêng)
    const gop: { loai: string; so: string; dt: number; n: NhanDoc }[] = [];
    const loai: NhanDoc[] = [];
    const dt: { dt: number; n: NhanDoc }[] = [];
    const so: NhanDoc[] = [];
    for (const n of nhanTrong.filter((n) => !n.truongNut && thuoc(ch.nhanThua, n.lop))) {
      const m = RE_GOP.exec(n.chu);
      if (m) gop.push({ loai: m[1]!, so: m[2]!, dt: soThuc(m[3]!), n });
      else if (RE_LOAI.test(n.chu)) loai.push(n);
      else if (RE_DT.test(n.chu)) dt.push({ dt: soThuc(n.chu), n });
      else if (RE_SO.test(n.chu)) so.push(n);
    }
    loai.push(...tuNut(nhanTrong, "loaiDat").filter((n) => RE_LOAI.test(n.chu)));
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

    const soTo = motHoacCo(
      [...nhanTrong.filter((n) => !n.truongNut && thuoc(ch.soTo, n.lop)), ...tuNut(nhanTrong, "soTo")].map((n) => n.chu),
      "THIEU_SO_TO",
      "NHIEU_SO_TO",
      co,
    );
    const chuDs = [...nhanTrong.filter((n) => !n.truongNut && thuoc(ch.chuSuDung, n.lop)), ...tuNut(nhanTrong, "chuSuDung")].map((n) =>
      vietHoaDauTu(n.chu),
    );
    const chuSuDung = motHoacCo(chuDs, "THIEU_CHU", "NHIEU_CHU", co);

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
    };
  });

  // Vùng ranh GPMB ứng viên: vùng khép kín trên lớp ranh + vùng khép từ các đường
  const vungGpmb: VungUngVien[] = [];
  const duongGpmb: Geometry[] = [];
  const sttGpmb: number[] = [];
  for (const pt of ban.phanTu) {
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
    if (g) duongGpmb.push(g);
  }
  khepVung(duongGpmb)
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
    thongKe: { soDuongRanh: duongRanh.length, soVungTruocLoc: vung.length, soVungBiLoai: vung.length - giuLai.length },
  };
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
