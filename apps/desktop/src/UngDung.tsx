import { useEffect, useMemo, useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "./ung-dung";
import { TongQuan } from "./man/TongQuan";
import { ManDuAn } from "./man/DuAn";
import { HoSo } from "./man/HoSo";
import { BanDo } from "./man/BanDo";
import { TraCuu } from "./man/TraCuu";
import { DocScan } from "./man/DocScan";
import { BaoCao } from "./man/BaoCao";
import { VanBan } from "./man/VanBan";
import { HopSaoLuu } from "./thanh-phan/HopSaoLuu";
import { HopDoiMatKhau, HopNhatKy, HopQuanLyTaiKhoan, ManDangNhap, ThongBaoNhanh } from "./thanh-phan/TaiKhoan";
import { TEN_VAI_TRO } from "./tai-khoan";
import { HopCaiDat } from "./thanh-phan/HopCaiDat";
import { BieuTuong } from "./thanh-phan/BieuDo";
import { docCheDo } from "./kho-mang";
import { moTaCheDo } from "./thanh-phan/KetNoi";
import { tinhHo } from "./tinh-ho";
import { docGiaoDien, ghiGiaoDien, type GiaoDien } from "./giao-dien-sang-toi";

type MucBen = { ten: string; bt: string; chon?: boolean; bam: () => void; tat?: boolean; an?: boolean };

export function UngDung() {
  const { man, di, dsDuAn, hoCua, chinhSach, hopSaoLuu, moSaoLuu, taiKhoan, quyen, dangXuat, hopCaiDat, moCaiDat } = useUngDung();
  const [menu, setMenu] = useState(false);
  const [hop, setHop] = useState<null | "mat-khau" | "tai-khoan" | "nhat-ky">(null);
  const [giaoDien, setGiaoDien] = useState<GiaoDien>(docGiaoDien);
  useEffect(() => ghiGiaoDien(giaoDien), [giaoDien]);
  const tongQuat = useMemo(() => {
    let soHo = 0;
    let tien = D(0);
    for (const d of dsDuAn) for (const h of hoCua(d.id)) {
      soHo++;
      tien = tien.plus(tinhHo(chinhSach(d), d, h).tong.tongLamTron);
    }
    return { soHo, tien };
  }, [dsDuAn, hoCua, chinhSach]);
  if (!taiKhoan) return (<><ManDangNhap /><ThongBaoNhanh /></>);

  const duAnId = "duAnId" in man ? man.duAnId : dsDuAn[0]?.id;
  const nhom: { nhan: string; muc: MucBen[] }[] = [
    {
      nhan: "Theo dõi",
      muc: [
        { ten: "Tổng quan", bt: "tongQuan", chon: man.ten === "tong-quan", bam: () => di({ ten: "tong-quan" }) },
        { ten: "Dự án & hồ sơ", bt: "danhSach", chon: man.ten === "du-an" || man.ten === "ho", bam: () => duAnId && di({ ten: "du-an", duAnId }), tat: !duAnId },
        { ten: "Báo cáo tổng hợp", bt: "baoCao", chon: man.ten === "bao-cao", bam: () => di({ ten: "bao-cao" }) },
        { ten: "Bản đồ", bt: "thua", chon: man.ten === "ban-do", bam: () => duAnId && di({ ten: "ban-do", duAnId }), tat: !duAnId },
      ],
    },
    {
      nhan: "Nghiệp vụ",
      muc: [
        { ten: "Văn bản", bt: "vanBan", chon: man.ten === "van-ban", bam: () => duAnId && di({ ten: "van-ban", duAnId }), tat: !duAnId },
        { ten: "Tra cứu đơn giá, giá đất", bt: "traCuu", chon: man.ten === "tra-cuu", bam: () => di({ ten: "tra-cuu" }) },
        { ten: "Đọc văn bản scan (OCR)", bt: "ocr", chon: man.ten === "doc-scan", bam: () => di({ ten: "doc-scan" }) },
      ],
    },
    {
      nhan: "Quản trị",
      muc: [
        { ten: "Sao lưu, khôi phục", bt: "saoLuu", bam: () => moSaoLuu(true), an: !(quyen("SAO_LUU") || quyen("KHOI_PHUC")) },
        { ten: "Cài đặt chung", bt: "caiDat", bam: () => moCaiDat(true) },
        { ten: "Tài khoản", bt: "taiKhoan", bam: () => setHop("tai-khoan"), an: !quyen("TAI_KHOAN") },
        { ten: "Nhật ký hệ thống", bt: "nhatKy", bam: () => setHop("nhat-ky"), an: !quyen("XEM_NHAT_KY") },
      ],
    },
  ];
  const cheDo = docCheDo();
  const homNay = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="khung">
      <aside className="thanh-ben" aria-label="Điều hướng">
        <div className="ben-logo">
          <span className="ben-logo-dau"><BieuTuong ten="toaNha" co={21} /></span>
          <span>GPMB<br />Tỉnh Sơn La</span>
        </div>
        {nhom.map((n) => (
          <nav className="ben-nhom" key={n.nhan} aria-label={n.nhan}>
            <div className="ben-nhan">{n.nhan}</div>
            {n.muc.filter((m) => !m.an).map((m) => (
              <button key={m.ten} className={`ben-muc ${m.chon ? "chon" : ""}`} onClick={m.bam} disabled={m.tat} title={m.ten} aria-current={m.chon ? "page" : undefined}>
                <BieuTuong ten={m.bt} co={18} />
                <span className="chu">{m.ten}</span>
              </button>
            ))}
          </nav>
        ))}
        <div className="ben-chan">
          <span className="chip" title={moTaCheDo(cheDo)}><span className="cham" style={cheDo.cheDo === "MAY_DON" ? undefined : { background: "var(--xanh-duong-to)" }} />{cheDo.cheDo === "MAY_DON" ? "Lưu trên máy này" : cheDo.cheDo === "MAY_CHU" ? "Máy chủ mạng nội bộ" : "Máy trạm"}</span>
          <span className="mo chu-nho" style={{ padding: "0 6px" }}>Bản thử nghiệm 0.1</span>
        </div>
      </aside>

      <header className="thanh-tren">
        <div className="thuong-hieu">
          <span className="thuong-hieu-dau"><BieuTuong ten="toaNha" co={24} /></span>
          <div>
            <div className="to-chuc">Tỉnh Sơn La</div>
            <div className="ten-ung-dung">Bồi thường, hỗ trợ, tái định cư</div>
            <div className="phu-de">
              {dsDuAn.length} dự án · {tongQuat.soHo} hồ sơ · {dinhDang(tongQuat.tien, 0)} đ tạm tính
            </div>
          </div>
        </div>
        <div className="phai">
          <div className="meta-tren">
            <span><BieuTuong ten="lich" co={14} /> <b>{homNay}</b></span>
            <span>{moTaCheDo(cheDo)}</span>
          </div>
          <div className="nut-tren-nhom">
            {(quyen("SAO_LUU") || quyen("KHOI_PHUC")) && (
              <button className="nut-tren nut-tren-chinh" onClick={() => moSaoLuu(true)}><BieuTuong ten="saoLuu" co={16} /> Sao lưu, khôi phục</button>
            )}
            <button className="nut-tren nut-tren-bt" title={giaoDien === "toi" ? "Giao diện sáng" : "Giao diện tối"} aria-label="Đổi giao diện sáng/tối" onClick={() => setGiaoDien(giaoDien === "toi" ? "sang" : "toi")}>
              <BieuTuong ten={giaoDien === "toi" ? "sang" : "toi"} co={17} />
            </button>
            <div className="menu-nguoi">
              <button className="nut-tren" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <BieuTuong ten="taiKhoan" co={16} /> {taiKhoan.hoTen} · {TEN_VAI_TRO[taiKhoan.vaiTro]} <BieuTuong ten="xuong" co={14} />
              </button>
              {menu && (
                <div className="menu-tha" role="menu" onMouseLeave={() => setMenu(false)}>
                  <div className="menu-nhan">Đăng nhập: {taiKhoan.ten}</div>
                  <button role="menuitem" onClick={() => { setHop("mat-khau"); setMenu(false); }}><BieuTuong ten="khoa" co={16} /> Đổi mật khẩu</button>
                  <button role="menuitem" onClick={() => { moCaiDat(true); setMenu(false); }}><BieuTuong ten="caiDat" co={16} /> Cài đặt chung</button>
                  {quyen("TAI_KHOAN") && <button role="menuitem" onClick={() => { setHop("tai-khoan"); setMenu(false); }}><BieuTuong ten="taiKhoan" co={16} /> Quản lý tài khoản</button>}
                  {quyen("XEM_NHAT_KY") && <button role="menuitem" onClick={() => { setHop("nhat-ky"); setMenu(false); }}><BieuTuong ten="nhatKy" co={16} /> Nhật ký hệ thống</button>}
                  <div className="menu-vach" />
                  <button role="menuitem" onClick={() => { setMenu(false); void dangXuat(); }}><BieuTuong ten="thoat" co={16} /> Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="noi-dung">
        {man.ten === "tong-quan" && <TongQuan />}
        {man.ten === "du-an" && <ManDuAn duAnId={man.duAnId} />}
        {man.ten === "ho" && <HoSo duAnId={man.duAnId} hoId={man.hoId} tabDau={man.tab} />}
        {man.ten === "ban-do" && <BanDo duAnId={man.duAnId} />}
        {man.ten === "tra-cuu" && <TraCuu />}
        {man.ten === "doc-scan" && <DocScan />}
        {man.ten === "bao-cao" && <BaoCao />}
        {man.ten === "van-ban" && <VanBan key={`${man.duAnId}-${man.ma}-${man.hoId}`} duAnId={man.duAnId} maDau={man.ma} hoIdDau={man.hoId} />}
      </main>
      <footer className="chan">
        <span>Bộ chính sách: Sơn La, hiệu lực 31/3/2026 (QĐ 106/2025, QĐ 14/2026, QĐ 32/2025, NQ 152/2025)</span>
        <span>Phần mềm hỗ trợ tính toán — cán bộ có thẩm quyền kiểm tra, phê duyệt</span>
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
