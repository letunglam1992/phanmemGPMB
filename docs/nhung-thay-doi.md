# Những thay đổi

Mỗi phiên bản một mục `## X.Y.Z`. Khi phát hành, quy trình đóng gói lấy các mục gần nhất làm ghi chú phát hành
(`tools/ghi-chu-phat-hanh.mjs`) — thiếu mục của phiên bản đang phát hành thì dừng, không phát hành. Phần mềm hiện các mục
mới hơn bản đang dùng khi có bản cập nhật.

## 1.0.13

- Hạn phê duyệt phương án không quá 5 ngày làm việc kể từ ngày nhận tờ trình (điểm c khoản 3 Điều 87 Luật Đất đai 2024):
  mốc lấy ngày Tờ trình đề nghị phê duyệt phương án (mẫu 13 nay ghi lại số, ngày; mẫu R4) hoặc ngày nhận tờ trình ghi
  cho cả bản; bảng phương án hiện hạn, Tổng quan và chuông báo sắp hết, quá hạn; báo cáo đếm bản quá hạn phê duyệt.
- Phụ lục Excel tổng hợp tỉnh có trang "Bản phương án": chờ thẩm định (quá hạn), đã thẩm định chờ phê duyệt (quá hạn),
  không thống nhất, đã phê duyệt theo từng dự án.
- Hộp "Ghi tổ, thôn" nhiều hộ và nhập Excel kiểm đếm theo bộ chính sách của từng hộ.
- So sánh bản đồ đã lưu giữ cả số liệu hồ sơ lúc lưu: khi xem lại nêu hồ sơ đã sửa diện tích, mới có hoặc không còn thửa.

## 1.0.12

- Thẩm định phương án: mẫu 13 và mẫu R4 tự điền "Kết quả thẩm định" từ bản phương án đã ghi nhận thẩm định; cơ quan
  thẩm định điền sẵn cho các mẫu.
- Hạn thẩm định không quá 30 ngày làm việc kể từ ngày nhận đủ hồ sơ (khoản 3 Điều 3 Nghị định 88/2024/NĐ-CP): ghi ngày
  nhận đủ hồ sơ một lần cho cả bản phương án; bảng phương án hiện hạn, Tổng quan và chuông báo sắp hết, quá hạn.
- Báo cáo xã (màn Báo cáo, Word) và tổng hợp tỉnh có số bản phương án chờ thẩm định, quá hạn, đã thẩm định, không thống
  nhất, đã phê duyệt.
- Hộ dùng bộ chính sách riêng: các thẻ Thửa đất, Kiểm đếm, Hỗ trợ, Hỗ trợ khác hiện danh mục, đơn giá, giá đất theo bộ
  của hộ.
- Mã kích hoạt: danh sách mã bị chặn đi kèm bản phần mềm — mã cũ của đơn vị đã thay máy hết hiệu lực khi cập nhật; công
  cụ cấp mã tự đánh dấu chặn khi cấp lại, xuất tệp danh sách chặn.
- Bản đồ: lưu kết quả so sánh với bản đồ khác (trích đo bổ sung) vào dự án — xem lại, hiện trên bản đồ, xuất Excel.

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
