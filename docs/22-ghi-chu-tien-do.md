# 22. Ghi chú tiến độ — đọc file này trước khi làm tiếp

Cập nhật: 07/10/2026. Bản mới nhất đã phát hành: **1.0.3**. Nhánh làm việc: `claude/great-rubin-4x4alw`; mọi thay đổi đã commit và đẩy lên.

Tài liệu nên đọc trước:
- `CLAUDE.md`: quy tắc, lệnh.
- `docs/09`: trạng thái từng chức năng.
- `docs/21`: gửi tỉnh, tổng hợp tỉnh, cổng Cloudflare.

## 1. Tình trạng hiện tại (tóm tắt)

### Đã phát hành (bản cài tự cập nhật, docs/20)

| Bản | Nội dung chính |
|---|---|
| 0.9.9–0.9.13 | Nhiều tờ bản đồ trong 1 dự án; ảnh vệ tinh; xem/xóa thửa trên bản đồ; sửa lỗi theo báo cáo thử nghiệm |
| 0.9.14 | Xóa đối tượng Hỗ trợ khác, sửa chữ lẹm; ghi nhận phê duyệt theo đợt (số/ngày QĐ không bắt buộc) |
| 0.9.15–0.9.17 | Tự cập nhật phần mềm; quay lại danh sách thửa; văn bản theo đợt chỉ chọn hộ đã chốt; hộp Chốt phương án lọc hộ; ranh giới 75 xã, phường |
| 0.9.18 | Thẻ "Tài liệu, văn bản" của dự án (PDF, Word, Excel, ảnh; tải .zip kèm bảng kê) |
| 0.9.19 | Excel, chốt phương án theo hồ sơ đã chọn; hoàn tác cập nhật tiến độ; văn bản theo đợt phương án |
| 0.9.20 | Hỏi đáp AI: Nội bộ (không dùng mạng, BM25 trên `public/tri-thuc/kho.json`) + Gemini API (khóa người dùng, DPAPI, che số) |
| 0.9.21 | Gửi tỉnh, tổng hợp tỉnh: gói `.gpmbtinh` mã hóa cho khóa tỉnh; cổng Cloudflare; bảng tổng hợp theo xã; xem chi tiết chỉ xem |
| 0.9.22 | Nút "Tạo khóa mới (thay khóa cũ)"; mở khóa tự tải gói từ cổng; rào lỗi từng khung; sửa chữ tràn khung "3. Gửi" |
| 0.9.23 | Trợ lý AI nổi: nút robot góc dưới phải mở khung chat; thanh bên "Trợ lý AI (hỏi đáp)" |
| 0.9.25 | Cảnh báo xã lâu chưa gửi (ngưỡng do tỉnh đặt); xã tự gửi định kỳ lên cổng (chu kỳ do xã đặt); tỉnh xem lại các bản gửi trước (≤ 20 bản/đơn vị); báo cáo Word tổng hợp toàn tỉnh |
| 0.9.26 | Tỉnh tự nhận gói mới từ cổng mỗi 30 phút khi khóa đang mở, chuông báo gói chờ nhận; phụ lục Excel kèm báo cáo Word tỉnh; thời gian không tính vào thời hạn (bước có thời hạn, bắt buộc lý do, tạm dừng); trường hợp Điều 14/17 PL I QĐ 106 do người dùng chọn + căn cứ; ghi chú bản đồ trong hồ sơ hộ; thùng rác tệp đính kèm, tài liệu; Luật Đất đai hợp nhất (VBHN 44/VBHN-VPQH) trong Trợ lý AI |
| 1.0.7 (chưa phát hành) | **Mẫu T13 biên bản bốc thăm lô TĐC** (biểu lô đưa vào bốc thăm, biểu kết quả từ Quỹ TĐC); mẫu R1, R2 có mục **diện tích thu hồi theo tình trạng pháp lý nguồn gốc đất**; **tính nền lần mở đầu với dữ liệu lớn** (20.000 hộ: Tổng quan hiện 9,7 s → 2,6 s, giao diện không đứng) — xem docs/09 |
| 1.0.6 | Nhóm A: rà các vướng mắc còn "linh động" theo QĐ 64/2026, NĐ 226/2025 (docs/03 mục cuối — không vướng mắc nào được làm rõ thêm) + soát lựa chọn không thống nhất giữa các hộ; **ý kiến về phương án, đối thoại** ở bước 7 (điểm a k3 Đ87, hạn 60 ngày, mẫu 08 tự đếm ý kiến, mẫu T12 biên bản đối thoại); **Mẫu 20, 21** tự điền danh sách, tổng tiền thưởng bàn giao sớm; **đối chiếu tổng DT thu hồi** (hồ sơ ↔ bản đồ ↔ phương án ↔ văn bản, theo dự án và đợt). Nhóm B: báo cáo Word tỉnh có **diễn biến theo tháng** (bảng, biểu đồ, so với tháng trước); báo cáo Word cấp xã có **bảng theo đợt**; **nhắc xã chậm** trong dự án liên xã. Nhóm D: thêm ca Playwright cho phần 1.0.5; **nối thật máy trạm ↔ máy chủ Rust trong CI**; **PDF có chữ thật** (nhúng Liberation Serif). VM-16, VM-28 người dùng tự điền (QD-34). Thêm: bảng dự án liên xã trong báo cáo Word tỉnh; soát mật độ cây trồng; PDF bản đồ tiến độ dạng vector + lưới tọa độ; thông báo hồ sơ mới được giao; bảng thửa, kiểm đếm chỉ dựng phần nhìn thấy; dọn cột "Hạn chế" lỗi thời của docs/09 (k5, k7, k8, k10 Điều 6 QĐ 14/2026 đã tính từ trước) — xem docs/09 |
| 1.0.5 | **QĐ 64/2026/QĐ-UBND**: bộ chính sách `sonla-2026-10-06` (hệ số chuyển đổi nghề theo tổ, thôn của thửa; ngoại lệ k4 Đ111 cho 20% tiền SDĐ; chuyển tiếp); tuyến liên xã qua cổng (`/api/tuyen` — **cần dán lại Worker**); dải Km, chọn thửa theo đoạn trên bản đồ; báo cáo theo đoạn 1 km (màn Báo cáo, Excel, Word); mẫu T8, T9 bố trí TĐC (Điều 111); căn cứ mặc định văn bản cập nhật (Luật 130, 116/2025/QH15, NĐ 226/2025, NĐ 49/2026, QĐ 64/2026) + nút cập nhật căn cứ cũ; **rà soát tác động QĐ 64** mọi dự án; gợi ý tổ, thôn của thửa theo địa chỉ hộ; **chi trả chậm**: mẫu T10 tờ trình, T11 quyết định phê duyệt phương án chi trả bồi thường chậm (điểm b k3 Đ94), theo dõi tiền gửi ngân hàng và ghi trả lãi (k4 Đ94); kiểm tra phương án Excel **dạng bảng ngang**; tra cứu hiệu lực văn bản căn cứ + cảnh báo khi soạn; kiểm tra vị trí tờ bản đồ (VN-2000, tờ lệch xa); **tim tuyến → lý trình gợi ý**; tỉnh **tải các bản cũ trên cổng**, **biểu đồ diễn biến theo tháng** (toàn tỉnh / xã / dự án liên xã); **Lưu PDF** bảng tính, giải trình không cần hộp in; **biểu ghi kết quả thử** (Excel, ở Giới thiệu); Worker bỏ khoảng trắng thừa trong `MA_QUAN_TRI` (`/api/goi/:ma/ban` — **cần dán lại Worker**) |
| 1.0.4 | **Dự án liên xã** (mã dùng chung do tỉnh cấp, tỉnh khai xã dọc tuyến, gom đoạn, xã chưa có số liệu, gợi ý/ghép tay, Phụ lục 03, đếm dự án theo mã); **lý trình theo thửa** (không bắt buộc; ô ở bảng thửa, cột Excel, "Ghi lý trình…" nhiều hộ; thẻ Mặt bằng theo lý trình + Excel); lịch ngày nghỉ **đề xuất** theo k1 Đ112 BLLĐ (đổi âm lịch); thẻ **Bắt đầu sử dụng**; bảng tính + giải trình hộ ra **Word / In PDF**; Ctrl+K tìm tờ/thửa đúng số, số định danh, lý trình; soát phương án tóm tắt điều kiện chốt, **đi tới đúng ô** — xem docs/09 |
| 1.0.3 | Excel tổng hợp toàn tỉnh theo thể thức biểu báo cáo; rà soát giao diện (ô chọn tệp tiếng Việt, số kiểu Việt, Kiểm đếm, khung giải trình thu gọn, nút sang Phương án từ Chi trả, dòng đợt trong báo cáo Word) — xem docs/09 |
| 1.0.2 | Nút **"Tệp đã xuất"** (⤓) trên thanh tiêu đề như nút tải về của trình duyệt: xuất Excel, Word… xong tự mở danh sách vài giây; bấm tên tệp mở bằng Excel/Word, "Thư mục" mở Explorer chọn sẵn tệp; giữ 30 tệp gần nhất (theo máy); lệnh Rust `mo_tep_da_xuat`, `mo_noi_luu_tep` chỉ mở loại tệp phần mềm xuất (không mở .exe, .bat) |
| 1.0.1 | **Sửa lỗi "Command plugin:dialog|confirm not allowed by ACL"**: bỏ `tauri-plugin-dialog` (bản 2.8.0 chèn script thay `window.confirm` bằng lệnh không còn trong plugin → `confirm()` trả Promise, **mọi hộp hỏi xác nhận trên bản .exe bị bỏ qua — thao tác chạy luôn**); hộp "Lưu thành" gọi thẳng `rfd`; kiểm thử Rust chặn đưa plugin trở lại. Nội dung bản quyền mới ở Giới thiệu ("© 2026 Lê Tùng Lâm. All rights reserved." + câu bảo hộ quyền tác giả), thuộc tính tệp .exe |
| 0.9.27 | Khôi phục tiến độ, chi trả, thông tin dự án về bản cũ; lịch sử thay đổi trong tệp sao lưu; hoàn tác bước chung 1–4 và tiến độ hộ; đợt thu hồi: cột "Đợt thu hồi" khi nhập Excel, báo cáo tách theo đợt, số đợt phê duyệt theo đợt; so sánh bản đồ đối chiếu hồ sơ + xuất Excel; ảnh cho ghi chú hiện trường; **bản đồ DXF** (DWG: báo cách đổi sang DXF); nạp bản đồ xong chọn **tự nhận diện / tự chọn lớp cho từng đối tượng** (bảng tích lớp, thêm lớp loại đất, diện tích); nhãn thửa nhiều nội dung ("CLN" · "13"/"1310,0" · tên chủ); **số tờ nhập tay** theo tệp |
| 0.9.24 | **Sửa trắng màn hình khi mở Trợ lý AI và lỗi "e is not a function"**; màn tỉnh nhắc "Có n gói mới trên cổng (xã, thời gian) — mở khóa để nhận" |

