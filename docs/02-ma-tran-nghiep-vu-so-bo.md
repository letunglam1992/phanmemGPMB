# 02. Ma trận nghiệp vụ sơ bộ

**Phạm vi**: chỉ từ tài liệu đã nhận (TL-01…TL-05). **Chưa phải quy tắc đã xác nhận**: mọi dòng ở trạng thái `Chờ xác nhận` cho đến khi người dùng duyệt. Cột "Cần xác nhận" dẫn chiếu sổ vướng mắc (VM-xx, docs/03).

Viết tắt: PLII = Phụ lục II QĐ 106/2025/QĐ-UBND; PLV, PLVIII tương tự; QĐ32 = QĐ 32/2025/QĐ-UBND; NĐ88 = NĐ 88/2024/NĐ-CP; GXDM = giá trị xây dựng mới; ĐG = đơn giá.

## A. Bồi thường, hỗ trợ về tài sản

| Mã | Nghiệp vụ | Điều kiện áp dụng | Dữ liệu đầu vào | Cách tính / xử lý (sơ bộ) | Đầu ra | Căn cứ | Cần xác nhận |
|---|---|---|---|---|---|---|---|
| NV-A01 | BT nhà, công trình đủ tiêu chuẩn kỹ thuật | Nhà, công trình hợp pháp trên đất đủ ĐK bồi thường; thuộc K1 Đ14 NĐ88 | Loại nhà (mã ĐG QĐ32), đại lượng (m²xd / m²sàn / m³ / m dài / cái), giá trị hiện có | Mức BT = GT hiện có + 20% × GT hiện có; chặn dưới 60% GXDM, chặn trên 100% GXDM; GXDM = khối lượng × ĐG QĐ32 | Tiền BT từng hạng mục | Đ6.1 PLII; K1 Đ14 NĐ88; Đ3, PL I–III QĐ32 | VM-05, VM-06 |
| NV-A02 | BT nhà, công trình **không đủ** tiêu chuẩn kỹ thuật | Điểm d K1 Đ14 NĐ88 | Như trên | Có trong ĐG tỉnh: 100% ĐG; không có: nhập giá trị theo dự toán được thẩm định (nhập tay, bắt buộc số/ngày văn bản thẩm định) | Tiền BT | Đ6.2 PLII | — |
| NV-A03 | Hạng mục chưa có / khác biệt so với ĐG | Nhà, công trình không có trong QĐ32 hoặc khác biệt | Dự toán do tư vấn lập / bù trừ theo PL II QĐ32 | Không tự tính: nhập giá trị đã thẩm định + căn cứ; hoặc bù trừ theo công tác xây dựng PL II QĐ32 | Tiền BT | Đ4 QĐ32; Đ6.2.b, Đ17.4.4 PLII | VM-07 |
| NV-A04 | Hỗ trợ nhà, công trình trên đất đủ ĐK BT nhưng **sai mục đích** (xây trên đất NN) | Có đất đủ ĐK BT; công trình trên đất NN; không có biên bản vi phạm (nếu có → NV-A06) | Ngày xây dựng, ĐG cùng loại | Trước 01/7/2004: 100%; 01/7/2004–trước 01/7/2014: 80%; từ 01/7/2014–trước ngày TB thu hồi: 30% × ĐG | Tiền HT | Đ17.4.1 PLII | VM-08 (xác định ngày xây) |
| NV-A05 | Hỗ trợ nhà, công trình trên đất **không đủ ĐK BT** | Đất không đủ ĐK BT | Ngày xây dựng | Trước 15/10/1993: 100%; 15/10/1993–trước 01/7/2004: 70%; 01/7/2004–trước 01/7/2014: 50%; "sau 01/7/2014"–trước TB thu hồi: 30% | Tiền HT | Đ17.4.2 PLII | **VM-09** (ngày 01/7/2014) |
| NV-A06 | Hỗ trợ tháo dỡ khi có biên bản vi phạm | Trường hợp A04/A05 có biên bản đình chỉ/yêu cầu tháo dỡ | Ngày xây, biên bản | Trước 01/7/2004: 30% ĐG; "từ sau" 01/7/2004: không HT | Tiền HT | Đ17.4.3 PLII | **VM-09** (ngày 01/7/2004) |
| NV-A07 | Công trình phục vụ sinh hoạt nằm ngoài cọc GPMB | Thu hồi đất ở, phải di chuyển nhà | Hạng mục, ĐG | ≤ 100% ĐG cùng loại (mức cụ thể do Chủ tịch UBND xã quyết định) | Tiền HT | Đ17.5 PLII | Tỷ lệ cụ thể: nhập tay + căn cứ |
| NV-A08 | Cây hàng năm | Tạo lập trước TB thu hồi | Loại cây, diện tích (m²) | Diện tích × ĐG Biểu 01 | Tiền BT | Đ4.1, Đ5.1 PLVIII | VM-02 (bản gốc) |
| NV-A09 | Cây lâu năm, cây lâm nghiệp | Như trên | Loại cây, giai đoạn/đường kính/chu vi/tuổi, số cây, diện tích | Số cây ≤ mật độ quy định × 150% × diện tích: 100% ĐG; phần vượt: 30% ĐG; mật độ thấp hơn: theo thực tế; tre trúc ≤ 500 bụi/ha | Tiền BT | Đ5.4, Đ5.5 PLVIII; Biểu 02, 03 | **VM-10**, VM-02 |
| NV-A10 | Cây chưa có trong biểu giá / cây di chuyển được | — | Giá do UBND xã quyết định | Nhập tay + số QĐ | Tiền BT | Đ5.2, Đ5.3 PLVIII | — |
| NV-A11 | Chọn đơn giá chuyển tiếp cây lâu năm | Dự án đã thống kê, kiểm đếm trước ngày PLVIII có hiệu lực, chưa duyệt PA | Ngày hoàn thành kiểm đếm | Dùng Biểu ĐG PL II QĐ 48/2025 thay Biểu 02 | Bộ chính sách áp dụng | Đ6.3 PLVIII | TL-20, TL-22 |
| NV-A12 | Rừng trồng thuộc dự án lâm nghiệp; hỗ trợ công chăm sóc bảo vệ rừng | Hợp đồng giao khoán với Nhà nước | Số năm giao, số năm đã CS, diện tích | (Số năm giao − số năm đã CS) × 500.000 đ/ha/năm × **diện tích (ha)** | Tiền HT | Biểu 03 mục VII, VIII PLVIII | VM-11 |
| NV-A13 | Thủy sản | Thiệt hại thực tế, không vượt định mức kỹ thuật | Loại nuôi, diện tích ao, diện tích thu hồi, kg | Ao hỗn hợp < 1.000 m²: toàn bộ theo kg; > 1.000 m² & thu hồi > 2/3: toàn bộ theo m²; > 1.000 m² & < 2/3: phần thu hồi theo m²; thâm canh 1 loài: theo kg | Tiền BT | Đ3 PLVIII; Biểu 04 | **VM-12** |
| NV-A14 | Hỗ trợ di dời vật nuôi | Khu vực không dịch bệnh; di dời đến nơi đủ ĐK Luật Chăn nuôi | Loại vật nuôi, khối lượng (tấn/kg), quãng đường (km, số lẻ quy đổi), loại đường | ≤ 5 km: KL × km × ĐG mục I; phần > 5 km: KL × (km − 5) × ĐG mục II; cộng lại | Tiền HT | Đ3 PLV; Biểu kèm theo | **VM-01**, VM-02 |
| NV-A15 | Di chuyển mồ mả | Có mộ phải di chuyển | Loại mộ | Mộ xây 25.000.000; mộ không xây 15.000.000 đ/mộ; mộ quy mô lớn: theo dự toán thẩm định | Tiền BT | Đ8 PLII | — |
| NV-A16 | Nhà, công trình trong hành lang an toàn lưới điện ≤ 220 kV (không phải di dời) | Xây trên đất đủ ĐK BT trước TB thu hồi | Diện tích phần trong hành lang, ĐG | 70% × GT phần nhà trong hành lang theo ĐG xây mới; trên đất không đủ ĐK: 70% × mức HT Đ17.4.2/17.4.3 | Tiền BT/HT | Đ7.3 PLII | — |

