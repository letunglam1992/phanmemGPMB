/**
 * Bảng tính chi tiết và giải trình từng khoản của một hộ (1.0.4) → tài liệu in / Word. Cùng số liệu, cùng thứ tự với
 * màn Tính toán (tinh-ho.ts); không tính lại, không thêm khoản.
 */
import { D, dinhDang, type DongTinh } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "../mo-hinh";
import type { DongKetQua, KetQuaHo } from "../tinh-ho";
import { tenDayDu } from "./loai-dat";
import { hienSo } from "../so";
import { hienLyTrinh } from "../ly-trinh";
import type { Chu, Doan, TaiLieu } from "./tai-lieu-don-gian";

const tien = (d: Decimal | null | undefined) => (d ? dinhDang(d, 0) : "—");
const DO = "B03A2E", VANG = "8A5A00", TIM = "5A47A3";
export const tenTrangThai = (d: DongTinh): Chu =>
  d.trangThai === "THIEU_CAN_CU" ? { t: "Thiếu căn cứ", mau: DO, dam: true } : d.trangThai === "CAN_XAC_NHAN" ? { t: "Cần xác nhận", mau: VANG, dam: true } : d.luaChon.length ? { t: "Có lựa chọn", mau: TIM } : { t: "Tạm tính" };
const canCuNgan = (d: DongTinh) => d.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(" – ")).join("; ");

