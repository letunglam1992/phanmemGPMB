import { useEffect, useState, type InputHTMLAttributes } from "react";
import { docSoNhap, hienSo, laSoMay } from "../so";

/**
 * Ô nhập số dùng chung (P0-2, QD-25 quy ước Việt Nam): gõ và hiển thị "1.234,5" (dấu chấm phân cách nghìn, dấu phẩy
 * thập phân; "20.000" = hai mươi nghìn); `value` / `onChange` là chuỗi chuẩn máy ("1234.5"). Gõ sai định dạng → viền đỏ,
 * không đổi giá trị đã có (không bao giờ hiểu sai im lặng). `canhBao` (tùy chọn): ngưỡng hợp lý — chỉ nhắc, không chặn.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string | null | undefined;
  onChange: (may: string) => void;
  soLe?: number;
  canhBao?: (may: string) => string | null;
};

export function OSo({ value, onChange, soLe, canhBao, className, title, onBlur, onFocus, ...khac }: Props) {
  const giaTri = value ?? "";
  const [nhap, setNhap] = useState<string | null>(null); // chuỗi đang gõ (null = đang hiển thị giá trị đã lưu)
  const [loi, setLoi] = useState<string | null>(null);
  // Giá trị lưu đổi từ bên ngoài (hoàn tác, tải lại) → bỏ chuỗi đang gõ nếu không còn khớp
  useEffect(() => {
    if (nhap !== null && docSoNhap(nhap).so !== (giaTri || null)) {
      setNhap(null);
      setLoi(null);
    }
  }, [giaTri]); // eslint-disable-line react-hooks/exhaustive-deps

  const cu = giaTri && !laSoMay(giaTri) ? `Giá trị cũ "${giaTri}" chưa đúng định dạng — nhập lại` : null;
  const hienThi = nhap ?? (cu ? giaTri : hienSo(giaTri, soLe));
  const nhac = !loi && !cu && giaTri && canhBao ? canhBao(giaTri) : null;
  const thongBao = loi ?? cu ?? nhac;
  return (
    <input
      {...khac}
      inputMode="decimal"
      className={`o-so ${className ?? ""} ${loi || cu ? "loi-nhap" : nhac ? "nhac-nhap" : ""}`}
      value={hienThi}
      title={thongBao ?? title}
      aria-invalid={!!(loi || cu)}
      onFocus={(e) => {
        if (nhap === null) setNhap(cu ? giaTri : hienSo(giaTri));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const s = e.target.value;
        setNhap(s);
        const r = docSoNhap(s);
        if (!s.trim()) {
          setLoi(null);
          onChange("");
        } else if (r.so !== null) {
          setLoi(null);
          if (r.so !== giaTri) onChange(r.so);
        } else setLoi(r.loi);
      }}
      onBlur={(e) => {
        if (!loi) setNhap(null); // hiển thị lại kiểu Việt Nam; còn lỗi thì giữ chuỗi để sửa
        onBlur?.(e);
      }}
    />
  );
}
