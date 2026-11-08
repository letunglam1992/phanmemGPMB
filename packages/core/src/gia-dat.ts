import type { BoChinhSach, LoaiMatTiepGiap } from "./chinh-sach";
import type { DieuChinhGia } from "./dat";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";

const VB = "NQ 152/2025/NQ-HĐND";

/**
 * Nghị quyết số 28/2026/NQ-HĐND ngày 19/10/2026 của HĐND tỉnh Sơn La sửa đổi, bổ sung Quy định bảng giá đất
 * ban hành kèm NQ 152/2025/NQ-HĐND — hiệu lực từ 01/11/2026 (docs/07 §5, QD-33).
 */
export const NQ28_2026 = {
  vanBan: "NQ 28/2026/NQ-HĐND",
  ngay: "2026-10-19",
  hieuLucTu: "2026-11-01",
  /** Điều 2: bãi bỏ khoản 3 Điều 4 (giảm 30% do chênh cao, GD-09) */
  canCuBaiBoChenhCao: "Điều 2 NQ 28/2026/NQ-HĐND (bãi bỏ khoản 3 Điều 4 Quy định kèm NQ 152/2025/NQ-HĐND)",
  /** Khoản 6 Điều 1: bổ sung khoản 8 Điều 7 */
  tmdvNguonGocDatO: { tyLe: "0.9", canCu: "khoản 8 Điều 7 Quy định kèm NQ 152/2025/NQ-HĐND (bổ sung bởi khoản 6 Điều 1 NQ 28/2026/NQ-HĐND)" },
  /** Khoản 1 Điều 3: quy định chuyển tiếp */
  chuyenTiep: "khoản 1 Điều 3 NQ 28/2026/NQ-HĐND: phương án BT, HT, TĐC đã phê duyệt trước 01/11/2026 tiếp tục thực hiện theo phương án đã duyệt, trừ trường hợp phải điều chỉnh, bổ sung, hủy bỏ",
} as const;

const laNgay = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * GD-09 còn áp dụng hay không theo thời điểm định giá (ngày phê duyệt phương án; phương án đã duyệt
 * trước 01/11/2026 giữ theo phương án đã duyệt — k1 Đ3 NQ 28/2026).
 */
export function apDungGiamChenhCao(cs: BoChinhSach, ngayDinhGia?: string): { apDung: boolean | null; lyDo: string } {
  const g = cs.giaDat.giamChenhCao;
  const tu = g.baiBoTu ?? NQ28_2026.hieuLucTu;
  const canCu = g.canCuBaiBo ?? NQ28_2026.canCuBaiBoChenhCao;
  const hien = (iso: string) => iso.split("-").reverse().join("/");
  if (!laNgay(ngayDinhGia)) return { apDung: null, lyDo: `Chưa có thời điểm định giá (ngày phê duyệt phương án): giảm 30% do chênh cao chỉ áp dụng trước ${hien(tu)}; từ ${hien(tu)} đã bãi bỏ theo ${canCu}` };
  if (ngayDinhGia >= tu) return { apDung: false, lyDo: `Không giảm 30% do chênh cao: thời điểm định giá ${hien(ngayDinhGia)} từ ${hien(tu)}, khoản 3 Điều 4 đã bị bãi bỏ theo ${canCu}` };
  return { apDung: true, lyDo: `Thời điểm định giá ${hien(ngayDinhGia)} trước ${hien(tu)}: áp dụng khoản 3 Điều 4 NQ 152 (${NQ28_2026.chuyenTiep})` };
}

/**
 * k8 Đ7 (bổ sung bởi k6 Đ1 NQ 28/2026): đất TM-DV của hộ gia đình, cá nhân đang sử dụng ổn định lâu dài có nguồn gốc
 * từ đất ở (được công nhận, giao đất ban đầu là đất ở hoặc được phép chuyển mục đích từ đất ở) = 90% đơn giá đất ở
 * cùng vị trí, cùng tuyến đường tại Bảng 05. Cán bộ xác định thửa thuộc trường hợp này; phần mềm chỉ tính.
 * Trả về null nếu thời điểm định giá trước ngày áp dụng.
 */
