/**
 * 1.0.20 (B2) — Theo dõi cưỡng chế của hộ: cưỡng chế thực hiện quyết định kiểm đếm bắt buộc (Điều 88 Luật Đất đai 2024)
 * và cưỡng chế thực hiện quyết định thu hồi đất (Điều 89; vận động trước khi ban hành quyết định cưỡng chế — khoản 7 Điều 87).
 * Phần mềm đối chiếu các điều kiện, thời hạn theo ngày cán bộ đã ghi; KHÔNG thay việc xem xét của người có thẩm quyền.
 * Thẩm quyền: Luật ghi Chủ tịch UBND cấp huyện — chuyển giao cho Chủ tịch UBND cấp xã (quyết định kiểm đếm bắt buộc, cưỡng chế
 * kiểm đếm, cưỡng chế thu hồi, thành lập Ban cưỡng chế — điểm b, c, d khoản 2 Điều 5 NĐ 151/2025/NĐ-CP).
 */
import { amSangDuong } from "./am-lich";
import { hanChot, hanChotNgay, laNgayLamViec, type LichLamViec } from "./lich-lam-viec";
import type { Ho } from "./mo-hinh";

export type LoaiCuongChe = "KIEM_DEM" | "THU_HOI";
export const TEN_LOAI_CC: Record<LoaiCuongChe, string> = {
  KIEM_DEM: "Cưỡng chế thực hiện quyết định kiểm đếm bắt buộc",
  THU_HOI: "Cưỡng chế thực hiện quyết định thu hồi đất",
};
export const DIEU_CC: Record<LoaiCuongChe, string> = { KIEM_DEM: "Điều 88", THU_HOI: "Điều 89" };

export interface CuongChe {
  id: string;
  loai: LoaiCuongChe;
  /** Vận động, thuyết phục trước khi ban hành quyết định cưỡng chế */
  vanDongTu?: string;
  vanDongDen?: string;
  /** Văn bản thể hiện việc vận động (biên bản…) */
  vbVanDong?: string;
  soQd?: string;
  ngayQd?: string;
  ngayHieuLuc?: string;
  ngayNiemYet?: string;
  /** Kiểm đếm bắt buộc: đã thông báo trên hệ thống truyền thanh cấp xã (điểm b k2 Đ88) */
  truyenThanh?: boolean;
  /** Ngày người bị cưỡng chế nhận quyết định, hoặc ngày UBND cấp xã lập biên bản vắng mặt / từ chối nhận */
  ngayNhanQd?: string;
  bienBanKhongNhan?: boolean;
  /** Quyết định cưỡng chế quy định thời gian thi hành dài hơn 10 ngày (k3 Đ89) */
  hanThiHanhNgay?: number;
  /** Quyết định thành lập Ban cưỡng chế thu hồi đất (điểm a k4 Đ89) */
  qdBan?: string;
  ngayDuKien?: string;
  ketQua?: "CHAP_HANH" | "DA_CUONG_CHE";
  /** Ngày biên bản ghi nhận chấp hành / ngày thực hiện cưỡng chế */
  ngayKetQua?: string;
  ghiChu?: string;
}

export interface MucKiemCc {
  muc: "CAO" | "TRUNG_BINH" | "THONG_TIN";
  noiDung: string;
  canCu: string;
}

const vn = (iso: string) => iso.split("-").reverse().join("/");
const cong = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Thời gian nghỉ Tết Âm lịch của năm: chuỗi ngày nghỉ liền nhau (theo lịch làm việc cán bộ đã nhập) chứa mùng 1 Tết.
 * Năm chưa xác nhận đủ lịch → chỉ biết mùng 1, `thieuLich` = true.
 */
export function nghiTet(nam: number, lich: LichLamViec): { tu: string; den: string; thieuLich: boolean } | null {
  const m1 = amSangDuong(1, 1, nam);
  if (!m1) return null;
  let tu = m1;
  let den = m1;
  if (!laNgayLamViec(m1, lich)) {
    while (!laNgayLamViec(cong(tu, -1), lich)) tu = cong(tu, -1);
    while (!laNgayLamViec(cong(den, 1), lich)) den = cong(den, 1);
  }
  return { tu, den, thieuLich: !lich.namDaDu.includes(nam) };
}

/** Ngày nằm trong 15 ngày trước và sau thời gian nghỉ Tết Âm lịch (điểm b k1 Đ89) → thông tin khoảng Tết, ngược lại null. */
export function trongKhoangTet(ngay: string, lich: LichLamViec): { tu: string; den: string; thieuLich: boolean } | null {
  const y = Number(ngay.slice(0, 4));
  for (const nam of [y, y + 1]) {
    const t = nghiTet(nam, lich);
    if (t && ngay >= cong(t.tu, -15) && ngay <= cong(t.den, 15)) return t;
  }
  return null;
}

export const CAN_CU_VAN_DONG_BAN_GIAO = "điểm b khoản 7 Điều 87 Luật Đất đai 2024";

