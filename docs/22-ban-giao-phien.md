# Bàn giao phiên làm việc (cập nhật 11/11/2026) — để mở phiên mới

Dán vào phiên mới: *"Đọc CLAUDE.md và docs/22-ban-giao-phien.md rồi làm tiếp trên nhánh claude/great-rubin-4x4alw."*

## 1. Trạng thái

- **Nhánh làm việc**: `claude/great-rubin-4x4alw` (dòng 1.3.x đang dùng thật). Không dùng nhánh 0.9.x cũ.
- **Phiên bản trong kho**: 1.3.6 (đã đổi số ở đủ 5 tệp, có mục `## 1.3.6` trong `docs/nhung-thay-doi.md`) — **CHƯA phát hành**.
  Bản đã phát hành gần nhất: 1.3.5 (08/11/2026). Muốn phát hành 1.3.6: chạy workflow `build-windows.yml` với `phat_hanh=true`.
  - Kiểm tra: `curl -sL https://github.com/letunglam1992/phanmemGPMB/releases/latest/download/latest.json` → `"version": "1.3.5"`.
- **Kiểm thử lúc bàn giao 11/11/2026 (đã chạy, đạt hết)**:
  - `npm run typecheck`;
  - `npm test`: core 89, gis 64, desktop 763 (1.3.5: 752);
  - eslint `--max-warnings=0`;
  - Playwright 118 kịch bản (toàn bộ, trước QD-49); sau QD-49 chạy lại han-muc-du-an, qd64-2026, qd14-k3-k10 (4 kịch bản) đạt.
  - `cargo test` chạy ở commit a731921; Rust không đổi sau đó (phiên 11/11 chỉ đổi số phiên bản trong Cargo.toml/lock, không chạy lại cargo test).

## 1a. Phiên 11/11/2026 — đã làm (1.3.6)

| Việc | Tệp chính | Kiểm thử |
|---|---|---|
| Mục 3.3 cũ: tên xã của mẫu Excel chuẩn hóa theo `danh-muc-xa.json` (bỏ "xã/phường/UBND", gọn dấu cách, hoa thường, NFC/NFD, không dấu; khớp nhiều tên thì giữ nguyên). Khóa mẫu `excel-phuong-an@<tên chuẩn>`; vẫn đọc khóa cũ 1.3.5; lưu lại thì xóa khóa cũ | `src/ten-xa.ts`, `thanh-phan/MauExcel.tsx` | `test/ten-xa.test.ts` 4 |
| Mục 3.2 cũ (một phần): tiêu đề gộp nhiều tầng — ô gộp dọc chứa chữ được thấy ở dòng tiêu đề dưới (`maTran`) | `src/mau-excel-nhan-dien.ts` | `test/mau-excel-bo-cuc-kho.test.ts` |
| Khối A/B có tiêu đề lặp: phát hiện **lỗi ExcelJS 4.4.0** `spliceRows(tu, so, …)` để sót/không xóa dòng khi số dòng xóa > số dòng chèn + số dòng phía dưới → hàm `spliceDong` (xóa từng dòng rồi chèn) dùng cho cả nhận diện lẫn **điền mẫu** (`mau-excel.ts`: vùng lặp 3 dòng mẫu, 0–1 dòng dữ liệu từng để sót `{{#…}}`) | `src/mau-excel.ts`, `src/mau-excel-nhan-dien.ts` | như trên (đã xác nhận ca kiểm thử hỏng với mã cũ) |
| Nhiều bảng trên một trang: bảng phía dưới dòng tổng cuối được **báo trong mô tả** ("giữ nguyên, không điền") — chưa tự điền | `src/mau-excel-nhan-dien.ts` `bangKhacSau` | như trên |

| **VM-42 → QD-49** (người dùng quyết định 11/11): hạn mức chuyển đổi nghề **cộng dồn theo hộ** (riêng từng nhóm loại đất, dùng dần theo thứ tự thửa); đất NN ở phường áp **Điều 7 PL I** | `packages/core/src/ho-tro.ts`, `tinh-ho.ts` | `test/han-muc-cdn-cong-don.test.ts` 3 |

Kết quả kiểm thử cuối phiên: xem mục 1 (đã cập nhật số liệu).

## 2. Nội dung 1.3.5 (các commit 6548b5a → 8023e44)

| Việc | Quyết định | Tệp chính |
|---|---|---|
| Hạn mức theo Phụ lục I QĐ 106/2025: đất NN theo nhóm loại đất (Điều 7), vị trí đất ở (Điều 3–6) | QD-46, VM-42 | `packages/core/src/han-muc.ts`, `tinh-ho.ts` `hanMucNNDuAn`, `TongQuan.tsx` FormDuAn |
| Số tờ nhập một lần cho tệp bản đồ (ưu tiên hơn số tờ đọc theo lớp); nhãn kép ba lớp; điền số tờ cho các thửa trống | QD-47 | `packages/gis/src/thua.ts`, `goi-y-cau-hinh.ts`, `so-to.ts`, `DienSoTo.tsx` |
| Chọn nơi lưu tệp tải xuống (hỏi mỗi lần / lưu thẳng vào thư mục) | — | `tai-xuong.ts`, `NoiLuu.tsx`, Rust `chon_thu_muc_luu` |
| Mẫu Excel phương án riêng theo xã: nhập tệp sẵn có, tự nhận diện bố cục | QD-48 | `mau-excel-nhan-dien.ts`, `thanh-phan/MauExcel.tsx` |

## 3. Việc còn mở

1. ~~VM-42~~ — đã quyết (QD-49). Còn một điểm phụ chưa hỏi người dùng: khi hộ vượt hạn mức, phần hạn mức đang dùng **theo thứ tự thửa trong hồ sơ** (không ưu tiên thửa giá cao/thấp). Nếu đơn vị muốn cách khác (vd. ưu tiên thửa có lợi cho hộ) thì sửa `tinhHoGoc` trong `tinh-ho.ts`.
2. **Mẫu Excel theo xã**: ba bố cục khó đã có ca kiểm thử bằng tệp **giả** (1.3.6) nhưng vẫn **chưa thử với tệp phương án thật** của các xã.
   - Bảng thứ hai trên cùng trang mới chỉ được báo, chưa tách/điền — cần tệp thật để biết nên làm gì (tách trang? coi là bảng tài sản?).
   - Khi có tệp mẫu (ẩn danh), thêm ca kiểm thử vào `test/mau-excel-bo-cuc-kho.test.ts`.
3. ~~Tên xã của mẫu~~ — đã làm ở 1.3.6.
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
