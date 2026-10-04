# 21. Gửi tỉnh, tổng hợp cấp tỉnh

Mục đích: cấp tỉnh (quản trị viên) xem tổng thể tiến độ bồi thường, hỗ trợ, tái định cư của mọi dự án trên địa bàn các xã, phường. Cấp tỉnh xem được chi tiết từng dự án đầy đủ như người dùng cấp xã (chỉ xem).

Phần mềm có hai cách gửi, dùng chung một định dạng gói:

| | Phương án 1 — gửi tệp | Phương án 2 (mức b) — cổng Cloudflare |
|---|---|---|
| Xã làm gì | Bấm "Xuất gói gửi tỉnh" ra tệp `.gpmbtinh`, rồi gửi bằng thư điện tử công vụ, Zalo, USB hoặc ổ dùng chung | Bấm "Gửi lên cổng của tỉnh" |
| Tỉnh làm gì | Chọn tệp ở ô "Nhận gói" | Bấm "Tải gói mới từ cổng Cloudflare" |
| Hạ tầng | Không cần | Một Worker + một kho R2 trên tài khoản Cloudflare của tỉnh (mục 4) |
| Ai đọc được hồ sơ | Chỉ máy tỉnh giữ khóa bí mật, khi nhập đúng mật khẩu khóa | Như cột trái. Cổng và Cloudflare chỉ giữ bản đã mã hóa |

Vào chức năng: **Công cụ → "Gửi tỉnh, tổng hợp tỉnh"**. Màn hình có hai thẻ: **Gửi lên tỉnh (cấp xã)** và **Tổng hợp tỉnh (cấp tỉnh)**.

## 1. Mã hóa, chữ ký — ai đọc được gì

### Khóa cấp tỉnh

Khóa cấp tỉnh là một cặp khóa RSA-OAEP 3072, tạo một lần trên máy tổng hợp của tỉnh.

- **Khóa công khai** (tệp `.gpmbkhoa`) gửi cho các xã. Tệp này không bí mật.
- **Khóa bí mật** ở lại máy tỉnh, được mã hóa bằng **mật khẩu khóa** (PBKDF2-SHA256, 600.000 vòng). Mật khẩu không được lưu.

Mỗi lần mở phần mềm, cán bộ tỉnh nhập mật khẩu khóa để mở khóa; khi đó mới nhận gói và xem chi tiết được.

### Gói `.gpmbtinh`

Gói là một tệp zip gồm hai phần:

- `thong-tin.json` — phần ngoài. Gồm: đơn vị gửi, thời điểm, tên dự án, số dự án, số hồ sơ, số tệp, số bản đồ, người xuất (cán bộ), vân tay khóa tỉnh, khóa ký và chữ ký của đơn vị gửi. **Không có họ tên, số giấy tờ, địa chỉ của người có đất, không có số tiền.**
- `du-lieu.bin` — bản sao lưu (định dạng sao lưu phiên bản 1) chỉ gồm các dự án được chọn. Phần này được mã hóa AES-256-GCM bằng một khóa ngẫu nhiên; khóa ngẫu nhiên đó được bọc bằng khóa công khai của tỉnh.
  - Gồm: hồ sơ hộ, kiểm đếm, phương án, tiến độ, văn bản đã ghi số, bộ chính sách dự án dùng, mẫu văn bản tự chỉnh.
  - Gồm thêm khi chọn: tệp đính kèm, bản đồ DGN (cả các tờ ghép).
  - **Không gồm** tài khoản, mật khẩu, nhật ký hệ thống.

### Chữ ký của đơn vị gửi

Mỗi bản cài cấp xã tự tạo một khóa ký ECDSA P-256 ở lần gửi đầu. Khóa được lưu trong cài đặt chung của dữ liệu xã.

Phần mềm tỉnh từ chối gói trong các trường hợp sau:

| Trường hợp | Phần mềm tỉnh xử lý |
|---|---|
| Gói bị sửa (dữ liệu hoặc phần ngoài) | Từ chối |
| Gói mã hóa cho khóa tỉnh khác | Từ chối |
| Gói ký bằng khóa khác lần nhận trước của cùng đơn vị (có thể bị giả danh, hoặc xã cài lại phần mềm, đổi máy) | Hỏi xác nhận; chỉ nhận sau khi đã gọi điện xác minh |

Đây là chữ ký kỹ thuật của bản cài phần mềm, **không thay chữ ký số của cơ quan** theo pháp luật về giao dịch điện tử. Số liệu chính thức vẫn theo văn bản, báo cáo có chữ ký, đóng dấu.

