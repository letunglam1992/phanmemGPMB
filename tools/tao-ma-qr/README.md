# Mã QR văn bản

Công cụ tạo mã QR từ đường dẫn (link) văn bản để in kèm tờ trình, báo cáo, giấy mời.
Một tệp `index.html` duy nhất, **chạy ngoại tuyến** (thư viện tạo mã đã nhúng sẵn), không gửi đường dẫn ra ngoài.

## Cách dùng
1. Mở `index.html` bằng Chrome/Edge (nhấp đúp).
2. Dán đường dẫn văn bản; nhập chú thích (số, ký hiệu, ngày văn bản) nếu muốn in dưới mã.
3. Tải PNG / SVG hoặc Sao chép ảnh rồi dán vào Word.
4. Thẻ **Hàng loạt**: mỗi dòng `Chú thích | Đường dẫn` (hoặc dán 2 cột từ Excel) → tạo và tải nhiều mã cùng lúc.

## Ghi chú kỹ thuật
- Mã hoá UTF-8, tự chọn phiên bản QR nhỏ nhất; mức sửa lỗi L/M/Q/H; lề trắng mặc định 4 ô.
- "Cỡ in nhỏ nhất" là ước tính theo 0,33 mm/ô (gợi ý thực hành, không phải quy chuẩn); luôn quét thử bản in.
- Lịch sử gần đây và lựa chọn lưu trong `localStorage` của trình duyệt trên máy đang dùng.
- Thư viện: qrcode-generator 1.4.4 (Kazuhiko Arase, MIT), nhúng nguyên văn trong thẻ `<script>` đầu tiên.
