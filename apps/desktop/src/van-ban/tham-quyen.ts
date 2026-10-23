/**
 * 1.2.0 (E1), 1.3.0 (A3) — Văn bản phân cấp thẩm quyền đang áp dụng. Mặc định QĐ 27/2026/QĐ-UBND ngày 30/6/2026 của UBND tỉnh Sơn
 * La (phân cấp cho Chủ tịch UBND cấp xã một số nhiệm vụ thuộc thẩm quyền UBND tỉnh theo khoản 1 Điều 14 NĐ 49/2026/NĐ-CP — Phụ lục
 * II; hiệu lực 30/6/2026, hết hiệu lực từ 01/3/2027 — khoản 1 Điều 6). Khi có văn bản thay thế, đơn vị nhập ở Cài đặt → Thẩm
 * quyền phân cấp (số, hiệu lực, vị trí từng nhiệm vụ) — phần mềm không tự suy ra. Chỉ ghi mẫu có nội dung nêu đúng trong văn bản;
 * QĐ kiểm đếm bắt buộc, QĐ cưỡng chế, Ban cưỡng chế thu hồi đất không có trong QĐ 27 — giữ căn cứ Điều 5 NĐ 151/2025/NĐ-CP.
 * Nguyên văn: policy/nguon/qd27-2026-phan-cap-uy-quyen-dat-dai.md.
 */
export interface NhiemVuPhanCap {
  /** Mã nhiệm vụ (dùng thống kê, gói tỉnh) */
  ma: string;
  noiDung: string;
  /** Vị trí trong văn bản phân cấp đang áp dụng */
  viTri: string;
  /** Mẫu văn bản của phần mềm thuộc nhiệm vụ này */
  mau: string[];
}

export interface CauHinhThamQuyen {
  so: string;
  /** Trích yếu (để hiện, dẫn căn cứ) */
  ten: string;
  hieuLucTu: string;
  /** Ngày hết hiệu lực (ISO); trống = không thời hạn */
  hetHieuLucTu: string;
  /** Có nghĩa vụ báo cáo định kỳ 06 tháng (khoản 2 Điều 4 QĐ 27/2026) */
  baoCao06Thang: boolean;
  nhiemVu: NhiemVuPhanCap[];
  /** Người, lúc cập nhật (cấu hình do đơn vị nhập) */
  nguoi?: string;
  luc?: string;
}

export const KHOA_THAM_QUYEN = "thamQuyenPhanCap";

export const QD27_MAC_DINH: CauHinhThamQuyen = {
  so: "27/2026/QĐ-UBND",
  ten: "Quyết định phân cấp, ủy quyền thực hiện một số nhiệm vụ thuộc thẩm quyền của Ủy ban nhân dân tỉnh trong lĩnh vực quản lý đất đai trên địa bàn tỉnh Sơn La",
  hieuLucTu: "2026-06-30",
  hetHieuLucTu: "2027-03-01",
  baoCao06Thang: true,
  nhiemVu: [
    { ma: "THU_HOI", noiDung: "Quyết định thu hồi đất (Điều 78, 79 Luật Đất đai)", viTri: "khoản 1, 2 mục I Phụ lục II", mau: ["15", "R3", "T7"] },
    { ma: "KE_HOACH", noiDung: "Phê duyệt, điều chỉnh kế hoạch thu hồi đất", viTri: "khoản 5 mục I Phụ lục II", mau: ["T1"] },
    { ma: "THONG_BAO", noiDung: "Ban hành Thông báo thu hồi đất", viTri: "khoản 6 mục I Phụ lục II", mau: ["01", "T3"] },
    { ma: "PA_CUONG_CHE", noiDung: "Phê duyệt phương án cưỡng chế quyết định thu hồi đất và kinh phí cho hoạt động cưỡng chế", viTri: "khoản 7 mục I Phụ lục II", mau: ["T17"] },
    { ma: "HOI_DONG", noiDung: "Quyết định thành lập Hội đồng bồi thường, hỗ trợ, tái định cư đối với từng dự án", viTri: "khoản 1 mục II Phụ lục II", mau: ["T29"] },
    { ma: "BAN_CC_KD", noiDung: "Quyết định thành lập Ban cưỡng chế kiểm đếm bắt buộc", viTri: "khoản 2 mục II Phụ lục II", mau: ["T30"] },
    { ma: "PHE_DUYET_PA", noiDung: "Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư", viTri: "khoản 3 mục II Phụ lục II", mau: ["14", "T5", "T26", "R5"] },
    { ma: "GIA_BAN_TDC", noiDung: "Quyết định giá bán nhà ở tái định cư trong địa bàn cấp xã", viTri: "khoản 4 mục II Phụ lục II", mau: ["T31"] },
  ],
};

let hienHanh: CauHinhThamQuyen = QD27_MAC_DINH;
/** Áp dụng cấu hình (null = mặc định QĐ 27/2026). Gọi `apDungThamQuyenMau()` (danh-muc) để cập nhật mô tả mẫu. */
export function datCauHinhThamQuyen(c: CauHinhThamQuyen | null | undefined) {
  hienHanh = c && c.so && c.nhiemVu?.length ? c : QD27_MAC_DINH;
}
export const cauHinhThamQuyen = () => hienHanh;

