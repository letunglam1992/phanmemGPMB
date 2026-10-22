import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import { TEN_TT_DON, canhBaoThuTucDon, hanDon, thongKeDon } from "../khieu-nai";
import { homNayIso } from "../trang-thai";
import { xuatExcelKhieuNai } from "../xuat-excel";
import { TEN_LOAI_CC, lichCuongChe } from "../cuong-che";

const vn = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");

/**
 * 1.1.0 (A4) — thẻ "Khiếu nại, cưỡng chế" ở Tổng quan dự án: số đơn theo trạng thái (gồm tạm đình chỉ), đơn quá hạn / gửi văn bản
 * chậm, hồ sơ cưỡng chế; xuất Excel. Chỉ hiện khi dự án có đơn hoặc hồ sơ cưỡng chế.
 */
export function TheKhieuNaiDuAn({ duAn, hos }: { duAn: DuAn; hos: Ho[] }) {
  const { lich, di } = useUngDung();
  const homNay = homNayIso();
  const [dangXuat, setDangXuat] = useState(false);
  const tk = useMemo(() => thongKeDon(hos, homNay, lich), [hos, homNay, lich]);
  const cc = useMemo(() => hos.flatMap((h) => (h.cuongChe ?? []).map((c) => ({ h, c }))), [hos]);
  const canChu = useMemo(
    () =>
      hos
        .flatMap((h) => (h.khieuNai ?? []).map((d) => ({ h, d, tt: hanDon(d, homNay, lich).tt, thuTuc: canhBaoThuTucDon(d, homNay, lich).filter((c) => c.muc === "CAO") })))
        .filter((x) => x.tt === "QUA_HAN" || x.tt === "QUA_HAN_THU_LY" || x.tt === "TAM_DINH_CHI" || x.thuTuc.length),
    [hos, homNay, lich],
  );
  const lichCc = useMemo(() => lichCuongChe(hos, homNay, lich), [hos, homNay, lich]);
  if (!tk.tong && !cc.length) return null;
  return (
    <div className="the" data-the-khieu-nai-du-an>
      <div className="the-dau">
        <h3>Khiếu nại, cưỡng chế</h3>
        <div className="phai">
          <button className="nut nut-nho" disabled={dangXuat} onClick={async () => { setDangXuat(true); try { await xuatExcelKhieuNai(duAn, hos, homNay, lich); } finally { setDangXuat(false); } }}>Xuất Excel</button>
        </div>
      </div>
      <div className="the-than">
        <div className="chu-nho" data-tk-khieu-nai>
          {tk.tong} đơn của {tk.soHo} hộ: đã giải quyết {tk.daGiaiQuyet}, đang giải quyết {tk.dangGiaiQuyet}
          {tk.tamDinhChi ? `, trong đó tạm đình chỉ ${tk.tamDinhChi}` : ""}
          {tk.quaHan ? <b style={{ color: "var(--do-to)" }}>, quá hạn {tk.quaHan}</b> : null}
          {tk.thuTucCham ? <b style={{ color: "var(--do-to)" }}>; {tk.thuTucCham} đơn gửi văn bản, thông báo chưa đúng hạn</b> : null}
          {cc.length ? `. Cưỡng chế: ${cc.length} hồ sơ (chưa kết thúc ${cc.filter((x) => !x.c.ketQua).length})` : ""}.
        </div>
        {canChu.length > 0 && (
          <ul className="chu-nho" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {canChu.slice(0, 8).map(({ h, d, tt, thuTuc }) => (
              <li key={d.id}>
                <button className="nut nut-nho nut-chu" onClick={() => di({ ten: "ho", duAnId: duAn.id, hoId: h.id, tab: "khieu-nai" })}>{h.ma} – {h.ten}</button>
                {" "}đơn ngày {vn(d.ngayNhan)}: {TEN_TT_DON[tt]}{thuTuc.length ? `; ${thuTuc[0]!.noiDung}` : ""}
              </li>
            ))}
            {canChu.length > 8 && <li>… và {canChu.length - 8} đơn khác (xem trong tệp Excel)</li>}
          </ul>
        )}
        {lichCc.length > 0 && (
          <div data-lich-cuong-che style={{ marginTop: 8 }}>
            <b className="chu-nho">Lịch cưỡng chế (hồ sơ chưa kết thúc)</b>
            <table className="bang chu-nho" style={{ marginTop: 4 }}>
              <thead><tr><th>Ngày dự kiến</th><th>Hộ</th><th>Loại</th><th title="Điều 37 NĐ 102/2024: trước thời điểm cưỡng chế 05 ngày làm việc">Gửi Công an chậm nhất</th><th>Lưu ý thời điểm</th></tr></thead>
              <tbody>
                {lichCc.map((x) => (
                  <tr key={x.c.id} data-thang={x.thang}>
                    <td>{vn(x.ngayDuKien)}</td>
                    <td><button className="nut nut-nho nut-chu" onClick={() => di({ ten: "ho", duAnId: duAn.id, hoId: x.h.id, tab: "khieu-nai" })}>{x.h.ma} – {x.h.ten}</button></td>
                    <td>{TEN_LOAI_CC[x.c.loai].replace("Cưỡng chế thực hiện quyết định ", "")}</td>
                    <td style={x.hanCongAn < homNay ? { color: "var(--do-to)" } : undefined}>{vn(x.hanCongAn)}</td>
                    <td style={x.canhBao.length ? { color: "var(--do-to)" } : undefined}>{x.canhBao.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
