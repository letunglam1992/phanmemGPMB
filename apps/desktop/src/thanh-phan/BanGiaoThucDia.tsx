import { useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn } from "../mo-hinh";
import { CAN_CU_BAN_GIAO_THUC_DIA, ghiBanGiaoThucDia, xoaBanGiaoThucDia } from "../ban-giao-thuc-dia";
import { timDot, tenDot } from "../dot-thu-hoi";
import { homNayIso } from "../trang-thai";
import { O } from "./chung";
import { ONgay } from "./ONgay";

const vn = (iso: string) => iso.split("-").reverse().join("/");

/** 1.1.0 (D3) — thẻ "Bàn giao đất trên thực địa" ở Tổng quan dự án: mốc ghi khi tạo T23 hoặc ghi tay. */
export function TheBanGiaoThucDia({ duAn }: { duAn: DuAn }) {
  const { luuDuAn, quyen, di } = useUngDung();
  const [ghi, setGhi] = useState<null | { ngay: string; dotId: string; benNhan: string; dienTich: string; qdGiaoDat: string }>(null);
  const ds = duAn.banGiaoThucDia ?? [];
  const sua = quyen("SUA_HO_SO");
  return (
    <div className="the" data-the-ban-giao-thuc-dia>
      <div className="the-dau">
        <h3>Bàn giao đất trên thực địa</h3>
        <div className="phai">
          {sua && <button className="nut nut-nho" onClick={() => setGhi({ ngay: homNayIso(), dotId: "", benNhan: duAn.chuDauTu ?? "", dienTich: "", qdGiaoDat: "" })}>Ghi mốc</button>}
          <button className="nut nut-nho" onClick={() => di({ ten: "van-ban", duAnId: duAn.id, ma: "T23" })}>Soạn biên bản (T23)</button>
        </div>
      </div>
      <div className="the-than chu-nho">
        {!ds.length && !ghi && <div className="mo">Chưa ghi. Tạo biên bản T23 ({CAN_CU_BAN_GIAO_THUC_DIA}) thì phần mềm tự ghi mốc; bàn giao đã làm ngoài phần mềm thì bấm “Ghi mốc”.</div>}
        {ds.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }} data-ds-ban-giao>
            {ds.map((x) => (
              <li key={x.id}>
                {vn(x.ngay)}{x.dotId ? ` (${timDot(duAn, x.dotId) ? tenDot(timDot(duAn, x.dotId)) : "đợt đã xóa"})` : ""}: bàn giao cho {x.benNhan || "…"}
                {x.dienTich ? `, ${x.dienTich} m²` : ""}{x.qdGiaoDat ? `; QĐ giao đất ${x.qdGiaoDat}` : ""}
                {sua && <button className="nut nut-nho nut-chu" aria-label="Xóa mốc" onClick={() => void luuDuAn(xoaBanGiaoThucDia(duAn, x.id))}>Xóa</button>}
              </li>
            ))}
          </ul>
        )}
        {ghi && (
          <div className="luoi luoi-3" style={{ marginTop: 8 }}>
            <O nhan="Ngày bàn giao"><ONgay aria-label="Ngày bàn giao" value={ghi.ngay} onChange={(e) => setGhi({ ...ghi, ngay: e.target.value })} /></O>
            {(duAn.dotThuHoi ?? []).length > 0 && (
              <O nhan="Đợt thu hồi">
                <select value={ghi.dotId} onChange={(e) => setGhi({ ...ghi, dotId: e.target.value })}>
                  <option value="">Cả dự án</option>
                  {duAn.dotThuHoi!.map((d) => <option key={d.id} value={d.id}>{tenDot(d)}</option>)}
                </select>
              </O>
            )}
            <O nhan="Bên nhận"><input aria-label="Bên nhận bàn giao" value={ghi.benNhan} onChange={(e) => setGhi({ ...ghi, benNhan: e.target.value })} /></O>
            <O nhan="Diện tích (m²)"><input aria-label="Diện tích bàn giao" value={ghi.dienTich} inputMode="decimal" onChange={(e) => setGhi({ ...ghi, dienTich: e.target.value })} /></O>
            <O nhan="QĐ giao đất (số, ngày)"><input value={ghi.qdGiaoDat} onChange={(e) => setGhi({ ...ghi, qdGiaoDat: e.target.value })} /></O>
            <div style={{ alignSelf: "end", display: "flex", gap: 6 }}>
              <button className="nut nut-nho nut-chinh" disabled={!ghi.ngay || !ghi.benNhan.trim()} onClick={async () => {
                await luuDuAn(ghiBanGiaoThucDia(duAn, { ngay: ghi.ngay, ...(ghi.dotId ? { dotId: ghi.dotId } : {}), benNhan: ghi.benNhan.trim(), ...(ghi.dienTich.trim() ? { dienTich: ghi.dienTich.trim() } : {}), ...(ghi.qdGiaoDat.trim() ? { qdGiaoDat: ghi.qdGiaoDat.trim() } : {}) }));
                setGhi(null);
              }}>Lưu mốc</button>
              <button className="nut nut-nho" onClick={() => setGhi(null)}>Hủy</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
