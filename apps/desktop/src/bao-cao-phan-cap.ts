/**
 * 1.3.0 (A1) — Báo cáo kết quả thực hiện nhiệm vụ, quyền hạn được phân cấp (khoản 2 Điều 4 QĐ 27/2026/QĐ-UBND — định kỳ 06 tháng).
 * Số liệu: văn bản trong Sổ văn bản đi của đơn vị có ngày ký trong kỳ, thuộc nhiệm vụ phân cấp (mẫu của phần mềm theo cấu hình thẩm
 * quyền; văn bản ghi tay theo nhiệm vụ cán bộ chọn). Phần mềm chỉ đếm — nhận xét, khó khăn, kiến nghị do cán bộ viết.
 */
import { cauHinhThamQuyen, type CauHinhThamQuyen, type NhiemVuPhanCap } from "./van-ban/tham-quyen";
import type { VanBanDi } from "./so-van-ban";

const vn = (iso: string) => iso.split("-").reverse().join("/");

/** Mã nhiệm vụ của một dòng sổ (null = không thuộc nhiệm vụ phân cấp). */
export function nhiemVuCuaVanBan(x: Pick<VanBanDi, "ma" | "nhiemVu">, c: CauHinhThamQuyen = cauHinhThamQuyen()): string | null {
  if (x.nhiemVu) return c.nhiemVu.some((n) => n.ma === x.nhiemVu) ? x.nhiemVu : null;
  return c.nhiemVu.find((n) => n.mau.includes(x.ma))?.ma ?? null;
}

export interface DongPhanCap {
  nv: NhiemVuPhanCap;
  ds: VanBanDi[];
}

/** Đếm theo nhiệm vụ trong kỳ [tu, den]; bỏ dòng trùng số đầy đủ cùng ngày (văn bản cấp nhiều lần do tạo lại). */
export function thongKePhanCap(ds: VanBanDi[], tu: string, den: string, c: CauHinhThamQuyen = cauHinhThamQuyen()): DongPhanCap[] {
  const out = c.nhiemVu.map((nv) => ({ nv, ds: [] as VanBanDi[] }));
  const daCo = new Set<string>();
  for (const x of [...ds].sort((a, b) => a.ngay.localeCompare(b.ngay))) {
    if (x.ngay < tu || x.ngay > den) continue;
    const ma = nhiemVuCuaVanBan(x, c);
    if (!ma) continue;
    const k = `${x.soDayDu}|${x.ngay}|${x.duAnId}`;
    if (daCo.has(k)) continue;
    daCo.add(k);
    out.find((d) => d.nv.ma === ma)!.ds.push(x);
  }
  return out;
}

export interface ThongTinBcpc {
  so: string;
  ngayKy: string;
  tenXa: string;
  diaDanh: string;
  kinhGui: string;
  khoKhan: string;
  kienNghi: string;
  noiDungKhac: string;
  noiNhan: string;
  quyenHan: string;
  nguoiKy: string;
}

/** 1.3.0 (B3) — kỳ trước liền kề, cùng độ dài với kỳ [tu, den]. */
export function kyTruoc(tu: string, den: string): { tu: string; den: string } {
  const ngay = 86400000;
  const a = Date.parse(`${tu}T00:00:00Z`), b = Date.parse(`${den}T00:00:00Z`);
  const den2 = a - ngay;
  return { tu: new Date(den2 - (b - a)).toISOString().slice(0, 10), den: new Date(den2).toISOString().slice(0, 10) };
}

export function duLieuBaoCaoPhanCap(dong: DongPhanCap[], tu: string, den: string, t: ThongTinBcpc, c: CauHinhThamQuyen = cauHinhThamQuyen(), truoc?: { tu: string; den: string; dong: DongPhanCap[] }): Record<string, unknown> {
  const [y, m, d] = t.ngayKy ? t.ngayKy.split("-") : ["", "", ""];
  const tong = dong.reduce((s, x) => s + x.ds.length, 0);
  const tenXa = t.tenXa.trim() || "…………";
  const noiNhan = t.noiNhan.split("\n").map((x) => x.trim().replace(/[;.]$/, "")).filter(Boolean);
  return {
    TEN_XA: tenXa.toUpperCase(),
    ten_xa: tenXa.charAt(0).toLowerCase() + tenXa.slice(1),
    so: t.so,
    dia_danh: t.diaDanh || "…………",
    ngay: d ?? "",
    thang: m ?? "",
    nam: y ?? "",
    tu_ngay: vn(tu),
    den_ngay: vn(den),
    kinh_gui: t.kinhGui,
    qd_so: c.so,
    qd_ten: c.ten,
    tong_quat: tong
      ? `Trong kỳ, Chủ tịch Ủy ban nhân dân ${tenXa.charAt(0).toLowerCase() + tenXa.slice(1)} đã ban hành ${tong} văn bản thuộc ${dong.filter((x) => x.ds.length).length} nhiệm vụ được phân cấp, cụ thể:`
      : "Trong kỳ, chưa ban hành văn bản thuộc các nhiệm vụ được phân cấp dưới đây (theo Sổ văn bản đi của đơn vị):",
    cau_ky_truoc: truoc
      ? (() => {
          const n = truoc.dong.reduce((s, x) => s + x.ds.length, 0);
          return `So với kỳ trước (${vn(truoc.tu)}–${vn(truoc.den)}: ${n} văn bản): ${tong > n ? `tăng ${tong - n}` : tong < n ? `giảm ${n - tong}` : "không đổi"} văn bản.`;
        })()
      : "",
    ds_nv: dong.map((x, i) => ({
      stt: i + 1,
      noi_dung: x.nv.noiDung,
      vi_tri: x.nv.viTri,
      so_vb: String(x.ds.length),
      so_truoc: truoc ? String(truoc.dong.find((y) => y.nv.ma === x.nv.ma)?.ds.length ?? 0) : "—",
      van_ban: x.ds.length ? x.ds.map((v) => `${v.soDayDu} ngày ${vn(v.ngay)}${v.duAnTen ? ` (${v.duAnTen})` : ""}`).join("; ") : "—",
    })),
    noi_dung_khac: t.noiDungKhac.trim(),
    kho_khan: t.khoKhan.trim() || "…………",
    kien_nghi: t.kienNghi.trim() || "…………",
    noi_nhan: noiNhan,
    quyen_han: t.quyenHan.toUpperCase(),
    nguoi_ky: t.nguoiKy,
  };
}
