# 06. Quyết định nghiệp vụ đã xác nhận

Ghi nhận theo trả lời của người dùng ngày 27/9/2026 (đợt 1 và đợt 2). Đây là căn cứ để lập trình; mọi thay đổi sau này ghi thêm dòng mới, không sửa dòng cũ.

## 1. Quyết định chung

| Mã | Nội dung | Quyết định | Hệ quả thiết kế |
|---|---|---|---|
| QD-01 | Người dùng, môi trường | UBND cấp xã; dùng nội bộ cơ quan; Windows 10/11 | Bản cài một máy; kiến trúc sẵn sàng mạng nội bộ (máy chủ nội bộ + PostgreSQL) khi cơ quan cần nhiều người dùng đồng thời |
| QD-02 | Giá đất bồi thường | **Giá trong Bảng giá đất (NQ 152/2025) × hệ số điều chỉnh (nếu có)** | Giá đất = tra bảng giá theo xã, loại đất, tuyến, vị trí + các điều chỉnh của NQ 152 (Đ4, Đ6) × hệ số của dự án (nhập, mặc định 1, bắt buộc ghi số văn bản khi ≠ 1) |
| QD-03 | Làm tròn | Diện tích: **2 chữ số thập phân**; tiền: **làm tròn lên đến nghìn đồng**, làm tròn **ở từng hộ** | Dòng tính giữ đủ độ chính xác (số thập phân, không float); chỉ **tổng từng hộ/đối tượng** được làm tròn **lên** bội số 1.000 đ (vd. 847.001 → 848.000) — xác nhận đợt 4 |
| QD-04 | Phạm vi đối tượng | **Hộ gia đình, cá nhân và tổ chức** | Bổ sung tổ chức: bồi thường đất có thời hạn (Đ13 k7 NĐ88), chi phí đầu tư vào đất còn lại (Đ17), ổn định SXKD (Đ20) |
| QD-05 | Đất nguồn gốc nông, lâm trường | **Thường gặp** → đưa vào phiên bản 1 | Nghiệp vụ B13 (Đ6 k9 QĐ 14/2026) vào v1 |
| QD-06 | Nhập liệu | Trước mắt **nhập tay**; mở rộng nhập từ phần mềm địa chính, bản đồ | Thiết kế lớp nhập dữ liệu có bộ chuyển đổi (adapter) để thêm nguồn sau |
| QD-07 | Quy trình | **Sổ tay ban hành kèm QĐ 1966/QĐ-UBND ngày 05/8/2025** (xác nhận đợt 4) | Module quy trình theo docs/05; 22 mẫu biểu lấy từ bản Word `templates/nguon/qd1966-2025-so-tay-bthttdc.docx` |

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
| QD-17 | Tạm cư – hộ từ 5 khẩu (VM-03) | **Mặc định**: mức hộ ≤ 4 khẩu + 500.000 × (số khẩu − 4); **người dùng được chỉnh** mức/tháng, có lý do (xác nhận đợt 4) |
| QD-18 | Thứ tự điều chỉnh giá đất (VM-31) | **Xác nhận**: giá vị trí → phân lớp chiều sâu → tăng mặt tiếp giáp (≤ 20%) → giảm chênh cao / đường đất → hệ số dự án |
| QD-20 | VM-34: cây trồng nhiều loài trên cùng diện tích | **Nhất trí theo biểu mẫu** (xác nhận 27/9/2026): quỹ = DT × 1,5 − DT công trình (trừ DT công trình là tùy chọn, bắt buộc lý do); xếp theo thứ tự chủ sở hữu chọn; khi đã vượt quỹ, các dòng sau hưởng 30% |
| QD-21 | Tính tiền đất theo phân lớp (k6 Đ4 NQ 152) | **Người dùng tự thêm lớp**, chọn vị trí trong bảng giá, nhập diện tích từng lớp; phần mềm **chỉ** điền giá tương ứng vị trí và tỷ lệ giảm dần theo lớp (đất ở: lớp sau 60% lớp trước; đất PNN: 50%). Không tự chia lớp theo chiều sâu, không tự áp sàn giá; giá lớp sửa tay phải có lý do |
| QD-22 | Tài khoản, 4 vai trò (docs/04 §1 "Quản trị") — **người dùng đã nhất trí** | **Quản trị**: toàn quyền, quản lý tài khoản, khôi phục dữ liệu. **Lãnh đạo, kiểm tra**: như cán bộ + xác nhận hoàn thành bước, chốt / ghi nhận phê duyệt / hủy phương án, thay mẫu văn bản, xóa dự án, xem nhật ký hệ thống. **Cán bộ nghiệp vụ**: nhập, sửa hồ sơ, kiểm đếm, bản đồ, nhập Excel, soạn văn bản, gửi duyệt, sao lưu. **Chỉ xem**: xem, tra cứu, xuất Excel / dự thảo văn bản, không ghi dữ liệu. Người gửi duyệt một bước không tự xác nhận bước đó. Không xóa tài khoản (chỉ khóa) để giữ truy vết; luôn còn ≥ 1 quản trị hoạt động |
| QD-19 | Các điểm còn mở VM-07, 10, 13, 14, 16, 17, 24, 28, 33 | **Nhất trí xử lý linh động** theo §3: mặc định theo văn bản/cách hiểu đề xuất trong sổ vướng mắc, người dùng được chỉnh kèm lý do |

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
| NQ 152 bản Word (đợt 4) | Trích xuất lại toàn bộ Bảng 01–08 từ bản Word, thay bản Markdown |
