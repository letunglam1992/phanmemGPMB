import { useEffect } from "react";
import { useUngDung } from "../ung-dung";
import { coQuyen } from "../tai-khoan";
import { docCauHinhCong, dsGoiTrenCong } from "../tong-hop-tinh/cong-tinh";
import { docKhoaTinh } from "../tong-hop-tinh/kho-tinh";
import { SU_KIEN_GOI_MOI, chuaTai, datChoNhan, layKhoaMo, taiGoiMoi } from "../tong-hop-tinh/phien-tinh";
import { kiemCongMotLan, lapLichKiemCong } from "../tong-hop-tinh/theo-doi-cong";

const homNay = () => new Date().toISOString().slice(0, 10);

/**
 * Chạy nền ở máy cấp tỉnh (đã cài cổng, tài khoản quản trị/lãnh đạo): kiểm tra cổng sau khi mở phần mềm và mỗi 30 phút.
 * Khóa tỉnh đang mở → tự tải, nhận gói mới (khóa ký đổi thì để người dùng xác nhận khi bấm tải); đang khóa → chuông báo
 * "có gói mới trên cổng" để mở khóa nhận. Logic ở tong-hop-tinh/theo-doi-cong.ts (có kiểm thử).
 */
export function TheoDoiGoiTinh() {
  const { taiKhoan, chiXem, ghiNhatKy, bao } = useUngDung();
  const vaiTro = taiKhoan?.vaiTro;
  useEffect(() => {
    if (!taiKhoan || chiXem || !coQuyen(vaiTro, "CAI_DAT")) return;
    return lapLichKiemCong(async () => {
      await kiemCongMotLan({
        cong: docCauHinhCong("TINH"),
        khoaMo: layKhoaMo(),
        docKhoaTinh,
        taiGoiMoi: (cong, khoa) =>
          taiGoiMoi(cong, khoa, {
            homNay: homNay(),
            khiNhan: (x) => ghiNhatKy("Tự động nhận gói dữ liệu gửi tỉnh (cổng)", `${x.banGhi.donViGui} · ${x.banGhi.thongTin.soDuAn} dự án, ${x.banGhi.thongTin.soHo} hồ sơ`).catch(() => undefined),
          }),
        dsGoiTrenCong,
        chuaTai,
        datChoNhan,
        bao: (s) => bao(s),
        phatGoiMoi: () => window.dispatchEvent(new Event(SU_KIEN_GOI_MOI)),
      });
    });
  }, [taiKhoan?.ten, vaiTro, chiXem]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
