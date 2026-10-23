import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn } from "../mo-hinh";
import { KHOA_SO_VB, MA_NGOAI, soTiepTheo, vanBanGhiTay, type SoVanBanDi } from "../so-van-ban";
import { ONgay } from "./ONgay";
import { xuatExcelSoVanBan } from "../xuat-excel";

const vn = (iso: string) => iso.split("-").reverse().join("/");

/** 1.2.0 (C1) — sổ văn bản đi: các văn bản có số tạo từ phần mềm (dự án này hoặc cả đơn vị), lọc theo năm, ký hiệu; xuất Excel. */
export function TheSoVanBanDi({ duAn }: { duAn: DuAn }) {
  const { kho, quyen, bao, thamQuyen } = useUngDung();
  const [so, setSo] = useState<SoVanBanDi | null>(null);
  const [ghi, setGhi] = useState<null | { so: string; kyHieu: string; ngay: string; trichYeu: string; nhiemVu?: string }>(null);
  const [dangGhi, setDangGhi] = useState(false);
  const [caDonVi, setCaDonVi] = useState(false);
  const [nam, setNam] = useState(new Date().toISOString().slice(0, 4));
  const [kyHieu, setKyHieu] = useState("");
  const doc = () => kho.docCaiDat<SoVanBanDi>(KHOA_SO_VB).then(setSo).catch(() => setSo(null));
  useEffect(() => {
    void doc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kho]);
  const luuGhiTay = async () => {
    if (!ghi) return;
    const x = vanBanGhiTay({ ...ghi, duAn });
    if (typeof x === "string") return bao(x, "loi");
    setDangGhi(true);
    try {
      const kq = await kho.capSo([x]);
      await doc();
      setGhi(null);
      bao(kq.trung.length ? `Đã ghi ${x.soDayDu} — số này đã cấp cho ${kq.trung[0]!.daCap.ma} – ${kq.trung[0]!.daCap.tenMau} (${vn(kq.trung[0]!.daCap.ngay)}), kiểm tra lại` : `Đã ghi ${x.soDayDu} vào sổ`, kq.trung.length ? "loi" : undefined);
    } catch (e) {
      bao(`Chưa ghi được vào sổ: ${(e as Error).message}`, "loi");
    } finally {
      setDangGhi(false);
    }
  };
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
          {quyen("SUA_HO_SO") && <button className="nut nut-nho" data-ghi-tay-so onClick={() => setGhi({ so: "", kyHieu: kyHieu || "QĐ-UBND", ngay: new Date().toISOString().slice(0, 10), trichYeu: "" })}>Ghi tay</button>}
          <button className="nut nut-nho" disabled={!hien.length} onClick={() => void xuatExcelSoVanBan(hien, `SỔ VĂN BẢN ĐI NĂM ${nam}${caDonVi ? "" : ` – ${duAn.ten.toUpperCase()}`}`)}>Xuất Excel</button>
        </div>
      </div>
      <div className="the-than">
        {ghi && (
          <div className="luoi luoi-4" data-form-ghi-tay style={{ marginBottom: 8, alignItems: "end" }}>
            <label className="chu-nho">Số<input aria-label="Số văn bản ghi tay" value={ghi.so} inputMode="numeric" placeholder={`gợi ý ${soTiepTheo(so, ghi.kyHieu, ghi.ngay)}`} onChange={(e) => setGhi({ ...ghi, so: e.target.value })} /></label>
            <label className="chu-nho">Ký hiệu<input aria-label="Ký hiệu ghi tay" list="ds-ky-hieu-so" value={ghi.kyHieu} onChange={(e) => setGhi({ ...ghi, kyHieu: e.target.value })} /></label>
            <label className="chu-nho">Ngày ký<ONgay aria-label="Ngày ký ghi tay" value={ghi.ngay} onChange={(e) => setGhi({ ...ghi, ngay: e.target.value })} /></label>
            <label className="chu-nho" style={{ gridColumn: "1 / -1" }}>Trích yếu (văn bản soạn ngoài phần mềm)<input aria-label="Trích yếu ghi tay" value={ghi.trichYeu} onChange={(e) => setGhi({ ...ghi, trichYeu: e.target.value })} /></label>
            <label className="chu-nho" style={{ gridColumn: "1 / -1" }}>Nhiệm vụ được phân cấp (để báo cáo 06 tháng — QĐ {thamQuyen.so})
              <select aria-label="Nhiệm vụ phân cấp ghi tay" value={ghi.nhiemVu ?? ""} onChange={(e) => setGhi({ ...ghi, nhiemVu: e.target.value || undefined })}>
                <option value="">Không thuộc nhiệm vụ phân cấp</option>
                {thamQuyen.nhiemVu.map((n) => <option key={n.ma} value={n.ma}>{n.noiDung} ({n.viTri})</option>)}
              </select>
            </label>
            <datalist id="ds-ky-hieu-so">{[...new Set(["QĐ-UBND", "TB-UBND", "KH-UBND", ...dsKyHieu])].map((k) => <option key={k} value={k} />)}</datalist>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="nut nut-nho nut-chinh" disabled={dangGhi} onClick={() => void luuGhiTay()}>Ghi vào sổ</button>
              <button className="nut nut-nho" onClick={() => setGhi(null)}>Hủy</button>
            </div>
          </div>
        )}
        {!hien.length ? (
          <div className="chu-nho mo">Chưa có văn bản có số trong năm {nam}{caDonVi ? "" : " của dự án này"}. Tạo văn bản có số (Văn bản → nhập Số văn bản) thì phần mềm tự ghi sổ; văn bản soạn ngoài phần mềm bấm “Ghi tay”.</div>
        ) : (
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="bang chu-nho" aria-label="Sổ văn bản đi">
              <thead><tr><th>Số, ký hiệu</th><th>Ngày ký</th><th>Văn bản</th>{caDonVi && <th>Dự án</th>}<th>Hộ</th><th>Người cấp số</th></tr></thead>
              <tbody>
                {hien.map((x, i) => (
                  <tr key={`${x.soDayDu}-${x.luc ?? i}-${i}`} style={trung.has(`${x.kyHieu}|${x.so}`) ? { color: "var(--do-to)" } : undefined} title={trung.has(`${x.kyHieu}|${x.so}`) ? "Số trùng trong năm — kiểm tra lại" : undefined}>
                    <td>{x.soDayDu}</td><td>{vn(x.ngay)}</td><td>{x.ma === MA_NGOAI ? <><span className="nhan nhan-xam">Ghi tay</span> {x.tenMau}</> : `${x.ma} – ${x.tenMau}`}</td>{caDonVi && <td>{x.duAnTen}</td>}<td>{x.hoMa ?? ""}</td><td>{x.nguoi ?? ""}</td>
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
