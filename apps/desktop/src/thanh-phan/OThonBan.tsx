import { useState } from "react";
import { thonCoHeSo, type BoChinhSach } from "@gpmb/core";

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
