import type { BoChinhSach, LoaiMatTiepGiap } from "./chinh-sach";
import type { DieuChinhGia } from "./dat";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";

const VB = "NQ 152/2025/NQ-HĐND";

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

  // 3. Giảm do chênh cao; đường đất (vị trí 2–5)
  if (p.chenhCaoMet !== undefined && D(p.chenhCaoMet).abs().gte(g.giamChenhCao.nguongMet)) {
    dieuChinh.push({ moTa: `Chênh cao ${dinhDang(p.chenhCaoMet, 2)} m ≥ ${g.giamChenhCao.nguongMet} m: giảm 30%`, heSo: g.giamChenhCao.heSo, canCu: { vanBan: VB, viTri: g.giamChenhCao.canCu } });
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
