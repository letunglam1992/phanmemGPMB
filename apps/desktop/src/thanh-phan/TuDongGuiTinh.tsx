import { useEffect } from "react";
import { useUngDung } from "../ung-dung";
import { coQuyen } from "../tai-khoan";
import { docCheDo } from "../kho-mang";
import { docCauHinhCong } from "../tong-hop-tinh/cong-tinh";
import { SU_KIEN_TU_GUI, tuGuiNeuDenHan } from "../tong-hop-tinh/tu-gui";
import { PHIEN_BAN } from "../phien-ban";

/**
 * Chạy nền: xã đã bật "Tự động gửi lên cổng" thì đến hạn tự tạo gói và gửi (kiểm tra sau khi mở phần mềm và mỗi 30 phút).
 * Không chạy ở máy trạm (máy chủ hoặc máy đơn đảm nhận), ở phiên chỉ xem, hoặc khi tài khoản không có quyền sao lưu.
 */
export function TuDongGuiTinh() {
  const { kho, taiKhoan, chiXem, ghiNhatKy, bao } = useUngDung();
  const vaiTro = taiKhoan?.vaiTro;
  useEffect(() => {
    if (!taiKhoan || chiXem || !coQuyen(vaiTro, "SAO_LUU") || docCheDo().cheDo === "MAY_TRAM") return;
    let dang = false;
    const chay = async () => {
      const cong = docCauHinhCong("XA");
      if (dang || !cong) return;
      dang = true;
      try {
        const r = await tuGuiNeuDenHan(kho, cong, { ungDung: PHIEN_BAN, nguoiXuat: `Tự động (${taiKhoan.hoTen})` });
        if (!r) return;
        await ghiNhatKy(r.ok ? "Tự động gửi dữ liệu lên tỉnh (cổng)" : "Tự động gửi dữ liệu lên tỉnh không thành công", r.chiTiet).catch(() => undefined);
        bao(r.ok ? `Đã tự động gửi số liệu lên cổng của tỉnh (${r.chiTiet})` : `Tự động gửi lên tỉnh không thành công: ${r.chiTiet} — sẽ thử lại sau`, r.ok ? "ok" : "loi");
      } catch {
        /* lỗi bất thường: lần sau thử lại */
      } finally {
        dang = false;
      }
    };
    const t0 = setTimeout(() => void chay(), 20_000);
    const t = setInterval(() => void chay(), 30 * 60_000);
    const ngay = () => void chay();
    window.addEventListener(SU_KIEN_TU_GUI, ngay);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      window.removeEventListener(SU_KIEN_TU_GUI, ngay);
    };
  }, [kho, taiKhoan?.ten, vaiTro, chiXem]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