Kiểm thử ở 1.0.7 (tất cả đạt): typecheck; npm test 86 + 58 + 444; cargo test; nối thật máy trạm ↔ máy chủ Rust 1/1; eslint 3 cảnh báo cũ; Playwright: xem lần chạy kèm commit sau.

Kiểm thử ở 1.0.6 (tất cả đạt): typecheck; npm test 86 + 58 + 438; cargo test; nối thật máy trạm ↔ máy chủ Rust 1/1 (cũng chạy trong CI Windows); eslint 3 cảnh báo cũ; Playwright 72/72.

Kiểm thử ở 1.0.5 (tất cả đạt): typecheck; npm test 86 + 58 + 422; cargo test; eslint 3 cảnh báo cũ; Playwright 66/66 (thêm `e2e/qd64-2026.spec.ts`, ca lý trình trên bản đồ, ca tuyến qua cổng, ca tim tuyến, ca Lưu PDF).

Kiểm thử ở 1.0.4 (tất cả đạt): typecheck; npm test 78 + 58 + 391; cargo test; eslint 3 cảnh báo cũ; Playwright 63/63 (thêm `e2e/ly-trinh.spec.ts`, `e2e/de-xuat-1-0-4.spec.ts`, ca liên xã trong `tong-hop-tinh.spec.ts`).

