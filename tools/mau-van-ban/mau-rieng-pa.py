"""
Chuyển 2 mẫu văn bản phê duyệt phương án của xã (người dùng cung cấp, dạng .doc → .docx, đã gộp run) thành
mẫu tự điền:
  - rieng-to-trinh-pa.docx  (Tờ trình đề nghị phê duyệt phương án BT, HT, TĐC — Phòng Kinh tế)
  - rieng-qd-pa.docx        (Quyết định phê duyệt phương án BT, HT, TĐC — Chủ tịch UBND xã)

Giữ nguyên thể thức gốc (bảng tiêu đề, cỡ chữ, in đậm/nghiêng); thay số liệu, tên người, tên dự án bằng trường {…}.
Tệp gốc có thông tin cá nhân → KHÔNG đưa vào kho mã.

Chạy: python3 tools/mau-van-ban/mau-rieng-pa.py <thư mục chứa 2 tệp .docx đã gộp run>

Thư mục nguồn phải có thêm thay-the-pa.json (KHÔNG đưa vào kho mã), dạng:
  {"ky_tt": ["Q. TRƯỞNG PHÒNG", "<họ tên>"], "ky_qd": ["CHỦ TỊCH", "<họ tên>"],
   "cam": ["<chuỗi không được còn trong mẫu sau khi dựng: tên người, số văn bản…>"]}
"""
import json
import re
import sys
import warnings
import zipfile
from pathlib import Path

warnings.filterwarnings("ignore", message="Duplicate name")
from docx import Document  # noqa: E402
from docx.oxml.ns import qn  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tien_ich_mau import dat_doan, dong_goi_lai, lam_sach, lap, t_elems, than, xoa  # noqa: E402

NGUON = Path(sys.argv[1])
RA = Path(__file__).resolve().parents[2] / "apps/desktop/public/mau-van-ban"
TT = json.loads((NGUON / "thay-the-pa.json").read_text(encoding="utf8"))
PV = "{#co_pham_vi} ({pham_vi_dot}){/co_pham_vi}"


def chu(p):
    return "".join(t.text or "" for t in t_elems(p))


def doan_bang(tbl, bat_dau):
    """Đoạn đầu tiên trong bảng có nội dung (bỏ khoảng trắng) bắt đầu bằng `bat_dau`."""
    for p in tbl.iter(qn("w:p")):
        if chu(p).strip().startswith(bat_dau):
            return p
    raise SystemExit(f"Không tìm thấy đoạn '{bat_dau}'")


def noi_nhan_ky(tbl, ky):
    """Ô nơi nhận → danh sách lặp {noi_nhan_ds}; khối ký → {quyen_han}, {nguoi_ky}."""
    for tc in tbl.iter(qn("w:tc")):
        ps = tc.findall(qn("w:p"))
        if ps and chu(ps[0]).strip().startswith("Nơi nhận"):
            muc = [p for p in ps[1:] if chu(p).strip()]
            lap(muc[0], "noi_nhan_ds", [("{.}", False)])
            xoa(*muc[1:])
    dat_doan(doan_bang(tbl, ky[0]), [("{quyen_han}", True)])
    dat_doan(doan_bang(tbl, ky[1]), [("{nguoi_ky}", True)])


