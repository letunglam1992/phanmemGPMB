# 09. Ứng dụng desktop – bản thử nghiệm 0.1 (Giai đoạn 3)

## 1. Kiến trúc

```
apps/desktop          Giao diện React + TypeScript (Vite), vỏ Tauri 2 (WebView2) → bộ cài NSIS .exe
  src/tinh-ho.ts      Điều phối tính toán 1 hộ: gọi @gpmb/core, nhóm A/B theo biểu mẫu
  src/kho.ts          Lưu trữ cục bộ (IndexedDB trong WebView2); giao diện Kho để thay SQLite
  src/xuat-excel.ts   Xuất Excel theo cấu trúc biểu áp giá (ExcelJS)
  src/man/*           Màn hình
packages/core         Lõi tính toán (Decimal, dòng tính có giải trình)
packages/gis          Đọc DGN, khép thửa, diện tích thu hồi
policy/               Bộ chính sách + dữ liệu đơn giá, bảng giá đất đã trích xuất
```

Không có máy chủ, không gọi mạng. Vỏ Rust chỉ mở cửa sổ; CSP chặn kết nối ra ngoài (`connect-src 'self'`).

## 2. Tình trạng chức năng

Ký hiệu: **Đã kiểm thử** = có kiểm thử tự động đạt · **Đã chạy** = chạy thử giao diện (Chromium) đạt, chưa có kiểm thử tự động · **Hạn chế** = còn thiếu, nêu rõ.

