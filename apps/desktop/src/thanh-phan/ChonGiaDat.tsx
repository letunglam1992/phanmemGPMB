import { useEffect, useMemo, useState } from "react";
import { BO_CHINH_SACH, napBangGiaDat, type BangGiaDat, type DongGiaTuyen } from "../du-lieu";
import { apDungGiamChenhCao, giaTmdvNguonGocDatO, NQ28_2026 } from "@gpmb/core";
import { homNay, nguonDongTuyen } from "../bang-gia-theo-ngay";
import { ONgay } from "./ONgay";
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

const CS = BO_CHINH_SACH["sonla-2026-03-31"]!;

/**
 * Chọn giá đất từ bảng giá NQ 152/2025 (QD-02), áp các sửa đổi có hiệu lực tại thời điểm định giá
 * (NQ 28/2026 từ 01/11/2026 — QD-33). Các điều chỉnh (phân lớp, mặt tiếp giáp, chênh cao…)
 * theo docs/07 được nhập thành "giá sau điều chỉnh" với ghi chú căn cứ.
 */
export function ChonGiaDat(p: { xa: string; loaiDat: string; dong: () => void; chon: (g: GiaThua) => void; chonTuyen?: (r: DongGiaTuyen) => void; ngay?: string }) {
  const [bg, setBg] = useState<BangGiaDat | null>(null);
  /** Thời điểm định giá (ngày phê duyệt phương án) — quyết định bảng giá, GD-09 và k8 Đ7 áp dụng */
  const [ngay, setNgay] = useState(p.ngay || homNay());
  /** k8 Đ7: đất TM-DV của hộ gia đình, cá nhân có nguồn gốc từ đất ở — cán bộ xác định, phần mềm chỉ tính 90% Bảng 05 */
  const [k8, setK8] = useState(false);
  const [bang, setBang] = useState<Bang>(p.chonTuyen && bangTheoLoai(p.loaiDat) === "NN" ? "DAT_O" : bangTheoLoai(p.loaiDat));
  const [xa, setXa] = useState(p.xa);
  const [loc, setLoc] = useState("");
  const [tay, setTay] = useState({ gia: "", nguon: "" });
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return;
    let huy = false;
    void napBangGiaDat(ngay).then((b) => { if (!huy) setBg(b); });
    return () => { huy = true; };
  }, [ngay]);

  const coK8 = bang === "TMDV" && !!giaTmdvNguonGocDatO(CS, 1, ngay);
  const dungK8 = coK8 && k8;
  const tuyen: DongGiaTuyen[] = useMemo(() => {
    if (!bg) return [];
    const ds = bang === "DAT_O" || dungK8 ? bg.dat_o : bang === "TMDV" ? bg.dat_tmdv : bang === "SKC" ? bg.dat_skc : [];
    const q = loc.toLowerCase();
    return ds.filter((r) => r.xa === xa && (!q || `${r.nhom} ${r.tuyen}`.toLowerCase().includes(q)));
  }, [bg, bang, xa, loc, dungK8]);
  /** Giá hiển thị/chọn của một ô: k8 Đ7 → 90% đơn giá đất ở cùng vị trí, cùng tuyến */
  const giaO = (g: number) => (dungK8 ? giaTmdvNguonGocDatO(CS, g, ngay)!.giaNghinDong : String(g));
  const nguonO = (r: DongGiaTuyen, v: number, g: number) => {
    if (!dungK8) return nguonDongTuyen(r, v);
    const k = giaTmdvNguonGocDatO(CS, g, ngay)!;
    return `Đất TM-DV có nguồn gốc từ đất ở: ${k.moTa} — ${nguonDongTuyen(r, v)}; ${k.canCu}`;
  };
  const chenhCao = apDungGiamChenhCao(CS, ngay);
  const suaDoi = (bg?.ap_dung?.van_ban.length ?? 1) > 1;

  return (
    <HopThoai tieuDe={`Chọn giá đất – NQ 152/2025/NQ-HĐND${suaDoi ? `, sửa đổi bởi ${NQ28_2026.vanBan}` : ""}`} dong={p.dong} rong={1100}>
      {!bg ? (
        <div className="trong">Đang nạp bảng giá đất…</div>
      ) : (
        <>
          <div className="luoi luoi-3" style={{ marginBottom: 12 }}>
            <O nhan="Thời điểm định giá (ngày phê duyệt phương án)">
              <ONgay value={ngay} aria-label="Thời điểm định giá" onChange={(e) => setNgay(e.target.value)} />
            </O>
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
          </div>
          <div className="mo chu-nho" style={{ marginBottom: 8 }} data-bang-ap-dung>
            Áp dụng: {bg.ap_dung?.van_ban.join("; ") ?? bg.van_ban}
            {suaDoi ? ` — Phương án đã phê duyệt trước ${NQ28_2026.hieuLucTu.split("-").reverse().join("/")} tiếp tục thực hiện theo phương án đã duyệt (k1 Đ3 NQ 28/2026): chọn thời điểm định giá là ngày phê duyệt để tra bảng cũ.` : ""}
          </div>
          {coK8 && (
            <label className="chu-nho" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input type="checkbox" checked={k8} onChange={(e) => setK8(e.target.checked)} aria-label="Đất TM-DV có nguồn gốc từ đất ở" />
              Đất thương mại, dịch vụ của hộ gia đình, cá nhân đang sử dụng ổn định lâu dài có nguồn gốc từ đất ở (được công nhận, giao đất ban đầu là đất ở hoặc được phép chuyển mục đích từ đất ở): giá = 90% đơn giá đất ở cùng vị trí, cùng tuyến tại Bảng 05 ({NQ28_2026.tmdvNguonGocDatO.canCu}). Cán bộ xác định thửa thuộc trường hợp này.
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
                      <td><button className="nut nut-nho" onClick={() => p.chon({ giaNghinDong: String(r.gia), nguon: `Bảng ${r.bang}, STT ${r.stt}, ${r.xa}, ${tenDayDu(r.loai_dat)}` })}>Chọn</button></td>
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
                      <td>{r.stt || <span className="nhan" title={r.can_cu}>Bổ sung</span>}</td>
                      <td>{r.tuyen}<div className="can-cu">{r.nhom}</div>
                        {r.thay_doi?.map((x, j) => <div key={j} className="can-cu" data-thay-doi>{x}</div>)}
                        {r.ghi_chu && <div className="can-cu">{r.ghi_chu}</div>}
                        {r.canh_bao.length > 0 && <div className="nhan nhan-vang">{r.canh_bao.join("; ")}</div>}</td>
                      {[0, 1, 2, 3, 4].map((v) => { const g = r.vt[v] ?? null; return (
                        <td key={v} className="so">
                          {g === null ? <span className="mo">—</span> : p.chonTuyen ? giaO(g) : (
                            <button className="nut nut-nho" title={`Chọn vị trí ${v + 1}`} onClick={() => p.chon({ giaNghinDong: giaO(g), nguon: nguonO(r, v + 1, g) })}>{giaO(g)}</button>
                          )}
                        </td>
                      ); })}
                      {p.chonTuyen && <td><button className="nut nut-nho nut-chinh" onClick={() => p.chonTuyen!(dungK8 ? { ...r, vt: r.vt.map((g) => (g === null ? null : Number(giaO(g)))), van_ban: `${r.van_ban ?? "NQ 152/2025/NQ-HĐND"} — 90% giá đất ở (${NQ28_2026.tmdvNguonGocDatO.canCu})` } : r)}>Chọn tuyến</button></td>}
                    </tr>
                  ))}
                  {tuyen.length === 0 && <tr><td colSpan={7} className="trong">Không có dòng phù hợp.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          {!p.chonTuyen && <div className="the the-than" style={{ marginTop: 12, background: "var(--be-mat-2)" }}>
            <b className="chu-nho">Giá sau điều chỉnh (phân lớp, mặt tiếp giáp{chenhCao.apDung === true ? ", chênh cao" : ""}… theo Đ4, Đ6 NQ 152)</b>
            <div className="mo chu-nho" data-chenh-cao>{chenhCao.apDung === true ? `Chênh cao ≥ 1,5 m giảm 30% (k3 Đ4): ${chenhCao.lyDo}` : chenhCao.lyDo}</div>
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
