# 06. Quyết định nghiệp vụ đã xác nhận

Ghi nhận theo trả lời của người dùng ngày 27/9/2026 (đợt 1 và đợt 2). Đây là căn cứ để lập trình; mọi thay đổi sau này ghi thêm dòng mới, không sửa dòng cũ.

## 1. Quyết định chung

| Mã | Nội dung | Quyết định | Hệ quả thiết kế |
|---|---|---|---|
| QD-01 | Người dùng, môi trường | UBND cấp xã; dùng nội bộ cơ quan; Windows 10/11 | Bản cài một máy; kiến trúc sẵn sàng mạng nội bộ (máy chủ nội bộ + PostgreSQL) khi cơ quan cần nhiều người dùng đồng thời |
| QD-02 | Giá đất bồi thường | **Giá trong Bảng giá đất (NQ 152/2025) × hệ số điều chỉnh (nếu có)** | Giá đất = tra bảng giá theo xã, loại đất, tuyến, vị trí + các điều chỉnh của NQ 152 (Đ4, Đ6) × hệ số của dự án (nhập, mặc định 1, bắt buộc ghi số văn bản khi ≠ 1) |
| QD-03 | Làm tròn | Diện tích: **2 chữ số thập phân**; tiền: **làm tròn đến nghìn đồng**, làm tròn **ở từng hộ** | Dòng tính giữ đủ độ chính xác (số thập phân, không float); chỉ **tổng từng hộ/đối tượng** được làm tròn đến 1.000 đ. Cách làm tròn mặc định: **nửa lên** (≥ 500 đ lên 1.000 đ) — cấu hình được |
| QD-04 | Phạm vi đối tượng | **Hộ gia đình, cá nhân và tổ chức** | Bổ sung tổ chức: bồi thường đất có thời hạn (Đ13 k7 NĐ88), chi phí đầu tư vào đất còn lại (Đ17), ổn định SXKD (Đ20) |
| QD-05 | Đất nguồn gốc nông, lâm trường | **Thường gặp** → đưa vào phiên bản 1 | Nghiệp vụ B13 (Đ6 k9 QĐ 14/2026) vào v1 |
| QD-06 | Nhập liệu | Trước mắt **nhập tay**; mở rộng nhập từ phần mềm địa chính, bản đồ | Thiết kế lớp nhập dữ liệu có bộ chuyển đổi (adapter) để thêm nguồn sau |
| QD-07 | Quy trình | Theo văn bản người dùng gửi sau | Module quy trình cấu hình được; tạm dùng Sổ tay QĐ 1966/QĐ-UBND (docs/05) làm mặc định |

## 2. Quyết định về công thức, tham số

| Mã | Nội dung | Quyết định |
|---|---|---|
| QD-10 | Bồi thường nhà, công trình (A03) | **Mức BT = min(max(1,2 × Tgt; 60% × G1); 100% × G1)**, trong đó Tgt = G1 − G1/T × T1 (Đ14 k1 b NĐ88, đã khôi phục từ bản PDF) |
| QD-11 | Thời gian khấu hao T và thời gian đã sử dụng T1 | **Người dùng tùy chỉnh** cho từng hạng mục (có ô nhập căn cứ); phần mềm gợi ý T1 từ năm xây dựng nhưng không áp đặt |
| QD-12 | VM-09: nhà xây **đúng** ngày 01/7/2004 hoặc 01/7/2014 | **Người dùng tùy chỉnh**: khi ngày xây trùng mốc, phần mềm hiện 2 mức liền kề để chọn, bắt buộc ghi lý do; mặc định chưa chọn (khoản tính ở trạng thái "Cần xác nhận") |
| QD-13 | VM-15: dẫn chiếu "Điều 15" tại điểm 9.1.b k9 Đ6 QĐ 14/2026 | **Sửa thành Điều 14** Phụ lục II QĐ 106/2025 (hỗ trợ đào tạo, chuyển đổi nghề); ghi chú đính chính trong căn cứ hiển thị |
| QD-14 | VM-04: nhóm địa bàn khác nhau giữa các Điều | **Linh động**: mỗi quy định có **bảng phân nhóm địa bàn riêng**, nạp mặc định đúng văn bản, người có quyền chỉnh được (có lịch sử). Danh mục chuẩn 75 xã, phường lấy từ NQ 152; "Quyết Tâm" (Đ10 k1 PL II) không có trong danh mục → không gán mặc định |
| QD-15 | VM-12: thủy sản – ao đúng 1.000 m², thu hồi đúng 2/3 | **Người dùng tùy chỉnh** khi rơi đúng ngưỡng (chọn khoản áp dụng, ghi lý do) |
| QD-16 | VM-19: ngưỡng đúng 30% đất nông nghiệp | **Người dùng tùy chỉnh** (mặc định theo NĐ 88: 30% thuộc nhóm "từ 30% đến 70%"), ghi lý do nếu chọn khác |
| QD-17 | Tạm cư – hộ từ 5 khẩu (VM-03) | *Chưa trả lời* → áp dụng cùng nguyên tắc linh động: mặc định mức nhóm ≤ 4 khẩu + 500.000 × (số khẩu − 4), cho phép chỉnh — **xin xác nhận mặc định** |

## 3. Nguyên tắc chung cho mọi điểm "linh động"

1. Giá trị mặc định lấy đúng văn bản (hoặc cách hiểu đề xuất đã ghi trong sổ vướng mắc).
2. Khi người dùng thay đổi: bắt buộc nhập lý do; lưu người sửa, thời điểm, giá trị cũ/mới vào nhật ký.
3. Phiếu giải trình của khoản tính ghi rõ "Áp dụng theo lựa chọn của người dùng: …".
4. Báo cáo kiểm tra trước khi chốt phương án liệt kê mọi lựa chọn khác mặc định để người phê duyệt xem xét.

## 4. Kết quả khôi phục văn bản từ bản PDF (đợt 3)

| Nội dung | Kết quả |
|---|---|
| NĐ 88 Đ13 k7 | Tbt = G × S / T1 × T2 |
| NĐ 88 Đ14 k1 b | Tgt = G1 − G1 / T × T1 |
| NĐ 88 Đ17 k4 | P = (P1 + P2 + P3 + P4) / T1 × T2 |
| PL V (bản PDF) | Xác nhận ví dụ gốc ghi 847.000 đ (đúng số học: 847.500 đ). Theo QD-03 (làm tròn ở hộ, nửa lên) phần mềm ra **848.000 đ** — ghi nhận khác biệt với ví dụ minh họa |
| NQ 152 phần thân (bản quét) | Đọc được toàn bộ Đ3–Đ9 → docs/07 mục 3 |