Kiểm thử ở 0.9.27 (tất cả đạt):
- typecheck
- npm test: 78 + 58 + 373
- cargo test
- eslint: 3 cảnh báo cũ
- Playwright: 59/59 (thêm `e2e/ban-do-dxf.spec.ts`, `e2e/tep-da-xuat.spec.ts`)

### Nguyên nhân lỗi "e is not a function" (đã sửa ở 0.9.24)

- WebView2 bản mới trên máy anh Lâm cho các hàm cuộn (`scrollIntoView`, `scrollTo`) trả về Promise.
- Effect React viết dạng biểu thức, kiểu `useEffect(() => x.scrollIntoView())`, trả Promise đó ra ngoài. React tưởng là hàm dọn dẹp, gọi nó → lỗi.
- Ở khung trợ lý (nằm ngoài rào lỗi), lỗi này làm trắng cả phần mềm.
- Đã sửa:
  - Mọi `useEffect` viết thân có ngoặc `{ … }`, không trả giá trị.
  - Khung trợ lý có rào lỗi riêng.
  - `e2e/hoi-dap.spec.ts` và `e2e/tong-hop-tinh.spec.ts` giả lập hàm cuộn trả Promise. Đã thử: mã cũ hỏng, mã mới đạt.
- **Quy tắc từ nay:** không viết effect dạng biểu thức (trừ `() => void …` hoặc trả về hàm dọn dẹp).

### Hạ tầng thật anh Lâm đã dựng

- Cổng Cloudflare: `https://gpmb-cong-tinh.letunglam1992.workers.dev`
  - Gồm: Worker `gpmb-cong-tinh`, R2 `gpmb-cong-tinh`, binding `KHO`, secret `MA_QUAN_TRI`.
  - Mã Worker: `tools/cong-tinh/worker.js`.
  - Máy tỉnh đã kết nối bằng mã quản trị (bước kiểm tra kết nối báo đúng) và đã cấp mã cho xã Chiềng Mung.
- Hai máy đang thử:
  - Máy ở nhà = cấp xã, "ỦY BAN NHÂN DÂN XÃ CHIỀNG MUNG", máy đơn.
  - Máy cơ quan = cấp tỉnh, "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG".
- Khóa cấp tỉnh **đã được tạo lại**; vân tay hiện tại **`1465-C21B-D42B-D537`** (khóa cũ `528C-2D10-…` bỏ).
  - Máy xã đã nhập khóa mới.
  - Xã đã gửi gói lên cổng lúc 21:25 ngày 04/10/2026 (1/4 dự án: "Khai thác đá vôi…", 15 hồ sơ).
- Tại lần thử cuối (máy tỉnh, bản 0.9.23): gói chưa về máy tỉnh vì **khóa cấp tỉnh đang ở trạng thái "Đang khóa"**, chưa nhập mật khẩu để mở khóa.

## 2. Việc cần làm tiếp (ngày mai)

### A. Anh Lâm thử trên máy thật (bản 0.9.24)

