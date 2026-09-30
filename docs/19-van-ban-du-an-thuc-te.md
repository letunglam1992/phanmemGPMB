# 19. Bộ văn bản dự án thực tế (người dùng cung cấp 30/9/2026) — phân tích để đưa vào phần mềm

Nguồn: 7 văn bản Word và 5 biểu Excel của hai dự án do UBND phường Tô Hiệu thực hiện (năm 2026). **Tệp gốc không lưu vào kho**
(có họ tên, địa chỉ người có đất). Văn bản cấp dự án đã bỏ tên cá nhân và lưu nguyên văn trích xuất ở `docs/mau-thuc-te/`.
Văn bản cấp hộ chỉ ghi **bố cục** với trường thay thế `[…]`.

| # | Văn bản | Cấp | Ghi chú |
|---|---|---|---|
| 1 | Kế hoạch thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm (KH-UBND phường) | Dự án | Nguyên văn: `docs/mau-thuc-te/ke-hoach-thu-hoi-dat.md` |
| 2 | Tờ trình của phòng KT,HT&ĐT đề nghị ban hành Thông báo thu hồi đất | Dự án | `docs/mau-thuc-te/to-trinh-ban-hanh-tb-thu-hoi.md` |
| 3 | Thông báo thu hồi đất (TB-UBND phường) + biểu danh sách người có đất thu hồi | Dự án | `docs/mau-thuc-te/thong-bao-thu-hoi-dat.md`; biểu: mục 4.1 |
| 4 | Tờ trình đề nghị phê duyệt phương án BT, HT, TĐC của 01 hộ + Biểu số 01, 02 | Hộ | Bố cục mục 3.1; biểu mục 4.2, 4.3 |
| 5 | Quyết định phê duyệt phương án BT, HT, TĐC của 01 hộ + Biểu số 01, 02 | Hộ | Bố cục mục 3.2 (Điều 1 = nội dung Tờ trình) |
| 6 | Tờ trình đề nghị ban hành QĐ thu hồi đất của nhiều hộ (06 hộ) + biểu tổng hợp diện tích | Nhiều hộ | Bố cục mục 3.3; biểu mục 4.4 |
| 7 | Quyết định thu hồi đất của nhiều hộ + biểu tổng hợp diện tích | Nhiều hộ | Bố cục mục 3.4 |

## 1. Căn cứ pháp lý được viện dẫn (theo văn bản thực tế — cần đối chiếu nguyên văn trước khi đưa vào mẫu)

| Văn bản | Có trong phần mềm? |
|---|---|
| Luật Tổ chức chính quyền địa phương ngày 16/6/2025 | Chưa có trong danh sách căn cứ mẫu |
| Luật Đất đai ngày 18/01/2024; Luật 31/2024/QH15 sửa đổi (kèm Luật Nhà ở, KD BĐS, TCTD) | Có (LĐĐ) — kiểm lại cách ghi Luật 31/2024 |
| **Nghị quyết 254/2025/QH15 ngày 11/12/2025** của Quốc hội (cơ chế tháo gỡ vướng mắc thi hành LĐĐ) | **Chưa có — cần nguyên văn** |
| NĐ 88/2024/NĐ-CP; NĐ 102/2024/NĐ-CP | Có |
| **NĐ 151/2025/NĐ-CP ngày 12/6/2025** (phân định thẩm quyền chính quyền 2 cấp lĩnh vực đất đai) | Chưa có — cần nguyên văn |
| **NĐ 49/2026/NĐ-CP ngày 31/01/2026** (hướng dẫn NQ 254/2025/QH15) | **Chưa có — cần nguyên văn** |
| **QĐ 426/QĐ-UBND ngày 05/02/2026** của UBND tỉnh (tiếp tục thực hiện phân định thẩm quyền 2 cấp, TTHC đất đai) | Chưa có |
| QĐ 1966/QĐ-UBND ngày 05/8/2025 (Sổ tay trình tự, thủ tục) | Có (quy trình chính thức QD-07) |
| QĐ 106/2025/QĐ-UBND ngày 06/10/2025 (PL I, II, V, VIII); QĐ 14/2026/QĐ-UBND ngày 31/3/2026 | Có |
| NQ 152/2025/NQ-HĐND ngày 29/12/2025 (bảng giá đất); NQ HĐND danh mục dự án thu hồi đất (vd. 306/NQ-HĐND ngày 17/4/2024) | Có NQ 152; danh mục dự án: cán bộ nhập |
| QĐ 48/QĐ-UBND ngày 16/5/2025 của UBND tỉnh (dẫn cùng PL VIII khi hỗ trợ cây cối, hoa màu) | Chưa rõ nội dung — cần văn bản |
| Văn bản riêng của dự án: QĐ chủ trương đầu tư / phê duyệt dự án, điều chỉnh QH sử dụng đất, TB kết luận của UBND tỉnh, Kế hoạch thu hồi đất, TB thu hồi đất, QĐ phê duyệt PA từng hộ, TB gửi tiền bồi thường, Tờ trình của Ban QLDA | Trường nhập ở cấp dự án/đợt (đã có một phần: `can_cu_*`) |

