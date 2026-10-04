# 22. Ghi chú tiến độ (cập nhật 04/10/2026)

Trạng thái chi tiết của từng chức năng (đã chạy / đã kiểm thử / hạn chế) xem docs/09. Ghi chú này tóm tắt việc đã xong và việc cần làm tiếp, để phiên làm việc sau tiếp tục.

## 1. Đã xong

### Đã phát hành (bản cài tự cập nhật)

| Bản | Nội dung |
|---|---|
| 0.9.9–0.9.13 | Nhiều tờ bản đồ trong 1 dự án; lớp ảnh vệ tinh (phóng to thì tự lấy ảnh mức thấp hơn); nút xem thửa trên bản đồ; xóa thửa; sửa lỗi theo báo cáo thử nghiệm |
| 0.9.14 | Xóa đối tượng ở Hỗ trợ khác, sửa chữ lẹm; ghi nhận phê duyệt theo đợt, không bắt buộc số/ngày QĐ |
| 0.9.15–0.9.17 | Tự cập nhật phần mềm (docs/20); quay lại danh sách thửa; xem thửa từ hộp Tạo hồ sơ; văn bản theo đợt chỉ chọn hộ đã chốt; hộp Chốt phương án lọc hộ; ranh giới 75 xã, phường |
| 0.9.18 | Thẻ "Tài liệu, văn bản" của dự án: tải lên PDF, Word, Excel, ảnh; tải tất cả (.zip) kèm bảng kê |
| 0.9.19 | Xuất Excel, chốt phương án theo hồ sơ đã chọn; hoàn tác lần cập nhật tiến độ nhiều hộ; văn bản theo đợt phương án |
| 0.9.20 | Hỏi đáp AI: chế độ nội bộ (không dùng mạng) và chế độ Gemini API (người dùng tự dán khóa, có hướng dẫn) |
| 0.9.21 | Gửi tỉnh, tổng hợp tỉnh: gói `.gpmbtinh` mã hóa cho khóa tỉnh; cổng Cloudflare (Worker + R2); bảng tổng hợp theo xã; xem chi tiết chỉ xem (docs/21) |
| 0.9.22 | Nút "Tạo khóa mới (thay khóa cũ)" khi quên mật khẩu khóa cấp tỉnh; mở khóa xong tự tải gói từ cổng; rào lỗi riêng cho từng khung; sửa chữ địa chỉ cổng tràn khung "3. Gửi" |

### Đã làm xong, đang dựng bản cài

| Bản | Nội dung |
|---|---|
| 0.9.23 | Trợ lý AI nổi: nút tròn hình robot ở góc dưới phải mở khung chat (Nội bộ / Gemini); phóng to, hội thoại mới, Esc đóng; chuyển màn vẫn giữ hội thoại. Thanh bên → "Trợ lý AI (hỏi đáp)" |

Kiểm thử của 0.9.23: typecheck, npm test (78 + 48 + 356), cargo test, eslint (3 cảnh báo cũ), Playwright 57/57 — tất cả đạt.

### Hạ tầng anh Lâm đã triển khai

- Cổng Cloudflare: `https://gpmb-cong-tinh.letunglam1992.workers.dev`, gồm R2 `gpmb-cong-tinh`, binding `KHO`, secret `MA_QUAN_TRI`.
- Máy cấp xã (UBND xã Chiềng Mung) đã kết nối cổng và gửi gói thành công lúc 20:09 ngày 04/10/2026: 4 dự án, 171 hồ sơ.
- Máy tổng hợp đã có khóa cấp tỉnh: Sở NN&MT tỉnh Sơn La, vân tay `528C-2D10-F284-F41B`.

## 2. Cần làm tiếp

1. **Anh Lâm thử bản 0.9.22 / 0.9.23 trên máy thật**
   - [ ] Thẻ Tổng hợp tỉnh: nhập mật khẩu khóa → Mở khóa. Phần mềm phải tự tải gói của xã Chiềng Mung từ cổng; bảng tổng hợp hiện 4 dự án.
     - Quên mật khẩu khóa: dùng "Tạo khóa mới (thay khóa cũ)…" → xuất khóa công khai mới → nhập lại ở thẻ Gửi lên tỉnh → gửi lại gói.
   - [ ] Bấm tên dự án → xem chi tiết (chỉ xem) → Thoát xem.
   - [ ] Trợ lý AI: nút robot, hỏi nội bộ, thử Gemini với khóa thật.
2. **Lỗi `e is not a function`** ở thẻ Tổng hợp tỉnh (bản .exe 0.9.21)
   - Chưa tái hiện được trên trình duyệt. Lần sau màn hiện bình thường.
   - Bản 0.9.22 đã rào lỗi từng khung.
   - Nếu còn gặp: bấm **"Chép chi tiết lỗi"** và gửi nội dung để định vị và sửa tận gốc.
3. **Chưa thử trên bản .exe thật:**
   - Gọi cổng qua lệnh Rust `goi_cong_tinh` (cấp mã xã, tải gói).
   - Gemini với khóa thật.
4. **Có thể làm thêm** (tùy anh Lâm chọn):
   - Cảnh báo "xã lâu chưa gửi số liệu".
   - Xã tự gửi định kỳ.
   - Tỉnh xem lại các bản gửi cũ (cổng đang giữ 5 bản).
   - Xuất báo cáo tổng hợp tỉnh theo mẫu văn bản.

Mỗi lần sửa xong: kiểm thử đầy đủ (typecheck, npm test, cargo test, eslint, Playwright) → cập nhật docs/09 và ghi chú này → nâng phiên bản (5 chỗ, CLAUDE.md) → commit, đẩy lên → phát hành.

## 3. Lưu ý vận hành

- Phát hành: proxy chặn đẩy nhãn (tag), nên phát hành bằng lệnh:
  `gh api -X POST repos/letunglam1992/phanmemGPMB/actions/workflows/build-windows.yml/dispatches -f ref=claude/great-rubin-4x4alw -F 'inputs[phat_hanh]=true'`
  - Kiểm tra kết quả: `https://github.com/letunglam1992/phanmemGPMB/releases/latest/download/latest.json`.
  - Mỗi lần chỉ chạy một lần phát hành.
- Anh Lâm tự giữ, không ghi vào kho:
  - Khóa bí mật cập nhật phần mềm `gpmb.key` (đã đặt trong GitHub Secrets).
  - Mã quản trị cổng `MA_QUAN_TRI`.
  - Mật khẩu khóa cấp tỉnh.
- Nhánh làm việc: `claude/great-rubin-4x4alw`.
