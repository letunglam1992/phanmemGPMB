/**
 * Bảng phân lớp đối tượng bản đồ địa chính — mục I Phụ lục số 21 kèm theo Thông tư số 26/2024/TT-BTNMT
 * (quy định kỹ thuật về đo đạc lập bản đồ địa chính; điểm d khoản 1 Điều 16). Điểm b khoản 8 Điều 8 Thông tư
 * số 23/2025/TT-BNNMT bãi bỏ các đối tượng "Địa giới huyện" (lớp 44) và "Mốc địa giới huyện" (lớp 45) tại mục I
 * Phụ lục 21 — hai lớp này không còn trong bảng; các lớp khác giữ nguyên.
 *
 * Dùng để hiển thị ý nghĩa lớp khi cán bộ cấu hình và để cảnh báo khi lớp được chọn làm ranh thu hồi
 * trùng một lớp đã có nghĩa khác theo Phụ lục 21. Điểm d khoản 1 Điều 16 cho phép "tận dụng các lớp bản đồ số
 * còn bỏ trống để thể hiện yếu tố thuộc tính khác của thửa đất" — nên lớp địa phương (vd. 40 thửa đã thu hồi,
 * 62 ghi chú GPMB) là hợp lệ nhưng phải do cán bộ xác nhận, phần mềm không tự khẳng định.
 */
export const LOP_PL21: Readonly<Record<number, string>> = {
  1: "Đường bình độ",
  2: "Loại đất hiện trạng",
  3: "Ghi chú độ cao, bình độ",
  4: "Diện tích thửa đất",
  5: "Tỷ sâu, tỷ cao",
  6: "Điểm thiên văn, tọa độ, độ cao Quốc gia",
  7: "Điểm độ cao kỹ thuật",
  8: "Điểm địa chính, điểm khống chế đo vẽ",
  9: "Ghi chú số hiệu điểm, độ cao",
  10: "Ranh giới thửa đất hiện trạng",
  11: "Điểm nhãn thửa (tâm thửa)",
  12: "Ký hiệu/ghi chú độ rộng bờ thửa",
  13: "Số thứ tự thửa đất và đường kẻ nhãn thửa",
  14: "Tường nhà",
  15: "Điểm nhãn nhà",
  16: "Ký hiệu tường, ghi chú về nhà",
  17: "Đối tượng điểm có tính kinh tế",
  18: "Đối tượng điểm có tính văn hóa",
  19: "Đối tượng điểm có tính xã hội",
  20: "Đường ray",
  21: "Chỉ giới đường sắt",
  22: "Phần trải mặt, lòng đường",
  23: "Chỉ giới đường (là ranh thửa)",
  24: "Chỉ giới đường nằm trong thửa",
  25: "Đường nửa tỷ lệ (1 nét)",
  26: "Ký hiệu/ghi chú độ rộng đường",
  27: "Cầu",
  28: "Tên đường, tên phố",
  29: "Loại đất pháp lý (theo giấy tờ)",
  30: "Đường mép nước",
  31: "Đường bờ",
  32: "Kênh, mương, rãnh thoát nước",
  33: "Giới hạn thủy văn nằm trong thửa",
  34: "Suối, kênh, mương nửa tỷ lệ",
  35: "Ký hiệu/ghi chú thủy văn",
  36: "Cống, đập",
  37: "Đường mặt đê",
  38: "Giới hạn chân đê",
  39: "Tên sông, hồ, ao, suối, kênh, mương",
  40: "Biên giới quốc gia",
  41: "Mốc biên giới quốc gia",
  42: "Địa giới tỉnh",
  43: "Mốc địa giới tỉnh",
  46: "Địa giới xã",
  47: "Mốc địa giới xã",
  48: "Tên địa danh, cụm dân cư",
  49: "Loại đất trước chỉnh lý",
  50: "Chỉ giới quy hoạch, hành lang giao thông",
  51: "Mốc giới quy hoạch",
  52: "Phân vùng địa danh",
  53: "Phân vùng chất lượng",
  54: "Phân mảnh bản đồ",
  55: "Mạng lưới điện",
  56: "Mạng thoát nước thải",
  57: "Mạng viễn thông",
  58: "Mạng cấp nước",
  59: "Ranh giới hành lang lưới điện",
  61: "Ranh giới thửa đất theo giấy tờ",
  63: "Trình bày khung",
};

/** Lớp ranh thửa theo Phụ lục 21: 10 (hiện trạng), 61 (theo giấy tờ). */
export const LOP_RANH_THUA_PL21 = [10, 61] as const;

/** Tên lớp theo Phụ lục 21; lớp không có trong bảng là lớp bỏ trống (địa phương tận dụng). */
export function tenLopPl21(lop: number): string | null {
  return LOP_PL21[lop] ?? null;
}
