import { useEffect, useMemo, useState } from "react";
import { BANG_GIA_GOI, napBangGiaDatTheoBo, napSuaNq28, type BangGiaDat, type DongGiaTuyen } from "../du-lieu";
import { giaTmdTuDatO, type SuaBangGia } from "../bang-gia-nq28";
import { homNayIso } from "../trang-thai";
import type { GiaThua } from "../mo-hinh";
import { HopThoai, O } from "./chung";
import { Chon } from "./Chon";
import { tenDayDu } from "../van-ban/loai-dat";

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
export function ChonGiaDat(p: { xa: string; loaiDat: string; dong: () => void; chon: (g: GiaThua) => void; chonTuyen?: (r: DongGiaTuyen) => void; bo?: string }) {
  const [bg, setBg] = useState<BangGiaDat | null>(null);
  const [bang, setBang] = useState<Bang>(p.chonTuyen && bangTheoLoai(p.loaiDat) === "NN" ? "DAT_O" : bangTheoLoai(p.loaiDat));
  const [xa, setXa] = useState(p.xa);
  const [loc, setLoc] = useState("");
  const [tay, setTay] = useState({ gia: "", nguon: "" });
  // Bảng giá đất kèm gói chính sách: ghi tên văn bản vào nguồn giá (bảng có sẵn ngầm hiểu NQ 152/2025)
  const ghiNguon = (s: string, r?: DongGiaTuyen) => (r?.van_ban ? `${s} — ${r.van_ban}` : p.bo && BANG_GIA_GOI[p.bo] && bg ? `${s} — ${bg.van_ban}` : bg?.nq28 ? `${s} — ${bg.van_ban}` : s);
  // 1.3.1: NQ 28/2026 sửa bảng giá từ 01/11/2026 — cán bộ chọn kỳ (Điều 3 chuyển tiếp); mặc định theo ngày hôm nay
  const goiRieng = !!(p.bo && BANG_GIA_GOI[p.bo]);
  const [sua, setSua] = useState<SuaBangGia | null>(null);
  const [ky, setKy] = useState<"CU" | "MOI" | null>(null);
  const [k8, setK8] = useState(false);
  useEffect(() => {
    if (goiRieng) return void setKy("CU");
    void napSuaNq28().then((s) => { setSua(s); setKy((k) => k ?? (homNayIso() >= s.hieu_luc_tu ? "MOI" : "CU")); });
  }, [goiRieng]);
  useEffect(() => {
    if (!ky) return;
    setBg(null);
    void napBangGiaDatTheoBo(p.bo, ky === "MOI" && sua ? sua.hieu_luc_tu : undefined).then(setBg);
  }, [p.bo, ky, sua]);
  const dungK8 = k8 && bang === "TMDV" && !!bg?.nq28;

  const tuyen: DongGiaTuyen[] = useMemo(() => {
    if (!bg) return [];
    const ds = bang === "DAT_O" || (bang === "TMDV" && k8 && bg.nq28) ? bg.dat_o : bang === "TMDV" ? bg.dat_tmdv : bang === "SKC" ? bg.dat_skc : [];
    const q = loc.toLowerCase();
    return ds.filter((r) => r.xa === xa && (!q || `${r.nhom} ${r.tuyen}`.toLowerCase().includes(q)));
  }, [bg, bang, xa, loc, k8]);

  return (
    <HopThoai tieuDe={`Chọn giá đất – ${bg?.van_ban ?? "NQ 152/2025/NQ-HĐND"}`} dong={p.dong} rong={1100}>
      {!bg ? (
        <div className="trong">Đang nạp bảng giá đất…</div>
      ) : (
        <>
          <div className="luoi luoi-3" style={{ marginBottom: 12 }}>
            <O nhan="Bảng giá">
              <Chon value={bang} onChange={(e) => setBang(e.target.value as Bang)}>
                {Object.entries(TEN_BANG).filter(([k]) => !p.chonTuyen || ["DAT_O", "TMDV", "SKC"].includes(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Chon>
            </O>
            <O nhan="Xã, phường">
              <Chon value={xa} onChange={(e) => setXa(e.target.value)}>
                {bg.danh_muc_xa.map((x) => <option key={x}>{x}</option>)}
              </Chon>
            </O>
            {bang !== "NN" && bang !== "KCN" && <O nhan="Tìm tuyến đường"><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Tên đường, đoạn…" /></O>}
            {sua && !goiRieng && (
              <O nhan="Bảng giá áp dụng">
                <Chon aria-label="Kỳ áp dụng bảng giá đất" value={ky ?? "MOI"} onChange={(e) => setKy(e.target.value as "CU" | "MOI")}>
                  <option value="MOI">Từ {sua.hieu_luc_tu.split("-").reverse().join("/")} — NQ 152 sửa đổi bởi {sua.van_ban.split(" ngày")[0]}</option>
                  <option value="CU">Trước {sua.hieu_luc_tu.split("-").reverse().join("/")} — NQ 152/2025 (chưa sửa đổi)</option>
                </Chon>
              </O>
            )}
          </div>
          {sua && !goiRieng && (
            <div className={`thong-bao ${ky === "MOI" ? "thong-bao-vang" : "thong-bao-xanh"} chu-nho`} style={{ marginBottom: 10 }} data-luu-y-nq28>
              {ky === "MOI"
                ? <>Áp dụng {sua.van_ban} (bổ sung, sửa tên, bãi bỏ tuyến; khoản 3 Điều 4 về giảm giá do chênh cao đã bãi bỏ — Điều 2). {sua.luu_y_nguon}</>
                : <>Bảng giá NQ 152/2025 trước khi sửa đổi — dùng cho phương án đã phê duyệt trước {sua.hieu_luc_tu.split("-").reverse().join("/")} hoặc phải điều chỉnh theo phương án đã duyệt (khoản 1 Điều 3 {sua.van_ban.split(" ngày")[0]}).</>}
            </div>
          )}
          {bang === "TMDV" && bg.nq28 && !p.chonTuyen && (
            <label className="chu-nho" style={{ display: "block", marginBottom: 8 }}>
              <input type="checkbox" checked={k8} onChange={(e) => setK8(e.target.checked)} aria-label="Đất TMDV có nguồn gốc đất ở (khoản 8 Điều 7)" /> Đất thương mại, dịch vụ của hộ gia đình, cá nhân sử dụng ổn định lâu dài có <b>nguồn gốc từ đất ở</b> — 90% đơn giá đất ở cùng vị trí, cùng tuyến (Bảng 05; khoản 8 Điều 7, bổ sung bởi khoản 6 Điều 1 NQ 28/2026)
            </label>
          )}
          <div className="bang-cuon" style={{ maxHeight: "48vh" }}>
            {bang === "NN" && (
              <table className="bang">
                <thead><tr><th>Bảng</th><th>STT</th><th>Loại đất</th><th className="so">Giá (nghìn đ/m²)</th><th /></tr></thead>
                <tbody>
                  {bg.dat_nong_nghiep.filter((r) => r.xa === xa).map((r, i) => (
                    <tr key={i} className={r.loai_dat === p.loaiDat.toUpperCase() ? "dang-chon" : ""}>
                      <td>{r.bang}</td><td>{r.stt}</td><td>{tenDayDu(r.loai_dat)}</td><td className="so">{r.gia}</td>
                      <td><button className="nut nut-nho" onClick={() => p.chon({ giaNghinDong: String(r.gia), nguon: ghiNguon(`Bảng ${r.bang}, STT ${r.stt}, ${r.xa}, ${tenDayDu(r.loai_dat)}`) })}>Chọn</button></td>
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
                      <td><button className="nut nut-nho" onClick={() => p.chon({ giaNghinDong: String(r.gia), nguon: ghiNguon(`Bảng 08, ${r.ten}`) })}>Chọn</button></td></tr>
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
                          {g === null ? <span className="mo">—</span> : p.chonTuyen ? g : dungK8 ? (
                            <button className="nut nut-nho" title={`90% giá đất ở vị trí ${v + 1}`} onClick={() => p.chon({ giaNghinDong: giaTmdTuDatO(g), nguon: ghiNguon(`Khoản 8 Điều 7 (bổ sung bởi khoản 6 Điều 1 NQ 28/2026): 90% × Bảng 05, ${r.xa}, STT ${r.stt} (${r.tuyen}), VT${v + 1} = 90% × ${g}`, r) })}>{giaTmdTuDatO(g)}</button>
                          ) : (
                            <button className="nut nut-nho" title={`Chọn vị trí ${v + 1}`} onClick={() => p.chon({ giaNghinDong: String(g), nguon: ghiNguon(`Bảng ${r.bang}, ${r.xa}, STT ${r.stt} (${r.tuyen}), VT${v + 1}`, r) })}>{g}</button>
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
            <b className="chu-nho">Giá sau điều chỉnh (phân lớp, mặt tiếp giáp{bg.nq28 ? "" : ", chênh cao"}… theo Đ4, Đ6 NQ 152{bg.nq28 ? "; giảm do chênh cao (k3 Đ4) đã bãi bỏ từ 01/11/2026 — Điều 2 NQ 28/2026" : ""})</b>
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
