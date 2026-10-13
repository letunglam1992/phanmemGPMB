/**
 * Khóa CÔNG KHAI kiểm mã kích hoạt (ECDSA P-256). Khóa riêng tương ứng do tác giả giữ, không có trong kho mã.
 * Đổi cặp khóa: dùng tools/giay-phep/cap-ma.html → "Tạo cặp khóa mới", thay giá trị dưới đây và phát hành bản mới
 * (mã kích hoạt cấp bằng khóa cũ sẽ không còn hợp lệ).
 */
export const KHOA_CONG_GIAY_PHEP: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "FdLZDi-hfgiJTLgAgbhE6RpyztdU9zyVmR7zct0oBc0",
  y: "8ZO0hia4iwN2O2vz8OAVSNlWH4GF4BPMW_h6pjzoDe8",
};
