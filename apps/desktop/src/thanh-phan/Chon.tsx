import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { khongDau } from "../tim-kiem";

/**
 * Ô chọn có tìm nhanh — thay thế <select> trong toàn phần mềm, cùng cách dùng (value, onChange(e.target.value),
 * <option>, <optgroup>). Danh sách ≤ SO_TOI_THIEU lựa chọn giữ nguyên <select> gốc (tìm không có ích).
 * Danh sách dài: bấm vào hoặc gõ ký tự đầu tiên → mở ô tìm; khớp không dấu, theo cụm từ bất kỳ hoặc chữ cái đầu
 * mỗi từ (vd. "cm" → "Chiềng Mung"); ↑ ↓ Enter để chọn, Esc để đóng.
 * Vẫn dùng phần tử <select> thật để giữ kiểu dáng, bố cục, nhãn truy cập — chỉ thay danh sách thả xuống.
 */
export const SO_TOI_THIEU = 7;

type TuyChon = { value: string; nhan: string; disabled?: boolean; nhom?: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
};

function chuCua(n: ReactNode): string {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(chuCua).join("");
  if (isValidElement<{ children?: ReactNode }>(n)) return chuCua(n.props.children);
  return "";
}

function docTuyChon(children: ReactNode, nhom?: string, out: TuyChon[] = []): TuyChon[] {
  Children.forEach(children, (c) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode; disabled?: boolean; label?: string }>(c)) return;
    if (c.type === "option") {
      const nhan = chuCua(c.props.children);
      out.push({ value: c.props.value !== undefined ? String(c.props.value) : nhan, nhan, disabled: c.props.disabled, nhom });
    } else if (c.type === "optgroup") docTuyChon(c.props.children, c.props.label, out);
    else if (c.type === Fragment) docTuyChon(c.props.children, nhom, out);
  });
  return out;
}

