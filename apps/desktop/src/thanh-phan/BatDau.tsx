import { useState } from "react";
import { useUngDung, type Man } from "../ung-dung";

const KHOA_AN = "gpmb-an-bat-dau";
/** Thẻ Cài đặt chung mở sẵn ở lần mở kế tiếp (HopCaiDat đọc rồi xóa). */
export const KHOA_THE_CAI_DAT = "gpmb-the-cai-dat";
const doc = () => { try { return localStorage.getItem(KHOA_AN) === "1"; } catch { return false; } };

interface Buoc { ma: string; ten: string; moTa: string; xong: boolean; nhan: string; mo: () => void; quyen?: boolean }

/**
 * Hướng dẫn lần đầu cho máy mới (1.0.4): các bước theo thứ tự, tự đánh dấu bước đã xong theo dữ liệu thật (không cần
 * bấm "xong"); ẩn được; tự ẩn khi đủ cả 6 bước.
 */
export function TheBatDau({ taoDuAn }: { taoDuAn: () => void }) {
  const { dsDonVi, lich, khoaKhoiPhuc, tuDong, dsDuAn, hoCua, di, moCaiDat, quyen, chiXem } = useUngDung();
  const [an, setAn] = useState(doc);
  const nam = new Date().getFullYear();
  const caiDat = (the: string) => { try { sessionStorage.setItem(KHOA_THE_CAI_DAT, the); } catch { /* bỏ qua */ } moCaiDat(true); };
  const coHo = dsDuAn.find((d) => hoCua(d.id).length > 0);
  const buoc: Buoc[] = [
    { ma: "don-vi", ten: "Thiết lập đơn vị", moTa: "Tên đơn vị, cơ quan cấp trên, người ký — điền sẵn vào văn bản, báo cáo.", xong: dsDonVi.length > 0, nhan: "Mở Thiết lập đơn vị", mo: () => di({ ten: "don-vi" } as Man) },
    { ma: "lich", ten: `Lịch ngày nghỉ năm ${nam}`, moTa: "Bấm Đề xuất ngày nghỉ, đối chiếu thông báo nghỉ lễ, Tết rồi xác nhận — để tính đúng hạn theo ngày làm việc.", xong: lich.namDaDu.includes(nam), nhan: "Mở Lịch ngày nghỉ", mo: () => caiDat("lich"), quyen: quyen("CAI_DAT") },
    { ma: "mat-khau", ten: "Mật khẩu khôi phục sao lưu", moTa: "Để mở được tệp sao lưu khi máy hỏng hoặc quên mật khẩu tài khoản.", xong: !!khoaKhoiPhuc, nhan: "Đặt mật khẩu khôi phục", mo: () => caiDat("tu-dong"), quyen: quyen("CAI_DAT") },
    { ma: "tu-dong", ten: "Bật tự động sao lưu", moTa: "Nên lưu ra ổ mạng nội bộ hoặc ổ khác ổ cài phần mềm.", xong: tuDong.bat, nhan: "Mở Tự động sao lưu", mo: () => caiDat("tu-dong"), quyen: quyen("CAI_DAT") },
    { ma: "du-an", ten: "Tạo dự án đầu tiên", moTa: "Tên dự án, xã, căn cứ thu hồi; dự án tuyến qua nhiều xã ghi mã dùng chung do tỉnh cấp.", xong: dsDuAn.length > 0, nhan: "Tạo dự án", mo: taoDuAn, quyen: quyen("SUA_HO_SO") },
    { ma: "ho-so", ten: "Nạp bản đồ hoặc nhập hồ sơ từ Excel", moTa: "Bản đồ địa chính DGN/DXF → tạo hồ sơ từ thửa thu hồi; hoặc menu Thêm → Nhập hồ sơ từ Excel.", xong: !!coHo, nhan: "Mở hồ sơ dự án", mo: () => dsDuAn[0] && di({ ten: "du-an", duAnId: dsDuAn[0].id, tab: "ho" }), quyen: quyen("SUA_HO_SO") && dsDuAn.length > 0 },
  ];
  const soXong = buoc.filter((b) => b.xong).length;
  if (chiXem || an || soXong === buoc.length) return null;
  const tiep = buoc.find((b) => !b.xong);
  return (
    <section className="the bat-dau" aria-label="Bắt đầu sử dụng">
      <div className="the-dau">
        <h3>Bắt đầu sử dụng</h3>
        <span className="mo chu-nho">Đã xong {soXong}/{buoc.length} bước</span>
        <div className="phai"><button className="nut nut-chu nut-nho" onClick={() => { try { localStorage.setItem(KHOA_AN, "1"); } catch { /* bỏ qua */ } setAn(true); }}>Ẩn hướng dẫn</button></div>
      </div>
      <div className="bd-thanh" aria-hidden><span style={{ width: `${(soXong / buoc.length) * 100}%` }} /></div>
      <ol className="bd-buoc">
        {buoc.map((b, i) => (
          <li key={b.ma} className={b.xong ? "xong" : b === tiep ? "tiep" : ""} data-buoc={b.ma}>
            <span className="bd-so">{b.xong ? "✓" : i + 1}</span>
            <div className="bd-nd"><b>{b.ten}</b>{b.xong ? <span className="nhan nhan-xanh">Đã xong</span> : null}<div className="mo chu-nho">{b.moTa}</div></div>
            {!b.xong && b.quyen !== false && <button className={`nut nut-nho ${b === tiep ? "nut-chinh" : ""}`} onClick={b.mo}>{b.nhan}</button>}
            {!b.xong && b.quyen === false && <span className="mo chu-nho">{b.ma === "ho-so" && !dsDuAn.length ? "Tạo dự án trước" : "Cần tài khoản Quản trị / Lãnh đạo"}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
