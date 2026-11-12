# 23. Đánh giá toàn diện ở phiên bản 1.3.6 (12/11/2026) — trọng tâm: nhập và nhận diện bản đồ

> **Cập nhật cùng ngày — Đợt 1, Đợt 2 bản đồ đã làm** (docs/08 §10, QD-50): BĐ-1 (dò lớp tổng quát), BĐ-2 (nối đầu mút, chỗ hở),
> BĐ-3 (nút lệch ≤ 2 m; nhãn rời **không** gán — tệp thật cho thấy là bộ nhãn khác), BĐ-4 (chủ thứ hai, địa chỉ), BĐ-5 (loại đất
> lạ — chưa có bảng quy đổi mã cũ: cần người dùng cung cấp kèm căn cứ), BĐ-6 (trình nhập từng bước), BĐ-7 (thẻ Rà lỗi), BĐ-8 (mẫu
> cấu hình), BĐ-9 (ranh tuyến khép hai đầu; chưa làm "tim tuyến + bề rộng"), BĐ-10 (luồng nền; chưa làm dựng lại từng phần),
> BĐ-14 (kiểm thử). Chưa làm: BĐ-11 (lọc màu / kiểu nét), BĐ-12, BĐ-13. Thêm ngoài danh sách: dùng **diện tích ghi ở khung tờ**
> để tìm ranh GPMB / phạm vi và đối chiếu; giữ thửa nhỏ có nút; chấm lớp ranh thửa theo nút.

Thay cho `docs/17` (viết ở 0.3.0, phần lớn P0–P1 trong đó đã làm xong). Mọi nhận định dưới đây ghi rõ mức kiểm chứng:
**[Đã tái hiện]** = chạy thử thật trong phiên này (tệp giả, không dùng dữ liệu thật); **[Đọc mã]** = đọc mã nguồn, chưa chạy;
**[Đo]** = số đo trong phiên. Chưa thử trên tệp bản đồ thật của người dùng (không có trong kho).

## 1. Hiện trạng

| Chỉ số [Đo] | Giá trị |
|---|---|
| Mã nguồn TypeScript (`apps/desktop/src`, `packages`) | ≈ 52.000 dòng, 250 tệp ở ứng dụng |
| Rust (`src-tauri`) | ≈ 3.450 dòng (`may_chu.rs` 2.254) |
| Kiểm thử | core 89, gis 64, desktop 763; Playwright 118 kịch bản (49 tệp) |
| Gói giao diện sau khi build | `index-*.js` 3,1 MB một khối; bảng giá NQ 152 1,5 MB; exceljs 0,9 MB; pdf 1,7 MB |
| `any` / `as unknown as` | 22 chỗ; `eslint-disable` 31 chỗ; không có TODO/FIXME |
| Phụ thuộc có cảnh báo | `uuid` (qua `exceljs` 4.4.0) — 2 cảnh báo mức trung bình |

**Điểm mạnh** (giữ nguyên, không đề xuất đổi): tính toán có căn cứ từng dòng và không tự đặt mức; sổ vướng mắc – quyết định
nghiệp vụ (VM/QD) truy được; kiểm thử dày; dữ liệu mã hóa (SQLCipher, DPAPI), TLS mạng nội bộ, gói chính sách có chữ ký; quy
trình 16 bước, thời hạn theo ngày làm việc; 62 mẫu văn bản; gửi – tổng hợp cấp tỉnh. Giao diện ở 1366×768 gọn, không lỗi
console khi đi qua các màn chính [Đã tái hiện].

## 2. Bản đồ — vì sao "nhập vào nhận diện còn khó, chưa ổn"

### 2.1 Kết quả tái hiện

Dựng bản đồ giả 12 thửa (DXF, lớp đặt tên `RANH_THUA`, `NHAN_THUA`, `TEN_CHU`, `RANH_GPMB`) và các ca riêng lẻ gọi thẳng
`dungThua`, `goiYCauHinh` (`packages/gis`):

