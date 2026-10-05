/**
 * Ranh GPMB → diện tích thu hồi từng thửa, cập nhật hồ sơ (docs/08 §9.1) và cảnh báo phần đất còn lại nhỏ hơn diện tích tối
 * thiểu tách thửa (docs/08 §9.2). Phần mềm chỉ đối chiếu, cảnh báo — căn cứ thu hồi phần còn lại do cán bộ xác nhận.
 */
import type { BoChinhSach, ViTriHanMuc } from "@gpmb/core";
import { coTheDungRong, phanConLai, type DienTichThuHoi, type ThuaBanDo } from "@gpmb/gis";
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
  /** Cạnh chiều rộng tối thiểu (m) của hình chữ nhật dựng được trong thửa, nếu có quy định. */
  rong: number | null;
  canCu: string;
  moTa: string;
  luuY?: string;
  nguon: "BO_CHINH_SACH" | "DU_AN";
}

/**
 * Các mức diện tích tối thiểu tách thửa áp dụng cho loại đất (Điều 13–16 PL I QĐ 106/2025 trong bộ chính sách; không có thì
 * ngưỡng cán bộ nhập cho dự án kèm căn cứ). Vị trí thửa (như hạn mức PL I) chưa biết → trả mọi mức của các vị trí.
 */
export function nguongTachThua(cs: BoChinhSach, duAn: DuAn, loaiDat: string, viTri?: ViTriHanMuc): NguongTachThua[] {
  const ma = loaiDat.trim().toUpperCase();
  const laPhuong = /^Phường /.test(duAn.xa);
  const ds = (cs.tachThuaToiThieu?.muc ?? []).filter((x) => x.loaiDat.includes(ma) && (!x.khuVuc || x.khuVuc === (laPhuong ? "PHUONG" : "XA")) && (!viTri || !x.viTri || x.viTri.includes(viTri)));
  if (ds.length)
    return ds.map((m) => ({ dienTich: Number(m.dienTich), rong: m.rongToiThieu ? Number(m.rongToiThieu) : null, canCu: m.canCu.map((c) => `${c.viTri} ${c.vanBan}`.trim()).join("; "), moTa: m.moTa, luuY: m.luuY, nguon: "BO_CHINH_SACH" }));
  const d = duAn.tachThuaToiThieu?.find((x) => x.loaiDat.toUpperCase().split(/[,;\s]+/).includes(ma) && Number(x.dienTich) > 0 && x.canCu.trim());
  return d ? [{ dienTich: Number(d.dienTich), rong: null, canCu: d.canCu.trim(), moTa: `Ngưỡng của dự án (${d.loaiDat})`, nguon: "DU_AN" }] : [];
}

/** Trường hợp tách thửa đặc thù (PL I QĐ 106/2025) — cán bộ chọn ở chi tiết thửa, bắt buộc căn cứ. */
export const TRUONG_HOP_TACH_THUA: Record<NonNullable<Thua["tachThua"]>["truongHop"], { ten: string; canCu: string; khongApDung?: boolean }> = {
  D14_K1: { ten: "Tách đất ở gắn liền với đất nông nghiệp trong cùng thửa đất ở — phần đất ở theo Điều 13; đất NN gắn liền không áp dụng; thửa NN còn lại theo Điều 13", canCu: "khoản 1 Điều 14 Phụ lục I QĐ 106/2025/QĐ-UBND" },
  D14_K2: { ten: "Tách đất nông nghiệp trong cùng thửa có đất ở — chuyển mục đích sang đất ở; thửa tách ra và thửa còn lại theo Điều 13", canCu: "khoản 2 Điều 14 Phụ lục I QĐ 106/2025/QĐ-UBND" },
  D17_K1: { ten: "Thừa kế, tặng cho — không làm thủ tục chia tách thửa (cấp GCN theo k2 Đ135 LĐĐ)", canCu: "khoản 1 Điều 17 Phụ lục I QĐ 106/2025/QĐ-UBND", khongApDung: true },
  D17_K2: { ten: "Tách thửa để tặng cho Nhà nước, cộng đồng dân cư, mở rộng công trình công cộng — không áp dụng", canCu: "khoản 2 Điều 17 Phụ lục I QĐ 106/2025/QĐ-UBND", khongApDung: true },
  D17_K3: { ten: "Dự án phát triển KT-XH qua thỏa thuận về QSDĐ hoặc đang có QSDĐ (Điều 127 LĐĐ) — không áp dụng", canCu: "khoản 3 Điều 17 Phụ lục I QĐ 106/2025/QĐ-UBND", khongApDung: true },
};

export interface CanhBaoConLai {
  tb: ThuaBanDo;
  loaiDat: string;
  /** DT còn lại (hồ sơ nếu thửa đã gắn, không thì hình học), đã trừ phần hành lang bảo vệ an toàn (khoản 1 Điều 12) */
  conLai: number;
  /** Các mảnh còn lại theo hình học (ranh cắt thửa thành nhiều phần) */
  manh: number[];
  nguong: NguongTachThua | null;
  /** NHO: dưới ngưỡng; CAN_VI_TRI: dưới mức của một vị trí (xã: 50/60 m²) — cần chọn vị trí thửa; HEP: không dựng được hình chữ
   * nhật rộng tối thiểu; THIEU_CAN_CU: chưa có ngưỡng cho loại đất */
  muc: "NHO" | "CAN_VI_TRI" | "HEP" | "THIEU_CAN_CU";
  ghiChu: string[];
}

