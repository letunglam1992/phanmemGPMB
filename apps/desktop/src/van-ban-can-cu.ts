/**
 * 1.0.5 — danh mục văn bản căn cứ phần mềm đang dùng và quan hệ sửa đổi (chỉ ghi ngày, quan hệ đã có trong văn bản gốc
 * đã lưu ở policy/nguon; ngày nào chưa có văn bản thì để trống). Dùng để nhắc khi văn bản dự thảo dẫn văn bản đã được sửa
 * đổi mà chưa dẫn văn bản sửa đổi, và hiện ở màn Tra cứu.
 */
export interface VanBanCanCu {
  /** Số hiệu, vd. "106/2025/QĐ-UBND" */
  so: string;
  ten: string;
  ngay?: string;
  hieuLucTu?: string;
  /** Văn bản sửa đổi, bổ sung (số hiệu) và ngày có hiệu lực của văn bản sửa đổi */
  suaDoiBoi?: { so: string; hieuLucTu: string; noiDung: string }[];
  nguon: string;
}

export const VAN_BAN_CAN_CU: VanBanCanCu[] = [
  { so: "31/2024/QH15", ten: "Luật Đất đai", nguon: "policy/nguon/luat-dat-dai-vbhn-44-2026.md (VBHN 44/VBHN-VPQH)" },
  { so: "88/2024/NĐ-CP", ten: "Nghị định quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất", ngay: "2024-07-15", suaDoiBoi: [{ so: "226/2025/NĐ-CP", hieuLucTu: "", noiDung: "Sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai" }], nguon: "policy/nguon/nd88-2024-dieu-5-12.md, nd226-2025-sua-nd88.md" },
  { so: "106/2025/QĐ-UBND", ten: "Quyết định của UBND tỉnh Sơn La (Phụ lục I, II, V, VIII)", ngay: "2025-10-06", suaDoiBoi: [{ so: "64/2026/QĐ-UBND", hieuLucTu: "2026-10-06", noiDung: "Sửa Điều 13 Phụ lục I, Điều 14 Phụ lục II" }], nguon: "policy/nguon/qd106-2025-phu-luc-1.md, qd106-2025-phu-luc-2.md" },
  { so: "14/2026/QĐ-UBND", ten: "Quyết định của UBND tỉnh Sơn La", ngay: "2026-03-31", suaDoiBoi: [{ so: "64/2026/QĐ-UBND", hieuLucTu: "2026-10-06", noiDung: "Sửa khoản 11 Điều 6" }], nguon: "policy/nguon/qd14-2026-dieu-3-7.md" },
  { so: "64/2026/QĐ-UBND", ten: "Quyết định sửa đổi, bổ sung QĐ 106/2025/QĐ-UBND và QĐ 14/2026/QĐ-UBND", ngay: "2026-10-06", hieuLucTu: "2026-10-06", nguon: "policy/nguon/qd64-2026-sua-qd106-qd14.md" },
  { so: "152/2025/NQ-HĐND", ten: "Nghị quyết ban hành bảng giá đất", nguon: "policy/nguon/nq152-2025-bang-gia-dat.json" },
  { so: "32/2025/QĐ-UBND", ten: "Quyết định ban hành đơn giá bồi thường nhà, công trình", nguon: "policy/nguon/qd32-2025-don-gia-nha-cong-trinh.json" },
];

const coSo = (chu: string, so: string) => chu.replace(/\s+/g, "").includes(so.replace(/\s+/g, ""));

/**
 * Văn bản dự thảo (ngày ký `ngay`, ISO; trống = hôm nay) dẫn văn bản đã được sửa đổi bởi văn bản có hiệu lực trước ngày
 * ký mà chưa dẫn văn bản sửa đổi → cảnh báo (không tự thêm căn cứ).
 */
export function canhBaoCanCu(canCu: string[], ngay = new Date().toISOString().slice(0, 10)): string[] {
  const chu = canCu.join("\n");
  const out: string[] = [];
  for (const v of VAN_BAN_CAN_CU) {
    if (!coSo(chu, v.so)) continue;
    for (const s of v.suaDoiBoi ?? []) {
      if (s.hieuLucTu && s.hieuLucTu > ngay) continue;
      if (!coSo(chu, s.so)) out.push(`Căn cứ dẫn ${v.so} — văn bản này đã được sửa đổi, bổ sung bởi ${s.so}${s.hieuLucTu ? ` (hiệu lực ${s.hieuLucTu.split("-").reverse().join("/")})` : ""}: ${s.noiDung}. Bổ sung căn cứ nếu nội dung văn bản liên quan (Văn bản → Căn cứ → "Cập nhật căn cứ mặc định").`);
    }
  }
  return out;
}