| # | Tình huống (rất hay gặp ở bản đồ thực tế) | Kết quả hiện nay | Nguyên nhân trong mã |
|---|---|---|---|
| B1 | Tệp **không dùng số lớp mặc định** 10/13/4/5/6/30 và không phải kiểu gCadas / nhãn kép | Chọn "Để phần mềm tự nhận diện" → **0 thửa**; ghi chú "Lớp ranh thửa (10) không có đường nào" [Đã tái hiện trên giao diện] | `goiYCauHinh` chỉ có các nhánh riêng cho từng kiểu tệp đã gặp (nút gCadas, nhãn kép, thêm lớp ranh); không có bước dò chung "lớp nào khép được thửa, lớp chữ nào là số thửa / diện tích / loại đất / tên" |
| B2 | Ranh thửa **hở 2 cm** ở một đỉnh (vẽ không bắt điểm) | Thửa **biến mất hoàn toàn**, không có cờ, không chỉ chỗ hở [Đã tái hiện] | `khepVung` dùng `Polygonizer` trên nét gốc, không có dung sai bắt dính, không báo đầu mút treo |
| B3 | Điểm gốc chữ nằm **ngoài thửa** (thửa hẹp, nhãn đặt lệch, chữ căn giữa) | Thửa thiếu cả số thửa, loại đất, diện tích, chủ; nhãn rơi vào "ngoài thửa" [Đã tái hiện] | Chỉ xét điểm gốc chữ (`pt.goc`), không xét tâm chữ theo chiều cao / độ dài, không gán nhãn mồ côi cho thửa gần nhất còn thiếu |
| B4 | **Hai tên** trong một thửa (vợ chồng, đồng sử dụng), tên dài **xuống dòng** | Lấy tên đầu, cờ "Nhiều chủ"; tên tổ chức hai dòng bị coi là hai chủ [Đã tái hiện] | `motHoacCo` lấy phần tử đầu; không ghép các dòng chữ xếp chồng sát nhau |
| B5 | Chữ **không phải mã loại đất** trên lớp nhãn ("Mương", "Đường") hoặc **mã cũ** ("2L", "T") | Nhận làm loại đất và **đưa nguyên vào hồ sơ** khi tạo hộ [Đã tái hiện + Đọc mã `TaoHo.tsx:58`] | `RE_LOAI` nhận mọi chuỗi chữ; không đối chiếu danh mục mã loại đất, không có bước quy đổi mã cũ |
| B6 | Ranh GPMB là **hai nét song song không khép đầu**, hoặc khép nhưng hở 5 cm | **0 vùng ứng viên** [Đã tái hiện] | Cùng nguyên nhân B2; không có cách "khép hai đầu" hay nối đoạn hở |
| B7 | Cấu hình lớp | Hộp thoại là 9 ô **gõ số lớp**, một đoạn chữ dài 5 dòng; bảng thống kê lớp nằm dưới mép màn hình; DXF có tên lớp nhưng vẫn phải làm việc bằng số; không xem trước kết quả khi đổi lớp [Đã tái hiện, ảnh chụp 1366×768] | `CauHinhLop.tsx` |
| B8 | Bản đồ lớn | 3.000 thửa + 9.000 nhãn: `dungThua` 1,4 s trong Node [Đo]; chạy **trên luồng giao diện** — WebView2 máy văn phòng chậm hơn 2–3 lần; mỗi lần đổi cấu hình dựng lại toàn bộ | `du-lieu.ts:145` gọi đồng bộ; gợi ý cấu hình còn gọi `dungThua` nhiều lần |
| B9 | Phân biệt đối tượng **theo màu / kiểu nét** (cùng một lớp) | Không làm được — cấu hình chỉ theo số lớp [Đọc mã] | `CauHinhLop` chỉ có `number[]` lớp, dù `PhanTu` đã có `mau`, `kieuNet`, `netDay` |

Kết luận: bộ đọc tệp (DGN V7/V8, DXF, TCVN3) vững; chỗ yếu là **tầng nhận diện** — đang là tập luật viết riêng cho vài tệp
mẫu, gặp tệp khác quy ước là người dùng phải tự dò từng lớp bằng số, và các lỗi vẽ thường gặp (hở ranh, nhãn lệch) làm mất dữ
liệu mà không chỉ ra chỗ sai.