| Chức năng | Tình trạng | Ghi chú |
|---|---|---|
| Tổng quan (bảng điều khiển): chỉ số có thanh đo (hộ hoàn thành, đang xử lý, vướng mắc, thửa đã kiểm đếm), dải chặng quy trình, phân bố hiện trạng, tiến độ chung, cảnh báo tự động | Đã chạy; quy tắc trạng thái và cảnh báo **đã kiểm thử** | Chỉ tham khảo bố cục các ảnh người dùng gửi, không sao chép giao diện/nhận diện |
| Hiện trạng GPMB của hồ sơ: Hoàn thành / Đang xử lý / Đã kiểm đếm / Vướng mắc / Chưa kiểm đếm (quy tắc: docs/09 §6) | **Đã kiểm thử** | |
| Cảnh báo tự động: quá hạn kế hoạch; > 30 ngày từ duyệt PA chưa chi trả (k3 Đ94 LĐĐ); QĐ thu hồi < 90/180 ngày sau thông báo (k2 Đ85 LĐĐ); QĐ 27/2026 sắp hết hiệu lực (VM-18); vướng mắc; thiếu căn cứ sau niêm yết; chờ duyệt | **Đã kiểm thử** | Chưa tính ngày làm việc (VM-25) |
| Dự án: dải bảng điều khiển, mốc tiến độ dự án (dòng thời gian), lập kế hoạch từng bước, bản đồ nhỏ, lọc hộ theo hiện trạng | Đã chạy | |
| Dự án: thông tin (xã, giá gạo, hạn mức, hệ số giá đất có văn bản), danh sách hộ | Đã chạy | Hệ số ≠ 1 bắt buộc ghi văn bản |
| Hồ sơ hộ: thông tin, nhân khẩu, thửa đất, chọn giá NQ 152 | Đã chạy | Điều chỉnh khác (mặt tiếp giáp, chênh cao…) nhập giá tay kèm căn cứ |
| Tính đất theo phân lớp (QD-21): cán bộ thêm lớp, vị trí, DT; phần mềm điền giá VT × tỷ lệ lớp | **Đã kiểm thử** (lõi + điều phối), đã chạy giao diện | Cảnh báo khi tổng DT lớp ≠ DT thu hồi; giá sửa tay bắt buộc lý do; không tự áp sàn giá |
| Kiểm đếm theo thửa, theo đợt; chọn đơn giá QĐ 32 / PL VIII; ngoài danh mục có căn cứ | Đã chạy | Khối lượng dạng biểu thức (=10*9.8) — **đã kiểm thử** |
| Tính toán, giải trình từng khoản, trạng thái màu | **Đã kiểm thử** (điều phối) | Hộ mẫu khớp biểu mẫu: đất 521.926.200 đ; CĐN thửa 85 1.493.980.200 đ; cây trồng khớp đến đồng |
| Làm tròn lên nghìn đồng ở cấp hộ; khấu trừ; chỉ cộng khoản "Tạm tính" | **Đã kiểm thử** | |
| Tiến độ 16 bước (Sổ tay QĐ 1966), gửi duyệt/xác nhận, nhật ký | Đã chạy | **Hạn chế:** chưa phân quyền người gửi/người duyệt; chưa tính hạn, cảnh báo quá hạn |
| Bản đồ: nạp DGN, vẽ, chọn ranh GPMB, bảng thửa, cờ nghi vấn; tô thửa theo hiện trạng GPMB hoặc phạm vi thu hồi; bảng lớp bản đồ; mũi tên Bắc; phân bố hiện trạng theo thửa trong ranh | Đã chạy (tệp thật) | Lõi **đã kiểm thử** (docs/08). **Ảnh vệ tinh: không làm** (cần gửi tọa độ ra máy chủ ngoài — tắt theo yêu cầu bảo mật) |
| Tạo hồ sơ từ thửa trong ranh (nhóm theo chủ sử dụng) | Đã chạy (tệp thật: 75 hồ sơ / 501 thửa) | Loại đất giữ ký hiệu bản đồ (1L, 2L…) để cán bộ đổi |
| Phiên bản phương án: chốt (đóng băng hồ sơ, tham số dự án, từng khoản, mã SHA-256) → ghi nhận phê duyệt (bắt buộc số, ngày QĐ) / hủy (bắt buộc lý do); điều chỉnh hộ đã duyệt bắt buộc lý do; so sánh bản–bản, bản–tạm tính theo hộ, khoản, cột; cảnh báo hộ sửa sau phê duyệt; xuất Excel đúng bản đã chốt | **Đã kiểm thử** (lõi); đã chạy giao diện (chốt → xem → phê duyệt → sửa hồ sơ → cảnh báo, so sánh → xuất Excel ra đúng số đã chốt) | Không chốt hộ còn khoản Thiếu căn cứ/Cần xác nhận (QD-03) — phần mềm báo, cán bộ tự bỏ chọn. Xuất Excel của bản chốt tính lại từ dữ liệu đóng băng và **dừng nếu khác số đã chốt** (phần mềm/chính sách đã đổi). **Hạn chế:** chưa phân quyền người chốt/người ghi nhận phê duyệt; bảng Excel của bản chốt chưa in số, ngày QĐ phê duyệt |
| Xuất Excel: TH ĐẤT, TH GIÁ TRỊ TRÌNH DUYỆT, trang từng hộ | **Đã kiểm thử** (đọc lại tệp, đối chiếu số) | Trang hộ theo cột biểu mẫu: ĐVT, Khối lượng, Hệ số/mức, Đơn giá, Thành tiền, Căn cứ; dòng cây vượt mật độ tách riêng hệ số 0,3; số La Mã nhóm cố định như biểu mẫu. **Hạn chế:** chưa chép định dạng, chữ ký, tiêu đề đúng từng ô của tệp mẫu |
| Tra cứu: QĐ 32, PL VIII, PL V, NQ 152, bộ chính sách | Đã chạy | |
| Soạn văn bản theo 22 mẫu Sổ tay QĐ 1966 (tự điền, xuất .docx/.zip, cán bộ thay mẫu riêng) | **Đã kiểm thử** (điền đủ 22 mẫu), đã chạy giao diện | docs/10. Kèm 03 mẫu riêng của xã R1–R3 (Tờ trình, Báo cáo thẩm định, QĐ thu hồi theo đợt) — **đã kiểm thử** điền, đã chạy giao diện (R3 cho 2 hộ) |
| Sao lưu, khôi phục dữ liệu (tệp `.gpmb`: dự án, hồ sơ, bản đồ, mẫu tự chỉnh; mã SHA-256; thay thế toàn bộ hoặc gộp; tự tải bản sao lưu dữ liệu hiện có trước khi thay thế; nhắc khi > 7 ngày chưa sao lưu) | **Đã kiểm thử** (khứ hồi, phát hiện tệp bị sửa/sai định dạng/phiên bản mới hơn); đã chạy giao diện (sao lưu → xóa → khôi phục) | Tệp sao lưu **không mã hóa**, chứa thông tin cá nhân → cất giữ theo quy chế bảo mật của cơ quan. Không tự sao lưu định kỳ; không gửi ra ngoài. Mốc "lần sao lưu cuối" lưu theo máy |
| Nhiều người dùng mạng nội bộ, "cập nhật thời gian thực" giữa nhiều máy | **Chưa làm** | Bản hiện tại lưu trên một máy; chuyển dữ liệu giữa máy bằng tệp sao lưu. Nhiều người dùng cần máy chủ nội bộ (QD-01) |
| Bộ cài Windows `.exe` | **Đã build** trên GitHub Actions (windows-latest), **chưa cài thử** trên Windows 10/11 | Xem §3 |

