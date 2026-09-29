# 11. Nhiều người dùng qua mạng nội bộ

## 1. Mô hình

| Chế độ (từng máy chọn) | Dữ liệu | Ghi chú |
|---|---|---|
| **Máy đơn** (mặc định) | Từ 0.6.0: SQLite `%LOCALAPPDATA%\vn.sonla.gpmb\may-don\gpmb-may-don.sqlite`, dùng **cùng lõi Rust với máy chủ** (quy tắc nghiệp vụ, quyền, lịch sử, kiểm tra cấu trúc) nhưng gọi trong tiến trình (lệnh `goi_noi_bo`) — **không mở cổng mạng**. Lần đầu mở, dữ liệu IndexedDB của bản ≤ 0.5 tự chuyển sang SQLite (một giao dịch; giữ tài khoản, nhật ký hệ thống với chuỗi băm cũ, cài đặt, bản đồ, mẫu); dữ liệu IndexedDB cũ giữ nguyên, không xóa | Một người dùng. Bản chạy trên trình duyệt (dùng thử, kiểm thử giao diện) vẫn dùng IndexedDB |
| **Máy chủ** | SQLite: `%LOCALAPPDATA%\vn.sonla.gpmb\may-chu\gpmb-may-chu.sqlite` (kèm chứng chỉ `chung-chi.pem`, khóa `khoa-rieng.pem`) | Phần mềm trên máy chủ mở dịch vụ HTTPS ở cổng 47800 (đổi được). Cán bộ trên chính máy chủ cũng làm việc qua dịch vụ này |
| **Máy trạm** | Không lưu dữ liệu nghiệp vụ | Kết nối máy chủ theo IP[:cổng], ghim vân tay chứng chỉ |

- Chỉ truyền trong mạng nội bộ, **không cần Internet, không dùng dịch vụ ngoài**. Máy chủ phải bật và mở phần mềm khi mọi người làm việc.
- Chọn chế độ: màn đăng nhập → **Kết nối…**, hoặc Cài đặt chung → **Mạng nội bộ** → Thiết lập kết nối. Chế độ lưu theo từng máy.

## 2. Thiết lập

1. **Máy chủ:** chọn "Máy chủ", cổng 47800 → Lưu và khởi động lại. Windows có thể hỏi cho phép qua tường lửa — chọn **mạng riêng (Private)**; cài đặt tường lửa có thể cần quyền quản trị máy (bộ phận CNTT).
2. Tạo tài khoản quản trị của máy chủ (chỉ tạo được trên chính máy chủ), hoặc — nếu đang có dữ liệu máy đơn — đăng nhập rồi Cài đặt chung → Mạng nội bộ → **Đưa dữ liệu máy đơn lên máy chủ** (kèm tài khoản).
3. Cài đặt chung → Mạng nội bộ trên máy chủ hiện **địa chỉ cho máy trạm** và **vân tay chứng chỉ**.
4. **Máy trạm:** chọn "Máy trạm", nhập IP máy chủ → Kiểm tra kết nối → **đối chiếu vân tay** với vân tay hiển thị trên máy chủ (đọc từng nhóm) → tích xác nhận → Lưu. Vân tay không khớp thì không lưu (có thể nhầm máy hoặc bị giả mạo).

## 3. An toàn