### 2.2 Đề xuất (theo thứ tự nên làm)

| Mã | Việc | Nội dung | Lợi ích | Công |
|---|---|---|---|---|
| BĐ-1 | **Dò lớp tổng quát** | Với mỗi lớp có đường: thử khép vùng, chấm điểm theo số vùng 20 m²–5 ha và độ phủ. Với mỗi lớp chữ: phân loại theo mẫu chữ (số nguyên, số thập phân, mã loại đất trong danh mục, nhãn gộp, họ tên ≥ 2 từ) và **tỷ lệ chữ rơi vào trong thửa**. Chọn tổ hợp có nhiều thửa đủ nhãn nhất; nêu lý do từng lớp. DXF / DGN V8: dùng thêm tên lớp (`ranh`, `thua`, `gpmb`…). Kết quả vẫn là gợi ý, cán bộ chốt | Hết ca "0 thửa" (B1) | Vừa |
| BĐ-2 | **Khép thửa có dung sai + báo chỗ hở** | Bắt dính đầu mút trong dung sai (mặc định đề xuất 0,05 m, cán bộ sửa được — là tham số kỹ thuật vẽ, không phải quy định); liệt kê **đầu mút treo** và vẽ dấu đỏ trên bản đồ, bấm để phóng tới; nút "Nối chỗ hở này". Diện tích thửa sau bắt dính ghi rõ là đã chỉnh hình | Hết mất thửa im lặng (B2, B6) | Vừa |
| BĐ-3 | **Gán nhãn thông minh hơn** | Dùng tâm khung chữ (chiều cao × số ký tự, góc xoay) thay cho điểm gốc; nhãn mồ côi → đề xuất gán cho thửa gần nhất **còn thiếu** đúng loại nhãn đó (trong bán kính theo cỡ chữ), đánh dấu "gán theo khoảng cách" để cán bộ duyệt | Giảm mạnh cờ thiếu nhãn (B3) | Vừa |
| BĐ-4 | **Nhiều chủ, tên nhiều dòng** | Ghép các dòng tên xếp chồng (cùng lớp, cùng góc, cách nhau ≤ 1,5 cỡ chữ) thành một tên; hai tên riêng → giữ **cả hai** (đồng sử dụng) thay vì bỏ tên sau; hộp tạo hồ sơ cho chọn người đứng tên | Đúng thực tế hộ vợ chồng, tổ chức (B4) | Nhỏ |
| BĐ-5 | **Kiểm mã loại đất** | Chỉ nhận chuỗi có trong danh mục mã loại đất của phần mềm; chuỗi khác → cờ "Loại đất lạ". Mã cũ: bảng quy đổi **do người dùng nhập / xác nhận kèm căn cứ** (không tự đặt), áp cho cả tệp | Không đưa "Mương", "2L" vào hồ sơ (B5) | Nhỏ |
| BĐ-6 | **Trình nhập bản đồ từng bước** thay hộp gõ số | Bước 1 Ranh thửa → 2 Nhãn → 3 Chủ sử dụng → 4 Ranh GPMB → 5 Rà lỗi. Mỗi bước: danh sách lớp có tên, số đối tượng, chữ mẫu, **bấm vào đối tượng trên bản đồ để chọn lớp**, bản đồ tô ngay kết quả, đếm "dựng được n thửa, m thửa đủ nhãn" | Người không biết số lớp vẫn làm được (B7) | Lớn |
| BĐ-7 | **Bảng rà lỗi sau nhập** | Gom cờ theo loại, bấm từng dòng phóng tới thửa; sửa tại chỗ số thửa / loại đất / chủ / diện tích (ghi là "sửa tay", giữ giá trị đọc được để đối chiếu); lọc "chỉ thửa trong ranh GPMB" để chỉ rà phần cần | Rà 50 thửa thu hồi thay vì 700 thửa cả tờ | Vừa |
| BĐ-8 | **Lưu cấu hình thành mẫu theo đơn vị đo đạc** | "Mẫu gCadas", "Mẫu công ty X"…; nạp tệp mới → thử lần lượt các mẫu đã lưu, lấy mẫu cho nhiều thửa đủ nhãn nhất | Lần sau không phải cấu hình lại | Nhỏ |
| BĐ-9 | **Ranh GPMB dạng tuyến** | Hai nét song song → nút "Khép hai đầu"; một nét tim tuyến → nhập bề rộng mỗi bên (cán bộ nhập theo hồ sơ thiết kế) để dựng hành lang; hiện phần hở khi không khép được | Dự án giao thông, kênh mương (B6) | Vừa |
| BĐ-10 | **Dựng thửa ở luồng nền**, chỉ dựng lại phần đổi | Dùng cơ chế tính nền đã có (`tinh-nen.ts`); chỉ mục không gian cho nhãn | Bản đồ 5.000–10.000 thửa không đứng màn hình (B8) | Vừa |
| BĐ-11 | Lọc theo **màu / kiểu nét** trong một lớp | Thêm điều kiện tùy chọn vào cấu hình | Bản đồ dồn nhiều loại vào một lớp (B9) | Nhỏ |
| BĐ-12 | **Xuất thửa thu hồi ra DXF / GeoJSON** kèm thuộc tính (mã hồ sơ, DT thu hồi, hiện trạng) qua `taiXuong` | Trả lại đơn vị đo đạc, chồng lên QGIS / MicroStation — hiện chỉ xuất PDF | Nhỏ |
| BĐ-13 | **Sơ đồ thửa từng hộ** (hình thửa, phần thu hồi, cạnh, diện tích) chèn vào biên bản kiểm đếm, phương án của hộ — ghi rõ "sơ đồ minh họa, không phải trích lục" | Hộ dân dễ đối chiếu khi niêm yết | Vừa |
| BĐ-14 | **Bộ tệp kiểm thử bản đồ khó** | Đưa các ca B1–B6 thành kiểm thử cố định trong `packages/gis/test` (tệp giả) | Không tái phát khi sửa | Nhỏ |

