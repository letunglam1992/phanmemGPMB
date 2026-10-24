# Những thay đổi

Mỗi phiên bản một mục `## X.Y.Z`. Khi phát hành, quy trình đóng gói lấy các mục gần nhất làm ghi chú phát hành
(`tools/ghi-chu-phat-hanh.mjs`) — thiếu mục của phiên bản đang phát hành thì dừng, không phát hành. Phần mềm hiện các mục
mới hơn bản đang dùng khi có bản cập nhật.

## 1.3.1

- Cài đặt → Thẩm quyền phân cấp: **Xuất tệp cấu hình** (`.gpmbtq`) để Sở gửi các xã khi có văn bản thay QĐ 27/2026; xã **Nạp tệp
  cấu hình**, đối chiếu với văn bản gốc rồi bấm Lưu (tệp sai dạng, thiếu vị trí nhiệm vụ bị từ chối).
- Tạo văn bản thuộc nhiệm vụ phân cấp có ngày ký ngoài hiệu lực văn bản phân cấp (vd. từ 01/3/2027 khi vẫn dùng QĐ 27/2026)
  phải **xác nhận** trước khi tạo.
- Máy tỉnh: đơn vị chưa có số liệu phân cấp của kỳ (gói từ bản cũ) — **ghi số liệu theo báo cáo bằng văn bản** của đơn vị (bắt
  buộc căn cứ số, ngày báo cáo); bảng, Excel, Word toàn tỉnh dùng số ghi tay, ghi rõ nguồn.

## 1.3.0

- **Báo cáo phân cấp 06 tháng** (khoản 2 Điều 4 QĐ 27/2026/QĐ-UBND, trước 15/6 và 15/12): Báo cáo tổng hợp → Báo cáo phân cấp;
  số văn bản theo từng nhiệm vụ lấy từ Sổ văn bản đi; chuông nhắc trước 15 ngày.
- Mẫu mới: T29 Quyết định thành lập Hội đồng bồi thường, hỗ trợ, tái định cư; T30 Quyết định thành lập Ban cưỡng chế kiểm đếm bắt
  buộc; T31 Quyết định giá bán nhà ở tái định cư (cảnh báo khi nhà ở khác xã — thẩm quyền Chủ tịch UBND tỉnh).
- Cài đặt → **Thẩm quyền phân cấp**: khi có văn bản thay QĐ 27/2026, đơn vị tự nhập số, hiệu lực, vị trí từng nhiệm vụ.
- Ngày mốc tự lấy từ văn bản đã ghi số: QĐ cưỡng chế (Mẫu 07, 22), QĐ thành lập Ban (T16) vào hồ sơ cưỡng chế; Kế hoạch (T1) cho
  hạn họp phổ biến.
- **Phiếu kiểm tra trước khi ký** (Word): các điểm cần xem, căn cứ, thẩm quyền — in kèm phiếu trình.
- Máy tỉnh: kết quả phân cấp theo xã trong kỳ, lịch cưỡng chế toàn tỉnh; xuất Excel.
- Sổ văn bản đi: ghi tay chọn được nhiệm vụ phân cấp; sổ nhiều nghìn dòng chỉ vẽ 500 dòng đầu (Excel có đủ).
- Thành viên Hội đồng (T29), Ban cưỡng chế (T16, T30) lưu theo dự án: hộ khác, biên bản T27, T28 tự điền thành phần.
- T31 lấy căn nhà ở, diện tích, giá, căn cứ giá từ quỹ tái định cư (giá do đơn vị nhập kèm căn cứ — phần mềm không tính giá).
- Báo cáo phân cấp có cột **kỳ trước** và câu so sánh tăng/giảm.
- Máy tỉnh: **Báo cáo Word tổng hợp phân cấp toàn tỉnh** (Sở Nông nghiệp và Môi trường báo cáo UBND tỉnh); nhắc đơn vị chưa có
  số liệu phân cấp của kỳ (gói gửi trước kỳ hoặc từ bản cũ), nổi vàng khi còn 15 ngày đến hạn 15/6, 15/12.
