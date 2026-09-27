import { useEffect, useMemo, useState } from "react";
import { napBangGiaDat, type BangGiaDat, type DongGiaTuyen } from "../du-lieu";
import type { GiaThua } from "../mo-hinh";
import { HopThoai, O } from "./chung";

type Bang = "NN" | "DAT_O" | "TMDV" | "SKC" | "KCN";
const TEN_BANG: Record<Bang, string> = {
  NN: "Đất nông nghiệp (Bảng 01–04)",
  DAT_O: "Đất ở (Bảng 05)",
  TMDV: "Đất thương mại, dịch vụ (Bảng 06)",
  SKC: "Đất SXKD phi NN (Bảng 07)",
  KCN: "Đất KCN, CCN (Bảng 08)",
};
function bangTheoLoai(loai: string): Bang {
  const l = loai.toUpperCase();
  if (["ONT", "ODT", "ODT/ONT"].includes(l)) return "DAT_O";
  if (l === "TMD") return "TMDV";
  if (l === "SKC") return "SKC";
  if (["SKK", "SKN"].includes(l)) return "KCN";
  return "NN";
}

/**
 * Chọn giá đất từ bảng giá NQ 152/2025 (QD-02). Các điều chỉnh (phân lớp, mặt tiếp giáp, chênh cao…)
 * theo docs/07 được nhập thành "giá sau điều chỉnh" với ghi chú căn cứ.
 */
export function ChonGiaDat(p: { xa: string; loaiDat: string; dong: () => void; chon: (g: GiaThua) => void; chonTuyen?: (r: DongGiaTuyen) => void }) {
  const [bg, setBg] = useState<BangGiaDat | null>(null);
  const [bang, setBang] = useState<Bang>(p.chonTuyen && bangTheoLoai(p.loaiDat) === "NN" ? "DAT_O" : bangTheoLoai(p.loaiDat));
  const [xa, setXa] = useState(p.xa);
  const [loc, setLoc] = useState("");
  const [tay, setTay] = useState({ gia: "", nguon: "" });
  useEffect(() => {
    void napBangGiaDat().then(setBg);
  }, []);

  const tuyen: DongGiaTuyen[] = useMemo(() => {
    if (!bg) return [];
    const ds = bang === "DAT_O" ? bg.dat_o : bang === "TMDV" ? bg.dat_tmdv : bang === "SKC" ? bg.dat_skc : [];
    const q = loc.toLowerCase();
    return ds.filter((r) => r.xa === xa && (!q || `${r.nhom} ${r.tuyen}`.toLowerCase().includes(q)));
  }, [bg, bang, xa, loc]);

  return (
    <HopThoai tieuDe={`Chọn giá đất – NQ 152/2025/NQ-HĐND`} dong={p.dong} rong={1100}>
      {!bg ? (
        <div className="trong">Đang nạp bảng giá đất…</div>
      ) : (
        <>
          <div className="luoi luoi-3" style={{ marginBottom: 12 }}>
            <O nhan="Bảng giá">
              <select value={bang} onChange={(e) => setBang(e.target.value as Bang)}>
                {Object.entries(TEN_BANG).filter(([k]) => !p.chonTuyen || ["DAT_O", "TMDV", "SKC"].includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </O>
            <O nhan="Xã, phường">
              <select value={xa} onChange={(e) => setXa(e.target.value)}>
                {bg.danh_muc_xa.map((x) => <option key={x}>{x}</option>)}
              </select>
            </O>
            {bang !== "NN" && bang !== "KCN" && <O nhan="Tìm tuyến đường"><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Tên đường, đoạn…" /></O>}
          </div>
          <div className="bang-cuon" style={{ maxHeight: "48vh" }}>
            {bang === "NN" && (
              <table className="bang">
                <thead><tr><th>Bảng</th><th>STT</th><th>Loại đất</th><th className="so">Giá (nghìn đ/m²)</th><th /></tr></thead>
                <tbody>
                  {bg.dat_nong_nghiep.filter((r) => r.xa === xa).map((r, i) => (
                    <tr key={i} className={r.loai_dat === p.loaiDat.toUpperCase() ? "dang-chon" : ""}>
                      <td>{r.bang}</td><td>{r.stt}</td><td>{r.loai_dat}</td><td className="so">{r.gia}</td>
                      <td><button className="nut nut-nho" onClick={() => p.chon({ giaNghinDong: String(r.gia), nguon: `Bảng ${r.bang}, STT ${r.stt}, ${r.xa}, ${r.loai_dat}` })}>Chọn</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {bang === "KCN" && (
              <table className="bang">
                <thead><tr><th>Khu, cụm</th><th>Xã</th><th className="so">Giá</th><th /></tr></thead>
                <tbody>
                  {bg.dat_kcn_ccn.map((r, i) => (
                    <tr key={i}><td>{r.ten}</td><td>{r.xa}</td><td className="so">{r.gia}</td>
                      <td><button className="nut nut-nho" onClick={() => p.chon({ giaNghinDong: String(r.gia), nguon: `Bảng 08, ${r.ten}` })}>Chọn</button></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {bang !== "NN" && bang !== "KCN" && (
              <table className="bang">
                <thead><tr><th>STT</th><th>Tuyến / đoạn</th>{[1, 2, 3, 4, 5].map((v) => <th key={v} className="so">VT{v}</th>)}{p.chonTuyen && <th />}</tr></thead>
                <tbody>
                  {tuyen.map((r, i) => (
                    <tr key={i}>
                      <td>{r.stt}</td>
                      <td>{r.tuyen}<div className="can-cu">{r.nhom}</div>{r.canh_bao.length > 0 && <div className="nhan nhan-vang">{r.canh_bao.join("; ")}</div>}</td>
                      {r.vt.map((g, v) => (
                        <td key={v} className="so">
                          {g === null ? <span className="mo">—</span> : p.chonTuyen ? g : (
                            <button className="nut nut-nho" title={`Chọn vị trí ${v + 1}`} onClick={() => p.chon({ giaNghinDong: String(g), nguon: `Bảng ${r.bang}, ${r.xa}, STT ${r.stt} (${r.tuyen}), VT${v + 1}` })}>{g}</button>
                          )}
                        </td>
                      ))}
                      {p.chonTuyen && <td><button className="nut nut-nho nut-chinh" onClick={() => p.chonTuyen!(r)}>Chọn tuyến</button></td>}
                    </tr>
                  ))}
                  {tuyen.length === 0 && <tr><td colSpan={7} className="trong">Không có dòng phù hợp.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          {!p.chonTuyen && <div className="the the-than" style={{ marginTop: 12, background: "var(--be-mat-2)" }}>
            <b className="chu-nho">Giá sau điều chỉnh (phân lớp, mặt tiếp giáp, chênh cao… theo Đ4, Đ6 NQ 152)</b>
            <div className="luoi" style={{ gridTemplateColumns: "180px 1fr auto", marginTop: 6 }}>
              <input className="o-so" placeholder="nghìn đ/m²" value={tay.gia} onChange={(e) => setTay({ ...tay, gia: e.target.value })} />
              <input placeholder="Căn cứ, cách điều chỉnh (bắt buộc)" value={tay.nguon} onChange={(e) => setTay({ ...tay, nguon: e.target.value })} />
              <button className="nut" disabled={!tay.gia || !tay.nguon.trim() || isNaN(Number(tay.gia))} onClick={() => p.chon({ giaNghinDong: tay.gia, nguon: `Nhập tay: ${tay.nguon}` })}>Dùng giá này</button>
            </div>
          </div>}
        </>
      )}
    </HopThoai>
  );
}
