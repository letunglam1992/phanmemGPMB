# 16. Đối chiếu phương án đã phê duyệt (hồ sơ đối chiếu số 1)

Hồ sơ do người dùng cung cấp ngày 28/9/2026: Tờ trình của Phòng Kinh tế xã và dự thảo Quyết định của Chủ tịch UBND xã phê duyệt phương án bồi thường, hỗ trợ, tái định cư; kèm Phụ lục I (bảng tổng hợp) và Phụ lục II (phương án chi tiết) — mỗi phụ lục có bản kèm Tờ trình và bản kèm Quyết định. Dự án: Khu công nghiệp, xã Chiềng Mung, đợt 1. **Không đưa vào kho mã:** tệp gốc, tên người, số định danh, số tờ/thửa. Bài kiểm thử `apps/desktop/test/doi-chieu-pa-duyet.test.ts` chỉ giữ diện tích, số lượng, đơn giá.

## 1. Quy mô

1 đối tượng; 2 thửa CLN (6.358,8 m² + 5.523,2 m² = 11.882 m²); 63 dòng cây trồng (61 loại – cỡ cây, 2 dòng tách phần vượt mật độ); tổng **3.979.678.700 đ**, gồm:

| Khoản | Hồ sơ | Phần mềm | Kết quả |
|---|---|---|---|
| Đất (54.000 đ/m² × 100%) | 641.628.000 | 641.628.000 | Khớp |
| Cây trồng | 1.413.166.700 | 1.413.166.700 *(sau khi cán bộ chọn cách tính ở VM-35 và nhập mật độ đào)* | Khớp đến đồng |
| Hỗ trợ đào tạo, chuyển đổi nghề (3 × 54.000 × DT) | 1.924.884.000 | 1.924.884.000 | Khớp |
| Tổng | 3.979.678.700 (không làm tròn) | 3.979.679.000 (mặc định QD-03: làm tròn lên đến nghìn đồng ở cấp hộ); chọn "Không làm tròn" ở thông tin dự án → 3.979.678.700 | Khớp khi chọn như hồ sơ — VM-36 |

## 2. Số học, đơn giá, dữ liệu nguồn

- Số học: 63/63 dòng cây, tổng từng thửa, tổng a + b + c, tổng diện tích — **đúng**.
- Đơn giá cây: 61/61 loại – cỡ cây **trùng** danh mục PL VIII QĐ 106/2025 mà phần mềm trích xuất.
- Giá đất CLN xã Chiềng Mung 54.000 đ/m² — **trùng** NQ 152/2025 Bảng 02, STT 45.
- Hệ số chuyển đổi nghề 3 — **trùng** mức mặc định Điều 14 PL II QĐ 106/2025 (xã không thuộc nhóm hệ số 4, 5).
- Quỹ mật độ (k4 Đ5 PL VIII): Nhãn, Xoài 400 cây/ha × 150% = 600 cây/ha; thửa 1: 6.358,8 m² → 381 cây hưởng 100%; thửa 2: 5.523,2 m² → 331 cây. Dòng ranh giới tách 80 cây 100% + 98 cây 30% (thửa 1); 92 + 183 (thửa 2); các dòng sau hưởng 30% — **trùng** thuật toán A14 của phần mềm (VM-34, QD-20).

## 3. Điểm phần mềm khác hồ sơ — đã xử lý

| Điểm | Trước | Nay |
|---|---|---|
| Cây không có mật độ quy định trên thửa trồng xen (chuối, đu đủ, cỏ, dứa, rau ngót) | Phần mềm tự tính 100% (hồ sơ tính 30%) → chênh +24.791.200 đ | Dòng ở trạng thái **Cần xác nhận**, không cộng vào tổng; cán bộ chọn 100% hoặc 30% ở thẻ Thửa đất, **bắt buộc lý do** (VM-35) |
| Cây đào: nhóm "Mơ, Đào, Mai anh đào (800 cây/ha), táo (625 cây/ha)" có hai mật độ nên danh mục để trống | Tính 100% (hồ sơ: 30%) → chênh +946.400 đ | Cùng xử lý VM-35; cán bộ nhập mật độ 800 ở thẻ Kiểm đếm thì dòng được xếp vào quỹ như hồ sơ |

## 4. Bổ sung sau quyết định QD-23

