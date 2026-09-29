import { useState } from "react";
import { useUngDung } from "../ung-dung";
import type { Ho } from "../mo-hinh";
import { HopThoai, O } from "./chung";
import { Chon } from "./Chon";
import { khopTuKhoa } from "../tim-kiem";

export const tenCanBo = (ds: { ten: string; hoTen: string }[], ten: string | undefined) => (ten ? (ds.find((c) => c.ten === ten)?.hoTen ?? ten) : "Chưa phân công");

/** P3-4: phân công cán bộ phụ trách cho nhiều hồ sơ (một giao dịch). */
export function HopPhanCong({ hos, dong }: { hos: Ho[]; dong: () => void }) {
  const { luuNhieuHo, dsCanBo, bao } = useUngDung();
  const canBo = dsCanBo.filter((c) => c.hoatDong);
  const [ten, setTen] = useState(canBo[0]?.ten ?? "");
  const [loc, setLoc] = useState("__chua__");
  const [tim, setTim] = useState("");
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [dang, setDang] = useState(false);
  const ds = hos.filter((h) => (loc === "" ? true : loc === "__chua__" ? !h.phuTrach : h.phuTrach === loc)).filter((h) => khopTuKhoa({ h, duAnTen: "" }, tim));
  const luu = async () => {
    const dsLuu = hos.filter((h) => chon.has(h.id) && (h.phuTrach ?? "") !== ten);
    if (!dsLuu.length) return bao("Không có hồ sơ nào cần đổi phân công", "loi");
    setDang(true);
    try {
      const r = await luuNhieuHo(dsLuu.map((h) => ({ h: { ...h, phuTrach: ten || undefined }, nhatKy: ten ? `Phân công phụ trách: ${tenCanBo(dsCanBo, ten)}${h.phuTrach ? ` (trước: ${tenCanBo(dsCanBo, h.phuTrach)})` : ""}` : "Bỏ phân công phụ trách" })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
      bao(`Đã phân công ${r.daLuu} hồ sơ`);
      dong();
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Phân công cán bộ phụ trách" rong={820} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={dang || !chon.size} onClick={() => void luu()}>Phân công {chon.size} hồ sơ</button></>}>
      <div className="luoi luoi-3" style={{ marginBottom: 10 }}>
        <O nhan="Giao cho">
          <Chon value={ten} onChange={(e) => setTen(e.target.value)} aria-label="Giao cho cán bộ">
            {canBo.map((c) => <option key={c.ten} value={c.ten}>{c.hoTen} ({c.ten})</option>)}
            <option value="">Bỏ phân công</option>
          </Chon>
        </O>
        <O nhan="Hiện hồ sơ">
          <Chon value={loc} onChange={(e) => { setLoc(e.target.value); setChon(new Set()); }} aria-label="Hiện hồ sơ theo phân công">
            <option value="">Mọi hồ sơ</option>
            <option value="__chua__">Chưa phân công</option>
            {dsCanBo.map((c) => <option key={c.ten} value={c.ten}>{c.hoTen}</option>)}
          </Chon>
        </O>
        <O nhan="Tìm"><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tên, mã, tờ/thửa…" /></O>
      </div>
      <div className="bang-cuon" style={{ maxHeight: 380 }}>
        <table className="bang">
          <thead><tr><th style={{ width: 36 }}><input type="checkbox" aria-label="Chọn tất cả" checked={ds.length > 0 && ds.every((h) => chon.has(h.id))} onChange={(e) => setChon(e.target.checked ? new Set(ds.map((h) => h.id)) : new Set())} /></th><th>Mã</th><th>Họ tên</th><th>Đang phụ trách</th></tr></thead>
          <tbody>
            {ds.map((h) => (
              <tr key={h.id}>
                <td><input type="checkbox" aria-label={`Chọn ${h.ma}`} checked={chon.has(h.id)} onChange={(e) => { const s = new Set(chon); if (e.target.checked) s.add(h.id); else s.delete(h.id); setChon(s); }} /></td>
                <td>{h.ma}</td><td>{h.ten}</td><td className="chu-nho">{tenCanBo(dsCanBo, h.phuTrach)}</td>
              </tr>
            ))}
            {!ds.length && <tr><td colSpan={4} className="trong">Không có hồ sơ khớp điều kiện.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}
