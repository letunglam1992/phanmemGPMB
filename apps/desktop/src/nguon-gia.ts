/**
 * 1.3.2 (A3) — ghi nguồn giá đất theo kỳ bảng giá trong phương án, giải trình. Chuỗi nguồn do màn Chọn giá đất lập
 * (thanh-phan/ChonGiaDat.tsx): "Bảng 05, <xã>, STT … (<tuyến>), VTn" + " — <văn bản>" khi chọn kỳ từ 01/11/2026; giá khoản 8
 * Điều 7 bắt đầu bằng "Khoản 8 Điều 7 …". Chỉ đọc lại chuỗi đã lưu, không tra lại bảng giá.
 */
export const VB_NQ152 = "NQ 152/2025/NQ-HĐND";
export const VB_NQ152_SUA = "NQ 152/2025/NQ-HĐND được sửa đổi, bổ sung bởi NQ 28/2026/NQ-HĐND";

/** Văn bản giá đất cho dòng căn cứ: có dẫn NQ 28/2026 → "NQ 152 … được sửa đổi, bổ sung bởi NQ 28 …". */
export const vanBanGiaDat = (nguon: string) => (/28\/2026/.test(nguon) ? VB_NQ152_SUA : VB_NQ152);

/** Giá đất TMDV có nguồn gốc đất ở tính 90% giá đất ở (khoản 8 Điều 7, bổ sung bởi khoản 6 Điều 1 NQ 28/2026). */
export const laGiaK8 = (nguon: string | undefined) => !!nguon && /^Khoản 8 Điều 7/.test(nguon.trim());

/** Vị trí trong bảng giá (bỏ phần tên văn bản đã ghi ở cột văn bản; dòng bổ sung, sửa tên giữ "Phụ lục … NQ 28"). */
export function viTriGiaDat(nguon: string): string {
  return nguon
    .replace(/ — NQ 152\/2025\/NQ-HĐND[^—]*$/, "")
    .replace(/ — (NQ 28\/2026\/NQ-HĐND)(?: ngày [\d/]+)?, (.+)$/, ", $2 $1");
}

/** Nguồn giá đầy đủ một dòng, ghi rõ kỳ: "NQ 152/2025/NQ-HĐND được sửa đổi, bổ sung bởi NQ 28/2026/NQ-HĐND: Bảng 05, …". */
export function moTaNguonGia(nguon: string | undefined): string {
  const n = (nguon ?? "").trim();
  if (!n) return "";
  if (/^Nhập tay/i.test(n)) return n;
  return `${vanBanGiaDat(n)}: ${viTriGiaDat(n)}`;
}