/**
 * Thửa thu hồi một phần có phần còn lại nhỏ hơn diện tích/kích thước tối thiểu tách thửa → cảnh báo để cán bộ xem xét (vd. thu
 * hồi phần còn lại theo đề nghị của người sử dụng đất). Phần mềm không kết luận thu hồi.
 */
export function canhBaoConLai(cs: BoChinhSach, duAn: DuAn, dsThua: ThuaBanDo[], thuHoi: Map<string, DienTichThuHoi>, khoaThua: (t: ThuaBanDo) => string, hoSo: Map<string, Thua>): CanhBaoConLai[] {
  const out: CanhBaoConLai[] = [];
  for (const tb of dsThua) {
    const th = thuHoi.get(khoaThua(tb));
    if (!th || th.phamVi !== "MOT_PHAN") continue;
    const t = hoSo.get(tb.ma);
    const loaiDat = (t?.loaiDat || tb.loaiDatBanDo || "").trim().toUpperCase();
    const ml = th.vongThuHoi.length ? phanConLai(tb.vong, th.vongThuHoi) : [];
    const ghiChu: string[] = [];
    let conLai = t ? soD(t.dienTich).minus(soD(t.dienTichThuHoi)).toNumber() : ml.length ? ml.reduce((s, m) => s + m.dienTich, 0) : th.dienTichHinhHoc - th.dienTichThuHoi;
    if (t?.hanhLang?.dienTich && soD(t.hanhLang.dienTich).gt(0)) {
      conLai -= soD(t.hanhLang.dienTich).toNumber();
      ghiChu.push(`Đã trừ ${t.hanhLang.dienTich} m² hành lang bảo vệ an toàn (khoản 1 Điều 12 PL I QĐ 106/2025)`);
    }
    if (ml.length > 1) ghiChu.push(`Ranh chia phần còn lại thành ${ml.length} mảnh (${ml.map((m) => dt1(m.dienTich)).join("; ")} m²) — mỗi mảnh xét như một thửa`);
    if (conLai <= 0.05) continue;
    const viTri = t?.khongGiayTo?.viTriHanMuc;
    // Trường hợp đặc thù cán bộ đã chọn (có căn cứ): Điều 17 → không áp dụng; Điều 14 → phần còn lại đối chiếu mức đất ở (Điều 13)
    const th14 = t?.tachThua?.canCu.trim() ? TRUONG_HOP_TACH_THUA[t.tachThua.truongHop] : null;
    if (th14?.khongApDung) continue;
    if (th14) ghiChu.push(`${th14.canCu}: ${th14.ten} — căn cứ: ${t!.tachThua!.canCu.trim()}`);
    const ds = th14 ? nguongTachThua(cs, duAn, /^Phường /.test(duAn.xa) ? "ODT" : "ONT", viTri) : loaiDat ? nguongTachThua(cs, duAn, loaiDat, viTri) : [];
    const base = { tb, loaiDat, conLai, manh: ml.map((m) => m.dienTich) };
    if (!ds.length) {
      out.push({ ...base, nguong: null, muc: "THIEU_CAN_CU", ghiChu });
      continue;
    }
    const luuY = [...new Set(ds.map((x) => x.luuY).filter((x): x is string => !!x))];
    const nho = [...ds].sort((a, b) => a.dienTich - b.dienTich);
    const min = nho[0]!, max = nho[nho.length - 1]!;
    // Mảnh nhỏ nhất (khi ranh chia nhiều mảnh) cũng phải đạt ngưỡng
    const xet = ml.length > 1 ? Math.min(conLai, ml[ml.length - 1]!.dienTich) : conLai;
    if (xet < min.dienTich) out.push({ ...base, conLai: xet, nguong: min, muc: "NHO", ghiChu: [...ghiChu, ...luuY] });
    else if (xet < max.dienTich) out.push({ ...base, conLai: xet, nguong: max, muc: "CAN_VI_TRI", ghiChu: [...ghiChu, `Dưới ${dt1(max.dienTich)} m² (${max.moTa}) nhưng không dưới ${dt1(min.dienTich)} m² (${min.moTa}) — chọn vị trí thửa ở hồ sơ (Thửa đất → vị trí tra hạn mức)`, ...luuY] });
    else {
      const rong = Math.max(...ds.map((x) => x.rong ?? 0));
      const hep = rong > 0 ? ml.filter((m) => !coTheDungRong(m.vong, rong)) : [];
      if (hep.length) out.push({ ...base, nguong: nho.filter((x) => x.rong === rong).at(-1)!, muc: "HEP", ghiChu: [...ghiChu, `Không dựng được hình chữ nhật có cạnh chiều rộng ${String(rong).replace(".", ",")} m trong ${hep.length} mảnh còn lại (${hep.map((m) => dt1(m.dienTich)).join("; ")} m²)`, ...luuY] });
    }
  }
  return out;
}