- **B13 — đất nguồn gốc nông, lâm trường (k9 Đ6 QĐ 14/2026):** đã làm. Cán bộ chọn trường hợp cho từng thửa (9.1.a/b/c, 9.2.a/b) và ghi hồ sơ xác nhận nguồn gốc. Chạy lại hồ sơ đối chiếu với trường hợp 9.1.a: khoản đất 641.628.000 đ chuyển sang **Hỗ trợ về đất**, cây trồng 1.413.166.700 đ sang **Hỗ trợ cây trồng**, kèm căn cứ điểm a mục 9.1; số tiền không đổi. Dòng "Hỗ trợ ổn định đời sống" ở trạng thái Cần xác nhận cho đến khi nhập DT đất NN đang sử dụng (VM-38).
- 9.1.b, 9.1.c (có nhà ở, đất ở, khấu trừ nghĩa vụ tài chính): phần mềm **chưa tính tự động** — dòng Cần xác nhận, cán bộ tính và nhập kèm căn cứ.
- Làm tròn: chọn "Không làm tròn" ở thông tin dự án thì tổng khớp hồ sơ (3.979.678.700 đ) — VM-36.
- Mẫu Tờ trình, QĐ phê duyệt phương án của xã: đã đưa vào danh mục (R4, R5 — docs/10 §3a).

## 5. Nội dung văn bản cần xem lại (để người dùng cân nhắc — phần mềm không sửa hồ sơ)

| # | Vị trí | Nội dung |
|---|---|---|
| 1 | Tờ trình, QĐ mục 8.1.a; PL I; PL II | Cùng một khoản đất có 3 tên: "Bồi thường chi phí đầu tư vào đất còn lại" / "Bồi thường về đất" / "Hỗ trợ … đất có nguồn gốc từ nông, lâm trường quốc doanh". Căn cứ 9.1.a k9 Đ6 QĐ 14/2026 là **hỗ trợ bằng 01 lần giá đất NN**; cách gọi "chi phí đầu tư vào đất còn lại" thuộc mục 9.2.a (VM-37) |
| 2 | Tờ trình, QĐ mục 8.1.b; PL II | "Bồi thường tài sản, hoa màu" nhưng PL II xếp vào phần B (hỗ trợ), Tổng cộng (A) = 0 |
| 3 | Tờ trình, QĐ mục 8.1.a, b | Kết thúc bằng "gồm:" nhưng không liệt kê chi tiết |
| 4 | PL I (cả hai bản) | Dòng "TỔNG KINH PHÍ (Làm tròn số)" = 3.979.678.000 ≠ 3.979.678.700 ở dòng trên, ở Tờ trình và QĐ (VM-36) |
| 5 | Tờ trình, QĐ mục 3 và 8.1.c | "Phương án đào tạo, chuyển đổi nghề: Không" trong khi có khoản hỗ trợ đào tạo, chuyển đổi nghề 1.924.884.000 đ — nên ghi rõ "hỗ trợ bằng tiền theo mục 8.1.c" |
| 6 | QĐ, Nơi nhận | "Như Điều 3" nhưng trách nhiệm thi hành quy định tại Điều 4 |
| 7 | QĐ Điều 4 | "hộ gia đình, cá nhân có tên tại Điều 1" — Điều 1 không nêu tên (tên nằm ở Phụ lục) |
| 8 | Tờ trình, phần căn cứ | Không có QĐ 14/2026/QĐ-UBND — căn cứ trực tiếp của các khoản hỗ trợ (QĐ đã có) |
| 9 | PL II | Cột "Căn cứ pháp lý" để trống ở mọi dòng |
| 10 | PL II | Không có khoản hỗ trợ ổn định đời sống và không ghi lý do; 9.1.a có khoản này khi thu hồi từ 10% đất NN đang sử dụng (VM-38) |
| 11 | PL II, nguồn gốc đất | Đất đã thu hồi năm 2008 **giao Ban Quản lý KCN**; mục 9.1 nêu diện tích "bàn giao cho UBND cấp huyện (nay là cấp xã) quản lý" — nên ghi rõ căn cứ áp dụng 9.1 (VM-37) |
| 12 | PL II | Cây trồng hàng năm, hoa màu (chuối, đu đủ, cỏ, dứa, rau) tính 30%; k4 Đ5 PL VIII nói về "nhiều loại cây lâu năm" (VM-35) |
| 13 | PL II thửa 1, dòng 31 | "Rau ngọt" — danh mục ghi "Cây rau ngót" |
| 14 | Tờ trình, căn cứ | Viện dẫn công văn cung cấp thông tin "hộ gia đình" trong khi đối tượng là "01 cá nhân" — nên thống nhất (liên quan đối tượng hỗ trợ chuyển đổi nghề) |