1. [ ] Máy tỉnh cập nhật lên 0.9.24. Bấm nút robot hoặc "Trợ lý AI": khung chat phải mở bình thường, không trắng màn.
2. [ ] Màn Tổng hợp tỉnh (đang khóa): phải thấy dòng nhắc "Có 1 gói mới trên cổng (Xã Chiềng Mung, 04/10/2026 21:25)…".
3. [ ] Nhập **mật khẩu khóa** (mật khẩu đặt khi "Tạo khóa mới", khác mật khẩu đăng nhập và khác mã quản trị) → Mở khóa.
   - Phần mềm tự tải gói. Bảng tổng hợp phải có dự án "Khai thác đá vôi…" (15 hồ sơ).
4. [ ] Bấm tên dự án → xem chi tiết (chỉ xem) → "Thoát xem".
5. [ ] Ở máy xã: tích đủ 4 dự án → gửi lại. Máy tỉnh mở khóa lại → phải thấy 4 dự án (171 hồ sơ).
6. [ ] Trợ lý AI chế độ Gemini với khóa thật: tạo khóa ở aistudio.google.com/apikey → ⚙ trong khung chat.

Gặp lỗi: bấm **"Chép chi tiết lỗi"** (nếu có), hoặc chụp màn hình gửi vào phiên làm việc.

### A2. Thử bản 0.9.26 trên máy thật

- [ ] Máy tỉnh: mở khóa cấp tỉnh, để phần mềm mở; xã gửi gói → trong ≤ 30 phút gói tự về (thông báo "Đã tự nhận…"). Khi chưa mở khóa: chuông có dòng "Có n gói mới trên cổng chờ nhận".
- [ ] Báo cáo Word toàn tỉnh: tích "Kèm phụ lục Excel" → có 2 tệp.
- [ ] Hồ sơ hộ → Tiến độ: thêm khoảng không tính (có lý do) → hạn chót lùi; để trống ngày kết thúc → Tạm dừng.
- [ ] Thửa đất: chọn trường hợp Điều 14/17 PL I, ghi căn cứ → cảnh báo phần còn lại thay đổi.
- [ ] Xóa một tệp đính kèm → "Tệp đã xóa" → Khôi phục.
- [ ] Trợ lý AI: hỏi "Điều 95 Luật Đất đai" → trích nguyên văn VBHN 44.

### Chờ tài liệu từ anh Lâm

- [x] **4.2 / VM-29**: đã có QĐ 64/2026/QĐ-UBND (bộ chính sách `sonla-2026-10-06`, 1.0.5). Rà các vướng mắc còn mở theo QĐ 64 và NĐ 226: docs/03 mục cuối (không vướng mắc nào được làm rõ thêm).
- [x] VM-16, VM-28: người dùng tự điền (QD-34, docs/06).

### B. Việc lập trình có thể làm tiếp (chờ anh Lâm chọn)

- [x] Cổng Worker tự bỏ khoảng trắng thừa trong `MA_QUAN_TRI` — làm ở 1.0.5 (phải dán lại mã Worker lên Cloudflare).
- [x] Cảnh báo xã lâu chưa gửi, xã tự gửi định kỳ, tỉnh xem lại bản gửi cũ, báo cáo Word toàn tỉnh — đã làm ở 0.9.25 (docs/21 "Bổ sung ở bản 0.9.25"). Cần anh Lâm thử trên máy thật:
  - [ ] Máy xã: bật tự gửi, mỗi N ngày.
  - [ ] Máy tỉnh: đặt ngưỡng cảnh báo; xem "Các bản trước"; bấm "Báo cáo Word".
- [x] Tỉnh tải cả các bản cũ trên cổng (cổng giữ 5 bản/xã) — làm ở 1.0.5 (`GET /api/goi/:ma/ban`, phải dán lại mã Worker).
- [x] Danh sách P0–P3 trong `docs/17` đã làm hết (còn P2-1 "chưa ký số" theo QD-26(4) và phần thương mại GĐ5 — chờ quyết định). Việc tiếp theo lấy từ cột "Hạn chế" của docs/09.
- [ ] Đọc trực tiếp DWG (cần thư viện bên ngoài — xem giấy phép trước khi dùng; không khuyến nghị: LibreDWG là GPL). Báo cáo Word có bảng theo đợt: đã làm ở 1.0.6. Lưu kết quả so sánh bản đồ vào dự án: chưa (xuất Excel được).

### A3. Thử bản 0.9.27 / 1.0.1 trên máy thật

- [ ] **1.0.2:** xuất một biểu Excel → danh sách "Tệp đã xuất" tự hiện; bấm tên tệp → Excel mở; "Thư mục" → Explorer chọn sẵn tệp.
- [ ] **1.0.1:** xóa thử một ghi chú hiện trường, một hồ sơ (thùng rác) → phải hiện hộp hỏi "OK / Cancel" của Windows; bấm Cancel thì không xóa. Không còn thông báo lỗi "plugin:dialog|confirm". Xuất Excel → hộp "Lưu thành" vẫn mở bình thường.

