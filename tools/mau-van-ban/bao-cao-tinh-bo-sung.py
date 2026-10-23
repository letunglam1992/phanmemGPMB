"""
1.2.0 (D2, D3) — Bổ sung mẫu "Báo cáo tổng hợp toàn tỉnh" (apps/desktop/public/mau-van-ban/bao-cao-tong-hop-tinh.docx): mục III
thêm diễn biến đơn khiếu nại, kiến nghị theo tháng và lịch cưỡng chế (ngày, dự án, loại — gói tỉnh không có tên hộ).
Nhân bản đoạn sẵn có của mẫu; chạy lại được nhiều lần: python3 tools/mau-van-ban/bao-cao-tinh-bo-sung.py
"""
import sys
import zipfile
from pathlib import Path

from lxml import etree

TEP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "apps/desktop/public/mau-van-ban/bao-cao-tong-hop-tinh.docx"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
q = lambda t: f"{{{W}}}{t}"
chu = lambda p: "".join(t.text or "" for t in p.iter(q("t")))


def nhan(p, text):
    import copy

    m = copy.deepcopy(p)
    runs = m.findall(q("r"))
    for r in runs[1:]:
        m.remove(r)
    r = runs[0]
    for c in list(r):
        if c.tag != q("rPr"):
            r.remove(c)
    t = etree.SubElement(r, q("t"))
    t.text = text
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    return m


z = zipfile.ZipFile(TEP)
muc = {i.filename: z.read(i) for i in z.infolist()}
z.close()
goc = etree.fromstring(muc["word/document.xml"])
ps = list(goc.iter(q("p")))
if any("{#co_lich_cc}" in chu(p) for p in ps):
    print(TEP.name, "đã có, không đổi")
    raise SystemExit(0)
tim = lambda s: next(p for p in ps if chu(p).strip() == s)
dk = tim("{#co_qua_han}")
van = tim("{kho_khan_khac}")
dong = tim("- {ten}: {noi_dung}")
sau = tim("{/co_qua_han}")
moi = [
    nhan(dk, "{#co_don_thang}"),
    nhan(van, "{cau_don_thang}"),
    nhan(dk, "{/co_don_thang}"),
    nhan(dk, "{#co_lich_cc}"),
    nhan(van, "Lịch cưỡng chế ({so_lich_cc} hồ sơ chưa kết thúc, đơn vị đã ghi ngày dự kiến):"),
    nhan(dk, "{#lich_cc}"),
    nhan(dong, "- {ngay}: {du_an} ({loai})."),
    nhan(dk, "{/lich_cc}"),
    nhan(dk, "{/co_lich_cc}"),
]
for e in reversed(moi):
    sau.addnext(e)
muc["word/document.xml"] = etree.tostring(goc, xml_declaration=True, encoding="UTF-8", standalone=True)
with zipfile.ZipFile(TEP, "w", zipfile.ZIP_DEFLATED) as z:
    for ten, du in muc.items():
        z.writestr(ten, du)
print(TEP.name, "đã bổ sung")
