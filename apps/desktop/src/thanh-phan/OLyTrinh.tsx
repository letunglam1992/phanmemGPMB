import { useEffect, useState } from "react";
import { docLyTrinh, hienLyTrinh, type LyTrinh } from "../ly-trinh";

/** Ô nhập lý trình (không bắt buộc): gõ "Km12+350" hoặc "12+350 – 12+480"; đọc khi rời ô, sai thì báo đỏ, không lưu. */
export function OLyTrinh({ value, onChange, nhan, className }: { value: LyTrinh | undefined; onChange: (l: LyTrinh | undefined) => void; nhan: string; className?: string }) {
  const [chu, setChu] = useState(hienLyTrinh(value));
  const [loi, setLoi] = useState<string | null>(null);
  const hien = hienLyTrinh(value);
  useEffect(() => { setChu(hien); setLoi(null); }, [hien]);
  const ghi = () => {
    const r = docLyTrinh(chu);
    if ("loi" in r) return setLoi(r.loi);
    setLoi(null);
    const moi = r.ly ?? undefined;
    if (hienLyTrinh(moi) !== hienLyTrinh(value)) onChange(moi);
    setChu(hienLyTrinh(moi));
  };
  return (
    <>
      <input className={`${className ?? ""} ${loi ? "loi-nhap" : ""}`} value={chu} aria-label={nhan} placeholder="Lý trình (vd. Km12+350 – Km12+480)" title={loi ?? "Lý trình trên tuyến — không bắt buộc. Một điểm (Km12+350) hoặc một đoạn (Km12+350 – Km12+480)"}
        onChange={(e) => setChu(e.target.value)} onBlur={ghi} onKeyDown={(e) => { if (e.key === "Enter") ghi(); }} />
      {loi && <div className="chu-do chu-nho" role="alert">{loi}</div>}
    </>
  );
}
