import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { CAC_BUOC, type DuAn, type Ho } from "../mo-hinh";
import { BUOC_DICH, THOI_HAN_LUAT, duBaoDuAn } from "../du-bao";
import { homNayIso } from "../trang-thai";
import { HopThoai } from "./chung";

const vn = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const tenBuoc = (ma: string) => CAC_BUOC.find((b) => b.ma === ma)?.ten ?? ma;

/** §11.2: thẻ dự báo tiến độ ở Tổng quan dự án — ngày dự kiến chi trả xong toàn bộ, hộ kéo lùi (đường găng). */
export function TheDuBao({ duAn, hos, moKeHoach }: { duAn: DuAn; hos: Ho[]; moKeHoach: () => void }) {
  const { lich, di } = useUngDung();
  const homNay = homNayIso();
  const r = useMemo(() => duBaoDuAn(duAn, hos, homNay, lich), [duAn, hos, homNay, lich]);
  const [mo, setMo] = useState(false);
  const conLai = r.ds.filter((x) => !x.daXong);
  return (
    <div className="the">
      <div className="the-dau"><h3>Dự báo tiến độ</h3><span className="mo chu-nho">đến khi chi trả xong (đủ điều kiện bàn giao)</span></div>
      <div className="the-than">
        {!conLai.length ? (
          <div className="mo">Mọi hồ sơ đã chi trả xong hoặc đã bàn giao.</div>
        ) : r.ngayDuAn ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: r.keHoach && r.ngayDuAn > r.keHoach ? "var(--do)" : undefined }}>{vn(r.ngayDuAn)}</div>
            <div className="mo chu-nho">Kế hoạch bước {BUOC_DICH}: {vn(r.keHoach)}{r.keoLui.length ? ` · ${r.keoLui.length} hộ dự kiến muộn hơn kế hoạch` : ""}</div>
          </>
        ) : (
          <div className="chu-nho" style={{ color: "var(--vang)" }}>
            Chưa dự báo được {r.soKhongDuBao}/{conLai.length} hộ: bước {r.buocThieu.map((m) => `${m} (${tenBuoc(m)})`).join(", ")} không có thời hạn luật định và đơn vị chưa nhập thời gian dự kiến.
          </div>
        )}
        <div className="mt-8">
          <button className="nut nut-nho" disabled={!conLai.length} onClick={() => setMo(true)}>Xem từng hộ</button>{" "}
          <button className="nut nut-nho" onClick={moKeHoach}>Nhập thời gian dự kiến…</button>
        </div>
      </div>
      {mo && (
        <HopThoai tieuDe="Dự báo tiến độ từng hộ" dong={() => setMo(false)} rong={960}>
          <p className="mo chu-nho mt-0">
            Ước tính giả định mỗi bước còn lại dùng hết thời gian: thời hạn luật định ({Object.entries(THOI_HAN_LUAT).map(([m, t]) => `bước ${m}: ${t.soNgay} ${t.loai === "NLV" ? "NLV" : "ngày"}`).join("; ")}) hoặc thời gian dự kiến đơn vị nhập;
            tính từ ngày hoàn thành gần nhất, theo lịch ngày nghỉ. Không phải cam kết tiến độ. Xếp hộ dự kiến muộn nhất trước (đường găng).
          </p>
          <table className="bang">
            <thead><tr><th>Hồ sơ</th><th>Bước hiện tại</th><th>Dự kiến chi trả xong</th><th className="so">So với kế hoạch</th><th>Ghi chú</th></tr></thead>
            <tbody>
              {[...conLai].sort((a, b) => (b.ngay ?? "9999").localeCompare(a.ngay ?? "9999")).map((x) => (
                <tr key={x.hoId} className="co-the-chon" onClick={() => di({ ten: "ho", duAnId: duAn.id, hoId: x.hoId, tab: "tien-do" })}>
                  <td className="chu-nho"><b>{x.ma}</b> {x.ten}</td>
                  <td className="chu-nho">{x.buocHienTai ? `${x.buocHienTai}. ${tenBuoc(x.buocHienTai)}` : "—"}</td>
                  <td>{x.ngay ? vn(x.ngay) : "—"}</td>
                  <td className="so" style={x.treSoVoiKeHoach && x.treSoVoiKeHoach > 0 ? { color: "var(--do)", fontWeight: 700 } : undefined}>{x.treSoVoiKeHoach === null ? "—" : x.treSoVoiKeHoach > 0 ? `chậm ${x.treSoVoiKeHoach} ngày` : `sớm ${-x.treSoVoiKeHoach} ngày`}</td>
                  <td className="chu-nho">{x.thieu ? `Thiếu thời gian bước ${x.thieu.buoc} (${x.thieu.ten})` : x.quaHan ? "Có bước đã quá thời hạn mà chưa xong" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </HopThoai>
      )}
    </div>
  );
}