- Gói gửi tỉnh, bản sao lưu mang **Sổ văn bản đi** (gói chỉ các dòng của dự án gửi); khôi phục gộp dòng chưa có, không xóa số đã cấp.
- Gói lớn không còn đứng giao diện: máy xã tính nền số liệu xem trước (thanh tiến độ, vẫn xuất gói được); máy tỉnh nhận gói tính theo
  từng lát, báo số hộ đã tính.

## 1.2.0

- Quyết định 27/2026/QĐ-UBND (phân cấp, ủy quyền lĩnh vực đất đai) vào Hỏi đáp và căn cứ mặc định; các mẫu thông báo, kế hoạch,
  quyết định thu hồi, phê duyệt phương án, phương án cưỡng chế ghi thẩm quyền theo Phụ lục II; cảnh báo khi ngày ký ngoài thời
  gian hiệu lực (từ 30/6/2026 đến trước 01/3/2027).
- Luật Tố tụng hành chính vào Hỏi đáp; quyết định giải quyết khiếu nại lần hai ghi thời hiệu khởi kiện 01 năm (điểm a khoản 3
  Điều 116).
- Mẫu T26 Quyết định phê duyệt phương án theo Mẫu số 44 Nghị định 151/2025/NĐ-CP; mẫu 14 tách Điều 1 thành phương án đối với dự
  án và phương án chi tiết từng người (khoản 1, 2 Điều 3 Nghị định 88/2024); mẫu 14, R5 thêm trách nhiệm người có đất thu hồi.
- Mẫu T27 biên bản cưỡng chế thu hồi đất, T28 biên bản bàn giao bảo quản tài sản.
- Nút **Căn cứ thời hạn**: đối chiếu 16 bước với Nghị định 151/2025 và Sổ tay nghiệp vụ.
- Nhắc hạn theo Sổ tay: họp phổ biến kế hoạch 03 ngày, ban hành thông báo thu hồi 02 ngày; vận động trước kiểm đếm bắt buộc 15
  ngày, quá 10 ngày mới ban hành quyết định (điểm đ khoản 2 Điều 87 Luật Đất đai); trình 03, ban hành 02 ngày làm việc; giao
  quyết định cưỡng chế; vận động 05 ngày làm việc sau khi giao.
- **Sổ văn bản đi** của đơn vị: tạo văn bản có số thì tự ghi sổ, gợi ý số tiếp theo, báo số đã cấp; ghi tay văn bản soạn ngoài
  phần mềm; mạng nội bộ cấp số tập trung.
- **Xem trước** văn bản Word và biểu Excel phương án ngay trong phần mềm.
- Lịch cưỡng chế (hạn gửi Công an 05 ngày làm việc), thẻ Tiến độ theo tháng; bản đồ và PDF bản đồ viền thửa đã giao đất thực địa
  cho chủ đầu tư.
- Báo cáo Word cấp xã có tiến độ theo tháng (biểu đồ), đơn quá hạn, lịch cưỡng chế; máy tỉnh có biểu đồ đơn khiếu nại theo
  tháng, danh sách đơn quá hạn (không có tên hộ), lịch cưỡng chế trong báo cáo tỉnh.

## 1.1.0

- Khiếu nại: ghi ngày tổ chức đối thoại, ngày gửi thông báo — phần mềm nhắc gửi thông báo trước ngày đối thoại ít nhất 05 ngày
  (khoản 1 Điều 28 Nghị định 124/2020/NĐ-CP sửa bởi Nghị định 155/2026/NĐ-CP); mẫu T24 thông báo tổ chức đối thoại.
- Ghi ngày gửi quyết định tạm đình chỉ, tiếp tục giải quyết, đình chỉ — nhắc khi quá 03 ngày làm việc kể từ ngày ban hành
  (khoản 1, 2 Điều 28b Nghị định 124/2020 bổ sung bởi Nghị định 155/2026).
