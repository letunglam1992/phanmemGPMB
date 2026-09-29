# 17. Đánh giá toàn diện hệ thống (28/9/2026, phiên bản 0.3.0)

Phạm vi: toàn bộ mã nguồn trong kho (`apps/desktop`, `packages/core`, `packages/gis`, `apps/desktop/src-tauri`), tài liệu `docs/00–16`, bộ chính sách `policy/goi/sonla-2026-03-31.json`. Mọi kết luận dưới đây có dẫn chứng đã kiểm tra (tệp:dòng, phép thử chạy thật). Số liệu hiệu suất đo bằng Node trên máy chủ CI-tương đương; máy văn phòng chạy WebView2 thường chậm hơn 2–3 lần.

**Chưa kiểm tra được (thiếu điều kiện):** bộ cài `.exe` chạy trên Windows thật (chỉ kiểm qua CI build); hiệu năng WebView2 trên máy cấu hình thấp; mạng nội bộ nhiều máy thật (chỉ có kiểm thử tự động `mang-that.test.ts` trên một máy); các mẫu văn bản .docx mở bằng Word (chỉ kiểm bằng đọc lại XML); dữ liệu thật của nhiều dự án.

---

## 1. Hiểu hệ thống hiện tại

### 1.1 Kiến trúc

| Tầng | Thành phần | Ghi chú |
|---|---|---|
| Vỏ | Tauri 2 (Rust) + WebView2 | `src-tauri/src/lib.rs`: sao lưu tự động, lưu tệp tải về, bật máy chủ mạng nội bộ |
| Giao diện | React 18 + Vite, một khối SPA | `apps/desktop/src`: 21 màn/thành phần chính; CSS tự viết (`giao-dien.css` 910 dòng) |
| Nghiệp vụ tính | `packages/core` (TypeScript thuần, decimal.js) | Bồi thường đất, tài sản, cây, hỗ trợ, TĐC, làm tròn — hàm thuần, có kiểm thử |
| Bản đồ | `packages/gis` | Đọc DGN V7/V8 (tự viết bộ đọc CFB/zlib), dựng thửa, diện tích giao |
| Dữ liệu chính sách | `policy/goi/*.json` + `du-lieu.ts` (NQ 152, QĐ 32, PL VIII, PL V) | Đóng gói cùng ứng dụng |
| Lưu trữ | Máy đơn: IndexedDB (`kho.ts`); mạng nội bộ: máy chủ Rust axum + SQLite (`may_chu.rs`) qua HTTPS tự ký, `kho-mang.ts` | Cùng giao diện `Kho` |

Mô hình dữ liệu là **tài liệu (document)**: mỗi `DuAn` và mỗi `Ho` là một bản ghi JSON nguyên khối. Thửa, tài sản, nhân khẩu, tiến độ, chi trả, nhật ký hồ sơ nằm **bên trong** `Ho`; tiến độ chung, kế hoạch, bản đồ, **các bản phương án đã chốt (kèm bản sao toàn bộ hồ sơ)** nằm bên trong `DuAn`.

### 1.2 Luồng dữ liệu

1. Khởi động: `NhaCungCap.taiLai()` (`ung-dung.tsx`) đọc **toàn bộ** dự án và **toàn bộ** hồ sơ vào bộ nhớ React.
2. Mọi màn hình đọc từ ngữ cảnh (`dsDuAn`, `hoCua(duAnId)`), **tự tính lại** kết quả từng hộ bằng `tinhHo()` khi cần (không lưu kết quả tính).
3. Ghi: `luuHo/luuDuAn` → `kho.luu*` → **`taiLai()` toàn bộ** (dòng 292, 298, 314…).
4. Mạng nội bộ: máy trạm hỏi `/thay-doi` mỗi 4 giây (dòng 225); có thay đổi của người khác → `taiLai()` toàn bộ. Máy chủ kiểm tra phiên bản bản ghi (khóa lạc quan) và một số quy tắc nghiệp vụ.

### 1.3 Chức năng tự động / thủ công / phụ thuộc bên ngoài

- **Tự động:** tính tiền (khi mở màn), trạng thái hộ, cảnh báo quá hạn/sắp hết hạn, gợi ý cấu hình bản đồ, sao lưu tự động (30 phút kiểm tra một lần, mặc định 1 ngày/bản), nhận diện cột Excel.
- **Thủ công có kiểm soát:** chọn giá đất, chốt/phê duyệt phương án, xác nhận bước (tách người gửi – người duyệt), chi trả, vướng mắc.
- **Phụ thuộc bên ngoài:** không (không gọi Internet; OCR, phông, dữ liệu đóng gói trong bộ cài). Cập nhật chính sách/đơn giá = phát hành bản mới.

---

## 2. Kiểm kê chức năng và phân loại

