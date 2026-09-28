# 10. Mẫu văn bản theo Sổ tay QĐ 1966/QĐ-UBND

## 1. Nguồn và cách dựng

- Nội dung: 22 mẫu tại Phần III Sổ tay trình tự, thủ tục bồi thường, hỗ trợ, tái định cư ban hành kèm **Quyết định số 1966/QĐ-UBND ngày 05/8/2025**.
- Bản Word của Sổ tay là bản chuyển từ PDF (tiêu đề nằm trong khung chữ, chữ dính, số chú thích lẫn vào câu), nên **không cắt trực tiếp** mà dựng lại sạch bằng `tools/mau-van-ban/tao-mau.mjs`. Câu chữ theo Sổ tay (đã sửa lỗi chuyển đổi); thể thức theo **Nghị định 30/2020/NĐ-CP**: A4, lề 20/20/30/15 mm, Times New Roman, quốc hiệu – tiêu ngữ, số ký hiệu, địa danh ngày tháng, trích yếu, căn cứ nghiêng, nơi nhận, khối chữ ký.
- Tệp mẫu: `apps/desktop/public/mau-van-ban/mau-01.docx … mau-22.docx`, trường tự điền dạng `{ten_truong}`, danh sách lặp `{#ten}…{/ten}`.
- **Thứ tự Mẫu 14/15 (VM-23):** danh mục Phần III ghi 14 = QĐ thu hồi, 15 = QĐ phê duyệt; nội dung mẫu thực tế ngược lại. Phần mềm theo **nội dung**: 14 = QĐ phê duyệt phương án, 15 = QĐ thu hồi đất.

## 2. Danh mục

| Mẫu | Tên | Bước | Phạm vi |
|---|---|---|---|
| 01 | Thông báo thu hồi đất | 3 | Từng hộ |
| 02 | Thông báo kiểm kê hiện trạng | 4 | Từng hộ |
| 03 | Tờ tự khai (kèm bảng thửa, tài sản đã kiểm đếm) | 4 | Từng hộ |
| 04 | Biên bản kiểm kê hiện trạng đất, tài sản | 4 | Từng hộ |
| 05 | Biên bản tuyên truyền, vận động phối hợp kiểm đếm | 4 | Từng hộ |
| 06 | QĐ kiểm đếm bắt buộc | 4 | Từng hộ |
| 07 | QĐ cưỡng chế thực hiện QĐ kiểm đếm bắt buộc | 4 | Từng hộ |
| 08 | Biên bản hội nghị lấy ý kiến về phương án | 7 | Dự án |
| 09 | Biên bản niêm yết công khai phương án | 6 | Dự án |
| 10 | Biên bản kết thúc niêm yết | 6 | Dự án |
| 11 | Tờ trình đề nghị thẩm định phương án | 8 | Dự án |
| 12 | Tờ trình thu hồi đất (kèm danh sách) | 8 | Dự án |
| 13 | Tờ trình đề nghị phê duyệt phương án | 8 | Dự án |
| 14 | QĐ phê duyệt phương án | 9 | Dự án |
| 15 | QĐ thu hồi đất | 13 | Từng hộ |
| 16 | Biên bản giao quyết định | 11 | Từng hộ |
| 17 | Biên bản vận động nhận tiền, bàn giao mặt bằng | 12 | Từng hộ |
| 18 | TB gửi tiền vào tài khoản tiền gửi | 12 | Từng hộ |
| 19 | Biên bản giao TB gửi tiền | 12 | Từng hộ |
| 20 | Tờ trình danh sách hỗ trợ bàn giao mặt bằng sớm | 12 | Dự án |
| 21 | QĐ phê duyệt danh sách hỗ trợ bàn giao mặt bằng sớm | 12 | Dự án |
| 22 | QĐ cưỡng chế thu hồi đất | 14 | Từng hộ |

## 3. Dữ liệu tự điền

