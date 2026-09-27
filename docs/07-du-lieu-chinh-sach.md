# 07. Dữ liệu chính sách đã trích xuất

Toàn bộ dữ liệu nằm trong `policy/nguon/`, sinh lại được bằng các script trong `tools/extract/`. Mỗi dòng giữ **trang nguồn / STT gốc** để đối chiếu. Dữ liệu ở trạng thái **"Đã trích xuất – chờ đối chiếu"**; chỉ được kích hoạt thành bộ chính sách sau khi người có quyền duyệt.

## 1. Tổng hợp

| Tệp | Nguồn | Phương pháp | Số dòng | Kiểm tra |
|---|---|---|---|---|
| `qd32-2025-don-gia-nha-cong-trinh.json` | QĐ 32/2025 – PDF gốc có lớp chữ (52 trang) | Theo đường kẻ bảng; ghép ô TT gộp nhiều hàng, nối dòng bị ngắt trang | **786** (PL I: 662; PL II: 124) | Số ô giá = số dòng xuất (786 = 786); 11 loại đơn vị |
| `qd106-2025-pl5-di-doi-vat-nuoi.json` | PL V – PDF gốc | find_tables | **20** | Khớp đủ 4 nhóm × 5 loại vật nuôi |
| `qd106-2025-pl8-cay-trong-thuy-san.json` | PL VIII – PDF gốc | find_tables, cây phân cấp | **311** (Biểu 01: 53; 02: 192; 03: 56; 04: 10) | Mọi ô giá đều được xuất; 7 ô "mật độ" ở dòng tiêu đề Biểu 03 được lưu làm mật độ nhóm; **đã khôi phục Biểu 02 mục 1–15** |
| `nq152-2025-bang-gia-dat.json` | NQ 152/2025 – Bảng 01–08 (**bản Word**, đợt 4) | Đọc trực tiếp bảng Word, giữ đúng vị trí ô trống | Đất NN: **376**; đất ở: **1.795**; TMDV: **1.793**; SXKD: **1.797**; KCN/CCN: **3** | 75/75 xã, phường; 26 dòng **đúng văn bản** nhưng bất thường (giá vị trí sau cao hơn, bỏ trống vị trí) → `policy/nguon/nq152-can-doi-chieu.md` |

### Lưu ý chất lượng

- **Bảng 05–07 NQ 152**: đã thay nguồn Markdown bằng bản Word (đầy đủ hơn 11–32 dòng mỗi bảng, đúng vị trí ô trống). Script: `tools/extract/nq152_docx.py`.
- Nhóm "Cây Mơ, Đào, Mai anh đào (800 cây/ha), táo (625 cây/ha)" có 2 mật độ → để trống mật độ, người dùng chọn theo loài khi kiểm đếm.
- Tên xã: văn bản gốc có "TàHộc" (thiếu dấu cách) → chuẩn hóa "Xã Tà Hộc".

## 2. Mô hình dữ liệu đơn giá (sẽ dùng trong bộ chính sách)

```
DonGia {
  ma_nguon: "QĐ32/PL-I/1.1/1"      // văn bản / phụ lục / STT / thứ tự trong ô
  van_ban, phu_luc, bieu, stt_goc, trang
  nhom, ten, don_vi, don_gia (đồng, số nguyên)
  mat_do_toi_da (cây/ha, nếu có)
  hieu_luc_tu, hieu_luc_den
}
GiaDat {
  bang: "05", loai_dat, xa, stt, tuyen, vi_tri (1..5), gia (nghìn đồng/m²)
}
```

## 3. Quy tắc giá đất NQ 152 (đọc từ bản quét phần thân, đã xác nhận nguyên văn)