- Mẫu T25 Quyết định giải quyết khiếu nại lần hai (Mẫu số 16 Nghị định 124/2020), mặc định Chủ tịch UBND tỉnh; thời hạn khởi
  kiện do cán bộ ghi.
- Tổng quan dự án có thẻ **Khiếu nại, cưỡng chế** (đơn quá hạn, tạm đình chỉ, gửi văn bản chậm) và nút Xuất Excel; gói gửi tỉnh
  có số đơn tạm đình chỉ.
- Thẻ **Bàn giao đất trên thực địa** ở Tổng quan dự án: tạo biên bản T23 thì tự ghi mốc, hoặc ghi tay; mốc có trong báo cáo
  tiến độ và gói gửi tỉnh.
- Mẫu cấp hộ tạo cho nhiều hộ một lần: số tăng dần từng hộ, một tệp .zip, số và ngày văn bản ghi vào từng đơn.
- Nguyên văn Nghị định 151/2025/NĐ-CP (phân định thẩm quyền đất đai) và Sổ tay nghiệp vụ (QĐ 1966/QĐ-UBND) vào Hỏi đáp; mẫu
  cưỡng chế ghi thẩm quyền Chủ tịch UBND cấp xã (Điều 5 Nghị định 151/2025); thời hạn các bước dẫn đúng mục Sổ tay.
- Bản phương án chuyển sang quá hạn thẩm định do đổi cách đếm (30 ngày thay cho 30 ngày làm việc): phần mềm hiện giải thích.
- Hỏi đáp mở nhanh hơn (kho tri thức nạp ngầm khi mở phần mềm).
- Rà thể thức 54 mẫu Word theo Nghị định 30/2020/NĐ-CP; 5 mẫu riêng của địa phương đổi phông còn sót sang Times New Roman.
- Thêm video hướng dẫn khiếu nại, cưỡng chế; danh mục kiểm tra trên máy Windows (Giới thiệu → Biểu ghi kết quả thử).

## 1.0.21

- Sửa hạn thụ lý đơn khiếu nại: tính theo **ngày làm việc** — 10 ngày làm việc (khoản 1 Điều 16 Nghị định 124/2020/NĐ-CP);
  đơn nhận từ 01/7/2026: 07 ngày làm việc (Điều 27, khoản 1 Điều 36 Luật Khiếu nại sửa bởi Luật 136/2025/QH15; Điều 10
  Nghị định 155/2026/NĐ-CP). Bản 1.0.20 đếm 10 ngày theo lịch.
- Mẫu văn bản mới, tự điền từ thẻ Khiếu nại của hộ: T14 Quyết định giải quyết khiếu nại lần đầu (Mẫu số 15 Nghị định
  124/2020/NĐ-CP), T15 Biên bản vận động, thuyết phục bàn giao đất (khoản 7 Điều 87 Luật Đất đai 2024), T16 Quyết định thành
  lập Ban cưỡng chế thu hồi đất, T17 Phương án cưỡng chế và dự toán kinh phí cưỡng chế (Điều 89). Nút soạn ngay trong thẻ
  Khiếu nại.
- Hỗ trợ ổn định đời sống: chọn trường hợp hộ không đủ điều kiện bồi thường về đất hoặc nhận giao khoán (mức tương đương —
  khoản 2 Điều 12 Phụ lục II QĐ 106/2025); giải trình ghi diện tích thu hồi theo từng dự án, không cộng dồn (điểm b khoản 1
  Điều 19 Nghị định 88/2024/NĐ-CP).
- Khiếu nại theo Luật 136/2025/QH15 và Nghị định 155/2026/NĐ-CP: ghi tạm đình chỉ (thời gian tạm đình chỉ không tính vào hạn
  giải quyết), đình chỉ, không thụ lý, người khiếu nại vắng đối thoại, thông báo thụ lý, ngày gửi quyết định giải quyết (nhắc khi
  quá 03/07 ngày làm việc). Mẫu mới: T18 thông báo thụ lý, T19 không thụ lý, T20 biên bản đối thoại, T21 quyết định tạm đình
  chỉ/đình chỉ, T22 quyết định tiếp tục giải quyết (Mẫu 03, 04, 14, 14a, 14b Nghị định 155/2026). Cấp số văn bản thì số, ngày tự
  ghi vào đơn, hồ sơ cưỡng chế.
