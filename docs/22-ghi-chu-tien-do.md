# 22. Ghi chú tiến độ — đọc file này trước khi làm tiếp

Cập nhật: tối 04/10/2026. Bản mới nhất đã phát hành: **0.9.25**. Nhánh làm việc: `claude/great-rubin-4x4alw`; mọi thay đổi đã commit và đẩy lên.

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
| 0.9.24 | **Sửa trắng màn hình khi mở Trợ lý AI và lỗi "e is not a function"**; màn tỉnh nhắc "Có n gói mới trên cổng (xã, thời gian) — mở khóa để nhận" |

Kiểm thử ở 0.9.24 (tất cả đạt):
- typecheck
- npm test: 78 + 48 + 356
- cargo test
- eslint: 3 cảnh báo cũ
- Playwright: 57/57

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

### B. Việc lập trình có thể làm tiếp (chờ anh Lâm chọn)

- [ ] Cổng Worker tự bỏ khoảng trắng thừa trong `MA_QUAN_TRI`.
  - Phải dán lại mã Worker lên Cloudflare (Edit code → dán `tools/cong-tinh/worker.js` → Deploy).
- [x] Cảnh báo xã lâu chưa gửi, xã tự gửi định kỳ, tỉnh xem lại bản gửi cũ, báo cáo Word toàn tỉnh — đã làm ở 0.9.25 (docs/21 "Bổ sung ở bản 0.9.25"). Cần anh Lâm thử trên máy thật:
  - [ ] Máy xã: bật tự gửi, mỗi N ngày.
  - [ ] Máy tỉnh: đặt ngưỡng cảnh báo; xem "Các bản trước"; bấm "Báo cáo Word".
- [ ] Tỉnh tải cả các bản cũ trên cổng (cổng giữ 5 bản/xã) — cần thêm API cho Worker và dán lại mã Worker lên Cloudflare.
- [ ] Danh sách P0–P3 còn lại trong `docs/17-danh-gia-toan-dien.md`.

## 3. Quy trình mỗi lần sửa (để phiên mới làm đúng ngay)

1. Sửa mã. Cập nhật `docs/09`, ghi chú này, `docs/13`/`docs/21` nếu đổi cách dùng.
   - Sửa `docs/13`, `docs/05`, `docs/06`, `docs/03` thì chạy lại `node tools/tri-thuc/tao-kho.mjs`.
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
| Kiểm thử | `test/goi-tinh.test.ts`, `test/cong-tinh.test.ts`, `test/hoi-dap-*.test.ts`, `e2e/tong-hop-tinh.spec.ts`, `e2e/hoi-dap.spec.ts` |

## 5. Bí mật — không ghi vào kho, không hỏi lại

Anh Lâm tự giữ:
- Khóa ký bản cập nhật `gpmb.key`. Đã đặt trong GitHub Secrets.
- Mã quản trị cổng `MA_QUAN_TRI`.
- Mật khẩu khóa cấp tỉnh.
- Mã truy cập của xã.
