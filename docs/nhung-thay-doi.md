# Những thay đổi

Mỗi phiên bản một mục `## X.Y.Z`. Khi phát hành, quy trình đóng gói lấy các mục gần nhất làm ghi chú phát hành
(`tools/ghi-chu-phat-hanh.mjs`) — thiếu mục của phiên bản đang phát hành thì dừng, không phát hành. Phần mềm hiện các mục
mới hơn bản đang dùng khi có bản cập nhật.

## 1.0.11

- Phương án: tách bước **thẩm định** khỏi phê duyệt — ghi nhận số, ngày, cơ quan, ý kiến thẩm định (khoản 3 Điều 3
  Nghị định 88/2024/NĐ-CP; Mục XII Sổ tay). Bản đã thẩm định khóa ý kiến và ô đã ghi (chỉ bổ sung ô trống); thẩm định
  không thống nhất thì cảnh báo khi ghi nhận phê duyệt. Máy chủ mạng nội bộ kiểm cùng quy tắc.
- Chuyển bộ chính sách **theo từng hộ, từng đợt** (hồ sơ đang lập dở khi có văn bản mới), xem chênh lệch từng hộ, từng
  khoản; xuất Excel, Word giải trình. Bản phương án chốt ghi rõ bộ của đợt.
- Ghi chú phát hành lấy từ tệp "Những thay đổi"; hộp cập nhật hiện đủ các bản mới hơn bản đang dùng.
- Công cụ cấp mã kích hoạt: in phiếu cấp mã (Word); cấp lại cho mã cài đặt mới (đơn vị thay máy) giữ số dự án, hạn dùng.

## 1.0.10

- Bản dùng thử (1 dự án, đủ chức năng; dự án mẫu không tính) và mã kích hoạt theo mã cài đặt của máy, số dự án, hạn dùng.
- Máy chủ mạng nội bộ tự kiểm giới hạn dự án; nhắc gia hạn trước khi hết hạn.
- Công cụ cấp mã cho tác giả: danh sách mã đã cấp, xuất CSV, sao lưu.
- Tra cứu đơn giá và mẫu nhập Excel theo bảng của gói chính sách.

## 1.0.9

- PDF bản đồ tiến độ có thể kèm nền ảnh vệ tinh.
- Ô thả xuống (Tệp đã xuất, thông báo, trình đơn) tự đóng khi bấm ra ngoài.
- Chuột phải kết thúc lệnh đang dùng trên bản đồ.

## 1.0.8

- Sửa thanh công cụ bản đồ bị ép cao 4 px.

## 1.0.7

- Lịch sử thay đổi cho ô Hỗ trợ, Tái định cư; người có đất trùng qua nhân khẩu.
- Mốc ranh có cung tròn; in bản đồ theo khung; bắt tâm cung, điểm trên cạnh.
- Gói chính sách kèm bảng đơn giá, bảng giá đất; DGN V8 đọc tên lớp, màu gốc, đường kích thước.
- Tính nền cho các màn lớn; lịch sử phiên bản tệp đính kèm; mẫu T13 biên bản bốc thăm lô TĐC.

## 1.0.6

- Đối thoại khi không đồng ý phương án; thưởng bàn giao sớm; đối chiếu tổng diện tích thu hồi.
- Báo cáo Word tỉnh có diễn biến theo tháng; PDF có chữ thật, lưới tọa độ.