export function giaTmdvNguonGocDatO(cs: BoChinhSach, giaDatONghinDong: SoVao, ngayDinhGia: string): { giaNghinDong: string; moTa: string; canCu: string } | null {
  const k = cs.giaDat.tmdvNguonGocDatO ?? { ...NQ28_2026.tmdvNguonGocDatO, apDungTu: NQ28_2026.hieuLucTu };
  if (!laNgay(ngayDinhGia) || ngayDinhGia < k.apDungTu) return null;
  const gia = D(giaDatONghinDong).mul(k.tyLe);
  return { giaNghinDong: gia.toString(), moTa: `${dinhDang(D(k.tyLe).mul(100), 0)}% × ${dinhDang(giaDatONghinDong, 0)} (đơn giá đất ở Bảng 05 cùng vị trí, cùng tuyến)`, canCu: k.canCu };
}

/**
 * Xác định giá đất một thửa phi nông nghiệp theo NQ 152/2025 (GD-09…GD-14, docs/07),
 * thứ tự điều chỉnh đã xác nhận (VM-31): vị trí → phân lớp → mặt tiếp giáp (≤ 20%) → chênh cao / đường đất.
 * Trả về giá bảng giá (nghìn đ/m²) và chuỗi điều chỉnh để đưa vào `boiThuongDat`.
 */