- [ ] Nạp một tệp **DXF** thật của địa phương (bản đồ địa chính / trích đo): thửa dựng đúng, chữ tiếng Việt đúng (TCVN3 hoặc Unicode). Nạp tệp **DWG** → phải thấy hướng dẫn lưu sang DXF.
- [ ] Sau khi nạp: hộp "Đã nạp bản đồ" → thử "Tự chọn lớp cho từng đối tượng": tích lớp ở bảng, chốt cấu hình → thửa dựng lại đúng.
- [ ] Bản đồ có nhãn kiểu "CLN · 13/1310,0 · Lèo Văn Pản" cùng một lớp: chọn lớp đó làm "Nhãn thửa" → loại đất, số thửa, diện tích, chủ đọc đúng. Bản đồ không có số tờ: nhập số tờ (hộp sau khi nạp, hoặc Tờ bản đồ → cột "Số tờ (nhập tay)") → số tờ hiện có dấu `*`.
- [ ] Hồ sơ → Nhật ký → Lịch sử: khôi phục một bản Tiến độ / Chi trả (tài khoản Quản trị). Thông tin dự án → "Lịch sử thay đổi thông tin dự án" → khôi phục.
- [ ] Sao lưu → khôi phục vào máy khác: lịch sử thay đổi còn nguyên.
- [ ] Bước chung 1–4: xác nhận một bước → "↶ Hoàn tác". Thẻ Tiến độ hộ: gửi duyệt → hoàn tác.
- [ ] Nhập Excel có cột "Đợt thu hồi"; Báo cáo tổng hợp: dòng từng đợt.
- [ ] Ghi chú hiện trường: 📷 thêm ảnh chụp điện thoại.

### A4. Thử bản 1.0.4 trên máy thật (khi phát hành)

- [ ] Máy tỉnh: khai một dự án liên xã (mã, xã dọc tuyến); hai máy xã điền mã, gửi gói → tỉnh thấy bảng từng xã, xã chưa gửi hiện "Chưa có số liệu"; Excel có Phụ lục 03.
- [ ] Ghi lý trình: chọn vài hộ → "Ghi lý trình…" → Tổng quan dự án có thẻ "Mặt bằng theo lý trình"; nhập Excel có cột Lý trình.
- [ ] Cài đặt chung → Lịch ngày nghỉ → "Đề xuất ngày nghỉ" → đối chiếu thông báo năm nay rồi thêm, xác nhận.
- [ ] Thẻ Tính toán → "Xuất Word (kèm giải trình)" mở được bằng Word; "In / PDF" → chọn "Microsoft Print to PDF" lưu được PDF (**chưa thử trong .exe**).
- [ ] Ctrl+K gõ "5/85" → mở đúng thửa; Soát phương án → bấm dòng → mở đúng thẻ.

### A5. Thử bản 1.0.5 trên máy thật (khi phát hành)

- [ ] Dán lại mã Worker mới lên Cloudflare (`tools/cong-tinh/worker.js`); máy tỉnh lưu một dự án liên xã → nút "Đưa danh sách lên cổng ✓"; máy xã → Thông tin dự án → "Lấy danh sách dự án liên xã từ cổng tỉnh" → chọn mã.
- [ ] Dự án ở phường (vd. Chiềng An): thửa đất NN chọn "Bản Cá" → chuyển đổi nghề 5 lần; "Bản Tông Hụm" → 4 lần; chưa chọn → "Cần xác nhận". Dự án cũ: Thông tin dự án thấy điều khoản chuyển tiếp QĐ 64.
- [ ] Văn bản → T8 (dự kiến bố trí TĐC) với dự án đã khai Quỹ tái định cư: biểu lô, biểu hộ đúng.
- [ ] Bản đồ → thẻ "Theo lý trình" → bấm đoạn vướng → thửa được tô, phóng tới. Báo cáo tổng hợp: dòng "↳ Đoạn Km…".
- [ ] Máy tỉnh (sau khi dán Worker mới): "Tải các bản cũ trên cổng" → khung "Diễn biến theo tháng" có biểu đồ; đổi phạm vi xã / dự án liên xã.
- [ ] Thẻ Tính toán → "Lưu PDF" → mở tệp bằng trình đọc PDF: đủ trang, bảng lặp tiêu đề, số trang. "In / PDF" → hộp in của Windows có mở không.
- [ ] Văn bản → "Cập nhật căn cứ mặc định" ở dự án cũ; soạn T10, T11 (chi trả chậm) với hộ đã quá 30 ngày chưa chi trả.
- [ ] Hồ sơ hộ → Chi trả: đợt "Gửi ngân hàng" → nhập ngân hàng; "Ghi trả cho người có đất…" (tiền lãi theo sao kê).
- [ ] Kiểm tra phương án → chọn "Dạng bảng: Ngang" với một tệp PA mỗi hộ một dòng.
- [ ] Bản đồ → thẻ "Tim tuyến → lý trình" → "Tính lý trình từ tim tuyến…": chọn lớp tim tuyến, Km đầu → bảng gợi ý lý trình từng thửa → Ghi.
- [ ] Tổng quan → thẻ vàng "Áp dụng QĐ 64/2026/QĐ-UBND" (nếu hiện) → mở bảng rà soát, xuất Excel; Thửa đất → ô Tổ, thôn có gợi ý theo địa chỉ hộ.
- [ ] Giới thiệu → "Biểu ghi kết quả thử (Excel)" → điền kết quả các mục trên rồi gửi lại.

