/**
 * Nội dung tài liệu "Hướng dẫn sử dụng" (D1, 1.0.20). Mỗi chương: đoạn mở đầu, các bước (đánh số), ảnh minh họa
 * (tên tệp do tools/huong-dan/chup-anh.mjs tạo, bỏ tiền tố số), lưu ý. Chỉ mô tả chức năng đã có (docs/09).
 * Cú pháp trong chuỗi: **đậm**.
 */
export const CHUONG = [
  {
    ten: "Giới thiệu chung",
    doan: [
      "Phần mềm hỗ trợ bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất trên địa bàn tỉnh Sơn La (gọi tắt là Phần mềm GPMB Sơn La) giúp đơn vị thực hiện nhiệm vụ bồi thường, UBND cấp xã và cơ quan chuyên môn: lập và tính toán hồ sơ từng hộ có căn cứ từng dòng; theo dõi tiến độ 16 bước theo Sổ tay nghiệp vụ; lập, chốt, thẩm định, phê duyệt phương án; soạn văn bản theo mẫu; đọc bản đồ địa chính DGN, DXF; theo dõi chi trả, bàn giao mặt bằng, khiếu nại, cưỡng chế; báo cáo và gửi số liệu lên tỉnh.",
      "Nguyên tắc: mọi khoản tiền đều ghi căn cứ; khoản thiếu căn cứ được đánh dấu **Thiếu căn cứ**, phần mềm không tự đặt mức giá, tỷ lệ. Số liệu, văn bản do phần mềm lập là dự thảo — cán bộ có thẩm quyền kiểm tra, phê duyệt theo quy định.",
      "Dữ liệu hồ sơ lưu trên máy (hoặc máy chủ mạng nội bộ của đơn vị), được mã hóa; phần mềm không gửi dữ liệu hồ sơ ra ngoài.",
    ],
    buoc: [
      "Yêu cầu máy: Windows 10/11 64 bit, RAM từ 8 GB, màn hình từ 1366 × 768.",
      "Cài đặt: chạy tệp cài đặt (.exe) do tác giả cung cấp; cài bản mới đè lên bản cũ, không cần gỡ. Dữ liệu được giữ nguyên khi nâng cấp — nên sao lưu trước.",
      "Bản dùng thử dùng được 1 dự án; nhập **mã kích hoạt** ở Giới thiệu, bản quyền để dùng không giới hạn.",
    ],
  },
  {
    ten: "Bắt đầu sử dụng",
    doan: ["Lần đầu mở phần mềm trên máy (hoặc máy chủ mạng nội bộ), tạo tài khoản quản trị đầu tiên, sau đó thiết lập đơn vị, lịch ngày nghỉ và sao lưu."],
    buoc: [
      "Nhập tên đăng nhập, họ tên, mật khẩu (từ 8 ký tự) → **Tạo tài khoản**. Nên có ít nhất 2 tài khoản Quản trị.",
      "Thanh bên → **Thiết lập đơn vị**: tên đơn vị, cơ quan cấp trên, ký hiệu, người ký — được điền sẵn vào văn bản, báo cáo.",
      "**Cài đặt chung → Lịch ngày nghỉ**: nhập ngày lễ, Tết, nghỉ bù, làm bù theo thông báo chính thức (có nút đề xuất ngày nghỉ theo Điều 112 Bộ luật Lao động để đối chiếu). Thời hạn tính theo ngày làm việc dựa vào lịch này.",
      "Bấm **Nạp dữ liệu mẫu (ẩn danh)** hoặc **Tạo dự án tập huấn** để xem thử trước khi nhập dữ liệu thật.",
    ],
    anh: [["tao-tai-khoan", "Tạo tài khoản quản trị đầu tiên"], ["tong-quan", "Màn hình Tổng quan"]],
    luuY: ["Màn hình Tổng quan: tình trạng chung, việc cần theo dõi, việc cần xử lý ngay, chỉ số điều hành. Bấm vào mọi chỉ số để mở danh sách hồ sơ tương ứng."],
  },
  {
    ten: "Dự án",
    doan: ["Mỗi dự án có một không gian **Hồ sơ** gồm các thẻ: Tổng quan dự án, Thông tin dự án, Bước chung (1–4), Hộ – cá nhân – tổ chức, Tái định cư, Chi trả – kinh phí, Bản đồ, Tài liệu – văn bản."],
    buoc: [
      "Thanh bên → **Dự án** → **Dự án mới**: tên, xã.",
      "Thẻ **Thông tin dự án**: căn cứ thu hồi, ngày thông báo thu hồi đất, giá gạo (kèm nguồn), hạn mức giao đất nông nghiệp, hệ số giá đất, thông tin dùng chung cho văn bản (nhập một lần, mọi mẫu dùng lại); mẫu mã hồ sơ; đợt thu hồi (nếu có).",
      "Thẻ **Bước chung (1–4)**: kế hoạch, họp dân, thông báo thu hồi, điều tra – kiểm đếm — cập nhật một lần cho cả dự án (hoặc theo đợt). Từ bước 5, mỗi hộ có tiến độ riêng.",
      "Tổng quan dự án → **Lập kế hoạch**: ngày dự kiến hoàn thành từng bước để phần mềm cảnh báo chậm.",
    ],
    anh: [["danh-sach-du-an", "Danh sách dự án"], ["tong-quan-du-an", "Tổng quan dự án"], ["thong-tin-du-an", "Thông tin dự án"], ["buoc-chung", "Bước chung 1–4"]],
  },
  {
    ten: "Hồ sơ hộ gia đình, cá nhân, tổ chức",
    doan: ["Tạo hồ sơ bằng một trong ba cách: thêm từng hộ; nhập từ Excel (phần mềm nhận diện cột, xem trước rồi nhập); tạo từ thửa thu hồi trên bản đồ."],
    buoc: [
      "Thẻ **Hộ, cá nhân, tổ chức** → **Thêm hộ, tổ chức**, hoặc **Thêm → Nhập hồ sơ từ Excel**.",
      "Mở hồ sơ → nhập lần lượt các thẻ **Thông tin**, **Nhân khẩu**, **Thửa đất** (chọn giá đất theo bảng giá; phân lớp, vị trí nếu cần), **Kiểm đếm tài sản** (chọn đơn giá theo QĐ 32/2025, Phụ lục VIII QĐ 106/2025), **Hỗ trợ**, **Hỗ trợ khác**.",
      "Gõ số theo cách viết Việt Nam: dấu chấm phân cách nghìn, dấu phẩy thập phân (9.222,1). Ô khối lượng nhận biểu thức “=5+6+3”.",
      "Bấm **Lưu và tiếp** để lưu rồi sang thẻ kế tiếp; **Hoàn tác** để bỏ thay đổi chưa lưu. Ctrl + S lưu nhanh.",
    ],
    anh: [["danh-sach-ho", "Danh sách hộ của dự án"], ["ho-thong-tin", "Hồ sơ hộ — thẻ Thông tin"], ["ho-thua-dat", "Thẻ Thửa đất — chọn giá đất có nguồn"], ["ho-kiem-dem", "Thẻ Kiểm đếm tài sản"]],
  },
  {
    ten: "Tính toán, giải trình",
    doan: ["Thẻ **Tính toán, giải trình** hiện từng khoản bồi thường, hỗ trợ: tham số, công thức, thành tiền, căn cứ và trạng thái (Tạm tính, Cần xác nhận, Thiếu căn cứ)."],
    buoc: [
      "Bấm một dòng để xem giải trình chi tiết bên phải.",
      "Khoản **Thiếu căn cứ** / **Cần xác nhận** không được cộng vào tổng và chặn chốt phương án — bổ sung số liệu, căn cứ ở thẻ tương ứng.",
      "Xuất Excel phương án chi tiết, Word (kèm giải trình), In / PDF.",
    ],
    anh: [["ho-tinh-toan", "Bảng tính chi tiết và giải trình khoản tính"]],
  },
  {
    ten: "Bản đồ địa chính",
    doan: ["Phần mềm đọc trực tiếp bản đồ MicroStation DGN (V7, V8/V8i) và AutoCAD DXF; dựng thửa, đối chiếu ranh thu hồi; xử lý hoàn toàn trên máy."],
    buoc: [
      "Thẻ **Bản đồ** → nạp tệp DGN/DXF (thêm tờ, so sánh bản đồ được).",
      "**Cấu hình lớp**: phần mềm gợi ý lớp ranh thửa, số thửa, số tờ, ranh GPMB; cán bộ chốt.",
      "Xem khung **Kiểm tra bản đồ**: khép thửa, tọa độ, số tờ – thửa, loại đất, diện tích, phạm vi thu hồi.",
      "Xác định thửa thu hồi: chọn vùng ranh GPMB, chọn thửa trực tiếp, hoặc nạp tọa độ mốc ranh; phần mềm tính diện tích thu hồi từng thửa.",
      "**Tạo hồ sơ từ thửa thu hồi**; **Xuất PDF tiến độ** để in bản đồ tiến độ GPMB.",
      "Thao tác như MicroStation: lăn chuột phóng/thu, kéo để di chuyển, công cụ đo khoảng cách, diện tích, lấy tọa độ, ghi chú hiện trường.",
    ],
    anh: [["ban-do", "Bản đồ dự án tập huấn (DXF giả lập) và Kiểm tra bản đồ"]],
  },
  {
    ten: "Tiến độ 16 bước, thời hạn, cảnh báo",
    doan: ["Tiến độ theo 16 bước của Sổ tay nghiệp vụ. Thời hạn luật định (thẩm định, phê duyệt, gửi quyết định, ban hành quyết định thu hồi đất, chi trả, chỉnh lý hồ sơ địa chính…) được tính tự động theo ngày làm việc hoặc ngày, có căn cứ từng hạn."],
    buoc: [
      "Hồ sơ hộ → thẻ **Tiến độ**: ghi ngày, văn bản từng bước; **Khó khăn, vướng mắc** của bước (hộ có vướng mắc được tô đỏ, đưa vào báo cáo).",
      "Cán bộ **Gửi duyệt**, lãnh đạo **Xác nhận hoàn thành**. Bước không phát sinh (vd. cưỡng chế): **Không áp dụng** kèm lý do.",
      "Thẻ **Bàn giao mặt bằng**: ngày, biên bản, diện tích — ghi xong là hoàn thành GPMB đối với hộ.",
      "Chuông thông báo trên thanh tiêu đề: việc cần xử lý ngay, cần theo dõi; bấm để mở hồ sơ liên quan.",
    ],
    anh: [["ho-tien-do", "Thẻ Tiến độ của hồ sơ hộ"]],
  },
  {
    ten: "Phương án bồi thường, hỗ trợ, tái định cư",
    doan: ["Phương án được chốt thành **bản** (đóng băng số liệu, có mã băm), ghi nhận thẩm định, phê duyệt; bản đã duyệt không sửa được, thay đổi sau đó lập bản điều chỉnh có lý do."],
    buoc: [
      "Tổng quan dự án → **Phương án – phiên bản** → **Soát phương án**: phần mềm liệt kê lỗi số liệu và các mục cần xem xét kèm căn cứ.",
      "**Chốt phương án…** (lãnh đạo): chọn hộ đủ điều kiện → **Chốt, đóng băng số liệu**.",
      "Trước khi nhận hồ sơ thẩm định, phần mềm kiểm tra niêm yết công khai 30 ngày, lấy ý kiến, đối thoại (điểm a khoản 3 Điều 87 Luật Đất đai 2024) — chỉ cảnh báo, không chặn.",
      "**Phê duyệt…**: nhập số, ngày quyết định đã ký → **Ghi nhận phê duyệt**.",
    ],
    anh: [["chot-phuong-an", "Hộp Chốt phương án"], ["phe-duyet-phuong-an", "Ghi nhận phê duyệt"], ["phuong-an-phien-ban", "Phương án – phiên bản, hạn ban hành QĐ thu hồi"]],
  },
  {
    ten: "Soạn văn bản",
    doan: ["Hồ sơ hộ → thẻ **Văn bản**: 22 mẫu Sổ tay, 25 mẫu theo văn bản thực tế (T1–T25), mẫu riêng của đơn vị; tự điền thông tin hộ, thửa, tài sản, số tiền theo kết quả tính."],
    buoc: [
      "Chọn mẫu → điền số, ngày → tải .docx (hoặc PDF). Hồ sơ đang sửa chưa lưu thì phải lưu trước.",
      "Văn bản cấp dự án, theo đợt: nút **Văn bản dự án, đợt** ở đầu không gian dự án.",
      "Tạo một mẫu cho nhiều hộ một lần (1.1.0): ở danh sách hộ của mẫu, lọc mã/tên rồi Enter để chọn thêm; nhập số đầu tiên → số tăng dần cho từng hộ; nhiều hộ ra một tệp .zip. Số, ngày văn bản ghi ngược vào từng đơn khiếu nại, hồ sơ cưỡng chế (chỉ ô còn trống).",
      "Biên bản bàn giao đất trên thực địa (T23, Mẫu 06 NĐ 102/2024) tạo xong thì phần mềm ghi mốc ở thẻ **Bàn giao đất trên thực địa** của Tổng quan dự án; bàn giao làm ngoài phần mềm thì bấm **Ghi mốc**. Mốc có trong báo cáo tiến độ và gói gửi tỉnh.",
      "Trước khi tạo văn bản, phần mềm hiện bảng kiểm tra thống nhất (tên đơn vị hành chính, chức danh…) — chỉ nhắc.",
    ],
    anh: [["ho-van-ban", "Thẻ Văn bản của hồ sơ hộ"]],
  },
  {
    ten: "Chi trả, kinh phí, quyết toán",
    doan: ["Số phải trả lấy từ bản phương án đã phê duyệt. Hạn chi trả 30 ngày kể từ ngày quyết định phê duyệt có hiệu lực (điểm a khoản 3 Điều 94 Luật Đất đai 2024); tiền chậm trả tạm tính theo tỷ lệ cán bộ nhập kèm căn cứ (điểm b khoản 3 Điều 94); gửi ngân hàng khi người có đất không nhận (khoản 4 Điều 94)."],
    buoc: [
      "Hồ sơ hộ → **Chi trả**: ghi từng đợt chi kèm chứng từ (tiền mặt, chuyển khoản, gửi ngân hàng). Ghi nhầm thì **Hủy** có lý do, không xóa.",
      "Dự án → thẻ **Chi trả, kinh phí**: tổng hợp chi trả theo bản phương án đã phê duyệt (phải trả, đã chi theo hình thức, gửi ngân hàng, còn phải chi, chi vượt); **Xuất Excel quyết toán**.",
      "Kinh phí tổ chức thực hiện (khoản 1 Điều 94; kinh phí cưỡng chế là một khoản — khoản 6 Điều 89): nhập tỷ lệ trích **kèm căn cứ** (thiếu căn cứ thì không tính mức tối đa), quyết định duyệt dự toán, các khoản dự toán, giải ngân → **Lưu kinh phí**.",
    ],
    anh: [["ho-chi-tra", "Thẻ Chi trả của hồ sơ hộ"], ["chi-tra-kinh-phi", "Thẻ Chi trả, kinh phí của dự án"]],
  },
  {
    ten: "Khiếu nại, kiến nghị và cưỡng chế",
    doan: ["Hồ sơ hộ → thẻ **Khiếu nại**. Phần mềm ghi nhận, đối chiếu thời hạn, điều kiện theo ngày cán bộ đã ghi; không kết luận đúng sai, không thay việc xem xét của người có thẩm quyền."],
    buoc: [
      "**+ Ghi đơn khiếu nại**: ngày nhận, ngày thụ lý, quyết định/hành vi bị khiếu nại, nội dung. Hạn thụ lý 10 ngày làm việc; đơn nhận từ 01/7/2026: 07 ngày làm việc (k1 Đ16 NĐ 124/2020/NĐ-CP, sửa bởi Điều 10 NĐ 155/2026/NĐ-CP); hạn giải quyết lần đầu 30 ngày, phức tạp 45 ngày, vùng sâu vùng xa 45/60 ngày (Điều 28); lần hai 45/60, vùng sâu vùng xa 60/70 ngày (Điều 37). Cán bộ đánh dấu “phức tạp”, “vùng sâu, vùng xa”. Nút “Soạn QĐ giải quyết (T14)” mở mẫu Quyết định giải quyết khiếu nại lần đầu (Mẫu 15 NĐ 124/2020) đã điền đơn; hồ sơ cưỡng chế thu hồi đất có nút T15 (biên bản vận động), T16 (QĐ thành lập Ban cưỡng chế), T17 (phương án, dự toán kinh phí). Khung thủ tục của đơn: số, ngày thông báo thụ lý; “+ Tạm đình chỉ” (thời gian tạm đình chỉ không tính vào hạn — k4 Điều 11a Luật Khiếu nại); vắng đối thoại; nút T18–T22 (thông báo thụ lý, không thụ lý, biên bản đối thoại, QĐ tạm đình chỉ/đình chỉ, QĐ tiếp tục — Phụ lục NĐ 155/2026).",
      "Từ bản 1.1.0: ghi **Ngày tổ chức đối thoại**, **Ngày gửi thông báo đối thoại** — phần mềm nhắc gửi thông báo trước ngày đối thoại ít nhất 05 ngày (k1 Điều 28 NĐ 124/2020 sửa bởi NĐ 155/2026), nút T24 soạn thông báo; ghi ngày gửi QĐ tạm đình chỉ, QĐ tiếp tục, QĐ đình chỉ — nhắc khi quá 03 ngày làm việc kể từ ngày ban hành (k1, k2 Điều 28b). Đơn lần hai có nút T25 (QĐ giải quyết khiếu nại lần hai, Mẫu 16 NĐ 124/2020; người giải quyết mặc định Chủ tịch UBND tỉnh — sửa nếu khác; thời hạn khởi kiện cán bộ ghi theo Luật Tố tụng hành chính).",
      "Tổng quan dự án → thẻ **Khiếu nại, cưỡng chế**: số đơn theo trạng thái (gồm tạm đình chỉ), đơn quá hạn, đơn gửi văn bản chậm, hồ sơ cưỡng chế; bấm tên hộ để mở thẻ Khiếu nại; **Xuất Excel** (tổng hợp, từng đơn, từng hồ sơ cưỡng chế, kèm căn cứ). Số đơn tạm đình chỉ có trong gói gửi tỉnh.",
      "**+ Ghi kiến nghị, phản ánh**: thời hạn trả lời do đơn vị nhập kèm căn cứ (không nhập thì không tính hạn).",
      "**+ Cưỡng chế kiểm đếm bắt buộc** (Điều 88) / **+ Cưỡng chế thu hồi đất** (Điều 89): ghi vận động, quyết định cưỡng chế, niêm yết, hiệu lực, ngày nhận quyết định, Ban cưỡng chế, ngày dự kiến, kết quả. Phần mềm nhắc: quyết định cưỡng chế thu hồi chỉ ban hành sau 10 ngày kể từ khi kết thúc vận động (điểm b khoản 7 Điều 87); hạn thi hành 10 ngày (khoản 3 Điều 89); không cưỡng chế ngày nghỉ, lễ, 15 ngày trước và sau thời gian nghỉ Tết Âm lịch (điểm b khoản 1 Điều 89); bàn giao đất chậm nhất 30 ngày sau biên bản chấp hành (điểm b khoản 4 Điều 89).",
      "Đơn quá hạn, cưỡng chế không đủ điều kiện hiện ở chuông thông báo; số lượng (không có thông tin cá nhân) được gửi lên tỉnh.",
    ],
    anh: [["ho-khieu-nai", "Thẻ Khiếu nại (khiếu nại, kiến nghị, cưỡng chế) — đơn khiếu nại lần đầu"]],
    luuY: ["Luật Đất đai ghi thẩm quyền ban hành quyết định cưỡng chế là Chủ tịch UBND cấp huyện; từ 01/7/2025 thực hiện theo văn bản phân định thẩm quyền của chính quyền địa phương hai cấp."],
  },
  {
    ten: "Báo cáo, gửi số liệu lên tỉnh",
    buoc: [
      "Thanh bên → **Báo cáo tổng hợp**: chọn xã, tình trạng, ngày số liệu → Xuất Excel, Soạn báo cáo Word theo mẫu (tải mẫu về sửa, thay mẫu, thêm mẫu); **Báo cáo định kỳ (một nút)**.",
      "Thanh bên → **Gửi tỉnh, tổng hợp tỉnh** → **Gửi lên tỉnh (cấp xã)**: chọn tệp khóa công khai của tỉnh, tên đơn vị gửi → **Xuất gói gửi tỉnh** (.gpmbtinh, mã hóa cho khóa tỉnh); gửi bằng thư, Zalo, USB hoặc cổng tỉnh.",
      "Cấp tỉnh → **Tổng hợp tỉnh (cấp tỉnh)**: mở khóa bằng mật khẩu khóa tỉnh, nhận gói các xã, xem tổng hợp, khâu thủ tục quá hạn, khiếu nại, cưỡng chế; Báo cáo Word, Excel toàn tỉnh.",
    ],
    anh: [["bao-cao", "Báo cáo tổng hợp"], ["gui-tinh", "Gửi tỉnh, tổng hợp tỉnh"]],
    luuY: ["Dự án tập huấn không bao giờ được đưa vào gói gửi tỉnh."],
  },
  {
    ten: "Sao lưu, bảo mật, mạng nội bộ, cập nhật",
    buoc: [
      "Nút **Sao lưu, khôi phục**: tạo bản sao lưu mã hóa (.gpmb) có mật khẩu; bật tự động sao lưu; phần mềm nhắc cất bản sao lưu ra thiết bị khác (USB, ổ mạng) theo chu kỳ đơn vị đặt.",
      "Cơ sở dữ liệu trên máy (máy đơn, máy chủ) được mã hóa; khóa do Windows giữ theo tài khoản máy — **cài lại Windows thì khôi phục từ tệp sao lưu**.",
      "Mạng nội bộ: máy chủ đặt IP tĩnh, mở cổng 47800 trong mạng riêng; máy trạm đối chiếu vân tay chứng chỉ lần đầu. Nâng cấp máy chủ trước, máy trạm sau.",
      "Cập nhật: Giới thiệu, bản quyền → kiểm tra bản mới, cài trong phần mềm.",
      "**Nhật ký sự cố** (Giới thiệu, bản quyền): khi cần hỗ trợ, bấm **Xuất nhật ký lỗi** và gửi tệp .txt cho tác giả — tệp chỉ có thông điệp kỹ thuật, đã che số định danh, điện thoại; phần mềm không tự gửi.",
    ],
    anh: [["sao-luu", "Sao lưu, khôi phục dữ liệu"], ["cai-dat", "Cài đặt chung — lịch ngày nghỉ"], ["gioi-thieu", "Giới thiệu, bản quyền — cập nhật, nhật ký sự cố"]],
  },
  {
    ten: "Dự án tập huấn",
    doan: ["Dùng để tập huấn cán bộ: 6 hộ ở các giai đoạn khác nhau, bản đồ DXF giả lập 18 thửa có ranh GPMB, một đơn khiếu nại mẫu, một hộ có vướng mắc. Không có thông tin cá nhân thật."],
    buoc: [
      "Thanh bên → **Dự án** → **Tạo dự án tập huấn**.",
      "Bài tập gợi ý: (1) Bản đồ → chọn vùng ranh GPMB → xem diện tích thu hồi từng thửa; (2) hộ H03 → Thửa đất → chọn giá đất cho thửa HNK; (3) Soát, chốt, phê duyệt phương án; (4) soạn thông báo, quyết định; (5) ghi chi trả, bàn giao; (6) ghi khiếu nại, cưỡng chế; (7) xuất báo cáo.",
      "Kết thúc: **Xóa dự án tập huấn** — xóa sạch ngay (cả hộ, bản đồ, tệp), không qua thùng rác.",
    ],
    anh: [["du-an-tap-huan", "Dự án tập huấn"]],
  },
  {
    ten: "Phím tắt, thao tác nhanh",
    buoc: [
      "Ctrl + K: tìm dự án, hộ, tờ/thửa (không cần dấu). F1: bảng phím tắt. Alt + 1…6: chuyển màn. Alt + ←: quay lại.",
      "Ctrl + S: lưu; Ctrl + Enter: lưu và sang thẻ tiếp theo; Esc: đóng hộp thoại; F5: nạp lại dữ liệu (không mất dữ liệu đang nhập).",
      "Chuột phải: menu theo ngữ cảnh (sao chép bảng sang Excel, mở hồ sơ ở thẻ cần làm, lịch sử thay đổi của một ô…).",
      "Thanh bên → **Hướng dẫn sử dụng**: hướng dẫn tóm tắt trong phần mềm, tìm kiếm, nút mở đúng màn hình.",
    ],
    anh: [["huong-dan", "Hướng dẫn sử dụng trong phần mềm"]],
  },
];