- Mẫu T23 biên bản bàn giao đất trên thực địa (Mẫu 06 Nghị định 102/2024); mẫu 07, 22 lấy ngày dự kiến cưỡng chế.
- **Hạn thẩm định phương án đổi thành 30 ngày** (khoản 3 Điều 3 Nghị định 88/2024: "không quá 30 ngày"); bản trước đếm 30 ngày
  làm việc. Hạn phê duyệt 5 ngày làm việc, gửi quyết định 3 ngày làm việc ghi đúng nguồn là Sổ tay QĐ 1966.
- Kinh phí cưỡng chế ghi căn cứ khoản 3 Điều 27 Nghị định 88/2024; cưỡng chế nhắc gửi văn bản Công an trước 05 ngày làm việc
  (Điều 37 Nghị định 102/2024).
- Hỏi đáp, tra cứu thêm nguyên văn: Nghị định 88/2024 (toàn văn), Nghị định 102/2024, Luật Khiếu nại 2011, Nghị định
  124/2020, Nghị định 155/2026, Luật 136/2025/QH15 (sửa Luật Khiếu nại).

## 1.0.20

- Hồ sơ hộ có thẻ mới "Khiếu nại" (gồm khiếu nại, kiến nghị và cưỡng chế): ghi đơn khiếu nại, kiến nghị; phần mềm tính hạn thụ lý (10 ngày) và hạn
  giải quyết lần đầu, lần hai (Điều 27, 28, 36, 37 Luật Khiếu nại 2011; cán bộ đánh dấu vụ việc phức tạp, vùng sâu vùng
  xa); kiến nghị nhập hạn kèm căn cứ. Theo dõi cưỡng chế kiểm đếm bắt buộc, cưỡng chế thu hồi đất (Điều 88, 89 Luật Đất đai
  2024): nhắc quyết định cưỡng chế chỉ ban hành sau 10 ngày kể từ khi kết thúc vận động, hạn thi hành 10 ngày, không cưỡng
  chế ngày nghỉ và 15 ngày trước, sau Tết Âm lịch, bàn giao đất 30 ngày sau biên bản chấp hành. Cảnh báo ở chuông; số lượng
  gửi lên tỉnh.
- Dự án có thẻ mới "Chi trả, kinh phí": tổng hợp chi trả theo bản phương án đã phê duyệt (tiền mặt, chuyển khoản, gửi ngân
  hàng, còn phải chi), xuất Excel quyết toán; kinh phí tổ chức thực hiện: tỷ lệ trích do đơn vị nhập kèm căn cứ, dự toán,
  giải ngân, cảnh báo vượt mức.
- Dự án tập huấn: dữ liệu và bản đồ giả lập để thực hành, không gửi lên tỉnh, xóa sạch ngay sau buổi tập huấn.
- Hướng dẫn sử dụng bằng Word có ảnh minh họa: tải ở màn Hướng dẫn sử dụng.
- Nhật ký sự cố: Giới thiệu → "Xuất nhật ký lỗi" để gửi tác giả khi cần hỗ trợ (đã che số định danh, điện thoại; phần
  mềm không tự gửi).

## 1.0.19

- Dữ liệu máy đơn và máy chủ mạng nội bộ được mã hóa (AES-256): khóa gắn với máy và tài khoản Windows đang dùng. Lần
  đầu mở bản này, dữ liệu cũ tự chuyển sang dạng mã hóa. Chuyển máy, cài lại Windows thì khôi phục bằng bản sao lưu .gpmb.