### A6. Thử bản 1.0.6 trên máy thật (khi phát hành)

- [ ] Hồ sơ hộ → Tiến độ → bước 7: ghi "Không đồng ý", ngày lấy ý kiến → thấy hạn đối thoại; "Ghi ngày lấy ý kiến này cho … hồ sơ khác"; ghi lần đối thoại; soạn T12. Mẫu 08 tự điền số ý kiến.
- [ ] Soát phương án: dòng "Đối thoại", "Lựa chọn không thống nhất" (khi hai hộ cùng vướng mắc chọn khác nhau), "Tổng DT thu hồi lệch văn bản".
- [ ] Tổng quan dự án → Đối chiếu diện tích → "DT thu hồi theo văn bản…" (dự án, từng đợt) → bảng tổng; Xuất Excel có trang "Tổng DT thu hồi".
- [ ] Khai báo mốc thưởng, ghi bàn giao vài hộ → Văn bản mẫu 20, 21: danh sách, tổng tiền, bằng chữ đúng. Thử "Tự điền số tiền thưởng" (VM-16).
- [ ] Hộ có TĐC bằng đất ở, tích hỗ trợ 20%: chưa nhập tiền SDĐ làm cơ sở và cách xác định → C11 "Cần xác nhận"; nhập xong → tạm tính (VM-28).
- [ ] Thẻ Tính toán → "Lưu PDF" → mở bằng trình đọc PDF: chọn, tìm được chữ tiếng Việt (Ctrl+F); in ra đúng khổ.
- [ ] Báo cáo Word cấp xã với dự án chia đợt: mục "Kết quả theo đợt thu hồi". Máy tỉnh (đã có số liệu hai tháng): báo cáo Word có mục "Diễn biến theo tháng" kèm biểu đồ.
- [ ] Máy tỉnh: đặt ngưỡng chênh ở thẻ Dự án liên xã → khung "Xã cần đôn đốc".
- [ ] Máy tỉnh: báo cáo Word có bảng "Trong đó, dự án liên xã".
- [ ] Soát phương án: dòng "Cây vượt mật độ quy định" ở hộ có cây trồng xen dày.
- [ ] Bản đồ → "Xuất PDF tiến độ": mở PDF, phóng to vẫn nét, chọn được chữ, có lưới tọa độ X/Y.
- [ ] Hai tài khoản: tài khoản A phân công hồ sơ cho B → B đăng nhập thấy thông báo, "Việc của tôi (1 mới)".
- [ ] Hồ sơ nhiều thửa, nhiều tài sản: cuộn bảng mượt.

### A7. Thử bản 1.0.7 trên máy thật (khi phát hành)

- [ ] Dự án có Quỹ TĐC, tích "Giao lô bằng bốc thăm" → thẻ Kết quả bốc thăm → "Soạn biên bản bốc thăm (T13)": Biểu 01 đúng lô còn trống, Biểu 02 đúng hộ; sau khi ghi nhận kết quả, soạn lại thấy thứ tự, lô.
- [ ] Ghi Tình trạng pháp lý cho vài thửa → Văn bản R1, R2: mục "Phân theo tình trạng pháp lý nguồn gốc đất"; dòng "Chưa ghi…" và cảnh báo khi còn thửa chưa ghi.
- [ ] Máy có dữ liệu lớn (hàng nghìn hộ): đăng nhập → Tổng quan hiện nhanh với thanh "Đang tính phương án các hộ lần đầu"; bấm được menu trong lúc tính; tính xong có đủ số liệu.

## 3. Quy trình mỗi lần sửa (để phiên mới làm đúng ngay)

1. Sửa mã. Cập nhật `docs/09`, ghi chú này, `docs/13`/`docs/21` nếu đổi cách dùng.
   - Sửa `docs/13`, `docs/05`, `docs/06`, `docs/03` thì chạy lại `node tools/tri-thuc/tao-kho.mjs`.
   - Sửa các mục "### A…" (việc cần thử trên máy thật) thì chạy `node tools/tao-viec-thu.mjs` (biểu ghi kết quả thử trong phần mềm; kiểm thử `bieu-mau-thu.test.ts` báo lệch nếu quên).
2. Kiểm thử:
   - `npm run typecheck`, `npm test` (gốc kho).
   - `cd apps/desktop && npx eslint src --max-warnings 3`.
   - `cd src-tauri && cargo test`. Lần đầu cần cài: `apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev librsvg2-dev libayatana-appindicator3-dev`.
   - `npx vite build && (npx vite preview --port 4173 &) && PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test`.
3. Nâng phiên bản ở 5 chỗ:
   - `apps/desktop/package.json` dòng 3
   - `src-tauri/tauri.conf.json` dòng 4
   - `src-tauri/Cargo.toml` dòng 3
   - `src-tauri/Cargo.lock` dòng 1316 (gpmb-sonla)
   - `package-lock.json` dòng 18