/** Điểm khớp: 3 = đầu chuỗi, 2 = đầu một từ, 1 = chứa, 1 = chữ cái đầu các từ; 0 = không khớp. */
export function diemKhop(nhan: string, q: string): number {
  const t = khongDau(q.trim());
  if (!t) return 1;
  const s = khongDau(nhan);
  const tu = t.split(/\s+/);
  if (s.startsWith(t)) return 3;
  if (tu.every((x) => s.includes(x))) return tu.every((x) => new RegExp(`(^|[^a-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(s)) ? 2 : 1;
  const dau = s.split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0]).join("");
  return t.length >= 2 && !t.includes(" ") && dau.includes(t) ? 1 : 0;
}

function ToSang({ chu, q }: { chu: string; q: string }) {
  const t = khongDau(q.trim());
  const s = khongDau(chu);
  const i = t ? s.indexOf(t) : -1;
  if (i < 0 || s.length !== chu.length) return <>{chu}</>;
  return <>{chu.slice(0, i)}<mark>{chu.slice(i, i + t.length)}</mark>{chu.slice(i + t.length)}</>;
}

export function Chon({ children, value, onChange, disabled, ...khac }: Props) {
  const ds = useMemo(() => docTuyChon(children), [children]);
  const giaTri = value === undefined || value === null ? "" : String(value);
  if (ds.length < SO_TOI_THIEU) {
    return (
      <select {...khac} value={giaTri} disabled={disabled} onChange={(e) => onChange?.({ target: { value: e.target.value } })}>
        {children}
      </select>
    );
  }
  return <ChonTim ds={ds} giaTri={giaTri} onChange={onChange} disabled={disabled} khac={khac}>{children}</ChonTim>;
}

function ChonTim({ ds, giaTri, onChange, disabled, khac, children }: { ds: TuyChon[]; giaTri: string; onChange?: Props["onChange"]; disabled?: boolean; khac: Omit<Props, "children" | "value" | "onChange" | "disabled">; children: ReactNode }) {
  const oRef = useRef<HTMLSelectElement>(null);
  const timRef = useRef<HTMLInputElement>(null);
  const dsRef = useRef<HTMLUListElement>(null);
  const [mo, setMo] = useState(false);
  const [q, setQ] = useState("");
  const [dang, setDang] = useState(0);
  const [vt, setVt] = useState<{ left: number; top: number; width: number; len: boolean; maxH: number } | null>(null);

  const loc = useMemo(() => {
    const co = ds.map((x, i) => ({ x, i, d: diemKhop(x.nhan, q) })).filter((y) => y.d > 0);
    if (q.trim()) co.sort((a, b) => b.d - a.d || a.i - b.i);
    return co.map((y) => y.x);
  }, [ds, q]);

  const dinhVi = () => {
    const r = oRef.current?.getBoundingClientRect();
    if (!r) return;
    const duoi = window.innerHeight - r.bottom - 8;
    const tren = r.top - 8;
    const len = duoi < 260 && tren > duoi;
    setVt({ left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 260) - 8)), top: len ? r.top - 4 : r.bottom + 4, width: Math.max(r.width, 260), len, maxH: Math.min(360, Math.max(160, len ? tren : duoi)) });
  };
  const moRa = (chuDau = "") => {
    if (disabled) return;
    setQ(chuDau);
    const i = ds.findIndex((x) => x.value === giaTri);
    setDang(chuDau ? 0 : Math.max(0, i));
    dinhVi();
    setMo(true);
  };
  const dong = (traTieuDiem = true) => {
    setMo(false);
    if (traTieuDiem) oRef.current?.focus();
  };
  const chon = (x: TuyChon) => {
    if (x.disabled) return;
    if (x.value !== giaTri) onChange?.({ target: { value: x.value } });
    dong();
  };

  useLayoutEffect(() => {
    if (mo) timRef.current?.focus();
  }, [mo]);
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      const t = e.target as Node;
      if (oRef.current?.contains(t) || dsRef.current?.parentElement?.contains(t)) return;
      dong(false);
    };
    const cuon = (e: Event) => {
      if (dsRef.current?.contains(e.target as Node)) return;
      dinhVi();
    };
    document.addEventListener("mousedown", ngoai);
    window.addEventListener("scroll", cuon, true);
    window.addEventListener("resize", dinhVi);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      window.removeEventListener("scroll", cuon, true);
      window.removeEventListener("resize", dinhVi);
    };
  }, [mo]);
  useEffect(() => {
    dsRef.current?.querySelector<HTMLElement>(`[data-i="${dang}"]`)?.scrollIntoView({ block: "nearest" });
  }, [dang, mo]);

  const phim = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setDang((d) => Math.min(loc.length - 1, d + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setDang((d) => Math.max(0, d - 1)); }
    else if (e.key === "PageDown") { e.preventDefault(); setDang((d) => Math.min(loc.length - 1, d + 8)); }
    else if (e.key === "PageUp") { e.preventDefault(); setDang((d) => Math.max(0, d - 8)); }
    else if (e.key === "Enter") { e.preventDefault(); const x = loc[dang]; if (x) chon(x); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); dong(); }
    else if (e.key === "Tab") dong(false);
  };

  let nhomTruoc: string | undefined;
  return (
    <>
      <select
        {...khac}
        ref={oRef}
        value={giaTri}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={mo}
        onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          if (mo) dong(); else { oRef.current?.focus(); moRa(); }
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey && e.key !== "ArrowDown") return;
          if (e.key.length === 1 && e.key !== " ") { e.preventDefault(); moRa(e.key); }
          else if (e.key === " " || e.key === "Enter" || e.key === "F4" || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); moRa(); }
        }}
      >
        {children}
      </select>
      {mo && vt && createPortal(
        <div className={`chon-tha ${vt.len ? "len" : ""}`} style={{ left: vt.left, top: vt.top, width: vt.width }} onKeyDown={phim}>
          <input
            ref={timRef}
            className="chon-tim"
            value={q}
            placeholder="Gõ để tìm… (không cần dấu)"
            aria-label="Tìm trong danh sách"
            aria-controls="chon-ds"
            onChange={(e) => { setQ(e.target.value); setDang(0); }}
          />
          <ul ref={dsRef} id="chon-ds" role="listbox" style={{ maxHeight: vt.maxH - 48 }}>
            {loc.map((x, i) => {
              const tieuDeNhom = !q.trim() && x.nhom && x.nhom !== nhomTruoc ? x.nhom : null;
              nhomTruoc = x.nhom;
              return (
                <Fragment key={`${x.value}-${i}`}>
                  {tieuDeNhom && <li className="chon-nhom" role="presentation">{tieuDeNhom}</li>}
                  <li
                    role="option"
                    data-i={i}
                    aria-selected={x.value === giaTri}
                    aria-disabled={x.disabled}
                    className={`${i === dang ? "dang" : ""} ${x.value === giaTri ? "da-chon" : ""} ${x.disabled ? "tat" : ""}`}
                    onMouseEnter={() => setDang(i)}
                    onMouseDown={(e) => { e.preventDefault(); chon(x); }}
                  >
                    <ToSang chu={x.nhan || "—"} q={q} />
                  </li>
                </Fragment>
              );
            })}
            {loc.length === 0 && <li className="chon-trong" role="presentation">Không có mục khớp “{q}”</li>}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}