| # | Chức năng | Mức | Lý do |
|---|---|---|---|
| 1 | Lõi tính bồi thường, hỗ trợ, TĐC (`packages/core`) | **A** | Hàm thuần, Decimal, căn cứ từng dòng, 55 kiểm thử, khớp biểu mẫu thật (thửa 85). |
| 2 | Giải trình từng khoản (Tính toán, giải trình) | **A** | Khối lượng × đơn giá × hệ số, công thức, căn cứ, cảnh báo — đúng định hướng "truy vết từ tổng về khoản". |
| 3 | Phiên bản phương án (chốt – phê duyệt – hủy, băm SHA-256, so sánh) | **B** | Logic đúng, máy chủ chặn sửa bản đã duyệt. Hạn chế: lưu bản sao toàn bộ hồ sơ trong `DuAn` (xem §7). |
| 4 | Tiến độ 16 bước, bước chung 1–4, vướng mắc theo bước | **C** | Không có trạng thái "Không áp dụng" cho bước tùy chọn (14 cưỡng chế, 7 đối thoại) → hộ không thể đạt 100%; "Hoàn thành GPMB" = xong bước 12 (chi trả) chứ không phải bàn giao mặt bằng (`trang-thai.ts:53`). |
| 5 | Thời hạn theo ngày làm việc, lịch nghỉ | **B** | Đúng NLV/ngày, có cảnh báo thiếu lịch; chỉ một số bước có hạn (đúng — bước không có hạn không tính). |
| 6 | Nhập liệu hồ sơ (thông tin, nhân khẩu, thửa, kiểm đếm) | **D** | **Ô số không kiểm tra định dạng**: "9222,1" làm **trắng toàn bộ màn hình**; "20.000" được hiểu im lặng là 20 (xem §4.1, P0-1, P0-2). |
| 7 | Nhập Excel + ánh xạ cột | **B** | Kiểm tra toàn tệp, không nhập dở khi còn lỗi, xử lý số mơ hồ tốt. Hạn chế: ghi từng hồ sơ không trong giao dịch (lỗi giữa chừng → nhập dở). |
| 8 | Xuất Excel, văn bản (22 mẫu + 5 mẫu xã) | **B** | Đủ mẫu, dữ liệu dùng chung một lần. Chưa chép định dạng từng ô của biểu mẫu gốc (đã ghi trong docs/09). |
| 9 | Bản đồ DGN (V7/V8), kiểm tra bản đồ, phạm vi thu hồi | **B** | Bộ đọc tự viết đã kiểm trên 2 tệp thật; chưa đọc cung tròn V8, ô dùng chung, tham chiếu ngoài. |
| 10 | Chi trả, tiền chậm trả | **C** | Logic đúng (Đ94 LĐĐ), nhưng **sổ chi trả nằm trong hồ sơ hộ**: xóa hộ là mất chứng từ chi (xem P0-4). |
| 11 | Hỗ trợ tái định cư (C08, C10, C11) | **B** | Có căn cứ, khoản khác bắt buộc căn cứ. Chưa có phương án bố trí TĐC cấp dự án (quỹ lô, bốc thăm, giao lô). |
| 12 | Dashboard, cảnh báo, báo cáo tổng hợp, chốt kỳ | **C** | Nội dung đúng, nhưng tính lại mọi hộ của mọi dự án ở **mỗi lần** thanh tiêu đề vẽ lại (xem §7). |
| 13 | Tài khoản, vai trò, nhật ký hệ thống (chuỗi băm) | **B** | PBKDF2 210.000 vòng, khóa 30 giây sau 5 lần sai, nhật ký chuỗi băm. Chế độ máy đơn: quyền chỉ kiểm ở giao diện. |
| 14 | Mạng nội bộ (máy chủ Rust, TLS tự ký, khóa lạc quan) | **B** | Thiết kế đúng hướng. Hạn chế: tải lại toàn bộ dữ liệu khi có thay đổi; không lưu lịch sử phiên bản bản ghi. |
| 15 | Sao lưu, khôi phục | **C** | Có băm kiểm tra, tự động. **Tệp sao lưu không mã hóa** nhưng chứa CCCD, điện thoại, tên người dân. |
| 16 | Tìm kiếm chung, ô chọn tìm nhanh, Lưu và tiếp | **A** | Không dấu, chữ cái đầu, điều hướng phím. |
| 17 | Mã hồ sơ | **D** | Sinh theo `số hộ + 1` (`DuAn.tsx:182`): xóa một hộ rồi thêm → **trùng mã**; 3 định dạng khác nhau (H01, H001). Không kiểm tra trùng ở giao diện và máy chủ. |
| 18 | OCR văn bản scan | **B** | Chạy trên máy, tiếng Việt; tách biệt, không ảnh hưởng dữ liệu. |

---

## 3. Rà soát nghiệp vụ GPMB

