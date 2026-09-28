# 18. Đề xuất nội dung Giai đoạn 1 — Sửa lỗi, chuẩn hóa nền tảng (P0-1 … P0-6, P1-9)

Ngày lập: 28/9/2026 · Căn cứ: `docs/17` §4, §8, §10 (P0), §13 (lộ trình) · Mã nguồn tại phiên bản 0.3.2.

Tài liệu này là **đề xuất thiết kế**, chưa triển khai. Mỗi mục nêu: vấn đề (đã đối chiếu mã), việc cần làm theo tệp, xử lý dữ liệu cũ, tiêu chí nghiệm thu (kiểm thử tự động/Playwright), ước lượng, rủi ro. Các điểm cần người dùng quyết định gom ở §9 (đề xuất mã QD mới khi chốt, ghi vào `docs/06`).

---

## 0. Tóm tắt và thứ tự triển khai

| Thứ tự | Mã | Nội dung chính | Ước lượng | Phụ thuộc |
|---|---|---|---|---|
| 1 | P0-1 | Rào lỗi theo màn/thẻ + bản nháp trong bộ nhớ; `tinhHo` không ném lỗi với số sai | 1–2 ngày | — |
| 2 | P0-6 | `kho.ghiLo()` nguyên tử (IndexedDB, bộ nhớ, máy chủ `POST /api/lo`); khôi phục "thay thế" trong một giao dịch | 1–2 ngày | — |
| 3 | P0-3 | Sinh mã hồ sơ duy nhất; kiểm trùng ở giao diện, nhập Excel, tạo từ bản đồ, máy chủ | 1 ngày | P0-6 (tạo hàng loạt) |
| 4 | P0-4 | Chặn xóa hộ/dự án có phương án đã chốt, đã chi trả; xóa mềm, thùng rác | 2–3 ngày | P0-6, P0-3 |
| 5 | P0-2 | Thành phần `<OSo>` dùng chung, bộ đọc số `docSoNhap`; chuyển đổi dữ liệu cũ có báo cáo nghi vấn | 3–5 ngày | P0-1, P0-6 |
| 6 | P0-5 | Sao lưu mã hóa AES-256-GCM; sao lưu tự động dùng khóa bảo vệ bằng DPAPI + mật khẩu khôi phục | 3–4 ngày | P0-6 |
| song song | P1-9 | ESLint (có `react-hooks`), Playwright chạy trong CI với kịch bản của các mục trên | 1–2 ngày | làm dần theo từng mục |

Tổng: khoảng **12–19 ngày công**. Phát hành theo 3 bản nhỏ để giảm rủi ro: **0.4.0** (P0-1, P0-6, P0-3), **0.4.1** (P0-4, P0-2 + chuyển đổi dữ liệu), **0.4.2** (P0-5). Thứ tự khác §14 docs/17 ở chỗ P0-6 làm sớm, vì P0-3, P0-4, P0-2 (chuyển đổi dữ liệu) và P0-5 đều ghi nhiều bản ghi và cần giao dịch.

**Định nghĩa hoàn thành Giai đoạn 1:** mọi tiêu chí nghiệm thu dưới đây có kiểm thử tự động đạt trong CI; `docs/09` cập nhật trạng thái; không còn đường ghi nhiều bản ghi nào ngoài `ghiLo`; không còn ô số nào dùng `<input>` thô.

---

## 1. P0-1 — Không bao giờ trắng màn hình, không mất dữ liệu đang nhập

**Hiện trạng (đã đối chiếu):** không có ErrorBoundary nào trong `apps/desktop/src`; `tinh-ho.ts` gọi `D(...)` 34 lần trên chuỗi thô (vd. `D(t.dienTichThuHoi || "0")` dòng 293) → `DecimalError` làm React gỡ cả cây giao diện.

**Việc cần làm**

