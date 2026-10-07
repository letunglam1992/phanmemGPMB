import { useMemo, useRef, useState } from "react";
import type { DuAn, Ho } from "../mo-hinh";
import { docLyTrinh, dsDoan, excelLyTrinh, hienDiem, hienLyTrinh, matBangTheoLyTrinh, type LyTrinh } from "../ly-trinh";
import { HopThoai } from "./chung";
import { useUngDung } from "../ung-dung";
import { taiXuong } from "../tai-xuong";
import { hienSo } from "../so";

const km = (m: number) => (m / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 });

/**
 * Ghi nhanh lý trình cho nhiều thửa (1.0.4, không bắt buộc): bảng mọi thửa của các hộ, gõ liên tục (Enter sang dòng
 * dưới), hoặc gõ một đoạn chung rồi áp cho các thửa còn trống / mọi thửa. Lưu một lô, ghi nhật ký từng hộ.
 */
export function HopGhiLyTrinh({ hos, dong }: { hos: Ho[]; dong: () => void }) {
  const { luuNhieuHo, bao } = useUngDung();
  const dong_ = useMemo(() => hos.flatMap((h) => h.thua.map((t) => ({ h, t }))), [hos]);
  const [chu, setChu] = useState<Record<string, string>>(() => Object.fromEntries(dong_.map(({ t }) => [t.id, hienLyTrinh(t.lyTrinh)])));
  const [chung, setChung] = useState("");
  const [dang, setDang] = useState(false);
  const o = useRef<Record<string, HTMLInputElement | null>>({});
  const loi = (s: string) => { const r = docLyTrinh(s); return "loi" in r ? r.loi : null; };
  const loiChung = loi(chung);
  const ap = (chiTrong: boolean) => setChu((c) => Object.fromEntries(Object.entries(c).map(([id, v]) => [id, chiTrong && v.trim() ? v : chung])));
  const thayDoi = dong_.filter(({ t }) => { const r = docLyTrinh(chu[t.id] ?? ""); return !("loi" in r) && hienLyTrinh(r.ly) !== hienLyTrinh(t.lyTrinh); });
  const soLoi = dong_.filter(({ t }) => loi(chu[t.id] ?? "")).length;
  const luu = async () => {
    if (soLoi) return bao(`${soLoi} ô lý trình viết chưa đúng — sửa hoặc xóa trước khi lưu`, "loi");
    const theoHo = new Map<string, { h: Ho; doi: string[] }>();
    for (const { h, t } of thayDoi) {
      const x = theoHo.get(h.id) ?? { h: { ...h, thua: h.thua.map((y) => ({ ...y })) }, doi: [] };
      const r = docLyTrinh(chu[t.id] ?? "") as { ly: LyTrinh | null };
      const tt = x.h.thua.find((y) => y.id === t.id)!;
      if (r.ly) tt.lyTrinh = r.ly; else delete tt.lyTrinh;
      x.doi.push(`thửa ${t.soThua} tờ ${t.soTo}: ${hienLyTrinh(r.ly) || "xóa"}`);
      theoHo.set(h.id, x);
    }
    if (!theoHo.size) return dong();
    setDang(true);
    try {
      const r = await luuNhieuHo([...theoHo.values()].map(({ h, doi }) => ({ h, nhatKy: `Ghi lý trình: ${doi.join("; ")}` })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
      bao(`Đã ghi lý trình ${thayDoi.length} thửa của ${r.daLuu} hộ`);
      dong();
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Ghi lý trình theo thửa" rong={900} dong={dong}
      chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={dang || !thayDoi.length || soLoi > 0} onClick={() => void luu()}>{dang ? "Đang lưu…" : `Lưu ${thayDoi.length} thửa`}</button></>}>
      <p className="mo chu-nho" style={{ marginTop: 0 }}>Không bắt buộc — ghi để theo dõi mặt bằng theo đoạn tuyến. Một điểm (Km12+350) hoặc một đoạn (Km12+350 – Km12+480); Enter sang thửa kế tiếp; để trống = không ghi.</p>
      <div className="nhom-nut mb-10" style={{ alignItems: "flex-start" }}>
        <label className="o-nhap" style={{ flex: 1 }}>
          <span>Một đoạn chung</span>
          <input aria-label="Lý trình chung" value={chung} placeholder="vd. Km3+200 – Km3+450" className={loiChung ? "loi-nhap" : ""} onChange={(e) => setChung(e.target.value)} />
          {loiChung && <span className="chu-do chu-nho">{loiChung}</span>}
        </label>
        <button className="nut" style={{ marginTop: 20 }} disabled={!chung.trim() || !!loiChung} onClick={() => ap(true)}>Áp cho thửa còn trống</button>
        <button className="nut" style={{ marginTop: 20 }} disabled={!chung.trim() || !!loiChung} onClick={() => ap(false)}>Áp cho mọi thửa</button>
      </div>
      <div className="bang-cuon" style={{ maxHeight: 420 }}>
        <table className="bang">
          <thead><tr><th>Mã</th><th>Họ và tên</th><th>Tờ</th><th>Thửa</th><th className="so">DT thu hồi (m²)</th><th style={{ width: 280 }}>Lý trình</th></tr></thead>
          <tbody>
            {dong_.map(({ h, t }, i) => {
              const l = loi(chu[t.id] ?? "");
              return (
                <tr key={t.id}>
                  <td>{h.ma}</td><td>{h.ten}</td><td>{t.soTo}</td><td>{t.soThua}</td><td className="so">{hienSo(t.dienTichThuHoi)}</td>
                  <td>
                    <input ref={(e) => { o.current[t.id] = e; }} aria-label={`Lý trình ${h.ma} thửa ${t.soThua} tờ ${t.soTo}`} value={chu[t.id] ?? ""} className={l ? "loi-nhap" : ""} title={l ?? undefined}
                      onChange={(e) => setChu({ ...chu, [t.id]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const k = dong_[i + 1]; if (k) o.current[k.t.id]?.focus(); } }} />
                    {l && <div className="chu-do chu-nho">{l}</div>}
                  </td>
                </tr>
              );
            })}
            {!dong_.length && <tr><td colSpan={6} className="trong">Các hộ chưa có thửa đất.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

/** Thẻ "Mặt bằng theo lý trình" ở Tổng quan dự án — chỉ hiện khi có thửa ghi lý trình. */
export function TheLyTrinh({ duAn, hos, ghi }: { duAn: DuAn; hos: Ho[]; ghi?: () => void }) {
  const { bao } = useUngDung();
  const ds = useMemo(() => dsDoan(hos, (h) => !!h.banGiao?.ngay), [hos]);
  const [mo, setMo] = useState(false);
  if (!ds.length) return null;
  const mb = matBangTheoLyTrinh(ds);
  const tongThua = hos.reduce((s, h) => s + h.thua.length, 0);
  const xuat = async () => {
    const dt = new Map(hos.flatMap((h) => h.thua.map((t) => [t.id, t.dienTichThuHoi])));
    const b = await excelLyTrinh(duAn.ten, ds, (d) => dt.get(d.thuaId) ?? "");
    if (await taiXuong(b, `Mat-bang-theo-ly-trinh - ${duAn.ten}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) bao("Đã xuất Excel mặt bằng theo lý trình");
  };
  return (
    <div className="the" aria-label="Mặt bằng theo lý trình">
      <div className="the-dau">
        <h3>Mặt bằng theo lý trình</h3>
        <span className="mo chu-nho">{ds.length}/{tongThua} thửa có ghi lý trình</span>
        <div className="phai">
          {ghi && <button className="nut nut-nho" onClick={ghi}>Ghi lý trình…</button>}
          <button className="nut nut-nho" onClick={() => void xuat()}>Xuất Excel</button>
        </div>
      </div>
      <div className="the-than">
        <div className="luoi luoi-3">
          <div><div className="mo chu-nho">Chiều dài có ghi lý trình</div><b>{km(mb.tongM)} km</b></div>
          <div><div className="mo chu-nho">Mặt bằng sạch (thửa đã bàn giao)</div><b style={{ color: "var(--xanh, #44872a)" }}>{km(mb.sachM)} km</b>{mb.tongM > 0 && <span className="mo chu-nho"> · {Math.round((mb.sachM / mb.tongM) * 100)}%</span>}</div>
          <div><div className="mo chu-nho">Đoạn còn vướng</div><b className={mb.chua.length ? "chu-do" : ""}>{mb.chua.length ? mb.chua.map(([a, b]) => `${hienDiem(a)} – ${hienDiem(b)}`).join("; ") : "Không"}</b></div>
        </div>
        {mb.soThuaDiem > 0 && <div className="mo chu-nho mt-4">{mb.soThuaDiem} thửa chỉ ghi một điểm — không tính vào chiều dài.</div>}
        <button className="nut nut-nho mt-8" onClick={() => setMo(!mo)} aria-expanded={mo}>{mo ? "Thu gọn" : "Xem bảng thửa theo Km"}</button>
        {mo && (
          <div className="bang-cuon mt-8" style={{ maxHeight: 360 }}>
            <table className="bang">
              <thead><tr><th>Lý trình</th><th>Mã</th><th>Họ và tên</th><th>Tờ/thửa</th><th>Tình trạng</th></tr></thead>
              <tbody>{ds.map((d) => <tr key={d.thuaId}><td>{hienLyTrinh(d.ly)}</td><td>{d.ma}</td><td>{d.ten}</td><td>{d.soTo}/{d.soThua}</td><td>{d.daBanGiao ? <span className="nhan nhan-xanh">Đã bàn giao</span> : <span className="nhan nhan-vang">Chưa bàn giao</span>}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