| Khâu | Hiện trạng | Khoảng trống cụ thể |
|---|---|---|
| Dự án | Có | **Không có "đợt thu hồi / giai đoạn"**: dự án nhiều đợt (thông báo, QĐ, phương án theo đợt) phải tách thành nhiều dự án → mất tổng hợp chung. |
| Kế hoạch thu hồi | Ngày kế hoạch từng bước (cấp dự án) | Không có kế hoạch theo hộ/đợt; không có phân công cán bộ phụ trách. |
| Thông báo thu hồi | Bước 3 chung + mẫu 01 + cảnh báo 90/180 ngày | Đủ. |
| Kiểm đếm | Kiểm đếm theo mã đơn giá, đợt kiểm đếm | Không có biên bản kiểm đếm có chữ ký (bản quét) gắn hồ sơ — xem "Hồ sơ tài liệu". |
| Chủ sử dụng | Hộ/cá nhân/tổ chức, nhân khẩu | **Không có thực thể "người"**: cùng một người ở 2 dự án là 2 bản ghi rời; không phát hiện trùng CCCD giữa dự án. **Đồng sử dụng** chỉ cảnh báo trùng tờ/thửa, không có tỷ lệ phân chia. |
| Nguồn gốc, loại đất | Nguồn gốc dạng chữ tự do; loại đất theo mã | Nguồn gốc là chữ tự do → không lọc/thống kê được theo nhóm nguồn gốc (điều kiện bồi thường Điều 95, 96 LĐĐ). |
| DT thu hồi | Nhập tay hoặc từ bản đồ | Không kiểm tra DT thu hồi ≤ DT thửa trên giao diện (chỉ nhập Excel mới kiểm). |
| Giá đất | Chọn từ NQ 152, phân lớp, hệ số dự án | Tốt. |
| Nhà, vật kiến trúc; cây, vật nuôi | QĐ 32, PL VIII, PL V | Tốt. |
| Hỗ trợ | Ổn định đời sống, chuyển đổi nghề, tạm cư, TĐC, B13 | **Thưởng bàn giao mặt bằng trước hạn (C13, Đ15 PL II QĐ 106)** có trong ma trận nghiệp vụ nhưng **chưa tính**; chỉ có mẫu văn bản 20, 21. |
| Tái định cư | Theo hộ | Chưa có quản lý quỹ đất/nhà TĐC cấp dự án (lô, diện tích, giá, đã giao cho ai) → không phát hiện 2 hộ cùng một lô. |
| Phương án, phê duyệt | Chốt – phê duyệt – hủy, so sánh, xuất đúng bản | Tốt; chưa có trình tự "thẩm định" tách khỏi "phê duyệt" trong dữ liệu (chỉ là bước 8). |
| Chi trả | Đợt chi, chứng từ, chậm trả | Chi trả nằm trong hồ sơ hộ (rủi ro mất khi xóa). |
| **Bàn giao mặt bằng** | **Không có dữ liệu** | Không có ngày bàn giao, biên bản, diện tích đã bàn giao → không tính được thưởng bàn giao sớm, không báo cáo được "% mặt bằng đã bàn giao" — chỉ số lãnh đạo quan tâm nhất. |
| Tiến độ, thời hạn | 16 bước, NLV, cảnh báo | Thiếu "Không áp dụng"; bước làm song song (niêm yết và lấy ý kiến) bị ép tuyến tính khi tính "bước hiện tại". |
| Hồ sơ tài liệu | Văn bản sinh ra; số/ngày văn bản | **Không đính kèm được tệp** (biên bản kiểm đếm ký, QĐ đã ban hành bản quét, GCN). |
| Báo cáo, dashboard | Tổng hợp nhiều dự án, chốt kỳ, Excel/Word | Tốt về nội dung; thiếu chỉ số DT đã bàn giao/DT phải thu hồi. |

---

## 4. Rà soát dữ liệu và logic

### 4.1 Lỗi đã tái hiện

1. **Nhập "9222,1" vào DT thu hồi → trắng màn hình.** Tái hiện bằng Playwright: nội dung trang rỗng, lỗi `DecimalError: Invalid argument: 9222,1`. Nguyên nhân: `tinhHo` gọi `D(t.dienTichThuHoi)` trên chuỗi thô (`tinh-ho.ts:293`), không có ErrorBoundary. Người dùng Việt Nam gõ dấu phẩy thập phân là hành vi tự nhiên. Mất toàn bộ thay đổi chưa lưu.
2. **"20.000" được hiểu là 20.** `D("20.000") = 20` (đã chạy thử). Hạn mức giao đất NN, giá gạo, DT, khấu trừ… nhập kiểu phân cách nghìn sẽ **sai im lặng hàng nghìn lần** (vd. hạn mức 20 m² thay vì 20.000 m² → hỗ trợ chuyển đổi nghề gần bằng 0). Nhập Excel đã chặn trường hợp này (`docSo`), nhập tay thì không.
3. **Trùng mã hồ sơ**: `HopThemHo` đề xuất `H{soHo+1}`; tạo từ bản đồ `H{i}` 3 chữ số; nhập Excel `H001`. Không kiểm tra trùng. Hệ quả: nhập Excel bổ sung theo mã gắn nhầm hộ (`theoMaCu` là Map — mã trùng bị ghi đè), văn bản, Excel xuất cùng mã cho 2 người.

### 4.2 Quan hệ, khóa, toàn vẹn

- Khóa là UUID (`taoId`) — đúng. Liên kết thửa ↔ tài sản bằng `thuaId` nội bộ hồ sơ — đúng.
- **Xóa không có ràng buộc**: xóa hộ đã có trong phương án phê duyệt hoặc đã chi trả vẫn được (chỉ cần quyền SUA_HO_SO); xóa dự án (máy đơn) xóa dự án trước, rồi từng hộ, **không trong giao dịch** (`kho.ts` `xoaDuAn`) → lỗi giữa chừng để lại hộ mồ côi.
- **Nhập Excel, tạo hồ sơ từ bản đồ, cập nhật hàng loạt** ghi từng hồ sơ một, không giao dịch → lỗi giữa chừng (mất mạng, xung đột) để lại nhập dở, trái nguyên tắc "không nhập dở" đã công bố.
- **Chính sách không tìm thấy thì âm thầm dùng bộ mặc định** (`ung-dung.tsx:330`) → phương án cũ có thể bị tính lại bằng bộ khác mà không báo.
- **Nhật ký hồ sơ do máy khách tự ghi** (`h.nhatKy` được nối ở giao diện) và chỉ có câu mô tả ("Cập nhật hồ sơ"), không có giá trị trước/sau → không trả lời được "ai sửa DT thửa 85 từ 9.222 thành 9.322, lúc nào".

### 4.3 Trạng thái, tiến độ, thời hạn

- `TrangThaiBuoc = CHUA | DANG | XONG | CHO_DUYET` (`mo-hinh.ts:169`) — thiếu **KHONG_AP_DUNG**. Bước 14 "Cưỡng chế (nếu có)" và 7 "đối thoại" (chỉ khi có ý kiến không đồng ý) làm tiến độ không thể 100% và "bước hiện tại" dừng sai chỗ.
- "Hoàn thành GPMB" = xong bước 12 chi trả; nhưng theo khoản 5, 6 Điều 87 LĐĐ 2024, QĐ thu hồi (bước 13) ban hành sau chi trả và việc bàn giao mặt bằng mới là kết thúc GPMB.
- Thời hạn: bước không có quy định thời hạn không tính hạn — đúng. Bước làm song song (6 niêm yết 30 ngày và 7 lấy ý kiến) — dữ liệu cho phép, nhưng giao diện "bước hiện tại" chỉ lấy bước chưa xong đầu tiên.

