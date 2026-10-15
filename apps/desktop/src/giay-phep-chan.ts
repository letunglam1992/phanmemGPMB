/**
 * 1.0.12 — Mã kích hoạt bị chặn (đã cấp lại cho máy mới khi đơn vị thay máy, hoặc lộ mã). Mỗi dòng là SHA-256 (hex,
 * chữ thường) của cả mã GPMB1.… (bỏ khoảng trắng) — lấy từ công cụ cấp mã (tools/giay-phep/cap-ma.html → "Danh sách mã
 * cần chặn"). Chỉ ghi mã băm, không ghi mã hay tên đơn vị. Máy chủ (src-tauri/src/giay_phep.rs) đọc cùng tệp này.
 */
export const MA_CHAN: string[] = [
];