1. `src/thanh-phan/RaoLoi.tsx` — thành phần lớp (`componentDidCatch`), hai mức:
   - bọc **mỗi màn** trong `UngDung.tsx` (khóa theo tuyến `di(...)` để chuyển màn là tự hết lỗi);
   - bọc **mỗi thẻ** của `HoSo.tsx` và `KhongGianDuAn.tsx` → lỗi ở thẻ Tính toán không làm mất thẻ Thửa đang nhập.
   - Giao diện khi lỗi: tên thẻ, câu lỗi dễ hiểu, nút *Thử lại*, *Quay về hồ sơ*, *Chép chi tiết lỗi* (chép vào bộ nhớ tạm, **không gửi ra ngoài**); ghi một dòng nhật ký hệ thống "Lỗi giao diện" (không kèm dữ liệu cá nhân).
2. `src/ban-nhap.ts` — bản nháp **trong bộ nhớ** (`Map<hoId, Ho>`, cấp mô-đun, sống qua lần gỡ/dựng lại thành phần). `HoSo.tsx` ghi bản nháp mỗi lần `doi()`; khi dựng lại sau lỗi, nếu có bản nháp mới hơn bản đã lưu → hiện dải "Có thay đổi chưa lưu — Khôi phục / Bỏ". Không ghi bản nháp xuống đĩa (tránh để lại CCCD, họ tên ngoài kho dữ liệu).
3. `tinh-ho.ts` — hàm `so(v, nhan)` trả `Decimal | null`; mọi chỗ `D(chuỗi người nhập)` đổi sang `so(...)`. Giá trị không đọc được → dòng tính trạng thái `THIEU_CAN_CU` với ghi chú *"Giá trị không hợp lệ: DT thu hồi thửa 85 = '9222,1'"*, tổng hộ ghi rõ "chưa đủ căn cứ" (giữ nguyên cách hiển thị "Thiếu căn cứ" đã có ở dòng 95). Không tự sửa giá trị.
4. `packages/core`: giữ nguyên hàm thuần; thêm kiểm tra đầu vào ở ranh giới gọi (tinh-ho), không rải `try/catch` vào lõi.

**Dữ liệu cũ:** không đổi. Hồ sơ đang lưu giá trị lỗi sẽ hiện "Thiếu căn cứ" thay vì trắng màn hình — đây cũng là cách phát hiện dữ liệu cần sửa trước P0-2.

**Nghiệm thu**
- Vitest: `tinhHo` với `dienTichThuHoi = "9222,1"`, `"abc"`, `""`, `"  "` → không ném lỗi, có dòng `THIEU_CAN_CU` nêu đúng thửa, trường.
- Playwright: nhập "9222,1" ở DT thu hồi → màn vẫn hiển thị, thẻ Thửa còn nguyên dữ liệu đã gõ; ép lỗi giả ở một thẻ → chỉ thẻ đó hiện khung lỗi.

**Rủi ro:** thấp. ErrorBoundary không bắt lỗi trong hàm xử lý sự kiện/`async` — các hàm lưu đã có `bao(..., "loi")`, rà thêm 17 chỗ `catch` bỏ qua (docs/17 §6) để ít nhất báo lỗi.

---

## 2. P0-6 — Ghi nhiều bản ghi trong một giao dịch ("không nhập dở")

**Hiện trạng:** ghi từng bản ghi ở `HopNhapExcel.tsx:71`, `BanDo.tsx` (tạo hồ sơ từ thửa, `kho.luuHo` trong vòng lặp), `ung-dung.tsx` `luuNhieuHo` (cập nhật bước hàng loạt, cho phép thành công một phần), `sao-luu.ts` `khoiPhuc` (THAY_THE: `xoaTatCa()` rồi mới ghi từng bản); `kho.ts` `xoaDuAn` xóa dự án rồi từng hộ, không giao dịch.

**Việc cần làm**