### 4.4 Nhiều người cùng sửa

- Máy chủ khóa lạc quan theo **cả bản ghi hộ** → hai người sửa hai thẻ khác nhau (một người kiểm đếm, một người ghi chi trả) của cùng một hộ: người lưu sau bị từ chối, phải nhập lại. Với `DuAn` còn nặng hơn: cập nhật bước chung, kế hoạch, thông tin văn bản, chốt phương án, bản đồ đều ghi cùng một bản ghi dự án.

---

## 5. Giao diện và trải nghiệm (đo ở 1366×768 và 1536×864)

1. **Thanh tiêu đề chiếm 160 px (≈ 21% chiều cao) ở 1366×768**, vì các nút bị đẩy xuống hàng thứ hai; thêm chân trang 30 px. Hồ sơ hộ: tiêu đề + dải 16 bước + thẻ tab chiếm ~430 px trước khi thấy dữ liệu → **chỉ thấy 2 dòng thửa**.
2. **Thẻ tab bị cắt** ở 1366 px: hồ sơ hộ ("Ti…"), không gian dự án ("Văn b…") — phải cuộn ngang mới thấy Tiến độ, Chi trả, Nhật ký.
3. **Bảng danh sách hộ bị cắt cột Tổng** ở 1366 px (cuộn ngang).
4. Thanh bên 236 px không thu gọn được ở cỡ laptop; mục cuối "Nhật ký hệ thống" bị che.
5. Dải 16 bước tròn lặp lại thông tin với thẻ "Tiến độ thực hiện" bên trái và thẻ Tiến độ → ba chỗ hiện cùng một dữ liệu.
6. Tốt: tìm kiếm chung Ctrl+K, ô chọn tìm nhanh, Lưu và tiếp, giải trình từng khoản, màu trạng thái nhất quán, chế độ tối.

---

## 6. Kiến trúc và chất lượng mã

| Vấn đề | Vị trí | Ảnh hưởng |
|---|---|---|
| Ngữ cảnh toàn cục tạo hàm mới mỗi lần vẽ (`hoCua`, `chinhSach`, cả đối tượng `giaTri`) | `ung-dung.tsx:270, 330` | Mọi `useMemo` phụ thuộc `hoCua` mất tác dụng → tính lại toàn bộ (§7) |
| Kết quả tính không được lưu đệm | `tinhHo` gọi ở 11 nơi | Chi phí tính lặp lại |
| Không có ErrorBoundary | toàn ứng dụng | Một lỗi bất kỳ → trắng màn hình |
| Ô số là `<input>` chuỗi tự do, không có thành phần nhập số dùng chung | Thua.tsx, KiemDem.tsx, HoSo.tsx, TongQuan.tsx… | P0-1, P0-2 |
| Tệp lớn: `BanDo.tsx` 947 dòng, `HoSo.tsx` 723, `nhap-excel.ts` 635 | | Khó bảo trì, khó kiểm thử |
| 383 thuộc tính `style={{…}}` nội tuyến; CSS một tệp 910 dòng | | Khó giữ nhất quán, khó sửa bố cục đáp ứng |
| Không có ESLint/Prettier cấu hình trong kho | gốc kho | Không phát hiện tự động hook sai phụ thuộc, lỗi bị nuốt (17 chỗ `catch` bỏ qua) |
| Không có kiểm thử giao diện trong CI | `.github/workflows` | Playwright chỉ chạy tay; lỗi trắng màn hình trên không bị CI phát hiện |
| Dữ liệu chính sách/đơn giá biên dịch vào mã | `du-lieu.ts`, `policy/` | Đổi đơn giá = phát hành bản mới |
| Tốt | `packages/core` tách thuần; giao diện `Kho` trừu tượng hóa lưu trữ; đặt tên tiếng Việt nhất quán; 214 kiểm thử tự động; máy chủ kiểm lại quy tắc nghiệp vụ | |

---

## 7. Hiệu suất

**Đo được:** `tinhHo` ≈ 0,44 ms/hộ (hộ mẫu 2 thửa, 21 tài sản) trên Node; WebView2 máy văn phòng ước 1–1,3 ms.

**Điểm nghẽn chính:** `useTongHop()` (`dung-canh-bao.ts`) được gọi ở thanh tiêu đề (`UngDung.tsx:38`, luôn hiển thị) và lần nữa ở Tổng quan (`TongQuan.tsx:32`); nó tính `tinhHo` cho **mọi hộ của mọi dự án**. Vì `hoCua`/`chinhSach` là hàm mới mỗi lần vẽ, `useMemo` chạy lại **mỗi lần ngữ cảnh vẽ lại** — mỗi lần chuyển màn, mỗi thông báo nhanh, mỗi lần lưu.

| Quy mô | Hộ (ước) | Mỗi lần chuyển màn / lưu | Tổng quan (2 lần tính) |
|---|---|---|---|
| 100 dự án | 5.000 | 2–6 s treo | 4–12 s |
| 500 dự án | 25.000 | 11–30 s | 22–60 s |
| 1.000 dự án | 50.000 | 22–65 s — không dùng được | |

