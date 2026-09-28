# 08. Bản đồ địa chính DGN trong phiên bản 1

## 1. Phạm vi

| Hạng mục | Trạng thái |
|---|---|
| Đọc DGN MicroStation **V7** (2D; 3D đọc tọa độ, bỏ quay) | **Đã chạy, đã kiểm thử** (tệp tự tạo + tệp thật) |
| Giải mã chữ **TCVN3** (ABC) | **Đã chạy, đã kiểm thử** |
| Khép thửa từ đường ranh, gắn nhãn tờ/thửa/loại đất/diện tích/chủ sử dụng | **Đã chạy, đã kiểm thử** trên tệp thật |
| Vùng ranh GPMB ứng viên, diện tích thu hồi từng thửa (phần giao) | **Đã chạy, đã kiểm thử** (khớp Shapely tuyệt đối) |
| Đọc DGN **V8 / V8i** (tệp ghép OLE, khối phần tử nén zlib; 2D) | **Đã chạy, đã kiểm thử** (tệp tổng hợp + 1 tệp thật gCadas V8i). Hạn chế: xem §7 |
| Nút thuộc tính thửa **gCadas** (nút chữ nhiều dòng tờ/thửa/địa chỉ/loại đất/chủ) | **Đã chạy, đã kiểm thử** — tự nhận dạng, cán bộ xem và chốt |
| Cấu hình lớp trên màn Bản đồ (thống kê lớp + gợi ý) | **Đã chạy** (kiểm tra giao diện bằng Playwright trên tệp thật) |
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
6. **Nút thuộc tính** (nếu cấu hình): cả nút gán cho thửa chứa dòng đầu của nút; giá trị trong nút cộng vào cùng danh sách ứng viên với nhãn đứng riêng — hai nguồn khác nhau → cờ "Nhiều chủ"/"Nhiều số tờ"…, phần mềm không tự chọn nguồn nào đúng.
7. Mọi trường hợp không chắc chắn → gắn cờ; **dữ liệu bản đồ là đề xuất**, cán bộ xác nhận trước khi đưa vào hồ sơ thửa.

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
- `packages/gis/test/dgn-v8.test.ts`: tệp CFB/DGN V8 tự tạo (bộ ghi `test/viet-dgn-v8.ts`; tệp CFB tạo ra được đối chiếu độc lập bằng thư viện Python `olefile`) — mini stream/FAT, kho lồng nhau, tệp hỏng, UOR/gốc toàn cục, nhiều khối, chuỗi phức, chữ 8 bit và UTF-16, phần tử điều khiển, cảnh báo 3D/cung, nhận dạng nút gCadas, đối chiếu chéo lớp chủ, cờ mâu thuẫn. Tệp thật: `GPMB_DGN_V8=/đường/dẫn/tệp.dgn`.

## 7. DGN V8 / V8i

**Cấu trúc** (xác định từ tệp mẫu gCadas V8i người dùng cung cấp, không có tài liệu công khai đầy đủ của Bentley): tệp ghép OLE; mô hình mặc định ở kho `Dgn-Md/#000000`; `Dgn~Mh` (nén zlib) chứa phần tử đầu mô hình (kiểu 66: UOR/đơn vị lưu, gốc toàn cục); `Dgn^G/$n` là các khối phần tử (16 byte đầu, uint32 số phần tử, rồi dữ liệu zlib). Tọa độ = (giá trị lưu − gốc toàn cục) / UOR. Phần tử cuối mỗi khối khai báo dài hơn dữ liệu 4 byte (đã xử lý). Số phần tử đọc được được đối chiếu với số khai báo từng khối; lệch → cảnh báo.

**Kết quả trên tệp mẫu DC5** (tờ 5, gCadas; có họ tên chủ sử dụng → **không đưa vào kho**): 3.807 phần tử, đọc trong ~30 ms, không lệch số khai báo; UOR 1.000/m; tọa độ VN-2000 (X ≈ 506 km, Y ≈ 2.352 km). **74 thửa**; 64 thửa có nhãn diện tích, diện tích ghi khớp diện tích hình học trong 0,1% (lệch lớn nhất 0,38 m² trên 1.490,7 m²).

| Lớp (tệp mẫu) | Nội dung |
|---|---|
| 10 | Ranh thửa |
| 13 | Nhãn thửa tách rời (loại đất · số thửa · diện tích) |
| 19 | 73 nút thuộc tính gCadas: dòng 1 số tờ, 2 số thửa, 3 địa chỉ, 4 loại đất, 5 chủ sử dụng |
| 54 | Nhãn chủ sử dụng đứng riêng (88% trùng tên trong nút) |
| 53, 56 | Loại đất, địa chỉ đứng riêng (không dùng) |
| 62, 63, 65 | Hiện trạng ("Đã/Chưa GPMB", "NQH"), lưới tọa độ, sơ đồ tờ |
| — | **Không có lớp ranh GPMB riêng**; cán bộ chọn lớp phù hợp trong "Cấu hình lớp" |

Với cấu hình gợi ý (nút lớp 19 + lớp chủ 54 để đối chiếu): 73/74 thửa đủ số tờ, số thửa; **13 thửa bị cờ "Nhiều chủ"** vì tên trong nút gCadas khác tên nhãn đứng riêng (ví dụ nút ghi một người, nhãn ghi người khác; một thửa lớn chứa nhãn chủ của các thửa nhỏ lân cận) — đây là mâu thuẫn trong dữ liệu gốc, cán bộ đối chiếu hồ sơ địa chính. Một số nhãn có lỗi gõ trong dữ liệu gốc (vd. "Xó" thay "Xã": mã byte TCVN3 là của chữ "ó") — phần mềm giữ nguyên, không tự sửa.

**Gợi ý cấu hình** (`goiYCauHinh`): chỉ dựa trên cấu trúc thấy trong tệp — nút chữ ≥ 5 nút trên cùng lớp, các dòng cùng vị trí có kiểu giá trị ổn định (số lặp lại ít = số tờ; số khác nhau nhiều = số thửa; mã chữ in hoa 2–4 ký tự = loại đất; họ tên nhiều từ, khác nhau nhiều nhất = chủ); lớp chủ đứng riêng chỉ được thêm khi ≥ 50% tên trùng tên trong nút. Cấu hình đang là gợi ý thì màn Bản đồ hiện dải cảnh báo "chưa được chốt"; cán bộ chốt → lưu theo dự án.

**Hạn chế (chưa đọc, có cảnh báo khi gặp):** cung tròn (kiểu 16) và phần tử 3D ở V8; ô dùng chung (shared cell) và tham chiếu ngoài (reference); các mô hình khác ngoài mô hình mặc định; bảng tên lớp (tên lớp trong MicroStation) chưa giải mã — phần mềm hiển thị mã số lớp. Mới kiểm với **một** tệp V8i thật (gCadas); tệp V8 từ phần mềm khác (Famis, VietMap XM…) cần thử thêm.
