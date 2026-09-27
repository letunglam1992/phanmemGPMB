# 04. Phạm vi phiên bản 1, giao diện, kiến trúc, lộ trình

## 1. Phạm vi đề xuất phiên bản 1 (v1)

**Nguyên tắc**: v1 phải hoàn chỉnh **một luồng nghiệp vụ đầu–cuối cho hộ gia đình, cá nhân**, dùng trên một máy nhưng kiến trúc sẵn sàng cho mạng nội bộ.

| Nhóm | Trong v1 | Để sau v1 |
|---|---|---|
| Hồ sơ | Dự án; người có đất thu hồi / chủ sở hữu (cá nhân, hộ, đồng sở hữu); thửa (loại đất, DT thửa, DT thu hồi, nguồn gốc, thời điểm sử dụng); tài sản; giấy tờ; tệp đính kèm | Tổ chức (doanh nghiệp, đơn vị sự nghiệp); bản đồ/GIS |
| Kiểm đếm | Nhà, công trình (QĐ32); cây trồng (PLVIII Biểu 01–03); thủy sản (Biểu 04); vật nuôi di dời (PLV); mồ mả | Dự toán tư vấn chi tiết theo công tác (chỉ nhập kết quả đã thẩm định) |
| Tính toán | Nhóm A (trừ A21 chưa có văn bản tỉnh), nhóm C (C03 nhập tay theo định mức), B01–B02, B05, B07–B12; giá đất BT **nhập theo văn bản phê duyệt giá** cho đến khi xác nhận VM-20; tra cứu giá bảng giá NQ152 (đất NN, đất ở, TMDV, SXKD, KCN) phục vụ C06, C11, C12, B07 | B03–B04, B06 (cần hạn mức, công thức gốc), B13 (nông lâm trường), B14; tái định cư chi tiết (bố trí lô, bốc thăm) |
| Phương án | Phiên bản phương án (Tạm tính → Đã kiểm tra → Đã chốt → Đã phê duyệt); đóng băng kết quả; so sánh 2 phiên bản; điều chỉnh thủ công có phân quyền, lý do | Theo dõi chi trả, khấu trừ nghĩa vụ tài chính |
| Quy trình | 16 bước theo Sổ tay QĐ 1966/QĐ-UBND (docs/05); người phụ trách; ngày; cảnh báo quá hạn theo thời hạn luật định (phân biệt ngày / ngày làm việc); cảnh báo thiếu dữ liệu, trùng; dự toán chi phí tổ chức thực hiện (QĐ 03/2025) | Luồng kiểm đếm bắt buộc, cưỡng chế, khiếu nại (chỉ theo dõi mốc ngày) |
| Xuất | Excel: bảng chi tiết từng hộ (đủ nội dung k2 Đ3 NĐ88), bảng tổng hợp dự án; Word: Mẫu 03, 04, 09/10, 14, 15, 16, 20/21 của Sổ tay (chờ xác nhận); PDF từ bản xem trước | 13 mẫu còn lại của Sổ tay |
| Nhập | Excel theo mẫu (hộ, thửa, kiểm đếm), xem trước, báo lỗi theo dòng/cột, phát hiện trùng | Nhập từ phần mềm địa chính; AI đọc hồ sơ |
| Quản trị | Tài khoản, 4 vai trò, nhật ký, sao lưu tự động/thủ công, phục hồi, quản lý bộ chính sách | Đa người dùng mạng LAN |

## 2. Hướng giao diện (đề xuất để duyệt)

| Hướng | Mô tả | Ưu điểm | Hạn chế |
|---|---|---|---|
| **A. Theo quy trình** | Thanh bên trái là các bước của dự án (Chuẩn bị → Điều tra kiểm đếm → Lập phương án → Niêm yết, lấy ý kiến → Trình, phê duyệt → Chi trả, bàn giao); mỗi bước một màn hình | Bám trình tự công việc, người mới dễ dùng, gắn tiến độ tự nhiên | Nhập khối lượng lớn phải qua nhiều màn hình |
| **B. Bảng tính chuyên nghiệp** | Lưới dữ liệu kiểu Excel là trung tâm: lọc, nhóm, sửa trực tiếp, dán từ Excel, màu trạng thái ô | Nhanh nhất cho người quen Excel, xử lý hàng nghìn dòng | Khó thấy "bước tiếp theo", dễ bỏ sót kiểm tra |
| **C. Hồ sơ theo hộ** | Mỗi hộ là một "hồ sơ" có các thẻ: Thông tin – Thửa – Tài sản – Tính toán – Tài liệu – Lịch sử | Đối chiếu, trả lời người dân, kiểm tra từng hộ rất thuận | Tổng hợp toàn dự án kém trực quan |

