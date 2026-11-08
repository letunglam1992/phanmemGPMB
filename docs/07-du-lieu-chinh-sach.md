# 07. Dữ liệu chính sách đã trích xuất

Toàn bộ dữ liệu nằm trong `policy/nguon/`, sinh lại được bằng các script trong `tools/extract/`. Mỗi dòng giữ **trang nguồn / STT gốc** để đối chiếu. Dữ liệu ở trạng thái **"Đã trích xuất – chờ đối chiếu"**; chỉ được kích hoạt thành bộ chính sách sau khi người có quyền duyệt.

## 1. Tổng hợp

| Tệp | Nguồn | Phương pháp | Số dòng | Kiểm tra |
|---|---|---|---|---|
| `qd32-2025-don-gia-nha-cong-trinh.json` | QĐ 32/2025 – PDF gốc có lớp chữ (52 trang) | Theo đường kẻ bảng; ghép ô TT gộp nhiều hàng, nối dòng bị ngắt trang | **786** (PL I: 662; PL II: 124) | Số ô giá = số dòng xuất (786 = 786); 11 loại đơn vị |
| `qd106-2025-pl5-di-doi-vat-nuoi.json` | PL V – PDF gốc | find_tables | **20** | Khớp đủ 4 nhóm × 5 loại vật nuôi |
| `qd106-2025-pl8-cay-trong-thuy-san.json` | PL VIII – PDF gốc | find_tables, cây phân cấp | **311** (Biểu 01: 53; 02: 192; 03: 56; 04: 10) | Mọi ô giá đều được xuất; 7 ô "mật độ" ở dòng tiêu đề Biểu 03 được lưu làm mật độ nhóm; **đã khôi phục Biểu 02 mục 1–15** |
| `nq28-2026-phu-luc.json` → `nq28-2026-sua-doi-bang-gia-dat.json` | NQ 28/2026/NQ-HĐND ngày 19/10/2026 (hiệu lực **01/11/2026**) sửa đổi Bảng 05, 06, 07 NQ 152 — phụ biểu Excel đã đối chiếu bản ký (chuẩn hóa ở kho tra-cuu-tthc-dat-dai-son-la, `cong-cu/du-lieu/nq28-2026.json`) | `tools/extract/nq28_2026.mjs`: Phụ lục I–III bổ sung tuyến; Phụ lục IV, V khớp với NQ 152 theo xã + STT, dòng "-" theo tên trong nhóm, dòng số nguyên không có dòng con = cả nhóm; **xét riêng từng bảng**, STT lệch tên → tìm theo tên trong xã (≥ 0,85), không thấy → "không khớp" (không áp) | Bổ sung **132 + 132 + 132** tuyến; đổi tên **484** dòng (366 tuyến, 118 nhóm); bãi bỏ **78** dòng (05: 27; 06: 25; 07: 26) | §5; kiểm thử `apps/desktop/test/bang-gia-nq28.test.ts` |
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
| GD-09 | Chênh cao bình quân so với mặt đường ≥ 1,5 m → **giảm 30%** — **chỉ áp dụng khi thời điểm định giá (ngày phê duyệt phương án) trước 01/11/2026**; từ 01/11/2026 khoản 3 Điều 4 **đã bị bãi bỏ** theo **Điều 2 NQ 28/2026/NQ-HĐND**, phần mềm không giảm và hiển thị lý do; chưa có thời điểm định giá → không tự giảm, "Cần xác nhận" (QD-33) | Đ4 k3; Điều 2, k1 Điều 3 NQ 28/2026 |
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
| GD-26 | Đất TM-DV của hộ gia đình, cá nhân đang sử dụng ổn định lâu dài có nguồn gốc từ đất ở (được công nhận, giao đất ban đầu là đất ở hoặc được phép chuyển mục đích từ đất ở) = **90% đơn giá đất ở** cùng vị trí, cùng tuyến đường tại Bảng 05 — **từ 01/11/2026**; cán bộ xác định thửa thuộc trường hợp này | Đ7 k8 (bổ sung bởi k6 Đ1 NQ 28/2026) |

