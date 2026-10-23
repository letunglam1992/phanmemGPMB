/**
 * 1.2.0 (E1) — Thẩm quyền theo QĐ 27/2026/QĐ-UBND ngày 30/6/2026 của UBND tỉnh Sơn La (phân cấp cho Chủ tịch UBND cấp xã một số
 * nhiệm vụ thuộc thẩm quyền UBND tỉnh theo khoản 1 Điều 14 NĐ 49/2026/NĐ-CP — Phụ lục II). Hiệu lực 30/6/2026, hết hiệu lực từ
 * 01/3/2027 (khoản 1 Điều 6). Chỉ ghi các mẫu có nội dung nêu đúng trong Phụ lục II; QĐ kiểm đếm bắt buộc, QĐ cưỡng chế, Ban
 * cưỡng chế thu hồi đất không có trong QĐ 27 — giữ căn cứ Điều 5 NĐ 151/2025/NĐ-CP. Nguyên văn: policy/nguon/qd27-2026-phan-cap-uy-quyen-dat-dai.md.
 */
export const QD27 = { so: "27/2026/QĐ-UBND", hieuLucTu: "2026-06-30", hetHieuLucTu: "2027-03-01" } as const;

/** Mã mẫu → vị trí trong Phụ lục II QĐ 27/2026 và nội dung phân cấp (trích). */
export const THAM_QUYEN_QD27: Record<string, { viTri: string; noiDung: string }> = {
  T1: { viTri: "khoản 5 mục I Phụ lục II", noiDung: "Phê duyệt, điều chỉnh kế hoạch thu hồi đất" },
  "01": { viTri: "khoản 6 mục I Phụ lục II", noiDung: "Ban hành Thông báo thu hồi đất" },
  T3: { viTri: "khoản 6 mục I Phụ lục II", noiDung: "Ban hành Thông báo thu hồi đất" },
  "15": { viTri: "khoản 1, 2 mục I Phụ lục II", noiDung: "Quyết định thu hồi đất (Điều 78, 79 Luật Đất đai)" },
  R3: { viTri: "khoản 1, 2 mục I Phụ lục II", noiDung: "Quyết định thu hồi đất (Điều 78, 79 Luật Đất đai)" },
  "14": { viTri: "khoản 3 mục II Phụ lục II", noiDung: "Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư" },
  T5: { viTri: "khoản 3 mục II Phụ lục II", noiDung: "Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư" },
  T26: { viTri: "khoản 3 mục II Phụ lục II", noiDung: "Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư" },
  R5: { viTri: "khoản 3 mục II Phụ lục II", noiDung: "Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư" },
  T17: { viTri: "khoản 7 mục I Phụ lục II", noiDung: "Phê duyệt phương án cưỡng chế quyết định thu hồi đất và kinh phí cho hoạt động cưỡng chế" },
};

const vn = (iso: string) => iso.split("-").reverse().join("/");

/** Ghi chú thẩm quyền của mẫu (để nối vào mô tả mẫu). */
export const ghiChuThamQuyen = (ma: string): string | undefined => {
  const t = THAM_QUYEN_QD27[ma];
  return t ? `Thẩm quyền: Chủ tịch UBND cấp xã — ${t.viTri} QĐ ${QD27.so} (${t.noiDung}; hiệu lực ${vn(QD27.hieuLucTu)} đến trước ${vn(QD27.hetHieuLucTu)}).` : undefined;
};

/** Ngày ký (ISO) ngoài thời gian hiệu lực của QĐ 27/2026 → cảnh báo kiểm tra thẩm quyền (không tự đổi người ký). */
export function canhBaoThamQuyen(ma: string, ngay?: string): string[] {
  const t = THAM_QUYEN_QD27[ma];
  if (!t || !ngay) return [];
  if (ngay < QD27.hieuLucTu) return [`Ngày ký ${vn(ngay)} trước ngày QĐ ${QD27.so} có hiệu lực (${vn(QD27.hieuLucTu)}): hồ sơ đang giải quyết trước ngày đó tiếp tục giải quyết theo thẩm quyền tại thời điểm tiếp nhận hồ sơ (khoản 1 Điều 5 QĐ ${QD27.so}).`];
  if (ngay >= QD27.hetHieuLucTu) return [`Ngày ký ${vn(ngay)}: QĐ ${QD27.so} hết hiệu lực từ ${vn(QD27.hetHieuLucTu)} (khoản 1 Điều 6) — kiểm tra văn bản phân cấp thay thế trước khi ký (${t.noiDung}).`];
  return [];
}