def noi_dung_pa(b, dau, gach):
    """Các mục 1 → 11 của phương án (b[24] … b[44]) — cùng bố cục ở Tờ trình và Quyết định."""
    dat_doan(b[24], [("1. " if dau else "1. Tổng diện tích đất thu hồi", True), ("Tổng diện tích đất thu hồi: {tong_dt_thu_hoi} m2, trong đó:" if dau else ": {tong_dt_thu_hoi} m2, trong đó:", False)])
    lap(b[25], "ds_thua_pa", [(gach + " {mo_ta}", False)])
    xoa(b[26])
    muc = [
        (27, "2.", "Tổng số đối tượng có đất thu hồi", "{so_doi_tuong_pa}."),
        (28, "3.", "Phương án đào tạo, chuyển đổi nghề và tìm kiếm việc làm", "{pa_chuyen_doi_nghe}"),
        (29, "4.", "Phương án bố trí tái định cư", "{pa_tai_dinh_cu}"),
        (30, "5.", "Phương án bồi thường bằng đất", "{pa_boi_thuong_dat}"),
        (31, "6.", "Phương án di dời mồ mả trong phạm vi đất thu hồi", "{pa_mo_ma}"),
        (32, "7.", "Phương án di chuyển các công trình hạ tầng trong phạm vi đất thu hồi", "{pa_ha_tang}"),
    ]
    for i, so, ten, gt in muc:
        # Tờ trình: cả số mục và tên in đậm; Quyết định: chỉ số mục in đậm (như bản gốc)
        dat_doan(b[i], [(f"{so} ", True), (ten, not dau), (f": {gt}", False)])
    dat_doan(b[33], [("8. ", True), ("Kinh phí bồi thường, hỗ trợ, tái định cư", not dau)])
    dat_doan(b[34], [("Tổng giá trị phương án: ", False), ("{tong_gia_tri} đồng", True), (" ({tong_gia_tri_chu}).", False)])
    dat_doan(b[35], [("8.1.", True), (" Tiền bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất là: {tien_bthttdc} đồng ({tien_bthttdc_chu}). Trong đó:", False)])
    lap(b[36], "khoan_pa", [("{chu}, {ten}: {tien} đồng;", False)])
    xoa(b[37], b[38])
    dat_doan(b[39], [("8.2.", True), (" Chi phí bảo đảm cho việc tổ chức thực hiện bồi thường, hỗ trợ, tái định cư: {chi_phi_to_chuc}", False)])
    dat_doan(b[40], [("8.3.", True), (" Các chi phí khác: {chi_phi_khac}", False)])
    dat_doan(b[41], [("9.", True), (" Tiến độ thực hiện phương án bồi thường, hỗ trợ và tái định cư: {tien_do_thuc_hien}", False)])
    dat_doan(b[42], [("10.", True), (" Ý kiến, kiến nghị của tổ chức/hộ gia đình/cá nhân về phương án bồi thường, hỗ trợ và tái định cư; kết quả giải quyết: {y_kien_kien_nghi}", False)])


def tieu_de(hdr, so):
    dat_doan(doan_bang(hdr, "Số:"), [(so, False)])
    p_ngay = next(p for p in hdr.iter(qn("w:p")) if ", ngày" in chu(p))
    dat_doan(p_ngay, [("{dia_danh}, ngày {ngay} tháng {thang} năm {nam}", False)])


def to_trinh(src):
    d = Document(src)
    b = than(d)
    hdr = b[0]
    dat_doan(doan_bang(hdr, "UBND XÃ"), [("UBND {TEN_XA}", False)])
    dat_doan(doan_bang(hdr, "PHÒNG"), [("{TEN_PHONG}", True)])
    tieu_de(hdr, "Số: {so}/TTr-{ky_hieu_phong}")
    dat_doan(b[3], [("Đề nghị phê duyệt phương án bồi thường, hỗ trợ, tái định cư để thực hiện dự án: {ten_du_an}" + PV + ".", True)])
    dat_doan(b[5], [("Kính gửi: Chủ tịch Ủy ban nhân dân {ten_xa}.", False)])
    lap(b[7], "can_cu", [("{.}", False)])
    xoa(*b[8:22])
    dat_doan(b[22], [("Căn cứ {ket_qua_tham_dinh}.", False)])
    dat_doan(b[23], [(
        "Sau khi xem xét Tờ trình số {tt_don_vi_so} ngày {tt_don_vi_ngay} của {ten_don_vi_bt} về việc đề nghị thẩm định phương án"
        " chi tiết bồi thường, hỗ trợ, tái định cư dự án: {ten_du_an}" + PV + " và kết quả thẩm định, {ten_phong} trình Chủ tịch"
        " Ủy ban nhân dân {ten_xa} phê duyệt Phương án bồi thường, hỗ trợ, tái định cư {pa_doi_tuong} khi Nhà nước thu hồi đất"
        " để thực hiện dự án {ten_du_an}" + PV + " với các nội dung cụ thể như sau:", False)])
    noi_dung_pa(b, dau=False, gach="+")
    noi_nhan_ky(b[46], TT["ky_tt"])
    lam_sach(d)
    d.save(RA / "rieng-to-trinh-pa.docx")


