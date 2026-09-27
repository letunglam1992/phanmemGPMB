# 03. Sổ vướng mắc pháp lý và dữ liệu

Mỗi mục ở trạng thái **Mở** cho đến khi người dùng xác nhận. Phần mềm **không tự chọn** cách hiểu; khoản tính liên quan ở trạng thái "Cần xác nhận" và chặn chốt phương án.

Mức độ: 🔴 ảnh hưởng số tiền | 🟠 ảnh hưởng điều kiện/phân loại | 🟡 dữ liệu/biên tập

Cập nhật đợt 2 (27/9/2026): đổi căn cứ sang QĐ 14/2026 nơi Phụ lục II đã bị thay thế; bổ sung VM-21 → VM-30.

| Mã | Mức | Vị trí | Nội dung | Đề xuất xử lý (chờ xác nhận) | Trạng thái |
|---|---|---|---|---|---|
| VM-01 | 🔴 | PLV – ví dụ Ghi chú | "750.000 + 97.500 = 847.000" — đúng phải là **847.500** | Tính theo công thức; quy tắc làm tròn theo câu hỏi 3 | Mở |
| VM-02 | 🔴 | PLV, PLVIII Biểu 02–04, QĐ32 (.md) | Lệch dòng/cột, mất Biểu 02 mục 1–15, thiếu nhóm QĐ32 | Nhập từ bản gốc (ưu tiên Excel), đối chiếu 2 lượt | Mở |
| VM-03 | 🔴 | **Đ3 k4 QĐ14** (trước đây Đ9 k3 PLII) | "Hộ từ 05 nhân khẩu trở lên, mỗi nhân khẩu tăng thêm 500.000" — không nói **so với mức nào** (Đ11 PLII ghi rõ "so với điểm b") | Mức nhóm ≤ 4 khẩu + 500.000 × (số khẩu − 4) | Mở |
| VM-04 | 🟠 | Đ3 k4 QĐ14; Đ10, Đ14 PLII | (i) Danh sách xã khác nhau giữa các Điều (Đ3 QĐ14 & Đ10: 10 xã có Vân Hồ; Đ14: 12 xã có Lóng Sập, Chiềng Sơn, Tân Yên, không có Vân Hồ). (ii) Đ10 k1 liệt kê 9 phường có **"Quyết Tâm"** — **không có** trong danh mục 75 xã, phường của NQ152 (chỉ có 8 phường) | Mỗi Điều một bảng phân nhóm riêng, nhập đúng văn bản; danh mục chuẩn lấy theo NQ152; "Quyết Tâm" cần xác nhận | Mở (một phần đã rõ) |
| VM-05 | 🔴 | Đ6 k1 PLII; Đ14 k1 a NĐ88 | NĐ88 đã xác nhận cấu trúc: Mức BT = Tgt + tỷ lệ % × Tgt, **trần** 100% G1. PLII thêm **sàn** 60% G1 | Mức BT = min(max(1,2 × Tgt; 60% G1); 100% G1) — cần xác nhận | Mở |
| VM-06 | 🔴 | Đ14 k1 b NĐ88; Đ18 k2 c PLII | Tgt = G1 − G1 × T1/T; **T (thời gian khấu hao)** chưa có bảng (Sở Tài chính hướng dẫn); cách xác định T1 (năm đã sử dụng, làm tròn năm/tháng?) | Cần TL-27; tạm thời nhập tay T và T1 có căn cứ | Mở |
| VM-07 | 🔴 | QĐ32 PL III k9 | Tường rào "nội suy theo chiều cao" — chưa rõ phương pháp | Tuyến tính theo tỷ lệ chiều cao thực tế/chuẩn — cần xác nhận | Mở |
| VM-08 | 🔴 | Chung | Quy tắc làm tròn DT, khối lượng, tiền từng dòng/hộ/tổng | Câu hỏi 3 | Mở |
| VM-09 | 🔴 | **Đ6 k3.2 (c, d) và k3.3 (a, b) QĐ14** | Khoảng trống: ngày **01/7/2014** (c: "trước", d: "sau") và **01/7/2004** (a: "trước", b: "từ sau") không thuộc mức nào — **QĐ14 giữ nguyên lỗi của PLII** | Đánh dấu "Cần xác nhận" khi ngày xây trùng mốc | Mở |
| VM-10 | 🔴 | PLVIII Đ5 k4, k5 | Giới hạn trên phần vượt 150% mật độ; DT tính mật độ; cây không quy định mật độ | Hỏi | Mở |
| VM-11 | 🟡 | PLVIII Biểu 03 mục VIII | Công thức thiếu diện tích dù đơn vị đồng/ha/năm | × DT (ha) | Mở |
| VM-12 | 🔴 | PLVIII Đ3 | Ao đúng 1.000 m² / thu hồi đúng 2/3 không thuộc khoản nào; cách tính "không vượt định mức kỹ thuật" | Hỏi | Mở |
| VM-13 | 🟠 | Đ5 k2 PLII | Hộ có đất NN thu hồi ở cả phường và xã trong cùng dự án | Hỏi khi phát sinh | Mở |
| VM-14 | 🔴 | Đ7 k2 PLII | Hành lang công trình khác: đất cây hàng năm không có mức | "Thiếu căn cứ" | Mở |
| VM-15 | 🟠 | **Đ6 k9.1 b QĐ14** (trước đây Đ17 k10.1 b PLII) | Dẫn chiếu "Điều 15 phụ lục II" (cơ chế thưởng) cho hỗ trợ chuyển đổi nghề — các điểm a, c dẫn **Điều 14**. **QĐ14 giữ nguyên lỗi** | Hiểu là Điều 14 — cần xác nhận | Mở |
| VM-16 | 🔴 | Đ15 PLII | Cơ sở tính thưởng có gồm cây trồng, vật nuôi, mồ mả? Trần theo hộ hay theo người đồng sử dụng? | Hỏi | Mở |
| VM-17 | 🟠 | **Đ6 k1, k2 QĐ14** | Hộ vừa có đối tượng chính sách vừa là hộ nghèo: cộng hai khoản? ("mức cao nhất" chỉ nêu trong k1) | Hỏi | Mở |
| VM-18 | 🟠 | QĐ 27/2026 Đ6 | Hết hiệu lực 01/3/2027 | Bảng thẩm quyền có hiệu lực đến 28/02/2027, cảnh báo trước 60 ngày | Mở |
| VM-19 | 🟠 | Đ19 k1 a NĐ88; Đ12 PLII; **Đ6 k9 QĐ14** | Ngưỡng **đúng 30%**: NĐ88 "từ 30% đến 70%" (thuộc k1); Đ12 PLII "dưới 30%"; nhưng Đ6 k9 QĐ14 dùng "trên 30%" và "từ 10% đến 30%" → 30% rơi vào nhóm dưới | Theo NĐ88 (văn bản cấp trên) — cần xác nhận | Mở |
| VM-20 | 🔴 | k2 Đ91, điểm e k1 Đ160 LĐĐ (bản gốc) | Bản LĐĐ đã nhận quy định BT theo **giá đất cụ thể**; chưa có NQ 254/2025 và NĐ 49/2026 để biết có thay đổi hay không | Câu hỏi 2; cần TL-11, TL-13 | Mở |
| VM-21 | 🟠 | TL-10, TL-12 | Luật Đất đai và NĐ 88 đã nhận là **bản gốc chưa hợp nhất** (còn "cấp huyện"; NĐ88 chưa có sửa đổi của NĐ 226/2025) | Cần bản hợp nhất hoặc các văn bản sửa đổi | Mở |
| VM-22 | 🔴 | NĐ88 Đ13 k7, Đ14 k1 b, Đ17 k4 | Công thức là **hình ảnh**, bị mất khi chuyển .docx → văn bản | Cần bản PDF để khôi phục đúng nguyên văn trước khi lập trình | Mở |
| VM-23 | 🟡 | Sổ tay – Phần III | Bảng danh mục ghi Mẫu 14 = QĐ thu hồi đất, Mẫu 15 = QĐ phê duyệt PA; **nội dung thực tế ngược lại** (Mẫu 14 = QĐ phê duyệt PA, Mẫu 15 = QĐ thu hồi, khớp với mục XII.2). Mục XV.3 ghi "02 (ba) ngày" (2 lần) | Theo nội dung mẫu; thời hạn thưởng dùng "02 ngày"? — cần xác nhận | Mở |
| VM-24 | 🟠 | Đ7 k3 b PLII | Dẫn chiếu "điểm 4.2 và 4.3 khoản 4 Điều 17" — Điều 17 **đã hết hiệu lực** 31/3/2026 | Hiểu là k3.2, k3.3 Đ6 QĐ14 — cần xác nhận | Mở |
| VM-25 | 🟠 | Sổ tay | Thời hạn lúc tính "ngày", lúc "ngày làm việc" | Phần mềm phân biệt 2 loại; cần danh mục ngày nghỉ lễ hằng năm | Mở |
| VM-26 | 🟡 | QĐ 03/2025 | Ngày ký/hiệu lực đọc từ bản quét không rõ ("06/01/2025", "16/01/2025"?) | Đối chiếu bản gốc | Mở |
| VM-27 | 🔴 | NQ152 – phần thân Quy định | OCR mất dấu, trộn cột: quy tắc vị trí 1–5, giảm 30% chênh cao ≥ 1,5 m, 70% đường đất, tăng theo mặt tiếp giáp (tối đa 20%), phân lớp chiều sâu, tăng 50% đất NN xen kẽ | **Không mã hóa từ bản lỗi**; cần PDF/Word gốc | Mở |
| VM-28 | 🔴 | Đ6 k11 QĐ14 | "20% tiền sử dụng phải nộp của thửa đất được giao TĐC" — tính trên tiền SDĐ trước hay sau khi trừ ghi nợ/miễn giảm? | Hỏi | Mở |
| VM-29 | 🟠 | Dự thảo sửa QĐ106 | Chưa có số, ngày hiệu lực; Phụ lục trùng STT "1" | Bộ chính sách "Dự thảo" | Mở |
| VM-30 | 🟠 | Tên tệp NQ152 Bảng 01–08 có chữ "du_thao" | Nội dung ghi "Ban hành kèm theo NQ 152/2025" | Xác nhận là bản chính thức | Mở |
