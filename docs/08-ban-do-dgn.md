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
| 40 | **12 vùng khép kín = các thửa đã được thu hồi** (người dùng xác nhận 28/9/2026); trùng thửa 12/12 |
| 62 | Chữ hiện trạng trong thửa: "Đã GPMB" 21, "Chưa GPMB" 23, "NQH" 9 (NQH = ghi chú thửa chưa GPMB) |
| 63, 65 | Lưới tọa độ, sơ đồ tờ |
| — | **Không có lớp ranh GPMB riêng** → phần mềm gợi ý lớp 40 làm phạm vi thu hồi (mục 8) |

Với cấu hình gợi ý (nút lớp 19 + lớp chủ 54 để đối chiếu): 73/74 thửa đủ số tờ, số thửa; **13 thửa bị cờ "Nhiều chủ"** vì tên trong nút gCadas khác tên nhãn đứng riêng (ví dụ nút ghi một người, nhãn ghi người khác; một thửa lớn chứa nhãn chủ của các thửa nhỏ lân cận) — đây là mâu thuẫn trong dữ liệu gốc, cán bộ đối chiếu hồ sơ địa chính. Một số nhãn có lỗi gõ trong dữ liệu gốc (vd. "Xó" thay "Xã": mã byte TCVN3 là của chữ "ó") — phần mềm giữ nguyên, không tự sửa.

**Gợi ý cấu hình** (`goiYCauHinh`): chỉ dựa trên cấu trúc thấy trong tệp — nút chữ ≥ 5 nút trên cùng lớp, các dòng cùng vị trí có kiểu giá trị ổn định (số lặp lại ít = số tờ; số khác nhau nhiều = số thửa; mã chữ in hoa 2–4 ký tự = loại đất; họ tên nhiều từ, khác nhau nhiều nhất = chủ); lớp chủ đứng riêng chỉ được thêm khi ≥ 50% tên trùng tên trong nút. Cấu hình đang là gợi ý thì màn Bản đồ hiện dải cảnh báo "chưa được chốt"; cán bộ chốt → lưu theo dự án.

**Hạn chế (chưa đọc, có cảnh báo khi gặp):** phần tử 3D ở V8; tham chiếu ngoài (reference); các mô hình khác ngoài mô hình mặc định; bảng tên lớp (tên lớp trong MicroStation) chưa giải mã — phần mềm hiển thị mã số lớp. Đã kiểm với 1 tệp gCadas V8i và (0.8.8) 3 tệp bản đồ trích đo khu đất MicroStation V8i 8.11 do người dùng cung cấp (đọc tại chỗ, không lưu vào kho); tệp V8 từ phần mềm khác (Famis, VietMap XM…) cần thử thêm.

**Chữ 8 bit không có dấu (0.8.8):** tệp trích đo V8i thông thường lưu chữ kiểu 17 **không** có dấu FF FE: uint16 @110 = số byte, @112 = chiều cao (đơn vị lưu × 100 — chỉ dùng hiển thị), gốc @152, 2 byte 0 tại @168, chữ (TCVN3) tại @170. Trước 0.8.8 bộ đọc chỉ nhận chữ có dấu nên bỏ sót toàn bộ nhãn của các tệp này (loại đất, số thửa, diện tích, tên chủ, địa danh). Phần tử kiểu 17 chứa "Pattern Control Element" là phần tử điều khiển mẫu tô → bỏ qua. Ba tệp mẫu không lưu tên lớp (các luồng `Dgn^Nm/$n` là định nghĩa ô dùng chung) — lớp đánh số theo Phụ lục 21. Kiểu 33 (kích thước), 35 (ô dùng chung): đọc từ 0.9.0 (dưới đây).

**Cung tròn, ô dùng chung, kích thước (0.9.0, QD-32)** — xác định trên 3 tệp V8i người dùng cung cấp (đọc tại chỗ, không lưu vào kho), kiểm thử tự động bằng tệp tổng hợp (`test/viet-dgn-v8.ts`):

| Kiểu | Cấu trúc | Cách dựng |
|---|---|---|
| 16 cung tròn 2D | @104 góc đầu, @112 góc quét (radian), @120/@128 bán trục chính/phụ, @136 góc xoay, @144 tâm | Xấp xỉ đường gấp khúc; góc quét ≤ 1/360000 độ (đơn vị góc V7, gặp ở ký hiệu vòng tròn chuyển từ V7) vẽ đủ vòng |
| 34 định nghĩa ô dùng chung | Kho phi mô hình `Dgn^Nm/$n`; thành phần theo sau mang cờ 0x40; tên ô ở liên kết thuộc tính mã 0x56D2 (uint32 độ dài @+8, chữ @+12); gốc @232 | Đọc theo tên (tệp mẫu: 954 / 230 / 274 định nghĩa) |
| 35 bản sao ô dùng chung | Ma trận xoay, tỷ lệ 3×3 theo hàng @160; gốc @232; tên ô ở liên kết 0x56D2 | Tọa độ = gốc + ma trận × (tọa độ cục bộ − gốc định nghĩa); ô lồng nhau (tối đa 4 cấp); lớp theo bản sao. Phạm vi lưu trong bản sao trùng khít phạm vi thành phần định nghĩa (dùng để đối chiếu). Tệp mẫu: dựng 73/73 và 993/993 bản sao |
| 33 kích thước | Điểm định vị: bản ghi 48 byte từ @304, byte 40–41 của mỗi bản ghi là FF FF (0.9.3: tệp TD_73 có khối 40 byte sau các điểm, không phải điểm); @192 chiều cao chữ (đơn vị lưu) | Đoạn nối các điểm định vị + nhãn chiều dài đo được (m, 2 chữ số, dấu phẩy) theo hướng đoạn. MicroStation tự dựng đường kích thước, mũi tên khi hiển thị (không lưu) — vị trí đường kích thước lệch khỏi điểm định vị chưa đọc |