**Quan sát:** chính quyền 2 cấp (từ 7/2025) — UBND/Chủ tịch UBND **phường, xã** phê duyệt phương án và ban hành QĐ thu hồi
đất; tờ trình do **phòng Kinh tế, Hạ tầng và Đô thị** (phường) lập. Một số văn bản trong cùng bộ vẫn ghi "UBND thành phố" (sót
từ mẫu cũ) — phần mềm nên kiểm tên cơ quan ban hành thống nhất (mục 5).

## 2. Thời hạn, quy tắc thể hiện trong Kế hoạch / Thông báo (đối chiếu với docs/05)

- Thông báo thu hồi đất gửi **chậm nhất 60 ngày (đất nông nghiệp) / 120 ngày (đất phi nông nghiệp)** trước khi ban hành QĐ thu hồi;
  không liên lạc được → phát thanh/truyền hình địa phương **03 lần trong 03 ngày liên tiếp**, niêm yết tại trụ sở UBND, nơi sinh
  hoạt chung khu dân cư, đăng cổng thông tin điện tử trong suốt thời gian BT, HT, TĐC mà không phải gửi lại.
- **Hiệu lực Thông báo thu hồi đất: 12 tháng** kể từ ngày ban hành.
- Người có đất kê khai trong **05 ngày làm việc** kể từ khi nhận tờ khai.
- QĐ thu hồi đất ban hành trong **10 ngày** kể từ ngày phê duyệt phương án (hoặc từ khi bàn giao đất TĐC nếu có).
- Kế hoạch ghi mốc dự kiến từng việc (cắm mốc, trích đo, họp dân, TB thu hồi, kiểm đếm, lập — niêm yết — thẩm định — phê duyệt PA,
  chi trả, QĐ thu hồi, bàn giao) → phần mềm có thể **sinh bảng mốc Kế hoạch từ lịch dự kiến của dự án** (đã có "Lập kế hoạch từng bước").

## 3. Bố cục văn bản cấp hộ (trường thay thế `[…]`)

### 3.1. Tờ trình đề nghị phê duyệt phương án BT, HT, TĐC (01 hộ)
Đầu văn bản: UBND [phường] / PHÒNG KT, HT&ĐT — Số: [số]/TTr-KT,HT&ĐT — [địa danh], ngày … · TỜ TRÌNH · V/v đề nghị phê duyệt PA BT,
HT, TĐC đối với hộ [tên chủ hộ] ([quan hệ, tên người cùng đứng tên]) tại [địa chỉ] bị thu hồi đất để thực hiện dự án [tên dự án] ·
Kính gửi: Chủ tịch UBND [phường] · Căn cứ … (mục 1). Nội dung 11 mục cố định:
1. Tổng số hộ gia đình, cá nhân có đất thu hồi: [số bằng chữ] ([số]) hộ — tên hộ, địa chỉ thường trú.
2. Tổng diện tích đất thu hồi [m²]; loại đất thu hồi [tên đầy đủ]; địa điểm thu hồi.
3. Phương án đào tạo, chuyển đổi nghề và tìm kiếm việc làm: [Không / nội dung].
4. Phương án bố trí tái định cư. 5. Phương án bồi thường bằng đất. 6. Phương án di dời mồ mả. 7. Phương án di chuyển công trình hạ tầng.
8. Kinh phí BT, HT, TĐC: 8.1 tổng (làm tròn) + **bằng chữ**; a) BT về đất ([loại đất]); b) BT hoa màu, tài sản; c) BT di chuyển;
   d) BT chi phí đầu tư vào đất còn lại; đ) các khoản hỗ trợ (ổn định đời sống, SXKD, di dời vật nuôi, đào tạo chuyển đổi nghề — liệt
   kê "trong đó"; hỗ trợ cây cối hoa màu; **hỗ trợ khác theo khoản 13 Điều 6 QĐ 14/2026**: nội dung, lý do và mức hỗ trợ, tổng giá trị);
   8.2 chi phí khác.