1. Giao diện `Kho` (kho.ts) thêm:
   ```ts
   interface LoGhi {
     duAn?: DuAn[]; ho?: Ho[];
     xoaDuAn?: string[]; xoaHo?: string[];
     banDo?: { duAnId: string; bytes: Uint8Array | null }[]; // null = xóa
     mau?: { ma: string; bytes: Uint8Array; tenTep: string }[];
     caiDat?: { khoa: string; giaTri: unknown }[];
     xoaTatCa?: boolean; // chỉ dùng cho khôi phục THAY_THE
   }
   ghiLo(lo: LoGhi): Promise<void>; // tất cả hoặc không gì cả
   ```
2. IndexedDB: **một** `IDBTransaction` trên các kho `duAn, ho, banDo, mauVanBan, caiDat`; lỗi bất kỳ → `abort()`. Kho bộ nhớ (kiểm thử): sao chép → áp dụng → hoán đổi. `xoaDuAn` viết lại bằng `ghiLo`.
3. Máy chủ `may_chu.rs`: `POST /api/lo` — một `rusqlite::Transaction`; kiểm tra quyền và **phiên bản (khóa lạc quan) của từng bản ghi trước khi ghi**; một bản ghi xung đột → trả 409 kèm danh sách bản ghi xung đột, không ghi gì; `ghi_thay_doi` nằm trong cùng giao dịch. Giới hạn thân yêu cầu hiện là 300 MB (`DefaultBodyLimit`, dòng 726) — đủ cho khôi phục có bản đồ; ghi rõ giới hạn trong thông báo lỗi.
4. Đổi các nơi gọi: nhập Excel, tạo hồ sơ từ bản đồ, `luuNhieuHo`, `khoiPhuc`, xóa dự án → `ghiLo`. **Trước khi khôi phục kiểu THAY_THE: tự tạo một bản sao lưu dữ liệu hiện có** (dùng `taoBanSaoLuu` sẵn có) để có đường lui.
5. `luuNhieuHo`: đổi từ "thành công một phần" sang nguyên tử (xem QD đề xuất §9, câu 4); khi 409 hiện danh sách hộ đang bị người khác sửa để cán bộ tải lại rồi làm lại.

**Nghiệm thu**
- Vitest với kho giả lập lỗi ở lần ghi thứ *n*: nhập Excel 50 hộ lỗi ở hộ 30 → kho không đổi; khôi phục THAY_THE lỗi giữa chừng → dữ liệu cũ còn nguyên.
- `cargo test`: `/api/lo` có một bản ghi sai phiên bản → 409, không bản ghi nào đổi, bảng `thay_doi` không thêm dòng.

**Rủi ro:** thấp. Giao dịch IndexedDB tự đóng khi có `await` ngoài yêu cầu IDB → chuẩn bị toàn bộ dữ liệu (kể cả `arrayBuffer()` của tệp) **trước** khi mở giao dịch.

---

## 3. P0-3 — Mã hồ sơ duy nhất trong dự án

**Hiện trạng:** ba cách sinh mã: `HopThemHo` `H{soHo+1}` 2 chữ số (`DuAn.tsx:182`); tạo từ bản đồ `H{i}` 3 chữ số đánh lại từ 1 (`BanDo.tsx`, hàm tạo hồ sơ) — **trùng ngay với hồ sơ đã có**; nhập Excel `H001` tránh trùng (`nhap-excel.ts:431`). Máy chủ không kiểm tra.

**Việc cần làm**
1. `src/ma-ho.ts`: `chuanMa(ma) = ma.trim().toUpperCase()`; `maHoTiepTheo(dsHo, tienTo = "H", doDai = 3)` = lớn nhất phần số của các mã cùng tiền tố (kể cả hộ trong thùng rác — P0-4) + 1; `maTrung(dsHo, ma, boQuaId?)`.
2. Dùng ở: `HopThemHo` (báo trùng ngay dưới ô, chặn nút *Tạo hồ sơ*), ô sửa mã (nếu cho sửa), tạo từ bản đồ, nhập Excel (thay `soMa` riêng; kiểm trùng cả **trong tệp** lẫn với dữ liệu có sẵn).
3. Máy chủ: trong `luu_ban_ghi` loại `ho` — `SELECT 1 FROM ban_ghi WHERE loai='ho' AND du_an_id=?1 AND id<>?2 AND upper(trim(json_extract(noi_dung,'$.ma')))=?3` → 409 "Mã hồ sơ đã dùng trong dự án". Khi CSDL không còn mã trùng thì tạo thêm chỉ mục duy nhất biểu thức; còn trùng thì chỉ kiểm bằng mã (không để khởi động máy chủ thất bại).
4. Dữ liệu cũ: màn Hộ của dự án hiện dải cảnh báo "Có n mã trùng" kèm danh sách, **không tự đổi mã** (mã có thể đã in trong văn bản, biên bản đã ký) — cán bộ đổi và ghi lý do vào nhật ký hồ sơ.

