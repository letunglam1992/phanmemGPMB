# 00. Tổng quan và diễn giải nhu cầu

## 1. Diễn giải lại nhu cầu

Xây dựng một **ứng dụng máy tính Windows, cài đặt bằng `.exe`**, phục vụ đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư và cơ quan chuyên môn cấp xã/tỉnh tại Sơn La. Phần mềm:

1. **Quản lý hồ sơ**: dự án thu hồi đất → người có đất thu hồi / chủ sở hữu tài sản → thửa đất → tài sản (nhà, công trình, cây trồng, vật nuôi, mồ mả…) → giấy tờ, biên bản kiểm đếm, tệp đính kèm. Quan hệ nhiều–nhiều (một người nhiều thửa, một thửa nhiều người, đồng sở hữu).
2. **Quản lý quy trình, tiến độ**: các bước theo quy trình được cung cấp, người phụ trách, ngày, thời hạn (chỉ khi có quy định), trạng thái, cảnh báo quá hạn / thiếu dữ liệu / trùng / bất thường.
3. **Tính toán bồi thường, hỗ trợ, TĐC** bằng công thức xác định, kiểm thử được; mỗi khoản hiển thị khối lượng, đơn vị, đơn giá, hệ số, công thức, làm tròn, căn cứ; truy vết từ tổng về từng khoản; điều chỉnh thủ công có phân quyền, lý do, lịch sử.
4. **Lập phương án, báo cáo, biểu mẫu**: bảng tính từng hộ, bảng tổng hợp, biểu mẫu theo mẫu người dùng cung cấp; xuất Excel/Word/PDF thống nhất với **phiên bản phương án** được chọn.
5. **Nhập liệu**: nhập Excel theo mẫu, xem trước, kiểm lỗi theo dòng/trường, phát hiện trùng trước khi ghi.
6. **Quản trị, an toàn**: tìm kiếm, phân quyền, nhật ký, sao lưu/phục hồi; không tự gửi dữ liệu ra ngoài.

Phần mềm là **công cụ hỗ trợ**: kết luận về điều kiện hưởng và phê duyệt phương án thuộc người có thẩm quyền; phần mềm bắt buộc có bước kiểm tra/xác nhận của người chịu trách nhiệm.

## 2. Nguyên tắc xử lý pháp lý (ràng buộc thiết kế)

| # | Nguyên tắc | Hệ quả thiết kế |
|---|---|---|
| P1 | Không tự đặt điều kiện, mức hưởng, hệ số, đơn giá, thời hạn, thẩm quyền | Mọi tham số nằm trong **Bộ chính sách** (dữ liệu), không viết cứng trong mã; tham số thiếu → khoản tính ở trạng thái "Thiếu căn cứ", không tính ra tiền |
| P2 | Mỗi quy tắc/khoản tính truy xuất được căn cứ | Mỗi quy tắc và mỗi dòng đơn giá mang `can_cu` (văn bản – Điều – Khoản – Điểm – Phụ lục – Biểu – STT) |
| P3 | Quản lý phiên bản chính sách theo hiệu lực, địa bàn, điều kiện; chuyển tiếp | Bộ chính sách có `hieu_luc_tu/den`, phạm vi địa bàn; quy tắc chuyển tiếp là quy tắc chọn bộ chính sách, **luôn yêu cầu người dùng xác nhận** |
| P4 | Thiếu / mâu thuẫn / chưa rõ → đánh dấu để xác nhận | Sổ vướng mắc (docs/03) ; trong phần mềm: cờ "Cần xác nhận" chặn chốt phương án |
| P5 | Cập nhật chính sách không làm thay đổi phương án đã chốt | Kết quả tính được **đóng băng** (snapshot đầu vào + tham số + kết quả); tính lại là thao tác chủ động, có bảng so sánh chênh lệch và lưu lịch sử |
| P6 | Có bước kiểm tra của người có trách nhiệm | Quy trình trạng thái: Tạm tính → Đã kiểm tra → Đã chốt (trình) → Đã phê duyệt; mỗi bước ghi người, thời điểm |

## 3. Cụ thể hóa kỳ vọng "chất lượng sản phẩm thương mại" thành tiêu chí đo được

(Mức 50.000 USD chỉ là tham chiếu chất lượng, không phải ngân sách.)

| Nhóm | Tiêu chí nghiệm thu đề xuất |
|---|---|
| Chính xác | 100% khoản tính trên bộ hồ sơ mẫu khớp kết quả đã được xác nhận (tới đồng, sau khi áp cùng quy tắc làm tròn); không dùng số thực nhị phân cho tiền |
| Truy vết | 100% khoản tính có căn cứ pháp lý hiển thị được; từ tổng dự án → hộ → khoản → dòng tài sản trong ≤ 3 thao tác |
| Kiểm soát | Không thể chốt phương án khi còn khoản "Thiếu căn cứ" / "Cần xác nhận" / lỗi dữ liệu mức chặn |
| Hiệu năng | Dự án 2.000 hộ, 20.000 dòng tài sản: mở danh sách < 1 s, tính lại toàn dự án < 10 s, nhập Excel 10.000 dòng < 30 s (trên máy văn phòng phổ thông) |
| Ổn định | Không mất dữ liệu khi tắt đột ngột (giao dịch CSDL, WAL); tự sao lưu; phục hồi thử thành công 100% |
| Bảo mật | Không kết nối Internet khi vận hành; tài khoản, phân quyền, nhật ký không sửa được; tùy chọn mã hóa CSDL |
| Dễ dùng | Cán bộ mới hoàn thành luồng "nhập 1 hộ → tính → in bảng chi tiết" sau ≤ 1 buổi hướng dẫn |
| Bảo trì | Cập nhật đơn giá/chính sách **không cần sửa mã**; lõi tính toán có kiểm thử tự động; tài liệu cấu hình chính sách |
