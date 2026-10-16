/**
 * 1.0.15 — Tiến độ thủ tục theo bản phương án (cho lãnh đạo): mỗi bản (chưa hủy) một dòng — chốt, nhận đủ hồ sơ thẩm định,
 * thẩm định, tờ trình, phê duyệt, gửi QĐ đến từng người; hạn và số ngày làm việc chậm của từng khâu. Thời hạn theo docs/05:
 * thẩm định ≤ 30 NLV (k3 Đ3 NĐ 88/2024), phê duyệt ≤ 5 NLV (điểm c k3 Đ87 LĐĐ 2024), gửi QĐ ≤ 3 NLV (điểm b k4 Đ87).
 * 1.0.16 — chi trả ≤ 30 ngày kể từ ngày QĐ phê duyệt có hiệu lực (điểm a k3 Đ94 LĐĐ 2024; cùng cách tính với thẻ Chi trả)
 * và số hộ đã bàn giao mặt bằng (không có thời hạn chung — chỉ đếm, không tính chậm).
 * Chỉ dùng ngày cán bộ đã ghi; khâu thiếu mốc để trống, không suy đoán.
 */
import type { DuAn, Ho } from "./mo-hinh";
import type { PhienBanPA } from "./phuong-an";
import { hoDaPheDuyet, tenTrangThai } from "./phuong-an";
import { hanChot, soNgayLamViec, type LichLamViec } from "./lich-lam-viec";
import { hanTheoBan, ngayToTrinhPA } from "./han-buoc";
import { taiXuong } from "./tai-xuong";
import { dotHieuLuc, tinhChiTra } from "./chi-tra";
import { tenTep } from "./ten-tep";

export interface KhauThuTuc {
  /** Ngày mốc bắt đầu tính hạn */
  moc: string | null;
  han: string | null;
  /** Ngày hoàn thành (theo văn bản đã ghi) */
  xong: string | null;
  /** Số ngày làm việc (khâu chi trả: số ngày) chậm (>0) — đã xong muộn, hoặc chưa xong mà đã quá hạn (tính đến hôm nay) */
  cham: number;
  dangCham: boolean;
}

export interface DongThuTuc {
  so: number;
  ten: string;
  dot: string;
  soHo: number;
  tong: string;
  trangThai: string;
  chot: string;
  thamDinh: KhauThuTuc;
  pheDuyet: KhauThuTuc;
  guiQd: KhauThuTuc;
  /** Chi trả (hạn 30 ngày, tính theo ngày) — chỉ các hộ mà bản này là bản đã phê duyệt hiện hành */
  chiTra: KhauThuTuc & { daChiDu: number; soHo: number };
  /** Bàn giao mặt bằng: số hộ đã bàn giao / số hộ của bản; ngày bàn giao cuối khi đã bàn giao hết */
  banGiao: { da: number; soHo: number; xong: string | null };
}

const khau = (moc: string | null, han: string | null, xong: string | null, homNay: string, lich: LichLamViec, loai: "NLV" | "N" = "NLV"): KhauThuTuc => {
  const dem = (a: string, b: string) => (loai === "NLV" ? soNgayLamViec(a, b, lich) : Math.round((Date.parse(b) - Date.parse(a)) / 86400000));
  if (!han) return { moc, han, xong, cham: 0, dangCham: false };
  if (xong) return { moc, han, xong, cham: xong > han ? dem(han, xong) : 0, dangCham: false };
  return { moc, han, xong, cham: homNay > han ? dem(han, homNay) : 0, dangCham: homNay > han };
};

/** Khâu chi trả của bản: hạn sớm nhất của các hộ; xong khi mọi hộ đã chi đủ — ngày là ngày chi cuối cùng. */
function khauChiTra(p: PhienBanPA, trong: Ho[], dsPA: PhienBanPA[], homNay: string, lich: LichLamViec): DongThuTuc["chiTra"] {
  const hien = hoDaPheDuyet(dsPA);
  const ds = trong.filter((h) => hien.get(h.id)?.id === p.id).map((h) => ({ h, ct: tinhChiTra(h, dsPA, [], homNay) }));
  const han = ds.map((x) => x.ct.hanChi).filter((x): x is string => !!x).sort()[0] ?? null;
  const du = ds.filter((x) => x.ct.trangThai === "DA_CHI_DU" || x.ct.trangThai === "CHI_VUOT" || (x.ct.phaiTra?.lte(0) ?? false));
  const ngayCuoi = du.flatMap((x) => dotHieuLuc(x.h.chiTra).map((d) => d.ngay)).sort().at(-1) ?? null;
  const xong = ds.length && du.length === ds.length ? ngayCuoi : null;
  const moc = ds.map((x) => x.ct.ngayHieuLuc).filter((x): x is string => !!x).sort()[0] ?? null;
  return { ...khau(moc, han, xong, homNay, lich, "N"), daChiDu: du.length, soHo: ds.length };
}