| Nhóm | Trường (ví dụ) | Nguồn |
|---|---|---|
| Dự án | `ten_du_an`, `ten_xa`, `TEN_XA`, `dia_danh`, `tong_dt_thu_hoi`, `dt_theo_loai[]`, `so_doi_tuong`, `so_to_chuc`, `so_ca_nhan`, `ds_ho[]` | Hồ sơ dự án, thửa |
| Tiền | `bt_dat`, `bt_tai_san`, `ho_tro`, `tien_bthttdc`, `tong_gia_tri` (+ chi phí tổ chức nếu nhập), `…_chu` (bằng chữ) | Kết quả tính (tổng hộ đã làm tròn) |
| Hộ | `ho_ten`, `dia_chi`, `dt_thu_hoi`, `thua_mo_ta` ("thửa đất số 85 (toàn bộ thửa đất), tờ bản đồ số 5; …"), `thua[]`, `tai_san[]`, `tong_tien`, `tong_tien_chu`, `thuc_nhan` | Hồ sơ hộ |
| Chung | cơ quan, phòng, đơn vị bồi thường, người ký, quyền hạn, căn cứ, thành phần tham gia, lý do thu hồi | Lưu ở dự án (sửa trong màn Văn bản) |
| Văn bản trước | `tb_thu_hoi_so/ngay`, `qd_kiem_dem_…`, `qd_phe_duyet_…`, `qd_thu_hoi_…`, `tb_gui_tien_…` | **Tự ghi khi tạo văn bản có số** (Mẫu 01, 06, 14, 15, 18, 21), sửa được trong hồ sơ |

- **Căn cứ mặc định** trích nguyên văn phần căn cứ của QĐ 14/2026/QĐ-UBND (Luật TCCQĐP 72/2025/QH15; Luật Đất đai 31/2024/QH15 và các luật sửa đổi; NQ 254/2025/QH15; NĐ 88/2024/NĐ-CP) và QĐ 106/2025, QĐ 14/2026 của UBND tỉnh. Cán bộ phải kiểm tra hiệu lực, bổ sung căn cứ riêng của dự án (kế hoạch sử dụng đất, chủ trương đầu tư…) theo chú thích của Sổ tay.
- Ô để trống → in "…………" để viết tay; số và ngày ký để trống → chừa khoảng cho văn thư.
- Tạo cho nhiều hộ: nhập số bắt đầu → tự tăng; kết quả đóng gói `.zip`; mỗi hồ sơ được ghi nhật ký.

## 3a. Mẫu riêng của xã (R1–R5), song song với mẫu Sổ tay

Dựng từ 03 tệp người dùng gửi (Tờ trình đề nghị thu hồi đất, Báo cáo thẩm định, QĐ thu hồi đất theo đợt) bằng `tools/mau-van-ban/mau-rieng.py`: giữ thể thức, bố cục, bảng danh sách 17 cột (có cột giấy chứng nhận) của bản gốc; thay nội dung cụ thể bằng trường tự điền.

| Mã | Mẫu | Cơ quan ban hành | Phạm vi | Ghi lại sau khi tạo |
|---|---|---|---|---|
| R1 | Tờ trình đề nghị thu hồi đất (bước 13) | Phòng chuyên môn | Theo đợt (chọn hộ) | Số tờ trình vào dự án |
| R2 | Báo cáo thẩm định hồ sơ thu hồi đất | Phòng chuyên môn | Theo đợt | — |
| R3 | Quyết định thu hồi đất theo đợt | UBND xã | Theo đợt | Số QĐ thu hồi vào từng hộ trong đợt |
| R4 | Tờ trình đề nghị phê duyệt phương án (bước 8) | Phòng chuyên môn | Theo đợt | Số tờ trình vào dự án (R5 dẫn lại) |
| R5 | Quyết định phê duyệt phương án (bước 9) | UBND xã | Theo đợt | Số QĐ phê duyệt vào dự án |

R4, R5 dựng từ 02 tệp người dùng gửi ngày 28/9/2026 bằng `tools/mau-van-ban/mau-rieng-pa.py` (hàm dùng chung: `tien_ich_mau.py`; cấu hình tên người ký, chuỗi cấm `thay-the-pa.json` để ngoài kho mã). Tự điền: danh sách thửa ("Thửa số …; mảnh trích đo địa chính số …" — cách ghi tờ bản đồ sửa được), số đối tượng theo loại ("01 cá nhân"), tổng giá trị và bằng chữ, **các khoản a, b, c… lấy theo nhóm của bảng tính** (Bồi thường về đất / Hỗ trợ về đất / Hỗ trợ cây trồng… — tên khoản đúng loại bồi thường hay hỗ trợ, VM-37), dòng "Chênh lệch làm tròn" nếu tổng sau làm tròn khác tổng các khoản. So với bản gốc: Điều 4 dẫn "có tên tại Phụ lục kèm theo", nơi nhận mặc định "Như Điều 4" (docs/16 §5, điểm 6, 7).