9. Tiến độ thực hiện PA. 10. Ý kiến, kiến nghị của hộ và kết quả giải quyết. 11. Nội dung khác.

### 3.2. Quyết định phê duyệt phương án (01 hộ)
Chủ tịch UBND [phường] · Căn cứ … · Xét đề nghị tại Tờ trình [số] · **Điều 1** = 11 mục như Tờ trình (số liệu giống hệt) ·
**Điều 2** tổ chức thực hiện (Ban QLDA giao QĐ đến hộ; các phòng thực hiện; phòng VH-XH đăng tải) · **Điều 3** trách nhiệm thi hành ·
Nơi nhận (Thường trực Đảng ủy, HĐND phường, VP ĐKĐĐ tỉnh, MTTQ, thành viên Hội đồng BT, bản/tổ dân phố…).

### 3.3. Tờ trình đề nghị ban hành QĐ thu hồi đất (nhiều hộ)
Trích yếu nêu **tổng diện tích** và **số hộ**; căn cứ gồm **danh sách QĐ phê duyệt PA từng hộ** (số, ngày, tên hộ), TB gửi tiền bồi
thường, Tờ trình của Ban QLDA · 1. Thu hồi đất của [n] hộ (biểu kèm) · 2. Giao [DT] m² cho Ban QLDA · 3. Giao nhiệm vụ (3.1 đăng tải;
3.2 phòng KT,HT&ĐT; 3.3 Ban QLDA giao QĐ, thu GCN; 3.4 Ban điều hành bản; 3.5 các hộ chấp hành).

### 3.4. Quyết định thu hồi đất (nhiều hộ)
Như 3.3 dạng Điều 1–3; biểu tổng hợp diện tích kèm theo.

## 4. Biểu Excel

### 4.1. Biểu danh sách người có đất thu hồi (kèm Thông báo thu hồi đất)
Tiêu đề 3 dòng + "(Kèm theo Thông báo số … của UBND …)"; cột: STT · Tên chủ sử dụng đất (dòng 2: vợ/chồng) · Địa chỉ khu đất ·
Diện tích (m²) · Tờ bản đồ · Số thửa · Loại đất theo hiện trạng (ký hiệu) · Ghi chú; dòng đánh số cột 1…8. Mỗi **thửa** một dòng
(một chủ nhiều thửa → nhiều dòng).

### 4.2. Biểu tổng hợp số 01 — kinh phí BT, HT (kèm Tờ trình / QĐ phê duyệt PA)
Tiêu đề; "(Kèm theo Tờ trình số … / Quyết định số … )"; cột: TT · Họ và tên · Địa chỉ thửa đất thu hồi · Tổng DT thu hồi (m²) ·
**Loại đất** (mỗi loại một cột m² + cột "Đất không đủ ĐK BT") · Tổng các khoản BT · Trong đó BT (đất; tài sản; cây cối hoa màu) ·
Trong đó HT (chuyển đổi nghề và tìm kiếm việc làm; tài sản, vật kiến trúc; cây cối hoa màu; hỗ trợ khác). Số liệu **tham chiếu
công thức sang trang chi tiết từng hộ** (vd. `='3. [Tên hộ]'!H12`); dòng "Tổng cộng (làm tròn)" `=ROUND(SUM(G8:G8),-3)`.

