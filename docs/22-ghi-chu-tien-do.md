# 22. Ghi chú tiến độ (cập nhật 04/10/2026)

Trạng thái chức năng chi tiết xem docs/09. Ghi chú này nêu những gì đã làm xong gần đây và những việc đang dở, để phiên làm việc sau tiếp tục.

## Đã xong, đã phát hành (bản cài 0.9.21, tự cập nhật)

| Bản | Nội dung |
|---|---|
| 0.9.9–0.9.13 | Nhiều tờ bản đồ trong 1 dự án; lớp ảnh vệ tinh (tự lấy ảnh mức thấp hơn khi phóng to); nút xem thửa trên bản đồ; xóa thửa; sửa lỗi theo báo cáo thử nghiệm |
| 0.9.14 | Xóa đối tượng ở hỗ trợ khác, sửa chữ lẹm; ghi nhận phê duyệt theo đợt, số/ngày QĐ không bắt buộc |
| 0.9.15–0.9.17 | Tự cập nhật phần mềm (docs/20); quay lại danh sách thửa; xem thửa từ hộp Tạo hồ sơ; văn bản theo đợt chỉ chọn hộ đã chốt; hộp Chốt phương án lọc hộ; ranh giới 75 xã, phường |
| 0.9.18 | Thẻ "Tài liệu, văn bản" của dự án: tải lên PDF, Word, Excel, ảnh; tải tất cả (.zip) kèm bảng kê |
| 0.9.19 | Xuất Excel, chốt phương án theo hồ sơ đã chọn; hoàn tác lần cập nhật tiến độ nhiều hộ; văn bản theo đợt phương án |
| 0.9.20 | Hỏi đáp AI: chế độ nội bộ (không mạng) + Gemini API (người dùng tự dán khóa, có hướng dẫn) |
| 0.9.21 | Gửi tỉnh, tổng hợp tỉnh: gói `.gpmbtinh` mã hóa cho khóa tỉnh; cổng Cloudflare (Worker + R2); bảng tổng hợp theo xã; xem chi tiết chỉ xem (docs/21) |

Cổng Cloudflare đã được anh Lâm triển khai thật tại `https://gpmb-cong-tinh.letunglam1992.workers.dev`, gồm: R2 `gpmb-cong-tinh`, binding `KHO`, secret `MA_QUAN_TRI`. Máy cấp xã đã kết nối và gửi gói thành công (04/10/2026 20:09).

## Việc cần làm tiếp (theo báo cáo thử nghiệm của anh Lâm, 04/10/2026)

1. **Lỗi màn "Gửi tỉnh, tổng hợp tỉnh" ở thẻ Tổng hợp tỉnh trên bản .exe.** Màn báo "Không hiển thị được màn hình này — `e is not a function`", nên cấp tỉnh không thấy dữ liệu xã vừa gửi.
   - Kiểm thử trên trình duyệt (Playwright, cùng kịch bản) chạy đúng; lỗi chỉ xuất hiện trên bản cài.
   - Cần: bấm **"Chép chi tiết lỗi"** trên màn lỗi rồi gửi nội dung (có ngăn xếp lỗi) để định vị chính xác.
   - Hướng sửa dự kiến:
     - Bọc từng khung của thẻ Tổng hợp tỉnh bằng rào lỗi riêng, để một khung lỗi không làm mất cả màn.
     - Rà các đường chạy riêng của bản cài (lệnh `goi_cong_tinh`, DPAPI, IndexedDB `gpmb-tong-hop-tinh`).
     - Kiểm tra dữ liệu tóm tắt của dự án thật (4 dự án, 171 hồ sơ).
   - Cũng nên: sau khi mở khóa mà đã có cổng thì **tự tải gói mới**, để không phải bấm "Tải gói mới từ cổng".
2. **Chữ bị lẹm ra ngoài khung** ở thẻ Gửi lên tỉnh: dòng "▸ Cổng Cloudflare của tỉnh (đã kết nối: https://…)" và đoạn ghi chú vượt mép phải khung "3. Gửi". Cần cho xuống dòng, cắt bớt địa chỉ dài.
3. **Đổi Hỏi đáp AI thành trợ lý chat nổi:** nút tròn hình robot ở góc dưới phải, bấm mở khung chat (giữ 2 chế độ Nội bộ / Gemini). Bỏ hoặc giữ mục "Hỏi đáp AI" ở thanh bên làm lối vào phụ.

Sau khi làm xong: kiểm thử đầy đủ (typecheck, npm test, cargo test, eslint, Playwright), cập nhật docs/09, nâng bản 0.9.22, phát hành.

## Lưu ý vận hành

- Khóa bí mật cập nhật phần mềm `gpmb.key` do anh Lâm giữ, không đưa vào kho. Phát hành bằng lệnh `workflow_dispatch` với `phat_hanh=true`, vì proxy chặn đẩy nhãn (tag).
- Mã quản trị cổng (`MA_QUAN_TRI`) và mật khẩu khóa cấp tỉnh do anh Lâm giữ, không ghi vào kho.