export function taiLieuBangTinh(duAn: DuAn, h: Ho, kq: KetQuaHo, ngay = new Date()): TaiLieu {
  const khoi: Doan[] = [];
  const ngayIn = ngay.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  khoi.push({ loai: "tieu-de", cap: 1, chu: "BẢNG TÍNH CHI TIẾT BỒI THƯỜNG, HỖ TRỢ VÀ GIẢI TRÌNH" });
  khoi.push({ loai: "doan", canh: "giua", chu: [{ t: `Dự án: ${duAn.ten} — ${duAn.xa}`, nghieng: true }] });
  khoi.push({ loai: "doan", truoc: 6, chu: [{ t: "Hộ, cá nhân, tổ chức: ", dam: true }, `${h.ten} (mã ${h.ma})`] });
  if (h.diaChi) khoi.push({ loai: "doan", chu: [{ t: "Địa chỉ: ", dam: true }, h.diaChi] });
  khoi.push({ loai: "doan", chu: [{ t: `Số liệu tạm tính, in ngày ${ngayIn} từ Phần mềm GPMB Sơn La — là dự thảo phục vụ lập phương án, giá trị chính thức theo phương án được cấp có thẩm quyền phê duyệt.`, nghieng: true }], co: 11 });

  // I. Thửa đất
  khoi.push({ loai: "tieu-de", cap: 2, chu: "I. THỬA ĐẤT BỊ THU HỒI" });
  const coLt = h.thua.some((t) => t.lyTrinh);
  khoi.push({
    loai: "bang",
    cot: [{ ten: "STT", rong: 5 }, { ten: "Tờ", rong: 6 }, { ten: "Thửa", rong: 7 }, { ten: "Loại đất", rong: 28 }, { ten: "DT thửa (m²)", rong: 11, so: true }, { ten: "DT thu hồi (m²)", rong: 11, so: true }, { ten: "Nguồn gốc", rong: coLt ? 18 : 32 }, ...(coLt ? [{ ten: "Lý trình", rong: 14 }] : [])],
    dong: [
      ...h.thua.map((t, i) => ({ o: [String(i + 1), t.soTo, t.soThua, tenDayDu(t.loaiDat), hienSo(t.dienTich), hienSo(t.dienTichThuHoi), t.nguonGoc, ...(coLt ? [hienLyTrinh(t.lyTrinh)] : [])] })),
      { kieu: "tong" as const, o: ["", "Cộng", "", "", "", hienSo(h.thua.reduce((s, t) => s.plus(D(t.dienTichThuHoi || "0")), D(0)).toString()), "", ...(coLt ? [""] : [])] },
    ],
  });

  // II. Bảng tính
  khoi.push({ loai: "tieu-de", cap: 2, chu: "II. BẢNG TÍNH CHI TIẾT" });
  const cong = (ds: DongKetQua[]) => ds.reduce((s, x) => (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien ? s.plus(x.dong.thanhTien) : s), D(0) as Decimal);
  const tenThua = (id?: string) => {
    const t = h.thua.find((x) => x.id === id);
    return t ? `Thửa ${t.soThua}, tờ ${t.soTo} (${tenDayDu(t.loaiDat)}, ${hienSo(t.dienTichThuHoi)} m²)` : "";
  };
  const dong: Extract<Doan, { loai: "bang" }>["dong"] = [];
  const thuTu: DongKetQua[] = [];
  const phan = (ma: string, chu: string, ten: string) => {
    const ds = kq.nhom.filter((n) => n.ma.startsWith(ma));
    if (!ds.length) return;
    dong.push({ kieu: "nhom", o: [chu, ten, tien(cong(ds.flatMap((n) => n.dong))), "", ""] });
    for (const n of ds) {
      dong.push({ kieu: "nhom", o: [n.ma.split(".")[1] ?? "", n.ten, tien(cong(n.dong)), "", ""] });
      const theoThua = [...new Set(n.dong.map((x) => x.thuaId))];
      for (const tid of theoThua) {
        if (theoThua.length > 1 || tid) dong.push({ kieu: "phu", gop: 4, o: ["", [{ t: tenThua(tid) || "Chung cho hộ", nghieng: true }]] });
        for (const x of n.dong.filter((y) => y.thuaId === tid)) {
          thuTu.push(x);
          const ts = Object.entries(x.dong.thamSo).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join("; ");
          dong.push({ o: [String(thuTu.length), [{ t: x.dong.noiDung }, ...(ts ? [{ t: `\n${ts}`, nghieng: true }] : [])], tien(x.dong.thanhTien), canCuNgan(x.dong), [tenTrangThai(x.dong)]] });
        }
      }
    }
  };
  phan("A", "A", "GIÁ TRỊ BỒI THƯỜNG");
  phan("B", "B", "GIÁ TRỊ HỖ TRỢ");
  dong.push({ kieu: "tong", o: ["", "Tổng cộng (A + B) — chưa làm tròn", tien(kq.tong.tongChuaLamTron.toDecimalPlaces(0)), "", ""] });
  dong.push({ kieu: "tong", o: ["", `Tổng sau làm tròn — ${kq.moTaLamTron}`, tien(kq.tong.tongLamTron), "", ""] });
  dong.push({ o: ["", "Khấu trừ nghĩa vụ tài chính", tien(kq.khauTru), "", ""] });
  dong.push({ kieu: "tong", o: ["", "Số tiền thực nhận", tien(kq.conLai), "", kq.tong.duocChot ? "Đủ điều kiện chốt" : [{ t: "Chưa chốt được", mau: VANG }]] });
  khoi.push({ loai: "bang", cot: [{ ten: "STT", rong: 5 }, { ten: "Khoản", rong: 40 }, { ten: "Thành tiền (đ)", rong: 14, so: true }, { ten: "Căn cứ", rong: 29 }, { ten: "Trạng thái", rong: 12 }], dong });
  if (!kq.tatCa.length) khoi.push({ loai: "doan", chu: [{ t: "Chưa có khoản nào.", nghieng: true }] });

  // III. Giải trình
  if (thuTu.length) khoi.push({ loai: "tieu-de", cap: 2, chu: "III. GIẢI TRÌNH TỪNG KHOẢN" });
  thuTu.forEach((x, i) => {
    const d = x.dong;
    const t = h.thua.find((y) => y.id === x.thuaId);
    const coThua = t && !d.noiDung.includes(`Thửa ${t.soThua}, tờ ${t.soTo}`);
    khoi.push({ loai: "tieu-de", cap: 3, chu: `${i + 1}. ${d.noiDung}${coThua ? ` — ${tenThua(x.thuaId)}` : ""}` });
    khoi.push({ loai: "doan", chu: [{ t: "Thành tiền: ", dam: true }, d.thanhTien ? `${tien(d.thanhTien)} đồng` : "Chưa tính được", d.thanhTien && !d.thanhTien.isInteger() ? { t: ` (đầy đủ ${hienSo(d.thanhTien.toString())} đ, làm tròn ở tổng hộ)`, nghieng: true } : "", "   ", tenTrangThai(d)] });
    if (d.congThuc) khoi.push({ loai: "doan", chu: [{ t: "Công thức: ", dam: true }, d.congThuc] });
    for (const [k, v] of Object.entries(d.thamSo)) khoi.push({ loai: "doan", chu: [`– ${k}: `, { t: v }] });
    if (d.canCu.length) khoi.push({ loai: "doan", chu: [{ t: "Căn cứ: ", dam: true }, d.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(" – ") + (c.ghiChu ? ` (${c.ghiChu})` : "")).join("; ")] });
    for (const l of d.luaChon) khoi.push({ loai: "doan", chu: [{ t: "Lựa chọn của người dùng: ", dam: true, mau: TIM }, `${l.ma} = ${l.giaTri} — lý do: ${l.lyDo}`] });
    for (const c of d.canhBao) khoi.push({ loai: "doan", chu: [{ t: "Lưu ý: ", dam: true, mau: VANG }, c] });
  });
  khoi.push({ loai: "doan", truoc: 12, canh: "phai", chu: [{ t: "NGƯỜI LẬP BIỂU", dam: true }] });
  khoi.push({ loai: "doan", canh: "phai", chu: [{ t: "(Ký, ghi rõ họ tên)", nghieng: true }] });
  return { tieuDe: `Bảng tính, giải trình — ${h.ma} ${h.ten}`, khoi };
}
