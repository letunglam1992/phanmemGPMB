/**
 * Ranh GPMB nhập ngoài bản đồ đang xem (docs/08 §9 hạng mục 1): từ bảng tọa độ mốc (Excel/CSV), từ vùng khép kín của tệp
 * DGN khác, hoặc vẽ trên bản đồ. Kết quả là đa giác VN-2000 cùng hệ với bản đồ — dùng chung phép giao `tinhDienTichThuHoi`.
 */
import GeometryFactory from "jsts/org/locationtech/jts/geom/GeometryFactory.js";
import Coordinate from "jsts/org/locationtech/jts/geom/Coordinate.js";
import IsValidOp from "jsts/org/locationtech/jts/operation/valid/IsValidOp.js";
import OverlayOp from "jsts/org/locationtech/jts/operation/overlay/OverlayOp.js";
import BufferOp from "jsts/org/locationtech/jts/operation/buffer/BufferOp.js";
import PolygonCls from "jsts/org/locationtech/jts/geom/Polygon.js";
import type Geometry from "jsts/org/locationtech/jts/geom/Geometry.js";
import type Polygon from "jsts/org/locationtech/jts/geom/Polygon.js";
import type { Diem, KetQuaDocDgn } from "./dgn.js";
import { CAU_HINH_MAC_DINH, diemTrongThua, dungThua, type ThuaBanDo, type VungUngVien } from "./thua.js";

const gf = new GeometryFactory();

export interface KiemTraVung {
  vong: Diem[];
  dienTich: number;
  hopLe: boolean;
  loi: string | null;
}

/** Khép vòng (bỏ điểm trùng liên tiếp), tính diện tích, kiểm tra tự cắt. */
export function kiemTraVung(diem: Diem[]): KiemTraVung {
  const v: Diem[] = [];
  for (const d of diem) if (!v.length || Math.hypot(d.x - v[v.length - 1]!.x, d.y - v[v.length - 1]!.y) > 1e-6) v.push(d);
  if (v.length > 1 && Math.hypot(v[0]!.x - v[v.length - 1]!.x, v[0]!.y - v[v.length - 1]!.y) <= 1e-6) v.pop();
  if (v.length < 3) return { vong: v, dienTich: 0, hopLe: false, loi: `Cần ít nhất 3 điểm mốc (có ${v.length})` };
  const kin = [...v, v[0]!];
  const p = gf.createPolygon(gf.createLinearRing(kin.map((d) => new Coordinate(d.x, d.y))));
  const dt = p.getArea();
  const [a, b] = [v[0]!, v[1]!];
  const thangHang = v.every((c) => Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 1e-6);
  if (thangHang) return { vong: kin, dienTich: 0, hopLe: false, loi: "Các điểm thẳng hàng — không tạo được vùng" };
  const op = new IsValidOp(p);
  if (!op.isValid()) {
    const e = op.getValidationError();
    const c = e?.getCoordinate();
    return { vong: kin, dienTich: dt, hopLe: false, loi: `Ranh tự cắt${c ? ` gần điểm (${c.x.toFixed(2)}; ${c.y.toFixed(2)})` : ""} — kiểm tra thứ tự các mốc` };
  }
  return { vong: kin, dienTich: dt, hopLe: true, loi: null };
}

const soO = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s/g, "");
  if (!s) return null;
  // 2352123,45 hoặc 2.352.123,45 (kiểu Việt) / 2352123.45
  const chuan = /,\d{1,4}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(chuan);
  return Number.isFinite(n) ? n : null;
};
const khongDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

export interface KetQuaDocMoc {
  vung: { ten: string; diem: Diem[] }[];
  /** true: cột X của bảng là tọa độ Bắc (quy ước trắc địa VN-2000) → đã đổi sang x = Đông (Y), y = Bắc (X) như bản đồ. */
  doiTruc: boolean;
  canhBao: string[];
}

/**
 * Đọc bảng tọa độ mốc ranh GPMB. Nhận cột tiêu đề "X", "Y" (hoặc hai cột số đầu tiên), cột tên mốc ("Tên mốc", "Mốc",
 * "Điểm", "STT") và cột vùng ("Vùng", "Khu", "Ranh") nếu có. Dòng trống hoặc đổi tên vùng → bắt đầu vùng mới.
 * Theo quy ước trắc địa VN-2000, X là tọa độ Bắc (≈ 2.xxx.xxx m ở Sơn La), Y là tọa độ Đông (≈ 4xx.xxx–5xx.xxx m):
 * cột X có giá trị lớn hơn cột Y thì đổi trục cho khớp bản đồ DGN (x = Đông, y = Bắc).
 */
