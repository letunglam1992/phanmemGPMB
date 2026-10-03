# 20. Cập nhật phần mềm (bản 0.9.15)

Phần mềm đã cài tự tìm bản mới trên GitHub Releases của kho `letunglam1992/phanmemGPMB`, tải bộ cài, **kiểm tra chữ ký số**, cài đè lên bản đang dùng rồi khởi động lại. Dữ liệu (`%LOCALAPPDATA%\vn.sonla.gpmb`) giữ nguyên; trước khi cài phần mềm tự sao lưu.

## Cách hoạt động
| Thành phần | Nội dung |
|---|---|
| Vỏ Rust (`src-tauri/src/cap_nhat.rs`) | Lệnh `cap_nhat_kiem_tra`, `cap_nhat_cai_dat` dùng `tauri-plugin-updater`; giao diện không có quyền gọi plugin trực tiếp |
| Khóa công khai | `src-tauri/khoa-cap-nhat.pub` (biên dịch kèm). **Trống = bản cài chưa bật cập nhật trong phần mềm** |
| Nguồn bản mới | `https://github.com/letunglam1992/phanmemGPMB/releases/latest/download/latest.json` (công khai; chỉ tải tệp này, không gửi dữ liệu hồ sơ) |
| Cài | Windows NSIS chế độ `passive` (hiện tiến trình, không hỏi), cài cho người dùng hiện tại, đè bản cũ |
| Giao diện | Giới thiệu, bản quyền → "Cập nhật phần mềm": Kiểm tra cập nhật, nội dung bản mới, "Sao lưu và cập nhật" (tài khoản có quyền Cài đặt — Quản trị), "Để sau"; tùy chọn "Tự kiểm tra khi mở phần mềm" (mặc định bật, tối đa 1 lần/ngày, lỗi mạng bỏ qua); nút "Có bản mới x.y.z" ở cột trái |

## Việc tác giả làm một lần
1. Tạo cặp khóa trên máy mình (cần Node.js): `npx @tauri-apps/cli signer generate -w %USERPROFILE%\.tauri\gpmb.key` (đặt mật khẩu).
2. GitHub → kho → Settings → Secrets and variables → Actions: `TAURI_SIGNING_PRIVATE_KEY` = nội dung `gpmb.key`; `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = mật khẩu.
3. Đưa nội dung `gpmb.key.pub` vào `apps/desktop/src-tauri/khoa-cap-nhat.pub` (gửi cho người lập trình hoặc tự commit).
4. Cài tay **một lần** bộ cài có khóa công khai (bản đầu tiên phát hành sau bước 3). Từ đó các bản sau cập nhật trong phần mềm.

Mất khóa bí mật → các bản đã cài không nhận cập nhật nữa (phải cài tay bản ký bằng khóa mới). Không đưa khóa bí mật vào kho.

## Mỗi lần phát hành
1. Tăng phiên bản ở 5 chỗ (CLAUDE.md), commit (thông điệp commit = nội dung bản mới hiện trong phần mềm), push.
2. Tạo nhãn trùng phiên bản và push: `git tag v0.9.16 && git push origin v0.9.16`.
3. GitHub Actions (job `phat-hanh`): kiểm thử → build NSIS có chữ ký → GitHub Release `v0.9.16` kèm `…setup.exe`, `.sig`, `latest.json`. Job dừng báo lỗi nếu nhãn khác phiên bản, thiếu secret hoặc thiếu khóa công khai.

## Đã kiểm thử / hạn chế
- **Đã kiểm thử:** `cargo check`, `cargo test` (vỏ Rust biên dịch kèm plugin); `test/cap-nhat.test.ts` (lịch tự kiểm tra, gọi lệnh); Playwright `cap-nhat.spec.ts` (bản trình duyệt không gọi GitHub).
- **Chưa chạy:** phát hành thật (chờ khóa), tải và cài trên Windows. Bản đang cài (≤ 0.9.14) chưa có chức năng này → cài tay một lần.
- Máy không ra được Internet (github.com) → cài tay bộ cài như trước (chạy đè, không cần gỡ).