export function tienDoThuTuc(duAn: DuAn, hos: Ho[], homNay: string, lich: LichLamViec): DongThuTuc[] {
  return [...(duAn.phuongAn ?? [])]
    .filter((p) => p.trangThai !== "DA_HUY")
    .sort((a, b) => a.so - b.so)
    .map((p: PhienBanPA) => {
      const ids = new Set(p.ho.map((x) => x.hoId));
      const trong = hos.filter((h) => ids.has(h.id));
      const td = hanTheoBan(p, "8", hos, homNay, lich);
      const pd = hanTheoBan(p, "9", hos, homNay, lich, ngayToTrinhPA(duAn, p));
      const ngayQd = p.pheDuyet?.ngay || null;
      const xong11 = trong.map((h) => (h.tienDo["11"]?.trangThai === "XONG" ? h.tienDo["11"]?.ngay ?? null : null));
      const guiXong = trong.length && xong11.every(Boolean) ? (xong11 as string[]).sort().at(-1)! : null;
      return {
        so: p.so,
        ten: p.ten,
        dot: p.dotTen ?? "",
        soHo: p.ho.length,
        tong: p.tong,
        trangThai: tenTrangThai(p),
        chot: p.luc.slice(0, 10),
        thamDinh: khau(td.moc, td.hanChot, p.thamDinh?.ngay || null, homNay, lich),
        pheDuyet: p.thamDinh ? khau(pd.moc, pd.hanChot, ngayQd, homNay, lich) : khau(null, null, ngayQd, homNay, lich),
        guiQd: ngayQd ? khau(ngayQd, hanChot(ngayQd, 3, "NLV", lich), guiXong, homNay, lich) : khau(null, null, null, homNay, lich),
        chiTra: p.trangThai === "DA_PHE_DUYET" ? khauChiTra(p, trong, duAn.phuongAn ?? [], homNay, lich) : { ...khau(null, null, null, homNay, lich), daChiDu: 0, soHo: 0 },
        banGiao: (() => {
          const ngay = trong.map((h) => h.banGiao?.ngay ?? null);
          const da = ngay.filter(Boolean).length;
          return { da, soHo: trong.length, xong: trong.length && da === trong.length ? (ngay as string[]).sort().at(-1)! : null };
        })(),
      };
    });
}

/** Excel tiến độ thủ tục (một trang), xuất qua taiXuong. */
export async function xuatTienDoThuTuc(duAn: DuAn, hos: Ho[], homNay: string, lich: LichLamViec): Promise<boolean> {
  const ds = tienDoThuTuc(duAn, hos, homNay, lich);
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Tien do thu tuc");
  const ngay = (s: string | null) => (s ? s.split("-").reverse().join("/") : "");
  ws.addRow([`TIẾN ĐỘ THỦ TỤC THẨM ĐỊNH, PHÊ DUYỆT PHƯƠNG ÁN — ${duAn.ten}`]).font = { bold: true, size: 13 };
  ws.addRow([`Tính đến ngày ${ngay(homNay)}. Thời hạn: thẩm định ≤ 30 ngày làm việc từ ngày nhận đủ hồ sơ (khoản 3 Điều 3 Nghị định 88/2024/NĐ-CP); phê duyệt ≤ 5 ngày làm việc từ ngày nhận tờ trình (điểm c khoản 3 Điều 87 Luật Đất đai 2024); gửi quyết định đến từng người ≤ 3 ngày làm việc từ ngày phê duyệt (điểm b khoản 4 Điều 87); chi trả ≤ 30 ngày kể từ ngày quyết định phê duyệt có hiệu lực (điểm a khoản 3 Điều 94), số ngày chậm tính theo ngày. Ô trống: chưa ghi ngày.`]).font = { italic: true };
  ws.addRow([]);
  const dau = ["Bản", "Tên", "Đợt", "Số hộ", "Tổng giá trị (đ)", "Trạng thái", "Ngày chốt", "Nhận đủ hồ sơ", "Hạn thẩm định", "Ngày thẩm định", "Chậm (NLV)", "Nhận tờ trình", "Hạn phê duyệt", "Ngày phê duyệt", "Chậm (NLV)", "Hạn gửi QĐ", "Gửi xong (hộ cuối)", "Chậm (NLV)", "Hạn chi trả", "Đã chi đủ (hộ)", "Chi xong (khoản cuối)", "Chậm (ngày)", "Đã bàn giao (hộ)", "Bàn giao xong"];
  const r = ws.addRow(dau);
  r.font = { bold: true };
  r.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  const cham = (k: KhauThuTuc) => (k.cham ? `${k.cham}${k.dangCham ? " (chưa xong)" : ""}` : k.han && k.xong ? 0 : "");
  for (const d of ds)
    ws.addRow([d.so, d.ten, d.dot, d.soHo, Number(d.tong), d.trangThai, ngay(d.chot), ngay(d.thamDinh.moc), ngay(d.thamDinh.han), ngay(d.thamDinh.xong), cham(d.thamDinh), ngay(d.pheDuyet.moc), ngay(d.pheDuyet.han), ngay(d.pheDuyet.xong), cham(d.pheDuyet), ngay(d.guiQd.han), ngay(d.guiQd.xong), cham(d.guiQd), ngay(d.chiTra.han), d.chiTra.soHo ? `${d.chiTra.daChiDu}/${d.chiTra.soHo}` : "", ngay(d.chiTra.xong), cham(d.chiTra), `${d.banGiao.da}/${d.banGiao.soHo}`, ngay(d.banGiao.xong)]);
  ws.columns.forEach((c, i) => (c.width = [6, 26, 14, 7, 16, 22, 11, 11, 11, 11, 9, 11, 11, 11, 9, 11, 12, 9, 11, 10, 12, 9, 10, 11][i]));
  ws.getColumn(5).numFmt = "#,##0";
  ws.views = [{ state: "frozen", ySplit: 4 }];
  return !!(await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), tenTep(`Tien-do-thu-tuc-PA - ${duAn.ten}.xlsx`), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
}
