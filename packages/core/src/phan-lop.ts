import type { BoChinhSach } from "./chinh-sach";
import { dong } from "./dong";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";
import type { CanCu, DongTinh, LuaChon } from "./types";
import type Decimal from "decimal.js";

/**
 * B01 – bồi thường đất tính theo phân lớp chiều sâu (điểm a, b khoản 6 Điều 4 NQ 152/2025), QD-21:
 * cán bộ tự nhập từng lớp (số thứ tự lớp, vị trí trong bảng giá, diện tích); phần mềm chỉ điền
 * giá của vị trí đã chọn và tỷ lệ giảm dần theo lớp:
 *   giá lớp k = giá vị trí × tỷ lệ^(k−1)   (đất ở 60%, đất PNN khác 50% so với lớp liền trước).
 * Không tự chia lớp theo chiều sâu, không tự áp sàn giá (điểm d khoản 6 Điều 4) — cán bộ kiểm tra.
 */
export interface LopDatVao {
  lop: number;
  viTri: number;
  /** Giá vị trí trong bảng giá (nghìn đồng/m²). */
  giaViTriNghinDong: SoVao;
  dienTichM2: SoVao;
  /** Giá lớp do cán bộ sửa (nghìn đồng/m²), khác giá phần mềm điền → bắt buộc lý do. */
  giaTuyChinhNghinDong?: SoVao;
  lyDo?: string;
}

export interface LopDatKetQua {
  lop: number;
  viTri: number;
  dienTich: Decimal;
  tyLe: Decimal;
  giaViTri: Decimal;
  giaMacDinh: Decimal;
  giaApDung: Decimal;
  thanhTien: Decimal;
}

export function tyLeLop(cs: BoChinhSach, nhom: "DAT_O" | "PNN", lop: number): Decimal {
  return D(cs.giaDat.phanLop[nhom].tyLeSoVoiLopTruoc).pow(Math.max(0, lop - 1));
}

export function datTheoPhanLop(
  cs: BoChinhSach,
  p: {
    loaiDat: string;
    nhom: "DAT_O" | "PNN";
    nguonTuyen: string;
    lop: LopDatVao[];
    dienTichThuHoiM2?: SoVao;
    heSoDuAn?: { heSo: SoVao; vanBan: string };
  },
): { dong: DongTinh; chiTiet: LopDatKetQua[] } {
  const cfg = cs.giaDat.phanLop[p.nhom];
  const soLopToiDa = cfg.mocMet.length + 1;
  const canhBao: string[] = [];
  const luaChon: LuaChon[] = [];
  let canXacNhan = false;
  const hs = p.heSoDuAn ? D(p.heSoDuAn.heSo) : D(1);

  const chiTiet: LopDatKetQua[] = p.lop.map((l) => {
    const tyLe = tyLeLop(cs, p.nhom, l.lop);
    const giaViTri = D(l.giaViTriNghinDong).mul(1000);
    const giaMacDinh = giaViTri.mul(tyLe);
    let giaApDung = giaMacDinh;
    if (l.giaTuyChinhNghinDong !== undefined && l.giaTuyChinhNghinDong !== "" && !D(l.giaTuyChinhNghinDong).mul(1000).eq(giaMacDinh)) {
      giaApDung = D(l.giaTuyChinhNghinDong).mul(1000);
      if (l.lyDo?.trim()) luaChon.push({ ma: "QD-21", giaTri: `Lớp ${l.lop}: ${dinhDang(giaApDung)} đ/m² (mặc định ${dinhDang(giaMacDinh)})`, lyDo: l.lyDo });
      else {
        canXacNhan = true;
        canhBao.push(`Lớp ${l.lop}: giá sửa khác giá mặc định nhưng chưa ghi lý do`);
      }
    }
    if (l.lop < 1 || l.lop > soLopToiDa) {
      canXacNhan = true;
      canhBao.push(`Lớp ${l.lop} ngoài số lớp quy định (1–${soLopToiDa})`);
    }
    const dienTich = lamTronDienTich(l.dienTichM2);
    return { lop: l.lop, viTri: l.viTri, dienTich, tyLe, giaViTri, giaMacDinh, giaApDung, thanhTien: dienTich.mul(giaApDung).mul(hs) };
  });

  const tongDt = chiTiet.reduce((s, x) => s.plus(x.dienTich), D(0));
  if (p.dienTichThuHoiM2 !== undefined && !tongDt.eq(lamTronDienTich(p.dienTichThuHoiM2))) {
    canXacNhan = true;
    canhBao.push(`Tổng diện tích các lớp (${dinhDang(tongDt, 2)} m²) khác diện tích thu hồi (${dinhDang(lamTronDienTich(p.dienTichThuHoiM2), 2)} m²)`);
  }
  if (chiTiet.length === 0) {
    canXacNhan = true;
    canhBao.push("Chưa nhập lớp nào");
  }
  canhBao.push("Phần mềm không tự áp sàn giá vị trí thấp nhất của tuyến (điểm d khoản 6 Điều 4 NQ 152) — cán bộ kiểm tra");
  if (p.heSoDuAn && !p.heSoDuAn.vanBan) {
    canXacNhan = true;
    canhBao.push("Hệ số điều chỉnh ≠ 1 nhưng chưa ghi văn bản căn cứ");
  }

  const thamSo: Record<string, string> = { "Tuyến": p.nguonTuyen, "Tỷ lệ so với lớp trước": `${dinhDang(D(cfg.tyLeSoVoiLopTruoc).mul(100), 0)}%` };
  for (const x of chiTiet)
    thamSo[`Lớp ${x.lop} – VT${x.viTri}`] = `${dinhDang(x.dienTich, 2)} m² × ${dinhDang(x.giaApDung)} đ/m² (${dinhDang(x.giaViTri)} × ${dinhDang(x.tyLe.mul(100), 2)}%) = ${dinhDang(x.dienTich.mul(x.giaApDung))} đ`;
  if (p.heSoDuAn) thamSo["Hệ số điều chỉnh"] = `× ${dinhDang(hs, 3)} (${p.heSoDuAn.vanBan || "chưa có văn bản"})`;

  const canCu: CanCu[] = [
    { vanBan: "NQ 152/2025/NQ-HĐND", viTri: `${cfg.canCu} Quy định kèm theo` },
    { vanBan: "NQ 152/2025/NQ-HĐND", viTri: p.nguonTuyen },
    { vanBan: "Quyết định nghiệp vụ QD-21", viTri: "docs/06" },
  ];
  return {
    chiTiet,
    dong: dong({
      ma: "B01",
      noiDung: `Bồi thường về đất – ${p.loaiDat} (phân lớp)`,
      thamSo,
      congThuc: "Σ DT lớp × Giá vị trí × tỷ lệ^(lớp − 1) × Hệ số",
      thanhTien: chiTiet.length ? chiTiet.reduce((s, x) => s.plus(x.thanhTien), D(0)) : null,
      canCu,
      trangThai: canXacNhan ? "CAN_XAC_NHAN" : "TAM_TINH",
      luaChon,
      canhBao,
    }),
  };
}