### Vân tay

Vân tay là 16 ký tự, dạng `AAAA-BBBB-CCCC-DDDD`. Cấp tỉnh đọc vân tay khóa qua điện thoại để xã đối chiếu **một lần** khi nhập tệp khóa. Việc này tránh trường hợp nhận nhầm tệp khóa giả, khiến gói được mã hóa cho người khác.

## 2. Cấp tỉnh — làm một lần

1. Đăng nhập tài khoản **Quản trị** → Công cụ → **Gửi tỉnh, tổng hợp tỉnh** → thẻ **Tổng hợp tỉnh (cấp tỉnh)**.
2. **Tạo khóa cấp tỉnh**:
   - Nhập tên đơn vị tổng hợp.
   - Nhập mật khẩu khóa: từ 12 ký tự, có chữ và số, hoặc một cụm từ từ 16 ký tự.
   - Nhập lại mật khẩu.
3. Bấm **Xuất bản dự phòng khóa**. Cất vào USB hoặc két. **Tuyệt đối không gửi tệp này cho xã.** Nếu mất khóa (hỏng máy, quên mật khẩu) mà không có bản dự phòng, sẽ không mở được các gói đã nhận; khi đó phải tạo khóa mới và các xã phải gửi lại.
4. Bấm **Xuất khóa công khai gửi các xã** → gửi tệp `Khoa-cong-khai_….gpmbkhoa` cho các xã, phường. Đọc vân tay để xã đối chiếu.
5. Chuyển sang máy tổng hợp mới: ở màn hình tạo khóa, chọn **Hoặc khôi phục khóa đã có** → chọn tệp dự phòng.
6. **Quên mật khẩu khóa hoặc nghi lộ khóa** (0.9.22): ở khung Khóa cấp tỉnh, bấm **Tạo khóa mới (thay khóa cũ)…**. Cần tài khoản quản trị.
   - Nhập tên đơn vị, mật khẩu mới → **Tạo khóa mới**. Bấm **Hủy, giữ khóa cũ** nếu đổi ý.
   - Sau khi thay khóa:
     - Các gói đã nhận vẫn còn số liệu trong bảng tổng hợp, nhưng không xem chi tiết được nữa (vì được mã hóa cho khóa cũ).
     - Xuất **khóa công khai mới** gửi các xã, đọc vân tay mới để xã đối chiếu.
     - Các xã nhập lại khóa (thẻ Gửi lên tỉnh → "Thay bằng tệp khóa khác") rồi gửi lại gói.

## 3. Sử dụng hằng ngày

### Cấp xã — thẻ "Gửi lên tỉnh"

1. **Khóa của tỉnh**: chọn tệp `.gpmbkhoa` do tỉnh gửi (làm một lần; cần tài khoản quản trị hoặc lãnh đạo). Gọi điện đối chiếu vân tay với tỉnh.
2. **Nội dung gửi**:
   - Nhập tên đơn vị gửi; mặc định lấy đơn vị đang sử dụng ở "Thiết lập đơn vị".
   - Chọn dự án gửi (mặc định: tất cả).
   - Chọn có kèm tệp đính kèm, kèm bản đồ hay không.
3. **Gửi**: bấm **Xuất gói gửi tỉnh** rồi gửi tệp, hoặc bấm **Gửi lên cổng của tỉnh** (khi đã cài cổng, mục 4.3).
   - Cần quyền sao lưu (cán bộ nghiệp vụ trở lên).
   - Nhật ký hệ thống ghi mỗi lần gửi.
   - Gửi lại bất kỳ lúc nào; tỉnh luôn giữ bản mới nhất.

### Cấp tỉnh — thẻ "Tổng hợp tỉnh"

1. Nhập **mật khẩu khóa** → **Mở khóa**. Mỗi lần mở phần mềm làm một lần; bấm "Khóa lại" khi rời máy. Đã cài cổng Cloudflare thì mở khóa xong phần mềm **tự tải gói mới** từ cổng.
2. **Nhận gói**: chọn một hoặc nhiều tệp `.gpmbtinh`, hoặc bấm **Tải gói mới từ cổng Cloudflare**.
   - Mỗi đơn vị gửi chỉ giữ gói mới nhất. Gói trùng hoặc cũ hơn bị bỏ qua.
   - Lịch sử nhận gói xem ở cuối màn hình.
