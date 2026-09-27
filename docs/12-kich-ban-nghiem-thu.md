# 12. Kịch bản kiểm thử nghiệm thu (Giai đoạn 5)

Ghi kết quả mỗi mục: **Đạt / Không đạt / Chưa thử**, kèm ghi chú (ảnh màn hình, tệp). Mục không đạt → gửi mô tả để sửa, thử lại.

## A1. Đối chiếu với phương án đã được phê duyệt thật

**Chuẩn bị:** 2–3 phương án đã có QĐ phê duyệt, khác loại (đất nông nghiệp; có nhà, công trình; có hỗ trợ ổn định đời sống, chuyển đổi nghề). Hồ sơ có thông tin cá nhân: **để trên máy của cơ quan**, nhập vào phần mềm trên máy đó; khi gửi trao đổi thì gửi *Phiếu đối chiếu* đã xóa cột họ tên, hoặc ẩn danh trước.

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Tạo dự án: xã, giá gạo, hạn mức, hệ số giá đất đúng như hồ sơ đã duyệt | — |
| 2 | Nhập hộ, thửa, kiểm đếm (tay hoặc *Nhập Excel*); chọn giá đất, hỗ trợ như phương án đã duyệt | Không còn khoản "Thiếu căn cứ" trừ khoản phương án cũng không có |
| 3 | Dự án → Phương án – phiên bản → **Phiếu đối chiếu** | Tệp Excel mỗi khoản một dòng, dòng tổng hộ |
| 4 | Nhập số theo phương án đã duyệt vào cột G (ô vàng) | Cột H, I tự tính chênh lệch |
| 5 | Mọi dòng chênh lệch ≠ 0: ghi nguyên nhân (nhập sai / cách hiểu văn bản / lỗi phần mềm / văn bản áp dụng khác thời điểm) | Gửi phiếu để xử lý |

**Đạt khi:** tổng từng hộ khớp đến đồng; chênh lệch nếu có đều giải thích được bằng căn cứ (không do lỗi tính).

## A2. Nhiều người dùng qua mạng nội bộ (1 máy chủ + 2 máy trạm)

| # | Thao tác | Mong đợi |
|---|---|---|
| 1 | Máy A: Kết nối… → Máy chủ (cổng 47800) → khởi động lại; cho phép tường lửa (mạng riêng) | Vào màn tạo tài khoản quản trị |
| 2 | Máy A: tạo quản trị; tạo tài khoản cán bộ, lãnh đạo; Cài đặt chung → Mạng nội bộ xem địa chỉ, vân tay | Có IP dạng 192.168.x.x:47800 |
| 3 | Máy B, C: Kết nối… → Máy trạm → nhập IP → Kiểm tra → đối chiếu vân tay → lưu | Vào màn đăng nhập máy chủ |
| 4 | B (cán bộ) sửa hồ sơ H01 và lưu | C thấy thông báo "vừa được cập nhật bởi …" trong vài giây |
| 5 | B và C cùng mở H01, cùng sửa, B lưu trước, C lưu sau | C nhận thông báo xung đột, bản nháp của C còn trên màn hình |
| 6 | B gửi duyệt bước 5; B thử xác nhận | Bị chặn; C (lãnh đạo) xác nhận được |
| 7 | Tắt phần mềm trên A khi B đang làm | B báo lỗi kết nối, không mất bản nháp; mở lại A → B tiếp tục |
| 8 | Quản trị khóa tài khoản B | B bị đăng xuất ở lần thao tác tiếp theo |

## A3. Sao lưu tự động (bản cài)

| # | Thao tác | Mong đợi |
|---|---|---|
| 1 | Cài đặt chung → Tự động sao lưu → **Sao lưu ngay** | Thông báo tên tệp `GPMB-tu-dong_….gpmb` |
| 2 | **Mở thư mục** | Có tệp trong Documents\GPMB Son La\Sao luu |
| 3 | Đặt "Số bản giữ lại" = 2, sao lưu 3 lần | Chỉ còn 2 tệp mới nhất |
| 4 | Máy khác: Sao lưu, khôi phục → chọn tệp → Khôi phục | Dữ liệu đúng như máy nguồn |

## A4. Nâng cấp phiên bản

| # | Thao tác | Mong đợi |
|---|---|---|
| 1 | Trên máy có dữ liệu thật: tạo bản sao lưu thủ công trước | Có tệp .gpmb |
| 2 | Cài bộ cài mới đè lên bản cũ (không gỡ) | Mở được, đăng nhập được, dữ liệu, tài khoản, lịch, cài đặt còn nguyên |
| 3 | Máy chủ mạng nội bộ: cài bản mới trên máy chủ trước, sau đó máy trạm | Máy trạm kết nối lại bình thường |

## A5. Phân quyền (máy đơn hoặc mạng)

| Vai trò | Thử | Mong đợi |
|---|---|---|
| Chỉ xem | Sửa hồ sơ, soạn văn bản | Ô nhập bị khóa; văn bản chỉ là dự thảo, không ghi số |
| Cán bộ | Chốt phương án, xác nhận bước, xóa dự án | Không có nút / bị chặn |
| Lãnh đạo | Chốt, ghi nhận phê duyệt, hủy bản chưa duyệt | Được; bản đã duyệt không sửa, không hủy |
| Quản trị | Khôi phục; khóa quản trị cuối cùng | Khôi phục được; không khóa được quản trị cuối |

## A6. Chi trả, tiền chậm trả

1. Cài đặt chung → Tiền chậm trả: nhập tỷ lệ %/ngày **theo văn bản hiện hành** kèm căn cứ.
2. Hộ đã có bản phương án phê duyệt: thẻ Chi trả → ghi các đợt chi thực tế.
3. Đối chiếu số ngày chậm, tiền chậm trả với cách tính của đơn vị; xuất *Theo dõi chi trả (Excel)*.

## Biên bản kết quả (mẫu)

| Mục | Kết quả | Ghi chú / lỗi phát hiện | Ngày thử | Người thử |
|---|---|---|---|---|
| A1 – dự án 1 | | | | |
| A1 – dự án 2 | | | | |
| A2 | | | | |
| A3 | | | | |
| A4 | | | | |
| A5 | | | | |
| A6 | | | | |
