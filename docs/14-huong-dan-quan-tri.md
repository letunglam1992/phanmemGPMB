# 14. Hướng dẫn quản trị

## 1. Cài đặt, nâng cấp

- Bộ cài `GPMB Son La_x.y.z_x64-setup.exe` (cài theo người dùng, không cần quyền quản trị máy; kèm WebView2 nếu máy chưa có). Chưa có chữ ký số → Windows SmartScreen có thể cảnh báo: chọn "More info" → "Run anyway" (hoặc nhờ bộ phận CNTT cho phép).
- **Nâng cấp:** tạo bản sao lưu thủ công trước; cài bản mới đè lên bản cũ (không cần gỡ). Mạng nội bộ: nâng cấp máy chủ trước, sau đó các máy trạm.
- Thư mục dữ liệu: `%LOCALAPPDATA%\vn.sonla.gpmb\` (dữ liệu máy đơn trong WebView2; dữ liệu máy chủ trong `may-chu\`). **Gỡ cài đặt có thể xóa dữ liệu máy đơn** — sao lưu trước khi gỡ.

## 2. Tài khoản

- Lần đầu mở: tạo tài khoản **Quản trị**. Nên tạo thêm **một quản trị dự phòng** (phần mềm nhắc khi chỉ có 1).
- Menu tên người dùng → **Quản lý tài khoản**: tạo, đổi vai trò, khóa/mở khóa, đặt lại mật khẩu (người dùng phải đổi ở lần đăng nhập sau). Không xóa tài khoản (giữ truy vết nhật ký) — khóa thay cho xóa.
- **Quên mật khẩu:** quản trị khác đặt lại. Nếu quên mật khẩu của quản trị duy nhất: không đặt lại được trong phần mềm → cài trên máy khác (hoặc chế độ khác), tạo quản trị mới rồi **khôi phục từ tệp sao lưu** (tệp sao lưu không chứa tài khoản).
- Nhật ký hệ thống (menu → Nhật ký hệ thống): đăng nhập, đăng nhập sai, thay đổi tài khoản, chốt/phê duyệt/hủy phương án, sao lưu, khôi phục, nhập Excel, xóa. Dòng đầu cho biết chuỗi nhật ký còn nguyên vẹn hay đã bị sửa.

## 3. Sao lưu, phục hồi

| Việc | Cách làm |
|---|---|
| Sao lưu thủ công | Nút **Sao lưu, khôi phục** (thanh trên) → Tạo bản sao lưu → cất tệp `.gpmb` ra USB / ổ mạng nội bộ |
| Tự động | Cài đặt chung → Tự động sao lưu: chu kỳ, số bản giữ lại, thư mục (nên chọn ổ mạng nội bộ). Chạy trên máy đơn / máy chủ khi phần mềm đang mở |
| Khôi phục (quản trị) | Sao lưu, khôi phục → chọn tệp → xem thông tin, kiểm tra toàn vẹn → *Thay thế toàn bộ* (phần mềm tự tải bản sao lưu dữ liệu hiện có trước) hoặc *Gộp* |
| Máy chủ mạng nội bộ | Ngoài tệp `.gpmb`, định kỳ sao chép thư mục `%LOCALAPPDATA%\vn.sonla.gpmb\may-chu\` **khi đã tắt phần mềm** (chứa tài khoản, nhật ký hệ thống, chứng chỉ) |

Tệp sao lưu **không mã hóa**, có thông tin cá nhân → cất giữ theo quy chế bảo mật của cơ quan.

## 4. Mạng nội bộ

Xem docs/11. Tóm tắt: máy chủ đặt IP tĩnh, bật phần mềm trong giờ làm việc; cổng 47800 (đổi được) mở trong tường lửa cho mạng riêng; máy trạm đối chiếu vân tay chứng chỉ khi kết nối lần đầu. **Không xóa thư mục `may-chu`** (mất chứng chỉ → mọi máy trạm phải đối chiếu lại; mất tài khoản, nhật ký).

**Đổi máy chủ:** trên máy chủ cũ tạo bản sao lưu; tắt phần mềm; sao chép thư mục `may-chu` sang cùng đường dẫn ở máy mới (giữ nguyên chứng chỉ, tài khoản) → bật chế độ máy chủ ở máy mới → máy trạm đổi IP (vân tay không đổi).

## 5. Cài đặt chung (lãnh đạo, quản trị)

| Thẻ | Nội dung |
|---|---|
| Lịch ngày nghỉ | Nhập ngày nghỉ lễ, Tết, nghỉ bù, làm bù từng năm theo thông báo chính thức; tích "đã nhập đủ" (VM-25) |
| Tiền chậm trả | Tỷ lệ tiền chậm nộp (%/ngày) theo giai đoạn, kèm căn cứ Luật Quản lý thuế hiện hành |
| Tự động sao lưu | Như mục 3 |
| Mạng nội bộ | Chế độ, địa chỉ, vân tay; đưa dữ liệu máy đơn lên máy chủ |
