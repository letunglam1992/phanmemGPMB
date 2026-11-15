# Phần mềm GPMB Sơn La — hướng dẫn cho phiên làm việc mới

Ứng dụng Windows (.exe, Tauri 2) hỗ trợ bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất tại tỉnh Sơn La.
Tác giả, bản quyền: Lê Tùng Lâm – Sở Nông nghiệp và Môi trường tỉnh Sơn La.

## Đọc trước khi sửa
- `docs/09-ung-dung-desktop.md`: bảng chức năng — trạng thái đã chạy / đã kiểm thử / hạn chế (cập nhật mỗi khi đổi chức năng).
- `docs/17-danh-gia-toan-dien.md`: đánh giá toàn diện, danh sách P0–P3 và lộ trình (việc tiếp theo lấy từ đây).
- `docs/02` ma trận nghiệp vụ, `docs/03` sổ vướng mắc (VM-xx), `docs/06` quyết định nghiệp vụ (QD-xx).

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
- Đổi phiên bản: `apps/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.


## Tiết kiệm token (bổ sung — không thay đổi quy tắc nghiệp vụ ở trên)
- Sửa bằng Edit đúng đoạn cần đổi. Không dùng Write ghi đè tệp đã có, không in lại cả tệp.
- Tìm vị trí bằng Grep trước, rồi Read có offset/limit quanh dòng đó. Các tệp rất dài, không đọc cả tệp: `src-tauri/src/may_chu.rs` (~1.800 dòng), `src/tinh-ho.ts` (~1.160 dòng), `src/ung-dung.tsx`, `src/giao-dien.css`, `src/xuat-excel.ts`.
- `docs/09-ung-dung-desktop.md` (~77 KB) và `docs/17-danh-gia-toan-dien.md` (~37 KB) rất dài: chỉ Grep đúng dòng chức năng hoặc mục P0–P3 liên quan, không đọc cả tệp. Khi đổi chức năng, vẫn cập nhật dòng tương ứng trong docs/09 bằng Edit nhỏ.
- Không đọc dữ liệu chính sách thô: `policy/nguon/*.json` (riêng `nq152-2025-bang-gia-dat.json` ~2 MB), `policy/nguon/qd106-2025-phu-luc-2.md`. Cần tra giá đất, đơn giá thì Grep đúng xã, loại đất hoặc mã đơn giá, hoặc đọc bộ `policy/goi/*.json`.
- Không đọc `docs/anh/`, `templates/nguon/*.docx`, `apps/desktop/public/mau-van-ban/*.docx`, `package-lock.json`, `Cargo.lock`, `src-tauri/icons/`.
- Không refactor, không đổi tên, không sửa ngoài phạm vi yêu cầu.
- Khi đang sửa: chạy kiểm thử đúng phần vừa đổi, ví dụ `cd apps/desktop && npx vitest run test/tinh-ho.test.ts`; phần lõi thì `npm test -w @gpmb/core`; Rust thì `cargo test <tên_kiểm_thử>`. Chạy `npm run typecheck` và `npm test` đầy đủ một lần ở cuối, trước khi báo xong. Chỉ xem phần cuối kết quả: thêm `2>&1 | tail -25`.
- Kiểm thử trình duyệt (Playwright, `npm run e2e`) và `cargo test` đầy đủ chỉ chạy khi được yêu cầu hoặc khi sửa đúng phần đó.
- Báo cáo cuối lượt tối đa 8 dòng: tệp nào, hàm nào đã đổi, kết quả kiểm thử, phần nào còn hạn chế. Không mô tả lại tính năng.
- Khi đổi phiên bản, sửa ba tệp liệt kê ở trên bằng Edit nhỏ.
