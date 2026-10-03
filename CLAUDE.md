# Phần mềm GPMB Sơn La — hướng dẫn cho phiên làm việc mới

Ứng dụng Windows (.exe, Tauri 2) hỗ trợ bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất tại tỉnh Sơn La.
Tác giả, bản quyền: Lê Tùng Lâm – Sở Nông nghiệp và Môi trường tỉnh Sơn La.

## Đọc trước khi sửa
- `docs/09-ung-dung-desktop.md`: bảng chức năng — trạng thái đã chạy / đã kiểm thử / hạn chế (cập nhật mỗi khi đổi chức năng).
- `docs/17-danh-gia-toan-dien.md`: đánh giá toàn diện, danh sách P0–P3 và lộ trình (việc tiếp theo lấy từ đây).
- `docs/02` ma trận nghiệp vụ, `docs/03` sổ vướng mắc (VM-xx), `docs/06` quyết định nghiệp vụ (QD-xx).
- `docs/19-van-ban-du-an-thuc-te.md` + `docs/mau-thuc-te/`: bộ văn bản dự án thực tế (đã ẩn danh) để soạn mẫu văn bản, biểu Excel; `docs/08` mục 9: lộ trình bản đồ.

## Cấu trúc
- `packages/core`: tính toán thuần (decimal.js), có căn cứ từng dòng. `packages/gis`: đọc DGN V7/V8, dựng thửa.
- `apps/desktop/src`: React; `tinh-ho.ts` ghép tính toán hộ; `ung-dung.tsx` trạng thái chung; `kho.ts` (IndexedDB) / `kho-mang.ts` (máy chủ).
- `apps/desktop/src-tauri`: vỏ Rust, máy chủ mạng nội bộ `may_chu.rs` (axum + SQLite).
- `policy/goi/*.json`: bộ chính sách có căn cứ; `apps/desktop/public/mau-van-ban`: 27 mẫu .docx.

## Lệnh
- `npm run typecheck` · `npm test` (gốc kho) · `cd apps/desktop/src-tauri && cargo test`
- `cd apps/desktop && npx vite build && npx vite preview --port 4173` để thử giao diện bằng Playwright (Chromium có sẵn).
- Tệp bản đồ thật chỉ kiểm qua biến môi trường `GPMB_DGN_MAU`, `GPMB_DGN_V8` — **không đưa tệp thật vào kho**.
- CI (`.github/workflows/build-windows.yml`) chạy kiểm thử và đóng gói bộ cài NSIS, tệp tải ở mục Artifacts.

## Quy tắc bắt buộc
- Trao đổi tiếng Việt; trích dẫn đúng Điều/Khoản khi nêu căn cứ; **không tự đặt ra** điều kiện, mức giá, tỷ lệ — thiếu căn cứ thì để "Thiếu căn cứ"/cho người dùng nhập kèm căn cứ.
- Không gửi dữ liệu hồ sơ, thông tin cá nhân ra dịch vụ bên ngoài; không đưa dữ liệu cá nhân thật vào kho.
- Mọi nút xuất tệp dùng `taiXuong` (`src/tai-xuong.ts`) — không tự tạo liên kết tải riêng.
- Số tiền, diện tích dùng Decimal; phân biệt rõ trong báo cáo: đã chạy, đã kiểm thử, còn hạn chế.
- Đổi phiên bản: `apps/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (kèm `Cargo.lock` mục `gpmb-sonla`, `package-lock.json`). Phát hành bản cập nhật trong phần mềm: push nhãn `vX.Y.Z` trùng phiên bản (docs/20) — không đưa khóa bí mật vào kho.
