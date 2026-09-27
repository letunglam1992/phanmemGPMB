import { useUngDung } from "./ung-dung";
import { TongQuan } from "./man/TongQuan";
import { ManDuAn } from "./man/DuAn";
import { HoSo } from "./man/HoSo";
import { BanDo } from "./man/BanDo";
import { TraCuu } from "./man/TraCuu";
import { VanBan } from "./man/VanBan";
import { HopSaoLuu } from "./thanh-phan/HopSaoLuu";
import { useState } from "react";
import { HopDoiMatKhau, HopNhatKy, HopQuanLyTaiKhoan, ManDangNhap, ThongBaoNhanh } from "./thanh-phan/TaiKhoan";
import { TEN_VAI_TRO } from "./tai-khoan";
import { HopCaiDat } from "./thanh-phan/HopCaiDat";

export function UngDung() {
  const { man, di, dsDuAn, hopSaoLuu, moSaoLuu, taiKhoan, quyen, dangXuat, hopCaiDat, moCaiDat } = useUngDung();
  const [menu, setMenu] = useState(false);
  const [hop, setHop] = useState<null | "mat-khau" | "tai-khoan" | "nhat-ky">(null);
  if (!taiKhoan) return (<><ManDangNhap /><ThongBaoNhanh /></>);
  const duAnId = "duAnId" in man ? man.duAnId : dsDuAn[0]?.id;
  const muc: { ten: string; chon: boolean; bam: () => void; tat?: boolean }[] = [
    { ten: "Tổng quan", chon: man.ten === "tong-quan", bam: () => di({ ten: "tong-quan" }) },
    { ten: "Dự án & hồ sơ", chon: man.ten === "du-an" || man.ten === "ho", bam: () => duAnId && di({ ten: "du-an", duAnId }), tat: !duAnId },
    { ten: "Bản đồ", chon: man.ten === "ban-do", bam: () => duAnId && di({ ten: "ban-do", duAnId }), tat: !duAnId },
    { ten: "Văn bản", chon: man.ten === "van-ban", bam: () => duAnId && di({ ten: "van-ban", duAnId }), tat: !duAnId },
    { ten: "Tra cứu đơn giá, giá đất", chon: man.ten === "tra-cuu", bam: () => di({ ten: "tra-cuu" }) },
  ];
  return (
    <div className="khung">
      <header className="thanh-tren">
        <div className="logo">
          <div className="logo-dau">GP</div>
          <div>
            GPMB Sơn La
            <small>Bồi thường, hỗ trợ, tái định cư</small>
          </div>
        </div>
        <nav className="dieu-huong">
          {muc.map((m) => (
            <button key={m.ten} className={m.chon ? "chon" : ""} onClick={m.bam} disabled={m.tat}>
              {m.ten}
            </button>
          ))}
        </nav>
        <div className="phai">
          <span className="cham-luu">Dữ liệu lưu trên máy này</span>
          {(quyen("SAO_LUU") || quyen("KHOI_PHUC")) && <button className="nut-tren" onClick={() => moSaoLuu(true)}>Sao lưu, khôi phục</button>}
          <div className="menu-nguoi">
            <button className="nut-tren" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              {taiKhoan.hoTen} · {TEN_VAI_TRO[taiKhoan.vaiTro]} ▾
            </button>
            {menu && (
              <div className="menu-tha" role="menu" onMouseLeave={() => setMenu(false)}>
                <div className="mo chu-nho" style={{ padding: "6px 12px" }}>Đăng nhập: {taiKhoan.ten}</div>
                <button role="menuitem" onClick={() => { setHop("mat-khau"); setMenu(false); }}>Đổi mật khẩu</button>
                <button role="menuitem" onClick={() => { moCaiDat(true); setMenu(false); }}>Cài đặt chung</button>
                {quyen("TAI_KHOAN") && <button role="menuitem" onClick={() => { setHop("tai-khoan"); setMenu(false); }}>Quản lý tài khoản</button>}
                {quyen("XEM_NHAT_KY") && <button role="menuitem" onClick={() => { setHop("nhat-ky"); setMenu(false); }}>Nhật ký hệ thống</button>}
                <button role="menuitem" onClick={() => { setMenu(false); void dangXuat(); }}>Đăng xuất</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="noi-dung">
        {man.ten === "tong-quan" && <TongQuan />}
        {man.ten === "du-an" && <ManDuAn duAnId={man.duAnId} />}
        {man.ten === "ho" && <HoSo duAnId={man.duAnId} hoId={man.hoId} tabDau={man.tab} />}
        {man.ten === "ban-do" && <BanDo duAnId={man.duAnId} />}
        {man.ten === "tra-cuu" && <TraCuu />}
        {man.ten === "van-ban" && <VanBan key={`${man.duAnId}-${man.ma}-${man.hoId}`} duAnId={man.duAnId} maDau={man.ma} hoIdDau={man.hoId} />}
      </main>
      <footer className="chan">
        <span>Bộ chính sách: Sơn La, hiệu lực 31/3/2026 (QĐ 106/2025, QĐ 14/2026, QĐ 32/2025, NQ 152/2025)</span>
        <span>Phần mềm hỗ trợ tính toán — cán bộ có thẩm quyền kiểm tra, phê duyệt</span>
        <span style={{ marginLeft: "auto" }}>Bản thử nghiệm 0.1</span>
      </footer>
      {!quyen("SUA_HO_SO") && <div className="dai-chi-xem">Tài khoản chỉ xem: không sửa được dữ liệu</div>}
      {hopSaoLuu && <HopSaoLuu />}
      {(hop === "mat-khau" || taiKhoan.phaiDoiMatKhau) && <HopDoiMatKhau batBuoc={taiKhoan.phaiDoiMatKhau} dong={() => setHop(null)} />}
      {hop === "tai-khoan" && <HopQuanLyTaiKhoan dong={() => setHop(null)} />}
      {hop === "nhat-ky" && <HopNhatKy dong={() => setHop(null)} />}
      {hopCaiDat && <HopCaiDat />}
      <ThongBaoNhanh />
    </div>
  );
}