| Nội dung | Cách làm |
|---|---|
| Đường truyền | HTTPS (TLS 1.2/1.3, rustls); chứng chỉ tự ký tạo trên máy chủ lần đầu |
| Xác thực máy chủ | Máy trạm **ghim vân tay SHA-256** của chứng chỉ; chứng chỉ khác (kể cả hợp lệ công khai) bị từ chối |
| Đăng nhập | Mật khẩu kiểm tra trên máy chủ (PBKDF2-SHA256, ≥ 100.000 vòng); máy chủ không gửi băm mật khẩu cho máy trạm; sai 5 lần chờ 30 giây; phiên hết hạn sau 8 giờ không dùng; khóa tài khoản thì phiên bị hủy ngay |
| Tài khoản quản trị đầu tiên | Chỉ tạo từ chính máy chủ (địa chỉ 127.0.0.1) |
| Quyền (QD-22) | Máy chủ **kiểm tra lại** mọi yêu cầu theo cùng ma trận quyền với giao diện (`src/quyen.json`) — không tin kiểm tra ở máy trạm |
| Quy tắc nghiệp vụ kiểm tra ở máy chủ | Người gửi duyệt không tự xác nhận bước; máy chủ tự ghi tài khoản gửi/duyệt theo phiên (không theo dữ liệu gửi lên); bản phương án đã phê duyệt/hủy không sửa, không xóa; bản "Đã chốt" chỉ chuyển sang phê duyệt (quyền PHE_DUYET_PA) hoặc hủy (HUY_PA) mà không đổi số liệu; bản mới phải "Đã chốt" và cần quyền CHOT_PA |
| Kiểm tra cấu trúc (P1-8, 0.6.0) | Trước khi ghi: kiểu dữ liệu, trường bắt buộc (mã, dự án, loại đối tượng, danh sách thửa/tài sản/nhân khẩu…), ô số đúng chuẩn máy ("1234.5"). Giá trị sai có sẵn từ dữ liệu cũ không chặn sửa trường khác; giá trị sai mới bị từ chối (400, nêu ô). Khôi phục từ tệp sao lưu chỉ kiểm cấu trúc |
| Lịch sử bản ghi (P1-5, 0.6.0) | Mỗi lần sửa, xóa hẳn, ghi đè khi khôi phục: bản cũ lưu vào bảng `lich_su` (người, thời điểm, lý do). Khôi phục hồ sơ về bản cũ **chỉ Quản trị** (quyền `KHOI_PHUC_BAN_GHI`), bắt buộc lý do, ghi nhật ký hồ sơ + nhật ký hệ thống. Thời hạn giữ (`giuLichSu.soNam`, 0 = không thời hạn) chỉ Quản trị đặt; bản quá hạn bị xóa khi lưu thiết lập và mỗi lần mở CSDL |
| Nhật ký hệ thống | Ghi trên máy chủ, chuỗi băm như bản máy đơn (kiểm tra chéo được bằng mã giao diện); người thực hiện lấy theo phiên đăng nhập; đăng nhập/đăng nhập sai ghi kèm IP máy trạm |

## 4. Làm việc đồng thời

- **Khóa lạc quan:** mỗi dự án, hồ sơ có số phiên bản. Hai người cùng sửa, người lưu sau nhận thông báo "Dữ liệu đã được … sửa lúc …", phần mềm tải lại bản mới nhất, **bản nháp trên màn hình được giữ** để nhập lại — không ghi đè im lặng.
- **Cập nhật (P1-2, 0.6.0):** máy trạm hỏi máy chủ danh sách thay đổi mỗi 4 giây; có thay đổi của người khác thì **chỉ đọc lại các bản ghi vừa đổi** (`POST /api/doc`) và báo tên người cập nhật; thay đổi cài đặt hoặc khôi phục toàn bộ thì tải lại hết. Lưu của chính mình: cập nhật bằng bản ghi máy chủ trả về, không tải lại.
- **Phương án là bản ghi riêng (P1-6, 0.6.0):** mỗi bản phương án là một bản ghi `pa` (`{ id, duAnId, pa }`) có phiên bản riêng — sửa thông tin dự án không xung đột với người đang chốt/ghi nhận phê duyệt phương án. CSDL cũ tự tách khi mở (PRAGMA `user_version` 2). Máy trạm bản cũ gửi dự án kèm phương án nhúng bị từ chối, báo cần cập nhật phần mềm.
- **Tiến độ, chi trả là bản ghi con (P2-7, 0.7.0):** hồ sơ gồm bản ghi chính (`ho`), tiến độ (`td`), chi trả (`ct`) cùng mã, mỗi phần một phiên bản — sửa song song các phần của cùng một hộ không xung đột. Quy tắc gửi/duyệt bước kiểm trên `td`. Máy trạm cũ gửi hồ sơ kèm tiến độ nhúng bị từ chối, báo cần cập nhật.
- **Tệp đính kèm (P2-2, 0.7.0):** bảng `tep` loại `dinhKem` (thông tin: hồ sơ, dự án, bước), tối đa 20 MB (413 nếu vượt), `GET /api/dinh-kem?duAn=` liệt kê; xóa hẳn hộ/dự án xóa tệp kèm.
- **Gói chính sách (P2-1, 0.7.0):** lưu ở cài đặt `goiChinhSach`; chỉ quyền `NAP_CHINH_SACH` (Quản trị) được ghi.
- **Phiên bản CSDL (P2-6):** `PRAGMA user_version` — 1: bảng lịch sử; 2: tách phương án; 3: tách tiến độ, chi trả. Mỗi bước chạy một lần, trong một giao dịch.

