/**
 * 1.2.0 (D2) — Phần bổ sung của báo cáo Word cấp xã: tiến độ theo tháng (cộng các dự án trong báo cáo — biểu đồ tỷ lệ hộ đã
 * duyệt phương án, đã bàn giao mặt bằng), đơn khiếu nại, kiến nghị quá hạn, lịch cưỡng chế. Chỉ dùng ngày cán bộ đã ghi.
 */
import { dienBienDuAn } from "./dien-bien-du-an";
import { TEN_LOAI_DON, TEN_TT_DON, hanDon } from "./khieu-nai";
import { TEN_LOAI_CC, lichCuongChe } from "./cuong-che";
import type { LichLamViec } from "./lich-lam-viec";
import type { DuAn, Ho } from "./mo-hinh";
import type { DiemDienBien } from "./tong-hop-tinh/ve-bieu-do";

const vn = (iso: string) => iso.split("-").reverse().join("/");
const thang = (ky: string) => `${ky.slice(5)}/${ky.slice(0, 4)}`;
const pt = (a: number, b: number) => (b ? `${((a / b) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "—");

export interface KyGop {
  ky: string;
  soHo: number;
  duyetPA: number;
  banGiao: number;
}

/** Cộng diễn biến theo tháng của các dự án (dự án chưa có mốc ở tháng đầu tính 0 hộ đạt, vẫn cộng số hộ). */
export function gopDienBien(ds: { duAn: DuAn; hos: Ho[] }[], homNay: string): KyGop[] {
  const m = new Map<string, KyGop>();
  const cacDuAn = ds.map(({ duAn, hos }) => ({ soHo: hos.length, ky: dienBienDuAn(duAn, hos, homNay) }));
  const tatCaKy = [...new Set(cacDuAn.flatMap((x) => x.ky.map((k) => k.ky)))].sort();
  for (const ky of tatCaKy) m.set(ky, { ky, soHo: 0, duyetPA: 0, banGiao: 0 });
  for (const x of cacDuAn) {
    let truoc = { duyetPA: 0, banGiao: 0 };
    for (const ky of tatCaKy) {
      const k = x.ky.find((y) => y.ky === ky);
      if (k) truoc = { duyetPA: k.duyetPA, banGiao: k.banGiao };
      const g = m.get(ky)!;
      g.soHo += x.soHo;
      g.duyetPA += truoc.duyetPA;
      g.banGiao += truoc.banGiao;
    }
  }
  return tatCaKy.map((k) => m.get(k)!);
}

export function duLieuBoSungBaoCaoXa(ds: { duAn: DuAn; hos: Ho[] }[], homNay: string, lich: LichLamViec): Record<string, unknown> & { bieu_do_thang: DiemDienBien[] } {
  const ky = gopDienBien(ds, homNay).slice(-12);
  const a = ky[ky.length - 2], b = ky[ky.length - 1];
  const cau =
    a && b
      ? `Đến tháng ${thang(b.ky)}: đã phê duyệt phương án ${b.duyetPA}/${b.soHo} hộ (${pt(b.duyetPA, b.soHo)}), đã bàn giao mặt bằng ${b.banGiao}/${b.soHo} hộ (${pt(b.banGiao, b.soHo)}); so với tháng ${thang(a.ky)}: duyệt phương án thêm ${b.duyetPA - a.duyetPA} hộ, bàn giao thêm ${b.banGiao - a.banGiao} hộ. Biểu đồ: tỷ lệ hộ theo ngày đã ghi ở hồ sơ.`
      : "";
  const don = ds.flatMap(({ duAn, hos }) =>
    hos.flatMap((h) =>
      (h.khieuNai ?? []).map((d) => ({ duAn, h, d, t: hanDon(d, homNay, lich) })).filter((x) => x.t.tt === "QUA_HAN" || x.t.tt === "QUA_HAN_THU_LY"),
    ),
  );
  const lich30 = ds.flatMap(({ duAn, hos }) => lichCuongChe(hos, homNay, lich).map((x) => ({ duAn, x }))).sort((p, q) => p.x.ngayDuKien.localeCompare(q.x.ngayDuKien));
  return {
    co_tien_do_thang: ky.length >= 2,
    cau_tien_do_thang: cau,
    bieu_do_thang: ky.length >= 2 ? ky.map((k) => ({ ky: k.ky, banGiao: k.soHo ? (k.banGiao / k.soHo) * 100 : 0, duyetPA: k.soHo ? (k.duyetPA / k.soHo) * 100 : 0 })) : [],
    co_don_qua_han: don.length > 0,
    so_don_qua_han: don.length,
    don_qua_han: don.map(({ duAn, h, d, t }) => ({
      du_an: duAn.ten,
      ho: `${h.ma} ${h.ten}`,
      don: `${TEN_LOAI_DON[d.loai]}${d.loai === "KHIEU_NAI" ? ` lần ${d.lan ?? 1}` : ""} nhận ngày ${vn(d.ngayNhan)}`,
      tinh_trang: TEN_TT_DON[t.tt].toLowerCase(),
      han: t.han ? vn(t.han) : "",
    })),
    co_lich_cc: lich30.length > 0,
    lich_cc: lich30.map(({ duAn, x }) => ({
      ngay: vn(x.ngayDuKien),
      du_an: duAn.ten,
      ho: `${x.h.ma} ${x.h.ten}`,
      loai: TEN_LOAI_CC[x.c.loai].replace("Cưỡng chế thực hiện quyết định ", "").toLowerCase(),
      han_cong_an: vn(x.hanCongAn),
      luu_y: x.canhBao.length ? ` — lưu ý: ${x.canhBao.join("; ")}` : "",
    })),
  };
}
