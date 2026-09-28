import { useEffect, useMemo, useRef, useState } from "react";
import { useUngDung } from "../ung-dung";
import { khongDau, khopTuKhoa } from "../man/DanhSachHo";
import { TEN_DOI_TUONG } from "../mo-hinh";
import { BieuTuong } from "./BieuDo";

/** Tìm nhanh toàn phần mềm (Ctrl + K): tên dự án, xã; tên, mã hộ, cá nhân, tổ chức; tờ/thửa. */
export function TimKiemChung() {
  const { dsDuAn, hoCua, di } = useUngDung();
  const [q, setQ] = useState("");
  const [mo, setMo] = useState(false);
  const [chon, setChon] = useState(0);
  const o = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); o.current?.focus(); o.current?.select(); setMo(true); }
    };
    // Menu chuột phải: "Tìm kiếm nhanh", "Tìm hồ sơ, dự án: <chữ đang chọn>"
    const tim = (e: Event) => {
      const t = (e as CustomEvent<string>).detail;
      if (t) setQ(t);
      o.current?.focus();
      if (!t) o.current?.select();
      setMo(true);
    };
    window.addEventListener("keydown", phim);
    window.addEventListener("gpmb-tim", tim);
    return () => {
      window.removeEventListener("keydown", phim);
      window.removeEventListener("gpmb-tim", tim);
    };
  }, []);
  const kq = useMemo(() => {
    const t = q.trim();
    if (!t) return { duAn: [], ho: [], tongHo: 0 };
    const k = khongDau(t);
    const duAn = dsDuAn.filter((d) => khongDau(`${d.ten} ${d.xa} ${d.chuDauTu}`).includes(k)).slice(0, 5);
    const hoAll = dsDuAn.flatMap((d) => hoCua(d.id).filter((h) => khopTuKhoa({ h, duAnTen: "" }, t)).map((h) => ({ h, d })));
    return { duAn, ho: hoAll.slice(0, 8), tongHo: hoAll.length };
  }, [q, dsDuAn, hoCua]);
  const muc: (() => void)[] = [
    ...kq.duAn.map((d) => () => di({ ten: "du-an", duAnId: d.id })),
    ...kq.ho.map(({ h, d }) => () => di({ ten: "ho", duAnId: d.id, hoId: h.id })),
    ...(q.trim() ? [() => di({ ten: "ds-ho", tim: q.trim() })] : []),
  ];
  const chay = (i: number) => { muc[i]?.(); setMo(false); setQ(""); o.current?.blur(); };
  return (
    <div className="tim-chung" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMo(false); }}>
      <BieuTuong ten="traCuu" co={17} />
      <input
        ref={o}
        value={q}
        placeholder="Tìm dự án, hộ gia đình, cá nhân, tổ chức…"
        aria-label="Tìm kiếm dự án, hồ sơ"
        onFocus={() => setMo(true)}
        onChange={(e) => { setQ(e.target.value); setChon(0); setMo(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setChon((c) => Math.min(c + 1, muc.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setChon((c) => Math.max(c - 1, 0)); }
          else if (e.key === "Enter") chay(chon);
          else if (e.key === "Escape") { e.preventDefault(); setMo(false); o.current?.blur(); }
        }}
      />
      <kbd>Ctrl K</kbd>
      {mo && q.trim() && (
        <div className="tim-ket-qua" role="listbox">
          {kq.duAn.length > 0 && <div className="tim-nhom">Dự án</div>}
          {kq.duAn.map((d, i) => (
            <button key={d.id} tabIndex={-1} className={chon === i ? "chon" : ""} onMouseEnter={() => setChon(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => chay(i)}>
              <span className="bt"><BieuTuong ten="danhSach" co={16} /></span>
              <span><b>{d.ten}</b><small>{d.xa} · {hoCua(d.id).length} hồ sơ</small></span>
            </button>
          ))}
          {kq.ho.length > 0 && <div className="tim-nhom">Hộ gia đình, cá nhân, tổ chức</div>}
          {kq.ho.map(({ h, d }, j) => {
            const i = kq.duAn.length + j;
            return (
              <button key={h.id} tabIndex={-1} className={chon === i ? "chon" : ""} onMouseEnter={() => setChon(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => chay(i)}>
                <span className="bt"><BieuTuong ten="nguoi" co={16} /></span>
                <span><b>{h.ma} · {h.ten}</b><small>{TEN_DOI_TUONG[h.loai]} · {h.diaChi || "—"} · {d.ten}</small></span>
              </button>
            );
          })}
          {kq.duAn.length + kq.ho.length === 0 && <div className="trong" style={{ padding: 14 }}>Không tìm thấy dự án, hồ sơ khớp “{q}”.</div>}
          <button tabIndex={-1} className={`tim-tat-ca ${chon === muc.length - 1 ? "chon" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => chay(muc.length - 1)}>
            Xem tất cả {kq.tongHo} hồ sơ khớp “{q.trim()}” →
          </button>
        </div>
      )}
    </div>
  );
}