## 5. Sao lưu

- Sao lưu tự động chạy trên **máy chủ** (và máy đơn); máy trạm không tự sao lưu.
- Tệp `.gpmb` gồm dữ liệu nghiệp vụ; **tài khoản và nhật ký hệ thống nằm trong CSDL máy chủ** — muốn giữ, sao chép thêm thư mục `may-chu` khi đã tắt phần mềm.
- Khôi phục trên máy chủ thay đổi dữ liệu chung của mọi người dùng (có cảnh báo).

## 6. Kiểm thử

| Mức | Nội dung | Kết quả |
|---|---|---|
| Rust `tests/mang_noi_bo.rs` | Máy chủ HTTPS thật trên cổng trống + máy trạm ghim vân tay: vân tay sai bị từ chối; khởi tạo quản trị; sai mật khẩu; tài khoản chỉ xem không ghi; xung đột 409; gửi/duyệt bước; lãnh đạo tự duyệt bị chặn; phương án đã duyệt không sửa/xóa; danh sách thay đổi; nhật ký chuỗi băm; khóa tài khoản hủy phiên | **Đạt** (Linux; CI chạy lại trên Windows) |
| Rust | Băm nhật ký và PBKDF2 trùng với giao diện (vector tính bằng Node) | **Đạt** |
| TypeScript `test/kho-mang.test.ts` | Kho máy trạm: phiên, phiên bản, xung đột, 401, tệp 404, tên mẫu có dấu, không gửi tên người khi ghi nhật ký | **Đạt** |
| Rust `may_chu_lich_su_luoc_do`, `chuyen_doi_csdl_cu_va_don_lich_su`, `may_don_trong_tien_trinh` (0.6.0) | Kiểm cấu trúc (400 khi sai, giữ giá trị cũ), đọc theo danh sách, lịch sử, khôi phục chỉ quản trị/bắt buộc lý do/trùng mã 409, hồ sơ xóa hẳn khôi phục được, thời hạn giữ; CSDL cũ có phương án nhúng được tách, không chuyển đổi lần hai, dọn lịch sử quá hạn; máy đơn trong tiến trình: chuyển dữ liệu IndexedDB vào CSDL trống (tài khoản, chuỗi nhật ký nối tiếp), chuyển lần hai 409, quy tắc máy chủ áp dụng cho máy đơn, xuất để đưa lên máy chủ; máy chủ mạng không có đường dẫn nội bộ (404) | **Đạt** |
| Nối thật `test/mang-that.test.ts` | Mã giao diện ↔ máy chủ Rust qua HTTPS: tạo tài khoản (băm ở giao diện), dữ liệu mẫu, bản đồ, mẫu văn bản, chốt/phê duyệt phương án, xung đột, đổi mật khẩu, sao lưu từ máy chủ → khôi phục máy đơn, nhật ký | **Đạt** (chạy tay: cần biến `GPMB_MAY_CHU`) |

## 7. Hạn chế

- **Chưa chạy thử trong bản cài trên nhiều máy Windows thật** (tường lửa, mạng cơ quan). Cần thử: 1 máy chủ + 2 máy trạm.
- Máy chủ là phần mềm đang mở trên một máy (chưa chạy dạng dịch vụ Windows nền).
- Không tự tìm máy chủ trong mạng — nhập IP. Máy chủ nên đặt IP tĩnh.
- Chứng chỉ tự ký không hết hạn theo lịch thay; nếu xóa thư mục `may-chu` thì vân tay đổi, mọi máy trạm phải đối chiếu lại.
- Xung đột phát hiện theo cả hồ sơ (không gộp từng trường).
- Dữ liệu trong CSDL máy chủ, máy đơn không mã hóa ở mức tệp; bảo vệ bằng quyền truy cập máy.
- Lệnh `goi_noi_bo` (máy đơn SQLite) mới biên dịch và kiểm thử lõi trên Linux; **chưa chạy trong bản cài trên Windows thật**.
