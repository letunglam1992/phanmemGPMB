import { useMemo, useState } from "react";
import { heSoChuyenDoiNghe, thonCoHeSo, type BoChinhSach } from "@gpmb/core";
import type { DuAn, Ho } from "../mo-hinh";
import { HopThoai } from "./chung";
import { useUngDung } from "../ung-dung";
import { laDatNN } from "../tinh-ho";

/**
 * Tổ, thôn, bản, tiểu khu nơi có thửa đất (QĐ 64/2026): chọn từ danh sách Phụ lục của xã (kèm hệ số) hoặc ghi tay;
 * nhiều tổ, thôn → phần mềm lấy mức cao nhất (k4 Điều 14 PL II QĐ 106/2025 sửa đổi).
 */
export function OThonBan({ cs, xa, value, onChange, nhan }: { cs: BoChinhSach; xa: string; value: string[] | undefined; onChange: (v: string[] | undefined) => void; nhan: string }) {
  const ds = thonCoHeSo(cs, xa);
  const [tay, setTay] = useState("");
  const [moTay, setMoTay] = useState(false);
  const gt = value ?? [];
  const them = (t: string) => { const x = t.trim(); if (x && !gt.includes(x)) onChange([...gt, x]); };
  const bo = (t: string) => { const v = gt.filter((x) => x !== t); onChange(v.length ? v : undefined); };
  const heSo = (t: string) => ds.find((x) => x.thon.toLowerCase() === t.toLowerCase())?.heSo;
  return (
    <div className="thon-ban" data-thon-ban>
      {gt.map((t) => (
        <span key={t} className="nhan nhan-xam" style={{ marginRight: 4 }}>
          {t}{heSo(t) ? ` · ${heSo(t)} lần` : ""} <button className="nut-chu" aria-label={`Bỏ ${t}`} onClick={() => bo(t)}>×</button>
        </span>
      ))}
      {!moTay ? (
        <select aria-label={nhan} value="" className={ds.length && !gt.length ? "nhac-nhap" : ""} title="Tổ, thôn, bản, tiểu khu nơi có thửa đất — xác định hệ số hỗ trợ chuyển đổi nghề (QĐ 64/2026)"
          onChange={(e) => { if (e.target.value === "__tay__") setMoTay(true); else them(e.target.value); }}>
          <option value="">{gt.length ? "+ thêm tổ, thôn (thửa trên nhiều tổ, thôn)" : ds.length ? "— Tổ, thôn, bản của thửa (hệ số CĐN) —" : "— Tổ, thôn, bản (không bắt buộc) —"}</option>
          {ds.filter((x) => !gt.includes(x.thon)).map((x) => <option key={`${x.heSo}-${x.thon}`} value={x.thon}>{x.thon} — {x.heSo} lần</option>)}
          <option value="__tay__">Tổ, thôn khác (ghi tay) — mức chung</option>
        </select>
      ) : (
        <span style={{ display: "inline-flex", gap: 4 }}>
          <input value={tay} autoFocus placeholder="Tên tổ, thôn, bản" aria-label={`${nhan} (ghi tay)`} onChange={(e) => setTay(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { them(tay); setTay(""); setMoTay(false); } if (e.key === "Escape") setMoTay(false); }} />
          <button className="nut nut-nho" onClick={() => { them(tay); setTay(""); setMoTay(false); }}>Thêm</button>
        </span>
      )}
    </div>
  );
}

/**
 * Ghi nhanh tổ, thôn, bản cho các thửa đất nông nghiệp của nhiều hộ (QĐ 64/2026). Mỗi thửa một tổ, thôn (thửa trên
 * nhiều tổ, thôn: thêm ở thẻ Thửa đất). Lưu một lô, ghi nhật ký.
 */
