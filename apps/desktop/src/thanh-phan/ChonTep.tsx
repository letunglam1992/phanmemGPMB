import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";

/**
 * Ô chọn tệp dùng chung (1.0.3): nút tiếng Việt + tên tệp đã chọn, thay ô chọn tệp gốc của trình duyệt (WebView2 hiện
 * "Choose File / No file chosen" theo ngôn ngữ Windows). Giữ nguyên thuộc tính của input (accept, multiple, aria-label…).
 */
export function ChonTep({ nhan = "Chọn tệp…", onChange, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { nhan?: string }) {
  const [ten, setTen] = useState("");
  const doi = (e: ChangeEvent<HTMLInputElement>) => {
    const ds = [...(e.target.files ?? [])].map((f) => f.name);
    setTen(ds.length > 1 ? `${ds.length} tệp: ${ds.join(", ")}` : ds[0] ?? "");
    onChange?.(e);
  };
  return (
    <span className={`chon-tep ${className ?? ""}`}>
      <label className={`nut nut-nho ${p.disabled ? "tat" : ""}`} aria-disabled={p.disabled || undefined}>
        {nhan}
        <input type="file" className="an" {...p} onChange={doi} />
      </label>
      <span className="mo chu-nho chon-tep-ten" title={ten}>{ten || "Chưa chọn tệp"}</span>
    </span>
  );
}