export function dieuChinhGiaDatPnn(
  cs: BoChinhSach,
  p: {
    loai: "DAT_O" | "PNN";
    viTri: 1 | 2 | 3 | 4 | 5;
    giaViTriNghinDong: SoVao;
    /** Diện tích thửa thu hồi theo từng lớp chiều sâu (lớp 1, 2, …); bỏ trống = không phân lớp */
    dienTichTheoLop?: SoVao[];
    /** Giá vị trí thấp nhất của tuyến (điểm d k6 Đ4) – sàn sau phân lớp */
    giaThapNhatTuyenNghinDong?: SoVao;
    laLoDauGia?: boolean;
    /** Các mặt tiếp giáp của thửa, kể cả mặt chính dùng để xác định vị trí */
    matTiepGiap?: LoaiMatTiepGiap[];
    chenhCaoMet?: SoVao;
    matDuongLaDuongDat?: boolean;
    /** Thời điểm định giá (ISO) — ngày phê duyệt phương án; quyết định GD-09 còn áp dụng hay không (Điều 2 NQ 28/2026) */
    ngayDinhGia?: string;
  },
): { giaCoSoNghinDong: string; dieuChinh: DieuChinhGia[]; canhBao: string[] } {
  const g = cs.giaDat;
  const dieuChinh: DieuChinhGia[] = [];
  const canhBao: string[] = [];
  let gia = D(p.giaViTriNghinDong);

  // 1. Phân lớp theo chiều sâu (không áp dụng lô đấu giá, đấu thầu đối với đất ở)
  const lop = p.dienTichTheoLop?.map((x) => lamTronDienTich(x)) ?? [];
  if (lop.length > 1 && !(p.loai === "DAT_O" && p.laLoDauGia)) {
    const cfg = g.phanLop[p.loai];
    const soLopToiDa = cfg.mocMet.length + 1;
    if (lop.length > soLopToiDa) canhBao.push(`Số lớp nhập (${lop.length}) vượt số lớp quy định (${soLopToiDa})`);
    let tong = D(0), dt = D(0), heSoLop = D(1);
    lop.slice(0, soLopToiDa).forEach((a, i) => {
      if (i > 0) heSoLop = heSoLop.mul(cfg.tyLeSoVoiLopTruoc);
      tong = tong.plus(a.mul(heSoLop));
      dt = dt.plus(a);
    });
    const heSo = tong.div(dt);
    dieuChinh.push({ moTa: `Phân lớp chiều sâu (${lop.map((x) => dinhDang(x, 2)).join(" / ")} m²)`, heSo: heSo.toString(), canCu: { vanBan: VB, viTri: cfg.canCu } });
    gia = gia.mul(heSo);
    if (p.giaThapNhatTuyenNghinDong !== undefined && gia.lt(p.giaThapNhatTuyenNghinDong)) {
      const san = D(p.giaThapNhatTuyenNghinDong);
      dieuChinh.push({ moTa: "Không thấp hơn giá vị trí thấp nhất của tuyến", heSo: san.div(gia).toString(), canCu: { vanBan: VB, viTri: "điểm d khoản 6 Điều 4" } });
      gia = san;
    }
  }

  // 2. Tăng theo số mặt tiếp giáp
  const mat = p.matTiepGiap ?? [];
  if (mat.length >= 2) {
    const k = g.matTiepGiap;
    const soMatDuong = mat.filter((m) => m === "DUONG").length;
    let tyLe = mat.reduce((s, m) => s.plus(k.tyLeMoiMat[m]), D(0));
    if (soMatDuong >= 2) tyLe = tyLe.minus(D(k.tyLeMoiMat.DUONG).mul(2)).plus(k.haiMatDuong);
    if (tyLe.gt(k.toiDa)) {
      canhBao.push(`Tỷ lệ tăng ${dinhDang(tyLe.mul(100), 0)}% vượt mức tối đa, áp ${dinhDang(D(k.toiDa).mul(100), 0)}%`);
      tyLe = D(k.toiDa);
    }
    dieuChinh.push({ moTa: `Tiếp giáp ${mat.length} mặt (${mat.join(", ")}): +${dinhDang(tyLe.mul(100), 0)}%`, heSo: D(1).plus(tyLe).toString(), canCu: { vanBan: VB, viTri: k.canCu } });
    canhBao.push(k.ghiChu);
  }

  // 3. Giảm do chênh cao (chỉ trước 01/11/2026 — Điều 2 NQ 28/2026 bãi bỏ k3 Đ4); đường đất (vị trí 2–5)
  if (p.chenhCaoMet !== undefined && D(p.chenhCaoMet).abs().gte(g.giamChenhCao.nguongMet)) {
    const ad = apDungGiamChenhCao(cs, p.ngayDinhGia);
    if (ad.apDung === true) dieuChinh.push({ moTa: `Chênh cao ${dinhDang(p.chenhCaoMet, 2)} m ≥ ${g.giamChenhCao.nguongMet} m: giảm 30%`, heSo: g.giamChenhCao.heSo, canCu: { vanBan: VB, viTri: g.giamChenhCao.canCu } });
    else canhBao.push(ad.apDung === null ? `Cần xác nhận — ${ad.lyDo}` : ad.lyDo);
  }
  if (p.matDuongLaDuongDat && g.duongDat.apDungViTri.includes(p.viTri)) {
    dieuChinh.push({ moTa: `Vị trí ${p.viTri} mặt đường đất: 70%`, heSo: g.duongDat.heSo, canCu: { vanBan: VB, viTri: g.duongDat.canCu } });
  }
  return { giaCoSoNghinDong: D(p.giaViTriNghinDong).toString(), dieuChinh, canhBao };
}

/** GD-19: đất NN trong cùng thửa có đất ở hoặc xen kẹt với đất ở → tăng 50% (k1 Đ6 NQ 152). */
export function dieuChinhDatNNXenKep(cs: BoChinhSach): DieuChinhGia {
  return { moTa: "Đất NN trong thửa có đất ở / xen kẹt đất ở: +50%", heSo: cs.giaDat.datNNXenKep.heSo, canCu: { vanBan: VB, viTri: cs.giaDat.datNNXenKep.canCu } };
}