**Nghiệm thu:** Vitest `maHoTiepTheo` (có khoảng trống, lẫn H01/H001, chữ thường); nhập Excel có hai dòng cùng mã → báo lỗi đúng dòng; tạo 5 hồ sơ từ bản đồ khi dự án đã có H001–H003 → H004–H008; `cargo test` ghi trùng mã → 409.

---

## 4. P0-4 — Không mất phương án, chứng từ chi trả khi xóa

**Hiện trạng:** `xoaHo` chỉ cần quyền `SUA_HO_SO` (`ung-dung.tsx`, `may_chu.rs` `xoa_ho` dòng 560) và xóa hẳn; sổ chi trả nằm trong `Ho.chiTra`; bản phương án (`PhienBanPA`, trạng thái `DA_CHOT | DA_PHE_DUYET | DA_HUY`) chứa bản sao hộ nhưng hồ sơ gốc mất thì không đối chiếu, chi trả tiếp được. Xóa đợt chi trong `ChiTra.tsx:69` cũng xóa hẳn.

**Việc cần làm**
1. **Quy tắc chặn** (`src/rang-buoc.ts`, dùng chung giao diện và máy chủ):
   - hộ có trong bản phương án `DA_CHOT` hoặc `DA_PHE_DUYET` (chưa hủy) → không xóa; hướng dẫn: hủy bản phương án (đã có quy trình, có lý do) hoặc lập bản điều chỉnh;
   - hộ đã có đợt chi trả → không xóa;
   - dự án có bản phương án đã phê duyệt hoặc có hộ đã chi trả → không xóa dự án.
   Máy chủ kiểm lại cùng quy tắc (không tin máy trạm).
2. **Xóa mềm**: `Ho.daXoa?: { luc; nguoi; lyDo }` (lý do bắt buộc). `hoCua()`, tổng hợp, báo cáo, tìm kiếm, cảnh báo bỏ qua hộ đã xóa. Thẻ **Thùng rác** trong không gian dự án: khôi phục (quyền `SUA_HO_SO`), xóa hẳn (chỉ quản trị, sau thời hạn lưu — §9 câu 3). Mã hộ trong thùng rác vẫn tính khi kiểm trùng (P0-3).
3. **Đợt chi trả**: thay "Xóa" bằng "Hủy đợt chi" có lý do, giữ dòng đã hủy (gạch ngang), không tính vào tổng đã chi.
4. **Xóa dự án**: xóa mềm tương tự; xóa hẳn bằng `ghiLo` (P0-6) trong một giao dịch; **tự tạo bản sao lưu trước khi xóa hẳn**.
5. Nhật ký hệ thống ghi mọi lần xóa mềm/khôi phục/xóa hẳn (đã có chuỗi băm).

**Ghi chú căn cứ:** thời hạn chi trả và tiền chậm trả theo khoản 3, 4 Điều 94 Luật Đất đai 2024 (đã áp dụng ở `chi-tra.ts`) cần dữ liệu chi trả liên tục để tính; phần mềm không thay sổ, chứng từ kế toán của đơn vị chi trả nhưng là nguồn đối chiếu nên không được để mất.

