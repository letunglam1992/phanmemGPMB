/**
 * 1.0.19 (B3) — Nhắc cất bản sao lưu ra thiết bị khác (USB, ổ cứng ngoài, ổ mạng nội bộ). Bản sao lưu tự động nằm cùng
 * ổ đĩa với dữ liệu không giữ được dữ liệu khi hỏng máy, mất máy. Phần mềm ghi nhận "đã cất ra ngoài" khi:
 * - tệp sao lưu (thủ công hoặc tự động) được ghi vào ổ khác ổ mặc định (khác ký tự ổ đĩa, hoặc đường dẫn mạng \\máy\...);
 * - hoặc cán bộ xác nhận đã chép tệp ra thiết bị khác.
 * Chu kỳ nhắc do đơn vị đặt (Cài đặt chung → Tự động sao lưu, mặc định 7 ngày như nhắc sao lưu trước đây).
 * Ghi theo máy (localStorage) — mỗi máy tự sao lưu dữ liệu của mình.
 */
export const NHAC_NGOAI_MAC_DINH = 7;
const KHOA = "gpmb-cat-ngoai";

export interface LanCatNgoai {
  luc: string;
  /** Đường dẫn tệp, hoặc "Cán bộ xác nhận đã chép ra thiết bị khác" */
  noi: string;
}

/** Ổ đĩa của đường dẫn Windows: "C:" / "\\\\may\\chia-se" (đường dẫn mạng); không xác định → null. */
export function oCua(duongDan: string): string | null {
  const p = duongDan.trim().replace(/\//g, "\\");
  const unc = /^\\\\([^\\]+)\\([^\\]+)/.exec(p);
  if (unc) return `\\\\${unc[1]!.toLowerCase()}\\${unc[2]!.toLowerCase()}`;
  const o = /^([a-zA-Z]):/.exec(p);
  return o ? `${o[1]!.toUpperCase()}:` : null;
}

/** Tệp ở thiết bị khác với thư mục mặc định (ổ dữ liệu)? null = không xác định được (vd. bản chạy trên trình duyệt). */
export function laNoiNgoai(tep: string, thuMucMacDinh: string): boolean | null {
  const a = oCua(tep), b = oCua(thuMucMacDinh);
  if (!a || !b) return null;
  return a !== b;
}

export function docCatNgoai(): LanCatNgoai | null {
  try {
    const s = localStorage.getItem(KHOA);
    return s ? (JSON.parse(s) as LanCatNgoai) : null;
  } catch {
    return null;
  }
}
export function ghiCatNgoai(x: LanCatNgoai) {
  try {
    localStorage.setItem(KHOA, JSON.stringify(x));
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua */
  }
}

/** Nhắc khi đã có dữ liệu mà chưa từng cất ra ngoài, hoặc quá `soNgay` ngày kể từ lần cuối. */
export function canhBaoCatNgoai(lan: LanCatNgoai | null, homNay: string, coDuLieu: boolean, soNgay = NHAC_NGOAI_MAC_DINH): string | null {
  if (!coDuLieu) return null;
  if (!lan) return "Chưa cất bản sao lưu ra thiết bị khác (USB, ổ cứng ngoài, ổ mạng nội bộ) — hỏng hoặc mất máy sẽ mất dữ liệu.";
  const cach = Math.floor((Date.parse(homNay) - Date.parse(lan.luc.slice(0, 10))) / 86400000);
  return cach > soNgay ? `Đã ${cach} ngày chưa cất bản sao lưu ra thiết bị khác (lần cuối ${lan.luc.slice(8, 10)}/${lan.luc.slice(5, 7)}/${lan.luc.slice(0, 4)}; nhắc sau ${soNgay} ngày).` : null;
}
