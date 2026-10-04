/**
 * Hỏi đáp qua Gemini API (Google): người dùng tự tạo khóa API và dán vào phần mềm. Chỉ gửi câu hỏi (đã che số giấy tờ,
 * số điện thoại) và các đoạn văn bản pháp lý / tài liệu nghiệp vụ liên quan tìm được trên máy; tùy chọn kèm số liệu tổng
 * hợp của dự án (không có tên, số giấy tờ). Không gửi hồ sơ, tệp, bản đồ. Bản cài: gọi qua vỏ Rust (`goi_gemini`), khóa
 * lưu trên máy được mã hóa bằng tài khoản Windows (DPAPI).
 */
import { coVoWindows, dpapiBoc, dpapiMo } from "../tu-dong-sao-luu";
import type { KetQuaTim } from "./tim-kiem";

export const MO_HINH_MAC_DINH = "gemini-2.5-flash";
const KHOA_LUU = "gpmb-gemini";
export interface CaiDatGemini {
  /** Khóa API: bản cài lưu dạng mã hóa DPAPI (base64), trình duyệt lưu nguyên */
  khoa: string;
  maHoa?: boolean;
  moHinh: string;
  /** Người dùng đã đọc, đồng ý điều kiện gửi dữ liệu ra ngoài */
  dongY?: boolean;
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function docCaiDatGemini(): CaiDatGemini {
  try {
    return { khoa: "", moHinh: MO_HINH_MAC_DINH, ...(JSON.parse(localStorage.getItem(KHOA_LUU) ?? "{}") as Partial<CaiDatGemini>) };
  } catch {
    return { khoa: "", moHinh: MO_HINH_MAC_DINH };
  }
}
export async function luuCaiDatGemini(c: { khoaRo?: string; moHinh?: string; dongY?: boolean; xoaKhoa?: boolean }) {
  const cu = docCaiDatGemini();
  const moi: CaiDatGemini = { ...cu, ...(c.moHinh ? { moHinh: c.moHinh.trim() } : {}), ...(c.dongY !== undefined ? { dongY: c.dongY } : {}) };
  if (c.xoaKhoa) Object.assign(moi, { khoa: "", maHoa: false });
  else if (c.khoaRo !== undefined) {
    const k = c.khoaRo.trim();
    if (coVoWindows()) Object.assign(moi, { khoa: b64(await dpapiBoc(new TextEncoder().encode(k))), maHoa: true });
    else Object.assign(moi, { khoa: k, maHoa: false });
  }
  localStorage.setItem(KHOA_LUU, JSON.stringify(moi));
  return moi;
}
async function khoaRo(c: CaiDatGemini): Promise<string> {
  if (!c.khoa) throw new Error("Chưa nhập khóa API Gemini");
  return c.maHoa ? new TextDecoder().decode(await dpapiMo(tuB64(c.khoa))) : c.khoa;
}

/** Che số giấy tờ (CCCD/CMND 9–12 số), số điện thoại, số tài khoản trước khi gửi ra ngoài. */
export const cheSo = (s: string) => s.replace(/\b0\d{9,10}\b/g, "[số điện thoại đã ẩn]").replace(/\b\d{9,16}\b/g, "[số đã ẩn]");

async function goi(khoa: string, duongDan: string, than?: unknown): Promise<{ ma: number; noi_dung: string }> {
  if (coVoWindows()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("goi_gemini", { khoa, duongDan, than: than === undefined ? null : JSON.stringify(than) });
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${duongDan}`, {
    method: than === undefined ? "GET" : "POST",
    headers: { "x-goog-api-key": khoa, ...(than === undefined ? {} : { "content-type": "application/json" }) },
    body: than === undefined ? undefined : JSON.stringify(than),
  });
  return { ma: r.status, noi_dung: await r.text() };
}
function loiApi(ma: number, noiDung: string): Error {
  let tb = "";
  try { tb = (JSON.parse(noiDung) as { error?: { message?: string } }).error?.message ?? ""; } catch { /* không phải JSON */ }
  if (ma === 400 && /api key/i.test(tb)) return new Error("Khóa API không hợp lệ — kiểm tra lại khóa đã dán (xem hướng dẫn tạo khóa)");
  if (ma === 403) return new Error(`Khóa API không có quyền dùng Gemini API (${tb || "403"}) — kiểm tra khóa trong Google AI Studio`);
  if (ma === 404) return new Error(`Không có mô hình này (${tb || "404"}) — bấm "Kiểm tra khóa" để chọn mô hình có sẵn`);
  if (ma === 429) return new Error("Đã vượt hạn mức miễn phí/giới hạn số lần gọi — đợi một lúc rồi hỏi lại");
  return new Error(`Gemini API trả lỗi ${ma}${tb ? `: ${tb}` : ""}`);
}

/** Kiểm tra khóa: trả danh sách mô hình dùng được cho generateContent. */
export async function kiemTraKhoa(c: CaiDatGemini): Promise<string[]> {
  const r = await goi(await khoaRo(c), "models");
  if (r.ma !== 200) throw loiApi(r.ma, r.noi_dung);
  const ds = (JSON.parse(r.noi_dung) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models ?? [];
  return ds.filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, "")).filter((m) => /gemini/i.test(m));
}

export const HUONG_DAN_HE_THONG = [
  "Bạn là trợ lý nghiệp vụ bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất tại tỉnh Sơn La, Việt Nam.",
  "Trả lời bằng tiếng Việt, ngắn gọn, chính xác, văn phong hành chính.",
  "Chỉ dựa vào các ĐOẠN TRÍCH được cung cấp (văn bản pháp luật nguyên văn, tài liệu nghiệp vụ của phần mềm) và số liệu tổng hợp nếu có.",
  "Khi nêu căn cứ phải trích đúng Điều, khoản, điểm và tên văn bản như trong đoạn trích; ghi rõ [nguồn số] tương ứng.",
  "Không tự đặt ra điều kiện, mức giá, tỷ lệ, mức hỗ trợ. Nếu đoạn trích không đủ để trả lời, nói rõ \"Thiếu căn cứ trong tài liệu có sẵn\" và gợi ý văn bản cần tra.",
  "Phần mềm và câu trả lời chỉ hỗ trợ — cán bộ có thẩm quyền kiểm tra, quyết định.",
].join("\n");

/** Nội dung gửi Gemini: hướng dẫn hệ thống + đoạn trích đánh số + (tùy chọn) số liệu tổng hợp + câu hỏi đã che số. */
export function taoYeuCau(cauHoi: string, doan: KetQuaTim[], soLieu?: string, lichSu: { hoi: string; dap: string }[] = []) {
  const ngucanh = doan.map((x, i) => `[${i + 1}] ${x.doan.nguon} — ${x.doan.tieuDe}\n${x.doan.noiDung}`).join("\n\n");
  const hoiThoai = lichSu.slice(-3).flatMap((x) => [{ role: "user", parts: [{ text: cheSo(x.hoi) }] }, { role: "model", parts: [{ text: x.dap }] }]);
  return {
    systemInstruction: { parts: [{ text: HUONG_DAN_HE_THONG }] },
    contents: [
      ...hoiThoai,
      { role: "user", parts: [{ text: `ĐOẠN TRÍCH:\n${ngucanh || "(không tìm thấy đoạn liên quan)"}${soLieu ? `\n\nSỐ LIỆU TỔNG HỢP CỦA DỰ ÁN (không có thông tin cá nhân):\n${soLieu}` : ""}\n\nCÂU HỎI: ${cheSo(cauHoi)}` }] },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  };
}

export async function hoiGemini(c: CaiDatGemini, yeuCau: ReturnType<typeof taoYeuCau>): Promise<string> {
  const r = await goi(await khoaRo(c), `models/${c.moHinh || MO_HINH_MAC_DINH}:generateContent`, yeuCau);
  if (r.ma !== 200) throw loiApi(r.ma, r.noi_dung);
  const j = JSON.parse(r.noi_dung) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
  if (j.promptFeedback?.blockReason) throw new Error(`Gemini từ chối câu hỏi (${j.promptFeedback.blockReason})`);
  const t = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!t) throw new Error(`Gemini không trả lời (${j.candidates?.[0]?.finishReason ?? "không rõ lý do"})`);
  return t;
}
