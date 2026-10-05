import { useEffect } from "react";
import { useUngDung } from "../ung-dung";
import { coQuyen } from "../tai-khoan";
import { docCauHinhCong } from "../tong-hop-tinh/cong-tinh";
import { docKhoaTinh } from "../tong-hop-tinh/kho-tinh";
import { SU_KIEN_GOI_MOI, chuaTai, datChoNhan, layKhoaMo, taiGoiMoi } from "../tong-hop-tinh/phien-tinh";
import { dsGoiTrenCong } from "../tong-hop-tinh/cong-tinh";

const homNay = () => new Date().toISOString().slice(0, 10);

/**
 * Chạy nền ở máy cấp tỉnh (đã cài cổng, tài khoản quản trị/lãnh đạo): kiểm tra cổng sau khi mở phần mềm và mỗi 30 phút.
 * Khóa tỉnh đang mở → tự tải, nhận gói mới (khóa ký đổi thì để người dùng xác nhận khi bấm tải); đang khóa → chuông báo
 * "có gói mới trên cổng" để mở khóa nhận.
 */
export function TheoDoiGoiTinh() {
  const { taiKhoan, chiXem, ghiNhatKy, bao } = useUngDung();
  const vaiTro = taiKhoan?.vaiTro;
  useEffect(() => {
    if (!taiKhoan || chiXem || !coQuyen(vaiTro, "CAI_DAT")) return;
    let dang = false;
    const chay = async () => {
      const cong = docCauHinhCong("TINH");
      if (dang || !cong) return;
      dang = true;
      try {
        const km = layKhoaMo();
        const tinh = km ? await docKhoaTinh() : null;
        if (km && tinh && tinh.vanTay === km.vanTay) {
          const r = await taiGoiMoi(cong, { tinh, biMat: km.biMat }, {
            homNay: homNay(),
            khiNhan: (x) => ghiNhatKy("Tự động nhận gói dữ liệu gửi tỉnh (cổng)", `${x.banGhi.donViGui} · ${x.banGhi.thongTin.soDuAn} dự án, ${x.banGhi.thongTin.soHo} hồ sơ`).catch(() => undefined),
          });
          if (r.soNhan) {
            bao(`Đã tự nhận ${r.soNhan} gói mới từ cổng: ${r.ketQua.filter((k) => /nhận mới|cập nhật/.test(k)).map((k) => k.split(":")[0]).join("; ")}`);
            window.dispatchEvent(new Event(SU_KIEN_GOI_MOI));
          }
        } else datChoNhan(chuaTai(await dsGoiTrenCong(cong)));
      } catch {
        /* mất mạng, cổng lỗi: lần sau thử lại */
      } finally {
        dang = false;
      }
    };
    const t0 = setTimeout(() => void chay(), 20_000);
    const t = setInterval(() => void chay(), 30 * 60_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [taiKhoan?.ten, vaiTro, chiXem]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