| Mã | Quy tắc | Căn cứ |
|---|---|---|
| GD-01 | Khu vực = từng xã, phường | Đ3 k2 |
| GD-02 | Vị trí 1: thửa tiếp giáp trục đường có tên trong bảng giá | Đ4 k1 a |
| GD-03 | Vị trí 2: tiếp giáp ngõ ra trực tiếp trục chính, ngõ rộng ≥ 6,5 m | Đ4 k1 a |
| GD-04 | Vị trí 3: ngõ rộng 5,5 m đến < 6,5 m; hoặc ngách rộng ≥ 6,5 m | Đ4 k1 a |
| GD-05 | Vị trí 4: ngõ rộng 2,5 m đến < 5,5 m; hoặc ngách 5,5 m đến < 6,5 m; hoặc hẻm ≥ 6,5 m | Đ4 k1 a |
| GD-06 | Vị trí 5: các thửa còn lại | Đ4 k1 a |
| GD-07 | Chiều rộng = lòng đường + vỉa hè + rãnh (không có thì đến mép); không đều → mặt cắt nhỏ nhất từ đầu ngõ đến thửa | Đ4 k1 b, c |
| GD-08 | Nhiều cách xác định vị trí → lấy vị trí có giá cao nhất | Đ4 k2 |
| GD-09 | Chênh cao bình quân so với mặt đường ≥ 1,5 m → **giảm 30%** | Đ4 k3 |
| GD-10 | Vị trí 2–5 có mặt đường là đường đất → **70%** giá cùng vị trí | Đ4 k4 |
| GD-11 | 2 mặt tiếp giáp: đường +15%; ngõ +8%; ngách +4%; hẻm +2%; mặt thêm: đường 8%, ngõ 4%, ngách 2%, hẻm 1% (cộng dồn); **tối đa +20%** | Đ4 k5 |
| GD-12 | Phân lớp chiều sâu – đất ở (trừ lô đấu giá, đấu thầu): lớp 1 ≤ 20 m: 100%; 20–40 m: 60% lớp 1; 40–60 m: 60% lớp 2; 60–80 m: 60% lớp 3; còn lại: 60% lớp 4 | Đ4 k6 a |
| GD-13 | Phân lớp – đất PNN (trừ KCN, CCN): ≤ 40 m: 100%; 40–80 m: 50%; 80–120 m: 50% lớp 2; còn lại: 50% lớp 3 | Đ4 k6 b |
| GD-14 | Nhiều mặt tiếp giáp → chia lớp theo mặt có giá cao nhất; giá bình quân sau phân lớp **không thấp hơn** giá vị trí thấp nhất của tuyến | Đ4 k6 c, d |
| GD-15 | Thửa giáp ranh xã → vị trí có giá cao nhất; vị trí 2–5 lưu thông ra trục chính xã khác → dùng giá trục chính của xã đó | Đ4 k6 đ |
| GD-16 | Khu đô thị, khu dân cư, khu TĐC có quy hoạch 1/500 → toàn khu là vị trí 1 | Đ4 k7 |
| GD-17 | KCN, CCN: một vị trí | Đ4 k8 |
| GD-18 | Đất nông nghiệp: một vị trí theo xã | Đ5 |
| GD-19 | Đất NN trong cùng thửa có đất ở, hoặc xen kẹt với đất ở → **+50%** | Đ6 k1 |
| GD-20 | Rừng phòng hộ, đặc dụng = giá rừng sản xuất (Bảng 04) | Đ6 k2 |
| GD-21 | Đất chăn nuôi tập trung, NN khác = giá đất NN lân cận; tiếp giáp nhiều loại → loại cao nhất | Đ6 k3 |
| GD-22 | Đất công cộng có kinh doanh, PNN khác, khoáng sản = giá đất SXKD lân cận cùng vị trí | Đ7 k5 |
| GD-23 | Trụ sở, sự nghiệp, công cộng không kinh doanh, tôn giáo, tín ngưỡng, nghĩa trang… = giá TMDV lân cận cùng vị trí | Đ7 k6 |
| GD-24 | Đất chưa sử dụng = 20% giá đất NN liền kề cao nhất | Đ8 |
| GD-25 | Giá đất có thời hạn tương ứng 70 năm (trừ đất NN giao theo hạn mức) | Đ9 k1 |

**Cách áp dụng trong phần mềm:** vị trí, mặt tiếp giáp, chênh cao, loại mặt đường, chiều sâu là **dữ liệu nhập của thửa**; phần mềm đề xuất giá theo GD-01…25, hiển thị từng bước điều chỉnh, người dùng xác nhận. Thứ tự áp dụng các điều chỉnh (GD-09, 10, 11, 12, 19) đã được xác nhận (QD-18): **giá vị trí → phân lớp → tăng mặt tiếp giáp (≤ 20%) → giảm chênh cao/đường đất → hệ số dự án**. Đã lập trình tại `packages/core/src/gia-dat.ts`.