**Khuyến nghị: A làm khung + B cho nhập liệu, đối chiếu + C cho xem chi tiết từng hộ.** Cụ thể: điều hướng theo bước (A); trong mỗi bước, danh sách là lưới dữ liệu (B); nhấp một hộ mở ngăn hồ sơ bên phải (C). Quy ước màu thống nhất: **xanh = đã xác nhận**, **vàng = tạm tính**, **đỏ = thiếu dữ liệu/thiếu căn cứ**, **tím = điều chỉnh thủ công**; mọi con số tiền có thể nhấp để xem "phiếu giải trình" (khối lượng × đơn giá × hệ số, làm tròn, căn cứ).

## 3. Kiến trúc sơ bộ

### 3.1 Lựa chọn công nghệ (khuyến nghị)

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Vỏ ứng dụng Windows | **Tauri 2** (WebView2 có sẵn trên Windows 10/11) | Bộ cài NSIS `.exe` ~10–20 MB, khởi động nhanh, ít bộ nhớ; bề mặt tấn công nhỏ (phân quyền lệnh rõ ràng) |
| Giao diện | React + TypeScript + Vite; lưới dữ liệu ảo hóa (AG Grid Community hoặc TanStack Table); biểu đồ ECharts | Hệ sinh thái web người dùng đã quen; lưới hiệu năng cao |
| **Lõi nghiệp vụ** | Gói TypeScript thuần `core/` (không phụ thuộc giao diện, CSDL); số học thập phân `decimal.js` | Kiểm thử độc lập; chạy được cả trong ứng dụng và trên máy chủ nội bộ sau này |
| Bộ chính sách | Tệp dữ liệu JSON có lược đồ kiểm tra (JSON Schema/zod): đơn giá, tỷ lệ, mốc ngày, nhóm địa bàn, căn cứ, hiệu lực | Cập nhật đơn giá không sửa mã; kiểm tra trước khi áp dụng |
| CSDL | SQLite (WAL, khóa ngoại, giao dịch), tùy chọn mã hóa SQLCipher; lớp truy cập qua giao diện kho dữ liệu | Không cần cài máy chủ; thay bằng PostgreSQL khi lên LAN |
| Xuất tài liệu | ExcelJS (theo mẫu `.xlsx`), docxtemplater (theo mẫu `.docx` người dùng cung cấp); PDF từ bản xem trước HTML qua WebView2 | Mẫu do người dùng tự chỉnh, không sửa mã |
| Đóng gói | GitHub Actions `windows-latest` build bộ cài NSIS; tùy chọn ký số mã nguồn | Môi trường hiện tại là Linux: **không build/kiểm tra được bộ cài Windows trực tiếp**, sẽ dùng CI Windows và người dùng chạy thử |

Phương án thay thế đã cân nhắc: **Electron** (toàn bộ TypeScript, nhưng bộ cài ~100 MB, tốn bộ nhớ); **.NET WPF** (thuần Windows, nhưng giao diện hiện đại tốn công, không tái sử dụng được cho bản web/LAN). Nếu không muốn có tầng Rust (Tauri), Electron là lựa chọn dự phòng — lõi `core/` giữ nguyên.

### 3.2 Phân lớp

```
┌──────────────────────── Ứng dụng Windows (Tauri) ────────────────────────┐
│ Giao diện React: điều hướng theo bước · lưới dữ liệu · hồ sơ hộ · xem trước │
├──────────────────────────────────────────────────────────────────────────┤
│ Dịch vụ ứng dụng: nhập Excel · xuất tài liệu · quy trình · phân quyền · nhật ký │
├──────────────────────────────────────────────────────────────────────────┤
│ LÕI NGHIỆP VỤ (core/, TypeScript thuần, decimal)                          │
│  • Bộ chọn chính sách (hiệu lực, địa bàn, chuyển tiếp → người dùng xác nhận)│
│  • Quy tắc tính: mỗi quy tắc = mã + điều kiện + công thức + căn cứ          │
│  • Kết quả = dòng tính có giải trình đầy đủ; thiếu tham số → "Thiếu căn cứ" │
├──────────────────────────────────────────────────────────────────────────┤
│ Kho dữ liệu: SQLite (v1) │ PostgreSQL qua dịch vụ nội bộ (bản LAN)         │
└──────────────────────────────────────────────────────────────────────────┘
          ▲ Bộ chính sách (JSON có kiểm tra lược đồ + ca kiểm thử kèm theo)
```

