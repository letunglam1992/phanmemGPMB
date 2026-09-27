# 15. Cập nhật bộ chính sách khi có văn bản mới

## 1. Bộ chính sách là gì

Mọi mức, đơn giá, tỷ lệ dùng để tính đều nằm trong **bộ chính sách** (dữ liệu, không nằm trong mã tính):

| Tệp | Nội dung |
|---|---|
| `policy/goi/sonla-2026-03-31.json` | Bộ chính sách hiệu lực từ 31/3/2026: văn bản căn cứ, làm tròn, nhà – công trình (QĐ 32/2025), vật nuôi (PL V QĐ 106/2025), cây trồng (PL VIII), mồ mả, ổn định đời sống, tạm cư, chuyển đổi nghề, giá đất (NQ 152/2025)… mỗi mức có trường căn cứ (văn bản, điều, khoản) |
| `policy/nguon/*.json` | Bảng đơn giá, bảng giá đất trích xuất nguyên văn từ văn bản (có số trang để đối chiếu) |

Mỗi **dự án gắn với một bộ chính sách** (trường `boChinhSach`). Có bộ mới **không làm thay đổi** số của dự án cũ; bản phương án đã chốt/đã duyệt luôn giữ số đã đóng băng.

## 2. Tham số cán bộ tự cập nhật trong phần mềm (không cần bản cài mới)

Giá gạo, hạn mức giao đất NN, hệ số giá đất (theo dự án); lịch ngày nghỉ; tỷ lệ tiền chậm trả; mẫu văn bản (Thay mẫu…); giá đất, đơn giá ngoài danh mục nhập tay kèm căn cứ.

## 3. Khi tỉnh ban hành văn bản mới (đơn giá, giá đất, mức hỗ trợ)

| Bước | Ai | Việc |
|---|---|---|
| 1 | Người dùng | Gửi văn bản (bản Word/PDF gốc, không phải bản quét mờ); nêu dự án nào áp dụng, từ ngày nào |
| 2 | Lập trình | Trích xuất bảng vào `policy/nguon`, lập bộ chính sách mới `policy/goi/<mã>.json` (giữ bộ cũ); ghi các điểm chưa rõ vào sổ vướng mắc (docs/03) để người dùng xác nhận — **không tự suy đoán mức** |
| 3 | Lập trình | Chạy kiểm thử: số liệu trích xuất khớp văn bản (đối chiếu mẫu theo trang), các ca tính vàng không đổi với bộ cũ |
| 4 | Lập trình | Phát hành bộ cài mới (GitHub Actions) |
| 5 | Người dùng | Cài bản mới; dự án mới chọn bộ chính sách mới; dự án đang làm: quyết định có chuyển sang bộ mới hay không theo quy định chuyển tiếp của văn bản |

Hiện việc thêm bộ chính sách **cần bản cài mới** (chưa có chức năng nhập bộ chính sách trong phần mềm) — tránh để dữ liệu mức, giá bị sửa tùy tiện ngoài quy trình kiểm tra.

## 4. Văn bản đang chờ (theo sổ vướng mắc)

- **VM-29:** QĐ sửa đổi QĐ 106/2025 — khi có số, ngày hiệu lực chính thức.
- **VM-18:** văn bản thay QĐ 27/2026 (phân cấp, ủy quyền) — hết hiệu lực 01/3/2027.
- **VM-21:** bản hợp nhất Luật Đất đai, NĐ 88/2024 (có sửa đổi của NĐ 226/2025).