def quyet_dinh(src):
    d = Document(src)
    b = than(d)
    hdr = b[0]
    dat_doan(doan_bang(hdr, "XÃ "), [("{TEN_XA}", True)])
    tieu_de(hdr, "Số: {so}/QĐ-UBND")
    dat_doan(b[3], [("Phê duyệt phương án bồi thường, hỗ trợ, tái định cư để thực hiện dự án: {ten_du_an}" + PV + ".", True)])
    lap(b[7], "can_cu", [("{.}", False)])
    xoa(*b[8:21])
    dat_doan(b[21], [("Theo đề nghị của {chuc_danh_de_nghi} tại Tờ trình số {tt_phe_duyet_pa_so} ngày {tt_phe_duyet_pa_ngay}.", False)])
    dat_doan(b[23], [("Điều 1.", True), (" Phê duyệt phương án bồi thường, hỗ trợ và tái định cư thực hiện dự án: {ten_du_an}" + PV + ", với các nội dung sau:", False)])
    noi_dung_pa(b, dau=True, gach="-")
    dat_doan(b[46], [("1.", True), (
        " {ten_don_vi_bt} chủ trì, phối hợp với {ten_phong} {ten_xa} giao Quyết định này đến các chủ sử dụng đất; trường hợp chủ"
        " sử dụng đất không nhận Quyết định này hoặc vắng mặt thì phải lập biên bản; tổ chức niêm yết công khai Quyết định này theo quy định.", False)])
    dat_doan(b[47], [("2.", True), (
        " {ten_don_vi_bt} có trách nhiệm phối hợp với các cơ quan, đơn vị liên quan thực hiện chi trả tiền bồi thường, hỗ trợ, tái định cư"
        " theo phương án được duyệt trong thời hạn 30 ngày, kể từ ngày Quyết định này có hiệu lực; bàn giao mặt bằng cho {ben_nhan_mat_bang}.", False)])
    dat_doan(b[48], [("3.", True), (" {co_quan_dang_tai} có trách nhiệm đăng tải Quyết định này trên trang thông tin điện tử của {ten_xa}.", False)])
    dat_doan(b[49], [("Điều 3.", True), (" Quyết định này có hiệu lực kể từ ngày {ngay_hieu_luc}./.", False)])
    dat_doan(b[50], [("Điều 4.", True), (" {co_quan_thi_hanh} và tổ chức, hộ gia đình, cá nhân có tên tại Phụ lục kèm theo chịu trách nhiệm thi hành Quyết định này./.", False)])
    noi_nhan_ky(b[51], TT["ky_qd"])
    lam_sach(d)
    d.save(RA / "rieng-qd-pa.docx")


def tim(mau):
    return next(NGUON.glob(mau))


to_trinh(tim("*TTr*.docx"))
quyet_dinh(tim("*QD_Phe_duyet*.docx"))
TEP = ["rieng-to-trinh-pa.docx", "rieng-qd-pa.docx"]
for f in TEP:
    dong_goi_lai(RA / f)

# Kiểm tra: không còn tên người, số liệu của hồ sơ gốc; không còn ảnh nhúng
CAM = TT["cam"] + ["@"]
for f in TEP:
    z = zipfile.ZipFile(RA / f)
    anh = [n for n in z.namelist() if n.startswith("word/media/")]
    noi = "\n".join(z.read(n).decode("utf8", "ignore") for n in z.namelist() if n.endswith(".xml"))
    con = [c for c in CAM if re.search(re.escape(c), re.sub(r"<[^>]+>", " ", noi))]
    loi = (f"CÒN: {con} " if con else "") + (f"ẢNH: {anh}" if anh else "")
    print(f, "OK" if not loi else loi)
    if loi:
        raise SystemExit(1)