- Nhắc cất bản sao lưu ra thiết bị khác (USB, ổ cứng ngoài, ổ mạng nội bộ) theo chu kỳ do đơn vị đặt: lưu vào ổ khác
  thì phần mềm tự ghi nhận, không thì cán bộ xác nhận sau khi chép; Sao lưu, khôi phục hiện lần cất ra ngoài gần nhất.

## 1.0.18

- Gói chính sách có chữ ký của tác giả: khi nạp, phần mềm tự kiểm gói đúng nguồn và không bị sửa sau khi ký (hiện
  "Đã ký: …" ở danh sách gói). Gói chưa ký: cảnh báo, người nạp phải xác nhận đã đối chiếu nguồn gốc và mã SHA-256 mới nạp
  được. Chữ ký sai (tệp đã bị sửa): không nạp. Chữ ký này không thay văn bản ban hành chính sách, đơn giá.
- Công cụ của tác giả có mục "Ký gói chính sách".
- Hộp xem bản phương án nêu nguồn bộ chính sách (có sẵn trong phần mềm, gói đã ký, gói chưa ký).
- Máy chủ mạng nội bộ tự kiểm lại chữ ký gói và đối chiếu nội dung đã ký trước khi lưu; gói ghi "đã ký" mà chữ ký sai bị
  từ chối.
- Thông báo thu hồi đất theo đợt (hoặc cả dự án): hiện ngày sớm nhất được ban hành quyết định thu hồi (90 ngày với đất
  nông nghiệp, 180 ngày khi có đất phi nông nghiệp — khoản 1 Điều 85 Luật Đất đai 2024) và ngày hết hiệu lực của thông báo
  (12 tháng — khoản 5); cảnh báo một dòng khi ngày đủ điều kiện ghi trước ngày sớm nhất (trừ trường hợp người có đất đồng ý
  thu hồi trước hạn — khoản 2) hoặc thông báo đã hết hiệu lực mà còn hộ chưa có quyết định thu hồi. Sửa căn cứ cảnh báo
  90/180 ngày từ "khoản 2" thành "khoản 1 Điều 85".
- Ghi chú phát hành không còn ký tự xuống dòng kiểu Windows.

## 1.0.17

- Hạn chỉnh lý hồ sơ địa chính (không quá 3 ngày làm việc sau khi hoàn thành chi trả — Mục XVIII Sổ tay) tính theo bản
  phương án đã phê duyệt: cảnh báo một dòng cho cả bản; Excel "Tiến độ thủ tục" có hạn, số hộ đã chỉnh lý, ngày xong, chậm.
- Tổng hợp tỉnh: khâu chi trả (30 ngày — điểm a khoản 3 Điều 94 Luật Đất đai 2024) và chỉnh lý hồ sơ địa chính quá hạn được
  đếm cùng các khâu thủ tục khác, có trong hộp chi tiết, báo cáo Word và phụ lục Excel.
- Kiểm tra trước thẩm định (điểm a khoản 3 Điều 87 Luật Đất đai 2024): khi ghi ngày nhận đủ hồ sơ hoặc ghi nhận thẩm định,
  phần mềm nhắc nếu thời gian niêm yết (mẫu 09/10) chưa đủ 30 ngày, còn hộ chưa xong niêm yết, chưa ghi ý kiến hoặc không
  đồng ý mà chưa đối thoại. Chỉ nhắc, không chặn.

## 1.0.16

- Excel "Tiến độ thủ tục" thêm khâu chi trả (không quá 30 ngày kể từ ngày quyết định phê duyệt phương án có hiệu lực —
  điểm a khoản 3 Điều 94 Luật Đất đai 2024): hạn, số hộ đã chi đủ, ngày chi cuối, số ngày chậm; và số hộ đã bàn giao.
- Hạn ban hành quyết định thu hồi đất cho dự án không chia đợt: thẻ ở Tổng quan dự án, ghi "Ngày đủ điều kiện" một lần cho
  cả dự án; dự án có đợt ghi được cả cho dòng "Chưa xếp đợt". Cảnh báo một dòng cho mỗi nhóm thay cho từng hộ.
