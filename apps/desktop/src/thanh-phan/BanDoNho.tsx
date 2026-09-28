import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { napBanDoDuAn, type DuLieuBanDo } from "../man/BanDo";
import type { DuAn } from "../mo-hinh";
import { TT_GPMB, type TrangThaiGpmb } from "../trang-thai";

/** Bản đồ nhỏ (SVG) tô thửa theo hiện trạng GPMB; bấm để mở màn Bản đồ. */
export function BanDoNho({ duAn, ttThua }: { duAn: DuAn; ttThua: Map<string, TrangThaiGpmb> }) {
  const { kho, di } = useUngDung();
  const [dl, setDl] = useState<DuLieuBanDo | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    if (!duAn.banDo) return;
    let huy = false;
    napBanDoDuAn(kho, duAn).then((d) => !huy && setDl(d)).catch((e) => setLoi(String(e.message ?? e)));
    return () => { huy = true; };
  }, [duAn.id, duAn.banDo, kho]);

  const hinh = useMemo(() => {
    if (!dl) return null;
    const { pham } = dl;
    const W = 360, H = 220, pad = 8;
    const k = Math.min((W - 2 * pad) / (pham.maxX - pham.minX), (H - 2 * pad) / (pham.maxY - pham.minY));
    const ox = (W - (pham.maxX - pham.minX) * k) / 2, oy = (H - (pham.maxY - pham.minY) * k) / 2;
    const d = (vg: { x: number; y: number }[]) => vg.map((p, i) => `${i ? "L" : "M"}${(ox + (p.x - pham.minX) * k).toFixed(1)} ${(oy + (pham.maxY - p.y) * k).toFixed(1)}`).join("") + "Z";
    const vung = dl.kq.vungGpmb.find((v) => v.ma === duAn.banDo?.vungChon);
    return {
      W, H,
      thua: dl.kq.thua.map((t) => ({ d: t.vong.map(d).join(""), tt: ttThua.get(t.ma) })),
      ranh: vung ? d(vung.vong[0]!) : null,
    };
  }, [dl, ttThua, duAn.banDo?.vungChon]);

  if (!duAn.banDo) return <div className="trong chu-nho">Chưa nạp bản đồ. <button className="nut nut-chu nut-nho" onClick={() => di({ ten: "ban-do", duAnId: duAn.id })}>Nạp DGN</button></div>;
  if (loi) return <div className="thong-bao thong-bao-do">{loi}</div>;
  if (!hinh) return <div className="trong chu-nho">Đang đọc bản đồ…</div>;
  return (
    <svg viewBox={`0 0 ${hinh.W} ${hinh.H}`} style={{ width: "100%", cursor: "pointer", display: "block" }} onClick={() => di({ ten: "ban-do", duAnId: duAn.id })} role="img" aria-label="Bản đồ nhỏ hiện trạng GPMB">
      <rect width={hinh.W} height={hinh.H} fill="var(--ban-do-nen)" />
      {hinh.thua.map((t, i) => (
        <path key={i} d={t.d} fillRule="evenodd" fill={t.tt ? TT_GPMB[t.tt].mau : "var(--xam-nen)"} fillOpacity={t.tt ? 0.75 : 1} stroke="var(--be-mat)" strokeWidth={0.4} />
      ))}
      {hinh.ranh && <path d={hinh.ranh} fill="none" stroke="var(--do-to)" strokeWidth={1.6} />}
    </svg>
  );
}
