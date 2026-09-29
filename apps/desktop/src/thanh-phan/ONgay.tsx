import { useEffect, useRef, useState } from "react";
import { BieuTuong } from "./BieuDo";

/**
 * Ô nhập ngày theo định dạng Việt Nam `dd/mm/yyyy`, không phụ thuộc ngôn ngữ của Windows/WebView (ô `type="date"` gốc
 * hiện theo ngôn ngữ hệ điều hành — máy để tiếng Anh sẽ thành mm/dd/yyyy). Giá trị lưu vẫn là chuẩn máy `yyyy-mm-dd`.
 *
 * Gõ được: 5/1/2026, 05/01/2026, 05-01-2026, 05.01.2026, 05012026, 2026-01-05. Nút lịch mở bảng chọn ngày.
 * `onChange` nhận đối tượng dạng sự kiện `{ target: { value } }` để thay trực tiếp cho `<input type="date">`.
 */
export function ONgay(p: {
  value: string | undefined;
  onChange: (e: { target: { value: string } }) => void;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [chu, setChu] = useState(() => hienNgay(p.value));
  const [loi, setLoi] = useState(false);
  const lich = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // giá trị đổi từ bên ngoài (hoàn tác, chọn lịch, tải lại) → hiện lại
    if (docNgay(chu) !== (p.value ?? "")) {
      setChu(hienNgay(p.value));
      setLoi(false);
    }
  }, [p.value]); // eslint-disable-line react-hooks/exhaustive-deps
  const phat = (iso: string) => p.onChange({ target: { value: iso } });
  const go = (s: string) => {
    // tự chèn "/" khi gõ đủ ngày, tháng
    let v = s;
    if (v.length > chu.length && /^\d{2}$|^\d{1,2}\/\d{2}$/.test(v)) v += "/";
    setChu(v);
    const iso = docNgay(v);
    if (iso) {
      setLoi(false);
      if (iso !== p.value) phat(iso);
    } else if (!v.trim()) {
      setLoi(false);
      if (p.value) phat("");
    }
  };
  const roi = () => {
    const iso = docNgay(chu);
    if (iso) setChu(hienNgay(iso));
    setLoi(!!chu.trim() && !iso);
  };
  return (
    <span className={`o-ngay${p.className ? ` ${p.className}` : ""}`}>
      <input
        id={p.id}
        className={loi ? "loi-nhap" : undefined}
        value={chu}
        placeholder="dd/mm/yyyy"
        inputMode="numeric"
        maxLength={10}
        disabled={p.disabled}
        aria-label={p["aria-label"]}
        aria-invalid={loi || undefined}
        title={loi ? "Ngày không hợp lệ — nhập theo dạng ngày/tháng/năm, vd. 05/01/2026" : undefined}
        onChange={(e) => go(e.target.value)}
        onBlur={roi}
        onKeyDown={(e) => e.key === "Enter" && roi()}
      />
      <button type="button" className="o-ngay-lich" tabIndex={-1} disabled={p.disabled} aria-label="Chọn ngày trên lịch" title="Chọn ngày trên lịch" onClick={() => { const e = lich.current; if (!e) return; try { e.showPicker(); } catch { e.focus(); } }}>
        <BieuTuong ten="lich" co={15} />
      </button>
      <input ref={lich} type="date" className="o-ngay-an" tabIndex={-1} aria-hidden value={p.value ?? ""} onChange={(e) => { setChu(hienNgay(e.target.value)); setLoi(false); phat(e.target.value); }} />
    </span>
  );
}

/** "2026-01-05" → "05/01/2026"; chuỗi khác giữ nguyên. */
export function hienNgay(iso: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? "");
}

/** Đọc ngày kiểu Việt Nam (ngày trước, tháng sau) hoặc ISO → "yyyy-mm-dd"; không hợp lệ → "". */
export function docNgay(s: string): string {
  const t = s.trim();
  let d: number, m: number, y: number;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (x) [y, m, d] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else if ((x = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) [d, m, y] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else if ((x = /^(\d{2})(\d{2})(\d{4})$/.exec(t))) [d, m, y] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else return "";
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return "";
  const ngayTrongThang = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > ngayTrongThang) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
