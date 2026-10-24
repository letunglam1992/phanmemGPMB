/**
 * 1.0.5 — diễn biến toàn tỉnh theo tháng từ các bản gửi đã nhận (bản hiện tại + các bản trước của từng đơn vị): mỗi kỳ
 * (cuối tháng) lấy bản gửi gần nhất của từng đơn vị có thời điểm xuất ≤ cuối tháng; đơn vị chưa gửi trước kỳ thì không
 * tính. Phạm vi: toàn tỉnh, một xã, một dự án liên xã (mã dùng chung). Chỉ cộng số liệu đã gửi, không ước tính.
 */
import { D } from "@gpmb/core";
import type { TomTatDuAn } from "./goi-tinh";
import { chuanMa, chuanXa } from "./lien-xa";

export interface BanGui {
  maGui: string;
  luc: string;
  tomTat: TomTatDuAn[];
}
export type PhamViDienBien = { loai: "TINH" } | { loai: "XA"; xa: string } | { loai: "LIEN_XA"; ma: string };

export interface KyDienBien {
  ky: string; // yyyy-mm
  soDonVi: number;
  soHo: number;
  banGiao: number;
  duyetPA: number;
  tamTinh: number; // đồng (số để vẽ; tổng cộng bằng Decimal)
  dtThuHoi: number;
}

const thuoc = (d: TomTatDuAn, p: PhamViDienBien) =>
  p.loai === "TINH" ? true : p.loai === "XA" ? chuanXa(d.xa) === chuanXa(p.xa) : !!d.lienXa?.ma && chuanMa(d.lienXa.ma) === chuanMa(p.ma);

const cuoiThang = (ky: string) => {
  const [y, m] = ky.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1) - 1).toISOString();
};

export function dienBienTinh(ban: BanGui[], p: PhamViDienBien, denNgay = new Date().toISOString(), toiDa = 24): KyDienBien[] {
  if (!ban.length) return [];
  const dau = ban.reduce((m, b) => (b.luc < m ? b.luc : m), ban[0]!.luc).slice(0, 7);
  const cuoi = denNgay.slice(0, 7);
  const ky: string[] = [];
  for (let [y, m] = dau.split("-").map(Number) as [number, number]; `${y}-${String(m).padStart(2, "0")}` <= cuoi; m === 12 ? ((y += 1), (m = 1)) : (m += 1)) ky.push(`${y}-${String(m).padStart(2, "0")}`);
  const theoDv = new Map<string, BanGui[]>();
  for (const b of ban) theoDv.set(b.maGui, [...(theoDv.get(b.maGui) ?? []), b]);
  for (const ds of theoDv.values()) ds.sort((a, b) => a.luc.localeCompare(b.luc));
  return ky.slice(-toiDa).map((k) => {
    const het = k === cuoi ? denNgay : cuoiThang(k);
    let soDonVi = 0, soHo = 0, banGiao = 0, duyetPA = 0;
    let tamTinh = D(0), dt = D(0);
    for (const ds of theoDv.values()) {
      const b = [...ds].reverse().find((x) => x.luc <= het);
      if (!b) continue;
      const da = b.tomTat.filter((d) => thuoc(d, p));
      if (!da.length) continue;
      soDonVi++;
      for (const d of da) {
        soHo += d.soHo;
        banGiao += d.theoTrangThai.HOAN_THANH ?? 0;
        duyetPA += d.soHoDaDuyetPA;
        tamTinh = tamTinh.plus(D(d.tongTamTinh || "0"));
        dt = dt.plus(D(d.dienTichThuHoi || "0"));
      }
    }
    return { ky: k, soDonVi, soHo, banGiao, duyetPA, tamTinh: tamTinh.toNumber(), dtThuHoi: dt.toNumber() };
  });
}

/**
 * 1.2.0 (D3) — Đơn khiếu nại, kiến nghị theo tháng ở cấp tỉnh: cộng `khieuNai.theoThang` (12 tháng, đơn vị tính khi gửi) của các
 * dự án trong bản gửi hiện tại của từng đơn vị. Gói gửi trước 1.2.0 không có — không tính.
 */
export function donTinhTheoThang(tomTat: Pick<TomTatDuAn, "khieuNai">[]): import("../khieu-nai").DonThang[] {
  const m = new Map<string, import("../khieu-nai").DonThang>();
  for (const d of tomTat)
    for (const k of d.khieuNai?.theoThang ?? []) {
      const g = m.get(k.ky) ?? { ky: k.ky, moi: 0, daGiaiQuyet: 0, quaHan: 0 };
      g.moi += k.moi;
      g.daGiaiQuyet += k.daGiaiQuyet;
      g.quaHan += k.quaHan;
      m.set(k.ky, g);
    }
  return [...m.values()].sort((a, b) => a.ky.localeCompare(b.ky));
}

