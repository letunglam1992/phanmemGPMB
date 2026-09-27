# 08. Bản đồ địa chính DGN trong phiên bản 1

## 1. Phạm vi

| Hạng mục | Trạng thái |
|---|---|
| Đọc DGN MicroStation **V7** (2D; 3D đọc tọa độ, bỏ quay) | **Đã chạy, đã kiểm thử** (tệp tự tạo + tệp thật) |
| Giải mã chữ **TCVN3** (ABC) | **Đã chạy, đã kiểm thử** |
| Khép thửa từ đường ranh, gắn nhãn tờ/thửa/loại đất/diện tích/chủ sử dụng | **Đã chạy, đã kiểm thử** trên tệp thật |
| Vùng ranh GPMB ứng viên, diện tích thu hồi từng thửa (phần giao) | **Đã chạy, đã kiểm thử** (khớp Shapely tuyệt đối) |
| DGN **V8** | **Chưa hỗ trợ** — cần lưu lại dạng V7 trong MicroStation (File → Save As → V7) |
| Ô dùng chung (shared cell, kiểu 35), kích thước (kiểu 33) | **Chưa hiển thị** (không ảnh hưởng thửa, nhãn) |
| Nền bản đồ trực tuyến | Chưa làm; nếu làm sẽ là tùy chọn **tắt mặc định** (xem §5) |

Mã nguồn: `packages/gis` (TypeScript thuần, chạy trong ứng dụng, **không gửi dữ liệu ra ngoài**).

## 2. Kết quả trên tệp mẫu GPMB.dgn (người dùng cung cấp)

- TCB: 2D, 100 SU/MU, 1 UOR/SU, đơn vị m/cm; gốc tọa độ 0 → tọa độ VN-2000 (X ≈ 562 km, Y ≈ 2.343 km).
- Lớp dùng (suy ra từ tệp, **người dùng chỉnh được** cho tệp khác):

| Lớp | Nội dung | Ví dụ |
|---|---|---|
| 10 | Ranh thửa | 883 đoạn thẳng + 1.281 đường gấp khúc |
| 13 | Nhãn thửa: gộp "LOẠI SỐ/DT" hoặc tách rời | `1L654/119.3`; `2L` · `659` · `27.9` |
| 4 | Số thửa | `654` |
| 5 | Số tờ | `7` |
| 6 | Chủ sử dụng (TCVN3) | `§inh V¨n A` → Đinh Văn A (ví dụ) |
| 30 | Ranh GPMB (2 nét song song + 1 vùng khép kín nhỏ) | |

- **692 thửa** (> 5 m²); **484 thửa** gắn đủ nhãn, không có cờ. Cờ còn lại: thiếu nhãn diện tích 146, thiếu loại đất 178, lệch diện tích > 5% 21 (chủ yếu thửa chứa phần đất ở "T" ~400 m² không có ranh riêng trên lớp 10, và thửa tách a/b), nhiều số thửa 21, nhiều số tờ 22 (tờ cũ/tờ trích đo).
- Vùng ranh ứng viên: **192.722,8 m²** (khép từ nét lớp 30) và **10.210,4 m²** (vùng khép kín). Phần mềm **không tự chọn**; cán bộ chọn trên bản đồ. Với vùng 192.722,8 m²: 409 thửa thu hồi toàn bộ, 92 một phần, 191 ngoài ranh; tổng giao 182.444,6 m².

### Phát hiện khi đối chiếu với GDAL

GDAL (thư viện GIS nguồn mở phổ biến) chỉ đọc 28.041 phần tử đầu và dừng ở byte 2.059.132/2.176.000, **bỏ sót nửa phía nam bản đồ — đúng phần nằm trong ranh GPMB**. Bộ đọc của phần mềm đọc hết tệp; phần GDAL đọc được khớp số phần tử theo lớp/kiểu; phần còn lại được đối chiếu bằng bộ đọc byte độc lập (Python) + Shapely: số thửa và diện tích giao khớp tuyệt đối.

## 3. Quy tắc gắn nhãn

1. Nhãn thuộc thửa khi điểm gốc chữ nằm trong thửa.
2. **Diện tích ghi**: chọn nhãn diện tích gần diện tích hình học nhất (một thửa có thể chứa nhãn của thửa lân cận nhỏ).
3. Nhãn gộp khớp diện tích → lấy luôn loại đất, số thửa của nhãn đó; nhãn tách rời → lấy nhãn gần nhãn diện tích nhất.
4. Số thửa ưu tiên lớp 4 khi chỉ có một giá trị.
5. Tên chủ sử dụng: viết hoa chữ đầu mỗi từ (phông TCVN3 chữ hoa có dấu nằm ở phông riêng nên mã byte trùng chữ thường).
6. Mọi trường hợp không chắc chắn → gắn cờ; **dữ liệu bản đồ là đề xuất**, cán bộ xác nhận trước khi đưa vào hồ sơ thửa.

## 4. Diện tích thu hồi

- Diện tích thu hồi (bản đồ) = diện tích phần giao giữa thửa và vùng ranh GPMB đã chọn; dung sai 0,05 m² để phân loại toàn bộ/một phần/ngoài.
- **Diện tích dùng lập phương án** vẫn lấy theo hồ sơ đo đạc, trích đo được duyệt (nhập/đối chiếu trong hồ sơ thửa); số liệu bản đồ để kiểm tra chéo, chênh lệch được cảnh báo.
- Làm tròn 2 chữ số thập phân (QD-03) khi đưa vào hồ sơ.

## 5. Nền bản đồ trực tuyến (nếu người dùng chọn bật)

| Dữ liệu truyền đi | Mục đích | Chi phí |
|---|---|---|
| Tọa độ khung nhìn (ô bản đồ) gửi tới máy chủ bản đồ nền | Tải ảnh nền | OpenStreetMap: miễn phí, giới hạn sử dụng; dịch vụ thương mại: theo báo giá |

Không gửi thửa, tên chủ, hồ sơ. Mặc định **tắt**.

## 6. Kiểm thử

- `packages/gis/test/dgn.test.ts`: tệp DGN tự tạo (bộ ghi `test/viet-dgn.ts`) — VAX double, TCB, gốc tọa độ, chuỗi phức, phần tử đã xóa, cung, TCVN3, khép thửa, nhãn gộp/tách, cờ lệch diện tích, vùng ứng viên, diện tích giao.
- `packages/gis/test/tep-that.test.ts`: chạy với tệp thật khi đặt `GPMB_DGN_MAU=/đường/dẫn/GPMB.dgn` (tệp có tên người → **không đưa vào kho**).