/** Lỗi nhập cấu hình (null = hợp lệ). */
export function loiCauHinh(c: CauHinhThamQuyen): string | null {
  if (!c.so.trim()) return "Chưa nhập số văn bản phân cấp";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.hieuLucTu)) return "Chưa nhập ngày có hiệu lực";
  if (c.hetHieuLucTu && c.hetHieuLucTu <= c.hieuLucTu) return "Ngày hết hiệu lực phải sau ngày có hiệu lực";
  if (c.nhiemVu.some((n) => n.mau.length && !n.viTri.trim())) return "Nhiệm vụ có mẫu văn bản phải ghi vị trí trong văn bản (khoản, mục, phụ lục) — để trống mẫu nếu văn bản mới không phân cấp nhiệm vụ đó";
  return null;
}

/** Mã mẫu → nhiệm vụ phân cấp (theo cấu hình hiện hành). */
export const nhiemVuCuaMau = (ma: string) => hienHanh.nhiemVu.find((n) => n.mau.includes(ma));

/** Tương thích 1.2.0: mã mẫu → vị trí, nội dung */
export const THAM_QUYEN_QD27: Record<string, { viTri: string; noiDung: string }> = Object.fromEntries(
  QD27_MAC_DINH.nhiemVu.flatMap((n) => n.mau.map((m) => [m, { viTri: n.viTri, noiDung: n.noiDung }])),
);
export const QD27 = { so: QD27_MAC_DINH.so, hieuLucTu: QD27_MAC_DINH.hieuLucTu, hetHieuLucTu: QD27_MAC_DINH.hetHieuLucTu } as const;

const vn = (iso: string) => iso.split("-").reverse().join("/");

export const DAU_GHI_CHU_TQ = "Thẩm quyền: Chủ tịch UBND cấp xã — ";
/** Ghi chú thẩm quyền của mẫu (để nối vào mô tả mẫu). */
export const ghiChuThamQuyen = (ma: string): string | undefined => {
  const t = nhiemVuCuaMau(ma);
  const c = hienHanh;
  return t ? `${DAU_GHI_CHU_TQ}${t.viTri} QĐ ${c.so} (${t.noiDung}; hiệu lực ${vn(c.hieuLucTu)}${c.hetHieuLucTu ? ` đến trước ${vn(c.hetHieuLucTu)}` : ""}).` : undefined;
};

/** Ngày ký (ISO) ngoài thời gian hiệu lực của văn bản phân cấp → cảnh báo kiểm tra thẩm quyền (không tự đổi người ký). */
export function canhBaoThamQuyen(ma: string, ngay?: string): string[] {
  const t = nhiemVuCuaMau(ma);
  const c = hienHanh;
  if (!t || !ngay) return [];
  if (ngay < c.hieuLucTu) return [`Ngày ký ${vn(ngay)} trước ngày QĐ ${c.so} có hiệu lực (${vn(c.hieuLucTu)}): hồ sơ đang giải quyết trước ngày đó tiếp tục giải quyết theo thẩm quyền tại thời điểm tiếp nhận hồ sơ${c.so === QD27_MAC_DINH.so ? ` (khoản 1 Điều 5 QĐ ${c.so})` : ""}.`];
  if (c.hetHieuLucTu && ngay >= c.hetHieuLucTu) return [`Ngày ký ${vn(ngay)}: QĐ ${c.so} hết hiệu lực từ ${vn(c.hetHieuLucTu)}${c.so === QD27_MAC_DINH.so ? " (khoản 1 Điều 6)" : ""} — kiểm tra văn bản phân cấp thay thế trước khi ký (${t.noiDung}); cập nhật ở Cài đặt → Thẩm quyền phân cấp.`];
  return [];
}

/**
 * 1.3.0 (A1) — Hạn báo cáo định kỳ 06 tháng kết quả thực hiện nhiệm vụ được phân cấp (khoản 2 Điều 4 QĐ 27/2026: trước ngày 15/6 và
 * 15/12 hằng năm). Trả hạn gần nhất từ hôm nay (hạn = ngày 15; "trước ngày 15" → gửi chậm nhất ngày 14) và kỳ số liệu mặc định (từ
 * sau hạn trước đến trước hạn này — đơn vị sửa được). null nếu văn bản đang áp dụng không có nghĩa vụ này hoặc đã hết hiệu lực.
 */
export function hanBaoCaoPhanCap(homNay: string): { han: string; tu: string; den: string } | null {
  const c = hienHanh;
  if (!c.baoCao06Thang) return null;
  const y = Number(homNay.slice(0, 4));
  const cacHan = [`${y - 1}-12-15`, `${y}-06-15`, `${y}-12-15`, `${y + 1}-06-15`];
  const i = cacHan.findIndex((h) => h > homNay);
  const han = cacHan[i]!;
  if (c.hetHieuLucTu && han > c.hetHieuLucTu) return null;
  const truoc = cacHan[i - 1]!;
  const tu = truoc < c.hieuLucTu ? c.hieuLucTu : truoc;
  const d = new Date(`${han}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return { han, tu, den: d.toISOString().slice(0, 10) };
}