**Kiểm hợp lệ (0.9.2):** thành phần ô dùng chung ngoài phạm vi của bản sao (phạm vi cục bộ @112…@152 đã biến đổi, nới 50% + 2 m) và kích thước có điểm định vị cách điểm đầu > 500 m bị bỏ, có cảnh báo — tránh vẽ đường kéo dài khi gặp cấu trúc chưa kiểm chứng (vd. điểm lưu dạng độ lệch). Tệp DC01 cho thấy định nghĩa ô có thể dùng tọa độ cục bộ không quanh gốc (vd. 44.424.835; 235.619.404) — vì vậy so với tâm phạm vi đã biến đổi, không so với gốc bản sao.

Phần tử dựng thêm (thành phần ô dùng chung, kích thước) chỉ để **xem**: `phanTuGoc()` loại chúng khỏi bước dựng thửa và gợi ý cấu hình lớp — số thửa, nhãn thửa của 3 tệp mẫu giống hệt trước khi đọc các kiểu này (9 / 107 / 87 thửa). Bảng thông tin phần tử ghi "Ô dùng chung TÊN" hoặc "Kích thước".

## 8. Yêu cầu bản đồ, phạm vi thu hồi và nhãn hiện trạng (28/9/2026)

**Căn cứ phân lớp:** mục I Phụ lục số 21 Thông tư số 26/2024/TT-BTNMT (điểm d khoản 1 Điều 16), đã được sửa đổi bởi điểm b khoản 8 Điều 8 Thông tư số 23/2025/TT-BNNMT (bãi bỏ đối tượng địa giới huyện — lớp 44, 45). Bảng lớp đưa vào `packages/gis/src/phan-lop.ts` (`LOP_PL21`), hiện ở cột "Theo PL 21" trong hộp Cấu hình lớp. Một số lớp PL 21 dùng tới: 10 ranh giới thửa hiện trạng, 61 ranh giới thửa theo giấy tờ, 11 điểm nhãn thửa, 13 số thứ tự thửa, 2 loại đất hiện trạng, 4 diện tích, 29 loại đất pháp lý; **30 là đường mép nước, 40 là biên giới quốc gia**. Điểm d khoản 1 Điều 16 cho phép "tận dụng các lớp bản đồ số còn bỏ trống để thể hiện yếu tố thuộc tính khác của thửa đất" — lớp 62 (không có trong PL 21) dùng ghi chú GPMB là phù hợp; lớp 40 dùng cho thửa đã thu hồi là **quy ước địa phương** trùng lớp biên giới quốc gia → phần mềm nhắc cán bộ xác nhận (Sơn La có xã biên giới).

Điểm k khoản 1 Điều 16 TT 26/2024: khi đo đạc xác định ranh giới khu đất bị thu hồi tại nơi đã có bản đồ địa chính thì tách khu vực thu hồi thành mảnh bản đồ đo đạc bổ sung — nên ranh thu hồi thường nằm ở **tệp riêng**; nạp ranh từ tệp DGN/DXF riêng (PA5) để giai đoạn sau.

**Kiểm tra bản đồ** (thẻ bên phải màn Bản đồ): khép thửa; tọa độ VN-2000 trong khoảng của Sơn La; tỷ lệ thửa có số tờ/số thửa (≥ 90%), loại đất (≥ 90%), diện tích ghi (≥ 80%), chủ sử dụng (≥ 80%); phạm vi thu hồi đã chọn chưa; phân lớp theo PL 21; nhãn hiện trạng và số thửa lệch tiến độ. Mỗi mục thiếu có nút mở việc cần làm. Các ngưỡng % là ngưỡng cảnh báo của phần mềm, **không phải quy định pháp luật**.

**Ba cách xác định thửa thu hồi** (cán bộ chọn theo hồ sơ được duyệt, phần mềm không tự chọn):
1. Chọn **nhiều vùng** trên lớp ranh GPMB / lớp vùng thửa thu hồi (tích từng vùng hoặc "Chọn tất cả"); diện tích thu hồi = phần giao giữa thửa và **hợp** các vùng đã chọn (toàn bộ / một phần).
2. **Chọn thửa trực tiếp**: bấm thửa trên bản đồ (chế độ chọn thửa) hoặc tích cột "TH" ở bảng thửa; thửa chọn tay ngoài vùng được tính thu hồi toàn bộ (thu hồi một phần: sửa diện tích trong hồ sơ).
3. Theo **nhãn hiện trạng**: thêm các thửa ghi "Chưa GPMB/NQH", hoặc mọi thửa có nhãn.