**Nghiệm thu:** Vitest quy tắc chặn (4 trường hợp); Playwright: xóa hộ đã có đợt chi → bị chặn, nêu lý do; xóa hộ thường → vào thùng rác, khôi phục được, tổng dự án đúng trước/sau; `cargo test`: `DELETE /api/ho/:id` với hộ có trong PA đã duyệt → 409.

---

## 5. P0-2 — Quy ước số thống nhất, chặn sai số im lặng

**Hiện trạng:** ô số là `<input>` chuỗi tự do; `D("20.000") = 20`. Bộ đọc chặt `docSo` chỉ có ở nhập Excel (`nhap-excel.ts:141`). Các trường số lưu dạng chuỗi trong `mo-hinh.ts` (không đầy đủ): `dienTich`, `dienTichThuHoi`, `lop[].dienTich`, `giaTuyChinh`, `gcn.dienTich`, `dtThuHoiCoGcn`, `dienTichTru`, `donGia`, `khoiLuong`, `soLuong`, `heSo`, `dienTichNNDangSuDung`, `dienTichGiao`, `tienSddPhaiNop`, `khoanKhac[].soTien`, `giaGao.dongKg`, `hanMucNN.m2`, `heSoGiaDat.heSo`, `giaNghinDong`.

**Việc cần làm**
1. `src/so.ts`: tách lõi của `docSo` thành `docSoNhap(chuoi): { so: string | null; loi: string | null; moHo?: [string, string] }` (dùng lại cho nhập Excel — một bộ đọc duy nhất) và `hienSo(chuanMay, soLe)` hiển thị kiểu Việt (`1.234,5`).
2. `src/thanh-phan/OSo.tsx`: `value` là **chuỗi chuẩn máy** (`"1234.5"`), `onChange(chuanMay | "")`; đang gõ thì giữ nguyên chuỗi người gõ, rời ô thì đọc và hiển thị lại kiểu Việt để người nhập thấy ngay kết quả. Thuộc tính: `donVi`, `soLe`, `min`, `max`, `canhBao(v) → string | null` (ngưỡng hợp lý, chỉ cảnh báo, không chặn).
   - Chuỗi hợp lệ một nghĩa ("9222,1", "9.222,1", "20000") → nhận.
   - Chuỗi **mơ hồ** ("20.000", "1.500") → viền đỏ, hai nút chọn ngay dưới ô: *"20.000 = hai mươi nghìn"* / *"= 20"* — không bao giờ tự đoán (§9 câu 1).
   - Không phải số → báo lỗi, không cập nhật giá trị đã lưu.
3. Thay toàn bộ ô số ở `Thua.tsx`, `KiemDem.tsx`, `PhanLop.tsx`, `HoSo.tsx`, `ChiTra.tsx`, thông tin dự án (giá gạo, hạn mức, hệ số) bằng `<OSo>`. Tìm sót bằng quy tắc ESLint tự viết cấm `<input>` cho trường có tên thuộc danh sách trên (P1-9).
4. **Chuyển đổi dữ liệu cũ** (chạy một lần khi mở bản mới, qua `ghiLo`, có sao lưu trước):
   - thêm `phienBanCauTruc: 2` vào `DuAn`, `Ho` (mầm của P2-6);
   - giá trị một nghĩa nhưng chưa chuẩn máy ("9222,1") → đổi tự động, ghi nhật ký hồ sơ "từ … thành …";
   - giá trị mơ hồ ("20.000") → **không đổi**, đưa vào **Báo cáo giá trị nghi vấn** (dự án, hộ, trường, giá trị, cách hiểu hiện tại) để cán bộ xác nhận từng dòng;
   - kiểm tra hợp lý (chỉ cảnh báo): DT thu hồi > DT thửa; hạn mức NN < 100 m²; giá gạo < 1.000 đ/kg; hệ số giá đất ≤ 0 hoặc > 10; khối lượng âm. Ngưỡng là **ngưỡng kỹ thuật để soát nhập liệu**, không phải quy định — cho phép quản trị chỉnh.
5. Phương án đã chốt/đã duyệt **không** chuyển đổi (bản đóng băng có băm SHA-256); nếu bản sao trong phương án có giá trị nghi vấn thì chỉ đưa vào báo cáo.

