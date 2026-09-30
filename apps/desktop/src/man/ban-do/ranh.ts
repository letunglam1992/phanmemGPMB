/**
 * Ranh GPMB → diện tích thu hồi từng thửa, cập nhật hồ sơ (docs/08 §9.1) và cảnh báo phần đất còn lại nhỏ hơn diện tích tối
 * thiểu tách thửa (docs/08 §9.2). Phần mềm chỉ đối chiếu, cảnh báo — căn cứ thu hồi phần còn lại do cán bộ xác nhận.
 */
import type { BoChinhSach } from "@gpmb/core";
import type { DienTichThuHoi, ThuaBanDo } from "@gpmb/gis";
import type { DuAn, Ho, Thua } from "../../mo-hinh";
import { soD } from "../../so";

/** Làm tròn diện tích 0,1 m² (như số liệu trích đo) — dạng chuỗi số máy. */
export const dt1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");

export interface DongCapNhat {
  h: Ho;
  thua: Thua;
  tb: ThuaBanDo;
  th: DienTichThuHoi;
  /** DT thu hồi mới (0,1 m²) */
  moi: string;
  /** DT còn lại theo hồ sơ = DT thửa (hồ sơ) − DT thu hồi mới */
  conLai: number;
  khac: boolean;
}

/** Thửa đã gắn hồ sơ: so DT thu hồi trong hồ sơ với DT tính theo ranh GPMB. */
export function dongCapNhatDt(dsThua: ThuaBanDo[], thuHoi: Map<string, DienTichThuHoi>, khoaThua: (t: ThuaBanDo) => string, hos: Ho[]): DongCapNhat[] {
  const out: DongCapNhat[] = [];
  const theoMa = new Map<string, { h: Ho; t: Thua }>();
  for (const h of hos) for (const t of h.thua) if (t.maBanDo) theoMa.set(t.maBanDo, { h, t });
  for (const tb of dsThua) {
    const x = theoMa.get(tb.ma);
    const th = thuHoi.get(khoaThua(tb));
    if (!x || !th) continue;
    const moi = th.phamVi === "NGOAI" ? "0" : th.phamVi === "TOAN_BO" ? x.t.dienTich || dt1(th.dienTichHinhHoc) : dt1(th.dienTichThuHoi);
    const conLai = soD(x.t.dienTich).minus(soD(moi)).toNumber();
    out.push({ h: x.h, thua: x.t, tb, th, moi, conLai, khac: !soD(x.t.dienTichThuHoi).eq(soD(moi)) });
  }
  return out;
}

/** Áp DT thu hồi mới vào hồ sơ (chỉ các dòng được chọn); ghi chú thửa và nhật ký hộ để truy vết. */
export function apDtVaoHoSo(ds: DongCapNhat[], chon: Set<string>, nguoi: string, moTaRanh: string): Ho[] {
  const theoHo = new Map<string, Ho>();
  const luc = new Date().toISOString();
  for (const d of ds) {
    if (!chon.has(d.thua.id)) continue;
    const h = theoHo.get(d.h.id) ?? { ...d.h, thua: [...d.h.thua], nhatKy: [...d.h.nhatKy] };
    const i = h.thua.findIndex((t) => t.id === d.thua.id);
    const cu = h.thua[i]!;
    const ghi = `DT thu hồi ${d.moi} m² tính theo ranh GPMB (${moTaRanh}) ngày ${luc.slice(0, 10).split("-").reverse().join("/")}, thay ${cu.dienTichThuHoi || "0"} m²`;
    h.thua[i] = { ...cu, dienTichThuHoi: d.moi, ghiChu: [cu.ghiChu, ghi].filter(Boolean).join("; ") };
    h.nhatKy.push({ luc, nguoi, noiDung: `Cập nhật DT thu hồi thửa ${cu.soThua}/${cu.soTo}: ${cu.dienTichThuHoi || "0"} → ${d.moi} m² (theo ranh GPMB trên bản đồ)` });
    theoHo.set(h.id, h);
  }
  return [...theoHo.values()];
}

export interface NguongTachThua {
  dienTich: number;
  canCu: string;
  nguon: "BO_CHINH_SACH" | "DU_AN";
}

/** Ngưỡng diện tích tối thiểu tách thửa cho loại đất: bộ chính sách (có nguyên văn) trước, rồi ngưỡng cán bộ nhập cho dự án. */
export function nguongTachThua(cs: BoChinhSach, duAn: DuAn, loaiDat: string): NguongTachThua | null {
  const ma = loaiDat.trim().toUpperCase();
  const laPhuong = /^Phường /.test(duAn.xa);
  const m = cs.tachThuaToiThieu?.muc.find((x) => x.loaiDat.includes(ma) && (!x.khuVuc || x.khuVuc === (laPhuong ? "PHUONG" : "XA")));
  if (m) return { dienTich: Number(m.dienTich), canCu: m.canCu.map((c) => `${c.vanBan} ${c.viTri}`.trim()).join("; "), nguon: "BO_CHINH_SACH" };
  const d = duAn.tachThuaToiThieu?.find((x) => x.loaiDat.toUpperCase().split(/[,;\s]+/).includes(ma) && Number(x.dienTich) > 0 && x.canCu.trim());
  return d ? { dienTich: Number(d.dienTich), canCu: d.canCu.trim(), nguon: "DU_AN" } : null;
}

export interface CanhBaoConLai {
  tb: ThuaBanDo;
  loaiDat: string;
  conLai: number;
  nguong: NguongTachThua | null;
  /** NHO: còn lại < ngưỡng; THIEU_CAN_CU: chưa có ngưỡng cho loại đất */
  muc: "NHO" | "THIEU_CAN_CU";
}

/**
 * Thửa thu hồi một phần có phần còn lại nhỏ hơn diện tích tối thiểu tách thửa → cảnh báo để cán bộ xem xét (vd. thu hồi
 * phần còn lại theo đề nghị của người sử dụng đất). Diện tích còn lại lấy theo hồ sơ nếu thửa đã gắn hồ sơ, không thì hình học.
 */
export function canhBaoConLai(cs: BoChinhSach, duAn: DuAn, dsThua: ThuaBanDo[], thuHoi: Map<string, DienTichThuHoi>, khoaThua: (t: ThuaBanDo) => string, hoSo: Map<string, Thua>): CanhBaoConLai[] {
  const out: CanhBaoConLai[] = [];
  for (const tb of dsThua) {
    const th = thuHoi.get(khoaThua(tb));
    if (!th || th.phamVi !== "MOT_PHAN") continue;
    const t = hoSo.get(tb.ma);
    const loaiDat = (t?.loaiDat || tb.loaiDatBanDo || "").trim().toUpperCase();
    const conLai = t ? soD(t.dienTich).minus(soD(t.dienTichThuHoi)).toNumber() : th.dienTichHinhHoc - th.dienTichThuHoi;
    if (conLai <= 0.05) continue;
    const nguong = loaiDat ? nguongTachThua(cs, duAn, loaiDat) : null;
    if (!nguong) out.push({ tb, loaiDat, conLai, nguong: null, muc: "THIEU_CAN_CU" });
    else if (conLai < nguong.dienTich) out.push({ tb, loaiDat, conLai, nguong, muc: "NHO" });
  }
  return out;
}