- Báo cáo Word và phụ lục Excel tổng hợp tỉnh có bảng các khâu thủ tục quá hạn (dự án, bản phương án hoặc đợt, khâu, hạn,
  căn cứ).

## 1.0.15

- Mẫu 14 (Quyết định phê duyệt phương án) tự thêm căn cứ "Văn bản số … về kết quả thẩm định phương án" từ bản phương án
  đã ghi nhận thẩm định, và tự điền số, ngày tờ trình đề nghị phê duyệt (mẫu 13 / R4 đã ghi) khi ô còn trống.
- Phương án – phiên bản có nút "Tiến độ thủ tục (Excel)": mỗi bản một dòng — nhận đủ hồ sơ, thẩm định, tờ trình, phê
  duyệt, gửi quyết định đến từng người; hạn và số ngày làm việc chậm từng khâu.
- Hạn ban hành quyết định thu hồi đất theo đợt (10 ngày kể từ ngày đủ điều kiện — khoản 5, 6 Điều 87 Luật Đất đai 2024):
  ghi "Ngày đủ điều kiện" một lần cho cả đợt ở bảng Tổng hợp theo đợt; cảnh báo một dòng cho cả đợt.
- Tổng hợp tỉnh: số "khâu thủ tục quá hạn" (thẩm định, phê duyệt, gửi quyết định, quyết định thu hồi) — bấm để xem dự án,
  bản hoặc đợt, khâu, hạn.

## 1.0.14

- Tổng hợp tỉnh tính hạn thẩm định, phê duyệt theo lịch ngày nghỉ của đơn vị gửi (đi kèm gói) — khớp với máy xã; gói
  không có lịch thì chỉ trừ thứ Bảy, Chủ nhật.
- Hạn gửi quyết định phê duyệt phương án đến từng người (không quá 3 ngày làm việc kể từ ngày phê duyệt — điểm b khoản 4
  Điều 87 Luật Đất đai 2024) tính theo bản phương án đã phê duyệt có ngày quyết định: bảng phương án hiện hạn, Tổng quan
  và chuông báo một dòng cho cả bản khi còn hộ chưa xác nhận bước 11.
- Bổ sung kiểm thử: nhập Excel kiểm đếm và hộp "Ghi tổ, thôn" theo bộ chính sách của từng hộ.

## 1.0.13

- Hạn phê duyệt phương án không quá 5 ngày làm việc kể từ ngày nhận tờ trình (điểm c khoản 3 Điều 87 Luật Đất đai 2024):
  mốc lấy ngày Tờ trình đề nghị phê duyệt phương án (mẫu 13 nay ghi lại số, ngày; mẫu R4) hoặc ngày nhận tờ trình ghi
  cho cả bản; bảng phương án hiện hạn, Tổng quan và chuông báo sắp hết, quá hạn; báo cáo đếm bản quá hạn phê duyệt.
- Phụ lục Excel tổng hợp tỉnh có trang "Bản phương án": chờ thẩm định (quá hạn), đã thẩm định chờ phê duyệt (quá hạn),
  không thống nhất, đã phê duyệt theo từng dự án.
- Hộp "Ghi tổ, thôn" nhiều hộ và nhập Excel kiểm đếm theo bộ chính sách của từng hộ.
- So sánh bản đồ đã lưu giữ cả số liệu hồ sơ lúc lưu: khi xem lại nêu hồ sơ đã sửa diện tích, mới có hoặc không còn thửa.

## 1.0.12

- Thẩm định phương án: mẫu 13 và mẫu R4 tự điền "Kết quả thẩm định" từ bản phương án đã ghi nhận thẩm định; cơ quan
  thẩm định điền sẵn cho các mẫu.
- Hạn thẩm định không quá 30 ngày làm việc kể từ ngày nhận đủ hồ sơ (khoản 3 Điều 3 Nghị định 88/2024/NĐ-CP): ghi ngày
  nhận đủ hồ sơ một lần cho cả bản phương án; bảng phương án hiện hạn, Tổng quan và chuông báo sắp hết, quá hạn.
