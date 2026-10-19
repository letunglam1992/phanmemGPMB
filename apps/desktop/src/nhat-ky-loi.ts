/**
 * 1.0.20 (C2) — Nhật ký sự cố trên máy: lỗi giao diện (rào lỗi), lỗi không bắt được, lỗi máy chủ (5xx). Lưu cục bộ
 * (localStorage, 300 dòng gần nhất); KHÔNG gửi đi đâu — cán bộ chủ động "Xuất nhật ký lỗi" ra tệp .txt để gửi tác giả khi
 * cần hỗ trợ. Trước khi ghi, chuỗi số dài (số định danh, điện thoại, tài khoản) và địa chỉ thư được che.
 */
import { PHIEN_BAN, MA_BUILD } from "./phien-ban";

export type NguonLoi = "GIAO_DIEN" | "KHONG_BAT" | "MAY_CHU";
export const TEN_NGUON_LOI: Record<NguonLoi, string> = { GIAO_DIEN: "Giao diện", KHONG_BAT: "Thao tác", MAY_CHU: "Máy chủ" };

export interface DongLoi {
  luc: string;
  nguon: NguonLoi;
  thongDiep: string;
  chiTiet?: string;
  phienBan: string;
}

const KHOA = "gpmb-nhat-ky-loi";
export const SO_DONG_TOI_DA = 300;

/** Che chuỗi số từ 8 chữ số trở lên (CCCD, điện thoại, số tài khoản) và địa chỉ thư điện tử. */
export const anDanh = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[thư]").replace(/\d{8,}/g, "[số]");

export function docLoi(): DongLoi[] {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA) ?? "[]") as DongLoi[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function ghiLoi(nguon: NguonLoi, thongDiep: string, chiTiet?: string) {
  try {
    const ds = docLoi();
    const d: DongLoi = { luc: new Date().toISOString(), nguon, thongDiep: anDanh(thongDiep).slice(0, 500), phienBan: PHIEN_BAN, ...(chiTiet ? { chiTiet: anDanh(chiTiet).slice(0, 2000) } : {}) };
    // cùng một lỗi lặp liên tục (vẽ lại) trong 5 giây → chỉ ghi một lần
    const cuoi = ds.at(-1);
    if (cuoi && cuoi.thongDiep === d.thongDiep && Date.parse(d.luc) - Date.parse(cuoi.luc) < 5000) return;
    ds.push(d);
    localStorage.setItem(KHOA, JSON.stringify(ds.slice(-SO_DONG_TOI_DA)));
  } catch {
    /* bộ nhớ đầy / bị chặn: không làm hỏng thao tác chính */
  }
}

export function xoaLoi() {
  try {
    localStorage.removeItem(KHOA);
  } catch {
    /* bỏ qua */
  }
}

let daCai = false;
/** Bắt lỗi chung của cửa sổ (gọi một lần khi khởi động). */
export function caiBatLoi() {
  if (daCai || typeof window === "undefined") return;
  daCai = true;
  window.addEventListener("error", (e) => {
    if (!e.message) return; // lỗi tải tài nguyên
    ghiLoi("KHONG_BAT", e.message, (e.error as Error | undefined)?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as Error | undefined;
    ghiLoi("KHONG_BAT", String(r?.message ?? r), r?.stack);
  });
}

/** Nội dung tệp nhật ký lỗi để gửi tác giả: thông tin phiên bản, chế độ chạy, lỗi trên máy và lỗi máy chủ (nếu đọc được). */
export function taoTepNhatKy(o: { cheDo: string; mayChu?: string[] | string; homNay?: Date }): string {
  const ds = docLoi();
  const dong = [
    "NHẬT KÝ SỰ CỐ — PHẦN MỀM GPMB SƠN LA",
    `Phiên bản: ${PHIEN_BAN}${MA_BUILD ? ` (mã ${MA_BUILD})` : ""}`,
    `Xuất lúc: ${(o.homNay ?? new Date()).toISOString()}`,
    `Chế độ: ${o.cheDo}`,
    `Trình duyệt / WebView: ${typeof navigator !== "undefined" ? navigator.userAgent : ""}`,
    "Ghi chú: chỉ gồm thông điệp lỗi kỹ thuật; số định danh, điện thoại, thư điện tử đã được che. Không có dữ liệu hồ sơ.",
    "",
    `=== Lỗi trên máy này (${ds.length}) ===`,
    ...ds.flatMap((d) => [`[${d.luc}] [${TEN_NGUON_LOI[d.nguon]}] [${d.phienBan}] ${d.thongDiep}`, ...(d.chiTiet ? d.chiTiet.split("\n").slice(0, 12).map((x) => `    ${x}`) : [])]),
  ];
  if (o.mayChu !== undefined) {
    dong.push("", "=== Lỗi nội bộ gần đây của máy chủ ===");
    if (typeof o.mayChu === "string") dong.push(o.mayChu);
    else dong.push(...(o.mayChu.length ? o.mayChu.map(anDanh) : ["(không có)"]));
  }
  return dong.join("\r\n") + "\r\n";
}