Điểm nghẽn phụ:
- **Mỗi lần lưu một hộ → `taiLai()` đọc lại toàn bộ dự án và hồ sơ** (`ung-dung.tsx:292`). Mạng nội bộ: mỗi thay đổi của người khác (hỏi mỗi 4 giây) → tải lại toàn bộ qua HTTPS; hồ sơ mẫu 5,6 KB → 10.000 hộ ≈ 60–150 MB mỗi lần.
- **Bản phương án lưu bản sao toàn bộ hồ sơ trong bản ghi `DuAn`**: 1.000 hộ × 5 bản ≈ 30 MB trong một bản ghi dự án, bị đọc ở mọi màn, gửi lại toàn bộ mỗi lần lưu dự án (kể cả khi chỉ đổi một ngày kế hoạch).
- Danh sách hộ, danh sách hồ sơ vẽ toàn bộ dòng (không ảo hóa) — chưa đo; với vài nghìn dòng có nhiều ô nhập sẽ chậm khi cuộn, lọc.
- Nhật ký hồ sơ tăng không giới hạn trong bản ghi hộ.

---

## 8. An toàn dữ liệu

| Mục | Hiện trạng | Đánh giá |
|---|---|---|
| Xác thực | PBKDF2-SHA256 210.000 vòng; khóa 30 s sau 5 lần sai; phiên máy chủ 8 giờ, token 32 ký tự ngẫu nhiên | Tốt |
| Phân quyền | Mạng nội bộ: máy chủ kiểm quyền từng yêu cầu, chặn sửa bản PA đã duyệt, tách gửi – duyệt | Tốt |
| | Máy đơn: chỉ kiểm ở giao diện; ai có quyền vào hồ sơ Windows có thể sửa IndexedDB | Chấp nhận được cho máy đơn, cần nêu rõ trong tài liệu |
| Kiểm tra dữ liệu phía máy chủ | Chỉ kiểm tiến độ, phương án; **không kiểm cấu trúc, kiểu số** của hồ sơ | Máy trạm lỗi/cũ có thể ghi dữ liệu hỏng làm trắng màn hình mọi máy |
| XSS | React tự thoát; không có `dangerouslySetInnerHTML`/`innerHTML`; CSP chặn script ngoài | Tốt |
| Injection | SQLite dùng tham số; không ghép SQL | Tốt |
| Khóa API | Không có dịch vụ ngoài | Tốt |
| Lộ dữ liệu | **Tệp sao lưu `.gpmb` không mã hóa**, chứa CCCD, điện thoại, họ tên; sao lưu tự động vào Documents | **Rủi ro** khi chép USB, gửi qua mạng xã hội — liên quan quy định về bảo vệ dữ liệu cá nhân (NĐ 13/2023/NĐ-CP và văn bản thay thế, nếu có — cần đối chiếu văn bản hiện hành) |
| Nhật ký | Nhật ký hệ thống chuỗi băm (tốt); nhật ký hồ sơ không có giá trị trước/sau, do máy khách ghi | Không truy vết được thay đổi từng trường |
| Khôi phục | Có băm kiểm tra; khôi phục thay thế/gộp; chế độ thay thế xóa trước, ghi sau, không giao dịch | Không có lịch sử phiên bản bản ghi để khôi phục một hộ bị sửa sai |

---

## 9. Điểm mù

1. **Dữ liệu tăng lớn** — §7: thiết kế "nạp hết vào bộ nhớ, tính lại mọi thứ" chỉ phù hợp vài nghìn hộ.
2. **Người dùng nhập sai định dạng số** — §4.1: sai im lặng hoặc trắng màn hình.
3. **Sửa dữ liệu cũ sau khi phê duyệt** — có cảnh báo lệch, nhưng không bắt buộc lập bản điều chỉnh; không lưu giá trị trước khi sửa.
4. **Nhiều người cùng sửa một hộ/dự án** — xung đột cả bản ghi (§4.4).
5. **Thay đổi đơn giá, chính sách** — phương án đã chốt tính lại bằng `boChinhSach` ghi trong bản; nhưng hồ sơ đang lập dở chuyển sang bộ mới thế nào chưa có quy trình (không có "chuyển bộ chính sách có đối chiếu chênh lệch").
6. **Dự án nhiều đợt** — không mô hình hóa.
7. **Một hộ liên quan nhiều dự án** — không liên kết; thống kê theo người, kiểm tra hạn mức, hỗ trợ ổn định đời sống "không cộng dồn theo từng dự án" (docs/02 C02) không kiểm được.
8. **Bước phụ thuộc nhiều bước / song song / không áp dụng** — §4.3.
9. **Máy đơn hỏng ổ cứng hoặc xóa hồ sơ WebView2** — dữ liệu chỉ còn ở bản sao lưu gần nhất (mặc định 1 ngày), cùng ổ đĩa nếu không đổi thư mục.
10. **Cập nhật phần mềm làm đổi cấu trúc dữ liệu** — IndexedDB có số phiên bản, nhưng dữ liệu `Ho`/`DuAn` không có trường `phienBanCauTruc`, không có bước chuyển đổi (migration) → trường mới/đổi tên xử lý rải rác bằng `?? mặc định`.

---

## 10. Đề xuất nâng cấp

### P0 – Bắt buộc sửa

