/**
 * Tình trạng pháp lý nguồn gốc đất của thửa (P2-5) — danh mục có cấu trúc để lọc, thống kê (vd. diện tích thu hồi chưa có
 * giấy tờ). Đây là DỮ KIỆN do cán bộ ghi theo hồ sơ; điều kiện được bồi thường về đất do cán bộ xác định theo Điều 95
 * Luật Đất đai 2024 và văn bản hướng dẫn — phần mềm KHÔNG tự suy ra quyền được bồi thường từ danh mục này.
 * Ô "Nguồn gốc" (chữ) giữ nguyên để diễn giải (nhận chuyển nhượng, Nhà nước giao, thừa kế, thời điểm sử dụng…).
 */
import { D } from "@gpmb/core";
import { khongDau } from "./tim-kiem";
import { laSoMay } from "./so";

export type NhomPhapLy = "GCN" | "GIAY_TO" | "KHONG_GIAY_TO" | "THUE" | "GIAO_KHOAN" | "CONG_ICH" | "VI_PHAM" | "KHAC";

export const NHOM_PHAP_LY: Record<NhomPhapLy, { ten: string; ngan: string }> = {
  GCN: { ten: "Đã được cấp Giấy chứng nhận", ngan: "Có GCN" },
  GIAY_TO: { ten: "Có giấy tờ về quyền sử dụng đất, chưa cấp Giấy chứng nhận", ngan: "Có giấy tờ" },
  KHONG_GIAY_TO: { ten: "Không có giấy tờ, đang sử dụng", ngan: "Không giấy tờ" },
  THUE: { ten: "Đất Nhà nước cho thuê", ngan: "Thuê đất" },
  GIAO_KHOAN: { ten: "Đất nhận giao khoán (nông, lâm trường, ban quản lý rừng…)", ngan: "Giao khoán" },
  CONG_ICH: { ten: "Đất công ích, đất do UBND cấp xã quản lý", ngan: "Công ích / xã quản lý" },
  VI_PHAM: { ten: "Đất lấn, chiếm hoặc sử dụng có vi phạm", ngan: "Lấn chiếm, vi phạm" },
  KHAC: { ten: "Khác (ghi rõ ở ô Nguồn gốc)", ngan: "Khác" },
};
export const THU_TU_PHAP_LY = Object.keys(NHOM_PHAP_LY) as NhomPhapLy[];

/** Nhận nhóm từ chữ (cột Excel, gợi ý) — không chắc thì null. */
export function nhomTuChu(s: string | undefined | null): NhomPhapLy | null {
  const t = khongDau(s ?? "").trim();
  if (!t) return null;
  if (/khong (co )?giay/.test(t)) return "KHONG_GIAY_TO";
  if (/\bgcn\b|giay chung nhan|so do|so hong/.test(t)) return "GCN";
  if (/giay to/.test(t)) return "GIAY_TO";
  if (/giao khoan|nhan khoan/.test(t)) return "GIAO_KHOAN";
  if (/cong ich|xa quan ly|ubnd .*quan ly/.test(t)) return "CONG_ICH";
  if (/lan chiem|lan,? chiem|\bvi pham\b/.test(t)) return "VI_PHAM";
  if (/\bthue\b/.test(t)) return "THUE";
  return null;
}

/** Gợi ý khi thửa chưa phân loại: có số sêri GCN thì gợi ý "Có GCN"; không thì đoán từ chữ nguồn gốc. */
export const goiYPhapLy = (t: { gcn?: { seri?: string }; nguonGoc?: string }): NhomPhapLy | null => (t.gcn?.seri?.trim() ? "GCN" : nhomTuChu(t.nguonGoc));

/** Thống kê số thửa, diện tích thu hồi (Decimal, chuỗi chuẩn máy) theo tình trạng pháp lý (thửa có DT thu hồi > 0). */
export function thongKePhapLy(hos: { thua: { phapLy?: NhomPhapLy; dienTichThuHoi: string }[] }[]): { nhom: NhomPhapLy | "CHUA"; soThua: number; dt: string }[] {
  const m = new Map<NhomPhapLy | "CHUA", { soThua: number; dt: ReturnType<typeof D> }>();
  for (const h of hos)
    for (const t of h.thua) {
      const v = (t.dienTichThuHoi ?? "").trim();
      if (!laSoMay(v) || !D(v).gt(0)) continue;
      const k = t.phapLy ?? "CHUA";
      const x = m.get(k) ?? { soThua: 0, dt: D(0) };
      m.set(k, { soThua: x.soThua + 1, dt: x.dt.plus(v) });
    }
  return [...THU_TU_PHAP_LY, "CHUA" as const].filter((k) => m.has(k)).map((k) => ({ nhom: k, soThua: m.get(k)!.soThua, dt: m.get(k)!.dt.toString() }));
}
