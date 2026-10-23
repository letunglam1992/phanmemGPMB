"""
1.2.0 (C2) — Bổ sung mẫu R5 (QĐ phê duyệt phương án của xã, rieng-qd-pa.docx) theo Mẫu số 44 Phụ lục II NĐ 151/2025/NĐ-CP:
  - khoản 11 Điều 1 dẫn khoản 2 Điều 3 NĐ 88/2024/NĐ-CP (phương án chi tiết đối với từng người có đất thu hồi, chủ sở hữu tài sản);
  - Điều 2 thêm khoản 4: trách nhiệm của người có đất thu hồi, chủ sở hữu tài sản (ghi chú 11 Mẫu 44).
Chạy lại được nhiều lần (không thêm trùng). Gọi từ mau-rieng-pa.py sau khi dựng, hoặc chạy riêng:
  python3 tools/mau-van-ban/r5-theo-mau-44.py [đường dẫn rieng-qd-pa.docx]
"""
import copy
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message="Duplicate name")
from docx import Document  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tien_ich_mau import dat_doan, dong_goi_lai  # noqa: E402

K11 = "Phương án chi tiết về bồi thường, hỗ trợ, tái định cư đối với người có đất thu hồi, chủ sở hữu tài sản"
DAN = " theo quy định tại khoản 2 Điều 3 của Nghị định số 88/2024/NĐ-CP ngày 15 tháng 7 năm 2024 của Chính phủ"


def bo_sung(tep):
    d = Document(tep)
    ps = d.paragraphs
    doi = False
    for p in ps:
        if K11 in p.text and "khoản 2 Điều 3" not in p.text:
            dau = p.text.split(K11)[0]
            dat_doan(p._p, [(dau + K11 + DAN, any(r.bold for r in p.runs if r.text.strip()))])
            doi = True
    if not any("{trach_nhiem_nguoi_co_dat}" in p.text for p in ps):
        k3 = next(p for p in ps if "{co_quan_dang_tai}" in p.text)
        moi = copy.deepcopy(k3._p)
        k3._p.addnext(moi)
        dat_doan(moi, [("4.", True), (" {trach_nhiem_nguoi_co_dat}", False)])
        doi = True
    if doi:
        d.save(tep)
        dong_goi_lai(tep)
    return doi


if __name__ == "__main__":
    tep = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "apps/desktop/public/mau-van-ban/rieng-qd-pa.docx"
    print(tep.name, "đã bổ sung" if bo_sung(tep) else "đã có, không đổi")