/** Ngày sớm nhất được ban hành quyết định cưỡng chế thu hồi đất: quá 10 ngày kể từ ngày kết thúc vận động (điểm b k7 Đ87). */
export const ngaySomNhatQdThuHoi = (vanDongDen: string, lich: LichLamViec) => cong(hanChotNgay(vanDongDen, 10, lich), 1);

/** Hạn thi hành quyết định cưỡng chế thu hồi đất (k3 Đ89): 10 ngày (hoặc dài hơn nếu quyết định quy định) kể từ ngày nhận / lập biên bản. */
export const hanThiHanh = (c: CuongChe, lich: LichLamViec) => (c.ngayNhanQd ? hanChotNgay(c.ngayNhanQd, Math.max(10, c.hanThiHanhNgay ?? 10), lich) : null);

/** Hạn bàn giao đất sau khi người bị cưỡng chế chấp hành: chậm nhất 30 ngày kể từ ngày lập biên bản (điểm b k4 Đ89). */
export const hanBanGiaoSauChapHanh = (c: CuongChe, lich: LichLamViec) => (c.loai === "THU_HOI" && c.ketQua === "CHAP_HANH" && c.ngayKetQua ? hanChotNgay(c.ngayKetQua, 30, lich) : null);

/** Hạn gửi văn bản đề nghị Công an bảo đảm trật tự: trước thời điểm cưỡng chế 05 ngày làm việc (Điều 37 NĐ 102/2024/NĐ-CP). */
export function hanGuiCongAn(ngayDuKien: string, lich: LichLamViec): string {
  let cs = ngayDuKien;
  for (let i = 0; i < 5; i++) do cs = hanChot(cs, -1, "N", lich); while (!laNgayLamViec(cs, lich));
  return cs;
}

export interface DongLichCuongChe {
  ngayDuKien: string;
  thang: string;
  c: CuongChe;
  h: Ho;
  hanCongAn: string;
  /** Điều kiện về thời điểm bị vi phạm (ngày nghỉ, khoảng Tết, sau hạn thi hành…) */
  canhBao: string[];
}

/** 1.2.0 (B2): lịch cưỡng chế — hồ sơ chưa kết thúc có ngày dự kiến, theo thứ tự ngày, kèm hạn gửi Công an và cảnh báo thời điểm. */
export function lichCuongChe(hos: Ho[], homNay: string, lich: LichLamViec): DongLichCuongChe[] {
  return hos
    .flatMap((h) => (h.cuongChe ?? []).filter((c) => c.ngayDuKien && !c.ketQua).map((c) => ({ h, c })))
    .map(({ h, c }) => ({
      ngayDuKien: c.ngayDuKien!,
      thang: c.ngayDuKien!.slice(0, 7),
      c,
      h,
      hanCongAn: hanGuiCongAn(c.ngayDuKien!, lich),
      canhBao: kiemCuongChe(c, h, homNay, lich).filter((m) => m.muc === "CAO" && /dự kiến/.test(m.noiDung)).map((m) => m.noiDung),
    }))
    .sort((a, b) => a.ngayDuKien.localeCompare(b.ngayDuKien));
}

