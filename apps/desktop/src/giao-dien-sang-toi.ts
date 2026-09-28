/** Giao diện sáng/tối theo từng máy (lưu trình duyệt; mặc định theo hệ điều hành). */
export type GiaoDien = "sang" | "toi";
const KHOA = "gpmb-giao-dien";

export function docGiaoDien(): GiaoDien {
  try {
    const v = localStorage.getItem(KHOA);
    if (v === "sang" || v === "toi") return v;
  } catch {
    /* bỏ qua */
  }
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "toi" : "sang";
}

export function apDungGiaoDien(g: GiaoDien) {
  document.documentElement.setAttribute("data-theme", g === "toi" ? "dark" : "light");
}

export function ghiGiaoDien(g: GiaoDien) {
  apDungGiaoDien(g);
  try {
    localStorage.setItem(KHOA, g);
  } catch {
    /* bỏ qua */
  }
}
