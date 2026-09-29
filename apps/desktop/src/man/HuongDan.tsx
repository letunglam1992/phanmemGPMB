import { useMemo, useState, type ReactNode } from "react";
import { useUngDung, type Man } from "../ung-dung";
import { khongDau } from "../tim-kiem";
import { BieuTuong } from "../thanh-phan/BieuDo";

/**
 * Hướng dẫn sử dụng trong phần mềm (tóm tắt docs/13, docs/14): mục lục, tìm kiếm, mỗi bước có nút mở đúng màn hình.
 * Nội dung chỉ mô tả chức năng đã có; giới hạn ghi rõ.
 */

interface Buoc { tieuDe: string; noiDung: ReactNode; mo?: { nhan: string; man?: Man; hanhDong?: "caiDat" | "saoLuu" } }
interface Muc { ma: string; ten: string; bt: string; moTa: string; buoc: Buoc[] }

const K = ({ children }: { children: ReactNode }) => <kbd className="hd-phim">{children}</kbd>;

const MUC: Muc[] = [
  {
    ma: "bat-dau", ten: "Bắt đầu nhanh", bt: "nha", moTa: "Các việc cần làm lần đầu sử dụng phần mềm.",
    buoc: [
      { tieuDe: "Thiết lập đơn vị", noiDung: <>Khai báo đơn vị sử dụng phần mềm và các cơ quan thường dùng (UBND xã, đơn vị bồi thường, phòng chuyên môn): tên, cơ quan cấp trên, ký hiệu, người ký. Thông tin được điền sẵn vào văn bản, báo cáo.</>, mo: { nhan: "Mở Thiết lập đơn vị", man: { ten: "don-vi" } } },
      { tieuDe: "Nhập lịch ngày nghỉ năm hiện tại", noiDung: <>Cài đặt chung → Lịch ngày nghỉ: ngày lễ, Tết, nghỉ bù, làm bù theo thông báo chính thức. Thời hạn tính theo ngày làm việc dựa vào lịch này (VM-25).</>, mo: { nhan: "Mở Cài đặt chung", hanhDong: "caiDat" } },
      { tieuDe: "Tạo dự án", noiDung: <>Menu <b>Dự án</b> → <b>Dự án mới</b>: tên, xã. Lưu xong phần mềm mở ngay không gian <b>Hồ sơ</b> của dự án ở thẻ Thông tin dự án để nhập tiếp: căn cứ thu hồi, ngày thông báo, giá gạo (kèm nguồn), hạn mức giao đất nông nghiệp, hệ số giá đất và thông tin dùng chung cho văn bản.</>, mo: { nhan: "Mở Dự án & hồ sơ", man: { ten: "du-an" } } },
      { tieuDe: "Sao lưu định kỳ", noiDung: <>Nút <b>Sao lưu, khôi phục</b> trên thanh tiêu đề; nên bật tự động sao lưu ra ổ mạng nội bộ. Tệp sao lưu có thông tin cá nhân, được mã hóa (mật khẩu sao lưu hoặc mật khẩu khôi phục) — vẫn cất giữ theo quy chế bảo mật.</>, mo: { nhan: "Mở Sao lưu", hanhDong: "saoLuu" } },
    ],
  },
  {
    ma: "quy-trinh", ten: "Quy trình công việc", bt: "phuongAn", moTa: "Từ lập dự án đến chi trả, theo 16 bước Sổ tay QĐ 1966.",
    buoc: [
      { tieuDe: "1. Lập kế hoạch", noiDung: <>Hồ sơ → Tổng quan dự án → Mốc tiến độ → <b>Lập kế hoạch</b>: ngày dự kiến hoàn thành từng bước để phần mềm cảnh báo chậm.</>, mo: { nhan: "Mở Dự án", man: { ten: "du-an" } } },
      { tieuDe: "2. Tạo hồ sơ hộ, cá nhân, tổ chức", noiDung: <>Hồ sơ → <b>Thêm hộ, tổ chức</b>; hoặc <b>Thêm → Nhập hồ sơ từ Excel</b> (tệp mẫu của phần mềm, hoặc tệp Excel sẵn có: phần mềm tự nhận diện cột, anh/chị xem, chỉnh <b>Ánh xạ cột</b> và xem trước rồi nhập; tệp không có mã hộ thì thửa cùng chủ gộp một hồ sơ); tệp tải về lưu ở thư mục Downloads; hoặc Hồ sơ → Bản đồ → nạp DGN (V7, V8/V8i) → Cấu hình lớp → xem <b>Kiểm tra bản đồ</b> → xác định thửa thu hồi → <b>Tạo hồ sơ từ thửa thu hồi</b>.</> , mo: { nhan: "Mở Dự án", man: { ten: "du-an" } } },
      { tieuDe: "3. Nhập hồ sơ", noiDung: <>Hồ sơ → Thông tin, Nhân khẩu, Thửa đất (chọn giá đất NQ 152; phân lớp nếu cần), Kiểm đếm tài sản (đơn giá QĐ 32 / PL VIII), Hỗ trợ. Bấm <b>Lưu và tiếp</b> để lưu rồi sang thẻ kế tiếp (hoặc <b>Lưu hồ sơ</b> để ở lại); <b>Hoàn tác</b> để bỏ thay đổi chưa lưu. Thẻ Hỗ trợ có <b>Hỗ trợ tái định cư</b>: hình thức bố trí, tự lo chỗ ở (Đ10 PL II QĐ 106), suất tối thiểu (Đ16 PL II), 20% tiền SDĐ (k11 Đ6 QĐ 14/2026) và khoản khác nhập kèm căn cứ. Ô chọn danh sách dài (xã, phường, loại đất…): gõ vài chữ, không cần dấu, để tìm. Thẻ Thửa đất có ô <b>Tình trạng pháp lý</b> (Có GCN, có giấy tờ, không giấy tờ…) để lọc, thống kê — điều kiện bồi thường do cán bộ xác định (Điều 95 Luật Đất đai 2024).</> },
      { tieuDe: "4. Kiểm tra tính toán", noiDung: <>Hồ sơ → <b>Tính toán, giải trình</b>: khối lượng, đơn giá, hệ số, công thức, căn cứ từng khoản. Khoản "Thiếu căn cứ" / "Cần xác nhận" không được cộng vào tổng và chặn chốt phương án.</> },
      { tieuDe: "5. Theo dõi tiến độ 16 bước", noiDung: <>Trình tự trong Hồ sơ của dự án: <b>Thông tin dự án</b> → <b>Bước chung (1–4)</b> (kế hoạch, họp dân, thông báo thu hồi, điều tra – kiểm đếm: cập nhật một lần cho cả dự án) → <b>Hộ, cá nhân, tổ chức</b>. Từ <b>bước 5</b> mỗi hộ một tiến độ riêng (tab Tiến độ của hồ sơ hộ, hoặc cập nhật nhiều hộ cùng lúc); mỗi bước ghi <b>Khó khăn, vướng mắc</b> — hộ có vướng mắc được tô đỏ, đưa vào cảnh báo và báo cáo; giải quyết xong bấm <b>Đã giải quyết</b> (ghi nhật ký). Cán bộ <b>Gửi duyệt</b>, lãnh đạo <b>Xác nhận hoàn thành</b>.</> },
      { tieuDe: "6. Soạn văn bản", noiDung: <>Mở hồ sơ hộ → thẻ <b>Văn bản</b> (ngay sau Tính toán, giải trình): 22 mẫu Sổ tay QĐ 1966 và 5 mẫu riêng của xã, kể cả mẫu cấp dự án, theo đợt; hộ đang mở được chọn sẵn, tự điền thông tin hộ, thửa, tài sản, số tiền theo kết quả tính; điền số, ngày → tải .docx. Hồ sơ đang sửa chưa lưu thì phải lưu trước khi tạo văn bản. Văn bản cấp dự án, theo đợt (tờ trình, niêm yết, quyết định phê duyệt…) còn mở được ở Hồ sơ dự án → nút <b>Văn bản dự án, đợt</b>. Văn bản là <b>dự thảo</b>, kiểm tra trước khi trình ký. Nút "Điền từ Thiết lập đơn vị" điền tên cơ quan, người ký.</> },
      { tieuDe: "7. Chốt, phê duyệt phương án", noiDung: <>Trước khi chốt, bấm <b>Soát phương án</b> (Tổng quan dự án → Phương án – phiên bản): phần mềm liệt kê lỗi số liệu (DT thu hồi vượt DT thửa, thửa trùng giữa hộ, mã trùng), khoản thiếu căn cứ và các mục cần xem xét (thu hồi hết đất ở chưa ghi TĐC, đất NN chưa khai để xét ổn định đời sống, tạm cư chưa có nhân khẩu…) kèm căn cứ — chỉ để nhắc, không thay việc thẩm định. Hồ sơ → Tổng quan dự án → Phương án – phiên bản → <b>Chốt phương án…</b> (lãnh đạo) → <b>Phê duyệt…</b> nhập số, ngày QĐ đã ký. Bản đã duyệt không sửa được; thay đổi sau đó lập bản điều chỉnh (ghi lý do).</> },
      { tieuDe: "8. Chi trả", noiDung: <>Hồ sơ → <b>Chi trả</b>: ghi từng đợt kèm chứng từ; theo dõi hạn 30 ngày (khoản 3 Điều 94 Luật Đất đai), tiền chậm trả tạm tính; xuất Excel theo dõi chi trả.</> },
      { tieuDe: "8a. Bàn giao mặt bằng", noiDung: <>Hồ sơ → tab <b>Tiến độ</b> → thẻ <b>Bàn giao mặt bằng</b>: ngày, số biên bản, DT bàn giao (trống = toàn bộ DT thu hồi). Hộ đã chi trả mà chưa ghi bàn giao hiện "Đã chi trả, chờ bàn giao"; ghi bàn giao xong là <b>hoàn thành GPMB</b>. Thưởng bàn giao trước hạn: khai báo mốc (hạn, tỷ lệ, mức tối đa, cơ sở tính, căn cứ) ở Thông tin dự án — phần mềm chỉ tính theo mốc đã khai. Bước 14 "Cưỡng chế (nếu có)" không phát sinh: chọn bước → <b>Không áp dụng</b> (ghi lý do; cần quyền xác nhận bước).</> },
      { tieuDe: "8b. Lịch sử thay đổi, khôi phục hồ sơ", noiDung: <>Hồ sơ → tab <b>Nhật ký</b> → <b>Lịch sử thay đổi</b>: mỗi lần lưu, bản cũ được giữ; bảng nêu từng trường "từ … thành …", người, thời điểm. <b>Quản trị</b> bấm <b>Khôi phục bản này</b> (ghi lý do) để đưa hồ sơ về bản cũ — bản hiện tại vẫn được giữ. Hồ sơ đã xóa hẳn: Thùng rác → <b>Hồ sơ đã xóa hẳn (còn trong lịch sử)</b>. Số năm giữ lịch sử: Cài đặt chung → <b>Lịch sử bản ghi</b> (Quản trị đặt; 0 = không thời hạn).</> },
      { tieuDe: "8c. Tệp đính kèm, lịch sử từng ô", noiDung: <>Hồ sơ → tab <b>Đính kèm</b>: chọn bước (hoặc chung), ghi chú, <b>Chọn tệp đính kèm…</b> (PDF, ảnh, Word, Excel; ≤ 20 MB mỗi tệp) — biên bản đã ký, QĐ bản quét, GCN; tệp có trong bản sao lưu. Chuột phải trên một ô (họ tên, diện tích, đơn giá…) → <b>Lịch sử thay đổi của ô này</b>: ai sửa, lúc nào, từ … thành ….</> },
      { tieuDe: "8d. Dự báo tiến độ, đối chiếu diện tích", noiDung: <>Tổng quan dự án → <b>Dự báo tiến độ</b>: ngày dự kiến chi trả xong từng hộ và cả dự án theo thời hạn luật định; bước không có thời hạn luật định cần nhập <b>thời gian dự kiến</b> ở Lập kế hoạch. Thẻ <b>Đối chiếu diện tích</b>: bản đồ ↔ hồ sơ ↔ phương án ↔ GCN; ngưỡng lệch do đơn vị đặt ở Cài đặt chung → Ngưỡng lệch diện tích.</> },
      { tieuDe: "8e. Đợt thu hồi", noiDung: <>Dự án thu hồi nhiều đợt: Thông tin dự án → <b>Đợt thu hồi</b> → Thêm đợt (căn cứ, ngày thông báo, phạm vi; để trống thì theo dự án) → Lưu. Danh sách hộ → <b>Xếp đợt…</b>. Mã hồ sơ vẫn đánh số chung cả dự án. <b>Phương án chốt, phê duyệt theo từng đợt</b> (hộp Chốt phương án chọn đợt). Bước chung 1–4 cập nhật cho cả dự án hoặc riêng một đợt; soạn văn bản chọn đợt để dùng căn cứ, số văn bản của đợt. Tổng quan dự án có bảng tổng hợp theo đợt.</> },
      { tieuDe: "8f. Quỹ tái định cư, bốc thăm", noiDung: <>Dự án → thẻ <b>Tái định cư</b>: thêm lô (khu, số lô, diện tích, <b>giá kèm căn cứ</b> — đơn vị nhập); <b>Giao…</b> lô cho hộ (ghi căn cứ) — thông tin lô tự vào thẻ Hỗ trợ tái định cư của hồ sơ. Giao bằng bốc thăm: tích <b>Giao lô bằng hình thức bốc thăm</b> → <b>Ghi nhận kết quả bốc thăm…</b> theo biên bản (phần mềm không bốc thăm thay). Thu hồi giao phải ghi lý do. Phần mềm báo lỗi khi hai hộ cùng một lô.</> },
      { tieuDe: "8g. Phân công, Việc của tôi, người có đất nhiều hồ sơ", noiDung: <>Hồ sơ → Thông tin → <b>Cán bộ phụ trách</b>, hoặc danh sách hộ → <b>Phân công…</b>. Thanh bên <b>Việc của tôi</b>: hồ sơ được giao, bước hiện tại, cảnh báo thời hạn, vướng mắc. Công cụ → <b>Người có đất nhiều hồ sơ</b>: khớp theo số định danh ở mọi dự án, nhắc kiểm tra khoản hỗ trợ cùng loại (phần mềm không kết luận hỗ trợ trùng).</>, mo: { nhan: "Mở Việc của tôi", man: { ten: "viec-cua-toi" } } },
      { tieuDe: "8h. Sửa chữa phần nhà còn lại, hỗ trợ khác (Điều 5, 6 QĐ 14/2026)", noiDung: <>Kiểm đếm → <b>+ Sửa chữa phần còn lại (Đ5 QĐ14)</b>: nhập chi phí theo dự toán được duyệt, số/ngày dự toán, văn bản xác nhận phần còn lại bảo đảm tiêu chuẩn kỹ thuật. Hồ sơ → thẻ <b>Hỗ trợ khác</b>: đối tượng chính sách (cán bộ chọn mức; nhiều đối tượng lấy mức cao nhất), hộ nghèo, ổn định đời sống khi xây lại nhà, công trình ngoài cọc (k4), khoản do UBND xã quyết định (k13, k14). Hộ vừa có đối tượng chính sách vừa là hộ nghèo: chọn cộng hay chỉ lấy khoản cao hơn, ghi lý do. Ngày tháng nhập theo ngày/tháng/năm (vd. 09/01/2026).</> },
      { tieuDe: "8i. Hỗ trợ nhà theo mốc, cây trồng, chênh lệch giá đất (khoản 3, 7, 8, 10 Điều 6 QĐ 14/2026)", noiDung: <>Kiểm đếm → nhà, công trình → cách tính <b>Hỗ trợ theo mốc xây dựng (k3)</b>: chọn điểm 3.1/3.2/3.3, nhập ngày xây dựng; nếu trùng đúng ngày mốc (vd. 01/7/2014) thì chọn mức và ghi lý do. Tiêu đề mỗi thửa ở Kiểm đếm: chọn cây trồng hỗ trợ 100% (k7a) hoặc 80% (k7b). Thửa đất → nút ⋯ → <b>Hỗ trợ chênh lệch giá đất</b> (k8 đất rừng dùng sản xuất nông nghiệp; k10 đất sai mục đích GCN): chọn loại đất và giá hiện trạng từ bảng giá. Ổn định sản xuất (k5) ở thẻ Hỗ trợ khác.</> },
      { tieuDe: "8j. Phụ lục II QĐ 106/2025 (Điều 3, 7, 11, 12, 13, 15)", noiDung: <>Thửa đất → nút <b>⋯</b>: <b>Chi phí đầu tư vào đất còn lại</b> (theo dự toán được duyệt, hoặc 01 lần giá đất × DT thu hồi; tổ chức nhập thời hạn còn lại) và <b>Đất trong hành lang bảo vệ an toàn</b> (đường dây điện 80/50/30% theo nhóm đất; công trình khác 50%). Hỗ trợ chênh lệch giá đất (k8, k10): dự án có hệ số điều chỉnh thì chọn nhân / không nhân hệ số và ghi lý do. Kiểm đếm → cách tính <b>Trong hành lang lưới điện</b> (70%). Hỗ trợ khác: <b>Ổn định sản xuất</b> theo định mức, <b>Người đang sử dụng nhà ở thuộc sở hữu nhà nước</b>, <b>Ổn định sản xuất kinh doanh</b>, <b>Trợ cấp ngừng việc</b>. Hỗ trợ → ổn định đời sống: số nhân khẩu có chung quyền sử dụng đất. Thông tin dự án → thưởng bàn giao: nút <b>Điền theo Điều 15 PL II QĐ 106</b>.</> },
      { tieuDe: "8k. Đất không có giấy tờ, vi phạm, giao không đúng thẩm quyền (Điều 8–12 NĐ 88/2024)", noiDung: <>Thông tin dự án: nhập <b>hạn mức công nhận đất ở</b>, <b>hạn mức giao đất ở</b> kèm căn cứ. Thửa đất → nút <b>⋯</b> → <b>Bồi thường về đất khi không có giấy tờ…</b>: chọn Điều 8 (không giấy tờ), 9 (vi phạm trước 01/7/2014), 10 (giao không đúng thẩm quyền) hoặc 12 (đất nông nghiệp); nhập thời điểm sử dụng ổn định, DT đã xây nhà ở, DT sản xuất kinh doanh; chọn giá đất SXKD và giá đất phần còn lại từ bảng giá. Phần mềm tự xác định khoản theo mốc 18/12/1980, 15/10/1993, 01/7/2004, 01/7/2014 và hiện dòng tóm tắt phân bổ; điều kiện được bồi thường do cán bộ xác định.</> },
      { tieuDe: "9. Báo cáo", noiDung: <>Menu <b>Báo cáo tổng hợp</b>: chọn xã, tình trạng, ngày tính số liệu → Xuất Excel hoặc Soạn báo cáo Word (chọn mẫu; <b>Tải mẫu về sửa</b>, <b>Thay mẫu này…</b>, <b>Thêm mẫu khác…</b>; danh sách trường dữ liệu). <b>Báo cáo định kỳ (một nút)</b> tạo ngay Word theo mẫu và thông tin lần trước; báo cáo có danh sách hộ vướng mắc kèm bước, số ngày tồn đọng. Gói chính sách mới: Quản trị nạp ở Cài đặt chung → Gói chính sách (đối chiếu mã SHA-256), dự án chuyển bộ ở Thông tin dự án (xem chênh lệch trước khi áp dụng). Lãnh đạo chốt số liệu kỳ để so sánh với kỳ trước.</>, mo: { nhan: "Mở Báo cáo tổng hợp", man: { ten: "bao-cao" } } },
    ],
  },
  {
    ma: "man-hinh", ten: "Các màn hình", bt: "danhSach", moTa: "Chức năng chính của từng màn hình.",
    buoc: [
      { tieuDe: "Tổng quan", noiDung: <>Tình trạng chung, việc cần theo dõi / cần xử lý ngay, chỉ số điều hành, quy trình 6 chặng. <b>Bấm vào mọi chỉ số</b> để mở danh sách hồ sơ tương ứng.</>, mo: { nhan: "Mở Tổng quan", man: { ten: "tong-quan" } } },
      { tieuDe: "Dự án", noiDung: <>Thẻ hoặc bảng dự án (tìm, lọc trạng thái, sắp xếp), thống kê chung, tạo dự án mới. Bấm một dự án để vào không gian Hồ sơ của dự án.</>, mo: { nhan: "Mở Dự án", man: { ten: "du-an" } } },
      { tieuDe: "Hồ sơ (không gian dự án)", noiDung: <>Mọi việc chi tiết của một dự án: <b>Tổng quan dự án</b> (hiện trạng, tiến độ, mốc, phương án), <b>Thông tin dự án</b> (kèm thông tin dùng chung cho văn bản — nhập một lần, mọi mẫu văn bản dùng lại), <b>Hộ, cá nhân, tổ chức</b> (tờ, thửa, diện tích, loại đất, bồi thường, hỗ trợ, tiến độ, vướng mắc), <b>Tái định cư</b>, <b>Bản đồ</b>. Văn bản từng hộ soạn trong hồ sơ hộ (thẻ Văn bản); văn bản cấp dự án, theo đợt: nút <b>Văn bản dự án, đợt</b> ở đầu trang. Đổi dự án bằng ô chọn ở đầu trang.</> },
      { tieuDe: "Danh sách hồ sơ", noiDung: <>Mọi hồ sơ của các dự án, lọc theo dự án, hiện trạng, chặng quy trình, từ khóa (tên, mã, địa chỉ, tờ/thửa "5/85").</>, mo: { nhan: "Mở Danh sách hồ sơ", man: { ten: "ds-ho" } } },
      { tieuDe: "Bản đồ", noiDung: <><b>Thao tác như MicroStation:</b> lăn chuột để phóng/thu tại con trỏ, kéo để di chuyển (hoặc giữ nút giữa), thanh công cụ trên bản đồ: chọn/thông tin phần tử, phóng theo khung, đo khoảng cách, đo diện tích, lấy tọa độ (bật "Bắt điểm" để bắt vào đỉnh; bấm đúp hoặc chuột phải để kết thúc, Esc để xóa). Bảng <b>Lớp bản đồ</b>: lớp GPMB, bật/tắt từng lớp của tệp DGN, chú giải. Nạp DGN MicroStation V7 hoặc V8/V8i; cấu hình lớp (gợi ý tự động, cột ý nghĩa lớp theo Phụ lục 21 TT 26/2024; cán bộ chốt). Thẻ <b>Kiểm tra bản đồ</b> nêu điều còn thiếu và việc cần làm. Xác định thửa thu hồi bằng 3 cách: chọn một hoặc nhiều vùng (ranh GPMB, hoặc lớp thửa đã thu hồi như lớp 40); chọn thửa trực tiếp (bấm trên bản đồ hoặc tích cột TH); thêm thửa theo nhãn "Chưa GPMB/NQH" (lớp 62). Nhãn "Đã/Chưa GPMB" trên bản đồ chỉ để đối chiếu, không ghi đè tiến độ 16 bước. Khi tạo hồ sơ, thửa có dấu ⚠ phải được xác nhận đã kiểm tra. Xử lý hoàn toàn trên máy. Chưa đọc: cung tròn, 3D ở V8; ô dùng chung, tham chiếu ngoài; chưa nạp ranh thu hồi từ tệp riêng.</> },
      { tieuDe: "Nhập số (từ 0.4)", noiDung: <>Gõ số theo cách viết Việt Nam: dấu chấm phân cách nghìn, dấu phẩy thập phân — “9.222,1”, “20.000” (hai mươi nghìn). Gõ “9222.1” ô sẽ viền đỏ và gợi ý cách viết đúng; giá trị cũ không bị đổi. Ô khối lượng nhận cả biểu thức “=5+6+3”.</> },
      { tieuDe: "Mẫu mã hồ sơ, mã không trùng", noiDung: <>Thông tin dự án → Mẫu mã hồ sơ: dãy <b>#</b> là chỗ đánh số (vd. H###, CM-2026-####). Mã mới tiếp số lớn nhất đang dùng; mã trùng trong dự án bị chặn.</>, mo: { nhan: "Mở Dự án", man: { ten: "du-an" } } },
      { tieuDe: "Xóa, thùng rác", noiDung: <>Xóa hồ sơ, dự án cần ghi lý do và đưa vào Thùng rác (khôi phục được). Hồ sơ có trong phương án đã chốt/phê duyệt hoặc đã chi trả không xóa được. Xóa hẳn chỉ Quản trị, sau 30 ngày. Đợt chi ghi nhầm thì “Hủy” (có lý do), không xóa.</>, mo: { nhan: "Mở Thùng rác", man: { ten: "thung-rac" } } },
      { tieuDe: "Sao lưu mã hóa", noiDung: <>Tệp sao lưu được mã hóa; sao lưu thủ công phải đặt mật khẩu. Quản trị đặt <b>mật khẩu khôi phục</b> (Cài đặt chung → Tự động sao lưu) để mở được mọi bản sao lưu trên máy khác. Quên cả hai mật khẩu thì không mở được tệp.</> },
      { tieuDe: "Rà soát số liệu", noiDung: <>Công cụ → Rà soát số liệu: số cũ dạng “20.000” trước đây được tính là 20 — chọn cách hiểu đúng; số không đọc được; số bất thường (chỉ nhắc).</>, mo: { nhan: "Mở Rà soát số liệu", man: { ten: "ra-soat-so" } } },
      { tieuDe: "Thao tác bằng bàn phím", noiDung: <>F1 mở bảng phím tắt. Thẻ: ← → (khi đang chọn thẻ), Ctrl + PgDn / PgUp. Bảng: Tab đến dòng, ↑ ↓ Home End di chuyển, Enter mở. Ô nhập trong bảng (thửa, kiểm đếm): Enter / Shift + Enter xuống / lên ô cùng cột, ← → ở đầu / cuối ô sang ô bên cạnh. Ctrl + S lưu, Ctrl + Enter lưu và sang thẻ tiếp theo, Esc đóng hộp thoại, Alt + 1…6 chuyển màn, F5 nạp lại dữ liệu (không mất dữ liệu đang nhập), Shift + F10 mở menu ngữ cảnh.</> },
      { tieuDe: "Menu chuột phải", noiDung: <>Bấm chuột phải ở bất kỳ đâu: trên ô nhập (hoàn tác, cắt, sao chép, dán, chọn tất cả, xóa nội dung); trên chữ đang chọn (sao chép, tìm hồ sơ, tra cứu đơn giá theo chữ đó); trên dòng hồ sơ (mở hồ sơ ở thẻ Thửa, Kiểm đếm, Tính toán, Tiến độ, Chi trả, Văn bản); trên dự án (mở dự án, danh sách hộ, bản đồ, văn bản); trên bảng (sao chép dòng, sao chép cả bảng để dán vào Excel, xuất bảng ra Excel); cùng các lệnh chung (quay lại, tìm kiếm nhanh, tra cứu, kiểm tra phương án, sao lưu, sáng/tối). Phím ↑ ↓ Enter để chọn, Esc để đóng; Shift + chuột phải mở menu gốc của trình duyệt.</> },
      { tieuDe: "Nơi lưu tệp xuất", noiDung: <>Mỗi lần xuất Excel, Word, zip, sao lưu thủ công, phần mềm mở hộp thoại “Lưu thành” để chọn thư mục và tên tệp (lần sau mở sẵn thư mục vừa lưu). Bấm Hủy thì không lưu và không ghi số, ngày văn bản vào hồ sơ. Tắt ở Cài đặt chung → Lưu tệp xuất để lưu thẳng vào Downloads.</> },
      { tieuDe: "Kiểm tra phương án (Excel, Word)", noiDung: <>Nạp tệp Excel (.xlsx) hoặc Word (.docx) phương án do đơn vị khác lập (phụ lục chi tiết; tệp Word: đọc các bảng, gộp các bảng cùng cấu trúc), chọn xã có đất thu hồi: phần mềm kiểm số học từng dòng và tổng nhóm, đối chiếu đơn giá với QĐ 32/2025, PL V, VIII QĐ 106/2025, giá đất với NQ 152/2025, hệ số chuyển đổi nghề; báo Lỗi / Cảnh báo / Không kiểm được theo dòng Excel; xuất báo cáo kiểm tra.</>, mo: { nhan: "Mở Kiểm tra phương án", man: { ten: "kiem-tra-pa" } } },
      { tieuDe: "Tra cứu đơn giá, giá đất", noiDung: <>Danh mục dạng cây, tìm không dấu, kết quả theo nhóm, chi tiết đơn giá kèm mã nguồn, số trang, căn cứ; ghim dòng hay dùng; lưu bộ lọc; chọn nhiều dòng → sao chép dán vào Excel.</>, mo: { nhan: "Mở Tra cứu", man: { ten: "tra-cuu" } } },
      { tieuDe: "Đọc văn bản scan (OCR)", noiDung: <>Chọn ảnh/PDF scan → Nhận dạng (chạy trên máy, không gửi ra ngoài). Trang có độ tin cậy dưới 75% cần đọc soát kỹ; sửa câu căn cứ gợi ý cho đúng bản gốc rồi thêm vào căn cứ của dự án.</>, mo: { nhan: "Mở OCR", man: { ten: "doc-scan" } } },
    ],
  },
  {
    ma: "phim-tat", ten: "Phím tắt, thao tác nhanh", bt: "luoi", moTa: "Giúp thao tác nhanh hơn.",
    buoc: [
      { tieuDe: "Tìm kiếm chung", noiDung: <><K>Ctrl</K> + <K>K</K>: tìm dự án, hộ gia đình, cá nhân, tổ chức (không cần gõ dấu); <K>↑</K> <K>↓</K> chọn, <K>Enter</K> mở.</> },
      { tieuDe: "Quay lại màn trước", noiDung: <>Nút <b>Quay lại</b> trên thanh tiêu đề, phím <K>Alt</K> + <K>←</K>, hoặc nút lùi của chuột.</> },
      { tieuDe: "Thông báo", noiDung: <>Biểu tượng chuông trên thanh tiêu đề: các việc cần xử lý ngay, cần theo dõi; bấm để mở hồ sơ liên quan.</> },
      { tieuDe: "Giao diện sáng / tối", noiDung: <>Nút mặt trăng / mặt trời trên thanh tiêu đề.</> },
    ],
  },
  {
    ma: "vai-tro", ten: "Vai trò, tài khoản", bt: "taiKhoan", moTa: "Phân quyền theo QD-22.",
    buoc: [
      { tieuDe: "Cán bộ nghiệp vụ", noiDung: <>Nhập, sửa dự án, hồ sơ, thửa, kiểm đếm, bản đồ; nhập Excel; soạn văn bản; gửi duyệt bước; ghi chi trả; sao lưu.</> },
      { tieuDe: "Lãnh đạo, kiểm tra", noiDung: <>Như cán bộ, thêm: xác nhận hoàn thành bước; chốt, ghi nhận phê duyệt, hủy phương án; thay mẫu văn bản; xóa dự án; cài đặt chung, thiết lập đơn vị; chốt kỳ báo cáo; xem nhật ký hệ thống.</> },
      { tieuDe: "Quản trị", noiDung: <>Toàn quyền; quản lý tài khoản (tạo, đổi vai trò, khóa, đặt lại mật khẩu); khôi phục dữ liệu. Nên có ít nhất 2 tài khoản quản trị.</> },
      { tieuDe: "Chỉ xem", noiDung: <>Xem, tra cứu, xuất Excel, tạo bản dự thảo văn bản; không ghi dữ liệu.</> },
      { tieuDe: "Đổi mật khẩu", noiDung: <>Menu tên người dùng (góc phải thanh tiêu đề) → Đổi mật khẩu.</> },
    ],
  },
  {
    ma: "quan-tri", ten: "Quản trị, sao lưu, mạng nội bộ", bt: "saoLuu", moTa: "Dành cho quản trị (tóm tắt docs/14).",
    buoc: [
      { tieuDe: "Sao lưu, khôi phục", noiDung: <>Tạo bản sao lưu thủ công trước khi nâng cấp; khôi phục (quản trị): chọn tệp → kiểm tra toàn vẹn → Thay thế toàn bộ (phần mềm tự tải bản sao lưu dữ liệu hiện có trước) hoặc Gộp.</>, mo: { nhan: "Mở Sao lưu", hanhDong: "saoLuu" } },
      { tieuDe: "Nâng cấp phần mềm", noiDung: <>Cài bản mới đè lên bản cũ (không cần gỡ). Mạng nội bộ: nâng cấp máy chủ trước, máy trạm sau. Gỡ cài đặt có thể xóa dữ liệu máy đơn — sao lưu trước khi gỡ.</> },
      { tieuDe: "Mạng nội bộ", noiDung: <>Máy chủ đặt IP tĩnh; cổng 47800 mở trong tường lửa mạng riêng; máy trạm đối chiếu vân tay chứng chỉ lần đầu. Không xóa thư mục <code>may-chu</code> trong <code>%LOCALAPPDATA%\vn.sonla.gpmb\</code>.</> },
      { tieuDe: "Nhật ký hệ thống", noiDung: <>Menu tên người dùng → Nhật ký hệ thống: đăng nhập, thay đổi tài khoản, chốt / phê duyệt phương án, sao lưu, khôi phục, nhập Excel, xóa; có kiểm tra chuỗi băm phát hiện sửa, xóa dòng.</> },
    ],
  },
  {
    ma: "luu-y", ten: "Lưu ý nghiệp vụ", bt: "canhBao", moTa: "Nguyên tắc tính toán và các trường hợp đặc biệt.",
    buoc: [
      { tieuDe: "Phần mềm hỗ trợ, cán bộ quyết định", noiDung: <>Mọi khoản tính đều ghi căn cứ; kết quả là số liệu tạm tính để cán bộ có thẩm quyền kiểm tra, phê duyệt. Lựa chọn khác mặc định (giá sửa tay, mức hỗ trợ lựa chọn) <b>bắt buộc ghi lý do</b> và được ghi vào nhật ký hồ sơ.</> },
      { tieuDe: "Làm tròn", noiDung: <>Mặc định làm tròn lên đến 1.000 đ ở tổng tiền hộ (QD-03); đổi ở Thông tin dự án (nửa lên, xuống, không làm tròn) kèm lý do (VM-36).</> },
      { tieuDe: "Cây trồng xen", noiDung: <>Cây không có mật độ quy định trên thửa trồng xen ở trạng thái "Cần xác nhận" đến khi chọn tính 100% hay 30% ở thẻ Thửa đất kèm lý do (VM-35).</> },
      { tieuDe: "Đất nguồn gốc nông, lâm trường", noiDung: <>Hồ sơ → Thửa đất → nút ⋯ của thửa → chọn trường hợp theo khoản 9 Điều 6 QĐ 14/2026. Trường hợp 9.1.b, 9.1.c chưa tính tự động.</> },
      { tieuDe: "Làm việc qua mạng nội bộ", noiDung: <>Khi thấy "Dữ liệu đã được … sửa", phần mềm đã tải bản mới nhất; nội dung đang nhập vẫn còn trên màn hình để nhập lại rồi lưu.</> },
    ],
  },
];

const chuThuan = (n: ReactNode): string => (typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(chuThuan).join(" ") : n && typeof n === "object" && "props" in n ? chuThuan((n as { props: { children?: ReactNode } }).props.children) : "");

export function HuongDan() {
  const { di, moCaiDat, moSaoLuu } = useUngDung();
  const [muc, setMuc] = useState(MUC[0]!.ma);
  const [tim, setTim] = useState("");
  const ketQua = useMemo(() => {
    const t = khongDau(tim.trim());
    if (!t) return null;
    return MUC.flatMap((m) => m.buoc.filter((b) => khongDau(`${b.tieuDe} ${chuThuan(b.noiDung)}`).includes(t)).map((b) => ({ m, b })));
  }, [tim]);
  const hien = MUC.find((m) => m.ma === muc)!;
  const theBuoc = (b: Buoc, i: number, m?: Muc) => (
    <div key={`${m?.ma ?? ""}${i}`} className="hd-buoc">
      <span className="so">{m ? <BieuTuong ten={m.bt} co={16} /> : i + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{b.tieuDe}</b>{m && <small className="mo"> · {m.ten}</small>}
        <div className="nd">{b.noiDung}</div>
      </div>
      {b.mo && (
        <button className="nut nut-nho" onClick={() => (b.mo!.man ? di(b.mo!.man) : b.mo!.hanhDong === "caiDat" ? moCaiDat(true) : moSaoLuu(true))}>
          {b.mo.nhan} <BieuTuong ten="phai" co={14} />
        </button>
      )}
    </div>
  );
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Trợ giúp</div>
          <h1>Hướng dẫn sử dụng</h1>
          <div className="mo-ta">Cách dùng phần mềm theo quy trình công việc. Bản đầy đủ: docs/13 (sử dụng), docs/14 (quản trị) trong bộ tài liệu kèm phần mềm.</div>
        </div>
      </div>
      <div className="hd-khung">
        <div className="the hd-muc-luc">
          <div style={{ padding: 12 }}>
            <label className="o-tim"><BieuTuong ten="traCuu" co={16} /><input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm trong hướng dẫn…" aria-label="Tìm trong hướng dẫn" /></label>
          </div>
          <nav>
            {MUC.map((m) => (
              <button key={m.ma} className={!ketQua && muc === m.ma ? "chon" : ""} onClick={() => { setMuc(m.ma); setTim(""); }}>
                <span className="bt"><BieuTuong ten={m.bt} co={17} /></span>
                <span><b>{m.ten}</b><small>{m.buoc.length} mục</small></span>
              </button>
            ))}
          </nav>
        </div>
        <div className="the hd-noi-dung">
          {ketQua ? (
            <>
              <div className="hd-dau"><h2>Kết quả tìm “{tim}”</h2><span className="mo">{ketQua.length} mục</span></div>
              <div className="hd-ds">{ketQua.map(({ m, b }, i) => theBuoc(b, i, m))}{ketQua.length === 0 && <div className="trong">Không tìm thấy nội dung phù hợp.</div>}</div>
            </>
          ) : (
            <>
              <div className="hd-dau">
                <span className="hd-bt"><BieuTuong ten={hien.bt} co={22} /></span>
                <div><h2>{hien.ten}</h2><div className="mo">{hien.moTa}</div></div>
              </div>
              <div className="hd-ds">{hien.buoc.map((b, i) => theBuoc(b, i))}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