4. Commit, rồi `git push origin claude/great-rubin-4x4alw`.
5. Phát hành. Proxy chặn đẩy nhãn, nên dùng:
   `gh api -X POST repos/letunglam1992/phanmemGPMB/actions/workflows/build-windows.yml/dispatches -f ref=claude/great-rubin-4x4alw -F 'inputs[phat_hanh]=true'`
   - Theo dõi: `gh api "repos/letunglam1992/phanmemGPMB/actions/runs?branch=claude/great-rubin-4x4alw&event=workflow_dispatch&per_page=1"`.
   - Xác nhận: `curl -sSL https://github.com/letunglam1992/phanmemGPMB/releases/latest/download/latest.json` → `version`.
   - Mỗi lần chỉ chạy **một** lần phát hành (chờ lần trước xong).

## 4. Bản đồ mã cho các phần mới

| Phần | Tệp |
|---|---|
| Trợ lý AI | `src/man/HoiDap.tsx` (`HoiDap`, `TroLyAi`, `moTroLy`, `RoBot`); `src/hoi-dap/{tim-kiem,so-lieu,gemini}.ts`; Rust `src-tauri/src/hoi_dap.rs` (`goi_gemini`); kho tri thức `tools/tri-thuc/tao-kho.mjs` → `public/tri-thuc/kho.json`; CSS `.tl-*`, `.hd-*` |
| Gửi tỉnh, tổng hợp tỉnh | `src/man/TongHopTinh.tsx` (`PhanGui`, `PhanTinh`, `ThietLapKhoa`, `TheKhoa`, `CaiDatCong`, `MaXa`) |
| — gói | `src/tong-hop-tinh/goi-tinh.ts` (gói: RSA-OAEP 3072 + AES-GCM, ký ECDSA P-256) |
| — kho tỉnh | `kho-tinh.ts` (IndexedDB riêng `gpmb-tong-hop-tinh`) |
| — cổng | `cong-tinh.ts` (gọi cổng; Rust `src-tauri/src/cong_tinh.rs` `goi_cong_tinh`) |
| — xem chỉ đọc | `xem-xa.ts` (phiên chỉ xem: kho bộ nhớ chặn ghi, `main.tsx` đổi phiên, `NhaCungCap` có `chiXem`/`phienDau`) |
| Cổng Cloudflare | `tools/cong-tinh/worker.js`, `wrangler.toml` |
| Cảnh báo chậm gửi, tự gửi, báo cáo tỉnh | `src/tong-hop-tinh/canh-bao.ts`, `tu-gui.ts` (+ `src/thanh-phan/TuDongGuiTinh.tsx` chạy nền), `bao-cao-tinh.ts` + `src/thanh-phan/HopBaoCaoTinh.tsx`, mẫu `public/mau-van-ban/bao-cao-tong-hop-tinh.docx` (dựng bằng `tools/mau-van-ban/mau-bao-cao-tinh.cjs`, cần gói `docx` qua NODE_PATH) |
| Tỉnh tự nhận gói, chuông | `src/tong-hop-tinh/phien-tinh.ts` (khóa mở trong phiên, `taiGoiMoi`, gói chờ nhận), `src/thanh-phan/TheoDoiGoiTinh.tsx` (chạy nền), `src/thanh-phan/dung-canh-bao.ts` (mục `tinh`) |
| Phụ lục Excel tỉnh | `src/tong-hop-tinh/excel-tinh.ts`, `HopBaoCaoTinh.tsx` |
| Thời gian không tính | `BuocHo.khongTinh` (`mo-hinh.ts`), `ngayKhongTinh`/`tinhHanBuoc` (`han-buoc.ts`), giao diện `man/ho/TienDo.tsx` |
| Điều 14/17 PL I | `Thua.tachThua` (`mo-hinh.ts`), `TRUONG_HOP_TACH_THUA`, `canhBaoConLai` (`man/ban-do/ranh.ts`), `man/ho/Thua.tsx` |
| Ghi chú bản đồ trong hồ sơ | `GhiChuBanDoHo` trong `man/HoSo.tsx` |
| Thùng rác tệp | `src/dinh-kem-thung-rac.ts`, `thanh-phan/ThungRacTep.tsx`; `DinhKem.daXoa` (`kho.ts`); `LocSaoLuu.boTepDaXoa` |
| Luật Đất đai hợp nhất | `policy/nguon/luat-dat-dai-vbhn-44-2026.md`, nguồn đầu trong `tools/tri-thuc/tao-kho.mjs` |
| DXF, DWG | `packages/gis/src/dxf.ts` (`docDxf`, `laDxf`, `laDwg`; `docDgn` tự chuyển), kiểm thử `packages/gis/test/dxf.test.ts` |
| Chọn lớp theo đối tượng, nhãn nhiều nội dung, số tờ nhập tay | `HopCachGanLop`, `DOI_TUONG` (`man/ban-do/CauHinhLop.tsx`); `CauHinhLop.loaiDat/dienTich`, `RE_TEN`, `RE_DT_VN`, `soToTep` (`packages/gis/src/thua.ts`); `BanDoDuAn.soTo`, `tepGhep[].soTo`; `OSoToTep` (`LopPhu.tsx`) |
| Khôi phục td/ct/dự án, lịch sử trong sao lưu | Rust `khoi_phuc_phan`, `xuat_lich_su`, `nap_lich_su` (`may_chu.rs`); `Kho.xuatLichSu/napLichSu`, `dungDuAnKhoiPhuc` (`kho.ts`); `LichSuDuAn` (`thanh-phan/LichSuHo.tsx`); `lich-su.json` (`sao-luu.ts`) |
| Hoàn tác bước | `src/hoan-tac.ts`; `BuocChungCua` (`TienDoDuAn.tsx`), `TabTienDo` (`man/ho/TienDo.tsx`) |
| Đợt thu hồi (0.9.27) | `timDotTheoChu` (`dot-thu-hoi.ts`), cột `dotThuHoi` (`nhap-excel.ts`), `dongTheoDot` (`bao-cao.ts`), `dotPheDuyet` (`phuong-an.ts`) |
| So sánh bản đồ – hồ sơ; ảnh ghi chú | `doiChieuSoSanh` (`man/ban-do/ranh.ts`), `HopSoSanh`, `HopAnhGhiChu` (`LopPhu.tsx`), `GhiChuHienTruong.anh` |
| Dự án liên xã (1.0.4) | `src/tong-hop-tinh/lien-xa.ts` (`gomLienXa`, `maTiepTheo`, `loiTuyen`, `doGiongTen`); store `tuyen` (`kho-tinh.ts`, DB phiên bản 3); `thanh-phan/LienXa.tsx` (xã), `LienXaTinh.tsx` (tỉnh); Phụ lục 03 (`excel-tinh.ts`), `co_lien_xa`/`lien_xa` (`bao-cao-tinh.ts`) |
| Lý trình (1.0.4) | `src/ly-trinh.ts` (`docLyTrinh`, `hienLyTrinh`, `matBangTheoLyTrinh`, `excelLyTrinh`); `Thua.lyTrinh`; `thanh-phan/OLyTrinh.tsx`, `thanh-phan/LyTrinh.tsx` (`HopGhiLyTrinh`, `TheLyTrinh`); cột `lyTrinh` (`nhap-excel.ts`); `TomTatDuAn.lyTrinh` |
| Lịch đề xuất, Bắt đầu sử dụng (1.0.4) | `src/am-lich.ts` (`amSangDuong`), `deXuatNgayNghi` (`lich-lam-viec.ts`), `TheLich` (`HopCaiDat.tsx`); `thanh-phan/BatDau.tsx` (`KHOA_THE_CAI_DAT` mở sẵn thẻ Cài đặt) |
| Word / In bảng tính hộ (1.0.4) | `van-ban/tai-lieu-don-gian.ts` (`taoDocx`, `taoHtmlIn`, `inTaiLieu`), `van-ban/bang-tinh-ho.ts` (`taiLieuBangTinh`); nút ở `man/ho/TinhToan.tsx` |
| Tìm tờ/thửa, soát đi tới ô (1.0.4) | `timHo`, `docToThua` (`tim-kiem.ts`); `Man.ho.thuaId` → `TabThua noiBat` (lớp `tr.noi-bat`); `KetQuaSoat.tab/thuaId`, `TAB_QUY_TAC` (`soat-phuong-an.ts`), `KetQuaSoatPA` (`PhuongAn.tsx`) |
| QĐ 64/2026 (1.0.5) | `policy/goi/sonla-2026-10-06.json` (`chuyenDoiNghe.theoThon`, `chuyenTiep`, `hoTroTienSdd.ngoaiTruK4D111`); lõi `heSoChuyenDoiNghe`, `thonCoHeSo` (`packages/core/src/chinh-sach.ts`); `Thua.thonBan`, `TaiDinhCuHo.giaoDatK4D111`; `thanh-phan/OThonBan.tsx` (`OThonBan`, `HopGhiThonBan`); `GOI_MOI_NHAT`, `GOI_CO_SAN` (`goi-chinh-sach.ts`); nguyên văn `policy/nguon/qd64-2026-sua-qd106-qd14.md` |
| Tuyến qua cổng, bản đồ Km, báo cáo đoạn, TĐC (1.0.5) | Worker `/api/tuyen`; `dsTuyenTrenCong`, `guiTuyenLenCong` (`cong-tinh.ts`); `DaiKm`, `TheLyTrinhBanDo` (`thanh-phan/LyTrinh.tsx`); `dongTheoDoan` (`bao-cao.ts`); `duLieuBoTriTdc` (`van-ban/thuc-te.ts`), mẫu T8, T9 |
| Kiểm thử | `test/goi-tinh.test.ts`, `test/cong-tinh.test.ts`, `test/hoi-dap-*.test.ts`, `e2e/tong-hop-tinh.spec.ts`, `e2e/hoi-dap.spec.ts` |

## 5. Bí mật — không ghi vào kho, không hỏi lại

Anh Lâm tự giữ:
- Khóa ký bản cập nhật `gpmb.key`. Đã đặt trong GitHub Secrets.
- Mã quản trị cổng `MA_QUAN_TRI`.
- Mật khẩu khóa cấp tỉnh.
- Mã truy cập của xã.