/** 1.3.0 (D1) — số văn bản thuộc từng nhiệm vụ phân cấp theo xã, trong kỳ [tu, den] (gói gửi từ 1.3.0). */
export function phanCapTheoXa(dong: Pick<TomTatDuAn, "xa" | "phanCap">[], tu: string, den: string): { xa: string; theoNv: Record<string, number>; tong: number }[] {
  const m = new Map<string, Record<string, number>>();
  for (const d of dong) {
    const xa = d.xa || "(Chưa ghi xã, phường)";
    const r = m.get(xa) ?? {};
    for (const x of d.phanCap ?? []) if (x.ngay >= tu && x.ngay <= den) r[x.nv] = (r[x.nv] ?? 0) + 1;
    m.set(xa, r);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi")).map(([xa, theoNv]) => ({ xa, theoNv, tong: Object.values(theoNv).reduce((s, n) => s + n, 0) }));
}

/** 1.3.0 (D2) — lịch cưỡng chế toàn tỉnh (ngày, xã, dự án, loại; gói không có tên hộ), theo thứ tự ngày. */
export function lichCuongCheTinh(dong: Pick<TomTatDuAn, "xa" | "ten" | "cuongChe">[], tuNgay = ""): { ngay: string; xa: string; duAn: string; loai: "KIEM_DEM" | "THU_HOI" }[] {
  return dong
    .flatMap((d) => (d.cuongChe?.lich ?? []).map((c) => ({ ngay: c.ngay, xa: d.xa || "(Chưa ghi xã, phường)", duAn: d.ten, loai: c.loai })))
    .filter((x) => x.ngay >= tuNgay)
    .sort((a, b) => a.ngay.localeCompare(b.ngay) || a.xa.localeCompare(b.xa, "vi"));
}

/** So sánh phiên bản "x.y.z" có trong chuỗi (vd. "GPMB Sơn La 1.3.0") với `toiThieu`; không đọc được → coi như cũ. */
export function phienBanTu(ungDung: string, toiThieu: string): boolean {
  const a = /(\d+)\.(\d+)\.(\d+)/.exec(ungDung ?? "");
  if (!a) return false;
  const b = toiThieu.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (Number(a[i + 1]) !== b[i]) return Number(a[i + 1]) > b[i]!;
  return true;
}

/**
 * 1.3.0 (C2) — đơn vị chưa có số liệu phân cấp của kỳ: gói mới nhất gửi trước ngày bắt đầu kỳ hoặc từ bản phần mềm trước 1.3.0
 * (chưa gửi kèm Sổ văn bản đi). Trả tên đơn vị gửi kèm lý do.
 */
export function donViChuaGuiPhanCap(goi: { donViGui: string; thongTin: { luc: string; ungDung: string } }[], tu: string): { donVi: string; lyDo: string }[] {
  return goi
    .map((g) => ({ donVi: g.donViGui, lyDo: !phienBanTu(g.thongTin.ungDung, "1.3.0") ? `gói gửi từ bản cũ (${g.thongTin.ungDung || "không rõ"})` : g.thongTin.luc.slice(0, 10) < tu ? `gói mới nhất ngày ${g.thongTin.luc.slice(0, 10).split("-").reverse().join("/")} — trước kỳ` : "" }))
    .filter((x) => x.lyDo)
    .sort((a, b) => a.donVi.localeCompare(b.donVi, "vi"));
}

/** 1.3.0 (C1) — dữ liệu mẫu Word tổng hợp phân cấp toàn tỉnh. */
export function duLieuBaoCaoPhanCapTinh(
  pc: { xa: string; theoNv: Record<string, number>; tong: number }[],
  nhiemVu: { ma: string; noiDung: string; viTri: string }[],
  chuaGui: { donVi: string; lyDo: string }[],
  ky: { tu: string; den: string },
  qd: { so: string; ten: string },
  t: { coQuanCapTren: string; coQuan: string; kyHieu: string; so: string; diaDanh: string; ngayKy: string; kinhGui: string; khoKhan: string; kienNghi: string; noiNhan: string; quyenHan: string; nguoiKy: string },
): Record<string, unknown> {
  const vn = (iso: string) => iso.split("-").reverse().join("/");
  const [y, m, d] = t.ngayKy ? t.ngayKy.split("-") : ["", "", ""];
  const tong = pc.reduce((s, x) => s + x.tong, 0);
  const coSo = pc.filter((x) => x.tong).length;
  return {
    co_quan_cap_tren: t.coQuanCapTren.toUpperCase(),
    CO_QUAN: t.coQuan.toUpperCase(),
    co_quan_bc: t.coQuan || "…………",
    ky_hieu: t.kyHieu,
    so: t.so,
    dia_danh: t.diaDanh || "…………",
    ngay: d ?? "", thang: m ?? "", nam: y ?? "",
    tu_ngay: vn(ky.tu), den_ngay: vn(ky.den),
    kinh_gui: t.kinhGui,
    qd_so: qd.so, qd_ten: qd.ten,
    tong_quat: `Trong kỳ, ${coSo}/${pc.length} xã, phường có văn bản thuộc nhiệm vụ được phân cấp, tổng cộng ${tong} văn bản.`,
    ds_nv: nhiemVu.map((n, i) => ({ stt: i + 1, noi_dung: n.noiDung, vi_tri: n.viTri, so_vb: String(pc.reduce((s, x) => s + (x.theoNv[n.ma] ?? 0), 0)), so_xa: String(pc.filter((x) => x.theoNv[n.ma]).length) })),
    ds_xa: pc.map((x, i) => ({ stt: i + 1, xa: x.xa, tong: String(x.tong), chi_tiet: nhiemVu.filter((n) => x.theoNv[n.ma]).map((n) => `${n.noiDung}: ${x.theoNv[n.ma]}`).join("; ") || "—" })),
    xa_chua_gui: chuaGui.length ? `Đơn vị chưa có số liệu kỳ này (${chuaGui.length}): ${chuaGui.map((c) => `${c.donVi} (${c.lyDo})`).join("; ")}.` : "Các đơn vị đã gửi số liệu trong kỳ.",
    kho_khan: t.khoKhan.trim() || "…………",
    kien_nghi: t.kienNghi.trim() || "…………",
    noi_nhan: t.noiNhan.split("\n").map((x) => x.trim().replace(/[;.]$/, "")).filter(Boolean),
    quyen_han: t.quyenHan.toUpperCase(),
    nguoi_ky: t.nguoiKy,
  };
}