- **Ẩn danh hóa:** đã xóa toàn bộ tên người, số văn bản, địa danh cụ thể, **ảnh chữ ký tay** có trong tệp gốc, thông tin tác giả (email) trong thuộc tính tệp. Kịch bản dựng tự kiểm tra lại và dừng nếu còn sót.
- **Theo đợt:** chọn các hộ trong đợt (mặc định tất cả) → một văn bản chung; diện tích, danh sách thửa, số đối tượng tính trên các hộ được chọn. Trường `pham_vi_dot` (ví dụ "đợt 1") in trong ngoặc sau tên dự án nếu có.
- **Diện tích được / không được bồi thường:** phần mềm **không tự xác định** thửa nào không được bồi thường. Cán bộ đánh dấu ô "Diện tích thu hồi không được bồi thường, hỗ trợ về đất" ở từng thửa (màn Hồ sơ → Thửa đất → mở rộng dòng); thửa không đánh dấu được tính vào diện tích được bồi thường, tách hộ gia đình, cá nhân / tổ chức và theo loại đất.
- **Cột giấy chứng nhận** (số phát hành, tờ, thửa, diện tích, loại đất, diện tích thu hồi có GCN): nhập ở cùng mục mở rộng của thửa; bỏ trống thì ô bảng để trống (không in dấu chấm). Diện tích không có GCN = diện tích thu hồi − diện tích thu hồi có GCN.
- **Người ký theo cơ quan ban hành:** mẫu của phòng dùng "TRƯỞNG PHÒNG" + người ký của phòng; mẫu của đơn vị bồi thường dùng "GIÁM ĐỐC"; mẫu của UBND dùng người ký UBND — sửa trong "Thông tin chung → Ký".
- Mẫu Sổ tay và mẫu riêng dùng chung dữ liệu; cán bộ chọn mẫu phù hợp thực tế của xã.

## 4. Cán bộ tự chỉnh mẫu

1. Màn **Văn bản** → chọn mẫu → **Tải mẫu** (tệp có các trường `{…}`).
2. Sửa trong Word; giữ nguyên các trường (gõ liền, không đổi định dạng giữa chừng).
3. **Thay mẫu…** → chọn tệp đã sửa. Phần mềm kiểm tra cú pháp, điền thử, báo các trường của mẫu gốc không còn dùng. Mẫu riêng lưu trên máy; **Khôi phục mẫu gốc** bất kỳ lúc nào.

## 5. Kiểm thử

- `apps/desktop/test/van-ban.test.ts`: điền đủ 22 mẫu với dữ liệu mẫu ẩn danh, không còn trường chưa thay; kiểm tra số liệu Mẫu 14 (diện tích theo loại đất, bằng chữ, căn cứ, nơi nhận), Mẫu 15 (diện tích, mô tả thửa, lý do), cộng chi phí tổ chức vào tổng giá trị, ô trống in dấu chấm.
- `apps/desktop/test/doc-so.test.ts`: đọc số tiền thành chữ (linh, mốt, tư, lăm, không trăm…).
- Mẫu riêng R1–R3: điền với 1 hộ + 1 tổ chức, 1 thửa đánh dấu không bồi thường; kiểm tra phạm vi đợt, số đối tượng, diện tích được/không được bồi thường theo loại đất, dòng GCN, nơi nhận, người ký theo cơ quan; không còn tên thật trong tệp.
- Mẫu riêng R4, R5: điền với dữ liệu mẫu; kiểm tra danh sách thửa, số đối tượng, các khoản a, b, c… cộng đúng tổng sau làm tròn, dẫn số Tờ trình R4 vào R5, "Như Điều 4". Đã xem bản PDF dựng bằng LibreOffice.
- Chạy thử giao diện: tạo Mẫu 15 cho 2 hộ (số tự tăng 25, 26), Mẫu 14 cho dự án; đã mở tệp kiểm tra nội dung; kết xuất PDF bằng LibreOffice để xem thể thức.

## 6. Hạn chế

- Văn bản xuất ra là **dự thảo**: cán bộ kiểm tra, chỉnh sửa trước khi trình ký.
- Mẫu riêng R1–R3: kết luận thẩm định mặc định "Đủ điều kiện thu hồi đất…" chỉ là câu gợi ý — cán bộ thẩm định phải sửa theo kết quả thực tế. Tệp gốc chuyển từ .doc có một số lỗi cấu trúc (đánh số, kiểu đoạn) sẵn có; Word/LibreOffice mở bình thường.
- Danh sách hỗ trợ bàn giao mặt bằng sớm (Mẫu 20, 21) chưa có dữ liệu tính trong phần mềm → bảng để trống điền tay.
