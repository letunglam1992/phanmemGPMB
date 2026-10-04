/**
 * Dữ liệu điền mẫu Word "Báo cáo tổng hợp toàn tỉnh" (public/mau-van-ban/bao-cao-tong-hop-tinh.docx, dựng bằng
 * tools/mau-van-ban/mau-bao-cao-tinh.cjs). Số liệu lấy từ tóm tắt các gói xã, phường đã gửi (không có thông tin cá nhân);
 * phần nhận định (khó khăn khác, nhiệm vụ, kiến nghị) do cán bộ nhập.
 */
import { D, dinhDang } from "@gpmb/core";
import type { ThongTinBaoCao } from "../bao-cao-van-ban";
import type { TomTatDuAn } from "./goi-tinh";
import { moTaCham, type ChamGui } from "./canh-bao";

export type ThongTinBaoCaoTinh = ThongTinBaoCao;
export interface DongBaoCao extends TomTatDuAn {
  donViGui: string;
  /** ISO thời điểm số liệu của gói */
  luc: string;
}

const tien = (v: string | { toFixed: (n: number) => string }) => dinhDang(typeof v === "string" ? v : v.toFixed(0), 0);
const pt = (a: number, b: number) => (b ? `${dinhDang((a / b) * 100, 1).replace(/,0$/, "")}%` : "—");
const ngayVN = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const tenXa = (d: { xa: string }) => d.xa || "(Chưa ghi xã, phường)";

export function duLieuBaoCaoTinh(dong: DongBaoCao[], t: ThongTinBaoCaoTinh, o: { phamVi: string; denNgay: string; soDonVi: number; cham: ChamGui[]; nguong: number | null }): Record<string, unknown> {
  const cong = (f: (d: DongBaoCao) => number, ds = dong) => ds.reduce((s, d) => s + f(d), 0);
  const tamTinh = (ds: DongBaoCao[]) => ds.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0));
  const bg = (d: DongBaoCao) => d.theoTrangThai.HOAN_THANH ?? 0;
  const soHo = cong((d) => d.soHo);
  const nhomXa = new Map<string, DongBaoCao[]>();
  for (const d of dong) nhomXa.set(tenXa(d), [...(nhomXa.get(tenXa(d)) ?? []), d]);
  const xa = [...nhomXa.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  const dt = dong.reduce((s, d) => s.plus(D(d.dienTichThuHoi)), D(0));
  const vm = dong.filter((d) => d.soVuongMac > 0);
  const tongQuat = [
    `Tổng hợp từ số liệu của ${o.soDonVi} đơn vị gửi (${xa.length} xã, phường): ${dong.length} dự án; ${soHo} hộ gia đình, cá nhân, tổ chức có đất thu hồi; tổng diện tích thu hồi theo hồ sơ ${dinhDang(dt, 1)} m².`,
    `Đã bàn giao mặt bằng ${cong(bg)}/${soHo} hộ (${pt(cong(bg), soHo)}); ${cong((d) => d.soHoDaDuyetPA)} hộ đã có phương án được phê duyệt; ${cong((d) => d.soVuongMac)} hộ đang ghi vướng mắc.`,
    `Giá trị bồi thường, hỗ trợ tạm tính theo hồ sơ ${tien(tamTinh(dong))} đồng (chưa phải số đã phê duyệt).`,
  ].join(" ");
  const [y, m, dd] = t.ngayKy ? t.ngayKy.split("-") : ["", "", ""];
  const noiNhan = t.noiNhan.split("\n").map((x) => x.trim()).filter(Boolean);
  return {
    CO_QUAN_CAP_TREN: t.coQuanCapTren.toUpperCase(),
    CO_QUAN: t.coQuan.toUpperCase(),
    ky_hieu: t.kyHieu,
    so: t.so,
    dia_danh: t.diaDanh,
    ngay: dd ?? "",
    thang: m ?? "",
    nam: y ?? "",
    kinh_gui: t.kinhGui,
    pham_vi: o.phamVi,
    den_ngay: ngayVN(o.denNgay),
    mo_dau: t.moDau,
    tong_quat: tongQuat,
    xa: xa.map(([ten, ds], i) => ({ tt: i + 1, ten, so_du_an: ds.length, so_ho: cong((d) => d.soHo, ds), ban_giao: cong(bg, ds), vuong_mac: cong((d) => d.soVuongMac, ds), da_duyet: cong((d) => d.soHoDaDuyetPA, ds), tam_tinh: tien(tamTinh(ds)) })),
    so_du_an: dong.length,
    so_ho: soHo,
    ban_giao: cong(bg),
    vuong_mac: cong((d) => d.soVuongMac),
    da_duyet: cong((d) => d.soHoDaDuyetPA),
    tam_tinh: tien(tamTinh(dong)),
    du_an: dong.map((d, i) => ({ tt: i + 1, ten: `${d.ten} (${tenXa(d)})`, so_ho: d.soHo, ban_giao: `${bg(d)} (${pt(bg(d), d.soHo)})`, vuong_mac: d.soVuongMac, da_duyet: d.soHoDaDuyetPA, dt: dinhDang(d.dienTichThuHoi, 1), den_ngay: ngayVN(d.luc) })),
    tinh_hinh_gui: !o.nguong
      ? `Số liệu tổng hợp theo lần gửi gần nhất của từng đơn vị (cột "Số liệu đến" ở bảng trên).`
      : o.cham.length
        ? `Có ${o.cham.length} đơn vị quá ${o.nguong} ngày chưa gửi số liệu mới:`
        : `Các đơn vị đều đã gửi số liệu trong vòng ${o.nguong} ngày.`,
    cham_gui: o.cham.map((c) => ({ ten: c.ten, noi_dung: moTaCham(c) })),
    co_vuong_mac: vm.length > 0,
    tong_vuong_mac: cong((d) => d.soVuongMac),
    ds_vuong_mac: vm.map((d) => `${d.ten} (${tenXa(d)}: ${d.soVuongMac} hộ)`).join("; "),
    co_kho_khan_khac: !!t.khoKhanKhac.trim(),
    kho_khan_khac: t.khoKhanKhac,
    nhiem_vu: t.nhiemVu,
    kien_nghi: t.kienNghi,
    ket_thuc: t.ketThuc,
    noi_nhan_ds: noiNhan.map((x, i) => `- ${x.replace(/[;.]$/, "")}${i === noiNhan.length - 1 ? "." : ";"}`),
    quyen_han: t.quyenHan.toUpperCase(),
    nguoi_ky: t.nguoiKy,
  };
}
