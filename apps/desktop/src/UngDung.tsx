import { useEffect, useState } from "react";
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
import { docGiaoDien, ghiGiaoDien, type GiaoDien } from "./giao-dien-sang-toi";
import { DanhSachHo } from "./man/DanhSachHo";
import { ThietLapDonVi } from "./man/ThietLapDonVi";
import { HuongDan } from "./man/HuongDan";
import { KhongGianDuAn } from "./man/KhongGianDuAn";
import { TimKiemChung } from "./thanh-phan/TimKiem";
import { useTongHop } from "./thanh-phan/dung-canh-bao";
import { donViSuDung } from "./don-vi";
import { HopGioiThieu } from "./thanh-phan/GioiThieu";
import { BAN_QUYEN, MA_BUILD, moTaPhienBan } from "./phien-ban";

type MucBen = { ten: string; bt: string; chon?: boolean; bam: () => void; tat?: boolean; an?: boolean };

export function UngDung() {
  const { man, di, dsDuAn, hopSaoLuu, moSaoLuu, taiKhoan, quyen, dangXuat, hopCaiDat, moCaiDat, quayLai, coTheQuayLai, dsDonVi, anhNen } = useUngDung();
  const [menu, setMenu] = useState(false);
  const [chuong, setChuong] = useState(false);
  // Dự án làm việc gần nhất — mục "Hồ sơ" mở lại dự án này
  const [duAnGanNhat, setDuAnGanNhat] = useState<string | null>(null);
  useEffect(() => { if ("duAnId" in man && man.duAnId) setDuAnGanNhat(man.duAnId); }, [man]);
  const { canhBao, mo: moCanhBao } = useTongHop();
  // Phím Quay lại: Alt + ←, nút lùi của chuột (không bắt Backspace để tránh mất thao tác khi đang nhập)
  useEffect(() => {
    const phim = (e: KeyboardEvent) => { if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); quayLai(); } };
    const chuot = (e: MouseEvent) => { if (e.button === 3) { e.preventDefault(); quayLai(); } };
    window.addEventListener("keydown", phim);
    window.addEventListener("mouseup", chuot);
    return () => { window.removeEventListener("keydown", phim); window.removeEventListener("mouseup", chuot); };
  }, [quayLai]);
  const [hop, setHop] = useState<null | "mat-khau" | "tai-khoan" | "nhat-ky">(null);
  const [giaoDien, setGiaoDien] = useState<GiaoDien>(docGiaoDien);
  useEffect(() => ghiGiaoDien(giaoDien), [giaoDien]);
  const [gioiThieu, setGioiThieu] = useState(false);
  if (!taiKhoan) return (<><ManDangNhap /><ThongBaoNhanh /></>);

  const duAnId = ("duAnId" in man && man.duAnId) || (duAnGanNhat && dsDuAn.some((d) => d.id === duAnGanNhat) ? duAnGanNhat : dsDuAn[0]?.id);
  const dvSuDung = donViSuDung(dsDonVi);
  const cao = canhBao.filter((c) => c.muc === "CAO");
  const vietTat = taiKhoan ? taiKhoan.hoTen.trim().split(/\s+/).slice(-2).map((x) => x[0]).join("").toUpperCase() : "";
  const nhom: { nhan: string; muc: MucBen[] }[] = [
    {
      nhan: "Theo dõi",
      muc: [
        { ten: "Tổng quan", bt: "tongQuan", chon: man.ten === "tong-quan", bam: () => di({ ten: "tong-quan" }) },
        { ten: "Dự án", bt: "danhSach", chon: man.ten === "du-an" && !man.duAnId, bam: () => di({ ten: "du-an" }) },
        { ten: "Hồ sơ", bt: "hoSo", chon: (man.ten === "du-an" && !!man.duAnId) || man.ten === "ho" || man.ten === "ds-ho" || man.ten === "ban-do" || man.ten === "van-ban", bam: () => duAnId && di({ ten: "du-an", duAnId }), tat: !duAnId },
        { ten: "Báo cáo tổng hợp", bt: "baoCao", chon: man.ten === "bao-cao", bam: () => di({ ten: "bao-cao" }) },
      ],
    },
    {
      nhan: "Công cụ",
      muc: [
        { ten: "Thiết lập đơn vị", bt: "toaNha", chon: man.ten === "don-vi", bam: () => di({ ten: "don-vi" }) },
        { ten: "Tra cứu đơn giá, giá đất", bt: "traCuu", chon: man.ten === "tra-cuu", bam: () => di({ ten: "tra-cuu" }) },
        { ten: "Đọc văn bản scan (OCR)", bt: "ocr", chon: man.ten === "doc-scan", bam: () => di({ ten: "doc-scan" }) },
      ],
    },
    {
      nhan: "Trợ giúp",
      muc: [
        { ten: "Hướng dẫn sử dụng", bt: "hoiDap", chon: man.ten === "huong-dan", bam: () => di({ ten: "huong-dan" }) },
        { ten: "Giới thiệu, bản quyền", bt: "thongTin", chon: false, bam: () => setGioiThieu(true) },
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
          <span className="ben-logo-nui" aria-hidden>
            <svg width="44" height="30" viewBox="0 0 44 30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"><path d="M2 27L15 7l7 10 5-6 15 16z" /><path d="M11 27l7-9 5 6" /></svg>
          </span>
          <span>UBND<br />Tỉnh Sơn La</span>
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
          <button className="ben-phien-ban" onClick={() => setGioiThieu(true)} title={`${moTaPhienBan()}${MA_BUILD ? ` · mã ${MA_BUILD}` : ""} — bấm để xem giới thiệu, bản quyền`}>
            {moTaPhienBan()}<br />© {BAN_QUYEN.nam} {BAN_QUYEN.tacGia}
          </button>
        </div>
      </aside>

      <header className="thanh-tren" style={anhNen ? ({ "--anh-nen": `url("${anhNen}")` } as React.CSSProperties) : undefined}>
        <div className="thuong-hieu">
          <button className="nut-quay-lai" onClick={quayLai} disabled={!coTheQuayLai} title="Quay lại màn trước (Alt + ←)" aria-label="Quay lại">
            <BieuTuong ten="hoanTac" co={18} /><span>Quay lại</span>
          </button>
          <button className="thuong-hieu-dau" onClick={() => di({ ten: "tong-quan" })} title="Về Tổng quan" aria-label="Về Tổng quan"><BieuTuong ten="nha" co={24} /></button>
          <div>
            <div className="to-chuc" title={dvSuDung ? `Đơn vị sử dụng: ${dvSuDung.ten}` : "Chưa thiết lập đơn vị (Công cụ → Thiết lập đơn vị)"}>{dvSuDung ? dvSuDung.ten : "Tỉnh Sơn La"}</div>
            <div className="ten-ung-dung">Bồi thường, hỗ trợ, tái định cư</div>
          </div>
        </div>
        <TimKiemChung />
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
              <button className="nut-tren nut-tren-bt nut-chuong" title={`${canhBao.length} cảnh báo, việc cần theo dõi`} aria-label="Thông báo" aria-expanded={chuong} onClick={() => setChuong(!chuong)}>
                <BieuTuong ten="chuong" co={17} />
                {canhBao.length > 0 && <span className={`cham-chuong ${cao.length ? "" : "vang"}`}>{canhBao.length > 99 ? "99+" : canhBao.length}</span>}
              </button>
              {chuong && (
                <div className="menu-tha menu-chuong" role="menu" onMouseLeave={() => setChuong(false)}>
                  <div className="menu-nhan">Thông báo · {cao.length} cần xử lý ngay · {canhBao.length - cao.length} cần theo dõi</div>
                  {[...cao, ...canhBao.filter((c) => c.muc !== "CAO")].slice(0, 8).map((c, i) => (
                    <button key={i} role="menuitem" onClick={() => { moCanhBao(c); setChuong(false); }}>
                      <span className={`cb-bt cb-${c.muc}`}>{c.muc === "THONG_TIN" ? "i" : "!"}</span>
                      <span className="chuong-nd">{c.noiDung}</span>
                    </button>
                  ))}
                  {canhBao.length === 0 && <div className="trong" style={{ padding: 16 }}>Không có thông báo.</div>}
                  <div className="menu-vach" />
                  <button role="menuitem" onClick={() => { di({ ten: "tong-quan" }); setChuong(false); }}>Xem tất cả ở Tổng quan →</button>
                </div>
              )}
            </div>
            <div className="menu-nguoi">
              <button className="nut-tren nut-nguoi" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <span className="anh-dai-dien" aria-hidden>{vietTat || <BieuTuong ten="taiKhoan" co={15} />}</span> {taiKhoan.hoTen} · {TEN_VAI_TRO[taiKhoan.vaiTro]} <BieuTuong ten="xuong" co={14} />
              </button>
              {menu && (
                <div className="menu-tha" role="menu" onMouseLeave={() => setMenu(false)}>
                  <div className="menu-nhan">Đăng nhập: {taiKhoan.ten}</div>
                  <button role="menuitem" onClick={() => { setHop("mat-khau"); setMenu(false); }}><BieuTuong ten="khoa" co={16} /> Đổi mật khẩu</button>
                  <button role="menuitem" onClick={() => { moCaiDat(true); setMenu(false); }}><BieuTuong ten="caiDat" co={16} /> Cài đặt chung</button>
                  <button role="menuitem" onClick={() => { di({ ten: "huong-dan" }); setMenu(false); }}><BieuTuong ten="hoiDap" co={16} /> Hướng dẫn sử dụng</button>
                  <button role="menuitem" onClick={() => { setGioiThieu(true); setMenu(false); }}><BieuTuong ten="thongTin" co={16} /> Giới thiệu, bản quyền</button>
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
        {man.ten === "du-an" && !man.duAnId && <ManDuAn />}
        {man.ten === "du-an" && man.duAnId && <KhongGianDuAn duAnId={man.duAnId} tab={man.tab} ma={man.ma} hoId={man.hoId} />}
        {man.ten === "ds-ho" && <DanhSachHo key={JSON.stringify(man)} duAnId={man.duAnId} trangThai={man.trangThai} chang={man.chang} tim={man.tim} />}
        {man.ten === "don-vi" && <ThietLapDonVi />}
        {man.ten === "huong-dan" && <HuongDan />}
        {man.ten === "ho" && <HoSo duAnId={man.duAnId} hoId={man.hoId} tabDau={man.tab} />}
        {man.ten === "ban-do" && <KhongGianDuAn duAnId={man.duAnId} tab="ban-do" />}
        {man.ten === "tra-cuu" && <TraCuu />}
        {man.ten === "doc-scan" && <DocScan />}
        {man.ten === "bao-cao" && <BaoCao />}
        {man.ten === "van-ban" && <KhongGianDuAn duAnId={man.duAnId} tab="van-ban" ma={man.ma} hoId={man.hoId} />}
      </main>
      <footer className="chan">
        <span>Bộ chính sách: Sơn La, hiệu lực 31/3/2026 (QĐ 106/2025, QĐ 14/2026, QĐ 32/2025, NQ 152/2025)</span>
        <span>Phần mềm hỗ trợ tính toán — cán bộ có thẩm quyền kiểm tra, phê duyệt</span>
      </footer>
      {!quyen("SUA_HO_SO") && <div className="dai-chi-xem">Tài khoản chỉ xem: không sửa được dữ liệu</div>}
      {hopSaoLuu && <HopSaoLuu />}
      {gioiThieu && <HopGioiThieu dong={() => setGioiThieu(false)} />}
      {(hop === "mat-khau" || taiKhoan.phaiDoiMatKhau) && <HopDoiMatKhau batBuoc={taiKhoan.phaiDoiMatKhau} dong={() => setHop(null)} />}
      {hop === "tai-khoan" && <HopQuanLyTaiKhoan dong={() => setHop(null)} />}
      {hop === "nhat-ky" && <HopNhatKy dong={() => setHop(null)} />}
      {hopCaiDat && <HopCaiDat />}
      <ThongBaoNhanh />
    </div>
  );
}