Lưu theo dự án: `banDo.vungChonDs`, `banDo.thuaChon`.

**Gợi ý tự động** (`goiYCauHinh`): lớp chữ có ≥ 5 chữ, ≥ 60% dạng "Đã/Chưa GPMB", "NQH" → `nhanHienTrang`; nếu lớp ranh GPMB trống: lớp có ≥ 3 vùng khép kín, ≥ 60% vùng có tâm nằm trong một thửa và diện tích ≤ 102% thửa → `ranhGpmb`, kèm ghi chú yêu cầu cán bộ xác nhận. DC5: gợi ý lớp 40 (12 vùng → 12 thửa thu hồi toàn bộ) và lớp 62 (53 thửa có nhãn).

**Nhãn hiện trạng chỉ để đối chiếu:** không ghi đè tiến độ 16 bước; thửa đã gắn hồ sơ mà nhãn khác tiến độ ("Đã GPMB" nhưng hồ sơ chưa hoàn thành, hoặc ngược lại) được đánh dấu để kiểm tra.

**Tạo hồ sơ:** nút luôn bấm được; chưa có phạm vi → hộp thoại giải thích 2 cách. Nhóm thửa theo chủ sử dụng; thửa nghi vấn (cờ đọc bản đồ, chưa rõ chủ, thiếu số tờ/thửa) đánh dấu ⚠ — phải tích xác nhận đã kiểm tra mới tạo được; lý do ghi vào ghi chú thửa. DC5 (Playwright): 12 vùng + 32 thửa "Chưa GPMB/NQH" → 14 hồ sơ / 44 thửa.

**Kiểm thử:** `packages/gis/test/thu-hoi.test.ts` (tệp tổng hợp: phân loại nhãn, gợi ý lớp 62 và lớp 40, bản đồ không có lớp hiện trạng, hợp nhiều vùng 300 m², bảng PL 21); `dgn-v8.test.ts` với `GPMB_DGN_V8` kiểm DC5 gợi ý lớp 40 và 62.

## 9. Lộ trình bản đồ phục vụ GPMB (đề xuất 30/9/2026, người dùng chọn thứ tự làm)

| # | Tính năng | Lợi ích |
|---|---|---|
| 1 | Ranh GPMB → tự tính DT thu hồi từng thửa: nạp tọa độ mốc (Excel), lấy từ tệp DGN khác, hoặc vẽ trên bản đồ; tự cắt thửa, điền DT thu hồi và DT còn lại vào hồ sơ | Bỏ nhập tay, tránh lệch diện tích |
| 2 | Cảnh báo phần đất còn lại nhỏ hơn diện tích tối thiểu tách thửa (Điều 13–16 Phụ lục I QĐ 106/2025) | Phát hiện sớm thửa cần xem xét thu hồi phần còn lại — căn cứ thu hồi do cán bộ xác nhận, phần mềm không tự kết luận |
| 3 | Chọn nhiều thửa trên bản đồ (quét khung): bảng tổng hợp số hộ, DT, tổng tiền, tiến độ; thao tác hàng loạt (tạo hồ sơ, xếp đợt, phân công, mở danh sách hộ đã lọc) | Làm việc theo khu vực, đoạn tuyến |
| 4 | Tìm thửa/chủ trên bản đồ (tờ/thửa, tên) → phóng tới; bấm thửa hiện thẻ tóm tắt hộ và nút mở hồ sơ | Tra cứu nhanh khi họp, tiếp dân |
| 5 | Xuất PDF bản đồ tiến độ GPMB (A3/A4, khung, chú giải, tỷ lệ, tô màu theo hiện trạng) — dùng `taiXuong` | Báo cáo, họp (không phải trích lục thửa) |
| 6 | Lớp ghi chú hiện trường (điểm/đường: vướng mắc, mộ, công trình chưa kiểm đếm), gắn với hộ, lưu theo dự án | Theo dõi vướng mắc tại chỗ |
| 7 | Chồng điểm đo hiện trạng (Excel tọa độ VN-2000), gắn vị trí tài sản kiểm đếm | Đối chiếu kiểm đếm với thực địa |
| 8 | So sánh hai bản đồ (trích đo lần đầu và bổ sung): tô thửa thay đổi hình dạng/diện tích | Kiểm soát điều chỉnh phương án |
| 9 | Ghép nhiều tờ/tệp trong một dự án, đọc tham chiếu ngoài | Dự án tuyến dài nhiều tờ |
| 10 | Bắt điểm nâng cao (trung điểm, giao điểm, vuông góc), lưu kết quả đo | Đo kiểm nhanh hơn |
