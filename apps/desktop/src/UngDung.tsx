import { useUngDung } from "./ung-dung";
import { TongQuan } from "./man/TongQuan";
import { ManDuAn } from "./man/DuAn";
import { HoSo } from "./man/HoSo";
import { BanDo } from "./man/BanDo";
import { TraCuu } from "./man/TraCuu";
import { VanBan } from "./man/VanBan";

export function UngDung() {
  const { man, di, dsDuAn } = useUngDung();
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
          <span>Cán bộ xã</span>
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
    </div>
  );
}