## 3. Đóng gói Windows

- Cấu hình: `apps/desktop/src-tauri` (Tauri 2, NSIS, cài theo người dùng, kèm bộ cài WebView2).
- Build tự động: `.github/workflows/build-windows.yml` chạy trên `windows-latest` → tải bộ cài ở mục Artifacts của lần chạy.
- Môi trường phát triển hiện tại là Linux: **không build được `.exe` tại đây**. Đã build bản Linux (.deb 2,2 MB) và chạy thử trong màn hình ảo: cửa sổ mở, giao diện nạp đúng với CSP chặn mạng ngoài → vỏ Rust và cấu hình Tauri hợp lệ. Bộ cài chỉ được coi là có khi workflow Windows chạy xong và đã được cài thử trên Windows 10/11.
- Lần build đầu (27/9/2026): workflow chạy thành công, bộ cài NSIS ~3,7 MB (nén zip) tải ở mục Artifacts `gpmb-sonla-windows-setup` (lưu 90 ngày).
- Chưa kiểm tra trên WebView2: tải tệp Excel (thẻ `<a download>`), thư mục lưu IndexedDB khi gỡ/cài lại.

## 4. Chạy thử trên máy phát triển

```bash
npm install
npm run dev          # mở http://localhost:5173 (trình duyệt), bấm "Nạp dữ liệu mẫu"
npm test             # toàn bộ kiểm thử
cd apps/desktop && npx tauri dev   # cửa sổ desktop (cần Rust + WebView2/WebKitGTK)
```

## 5. Ảnh màn hình (dữ liệu mẫu ẩn danh)

| | |
|---|---|
| ![Tổng quan](anh/1-tong-quan.png) | ![Dự án](anh/2-du-an.png) |
| ![Tính toán, giải trình](anh/3-tinh-toan.png) | ![Kiểm đếm](anh/4-kiem-dem.png) |
| ![Tiến độ](anh/5-tien-do.png) | Màn bản đồ: không đưa ảnh vào kho vì tệp bản đồ mẫu có tên chủ sử dụng thật |

## 6. Quy tắc hiện trạng GPMB của hồ sơ (`src/trang-thai.ts`)

Thứ tự ưu tiên:
1. **Đã hoàn thành GPMB** – bước 12 "Chi trả" đã xác nhận hoàn thành.
2. **Vướng mắc / chưa hoàn tất** – cán bộ ghi vướng mắc (khiếu nại, chưa nhận tiền…); hoặc có bước quá ngày kế hoạch; hoặc phương án đã niêm yết (bước 6 trở đi) mà còn khoản "Thiếu căn cứ".
3. **Đang xử lý** – đã bắt đầu từ bước 5 (lập phương án).
4. **Đã kiểm đếm** – bước 4 hoàn thành.
5. **Chưa kiểm đếm**.

Tiến độ chung = số bước đã hoàn thành của mọi hộ / (số hộ × 16). Mốc tiến độ dự án: đủ hộ xong → Hoàn thành; quá ngày kế hoạch → Quá hạn; có hộ đang làm → Đang xử lý; còn lại → Chưa đến hạn.