### 4.3. Biểu tổng hợp số 02 — bảng tính chi tiết từng hộ (trang riêng mỗi hộ)
Tiêu đề (trình thẩm định, phê duyệt giá trị BT, HT) + dòng "(Kèm theo …)" lấy bằng công thức từ biểu 01; họ tên chủ hộ, **CCCD số,
ngày cấp, nơi cấp**, địa chỉ; câu căn cứ biên bản kiểm kê và kết quả công khai PA. Cột: Số TT · Hạng mục BT, HT · ĐVT · Khối lượng ·
Đơn giá · **Hệ số nội suy** · **Mức hỗ trợ theo thời điểm tạo lập, xử lý vi phạm** · Thành tiền · Căn cứ pháp lý. Nhóm:
A. CÁC KHOẢN BỒI THƯỜNG (I. BT về đất — đơn giá theo NQ 152/2025; dòng "* Thửa đất số … – TBĐ …"; từng loại đất) ·
B. CÁC KHOẢN HỖ TRỢ (I. đào tạo chuyển đổi nghề — ghi rõ "Điều 14 PL II QĐ 106/2025 … = giá × 5 lần"; II. cây cối hoa màu — dẫn
PL VIII QĐ 106/2025 và "STT …, biểu 01"; III. hỗ trợ khác bằng tiền; IV. tài sản, vật kiến trúc — kể cả dòng **không BT, HT** với lý do
và căn cứ, vd. tài sản tạo lập vi phạm trật tự xây dựng: khoản 2 Điều 105 LĐĐ 2024; tiết b điểm 3.3 khoản 3 Điều 6 QĐ 14/2026).
Khối lượng ghi **công thức kích thước** (vd. `=10*5`, `=(5*3.5)-D27` trừ phần trùng) — phần mềm đã có biểu thức khối lượng (VM-11).
Đơn giá chuyển đổi nghề trong biểu: `=54000*1.5*5` (giá đất × hệ số điều chỉnh giá đất × 5 lần).

### 4.4. Biểu tổng hợp diện tích thu hồi (kèm Tờ trình / QĐ thu hồi đất nhiều hộ)
Cột: STT · Họ và tên (quan hệ) · Địa chỉ thửa đất thu hồi · Số thửa · TBĐ · Diện tích (m²) = tổng các cột loại đất · Loại đất thu
hồi (m²) — **mỗi ký hiệu loại đất một cột** (LUC, CLN, HNK…) · Ghi chú; dòng TỔNG CỘNG.

## 5. Việc cần làm trong phần mềm

> **Tình trạng 0.9.4:** điểm 1 (mẫu T1–T7, docs/10 §3b), 3 (4 biểu Excel trong mẫu mặc định), 4 (kiểm tra thống nhất) đã làm; điểm 2: đã có chọn/bỏ căn cứ theo dự án, **chưa** đưa 5 văn bản mới vào danh mục căn cứ (chờ nguyên văn); điểm 5: thời hạn 60/120 ngày là trường nhập của Kế hoạch (chưa có nguyên văn văn bản sửa đổi k2 Đ85 LĐĐ).

1. **Mẫu văn bản**: rà 27 mẫu hiện có theo bố cục mục 3 (đặc biệt 11 mục của Tờ trình/QĐ phê duyệt PA, nhóm "hỗ trợ khác khoản 13
   Điều 6 QĐ 14/2026" có *nội dung — lý do — mức — tổng*); Tờ trình + QĐ thu hồi **nhiều hộ** tự lấy danh sách QĐ phê duyệt PA
   (số, ngày) từ các hộ đã chọn; Kế hoạch thu hồi đất sinh từ lịch dự kiến.
2. **Căn cứ pháp lý**: bổ sung danh mục căn cứ chung (Luật TCCQĐP 2025, NQ 254/2025/QH15, NĐ 151/2025, NĐ 49/2026, QĐ 426/QĐ-UBND)
   — **chỉ sau khi có nguyên văn**; cho người dùng chọn/bỏ từng căn cứ theo dự án.
3. **Biểu Excel**: thêm 4 biểu mục 4 vào mẫu Excel mặc định (0.9.0) — cột loại đất động theo ký hiệu có trong dự án, tham chiếu công
   thức từ biểu 01 sang trang chi tiết, dòng CCCD, cột "Hệ số nội suy", "Mức hỗ trợ theo thời điểm", dòng tài sản không BT, HT có lý do.
4. **Kiểm tra thống nhất**: tên cơ quan ban hành (UBND phường/xã, không còn "UBND thành phố"), số tờ trình trong dòng "(Kèm theo …)"
   của biểu khớp số văn bản, tổng tiền bằng số khớp bằng chữ, DT trong trích yếu khớp tổng biểu.
5. **Thời hạn** mục 2 đối chiếu `docs/05` (hiệu lực TB 12 tháng; 60/120 ngày; 03 lần/03 ngày; 05 ngày làm việc; 10 ngày).

## 6. Bản đồ TD_73 (tệp trong ảnh lỗi 0.9.2)
Tệp V8i, 84 ô dùng chung, 27 kích thước; nguyên nhân đường dọc kéo dài và cách sửa: docs/08 mục 7, docs/09 (0.9.3). Tệp không lưu vào kho.
