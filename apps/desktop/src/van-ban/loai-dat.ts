/**
 * Tên loại đất theo ký hiệu (Điều 9 Luật Đất đai 2024; ký hiệu theo quy định về thống kê, kiểm kê đất đai và bản đồ địa
 * chính). Người sử dụng đất không đọc được ký hiệu → giao diện, bảng tính, văn bản ghi tên đầy đủ kèm ký hiệu trong ngoặc.
 * Ký hiệu lạ (không có trong danh mục) giữ nguyên.
 */
export const TEN_LOAI_DAT: Record<string, string> = {
  LUC: "Đất chuyên trồng lúa",
  LUK: "Đất trồng lúa còn lại",
  LUN: "Đất trồng lúa nương",
  BHK: "Đất bằng trồng cây hàng năm khác",
  NHK: "Đất nương rẫy trồng cây hàng năm khác",
  HNK: "Đất trồng cây hàng năm khác",
  CLN: "Đất trồng cây lâu năm",
  RSX: "Đất rừng sản xuất",
  RPH: "Đất rừng phòng hộ",
  RDD: "Đất rừng đặc dụng",
  NTS: "Đất nuôi trồng thủy sản",
  NKH: "Đất nông nghiệp khác",
  ONT: "Đất ở tại nông thôn",
  ODT: "Đất ở tại đô thị",
  TMD: "Đất thương mại, dịch vụ",
  SKC: "Đất cơ sở sản xuất phi nông nghiệp",
  SKK: "Đất khu công nghiệp",
  SKN: "Đất cụm công nghiệp",
  KHAC: "Loại đất khác",
  DGT: "Đất giao thông",
  NTD: "Đất nghĩa trang, nhà tang lễ, cơ sở hỏa táng",
  DCS: "Đất đồi núi chưa sử dụng",
  BCS: "Đất bằng chưa sử dụng",
  NCS: "Núi đá không có rừng cây",
  CSD: "Đất chưa sử dụng",
};
export const tenLoaiDat = (ma: string) => TEN_LOAI_DAT[ma.toUpperCase()] ?? ma;
/** "Đất chuyên trồng lúa (LUC)"; ký hiệu không có trong danh mục → giữ nguyên ký hiệu. */
export const tenDayDu = (ma: string) => (TEN_LOAI_DAT[ma.trim().toUpperCase()] ? `${TEN_LOAI_DAT[ma.trim().toUpperCase()]} (${ma.trim().toUpperCase()})` : ma);