export function docToaDoMoc(bang: unknown[][]): KetQuaDocMoc {
  const canhBao: string[] = [];
  let dau = -1;
  let cX = -1, cY = -1, cTen = -1, cVung = -1;
  for (let r = 0; r < Math.min(bang.length, 15) && dau < 0; r++) {
    const hang = bang[r] ?? [];
    hang.forEach((o, c) => {
      const t = typeof o === "string" ? khongDau(o) : "";
      if (!t) return;
      if (cX < 0 && /^(toa do )?x( \(m\))?$|^x \(|^x$/.test(t)) cX = c;
      else if (cY < 0 && /^(toa do )?y( \(m\))?$|^y \(|^y$/.test(t)) cY = c;
      else if (cTen < 0 && /^(ten moc|moc|ten diem|diem|so hieu|stt|tt)\b/.test(t)) cTen = c;
      else if (cVung < 0 && /^(vung|khu|ranh|thua)\b/.test(t)) cVung = c;
    });
    if (cX >= 0 && cY >= 0) dau = r;
    else (cX = -1), (cY = -1), (cTen = -1), (cVung = -1);
  }
  if (dau < 0) {
    // Không có tiêu đề X, Y: lấy hai cột số đầu tiên của dòng có ít nhất hai số
    for (const hang of bang) {
      const so = (hang ?? []).map((o, c) => (soO(o) !== null ? c : -1)).filter((c) => c >= 0);
      if (so.length >= 2) {
        [cX, cY] = [so[so.length - 2]!, so[so.length - 1]!];
        cTen = so[0]! > 0 ? 0 : -1;
        break;
      }
    }
    if (cX < 0) return { vung: [], doiTruc: false, canhBao: ["Không tìm thấy cột tọa độ X, Y trong bảng"] };
    canhBao.push(`Không có tiêu đề X, Y — dùng cột ${cX + 1}, ${cY + 1} làm X, Y`);
  }
  const vung: { ten: string; diem: Diem[]; x: number[] }[] = [];
  let hienTai: { ten: string; diem: Diem[]; x: number[] } | null = null;
  let tenVungTruoc = "";
  for (let r = dau + 1; r < bang.length; r++) {
    const hang = bang[r] ?? [];
    const x = soO(hang[cX]), y = soO(hang[cY]);
    const tenVung = cVung >= 0 ? String(hang[cVung] ?? "").trim() : "";
    if (x === null || y === null) {
      if (hang.some((o) => o !== null && o !== undefined && String(o).trim() !== "")) {
        if (hienTai?.diem.length) canhBao.push(`Dòng ${r + 1}: bỏ qua (không đọc được tọa độ)`);
        continue;
      }
      hienTai = null; // dòng trống → vùng mới
      continue;
    }
    if (!hienTai || (cVung >= 0 && tenVung && tenVung !== tenVungTruoc)) {
      hienTai = { ten: tenVung || `Ranh ${vung.length + 1}`, diem: [], x: [] };
      vung.push(hienTai);
    }
    if (tenVung) tenVungTruoc = tenVung;
    hienTai.diem.push({ x, y });
    hienTai.x.push(x);
  }
  const tatCa = vung.flatMap((v) => v.diem);
  const tb = (f: (d: Diem) => number) => tatCa.reduce((s, d) => s + f(d), 0) / Math.max(tatCa.length, 1);
  const doiTruc = tatCa.length > 0 && tb((d) => d.x) > tb((d) => d.y);
  return {
    vung: vung.map((v) => ({ ten: v.ten, diem: doiTruc ? v.diem.map((d) => ({ x: d.y, y: d.x })) : v.diem })),
    doiTruc,
    canhBao,
  };
}

/** Vùng khép kín (vùng, vùng phức hoặc khép từ đường) trên một lớp của tệp DGN khác — làm ranh GPMB. */
export function vungTuLop(ban: KetQuaDocDgn, lop: number, dienTichToiThieu = 1): VungUngVien[] {
  return dungThua(ban, { ...CAU_HINH_MAC_DINH, ranhThua: [], nhanThua: [], soThua: [], soTo: [], chuSuDung: [], nutThuocTinh: null, nhanHienTrang: [], ranhGpmb: [lop], dienTichToiThieu }).vungGpmb;
}

const daGiac = (vong: Diem[][]) => {
  const ring = (v: Diem[]) => gf.createLinearRing(v.map((d) => new Coordinate(d.x, d.y)));
  return gf.createPolygon(ring(vong[0]!), vong.slice(1).map(ring));
};
const vongCuaPg = (p: Polygon): Diem[][] => {
  const doc = (r: { getCoordinates(): Coordinate[] }) => r.getCoordinates().map((c: Coordinate) => ({ x: c.x, y: c.y }));
  const out = [doc(p.getExteriorRing())];
  for (let i = 0; i < p.getNumInteriorRing(); i++) out.push(doc(p.getInteriorRingN(i)));
  return out;
};

/**
 * Phần còn lại của thửa sau thu hồi = thửa − phần giao với ranh (vongThuHoi của tinhDienTichThuHoi). Ranh cắt thửa thành
 * nhiều mảnh thì mỗi mảnh là một phần còn lại riêng (sắp giảm dần theo diện tích); bỏ mảnh vụn < 0,05 m².
 */
export function phanConLai(vongThua: Diem[][], vongThuHoi: Diem[][][]): { vong: Diem[][]; dienTich: number }[] {
  let g: Geometry = daGiac(vongThua);
  for (const v of vongThuHoi) g = OverlayOp.difference(g, daGiac(v));
  const out: { vong: Diem[][]; dienTich: number }[] = [];
  for (let i = 0; i < g.getNumGeometries(); i++) {
    const x = g.getGeometryN(i);
    if (x instanceof PolygonCls && x.getArea() >= 0.05) out.push({ vong: vongCuaPg(x), dienTich: x.getArea() });
  }
  return out.sort((a, b) => b.dienTich - a.dienTich);
}

/**
 * Điều kiện cần để "dựng được hình chữ nhật có cạnh chiều rộng tối thiểu w" trong ranh thửa (Điều 13, 16 PL I QĐ 106/2025):
 * co vùng vào trong w/2 mà còn diện tích (đặt vừa hình tròn đường kính w). false → chắc chắn không dựng được; true → chưa đủ để
 * kết luận (cán bộ kiểm tra trên bản đồ).
 */
export function coTheDungRong(vong: Diem[][], w: number): boolean {
  return !BufferOp.bufferOp(daGiac(vong), -w / 2).isEmpty();
}

/**
 * Ghép nhiều tệp DGN (nhiều tờ bản đồ, mảnh trích đo của cùng dự án — docs/08 §9.9) thành một bản vẽ: nối phần tử, đánh lại
 * số thứ tự (stt) và số nút chữ để không trùng giữa các tệp. Các tệp phải cùng hệ tọa độ VN-2000 (cùng kinh tuyến trục).
 */
export function ghepBanDo(ds: { ten: string; ban: KetQuaDocDgn }[]): KetQuaDocDgn {
  if (!ds.length) throw new Error("Không có tệp nào để ghép");
  const phanTu: KetQuaDocDgn["phanTu"] = [];
  const canhBao: string[] = [];
  let lech = 0;
  for (const { ten, ban } of ds) {
    let max = -1;
    for (const pt of ban.phanTu) {
      max = Math.max(max, pt.stt, pt.loai === "CHU" && pt.nut !== undefined ? pt.nut : -1);
      const moi = { ...pt, stt: pt.stt + lech } as typeof pt;
      if (moi.loai === "CHU" && moi.nut !== undefined) moi.nut += lech;
      if (moi.loai === "CHUOI_PHUC" || moi.loai === "VUNG_PHUC") moi.thanhPhan = moi.thanhPhan.map((x) => ({ ...x, stt: x.stt + lech }));
      phanTu.push(moi);
    }
    lech += max + 1;
    for (const c of ban.canhBao) canhBao.push(ds.length > 1 ? `[${ten}] ${c}` : c);
  }
  return { ...ds[0]!.ban, phanTu, canhBao };
}

export interface SoSanhThua {
  ma: string;
  soTo: string | null;
  soThua: string | null;
  /** GIONG: không đổi; DOI_DT: diện tích hình học lệch; DOI_HINH: cùng diện tích nhưng lệch hình (phần khác biệt đáng kể);
   * MOI: chỉ có ở bản mới; MAT: chỉ có ở bản cũ */
  trangThai: "GIONG" | "DOI_DT" | "DOI_HINH" | "MOI" | "MAT";
  dtCu: number | null;
  dtMoi: number | null;
  /** Diện tích phần khác biệt đối xứng (m²) */
  khacBiet: number;
  vongCu?: Diem[][];
  vongMoi?: Diem[][];
}

/**
 * So sánh hai bản đồ (vd. trích đo lần đầu và trích đo bổ sung — docs/08 §9.8): ghép thửa theo số tờ, số thửa; thửa không có
 * số ghép theo vị trí tâm nhãn. Đổi diện tích khi lệch > dungSaiDt (m²) và > 0,1%; đổi hình khi phần khác biệt đối xứng > dungSaiHinh (m²).
 */
export function soSanhBanDo(cu: ThuaBanDo[], moi: ThuaBanDo[], dungSaiDt = 0.5, dungSaiHinh = 1): SoSanhThua[] {
  const khoa = (t: ThuaBanDo) => (t.soTo && t.soThua ? `${t.soTo}-${t.soThua}` : null);
  const theoKhoa = new Map<string, ThuaBanDo>();
  for (const t of cu) if (khoa(t)) theoKhoa.set(khoa(t)!, t);
  const daGhep = new Set<ThuaBanDo>();
  const out: SoSanhThua[] = [];
  for (const m of moi) {
    let c = khoa(m) ? theoKhoa.get(khoa(m)!) : undefined;
    if (!c) c = cu.find((x) => !daGhep.has(x) && !khoa(x) && diemTrongThua(m.tamNhan, x.vong));
    if (!c || daGhep.has(c)) {
      out.push({ ma: m.ma, soTo: m.soTo, soThua: m.soThua, trangThai: "MOI", dtCu: null, dtMoi: m.dienTichHinhHoc, khacBiet: m.dienTichHinhHoc, vongMoi: m.vong });
      continue;
    }
    daGhep.add(c);
    const kb = OverlayOp.symDifference(daGiac(c.vong), daGiac(m.vong)).getArea();
    const lechDt = Math.abs(m.dienTichHinhHoc - c.dienTichHinhHoc);
    const trangThai = lechDt > dungSaiDt && lechDt > c.dienTichHinhHoc * 0.001 ? "DOI_DT" : kb > dungSaiHinh ? "DOI_HINH" : "GIONG";
    out.push({ ma: m.ma, soTo: m.soTo, soThua: m.soThua, trangThai, dtCu: c.dienTichHinhHoc, dtMoi: m.dienTichHinhHoc, khacBiet: kb, vongCu: c.vong, vongMoi: m.vong });
  }
  for (const c of cu) if (!daGhep.has(c)) out.push({ ma: c.ma, soTo: c.soTo, soThua: c.soThua, trangThai: "MAT", dtCu: c.dienTichHinhHoc, dtMoi: null, khacBiet: c.dienTichHinhHoc, vongCu: c.vong });
  return out;
}

export interface DiemBang {
  ten: string;
  x: number;
  y: number;
  moTa: string;
}

/**
 * Bảng điểm đo hiện trạng (docs/08 §9.7): cột Tên/Số hiệu điểm · X · Y · Mô tả/Ghi chú (tọa độ VN-2000, m). Đổi trục như
 * `docToaDoMoc` (X là tọa độ Bắc theo quy ước trắc địa).
 */
export function docBangDiem(bang: unknown[][]): { diem: DiemBang[]; doiTruc: boolean; canhBao: string[] } {
  let dau = -1, cX = -1, cY = -1, cTen = -1, cMoTa = -1;
  for (let r = 0; r < Math.min(bang.length, 15) && dau < 0; r++) {
    let x = -1, y = -1, ten = -1, mt = -1;
    (bang[r] ?? []).forEach((o, c) => {
      const t = typeof o === "string" ? khongDau(o) : "";
      if (!t) return;
      if (x < 0 && /^(toa do )?x( \(m\))?$|^x \(/.test(t)) x = c;
      else if (y < 0 && /^(toa do )?y( \(m\))?$|^y \(/.test(t)) y = c;
      else if (ten < 0 && /^(ten|so hieu|diem|stt|tt|ma)\b/.test(t)) ten = c;
      else if (mt < 0 && /^(mo ta|ghi chu|noi dung|tai san|doi tuong)\b/.test(t)) mt = c;
    });
    if (x >= 0 && y >= 0) [dau, cX, cY, cTen, cMoTa] = [r, x, y, ten, mt];
  }
  const canhBao: string[] = [];
  if (dau < 0) {
    canhBao.push("Không có tiêu đề X, Y — cột 1 là tên điểm, cột 2, 3 là X, Y, cột 4 là mô tả");
    [cTen, cX, cY, cMoTa] = [0, 1, 2, 3];
  }
  const ds: DiemBang[] = [];
  for (let r = dau + 1; r < bang.length; r++) {
    const h = bang[r] ?? [];
    const x = soO(h[cX]), y = soO(h[cY]);
    if (x === null || y === null) {
      if (h.some((o) => o !== null && o !== undefined && String(o).trim() !== "")) canhBao.push(`Dòng ${r + 1}: bỏ qua (không đọc được tọa độ)`);
      continue;
    }
    ds.push({ ten: cTen >= 0 ? String(h[cTen] ?? "").trim() || `Đ${ds.length + 1}` : `Đ${ds.length + 1}`, x, y, moTa: cMoTa >= 0 ? String(h[cMoTa] ?? "").trim() : "" });
  }
  const tb = (f: (d: DiemBang) => number) => ds.reduce((s, d) => s + f(d), 0) / Math.max(ds.length, 1);
  const doiTruc = ds.length > 0 && tb((d) => d.x) > tb((d) => d.y);
  return { diem: doiTruc ? ds.map((d) => ({ ...d, x: d.y, y: d.x })) : ds, doiTruc, canhBao };
}