### 3.3 Các quyết định thiết kế cốt lõi

1. **Công thức trong mã, tham số trong dữ liệu.** Không xây "ngôn ngữ công thức" tổng quát (khó kiểm thử, dễ sai). Mỗi loại tính là một hàm thuần có kiểm thử; mọi con số (đơn giá, %, mốc ngày, mức trần) đến từ bộ chính sách có căn cứ.
2. **Kích hoạt bộ chính sách mới** phải qua: kiểm tra lược đồ → so sánh với bản cũ (dòng thêm/sửa/xóa) → chạy bộ ca kiểm thử → người có quyền phê duyệt → mới được chọn cho dự án.
3. **Đóng băng phương án**: khi chốt, lưu ảnh chụp đầu vào + mã bộ chính sách + kết quả + mã băm. Tính lại chỉ tạo phiên bản mới, kèm bảng chênh lệch.
4. **Tiền**: số thập phân, không dùng float; làm tròn theo quy tắc cấu hình được và đã xác nhận, ghi rõ tại từng dòng.
5. **Nhật ký**: chỉ ghi thêm, có chuỗi băm để phát hiện sửa xóa; điều chỉnh thủ công bắt buộc lý do.
6. **Không kết nối mạng ra ngoài**; không đo từ xa; cập nhật phần mềm bằng gói cài đặt.
7. **Đa người dùng (sau v1)**: không đặt tệp SQLite trên thư mục chia sẻ (nguy cơ hỏng dữ liệu); thay vào đó một máy làm máy chủ nội bộ chạy dịch vụ + PostgreSQL, các máy khác kết nối qua mạng LAN.

### 3.4 Mô hình dữ liệu lõi (sơ bộ)

`DuAn` 1–n `DoiTuong` (người/hộ) · `ThuaDat` n–n `DoiTuong` qua `QuyenSuDung` (vai trò, tỷ lệ) · `ThuaDat` 1–n `TaiSan` (loại: nhà/công trình/cây/thủy sản/vật nuôi/mộ) n–n `DoiTuong` qua `SoHuuTaiSan` · `PhuongAn` (phiên bản) 1–n `KetQuaTinh` (dòng tính có giải trình) · `BoChinhSach` 1–n `ThamSo`/`BangDonGia` · `BuocQuyTrinh`, `TaiLieu`, `NhatKy`, `NguoiDung`, `VaiTro`.

## 4. Lộ trình triển khai

| GĐ | Nội dung | Sản phẩm | Điểm duyệt của người dùng |
|---|---|---|---|
| 1 | Khảo sát, kiểm kê tài liệu, phạm vi v1 *(đang thực hiện)* | docs/00–04; sổ vướng mắc | Trả lời 8 câu hỏi; bổ sung tài liệu |
| 2 | Phân tích nghiệp vụ đầy đủ, thiết kế dữ liệu, tiêu chí nghiệm thu | Ma trận nghiệp vụ đã xác nhận; lược đồ CSDL; đặc tả bộ chính sách; **bộ ca kiểm thử vàng** từ phương án đã duyệt | Duyệt ma trận + ca kiểm thử |
| 3 | Bản mẫu giao diện + 1 luồng hoàn chỉnh: dự án → hộ → thửa → kiểm đếm nhà + cây → tính → bảng chi tiết Excel | Bộ cài thử `.exe` build trên CI Windows | Chạy thử, chọn hướng giao diện chốt |
| 4 | Lập trình theo nhóm ưu tiên: (1) tài sản A01–A16 → (2) hỗ trợ C → (3) phương án, phiên bản, xuất → (4) nhập Excel → (5) quy trình, cảnh báo → (6) quản trị, sao lưu | Mỗi nhóm một bản cài thử | Nghiệm thu từng nhóm |
| 5 | Kiểm thử: thông thường; thiếu căn cứ; nhiều thửa, nhiều đối tượng; đổi chính sách; nhập trùng; điều chỉnh phương án; sao lưu/phục hồi; nâng cấp phiên bản | Báo cáo kiểm thử (đã chạy / đã kiểm thử / còn hạn chế) | Đối chiếu kết quả |
| 6 | Đóng gói, hướng dẫn, bàn giao | Mã nguồn, bộ cài, tài liệu cấu hình chính sách, hướng dẫn sử dụng, hướng dẫn sao lưu | Nghiệm thu |