## B. Bồi thường, hỗ trợ về đất

| Mã | Nghiệp vụ | Điều kiện áp dụng | Dữ liệu đầu vào | Cách tính / xử lý (sơ bộ) | Đầu ra | Căn cứ | Cần xác nhận |
|---|---|---|---|---|---|---|---|
| NV-B01 | BT về đất bằng tiền | Đủ ĐK BT (Đ95 LĐĐ, Đ5 NĐ88) | Loại đất, vị trí, diện tích, **giá đất BT** | Diện tích × giá đất BT | Tiền BT | **Chưa có tài liệu** | **Câu hỏi 2**, TL-11, TL-12 |
| NV-B02 | BT bằng đất khác mục đích / nhà ở | Tổng DT đất NN (không phải lâm nghiệp) thu hồi trong cùng dự án ≥ 1.000 m² (phường) / ≥ 1.500 m² (xã) … | DT thu hồi theo hộ, địa bàn, nguyện vọng | Kiểm tra điều kiện, đề xuất 01 thửa/căn/lô — **không tính tiền** | Danh sách đủ ĐK | Đ5 PLII | VM-13 |
| NV-B03 | Chi phí đầu tư vào đất còn lại (không có giấy tờ) | Không có giấy tờ K3 Đ17 NĐ88, có đầu tư thực tế | Dự toán được duyệt, hoặc giá đất bảng giá; tỷ lệ thời hạn còn lại (tổ chức) | Có dự toán: theo dự toán; không đủ căn cứ: 1 × giá bảng giá × (tỷ lệ thời hạn còn lại – với tổ chức) × DT | Tiền BT | Đ3 PLII | — |
| NV-B04 | Đất trong hành lang bảo vệ lưới điện | Không đổi mục đích nhưng hạn chế sử dụng | Loại đất, DT trong hành lang, giá đất cụ thể | Đất ở & đất cùng thửa, đất PNN: 80%; cây lâu năm, rừng trồng SX: 50%; cây hàng năm: 30% × giá đất cụ thể × DT | Tiền BT | Đ7.1 PLII | — |
| NV-B05 | Đất trong hành lang công trình khác | Như trên | Như trên | 50% giá trị BT (trừ đất trồng cây hàng năm) | Tiền BT | Đ7.2 PLII | **VM-14** |
| NV-B06 | Hỗ trợ đất có nguồn gốc nông, lâm trường | Các trường hợp 10.1.a/b/c, 10.2 | Nguồn gốc, thời điểm sử dụng, DT, hạn mức | Tổ hợp nhiều khoản (đất, cây, nhà, ổn định đời sống, chuyển nghề) | Nhiều khoản | Đ17.10 PLII | **VM-15**; đề xuất đưa sang phiên bản 2 |
| NV-B07 | Đất rừng dùng SX NN; đất NN sai mục đích ghi trên GCN | Đ17.9, Đ17.11 | Giá đất 2 loại, DT, hạn mức | Chênh lệch giá đất × DT (≤ hạn mức); chuyển nghề theo chênh lệch × hệ số Đ14 | Tiền HT | Đ17.9, Đ17.11 PLII | TL-23, TL-24 |