**Nghiệm thu:** Vitest `docSoNhap` (bảng ≥ 30 trường hợp, dùng lại bộ thử của `docSo`); Vitest chuyển đổi: dữ liệu mẫu có "9222,1", "20.000", "abc" → đúng số bản ghi đổi/nghi vấn, phương án đã duyệt giữ nguyên băm; Playwright: gõ "20.000" ở hạn mức → phải chọn cách hiểu mới lưu được.

**Rủi ro:** trung bình — nhiều ô, có chuyển đổi dữ liệu. Giảm bằng: sao lưu tự động trước chuyển đổi, báo cáo nghi vấn thay vì tự sửa, phát hành riêng bản 0.4.1.

---

## 6. P0-5 — Mã hóa tệp sao lưu

**Hiện trạng:** `.gpmb` là tệp zip chứa `du-lieu.json` (họ tên, số định danh, điện thoại), có băm SHA-256 kiểm toàn vẹn nhưng không mã hóa; sao lưu tự động ghi vào `Documents\GPMB Son La\Sao luu` (`lib.rs`).

**Căn cứ tham chiếu:** số định danh cá nhân, họ tên, số điện thoại là dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và Luật Bảo vệ dữ liệu cá nhân năm 2025 (hiệu lực từ 01/01/2026); **cần đối chiếu Điều/Khoản cụ thể và văn bản hướng dẫn hiện hành trước khi ghi vào tài liệu bàn giao** — tài liệu này không tự trích dẫn điều khoản chưa kiểm tra.

**Việc cần làm**
1. Định dạng sao lưu phiên bản 2: `thong-tin.json` (không chứa dữ liệu cá nhân: phiên bản, thời điểm, số lượng, tham số mã hóa) + `du-lieu.bin` = AES-256-GCM(zip dữ liệu cũ). Khóa dẫn xuất từ mật khẩu bằng PBKDF2-SHA256, 600.000 vòng, muối 16 byte, IV 12 byte ngẫu nhiên. Dùng **WebCrypto** trong WebView2 (không cần thư viện ngoài, không gọi mạng). Thẻ xác thực GCM thay vai trò băm toàn vẹn.
2. **Sao lưu thủ công:** bắt buộc đặt mật khẩu sao lưu (nhập 2 lần, tối thiểu 12 ký tự hoặc cụm từ), hiện cảnh báo "quên mật khẩu là không khôi phục được". Sao lưu không mã hóa: không cho, hoặc chỉ quản trị kèm xác nhận và ghi nhật ký (§9 câu 5).
3. **Sao lưu tự động** (không ai nhập mật khẩu): mã hóa phong bì — khóa dữ liệu ngẫu nhiên 256 bit, bọc hai lần:
   - bọc bằng **DPAPI** của tài khoản Windows (lệnh Tauri mới trong `lib.rs`, crate `keyring` hoặc gọi `CryptProtectData`) → tự khôi phục trên cùng máy, cùng tài khoản Windows;
   - bọc bằng **mật khẩu khôi phục** do quản trị đặt một lần ở Cài đặt → khôi phục được trên máy khác khi máy cũ hỏng. Chưa đặt mật khẩu khôi phục → cảnh báo trên Tổng quan (như cảnh báo lịch nghỉ VM-25).
4. Khôi phục: đọc được cả tệp phiên bản 1 (không mã hóa) để không mất bản cũ, kèm khuyến nghị xóa tệp cũ sau khi khôi phục và sao lưu lại bản mã hóa.
5. Ngoài phạm vi GĐ1, ghi nhận để làm sau: tệp SQLite của máy chủ mạng nội bộ chưa mã hóa (cân nhắc SQLCipher ở GĐ3); tệp Excel/Word xuất ra có số định danh — thêm tùy chọn che số định danh khi xuất.

