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

/**
 * 1.3.1 (B3) — Chặn mềm khi tạo văn bản thuộc nhiệm vụ phân cấp mà ngày ký ngoài thời gian hiệu lực của văn bản phân cấp đang
 * áp dụng: trả nội dung hỏi xác nhận (null = không cần hỏi). Phần mềm không tự đổi thẩm quyền, người ký.
 */
export function xacNhanThamQuyen(ma: string, ngay?: string): string | null {
  const cb = canhBaoThamQuyen(ma, ngay);
  if (!cb.length) return null;
  return `${cb.join("\n")}\n\nVẫn tạo văn bản? (Người ký chịu trách nhiệm về thẩm quyền; nếu đã có văn bản phân cấp thay thế, cập nhật ở Cài đặt chung → Thẩm quyền phân cấp hoặc nạp tệp cấu hình do Sở gửi.)`;
}

/** 1.3.1 (B2) — Tệp cấu hình văn bản phân cấp (Sở lập một lần, các xã nạp — không phải gõ lại từng máy). */
export const DINH_DANG_TQ = "gpmb-tham-quyen-phan-cap";
export const DUOI_TEP_TQ = ".gpmbtq";

export function tepCauHinhThamQuyen(c: CauHinhThamQuyen, nguoiLap: string, luc = new Date().toISOString()): string {
  const { nguoi: _n, luc: _l, ...cauHinh } = c;
  return JSON.stringify({ dinhDang: DINH_DANG_TQ, phienBan: 1, nguoiLap, luc, cauHinh }, null, 2);
}

const laNgay = (x: unknown) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);

/** Đọc, kiểm tra tệp cấu hình; sai dạng → ném lỗi có nội dung rõ (không nạp một phần). */
export function docTepCauHinhThamQuyen(chu: string): { cauHinh: CauHinhThamQuyen; nguoiLap: string; luc: string } {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(chu) as Record<string, unknown>;
  } catch {
    throw new Error("Tệp không đọc được (không phải tệp cấu hình thẩm quyền).");
  }
  if (o?.dinhDang !== DINH_DANG_TQ) throw new Error("Không phải tệp cấu hình thẩm quyền phân cấp của phần mềm.");
  if (o.phienBan !== 1) throw new Error("Tệp cấu hình được tạo bởi phiên bản phần mềm mới hơn — cập nhật phần mềm rồi nạp lại.");
  const c = o.cauHinh as Partial<CauHinhThamQuyen> | undefined;
  if (!c || typeof c.so !== "string" || typeof c.ten !== "string" || !laNgay(c.hieuLucTu) || (c.hetHieuLucTu !== "" && !laNgay(c.hetHieuLucTu)) || typeof c.baoCao06Thang !== "boolean" || !Array.isArray(c.nhiemVu) || !c.nhiemVu.length)
    throw new Error("Tệp cấu hình thiếu hoặc sai trường (số, trích yếu, ngày hiệu lực, danh sách nhiệm vụ).");
  const ma = new Set<string>();
  for (const n of c.nhiemVu) {
    if (!n || typeof n.ma !== "string" || !n.ma || typeof n.noiDung !== "string" || typeof n.viTri !== "string" || !Array.isArray(n.mau) || n.mau.some((m) => typeof m !== "string"))
      throw new Error("Danh sách nhiệm vụ trong tệp sai dạng.");
    if (ma.has(n.ma)) throw new Error(`Mã nhiệm vụ ${n.ma} bị lặp trong tệp.`);
    ma.add(n.ma);
  }
  const cauHinh: CauHinhThamQuyen = { so: c.so, ten: c.ten, hieuLucTu: c.hieuLucTu!, hetHieuLucTu: c.hetHieuLucTu ?? "", baoCao06Thang: c.baoCao06Thang, nhiemVu: c.nhiemVu.map((n) => ({ ma: n.ma, noiDung: n.noiDung, viTri: n.viTri, mau: [...n.mau] })) };
  const loi = loiCauHinh(cauHinh);
  if (loi) throw new Error(`Tệp cấu hình chưa hợp lệ: ${loi}.`);
  return { cauHinh, nguoiLap: typeof o.nguoiLap === "string" ? o.nguoiLap : "", luc: typeof o.luc === "string" ? o.luc : "" };
}