Cần người dùng cung cấp để làm tốt: 2–3 tệp bản đồ thật đang gặp khó (đặt ngoài kho, kiểm qua `GPMB_DGN_MAU`), nói rõ thửa
nào nhận sai — vì các ca trên là suy từ lỗi vẽ phổ biến, chưa chắc trùng hết với tệp đang vướng.

## 3. Bất cập, hạn chế khác

| Mã | Vấn đề | Chứng cứ | Đề xuất |
|---|---|---|---|
| K-1 | Hạn mức chuyển đổi nghề cộng dồn dùng dần **theo thứ tự thửa** (QD-49) — đổi thứ tự thửa có thể đổi tổng tiền khi giá / hệ số thôn khác nhau | `tinhHoGoc` [Đọc mã] | Người dùng quyết cách phân bổ (theo thứ tự / ưu tiên có lợi cho hộ / theo tỷ lệ diện tích) rồi ghi QD |
| K-2 | `exceljs` 4.4.0 có lỗi `spliceRows` (đã vá vòng ở 1.3.6), còn cảnh báo `uuid` | `npm audit` [Đo] | Kiểm thử hồi quy cho mọi thao tác chèn / xóa dòng; cân nhắc ghim bản vá riêng |
| K-3 | Một khối JS 3,1 MB nạp ngay khi mở | `dist/assets` [Đo] | Tách theo màn (Bản đồ, Tổng hợp tỉnh, Văn bản) bằng `import()` — mở phần mềm nhanh hơn trên máy yếu |
| K-4 | Tệp quá lớn, khó bảo trì: `tinh-ho.ts` 1.245 dòng, `xuat-excel.ts` 1.225, `KhungVe.tsx` 1.007, `TongHopTinh.tsx` 957 | [Đo] | Tách `tinh-ho.ts` theo nhóm khoản (đất, tài sản, hỗ trợ) — không đổi kết quả, có kiểm thử che |
| K-5 | Mẫu Excel theo xã: bảng thứ hai trên cùng trang chỉ được báo, chưa điền; chưa thử tệp thật | docs/22 | Chờ tệp thật ẩn danh |
| K-6 | Tài liệu: `docs/17` lỗi thời; hai tệp cùng số 22; `docs/09` mỗi dòng dài hàng nghìn ký tự, khó tra | [Đọc] | Tách `docs/09` theo nhóm chức năng; đánh dấu `docs/17` là lịch sử |
| K-7 | Nhánh mặc định của kho lạc hậu so với nhánh làm việc (CLAUDE.md ở hai nhánh khác nhau) | Phiên này clone nhánh mặc định phải chuyển nhánh | Gộp `claude/great-rubin-4x4alw` vào nhánh mặc định sau mỗi bản phát hành |
| K-8 | Playwright toàn bộ ≈ 5 phút, chạy tuần tự | [Đo] | Chạy song song theo tệp trong CI |
| K-9 | 11 vướng mắc còn "linh động" (cán bộ chọn kèm lý do) — đúng nguyên tắc, nhưng mỗi dự án phải chọn lại | docs/03 | "Bộ lựa chọn mặc định của đơn vị": lưu cách chọn + lý do, áp sẵn cho dự án mới, vẫn sửa được từng hộ |