## C. Hỗ trợ và tái định cư

| Mã | Nghiệp vụ | Điều kiện áp dụng | Dữ liệu đầu vào | Cách tính / xử lý (sơ bộ) | Đầu ra | Căn cứ | Cần xác nhận |
|---|---|---|---|---|---|---|---|
| NV-C01 | Ổn định đời sống (thu hồi < 30% đất NN) | Hộ bị thu hồi 10%–< 30% DT đất NN đang sử dụng | Tỷ lệ % thu hồi, có di chuyển chỗ ở, nơi đến (khó khăn/ĐBKK), số nhân khẩu, giá gạo | Số tháng: 10–<20%: 2/3/6; 20–<30%: 3/6/9 (không di chuyển / di chuyển / đến địa bàn khó khăn–ĐBKK); tiền = 30 kg × giá gạo × nhân khẩu × tháng | Tiền HT | Đ12 PLII; K2 Đ19 NĐ88; K4 Đ2 NĐ 226/2025 | TL-25, TL-26 |
| NV-C02 | Ổn định đời sống (≥ 30%) | Thu hồi ≥ 30% | — | Theo K1 Đ19 NĐ88 | Tiền HT | K1 Đ19 NĐ88 | **Chưa có văn bản** (TL-12) |
| NV-C03 | Ổn định SX (bồi thường bằng đất NN) | Được BT bằng đất NN | DT, loại cây, định mức giống | Cây hàng năm: 100% giống, vật tư 2 vụ; cây lâu năm: 50% chi phí năm đầu, ≤ 1 ha/hộ | Tiền HT | Đ13.1, Đ17.6 PLII | Cần bảng định mức → giai đoạn đầu nhập tay |
| NV-C04 | Ổn định SXKD phi NN | Có ĐKKD, phải ngừng SXKD | Thu nhập sau thuế bình quân 3 năm / doanh thu | Ngừng hẳn: 30% × 1 năm thu nhập sau thuế BQ; ngừng tạm: 50% mức đó; hộ không thực hiện kế toán: DT ≤ 100 tr: 2.400.000; > 100 tr: 4.800.000 đ/cơ sở | Tiền HT | Đ13.2, 13.3 PLII | — |
| NV-C05 | Trợ cấp ngừng việc người lao động | Có HĐLĐ | Theo pháp luật lao động | ≤ 6 tháng | Tiền HT | Đ13.4 PLII | Cần căn cứ pháp luật lao động |
| NV-C06 | Đào tạo, chuyển đổi nghề, tìm việc làm | Đối tượng K1 Đ109 LĐĐ | Loại đất NN, DT thu hồi, giá đất NN bảng giá, hạn mức, địa bàn | Hệ số × giá đất NN cùng loại (bảng giá) × min(DT thu hồi, hạn mức); hệ số: phường 5; nhóm xã liệt kê 4; còn lại 3 | Tiền HT | Đ14 PLII | VM-04, TL-23, TL-24 |
| NV-C07 | Hỗ trợ thuê nhà chờ TĐC | Chưa bố trí TĐC; tự thuê nhà; không ở nhà tạm NN | Nhân khẩu, địa bàn, ngày bàn giao, ngày giao đất/nhà TĐC | Mức/tháng theo nhóm địa bàn & nhân khẩu × số tháng (+ 6 tháng nếu TĐC bằng đất) | Tiền HT | Đ9 PLII | **VM-03**, VM-04 |
| NV-C08 | Hỗ trợ tự lo chỗ ở | Đủ ĐK TĐC (K8 Đ111 LĐĐ), tự lo chỗ ở | Địa bàn | 100 tr / 80 tr / 60 tr đồng/hộ theo nhóm địa bàn | Tiền HT | Đ10 PLII | VM-04 |
| NV-C09 | Người đang thuê nhà thuộc sở hữu NN | Phải phá dỡ, không còn chỗ ở khác trong xã | Nhân khẩu, số tháng thuê thực tế | Thuê nhà ≤ 6 tháng (2,0 / 3,5 tr + 0,5 tr/khẩu tăng thêm so với điểm b); tự lo chỗ ở: 50% mức Đ10 | Tiền HT | Đ11 PLII | — |
| NV-C10 | Suất TĐC tối thiểu | Tính HT theo K8, K10 Đ111 LĐĐ | Địa bàn, giá đất nơi TĐC | Đất ở: 40 m² (phường) / 60 m² (xã); nhà ở: 40 m²; bằng tiền = giá đất khu TĐC × DT suất tối thiểu bằng đất | Số tiền/suất | Đ16 PLII | — |
| NV-C11 | Thưởng bàn giao mặt bằng trước hạn | Tự nguyện bàn giao trong các mốc thời gian | Ngày bàn giao, các mốc (hoàn thành kiểm đếm, niêm yết, hạn bàn giao), tổng BT đất + tài sản (không tính HT) | Mốc 1: 10%, tối đa 20.000.000; mốc 2: 10%, tối đa 15.000.000 (TH nông lâm trường: 10% giá trị hỗ trợ khác) | Tiền thưởng | Đ15 PLII | VM-16 |
| NV-C12 | Hỗ trợ hộ có đối tượng chính sách phải di chuyển chỗ ở | Có xác nhận phòng chuyên môn | Loại đối tượng | 6,0 / 5,5 / 5,0 / 4,5 / 3,0 tr/hộ; nhiều tiêu chuẩn → **chỉ mức cao nhất** | Tiền HT | Đ17.1 PLII | — |
| NV-C13 | Hộ nghèo | Có giấy chứng nhận hộ nghèo; di chuyển chỗ ở hoặc ngừng SXKD | — | 4.000.000 đ/hộ | Tiền HT | Đ17.2 PLII | Cộng dồn với C12? (VM-17) |
| NV-C14 | Thủ tục về nhà mới | Phải di chuyển chỗ ở | — | 2.000.000 đ/hộ | Tiền HT | Đ17.3 PLII | — |
| NV-C15 | Ổn định đời sống khi xây lại nhà | Nhà phải phá dỡ, làm lại ở nơi khác | Nhân khẩu, giá gạo | 30 kg × giá gạo × nhân khẩu × 6 tháng | Tiền HT | Đ17.7 PLII | TL-26 |
| NV-C16 | Cây trồng không đủ ĐK BT | Tạo lập trước TB thu hồi; không có biên bản xử phạt | Loại đất, cây | Đất đủ ĐK BT nhưng sai mục đích: 100% ĐG; đất không đủ ĐK: 80% ĐG (trừ TH 10.1) | Tiền HT | Đ17.8 PLII | — |
| NV-C17 | Hỗ trợ khác do UBND xã quyết định | Theo từng dự án | Nội dung, mức | Nhập tay, bắt buộc số/ngày văn bản | Tiền HT | Đ17.13 PLII; K2 Đ108 LĐĐ | — |

