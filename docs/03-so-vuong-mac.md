# 03. Sổ vướng mắc pháp lý và dữ liệu

Mỗi mục ở trạng thái **Mở** cho đến khi người dùng xác nhận cách áp dụng. Phần mềm **không tự chọn** một cách hiểu; các khoản tính liên quan sẽ ở trạng thái "Cần xác nhận" và chặn chốt phương án.

Mức độ: 🔴 ảnh hưởng trực tiếp số tiền | 🟠 ảnh hưởng điều kiện/phân loại | 🟡 dữ liệu/biên tập

| Mã | Mức | Văn bản – vị trí | Nội dung | Đề xuất xử lý (chờ xác nhận) | Trạng thái |
|---|---|---|---|---|---|
| VM-01 | 🔴 | PLV – Ghi chú, ví dụ | Ví dụ ghi "750.000 + 97.500 = 847.000 đồng", nhưng 750.000 + 97.500 = **847.500**. Cho thấy có thể văn bản ngầm làm tròn (xuống nghìn đồng?) hoặc lỗi đánh máy | Tính theo công thức (847.500); quy tắc làm tròn theo câu hỏi 3 | Mở |
| VM-02 | 🔴 | PLV, PLVIII Biểu 02–04, QĐ32 (bản .md) | Bản chuyển đổi lệch dòng/cột, mất đơn vị m², **mất Biểu 02 mục 1–15** và nhiều nhóm của QĐ32 | Nhập bảng đơn giá từ **bản gốc** (ưu tiên Excel), đối chiếu 2 lượt, mỗi dòng giữ số hiệu STT gốc | Mở |
| VM-03 | 🔴 | PLII Đ9 K3 điểm c | "Hộ từ 05 nhân khẩu trở lên, mỗi nhân khẩu tăng thêm 500.000" — không nói tăng thêm **so với mức nào**. Đ11 K1 điểm c ghi rõ "so với mức tại điểm b" | Áp dụng như Đ11: mức điểm b + 500.000 × (số khẩu − 4) | Mở |
| VM-04 | 🟠 | PLII Đ9 K3.2, Đ10, Đ14 K2 | Danh sách địa bàn **khác nhau giữa các Điều**: Đ9, Đ10 liệt kê 10 xã (có Vân Hồ); Đ14 K2 liệt kê 12 xã (thêm Lóng Sập, Chiềng Sơn, Tân Yên; không có Vân Hồ). Đ10 K1 liệt kê 9 phường theo tên, Đ9, Đ14 ghi chung "các phường" | Mỗi Điều dùng **bảng phân nhóm địa bàn riêng**, nhập đúng như văn bản; cần danh mục ĐVHC chính thức để đối chiếu (TL-25) | Mở |
| VM-05 | 🔴 | PLII Đ6 K1; K1 Đ14 NĐ88 | Cách hiểu công thức: Mức BT = GT hiện có × (1 + 20%), rồi giới hạn trong [60%; 100%] × GXDM? | Như trên, sau khi đối chiếu nguyên văn K1 Đ14 NĐ88 (sửa đổi bởi NĐ 226/2025 nếu có) | Mở |
| VM-06 | 🔴 | PLII Đ6 K1; PLII Đ18 K2 điểm c | Chưa có phương pháp xác định **giá trị hiện có** (tỷ lệ chất lượng còn lại do hội đồng đánh giá hay khấu hao theo thời gian sử dụng – Sở Tài chính hướng dẫn) | Giai đoạn đầu: nhập tỷ lệ % chất lượng còn lại có căn cứ; khi có hướng dẫn khấu hao sẽ tự tính | Mở |
| VM-07 | 🔴 | QĐ32 PL III khoản 9 | "Đơn giá tường rào… xác định theo chiều cao, khi áp dụng phải **nội suy**" — chưa rõ phương pháp (tỷ lệ thuận theo chiều cao so với chiều cao chuẩn?) | Nội suy tuyến tính theo tỷ lệ chiều cao thực tế / chiều cao chuẩn của dòng đơn giá — cần xác nhận | Mở |
| VM-08 | 🔴 | Chung | Quy tắc làm tròn diện tích, khối lượng, tiền từng dòng, từng hộ, tổng | Theo câu hỏi 3 | Mở |
| VM-09 | 🔴 | PLII Đ17 K4 điểm 4.2 (c, d) và 4.3 (a, b) | Khoảng trống mốc ngày: 4.2.c "…đến **trước** 01/7/2014" và 4.2.d "**sau** 01/7/2014" → ngày **01/7/2014** không thuộc mức nào; 4.3.a "trước 01/7/2004" và 4.3.b "từ **sau** 01/7/2004" → ngày **01/7/2004** không thuộc mức nào | Hỏi cách áp dụng; phần mềm đánh dấu "Cần xác nhận" khi ngày xây dựng trùng mốc | Mở |
| VM-10 | 🔴 | PLVIII Đ5 K4, K5 | (i) Phần cây vượt 150% mật độ hưởng 30% ĐG có **giới hạn trên** không? (ii) Diện tích để tính mật độ là DT thu hồi hay DT trồng thực tế? (iii) Cây lâu năm không có mật độ trong Biểu (hoa giấy "không quy định mật độ") | Lưu lựa chọn loại cây của chủ sở hữu (K4); áp như ma trận NV-A09 sau khi xác nhận | Mở |
| VM-11 | 🟡 | PLVIII Biểu 03 mục VIII | Công thức in trong văn bản thiếu diện tích dù đơn vị là đồng/ha/năm | Nhân thêm diện tích (ha) | Mở |
| VM-12 | 🔴 | PLVIII Đ3 | (i) Ao hỗn hợp **đúng 1.000 m²** và thu hồi **đúng 2/3** không thuộc khoản nào; (ii) cách xác định "không vượt định mức kỹ thuật" (mật độ con/m² × trọng lượng tối đa × DT?) | Hỏi cách áp dụng; mặc định đánh dấu "Cần xác nhận" | Mở |
| VM-13 | 🟠 | PLII Đ5 K2 | Hộ có đất NN thu hồi trên cả phường và xã trong cùng dự án: áp ngưỡng 1.000 m² hay 1.500 m²? | Hỏi khi phát sinh | Mở |
| VM-14 | 🔴 | PLII Đ7 K2 | Hành lang công trình khác (không phải lưới điện): chỉ quy định 50% cho đất ở và đất khác **trừ cây hàng năm**; đất cây hàng năm không có mức | Không tính; đánh dấu "Thiếu căn cứ" | Mở |
| VM-15 | 🟠 | PLII Đ17 K10 điểm 10.1.b | Dẫn chiếu "hỗ trợ đào tạo, chuyển đổi nghề… theo **Điều 15**" nhưng Điều 15 là cơ chế thưởng; Điều 14 mới là hỗ trợ chuyển đổi nghề (10.1.a và 10.1.c đều dẫn Điều 14) | Hiểu là Điều 14 — cần xác nhận | Mở |
| VM-16 | 🔴 | PLII Đ15 | (i) "Giá trị bồi thường về đất, tài sản gắn liền với đất" có gồm cây trồng, vật nuôi, mồ mả không? (ii) Mức tối đa tính theo hộ gia đình hay theo từng người có đất thu hồi khi đồng sử dụng? (iii) K2 ghi "hộ gia đình", K1 ghi "hộ gia đình, cá nhân" | Hỏi | Mở |
| VM-17 | 🟠 | PLII Đ17 K1, K2 | Quy tắc "chỉ hưởng mức cao nhất" chỉ nêu trong K1; hộ vừa có đối tượng chính sách vừa là hộ nghèo có được cộng K1 + K2? | Hỏi | Mở |
| VM-18 | 🟠 | QĐ 27/2026 Đ6; QĐ32 Đ4 K5 | QĐ 27/2026 **hết hiệu lực từ 01/3/2027** → bảng thẩm quyền cần văn bản thay thế; QĐ32 ban hành trước sắp xếp chính quyền 2 cấp, còn nhắc UBND huyện | Bảng thẩm quyền có hiệu lực đến 28/02/2027; phần mềm cảnh báo trước 60 ngày | Mở |
| VM-19 | 🟠 | PLII Đ17 K10 (10.1.a, b, c) và Đ12 | Mốc tỷ lệ không khớp: Đ17.10 dùng "trên 30%" và "từ 10% đến 30%" (đúng 30% thuộc nhóm dưới), còn Đ12 chỉ áp dụng "dưới 30%" (đúng 30% thuộc K1 Đ19 NĐ88) | Hỏi | Mở |
| VM-20 | 🔴 | — | Chưa có tài liệu về **giá đất bồi thường** (giá đất cụ thể theo dự án hay bảng giá đất × hệ số theo NQ 254/2025/QH15 và NĐ 49/2026) | Câu hỏi 2 | Mở |