3. **Bảng tổng hợp tiến độ GPMB theo xã, phường**:
   - Lọc theo xã, phường; tìm theo tên dự án, chủ đầu tư, đơn vị gửi.
   - Chỉ số chung: số đơn vị gửi, số xã, số dự án, số hộ, số hộ đã bàn giao mặt bằng, số hộ có vướng mắc, kinh phí tạm tính.
   - Mỗi dòng dự án: thanh hiện trạng (cùng quy tắc với cấp xã, tính tại ngày nhận gói), số hộ đã bàn giao (%), vướng mắc, số hộ đã phê duyệt phương án, giá trị tạm tính, diện tích thu hồi.
   - **Xuất Excel** tổng hợp toàn tỉnh (có thêm số hộ theo từng hiện trạng, số hộ đã chốt phương án, số tệp đính kèm).
4. **Xem chi tiết**: bấm tên dự án (hoặc nút "Xem chi tiết" của đơn vị gửi).
   - Phần mềm chuyển sang phiên **chỉ xem** dữ liệu của đơn vị đó, đầy đủ các màn hình như cấp xã: tổng quan, hồ sơ hộ, kiểm đếm, phương án, bản đồ, văn bản, tài liệu, báo cáo; xuất Excel, Word được.
   - Mọi thao tác ghi đều bị chặn.
   - Bấm **Thoát xem** để trở lại đúng màn hình tổng hợp, vẫn đăng nhập.
   - Dữ liệu xem chỉ nằm trong bộ nhớ, **không trộn vào dữ liệu nghiệp vụ của máy tỉnh**.

### Nơi lưu dữ liệu tổng hợp

Dữ liệu tổng hợp nằm trong cơ sở dữ liệu riêng của máy tỉnh (IndexedDB `gpmb-tong-hop-tinh`), gồm:

- Khóa cấp tỉnh.
- Gói nguyên bản, vẫn mã hóa.
- Phần tóm tắt số liệu (tên dự án, xã, số lượng, tiền, diện tích — không có tên người) để mở bảng tổng hợp nhanh.

Dữ liệu này **không nằm trong bản sao lưu** của phần mềm. Khi mất, chỉ cần khôi phục khóa từ bản dự phòng rồi nhận lại gói.

## 4. Cổng Cloudflare (phương án 2 mức b)

### 4.1. Cổng làm gì

Cổng là một Cloudflare Worker (`tools/cong-tinh/worker.js`) và một kho R2. Cổng chỉ:

- Nhận gói `.gpmbtinh` **đã mã hóa** từ các xã, giữ 5 bản gần nhất của mỗi xã.
- Trả gói cho tỉnh.

Cổng không có khóa giải mã. Cổng xác thực như sau:

- **Mã quản trị** của tỉnh: biến bí mật `MA_QUAN_TRI` của Worker, tối thiểu 24 ký tự.
- **Mã truy cập riêng của từng xã**: tỉnh cấp trong phần mềm. Cổng chỉ lưu mã băm SHA-256; tỉnh cấp lại hoặc thu hồi được bất kỳ lúc nào.

Xã chỉ gửi được gói của mình. Xã không xem, không tải được gói của xã khác.

### 4.2. Triển khai — cách 1: trên trang quản trị Cloudflare (không cài gì)

Tên các mục trên trang Cloudflare có thể thay đổi theo thời gian; đối chiếu trang hướng dẫn của Cloudflare.

1. Đăng nhập `https://dash.cloudflare.com` bằng tài khoản Cloudflare của tỉnh.
2. **R2 Object Storage** → bật R2 nếu là lần đầu (Cloudflare có thể yêu cầu khai báo phương thức thanh toán dù dùng trong hạn mức miễn phí) → **Create bucket** → tên `gpmb-cong-tinh` → Create.
3. **Workers & Pages** → **Create** → **Create Worker** → tên `gpmb-cong-tinh` → **Deploy**.
4. Mở Worker vừa tạo → **Edit code** → xóa mã mẫu, dán toàn bộ nội dung tệp `tools/cong-tinh/worker.js` → **Deploy**.
5. **Settings → Bindings** → **Add** → **R2 bucket** → Variable name `KHO`, chọn bucket `gpmb-cong-tinh` → lưu (Deploy).
6. Lấy mã quản trị: trong phần mềm, thẻ Tổng hợp tỉnh → **Cổng Cloudflare của tỉnh** → bấm **Tạo mã quản trị ngẫu nhiên** → sao chép mã.
7. Trên Cloudflare: **Settings → Variables and Secrets** → **Add** → Type **Secret**, Name `MA_QUAN_TRI`, Value = mã vừa sao chép → Deploy.
8. Lấy địa chỉ Worker ở **Settings → Domains & Routes**, dạng `https://gpmb-cong-tinh.<tên-tài-khoản>.workers.dev`.
9. Trong phần mềm:
   1. Dán địa chỉ và mã quản trị → **Lưu và kiểm tra kết nối**. Phải báo "Đã kết nối cổng với quyền quản trị".
   2. Ô **Mã truy cập của các xã**: chọn hoặc nhập tên xã → **Cấp mã**.
   3. Sao chép **địa chỉ cổng + mã** gửi riêng cho xã đó (điện thoại, thư công vụ; không đăng nơi công khai). Mã chỉ hiện một lần; mất thì cấp lại (mã cũ hết hiệu lực).