export function HopGhiThonBan({ hos, duAn, cs, dong }: { hos: Ho[]; duAn: DuAn; cs: BoChinhSach; dong: () => void }) {
  const { luuNhieuHo, bao } = useUngDung();
  const ds = thonCoHeSo(cs, duAn.xa);
  const dongs = useMemo(() => hos.flatMap((h) => h.thua.filter((t) => laDatNN(t.loaiDat)).map((t) => ({ h, t }))), [hos]);
  const [gt, setGt] = useState<Record<string, string>>(() => Object.fromEntries(dongs.map(({ t }) => [t.id, (t.thonBan ?? []).join("; ")])));
  const [chung, setChung] = useState("");
  const [dang, setDang] = useState(false);
  const tach = (s: string) => s.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
  const thayDoi = dongs.filter(({ t }) => tach(gt[t.id] ?? "").join("; ") !== (t.thonBan ?? []).join("; "));
  const ap = (chiTrong: boolean) => setGt((g) => Object.fromEntries(Object.entries(g).map(([id, v]) => [id, chiTrong && v.trim() ? v : chung])));
  const luu = async () => {
    const theoHo = new Map<string, { h: Ho; doi: string[] }>();
    for (const { h, t } of thayDoi) {
      const x = theoHo.get(h.id) ?? { h: { ...h, thua: h.thua.map((y) => ({ ...y })) }, doi: [] };
      const v = tach(gt[t.id] ?? "");
      const tt = x.h.thua.find((y) => y.id === t.id)!;
      if (v.length) tt.thonBan = v; else delete tt.thonBan;
      x.doi.push(`thửa ${t.soThua} tờ ${t.soTo}: ${v.join("; ") || "xóa"}`);
      theoHo.set(h.id, x);
    }
    if (!theoHo.size) return dong();
    setDang(true);
    try {
      const r = await luuNhieuHo([...theoHo.values()].map(({ h, doi }) => ({ h, nhatKy: `Ghi tổ, thôn, bản (QĐ 64/2026): ${doi.join("; ")}` })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
      bao(`Đã ghi tổ, thôn, bản cho ${thayDoi.length} thửa của ${r.daLuu} hộ`);
      dong();
    } finally {
      setDang(false);
    }
  };
  const heSo = (s: string) => {
    const v = tach(s);
    if (!v.length) return ds.length ? "Cần xác nhận" : `${cs.chuyenDoiNghe.heSoMacDinh} lần`;
    return `${heSoChuyenDoiNghe(cs, duAn.xa, v).heSo} lần`;
  };
  return (
    <HopThoai tieuDe="Ghi tổ, thôn, bản theo thửa" rong={920} dong={dong}
      chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={dang || !thayDoi.length} onClick={() => void luu()}>{dang ? "Đang lưu…" : `Lưu ${thayDoi.length} thửa`}</button></>}>
      <p className="mo chu-nho" style={{ marginTop: 0 }}>
        Hệ số hỗ trợ đào tạo, chuyển đổi nghề theo tổ, thôn, bản, tiểu khu nơi có thửa đất (Điều 14 PL II QĐ 106/2025 sửa đổi bởi QĐ 64/2026). {duAn.xa}: {ds.length ? `${ds.length} tổ, thôn trong Phụ lục` : "không có tổ, thôn trong Phụ lục — mọi thửa 3 lần, không cần ghi"}. Nhiều tổ, thôn cách nhau dấu ;
      </p>
      <datalist id="ds-thon-ban">{ds.map((x) => <option key={`${x.heSo}${x.thon}`} value={x.thon}>{x.heSo} lần</option>)}</datalist>
      <div className="nhom-nut mb-10" style={{ alignItems: "flex-end" }}>
        <label className="o-nhap" style={{ flex: 1 }}>
          <span>Tổ, thôn chung</span>
          <input list="ds-thon-ban" aria-label="Tổ, thôn chung" value={chung} onChange={(e) => setChung(e.target.value)} placeholder="Gõ hoặc chọn từ danh sách" />
        </label>
        <button className="nut" disabled={!chung.trim()} onClick={() => ap(true)}>Áp cho thửa còn trống</button>
        <button className="nut" disabled={!chung.trim()} onClick={() => ap(false)}>Áp cho mọi thửa</button>
      </div>
      <div className="bang-cuon" style={{ maxHeight: 420 }}>
        <table className="bang">
          <thead><tr><th>Mã</th><th>Họ và tên</th><th>Tờ/thửa</th><th>Loại đất</th><th style={{ width: 300 }}>Tổ, thôn, bản</th><th>Hệ số</th></tr></thead>
          <tbody>
            {dongs.map(({ h, t }) => (
              <tr key={t.id}>
                <td>{h.ma}</td><td>{h.ten}</td><td>{t.soTo}/{t.soThua}</td><td>{t.loaiDat}</td>
                <td><input list="ds-thon-ban" aria-label={`Tổ, thôn ${h.ma} thửa ${t.soThua} tờ ${t.soTo}`} value={gt[t.id] ?? ""} onChange={(e) => setGt({ ...gt, [t.id]: e.target.value })} /></td>
                <td className="chu-nho">{heSo(gt[t.id] ?? "")}</td>
              </tr>
            ))}
            {!dongs.length && <tr><td colSpan={6} className="trong">Các hộ không có thửa đất nông nghiệp.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}