**Nghiệm thu:** Vitest: sao lưu → khôi phục đúng mật khẩu; sai mật khẩu, sửa 1 byte → từ chối với câu báo rõ; tệp v1 vẫn khôi phục được; trong tệp v2 không tìm thấy chuỗi số định danh mẫu ở dạng rõ. `cargo test`: bọc/mở khóa DPAPI chỉ chạy trên Windows (đánh dấu `#[cfg(windows)]`, chạy trong job CI Windows sẵn có).

**Rủi ro:** quên mật khẩu = mất khả năng khôi phục → cần quy trình giữ mật khẩu (niêm phong, giao người thứ hai giữ) đưa vào `docs/14` (quản trị).

---

## 7. P1-9 — Kiểm soát hồi quy trong CI

1. ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`) ở gốc kho; lúc đầu chỉ bật lỗi cho `rules-of-hooks`, `exhaustive-deps` (cảnh báo), `no-empty` (bắt các `catch {}` bỏ qua), quy tắc cấm `<input>` cho trường số (P0-2).
2. Playwright (`@playwright/test` vào `devDependencies`), chạy trên job Ubuntu trước job đóng gói Windows trong `.github/workflows/build-windows.yml`, dùng `vite preview`. Kịch bản tối thiểu:
   1. tạo tài khoản quản trị, nạp dữ liệu mẫu, mở hồ sơ;
   2. nhập "9222,1" → không trắng màn hình (P0-1);
   3. nhập "20.000" → phải chọn cách hiểu (P0-2);
   4. thêm hộ trùng mã → bị chặn (P0-3);
   5. xóa hộ đã chi trả → bị chặn; xóa hộ thường → thùng rác → khôi phục (P0-4);
   6. sao lưu có mật khẩu → khôi phục (P0-5);
   7. nạp bản đồ A → nạp bản đồ B → xóa bản đồ (lỗi đã sửa ở 0.3.2; dùng tệp DGN tổng hợp sinh bằng `packages/gis/test/viet-dgn.ts`, **không dùng tệp thật**).

---

## 8. Ảnh hưởng tới tài liệu và dữ liệu

| Tài liệu | Cập nhật |
|---|---|
| `docs/09` | Trạng thái từng chức năng sau mỗi bản 0.4.x |
| `docs/06` | Các quyết định ở §9 (mã QD mới) |
| `docs/13`, `docs/14` | Hướng dẫn ô số, thùng rác, mật khẩu sao lưu/khôi phục, quy trình giữ mật khẩu |
| `docs/17` | Đánh dấu P0 đã xử lý, kèm phiên bản |

Thay đổi mô hình dữ liệu: `Ho.daXoa`, `DuAn.daXoa`, `phienBanCauTruc`, đợt chi có `huy`; định dạng sao lưu v2. Tất cả tương thích ngược (trường tùy chọn, đọc được sao lưu v1).

---

## 9. Câu hỏi cần người dùng quyết định trước khi triển khai

1. **Ô số gặp chuỗi mơ hồ ("20.000")**: đề xuất bắt chọn cách hiểu ngay dưới ô (không tự đoán). Hay theo hẳn quy ước Việt Nam (dấu chấm luôn là phân cách nghìn)?
2. **Chuyển đổi dữ liệu cũ**: tự đổi các giá trị một nghĩa ("9222,1" → 9222.1) và chỉ báo cáo giá trị mơ hồ — đồng ý?
3. **Thùng rác**: giữ bao lâu trước khi quản trị được xóa hẳn (đề xuất 30 ngày, không tự xóa)?
4. **Cập nhật bước hàng loạt** khi một hộ bị người khác sửa cùng lúc: hủy cả lô (nguyên tử, đề xuất) hay ghi các hộ còn lại như hiện nay?
5. **Sao lưu không mã hóa**: cấm hẳn, hay chỉ quản trị được xuất kèm xác nhận và nhật ký?
6. **Mẫu mã hồ sơ**: thống nhất `H001` (3 chữ số) cho mọi cách tạo — hay đơn vị có quy ước riêng (theo xã, theo tờ bản đồ)?