**Cách áp dụng trong phần mềm:** vị trí, mặt tiếp giáp, chênh cao, loại mặt đường, chiều sâu là **dữ liệu nhập của thửa**; phần mềm đề xuất giá theo GD-01…25, hiển thị từng bước điều chỉnh, người dùng xác nhận. Thứ tự áp dụng các điều chỉnh (GD-09, 10, 11, 12, 19) đã được xác nhận (QD-18): **giá vị trí → phân lớp → tăng mặt tiếp giáp (≤ 20%) → giảm chênh cao/đường đất → hệ số dự án**. Đã lập trình tại `packages/core/src/gia-dat.ts`.

## 5. Sửa đổi Bảng giá đất theo NQ 28/2026/NQ-HĐND (hiệu lực 01/11/2026)

Nghị quyết số 28/2026/NQ-HĐND ngày 19/10/2026 của HĐND tỉnh Sơn La sửa đổi, bổ sung Quy định bảng giá đất ban hành kèm NQ 152/2025/NQ-HĐND:

| Nội dung | Phần mềm | Dữ liệu / mã |
|---|---|---|
| k1–3 Điều 1: bổ sung giá tuyến Bảng 05, 06, 07 (Phụ lục I–III) | Dòng bổ sung, STT để trống như phụ biểu, ghi "Bổ sung" + căn cứ "Phụ lục I/II/III …, dòng n"; xếp sau tuyến cuối của cùng xã | `bo_sung` |
| k4 Điều 1: điều chỉnh tên tuyến / nhóm tuyến (Phụ lục IV) | Đổi tên, giữ STT và giá NQ 152; ghi "Tên cũ … — điều chỉnh theo Phụ lục IV …" | `doi_ten` |
| k5 Điều 1: bãi bỏ tên và giá tuyến (Phụ lục V) | Bỏ khỏi bảng, giữ ở `da_bai_bo` | `bai_bo` |
| k6 Điều 1: bổ sung k8 Điều 7 (GD-26) | Chọn giá đất → Bảng 06 → tích "Đất TM-DV có nguồn gốc từ đất ở": giá = 90% Bảng 05 cùng vị trí, cùng tuyến (`giaTmdvNguonGocDatO`); Kiểm tra phương án nhận cả mức 90% | `NQ28_2026` (`packages/core/src/gia-dat.ts`) |
| Điều 2: bãi bỏ k3 Điều 4 (GD-09) | `apDungGiamChenhCao`, `dieuChinhGiaDatPnn({ ngayDinhGia })` | `giaDat.giamChenhCao.baiBoTu` (tùy chọn) |
| k1 Điều 3: chuyển tiếp | Bảng giá chọn theo **thời điểm định giá** (ngày phê duyệt phương án): trước 01/11/2026 → NQ 152 nguyên bản; phương án đã chốt/duyệt giữ số liệu đã chụp | `napBangGiaDat(ngay)` |

**Cảnh báo khi khớp (sinh lại bằng `node tools/extract/nq28_2026.mjs`, lưu ở `canh_bao`):**
- **Lệch STT (áp theo tên, 11 dòng):** xã Chiềng La — Phụ lục IV ghi STT 3.1 "Từ đất nhà Lò Văn Xôm đến đất nhà ông Quàng Văn Ngấn" nhưng tên này ở **STT 3.3** của NQ 152 (STT 3.1 là tuyến "Từ hết đất nhà ông Đồng Văn Hiệu…") → đổi tên STT 3.3 cả 3 bảng. Các dòng còn lại do Bảng 06, 07 NQ 152 đánh STT khác Bảng 05 (Quỳnh Nhai 4.2 → 5.13; Chiềng Khương 3.6 → 3.8, 3.13 → 3.15; Chiềng An 11.11 → 11.12; Chiềng Mung dòng "-" để trống STT).
- **Không khớp (không áp, 3 dòng):** tuyến không có trong bảng tương ứng của NQ 152 — Chiềng La STT 4.1 (Bảng 06), Phiêng Pằn STT 3.3 (Bảng 06, 07: cùng STT nhưng là tuyến khác). Công cụ của kho tra cứu TTHC trước đây khớp nhầm các dòng này theo STT.
- **Bỏ qua:** xã Đoàn Kết, Phụ lục IV STT 2.9 "Sửa đổi STT (từ mục 2.8 xuống mục 2.9)" — chỉ đổi số thứ tự, phần mềm giữ STT NQ 152 để tra cứu.

