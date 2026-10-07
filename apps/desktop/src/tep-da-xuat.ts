/**
 * 1.0.2 — danh sách tệp đã xuất gần đây (giống nút tải về của trình duyệt): tên, đường dẫn, thời điểm. Lưu theo máy
 * (localStorage, tối đa 30 tệp); vỏ desktop mở tệp / mở thư mục chứa tệp bằng lệnh Rust `mo_tep_da_xuat`, `mo_noi_luu_tep`
 * (chỉ nhận loại tệp phần mềm xuất ra). Không gửi đi đâu.
 */
export interface TepDaXuat {
  ten: string;
  /** Đường dẫn tuyệt đối (vỏ desktop); trình duyệt chỉ có tên tệp */
  duongDan: string;
  luc: string;
}

const KHOA = "gpmb-tep-da-xuat";
const TOI_DA = 30;
export const SU_KIEN = "gpmb-tep-da-xuat";

export function dsTepDaXuat(): TepDaXuat[] {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA) ?? "[]") as TepDaXuat[];
    return Array.isArray(v) ? v.filter((x) => x && typeof x.ten === "string" && typeof x.duongDan === "string") : [];
  } catch {
    return [];
  }
}

/** Ghi một tệp vừa xuất lên đầu danh sách (bỏ bản trùng đường dẫn) và báo cho thanh tiêu đề. */
export function ghiTepDaXuat(duongDan: string, luc = new Date().toISOString()): TepDaXuat[] {
  const ten = duongDan.split(/[\\/]/).pop() || duongDan;
  const ds = [{ ten, duongDan, luc }, ...dsTepDaXuat().filter((x) => x.duongDan !== duongDan)].slice(0, TOI_DA);
  try {
    localStorage.setItem(KHOA, JSON.stringify(ds));
  } catch {
    /* trình duyệt chặn lưu trữ: chỉ giữ trong phiên qua sự kiện */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SU_KIEN, { detail: ds }));
  return ds;
}

export function xoaDsTepDaXuat() {
  try {
    localStorage.removeItem(KHOA);
  } catch {
    /* bỏ qua */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SU_KIEN, { detail: [] }));
}

/** Có đường dẫn đầy đủ (mở được trên máy) — bản trình duyệt chỉ có tên. */
export const coDuongDan = (x: TepDaXuat) => /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(x.duongDan);
export const thuMucCua = (x: TepDaXuat) => x.duongDan.slice(0, Math.max(x.duongDan.lastIndexOf("\\"), x.duongDan.lastIndexOf("/"))) || "";

async function goi(lenh: "mo_tep_da_xuat" | "mo_noi_luu_tep", x: TepDaXuat) {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(lenh, { duongDan: x.duongDan });
}
export const moTep = (x: TepDaXuat) => goi("mo_tep_da_xuat", x);
export const moNoiLuu = (x: TepDaXuat) => goi("mo_noi_luu_tep", x);
export const laBanCai = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