> **Cập nhật 28/9/2026 (phiên bản 0.4.0):** P0-1 … P0-6 và P1-9 đã triển khai theo docs/18 và quyết định QD-25 (docs/06) — trạng thái, kiểm thử, hạn chế từng mục ở docs/09.
>
> **Cập nhật 28/9/2026 (phiên bản 0.5.0) — Giai đoạn 2:** P1-3 (bước "Không áp dụng", hoàn thành = bàn giao mặt bằng), P1-4 (bàn giao mặt bằng, thưởng bàn giao trước hạn do cán bộ khai báo mốc), P1-7 (giao diện laptop 1366×768), P2-5 (pháp lý nguồn gốc đất có cấu trúc) và §11.1 "Soát phương án" đã triển khai — chi tiết, kiểm thử, hạn chế ở docs/09.
>
> **Cập nhật 28/9/2026 (phiên bản 0.6.0) — Giai đoạn 3:** P1-1, P1-2, P1-5 (khôi phục chỉ Quản trị, số năm giữ lịch sử chỉnh được), P1-6, P1-8, P2-3, P2-6 và máy đơn SQLite (làm ngay theo quyết định người dùng) đã triển khai — chi tiết, số đo, kiểm thử, hạn chế ở docs/09, docs/11.
>
> **Cập nhật 29/9/2026 (phiên bản 0.7.0) — Giai đoạn 4:** P2-7, §11.2 (thời gian bước không có thời hạn luật định do đơn vị nhập), §11.3 (ngưỡng lệch do đơn vị tự đặt), §11.4 (mẫu báo cáo hiện có, người dùng sửa, thêm mẫu khác), §11.5, P2-2 (đính kèm có trong sao lưu), P2-1 (chưa ký số) đã triển khai — chi tiết ở docs/09, docs/11.

> **Cập nhật 29/9/2026 (phiên bản 0.8.0) — Giai đoạn 5 (phần nghiệp vụ):** P3-1 (phương án theo đợt, mã hồ sơ chung), P3-3 (giá lô do đơn vị nhập kèm căn cứ, ghi nhận bốc thăm khi chọn), P3-2 (so khớp số định danh giữa dự án — người dùng nhất trí), P3-4 và P2-4 đã triển khai (QD-27) — chi tiết ở docs/09, docs/11. Phần "sản phẩm thương mại" của GĐ5 (ký số bộ cài và gói chính sách, cơ chế bản quyền/kích hoạt, hợp đồng hỗ trợ) **chưa làm**: cần chứng thư số và quyết định của đơn vị.

| Mã | Vấn đề → Nguyên nhân | Giải pháp | Lợi ích | Độ khó | Rủi ro |
|---|---|---|---|---|---|
| P0-1 | Trắng màn hình khi nhập "9222,1" → `D()` trên chuỗi thô, không ErrorBoundary | (a) ErrorBoundary theo màn, giữ bản nháp, báo ô lỗi; (b) `tinhHo` bọc từng dòng: giá trị không phải số → dòng "Thiếu căn cứ: DT không hợp lệ" thay vì ném lỗi | Không bao giờ mất dữ liệu đang nhập | Thấp (1–2 ngày) | Thấp |
| P0-2 | "20.000" hiểu là 20 → không có quy ước số thống nhất | Thành phần `<OSo>` dùng chung: hiển thị kiểu Việt (1.234,5), lưu chuẩn máy ("1234.5"), dùng lại `docSo` (chặn chuỗi mơ hồ); chuyển đổi dữ liệu cũ một lần, báo các giá trị nghi vấn (vd. hạn mức < 100 m²) | Chặn sai số tiền hàng loạt | Trung bình (3–5 ngày, nhiều ô) | Trung bình — cần chuyển đổi dữ liệu cũ có kiểm tra |
| P0-3 | Trùng mã hồ sơ → sinh mã theo số lượng | Sinh mã = max hiện có + 1 theo một định dạng; kiểm tra trùng trong dự án ở giao diện, nhập Excel và máy chủ (chỉ mục duy nhất `du_an_id + ma`) | Liên kết Excel, văn bản đúng người | Thấp | Thấp; dữ liệu cũ trùng → báo để cán bộ đổi |
| P0-4 | Xóa hộ mất phương án/chi trả → không ràng buộc, không xóa mềm | Chặn xóa hộ đã có trong bản PA đã chốt/duyệt hoặc đã có đợt chi; còn lại xóa mềm (thùng rác 30 ngày, khôi phục được); xóa dự án trong một giao dịch | Không mất chứng từ tài chính | Thấp–TB | Thấp |
| P0-5 | Sao lưu không mã hóa chứa CCCD | Mã hóa AES-GCM bằng mật khẩu sao lưu (PBKDF2), bắt buộc khi xuất thủ công; sao lưu tự động dùng khóa lưu trong Windows Credential Manager (DPAPI) | Giảm rủi ro lộ dữ liệu cá nhân | Trung bình | Quên mật khẩu = không khôi phục → cần quy trình giữ mật khẩu |
| P0-6 | Ghi nhiều hồ sơ không giao dịch (nhập Excel, từ bản đồ, hàng loạt); **khôi phục kiểu "thay thế" xóa hết dữ liệu rồi mới ghi từng bản ghi** (`sao-luu.ts:113`) — lỗi giữa chừng là mất cả dữ liệu cũ lẫn mới | Thêm `kho.luuNhieu(ds)` trong một giao dịch IndexedDB / một giao dịch SQLite ở máy chủ | Đúng cam kết "không nhập dở" | Thấp | Thấp |

### P1 – Nên sửa sớm

