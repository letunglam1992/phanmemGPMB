/** Dữ liệu điền mẫu Word "Báo cáo tổng hợp" (public/mau-van-ban/bao-cao-tong-hop.docx). */
import { dinhDang } from "@gpmb/core";
import { TEN_TINH_TRANG, type BaoCao } from "./bao-cao";

export interface ThongTinBaoCao {
  coQuanCapTren: string;
  coQuan: string;
  kyHieu: string;
  diaDanh: string;
  kinhGui: string;
  so: string;
  /** ISO */
  ngayKy: string;
  moDau: string;
  khoKhanKhac: string;
  nhiemVu: string;
  kienNghi: string;
  ketThuc: string;
  noiNhan: string;
  quyenHan: string;
  nguoiKy: string;
}

const tien = (v: { toFixed: (n: number) => string }) => dinhDang(v.toFixed(0), 0);
const phanTram = (a: number, b: number) => (b ? `${dinhDang((a / b) * 100, 1).replace(/,0$/, "")}%` : "—");
const ngayVN = (iso: string) => iso.split("-").reverse().join("/");

export function duLieuBaoCaoWord(bc: BaoCao, t: ThongTinBaoCao): Record<string, unknown> {
  const s = bc.tong;
  const [y, m, d] = t.ngayKy ? t.ngayKy.split("-") : ["", "", ""];
  const tongQuat = [
    `Tổng số ${s.soDuAn} dự án; ${s.soHo} hộ gia đình, cá nhân, tổ chức có đất thu hồi; tổng diện tích thu hồi ${dinhDang(s.dtThuHoi, 2)} m².`,
    `Kinh phí bồi thường, hỗ trợ, tái định cư tạm tính ${tien(s.tamTinh)} đồng.`,
    s.soHoDaDuyet
      ? `Đã phê duyệt phương án cho ${s.soHoDaDuyet}/${s.soHo} hộ với kinh phí ${tien(s.daDuyet)} đồng; đã chi trả ${tien(s.daChi)} đồng (${phanTram(s.daChi.toNumber(), s.daDuyet.toNumber())} kinh phí đã duyệt), còn phải chi ${tien(s.conPhaiChi)} đồng.`
      : "Chưa có phương án được phê duyệt.",
    `Đã hoàn thành giải phóng mặt bằng ${s.theoTrangThai.HOAN_THANH}/${s.soHo} hộ (${phanTram(s.theoTrangThai.HOAN_THANH, s.soHo)})${s.theoTrangThai.VUONG_MAC ? `; ${s.theoTrangThai.VUONG_MAC} hộ đang vướng mắc` : ""}.`,
  ].join(" ");
  const noiNhan = t.noiNhan.split("\n").map((x) => x.trim()).filter(Boolean);
  return {
    CO_QUAN_CAP_TREN: t.coQuanCapTren.toUpperCase(),
    CO_QUAN: t.coQuan.toUpperCase(),
    ky_hieu: t.kyHieu,
    so: t.so,
    dia_danh: t.diaDanh,
    ngay: d ?? "",
    thang: m ?? "",
    nam: y ?? "",
    kinh_gui: t.kinhGui,
    co_pham_vi: !!bc.loc.xa,
    pham_vi: bc.loc.xa ? bc.loc.xa.replace(/^(Xã|Phường) /, (x) => x.toLowerCase()) : "",
    den_ngay: ngayVN(bc.loc.denNgay),
    mo_dau: t.moDau,
    tong_quat: tongQuat,
    du_an: bc.dong.map((x, i) => ({
      tt: i + 1,
      ten: `${x.duAn.ten} (${x.duAn.xa})`,
      so_ho: x.soHo,
      dt: dinhDang(x.dtThuHoi, 2),
      da_duyet: x.soHoDaDuyet ? tien(x.daDuyet) : "Chưa duyệt",
      da_chi: tien(x.daChi),
      hoan_thanh: `${x.theoTrangThai.HOAN_THANH}/${x.soHo}`,
      tinh_trang: TEN_TINH_TRANG[x.tinhTrang],
    })),
    so_ho: s.soHo,
    dt: dinhDang(s.dtThuHoi, 2),
    da_duyet: tien(s.daDuyet),
    da_chi: tien(s.daChi),
    ho_hoan_thanh: `${s.theoTrangThai.HOAN_THANH}/${s.soHo}`,
    vuong_mac: bc.dong.flatMap((x) => x.vuongMac.map((c) => ({ du_an: x.duAn.ten, noi_dung: c.noiDung.replace(/[.;]$/, "") + "." }))),
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
