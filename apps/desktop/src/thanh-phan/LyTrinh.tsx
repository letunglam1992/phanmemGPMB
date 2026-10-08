import { useMemo, useRef, useState } from "react";
import type { DuAn, Ho } from "../mo-hinh";
import { docLyTrinh, dsDoan, excelLyTrinh, type DongDoanExcel, hienDiem, hienLyTrinh, hopDoan, matBangTheoLyTrinh, type DoanLyTrinh, type LyTrinh } from "../ly-trinh";
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
export function TheLyTrinh({ duAn, hos, ghi, doan = [] }: { duAn: DuAn; hos: Ho[]; ghi?: () => void; doan?: DongDoanExcel[] }) {
  const { bao } = useUngDung();
  const ds = useMemo(() => dsDoan(hos, (h) => !!h.banGiao?.ngay), [hos]);
  const [mo, setMo] = useState(false);
  if (!ds.length) return null;
  const mb = matBangTheoLyTrinh(ds);
  const tongThua = hos.reduce((s, h) => s + h.thua.length, 0);
  const xuat = async () => {
    const dt = new Map(hos.flatMap((h) => h.thua.map((t) => [t.id, t.dienTichThuHoi])));
    const b = await excelLyTrinh(duAn.ten, ds, (d) => dt.get(d.thuaId) ?? "", doan);
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
        <div className="mt-8"><DaiKm ds={ds} /></div>
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

/** Dải Km: các đoạn đã ghi lý trình từ đầu đến cuối — xanh: sạch (đã bàn giao), đỏ: còn vướng, xám: chưa có thửa ghi. */
export function DaiKm({ ds, bam }: { ds: DoanLyTrinh[]; bam?: (doan: [number, number]) => void }) {
  const mb = matBangTheoLyTrinh(ds);
  const tatCa = hopDoan(ds.map((x) => x.ly));
  if (!tatCa.length) return null;
  const dau = tatCa[0]![0], cuoi = tatCa.at(-1)![1];
  const dai = Math.max(cuoi - dau, 1);
  const x = (m: number) => ((m - dau) / dai) * 1000;
  const vach: number[] = [];
  const buoc = dai > 20000 ? 5000 : dai > 5000 ? 1000 : dai > 1000 ? 500 : 100;
  for (let m = Math.ceil(dau / buoc) * buoc; m <= cuoi; m += buoc) vach.push(m);
  const doan = (ds2: [number, number][], mau: string, ten: string) =>
    ds2.map(([a, b]) => (
      <rect key={`${ten}${a}`} x={x(a)} y={6} width={Math.max(x(b) - x(a), 2)} height={18} fill={mau} style={{ cursor: bam ? "pointer" : undefined }} onClick={() => bam?.([a, b])}>
        <title>{`${ten}: ${hienDiem(a)} – ${hienDiem(b)} (${km(b - a)} km)`}</title>
      </rect>
    ));
  return (
    <svg viewBox="-10 0 1020 46" role="img" aria-label={`Dải lý trình ${hienDiem(dau)} – ${hienDiem(cuoi)}: sạch ${km(mb.sachM)} km, vướng ${mb.chua.length} đoạn`} style={{ width: "100%", height: 54, display: "block" }} data-dai-km>
      <rect x={0} y={6} width={1000} height={18} fill="var(--be-mat-2)" stroke="var(--vien)" />
      {doan(tatCa, "var(--xam-nen)", "Có ghi lý trình")}
      {doan(mb.sach, "var(--xanh-to)", "Mặt bằng sạch")}
      {doan(mb.chua, "var(--do-to)", "Còn vướng")}
      {vach.map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1={24} y2={30} stroke="var(--chu-mo)" />
          <text x={x(m)} y={42} fontSize={10} textAnchor="middle" fill="var(--chu-mo)">{hienDiem(m).replace(/\+000$/, "")}</text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Màn Bản đồ — "Theo lý trình": chọn (tô, phóng tới) các thửa trên bản đồ theo đoạn Km, hoặc bấm đoạn còn vướng.
 * Thửa hồ sơ khớp thửa bản đồ theo liên kết đã gắn (maBanDo), chưa gắn thì theo số tờ, số thửa (bỏ số 0 đầu).
 */
export function TheLyTrinhBanDo({ hos, chonThuaBanDo }: { hos: Ho[]; chonThuaBanDo: (ds: { maBanDo?: string; soTo: string; soThua: string }[]) => number }) {
  const ds = useMemo(() => dsDoan(hos, (h) => !!h.banGiao?.ngay), [hos]);
  const [chu, setChu] = useState("");
  const [tb, setTb] = useState<string | null>(null);
  if (!ds.length) return null;
  const mb = matBangTheoLyTrinh(ds);
  const thuaCua = new Map(hos.flatMap((h) => h.thua.map((t) => [t.id, t] as const)));
  const chon = (a: number, b: number) => {
    const ma = ds.filter((d) => d.ly.tu <= b && (d.ly.den ?? d.ly.tu) >= a).map((d) => thuaCua.get(d.thuaId)!).map((t) => ({ maBanDo: t.maBanDo, soTo: t.soTo, soThua: t.soThua }));
    const n = chonThuaBanDo(ma);
    setTb(n ? `Đã chọn ${n} thửa trên bản đồ (${hienDiem(a)} – ${hienDiem(b)})` : `Đoạn ${hienDiem(a)} – ${hienDiem(b)}: không có thửa đã gắn bản đồ`);
  };
  const r = docLyTrinh(chu);
  return (
    <div className="the co-dinh" aria-label="Lý trình trên bản đồ">
      <div className="the-dau"><h3>Theo lý trình</h3><span className="mo chu-nho">sạch {km(mb.sachM)}/{km(mb.tongM)} km</span></div>
      <div className="the-than" style={{ display: "grid", gap: 6 }}>
        <DaiKm ds={ds} bam={([a, b]) => chon(a, b)} />
        <div className="nhom-nut">
          <input aria-label="Đoạn lý trình cần xem" placeholder="Km1+000 – Km1+500" value={chu} onChange={(e) => setChu(e.target.value)} className={"loi" in r ? "loi-nhap" : ""} style={{ flex: 1 }} />
          <button className="nut nut-nho" disabled={!("ly" in r) || !r.ly} onClick={() => "ly" in r && r.ly && chon(r.ly.tu, r.ly.den ?? r.ly.tu)}>Chọn trên bản đồ</button>
        </div>
        {mb.chua.length > 0 && (
          <div className="chu-nho">
            Còn vướng:{" "}
            {mb.chua.map(([a, b]) => <button key={a} className="nut nut-chu nut-nho" onClick={() => chon(a, b)}>{hienDiem(a)} – {hienDiem(b)}</button>)}
          </div>
        )}
        {tb && <div className="mo chu-nho" role="status">{tb}</div>}
      </div>
    </div>
  );
}