## D. Quy trình và thẩm quyền

| Mã | Nghiệp vụ | Điều kiện | Đầu vào | Xử lý | Đầu ra | Căn cứ | Cần xác nhận |
|---|---|---|---|---|---|---|---|
| NV-D01 | Xác định cấp có thẩm quyền | Theo loại thu hồi, thời điểm | Căn cứ thu hồi (Đ78, 79, 81, 82 LĐĐ), ngày | Tra bảng thẩm quyền theo hiệu lực: Chủ tịch UBND xã: TB thu hồi, QĐ thu hồi (Đ78, 79, 82 và 81 trừ TH ủy quyền), thành lập Hội đồng, Ban cưỡng chế kiểm đếm, **phê duyệt PA BT-HT-TĐC**, giá bán nhà TĐC trong xã; Chủ tịch UBND tỉnh: giá bán nhà TĐC ở xã khác | Chức danh ký trên biểu mẫu | QĐ 27/2026 PL I mục II, PL II mục I, II | **VM-18** (hết hiệu lực 01/3/2027) |
| NV-D02 | Chọn bộ chính sách chuyển tiếp | Dự án có QĐ thu hồi/PA trước ngày văn bản mới có hiệu lực | Ngày QĐ thu hồi, ngày phê duyệt PA, ngày kiểm đếm, có Khung chính sách của TTg | Đề xuất bộ chính sách, **người dùng xác nhận** | Bộ chính sách của dự án | Đ19 PLII; Đ6 PLVIII; Đ5 QĐ32 | — |