## 4. Tính năng, công cụ mới đề xuất

| Mã | Tính năng | Vì sao hữu ích | Ghi chú |
|---|---|---|---|
| M-1 | **Theo dõi kinh phí GPMB theo kế hoạch vốn**: kế hoạch vốn năm của dự án, lũy kế phê duyệt – chi trả – còn lại, cảnh báo phương án vượt vốn bố trí | Hiện có chi trả, quyết toán nhưng chưa có đối chiếu kế hoạch vốn [Đọc mã: không có "kế hoạch vốn"]; sát với theo dõi giải ngân đầu tư công | Số kế hoạch vốn do người dùng nhập kèm số, ngày quyết định giao |
| M-2 | **So sánh hai phương án / hai bộ chính sách cho cả dự án** dạng bảng chênh lệch từng hộ, từng khoản | Đã có chuyển bộ theo hộ; thêm bản tổng hợp cho tờ trình điều chỉnh | Dùng lại `chuyen-bo.ts` |
| M-3 | **Phiếu tra cứu cho hộ dân** (1 trang: thửa, khoản được nhận, căn cứ, tiến độ, nơi liên hệ) | Phục vụ niêm yết, tiếp dân, giảm khiếu nại | Dữ liệu cá nhân chỉ in ra, không gửi ra ngoài |
| M-4 | **Nhập kết quả kiểm đếm từ Excel hiện trường theo mẫu của phần mềm** kèm ảnh | Giảm gõ lại sau khi đi thực địa | Đã có nhập hồ sơ từ Excel (`nhap-excel.ts`); cần rà phần kiểm đếm tài sản còn thiếu gì trước khi làm |
| M-5 | **Bảng điều khiển vướng mắc**: gom hộ chưa bàn giao theo nguyên nhân (giá, nguồn gốc đất, TĐC, khiếu nại), số ngày tồn | Báo cáo lãnh đạo nhanh | Phân loại nguyên nhân do cán bộ chọn |
| M-6 | BĐ-12, BĐ-13 ở mục 2 | | |

## 5. Lộ trình đề xuất

1. **Đợt 1 (bản đồ, làm trước)**: BĐ-14 → BĐ-2 → BĐ-1 → BĐ-3 → BĐ-5 → BĐ-4. Sửa lõi nhận diện, chưa đổi giao diện nhiều.
2. **Đợt 2 (bản đồ, giao diện)**: BĐ-6 + BĐ-7 + BĐ-8, rồi BĐ-9, BĐ-10.
3. **Đợt 3**: K-1 (cần quyết định), K-3, K-4, K-9; M-1.
4. **Đợt 4**: BĐ-12, BĐ-13, M-2, M-3, M-5.