10. Ở xã: thẻ Gửi lên tỉnh → **Cổng Cloudflare của tỉnh** → dán địa chỉ và mã → **Lưu và kiểm tra kết nối** → từ nay bấm **Gửi lên cổng của tỉnh**.

### 4.3. Triển khai — cách 2: dòng lệnh (wrangler)

```
cd tools/cong-tinh
npx wrangler login
npx wrangler r2 bucket create gpmb-cong-tinh
npx wrangler secret put MA_QUAN_TRI      # dán mã quản trị (tạo trong phần mềm)
npx wrangler deploy
```

Cấu hình nằm trong `tools/cong-tinh/wrangler.toml` (binding `KHO` → bucket `gpmb-cong-tinh`).

### 4.4. Giới hạn, chi phí

Cần kiểm tra lại bảng giá Cloudflare tại thời điểm triển khai.

- Gói miễn phí của Workers giới hạn số yêu cầu mỗi ngày, và thân mỗi yêu cầu tối đa khoảng 100 MB. Phần mềm chặn gói trên 95 MB; khi đó bỏ tệp đính kèm, bản đồ hoặc gửi tệp bằng cách khác.
- R2 miễn phí trong hạn mức dung lượng lưu trữ và số thao tác mỗi tháng; tải xuống không tính phí băng thông.
- Quy mô 75 xã, mỗi xã gửi vài lần mỗi tuần, thường nằm trong hạn mức miễn phí. Gói có nhiều ảnh, PDF thì dung lượng tăng nhanh.

### 4.5. Lưu ý về dữ liệu

- Gói gửi qua cổng đã mã hóa đầu-cuối; Cloudflare chỉ thấy phần ngoài (tên đơn vị, tên dự án, số lượng, cán bộ xuất). Dù vậy, việc dùng dịch vụ đám mây của doanh nghiệp nước ngoài để lưu, chuyển dữ liệu của cơ quan nhà nước cần ý kiến của cơ quan chủ quản, đơn vị chuyên trách công nghệ thông tin của tỉnh. Đồng thời cần đối chiếu quy định về bảo vệ dữ liệu cá nhân (Luật Bảo vệ dữ liệu cá nhân, Nghị định 13/2023/NĐ-CP) và về an toàn thông tin.
- Khi chưa có ý kiến đó, dùng **phương án 1 (gửi tệp)** qua kênh công vụ.
- Mã truy cập của xã, mã quản trị lưu trên máy (bản cài: mã hóa bằng tài khoản Windows — DPAPI). Lộ mã thì tỉnh thu hồi và cấp mã mới; đổi mã quản trị bằng cách đặt lại `MA_QUAN_TRI`.

## 5. Còn hạn chế

- Tỉnh xem bản **mới nhất** của từng đơn vị, chưa xem lại được các bản cũ. Cổng giữ 5 bản gần nhất nhưng phần mềm chỉ tải bản mới nhất.
- Phiên xem chi tiết dựng toàn bộ dữ liệu của đơn vị trong bộ nhớ. Gói rất lớn (hàng trăm MB tệp đính kèm) mở chậm, tốn bộ nhớ.
- Chưa tự gửi định kỳ; xã bấm gửi khi cập nhật.
- Chưa có cảnh báo "xã lâu chưa gửi"; xem cột "Số liệu đến" và lịch sử nhận gói.
- Cổng Cloudflare mới được kiểm thử bằng Worker chạy trong môi trường thử với R2 giả lập, chưa triển khai trên tài khoản Cloudflare thật.