| Mã | Vấn đề → Giải pháp | Lợi ích | Độ khó |
|---|---|---|---|
| P1-1 | Tính lại toàn bộ mỗi lần vẽ → ghi nhớ `hoCua` theo dự án (Map), `useCallback` cho `chinhSach`, `useMemo` cho `giaTri`; bộ đệm `tinhHo` theo (tham chiếu hồ sơ, dự án, bộ chính sách) bằng `WeakMap`; chỉ một `useTongHop` dùng chung | Chuyển màn tức thì đến ~20.000 hộ | Thấp (2–3 ngày) |
| P1-2 | Lưu một hộ tải lại tất cả → cập nhật cục bộ bản ghi vừa lưu; mạng nội bộ chỉ tải bản ghi trong danh sách `/thay-doi` | Giảm 99% dữ liệu truyền | Trung bình |
| P1-3 | Thiếu "Không áp dụng" cho bước; "Hoàn thành" sai mốc → thêm `KHONG_AP_DUNG` (bắt buộc lý do), tiến độ tính trên bước áp dụng; "Hoàn thành GPMB" = đã bàn giao mặt bằng | Chỉ số tiến độ đúng thực tế | Thấp |
| P1-4 | Không có dữ liệu bàn giao mặt bằng → thêm `banGiao {ngay, dienTich, bienBan}` theo hộ; tính thưởng bàn giao sớm C13 (Đ15 PL II QĐ 106, VM-16 đã có cách xử lý linh động) ; chỉ số "% DT đã bàn giao" | Đo đúng mục tiêu GPMB | Trung bình |
| P1-5 | Nhật ký không có trước/sau → máy chủ (và kho máy đơn) ghi bản tóm tắt khác biệt theo trường khi lưu; lưu phiên bản cũ của bản ghi (bảng `lich_su`) | Truy vết ai sửa gì; khôi phục một hộ | Trung bình |
| P1-6 | Bản PA lưu trong `DuAn` → tách `phuongAn` thành bản ghi riêng (một bản ghi/phiên bản), `DuAn` chỉ giữ tóm tắt | Bản ghi dự án nhỏ, giảm xung đột | Trung bình (có chuyển đổi dữ liệu) |
| P1-7 | Giao diện laptop 1366×768 → thanh tiêu đề một hàng ≤ 64 px, gom meta vào menu; dải 16 bước thu gọn thành thanh tiến độ khi cuộn; tab cuộn có mũi tên hoặc "Thêm ▾"; thanh bên thu gọn | Thấy gấp 2–3 lần dữ liệu | Thấp–TB |
| P1-8 | Máy chủ không kiểm cấu trúc → kiểm tra lược đồ (kiểu số, trường bắt buộc) trước khi ghi | Một máy trạm lỗi không làm hỏng dữ liệu chung | Trung bình |
| P1-9 | ESLint + kiểm thử giao diện Playwright trong CI (5–10 kịch bản chính, gồm nhập số sai) | Chặn lỗi hồi quy | Thấp |

### P2 – Tối ưu

- **P2-1** Chính sách/đơn giá thành **gói dữ liệu ký số nạp được** (không phát hành lại phần mềm), kèm "chuyển hồ sơ sang bộ mới + bảng chênh lệch từng hộ".
- **P2-2** Đính kèm tệp (biên bản ký, QĐ bản quét, GCN) theo hộ/bước — lưu ở bảng `tep` sẵn có của máy chủ.
- **P2-3** Ảo hóa bảng dài (danh sách hộ, thửa, tài sản).
- **P2-4** Tách `BanDo.tsx`, `HoSo.tsx` theo thẻ; thay style nội tuyến bằng lớp CSS.
- **P2-5** Nguồn gốc đất thành danh mục có cấu trúc (theo Điều 95, 96, 97 LĐĐ) + ô ghi chú, để lọc/thống kê điều kiện bồi thường.
- **P2-6** Trường `phienBanCauTruc` + bước chuyển đổi dữ liệu có kiểm thử cho mỗi lần đổi mô hình.
- **P2-7** Khóa theo phần (thẻ) thay vì cả bản ghi: tách `chiTra`, `tienDo` thành bản ghi con để hai người sửa song song.

### P3 – Phát triển sau

- **P3-1** Đợt thu hồi trong dự án (thông báo, QĐ, phương án theo đợt; tổng hợp chung).
- **P3-2** Thực thể "người có đất" dùng chung giữa dự án (khớp CCCD), cảnh báo hỗ trợ trùng.
- **P3-3** Quỹ TĐC cấp dự án (lô, giá, trạng thái giao).
- **P3-4** Phân công cán bộ phụ trách hộ/nhóm hộ, danh sách việc của tôi.

---

## 11. Cải tiến tạo khác biệt (có giá trị thực tế)

1. **Kiểm tra chéo tự động trước khi chốt phương án** — một nút "Soát phương án" chạy bộ quy tắc: DT thu hồi > DT thửa; thửa trùng giữa hộ; tổng DT thu hồi dự án ≠ DT theo bản đồ/QĐ; hộ có đất ở bị thu hồi hết mà chưa xét TĐC; hộ thu hồi ≥ 30% đất NN chưa xét ổn định đời sống; đơn giá cây vượt mật độ; nhân khẩu = 0 mà có tạm cư… Mỗi quy tắc có căn cứ. Đây là lỗi hay gặp nhất khi thẩm định — phát hiện trước giúp giảm vòng trả hồ sơ.
2. **Dự báo tiến độ** — từ ngày thực tế các bước và thời hạn luật định, tính ngày dự kiến có thể bàn giao mặt bằng cho từng hộ và cả dự án; cảnh báo sớm hộ kéo lùi (đường găng).
3. **Đối chiếu ba nguồn**: bản đồ (DT hình học) ↔ hồ sơ trích đo (DT nhập) ↔ phương án (DT tính tiền); báo lệch theo ngưỡng.
4. **Báo cáo định kỳ một nút** theo mẫu của tỉnh (đã có Word/Excel) + tự sinh "danh sách hộ vướng mắc kèm bước và số ngày tồn đọng".
5. **Nhật ký thay đổi dạng "ai – sửa gì – từ … thành …"** hiển thị ngay trên từng ô (bấm xem lịch sử) — tăng niềm tin khi thanh tra, kiểm toán.

---

## 12. Kiến trúc mục tiêu

