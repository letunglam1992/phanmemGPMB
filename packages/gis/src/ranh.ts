/**
 * Ranh GPMB nhập ngoài bản đồ đang xem (docs/08 §9 hạng mục 1): từ bảng tọa độ mốc (Excel/CSV), từ vùng khép kín của tệp
 * DGN khác, hoặc vẽ trên bản đồ. Kết quả là đa giác VN-2000 cùng hệ với bản đồ — dùng chung phép giao `tinhDienTichThuHoi`.
 */
import GeometryFactory from "jsts/org/locationtech/jts/geom/GeometryFactory.js";
import Coordinate from "jsts/org/locationtech/jts/geom/Coordinate.js";
import IsValidOp from "jsts/org/locationtech/jts/operation/valid/IsValidOp.js";
import type { Diem, KetQuaDocDgn } from "./dgn.js";
import { CAU_HINH_MAC_DINH, dungThua, type VungUngVien } from "./thua.js";

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
