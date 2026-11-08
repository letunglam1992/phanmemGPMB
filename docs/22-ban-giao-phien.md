# Bàn giao phiên làm việc (08/11/2026) — để mở phiên mới

Dán vào phiên mới: *"Đọc CLAUDE.md và docs/22-ban-giao-phien.md rồi làm tiếp trên nhánh claude/great-rubin-4x4alw."*

## 1. Trạng thái

- **Nhánh làm việc**: `claude/great-rubin-4x4alw` (dòng 1.3.x đang dùng thật). Không dùng nhánh 0.9.x cũ.
- **Phiên bản**: 1.3.5. Đã kích hoạt quy trình phát hành ngày 08/11/2026; bản trước là 1.3.4.
  - Kiểm tra: `curl -sL https://github.com/letunglam1992/phanmemGPMB/releases/latest/download/latest.json` → `"version": "1.3.5"`.
- **Kiểm thử lúc bàn giao (đã chạy, đạt hết)**:
  - `npm run typecheck`;
  - `npm test`: core 89, gis 64, desktop 752;
  - eslint `--max-warnings=0`;
  - Playwright 118 kịch bản.
  - `cargo test` chạy ở commit a731921; Rust không đổi sau đó.

## 2. Nội dung 1.3.5 (các commit 6548b5a → 8023e44)

| Việc | Quyết định | Tệp chính |
|---|---|---|
| Hạn mức theo Phụ lục I QĐ 106/2025: đất NN theo nhóm loại đất (Điều 7), vị trí đất ở (Điều 3–6) | QD-46, VM-42 | `packages/core/src/han-muc.ts`, `tinh-ho.ts` `hanMucNNDuAn`, `TongQuan.tsx` FormDuAn |
| Số tờ nhập một lần cho tệp bản đồ (ưu tiên hơn số tờ đọc theo lớp); nhãn kép ba lớp; điền số tờ cho các thửa trống | QD-47 | `packages/gis/src/thua.ts`, `goi-y-cau-hinh.ts`, `so-to.ts`, `DienSoTo.tsx` |
| Chọn nơi lưu tệp tải xuống (hỏi mỗi lần / lưu thẳng vào thư mục) | — | `tai-xuong.ts`, `NoiLuu.tsx`, Rust `chon_thu_muc_luu` |
| Mẫu Excel phương án riêng theo xã: nhập tệp sẵn có, tự nhận diện bố cục | QD-48 | `mau-excel-nhan-dien.ts`, `thanh-phan/MauExcel.tsx` |

## 3. Việc còn mở

1. **VM-42** (docs/03):
   - hỗ trợ chuyển đổi nghề: áp hạn mức theo từng thửa hay cộng dồn theo hộ;
   - đất NN ở phường: Điều 176 Luật Đất đai hay Điều 7 Phụ lục I.
   - Cần người dùng quyết; chưa tự đặt.
2. **Mẫu Excel theo xã**: chưa thử với tệp phương án **thật** của các xã. Các bố cục sau có thể nhận thiếu:
   - tiêu đề nhiều tầng gộp;
   - bảng A/B có dòng tiêu đề lặp lại;
   - nhiều bảng trên một trang.

   Khi có tệp mẫu (ẩn danh), thêm ca kiểm thử vào `test/mau-excel-nhan-dien.test.ts`.
3. **Tên xã của mẫu** đang so khớp đúng chuỗi ở Thông tin dự án. Nếu cùng một xã được ghi lệch (có/không có "xã"), cân nhắc chuẩn hóa theo `danh-muc-xa.json`.
4. Lộ trình tiếp theo lấy từ `docs/17-danh-gia-toan-dien.md` (P0–P3) và `docs/08` mục 9 (bản đồ).

## 4. Quy ước cần nhớ (bổ sung cho CLAUDE.md)

- **Đổi phiên bản**:
  - sửa `apps/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`;
  - `Cargo.lock` mục `gpmb-sonla`: `sed -i '/^name = "gpmb-sonla"$/{n;s/version = "A"/version = "B"/}'` (không đụng `bitflags 1.3.2`);
  - `package-lock.json` gốc: lần xuất hiện đầu tiên.
- **Phát hành**:
  - `docs/nhung-thay-doi.md` phải có mục `## X.Y.Z`;
  - chạy workflow `build-windows.yml` trên nhánh với input `phat_hanh=true`;
  - sau khoảng 35 phút kiểm tra `latest.json`.
- Sửa docs/03, 05, 06, 13 → chạy `node tools/tri-thuc/tao-kho.mjs`.
- **Playwright**:
  - `cd apps/desktop && npx vite build && npx vite preview --port 4173`;
  - chạy với `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test --trace off`.
- `cargo test` cần thư viện GTK/WebKit: `apt install libgtk-3-dev libwebkit2gtk-4.1-dev …`.
- Job giao diện của CI ghim `ubuntu-24.04`, vì `ubuntu-latest` = 26.04 bị lỗi.
- Tệp bản đồ thật của người dùng chỉ đọc trong thư mục tạm, không đưa vào kho.