/** Đối chiếu điều kiện, thời hạn của một hồ sơ cưỡng chế. */
export function kiemCuongChe(c: CuongChe, h: Ho, homNay: string, lich: LichLamViec): MucKiemCc[] {
  const out: MucKiemCc[] = [];
  const d = DIEU_CC[c.loai];
  const cc = (k: string) => `${k} ${d} Luật Đất đai 2024`;
  if (!c.vanDongTu || !c.vbVanDong?.trim())
    out.push({ muc: "TRUNG_BINH", noiDung: "Chưa ghi việc vận động, thuyết phục (ngày, văn bản thể hiện)", canCu: c.loai === "THU_HOI" ? `điểm a khoản 2 Điều 89; ${CAN_CU_VAN_DONG_BAN_GIAO}` : cc("điểm a khoản 2") });
  if (c.loai === "THU_HOI") {
    if (!h.tienDo["13"]?.ngay) out.push({ muc: "CAO", noiDung: "Hộ chưa có ngày quyết định thu hồi đất (bước 13) — cưỡng chế thu hồi chỉ khi quyết định thu hồi đã có hiệu lực", canCu: cc("điểm a khoản 2") });
    if (c.vanDongDen && c.ngayQd) {
      const som = ngaySomNhatQdThuHoi(c.vanDongDen, lich);
      if (c.ngayQd < som) out.push({ muc: "CAO", noiDung: `Quyết định cưỡng chế ngày ${vn(c.ngayQd)} chưa quá 10 ngày kể từ ngày kết thúc vận động ${vn(c.vanDongDen)} (sớm nhất ${vn(som)})`, canCu: CAN_CU_VAN_DONG_BAN_GIAO });
    }
    if (!c.qdBan?.trim()) out.push({ muc: "TRUNG_BINH", noiDung: "Chưa ghi quyết định thành lập Ban cưỡng chế thu hồi đất", canCu: cc("điểm a khoản 4") });
  }
  if (c.soQd || c.ngayQd) {
    if (!c.ngayNiemYet) out.push({ muc: "TRUNG_BINH", noiDung: "Chưa ghi ngày niêm yết công khai quyết định cưỡng chế tại trụ sở UBND cấp xã, nơi sinh hoạt chung của khu dân cư", canCu: cc("điểm b khoản 2") });
    if (c.loai === "KIEM_DEM" && !c.truyenThanh) out.push({ muc: "TRUNG_BINH", noiDung: "Chưa xác nhận đã thông báo trên hệ thống truyền thanh cấp xã", canCu: cc("điểm b khoản 2") });
    if (!c.ngayHieuLuc) out.push({ muc: "TRUNG_BINH", noiDung: "Chưa ghi ngày quyết định cưỡng chế có hiệu lực thi hành", canCu: cc("điểm c khoản 2") });
    if (!c.ngayNhanQd) out.push({ muc: "TRUNG_BINH", noiDung: "Chưa ghi ngày người bị cưỡng chế nhận quyết định (hoặc biên bản vắng mặt, từ chối nhận của UBND cấp xã)", canCu: cc("điểm d khoản 2") });
  } else out.push({ muc: "THONG_TIN", noiDung: "Chưa có quyết định cưỡng chế", canCu: cc("khoản 3") });
  const han = c.loai === "THU_HOI" ? hanThiHanh(c, lich) : null;
  if (han && !c.ketQua && homNay > han)
    out.push({ muc: "CAO", noiDung: `Quá hạn thi hành quyết định cưỡng chế (hạn ${vn(han)}, ${Math.max(10, c.hanThiHanhNgay ?? 10)} ngày kể từ ngày nhận quyết định / lập biên bản)`, canCu: cc("khoản 3") });
  if (c.ngayDuKien && !c.ketQua) {
    // 1.0.21 (C2): đề nghị Công an bảo đảm trật tự phải gửi trước thời điểm cưỡng chế 05 ngày làm việc (Điều 37 NĐ 102/2024)
    const cs = hanGuiCongAn(c.ngayDuKien, lich);
    out.push({ muc: "THONG_TIN", noiDung: `Nếu cần Công an tham gia bảo đảm trật tự: gửi văn bản đến cơ quan Công an cùng cấp chậm nhất ${vn(cs)} (trước thời điểm cưỡng chế 05 ngày làm việc)${c.loai === "KIEM_DEM" ? "; Ban cưỡng chế kiểm đếm bắt buộc vận động, thuyết phục, đối thoại trong 05 ngày làm việc (k2 Điều 36 NĐ 102/2024)" : ""}`, canCu: "Điều 37 NĐ 102/2024/NĐ-CP" });
    if (han && c.ngayDuKien > han) out.push({ muc: "CAO", noiDung: `Ngày dự kiến cưỡng chế ${vn(c.ngayDuKien)} sau hạn thi hành ${vn(han)}`, canCu: cc("khoản 3") });
    if (c.ngayHieuLuc && c.ngayDuKien < c.ngayHieuLuc) out.push({ muc: "CAO", noiDung: `Ngày dự kiến cưỡng chế ${vn(c.ngayDuKien)} trước ngày quyết định có hiệu lực ${vn(c.ngayHieuLuc)}`, canCu: cc("điểm c khoản 2") });
    if (!laNgayLamViec(c.ngayDuKien, lich)) out.push({ muc: "CAO", noiDung: `Ngày dự kiến cưỡng chế ${vn(c.ngayDuKien)} là ngày nghỉ — thời điểm bắt đầu phải trong giờ hành chính${c.loai === "THU_HOI" ? ", không cưỡng chế ngày nghỉ, ngày lễ" : ""}`, canCu: cc("điểm b khoản 1") });
    if (c.loai === "THU_HOI") {
      const t = trongKhoangTet(c.ngayDuKien, lich);
      if (t) out.push({ muc: "CAO", noiDung: `Ngày dự kiến cưỡng chế ${vn(c.ngayDuKien)} trong 15 ngày trước hoặc sau thời gian nghỉ Tết Âm lịch (${vn(t.tu)}${t.den !== t.tu ? `–${vn(t.den)}` : ""})${t.thieuLich ? " — năm này chưa xác nhận đủ lịch nghỉ, khoảng Tết tính từ mùng 1, cần kiểm tra theo thông báo" : ""}`, canCu: cc("điểm b khoản 1") });
      out.push({ muc: "THONG_TIN", noiDung: "Kiểm tra ngày lễ truyền thống của đồng bào dân tộc và trường hợp đặc biệt tại địa phương (phần mềm không có danh mục)", canCu: cc("điểm b khoản 1") });
    }
  }
  const hbg = hanBanGiaoSauChapHanh(c, lich);
  if (hbg && !h.banGiao?.ngay && homNay > hbg)
    out.push({ muc: "CAO", noiDung: `Người bị cưỡng chế đã chấp hành (biên bản ${vn(c.ngayKetQua!)}) nhưng quá 30 ngày chưa bàn giao đất (hạn ${vn(hbg)})`, canCu: cc("điểm b khoản 4") });
  return out;
}

/** Hồ sơ cưỡng chế chưa kết thúc của hộ */
export const cuongCheDangMo = (h: Ho) => (h.cuongChe ?? []).filter((c) => !c.ketQua);
