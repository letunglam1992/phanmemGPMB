import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn } from "../mo-hinh";
import { KHOA_SO_VB, type SoVanBanDi } from "../so-van-ban";
import { xuatExcelSoVanBan } from "../xuat-excel";

const vn = (iso: string) => iso.split("-").reverse().join("/");

/** 1.2.0 (C1) — sổ văn bản đi: các văn bản có số tạo từ phần mềm (dự án này hoặc cả đơn vị), lọc theo năm, ký hiệu; xuất Excel. */
export function TheSoVanBanDi({ duAn }: { duAn: DuAn }) {
  const { kho } = useUngDung();
  const [so, setSo] = useState<SoVanBanDi | null>(null);
  const [caDonVi, setCaDonVi] = useState(false);
  const [nam, setNam] = useState(new Date().toISOString().slice(0, 4));
  const [kyHieu, setKyHieu] = useState("");
  useEffect(() => {
    void kho.docCaiDat<SoVanBanDi>(KHOA_SO_VB).then(setSo).catch(() => setSo(null));
  }, [kho]);
  const tatCa = useMemo(() => so?.ds ?? [], [so]);
  const dsKyHieu = useMemo(() => [...new Set(tatCa.map((x) => x.kyHieu))].sort(), [tatCa]);
  const dsNam = useMemo(() => [...new Set([nam, ...tatCa.map((x) => x.ngay.slice(0, 4))])].sort().reverse(), [tatCa, nam]);
  const hien = tatCa
    .filter((x) => (caDonVi || x.duAnId === duAn.id) && x.ngay.startsWith(nam) && (!kyHieu || x.kyHieu === kyHieu))
    .sort((a, b) => a.kyHieu.localeCompare(b.kyHieu) || (a.so ?? 0) - (b.so ?? 0) || a.ngay.localeCompare(b.ngay));
  const trung = new Set(hien.filter((x, i) => x.so !== null && hien.findIndex((y) => y.kyHieu === x.kyHieu && y.so === x.so) !== i).map((x) => `${x.kyHieu}|${x.so}`));
  return (
    <div className="the" data-so-van-ban-di>
      <div className="the-dau">
        <h3>Sổ văn bản đi</h3>
        <div className="phai">
          <label className="chu-nho"><input type="checkbox" checked={caDonVi} onChange={(e) => setCaDonVi(e.target.checked)} /> Cả đơn vị (mọi dự án)</label>
          <select aria-label="Năm" value={nam} onChange={(e) => setNam(e.target.value)}>{dsNam.map((n) => <option key={n}>{n}</option>)}</select>
          <select aria-label="Ký hiệu" value={kyHieu} onChange={(e) => setKyHieu(e.target.value)}><option value="">Mọi ký hiệu</option>{dsKyHieu.map((k) => <option key={k}>{k}</option>)}</select>
          <button className="nut nut-nho" disabled={!hien.length} onClick={() => void xuatExcelSoVanBan(hien, `SỔ VĂN BẢN ĐI NĂM ${nam}${caDonVi ? "" : ` – ${duAn.ten.toUpperCase()}`}`)}>Xuất Excel</button>
        </div>
      </div>
      <div className="the-than">
        {!hien.length ? (
          <div className="chu-nho mo">Chưa có văn bản có số trong năm {nam}{caDonVi ? "" : " của dự án này"}. Tạo văn bản có số (Văn bản → nhập Số văn bản) thì phần mềm tự ghi sổ.</div>
        ) : (
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="bang chu-nho" aria-label="Sổ văn bản đi">
              <thead><tr><th>Số, ký hiệu</th><th>Ngày ký</th><th>Văn bản</th>{caDonVi && <th>Dự án</th>}<th>Hộ</th><th>Người cấp số</th></tr></thead>
              <tbody>
                {hien.map((x, i) => (
                  <tr key={`${x.soDayDu}-${x.luc ?? i}-${i}`} style={trung.has(`${x.kyHieu}|${x.so}`) ? { color: "var(--do-to)" } : undefined} title={trung.has(`${x.kyHieu}|${x.so}`) ? "Số trùng trong năm — kiểm tra lại" : undefined}>
                    <td>{x.soDayDu}</td><td>{vn(x.ngay)}</td><td>{x.ma} – {x.tenMau}</td>{caDonVi && <td>{x.duAnTen}</td>}<td>{x.hoMa ?? ""}</td><td>{x.nguoi ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {trung.size > 0 && <div className="thong-bao thong-bao-vang chu-nho" style={{ marginTop: 6 }}>Có {trung.size} số bị cấp trùng (tô đỏ) — văn thư kiểm tra, đánh lại số nếu cần.</div>}
      </div>
    </div>
  );
}
