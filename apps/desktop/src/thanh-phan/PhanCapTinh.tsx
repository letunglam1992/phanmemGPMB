import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { O } from "./chung";
import { ONgay } from "./ONgay";
import { lichCuongCheTinh, phanCapTheoXa } from "../tong-hop-tinh/dien-bien";
import type { TomTatDuAn } from "../tong-hop-tinh/goi-tinh";
import { hanBaoCaoPhanCap } from "../van-ban/tham-quyen";
import { hanGuiCongAn } from "../cuong-che";
import { homNayIso } from "../trang-thai";
import { xuatExcelPhanCapTinh } from "../xuat-excel";

const vn = (iso: string) => iso.split("-").reverse().join("/");

/**
 * 1.3.0 (D1, D2) — máy tỉnh: kết quả thực hiện nhiệm vụ được phân cấp theo xã trong kỳ (số liệu cho báo cáo 06 tháng — khoản 2
 * Điều 4 QĐ 27/2026), lịch cưỡng chế toàn tỉnh; xuất Excel. Gói gửi trước 1.3.0 không có số liệu phân cấp.
 */
export function ThePhanCapTinh({ dong }: { dong: TomTatDuAn[] }) {
  const { thamQuyen, lich } = useUngDung();
  const homNay = homNayIso();
  const han = hanBaoCaoPhanCap(homNay);
  const [tu, setTu] = useState(han?.tu ?? `${homNay.slice(0, 4)}-01-01`);
  const [den, setDen] = useState(han?.den ?? homNay);
  const [dangXuat, setDangXuat] = useState(false);
  const pc = useMemo(() => phanCapTheoXa(dong, tu, den), [dong, tu, den]);
  const lichCc = useMemo(() => lichCuongCheTinh(dong, homNay).map((x) => ({ ...x, hanCongAn: hanGuiCongAn(x.ngay, lich) })), [dong, homNay, lich]);
  const coGoiMoi = dong.some((d) => d.phanCap);
  if (!coGoiMoi && !lichCc.length) return null;
  return (
    <div className="the" data-phan-cap-tinh>
      <div className="the-dau" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3>Kết quả phân cấp theo xã, lịch cưỡng chế</h3>
        <div className="phai">
          <button className="nut nut-nho" disabled={dangXuat} onClick={async () => { setDangXuat(true); try { await xuatExcelPhanCapTinh(pc, thamQuyen.nhiemVu, lichCc, { ky: `${vn(tu)}–${vn(den)}`, qd: thamQuyen.so }); } finally { setDangXuat(false); } }}>Xuất Excel</button>
        </div>
      </div>
      <div className="the-than">
        {coGoiMoi ? (
          <>
            <div className="luoi luoi-4">
              <O nhan="Từ ngày"><ONgay aria-label="Phân cấp từ ngày" value={tu} onChange={(e) => setTu(e.target.value)} /></O>
              <O nhan="Đến ngày"><ONgay aria-label="Phân cấp đến ngày" value={den} onChange={(e) => setDen(e.target.value)} /></O>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="bang chu-nho mt-6" aria-label="Kết quả phân cấp theo xã">
                <thead><tr><th>Xã, phường</th>{thamQuyen.nhiemVu.map((n) => <th key={n.ma} className="so" title={`${n.noiDung} (${n.viTri} QĐ ${thamQuyen.so})`}>{n.noiDung.replace(/^Quyết định |^Ban hành |^Phê duyệt /, "").slice(0, 28)}</th>)}<th className="so">Tổng</th></tr></thead>
                <tbody>
                  {pc.map((x) => <tr key={x.xa}><td>{x.xa}</td>{thamQuyen.nhiemVu.map((n) => <td key={n.ma} className="so">{x.theoNv[n.ma] ?? 0}</td>)}<td className="so"><b>{x.tong}</b></td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="mo chu-nho mt-6">Đếm văn bản thuộc nhiệm vụ phân cấp (QĐ {thamQuyen.so}) có ngày ký trong kỳ, theo Sổ văn bản đi các xã gửi kèm gói (từ bản 1.3.0). Dùng tổng hợp báo cáo 06 tháng (khoản 2 Điều 4).</div>
          </>
        ) : <div className="mo chu-nho">Các gói đã nhận gửi trước bản 1.3.0 — chưa có số liệu phân cấp.</div>}
        {lichCc.length > 0 && (
          <div className="mt-8" data-lich-cuong-che-tinh>
            <b className="chu-nho">Lịch cưỡng chế từ hôm nay ({lichCc.length} hồ sơ)</b>
            <table className="bang chu-nho mt-6">
              <thead><tr><th>Ngày dự kiến</th><th>Xã, phường</th><th>Dự án</th><th>Loại</th><th title="Điều 37 NĐ 102/2024 — tính theo lịch nghỉ của máy tỉnh">Đề nghị Công an chậm nhất</th></tr></thead>
              <tbody>{lichCc.slice(0, 30).map((x, i) => <tr key={i}><td>{vn(x.ngay)}</td><td>{x.xa}</td><td>{x.duAn}</td><td>{x.loai === "KIEM_DEM" ? "Kiểm đếm bắt buộc" : "Thu hồi đất"}</td><td>{vn(x.hanCongAn)}</td></tr>)}</tbody>
            </table>
            {lichCc.length > 30 && <div className="mo chu-nho">… và {lichCc.length - 30} hồ sơ khác (xem tệp Excel)</div>}
          </div>
        )}
      </div>
    </div>
  );
}