- Báo cáo xã (màn Báo cáo, Word) và tổng hợp tỉnh có số bản phương án chờ thẩm định, quá hạn, đã thẩm định, không thống
  nhất, đã phê duyệt.
- Hộ dùng bộ chính sách riêng: các thẻ Thửa đất, Kiểm đếm, Hỗ trợ, Hỗ trợ khác hiện danh mục, đơn giá, giá đất theo bộ
  của hộ.
- Mã kích hoạt: danh sách mã bị chặn đi kèm bản phần mềm — mã cũ của đơn vị đã thay máy hết hiệu lực khi cập nhật; công
  cụ cấp mã tự đánh dấu chặn khi cấp lại, xuất tệp danh sách chặn.
- Bản đồ: lưu kết quả so sánh với bản đồ khác (trích đo bổ sung) vào dự án — xem lại, hiện trên bản đồ, xuất Excel.

## 1.0.11

- Phương án: tách bước **thẩm định** khỏi phê duyệt — ghi nhận số, ngày, cơ quan, ý kiến thẩm định (khoản 3 Điều 3
  Nghị định 88/2024/NĐ-CP; Mục XII Sổ tay). Bản đã thẩm định khóa ý kiến và ô đã ghi (chỉ bổ sung ô trống); thẩm định
  không thống nhất thì cảnh báo khi ghi nhận phê duyệt. Máy chủ mạng nội bộ kiểm cùng quy tắc.
- Chuyển bộ chính sách **theo từng hộ, từng đợt** (hồ sơ đang lập dở khi có văn bản mới), xem chênh lệch từng hộ, từng
  khoản; xuất Excel, Word giải trình. Bản phương án chốt ghi rõ bộ của đợt.
- Ghi chú phát hành lấy từ tệp "Những thay đổi"; hộp cập nhật hiện đủ các bản mới hơn bản đang dùng.
- Công cụ cấp mã kích hoạt: in phiếu cấp mã (Word); cấp lại cho mã cài đặt mới (đơn vị thay máy) giữ số dự án, hạn dùng.

## 1.0.10

- Bản dùng thử (1 dự án, đủ chức năng; dự án mẫu không tính) và mã kích hoạt theo mã cài đặt của máy, số dự án, hạn dùng.
- Máy chủ mạng nội bộ tự kiểm giới hạn dự án; nhắc gia hạn trước khi hết hạn.
- Công cụ cấp mã cho tác giả: danh sách mã đã cấp, xuất CSV, sao lưu.
- Tra cứu đơn giá và mẫu nhập Excel theo bảng của gói chính sách.

## 1.0.9

- PDF bản đồ tiến độ có thể kèm nền ảnh vệ tinh.
- Ô thả xuống (Tệp đã xuất, thông báo, trình đơn) tự đóng khi bấm ra ngoài.
- Chuột phải kết thúc lệnh đang dùng trên bản đồ.

## 1.0.8

- Sửa thanh công cụ bản đồ bị ép cao 4 px.

## 1.0.7

- Lịch sử thay đổi cho ô Hỗ trợ, Tái định cư; người có đất trùng qua nhân khẩu.
- Mốc ranh có cung tròn; in bản đồ theo khung; bắt tâm cung, điểm trên cạnh.
- Gói chính sách kèm bảng đơn giá, bảng giá đất; DGN V8 đọc tên lớp, màu gốc, đường kích thước.
- Tính nền cho các màn lớn; lịch sử phiên bản tệp đính kèm; mẫu T13 biên bản bốc thăm lô TĐC.

## 1.0.6

- Đối thoại khi không đồng ý phương án; thưởng bàn giao sớm; đối chiếu tổng diện tích thu hồi.
- Báo cáo Word tỉnh có diễn biến theo tháng; PDF có chữ thật, lưới tọa độ.
