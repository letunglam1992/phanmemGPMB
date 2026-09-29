import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { HO_TRO_THEO_DOI, hoTroDaGhi, nguoiNhieuHoSo } from "../nguoi-co-dat";

/**
 * P3-2: người có đất có từ hai hồ sơ trở lên (khớp số định danh, mọi dự án) — tra cứu, phát hiện hỗ trợ có thể trùng.
 * Chỉ hiện số định danh dạng che bớt; phần mềm không kết luận.
 */
export function NguoiCoDat() {
  const { nguoiCoDat, di } = useUngDung();
  const [chiTrung, setChiTrung] = useState(false);
  const ds = useMemo(() => nguoiNhieuHoSo(nguoiCoDat), [nguoiCoDat]);
  const hien = chiTrung ? ds.filter((x) => x.hoTroTrung.length) : ds;
  const che = (k: string) => { const s = k.slice(3); return `${s.slice(0, 3)}${"•".repeat(Math.max(0, s.length - 6))}${s.slice(-3)}`; };
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Người có đất nhiều hồ sơ</h1>
          <div className="mo-ta">Khớp theo số định danh (CCCD, mã số thuế…) trên dữ liệu trong máy / mạng nội bộ — không gửi ra ngoài. {ds.length} người có từ 2 hồ sơ; {ds.filter((x) => x.hoTroTrung.length).length} người có khoản hỗ trợ cùng loại ở nhiều hồ sơ.</div>
        </div>
        <div className="phai"><label className="chu-nho"><input type="checkbox" checked={chiTrung} onChange={(e) => setChiTrung(e.target.checked)} /> Chỉ người có hỗ trợ cùng loại ở nhiều hồ sơ</label></div>
      </div>
      <div className="thong-bao thong-bao-xanh chu-nho">Đây là danh sách để cán bộ kiểm tra — cùng một người có thể được hỗ trợ ở nhiều dự án nếu đủ điều kiện theo từng lần thu hồi. Phần mềm không kết luận hỗ trợ trùng.</div>
      <div className="the">
        {hien.length === 0 ? <div className="trong">Không có người nào có từ hai hồ sơ.</div> : (
          <table className="bang">
            <thead><tr><th>Số định danh</th><th>Hồ sơ (dự án – mã – tên)</th><th>Hỗ trợ đã ghi</th><th>Cùng loại ở nhiều hồ sơ</th></tr></thead>
            <tbody>
              {hien.map((x) => (
                <tr key={x.khoa}>
                  <td className="chu-nho">{che(x.khoa)}</td>
                  <td className="chu-nho">{x.ds.map((y) => <div key={y.h.id}><button className="nut nut-chu nut-nho" onClick={() => di({ ten: "ho", duAnId: y.duAn.id, hoId: y.h.id })}>{y.duAn.ten} – {y.h.ma} – {y.h.ten}</button></div>)}</td>
                  <td className="chu-nho">{x.ds.map((y) => <div key={y.h.id}>{hoTroDaGhi(y.h).map((l) => HO_TRO_THEO_DOI[l].ten).join("; ") || "—"}</div>)}</td>
                  <td className="chu-nho">{x.hoTroTrung.length ? x.hoTroTrung.map((l) => <div key={l} className="chu-do">{HO_TRO_THEO_DOI[l].ten} <span className="mo">({HO_TRO_THEO_DOI[l].canCu})</span></div>) : <span className="mo">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