| Thành phần | Quyết định |
|---|---|
| Frontend (React, Vite) | **Giữ**; tối ưu ngữ cảnh, ErrorBoundary, thành phần nhập số, ảo hóa bảng |
| Lõi tính `packages/core` | **Giữ nguyên** (đang tốt nhất hệ thống) |
| `packages/gis` | Giữ; bổ sung đọc cung tròn, ô dùng chung khi có tệp mẫu |
| Lưu trữ máy đơn | **Thay IndexedDB bằng SQLite trong vỏ Tauri** (cùng lược đồ với máy chủ): giao dịch thật, tệp CSDL sao lưu được bằng sao chép, dùng chung mã với máy chủ |
| Máy chủ mạng nội bộ (Rust axum, SQLite) | **Giữ**; bổ sung: kiểm tra lược đồ, bảng lịch sử phiên bản, API đọc theo thay đổi (delta), chỉ mục duy nhất mã hộ, bản ghi con (phương án, chi trả) |
| Xác thực | Giữ PBKDF2 + phiên; bổ sung đổi mật khẩu định kỳ tùy chọn cho quản trị |
| Lưu tệp | Dùng bảng `tep` sẵn có cho đính kèm; giới hạn cỡ; băm nội dung |
| Nhật ký | Nhật ký hệ thống giữ chuỗi băm; thêm nhật ký thay đổi theo trường ở máy chủ |
| Sao lưu | Mã hóa; máy chủ sao lưu SQLite theo lịch (VACUUM INTO) giữ N bản; khuyến nghị thư mục trên ổ khác |
| Báo cáo | Tính tổng hợp theo dự án có bộ đệm; chốt kỳ giữ nguyên |
| Triển khai | Giữ NSIS + CI; thêm ký số bộ cài (tránh cảnh báo SmartScreen), kiểm thử giao diện trong CI |
| Chỉ bổ sung khi mở rộng cấp tỉnh (nhiều xã) | Máy chủ trung tâm PostgreSQL + API web, đồng bộ từ máy chủ xã; **chưa cần** ở quy mô hiện tại |

---

## 13. Lộ trình

| Giai đoạn | Công việc | Ưu tiên | Module | Phụ thuộc | Kết quả |
|---|---|---|---|---|---|
| 1. Sửa lỗi, chuẩn hóa nền tảng | P0-1…P0-6, P1-9 (ESLint, Playwright CI) | P0 | tinh-ho, thành phần nhập, kho, may_chu, sao-luu | Không | Không còn sai số im lặng, trắng màn hình, trùng mã, mất chi trả, lộ dữ liệu sao lưu |
| 2. Tối ưu nghiệp vụ và UX | P1-3, P1-4, P1-7, P2-5, "Soát phương án" (§11.1) | P1 | trang-thai, mo-hinh, HoSo, UngDung | GĐ1 (ô số) | Tiến độ đúng thực tế, có bàn giao mặt bằng, dùng tốt trên laptop |
| 3. Hiệu suất và kiến trúc | P1-1, P1-2, P1-5, P1-6, P1-8, P2-3, P2-6, SQLite máy đơn | P1–P2 | ung-dung, kho, kho-mang, may_chu | GĐ1 | Chạy mượt 20.000+ hộ; truy vết thay đổi; khôi phục từng hộ |
| 4. Tự động hóa, nâng cao | §11.2–11.5, P2-1, P2-2, P2-7 | P2 | phuong-an, bao-cao, core | GĐ3 (lịch sử, bản ghi con) | Giảm vòng thẩm định, cảnh báo sớm, cập nhật chính sách không cần phát hành lại |
| 5. Sản phẩm thương mại | P3-1…P3-4, ký số bộ cài, tài liệu vận hành, hợp đồng hỗ trợ, cơ chế bản quyền/kích hoạt theo đơn vị | P3 | toàn hệ thống | GĐ1–4 | Triển khai được nhiều xã, nhiều tỉnh |

---

## 14. Mười vấn đề cần xử lý trước (theo thứ tự triển khai)

1. **Nhập "9222,1" làm trắng màn hình (P0-1).** Một thao tác gõ tự nhiên làm mất toàn bộ dữ liệu đang nhập; sửa nhanh, rủi ro thấp — làm đầu tiên.
2. **"20.000" bị hiểu là 20 (P0-2).** Sai tiền im lặng, có thể lọt vào phương án phê duyệt — rủi ro pháp lý cao nhất.
3. **Trùng mã hồ sơ (P0-3).** Làm nhập Excel gắn nhầm hộ, văn bản ghi nhầm người.
4. **Xóa hộ làm mất chi trả, phương án (P0-4).** Mất chứng từ tài chính không khôi phục được.
5. **Ghi hàng loạt không giao dịch (P0-6).** Nhập dở khi lỗi giữa chừng, dữ liệu nửa vời khó phát hiện.
6. **Sao lưu không mã hóa chứa CCCD (P0-5).** Rủi ro lộ dữ liệu cá nhân khi sao chép USB.
7. **Tính lại mọi hộ mỗi lần chuyển màn (P1-1).** Với 5.000 hộ đã treo vài giây; sửa chủ yếu là ghi nhớ đúng chỗ, lợi ích lớn nhất trên chi phí.
8. **Thiếu "Không áp dụng" và mốc bàn giao mặt bằng (P1-3, P1-4).** Chỉ số tiến độ báo cáo lãnh đạo đang sai bản chất.
9. **Không truy vết được giá trị trước/sau khi sửa (P1-5).** Cần cho thanh tra, kiểm toán và khi có khiếu nại.
10. **Giao diện chưa hợp laptop 1366×768 (P1-7).** Người dùng hằng ngày chỉ thấy 2 dòng dữ liệu, tab bị cắt — tăng thao tác cuộn, dễ bỏ sót thẻ Tiến độ, Chi trả.
