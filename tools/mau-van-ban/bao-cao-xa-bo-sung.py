"""
1.2.0 (D2) — Bổ sung mẫu "Báo cáo tổng hợp" cấp xã (apps/desktop/public/mau-van-ban/bao-cao-tong-hop.docx) — mẫu đang dùng đã
được sửa trực tiếp (xem ghi chú đầu tools/mau-van-ban/mau-bao-cao.cjs), nên thêm đoạn bằng cách nhân bản đoạn sẵn có:
  - mục I: "Tiến độ theo tháng" (câu so sánh + chỗ đặt biểu đồ [[BIEU_DO_TIEN_DO]]);
  - mục II: đơn khiếu nại, kiến nghị quá hạn; lịch cưỡng chế.
Chạy lại được nhiều lần (không thêm trùng): python3 tools/mau-van-ban/bao-cao-xa-bo-sung.py
"""
import copy
import sys
import zipfile
from pathlib import Path

from lxml import etree

TEP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "apps/desktop/public/mau-van-ban/bao-cao-tong-hop.docx"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
q = lambda t: f"{{{W}}}{t}"


def chu(p):
    return "".join(t.text or "" for t in p.iter(q("t")))


def nhan(p, text, dam=None, nghieng=None):
    """Bản sao đoạn p với nội dung text (một run, giữ định dạng run đầu)."""
    m = copy.deepcopy(p)
    runs = m.findall(q("r"))
    for r in runs[1:]:
        m.remove(r)
    r = runs[0]
    for c in list(r):
        if c.tag != q("rPr"):
            r.remove(c)
    rpr = r.find(q("rPr"))
    if rpr is None:
        rpr = etree.SubElement(r, q("rPr"))
        r.remove(rpr)
        r.insert(0, rpr)
    for ten, bat in (("b", dam), ("i", nghieng)):
        if bat is None:
            continue
        for e in rpr.findall(q(ten)):
            rpr.remove(e)
        if bat:
            rpr.append(etree.Element(q(ten)))
    t = etree.SubElement(r, q("t"))
    t.text = text
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    return m


z = zipfile.ZipFile(TEP)
muc = {i.filename: z.read(i) for i in z.infolist()}
z.close()
goc = etree.fromstring(muc["word/document.xml"])
body = goc.find(q("body"))
ps = list(body.iter(q("p")))
tim = lambda s: next(p for p in ps if chu(p).strip() == s)
if any("{#co_tien_do_thang}" in chu(p) for p in ps):
    print(TEP.name, "đã có, không đổi")
    raise SystemExit(0)

dk = tim("{#co_dot}")  # đoạn điều khiển (ẩn khi điền)
tieu = next(p for p in ps if chu(p).strip().startswith("3. Kết quả theo đợt thu hồi"))
van = tim("{kho_khan_khac}")
dong = next(p for p in ps if chu(p).strip().startswith("- {du_an} – {ma} {ten}"))

# Mục I — tiến độ theo tháng (sau {/co_dot})
sau = tim("{/co_dot}")
moi = [
    nhan(dk, "{#co_tien_do_thang}"),
    nhan(tieu, "Tiến độ theo tháng"),
    nhan(van, "{cau_tien_do_thang}"),
    nhan(van, "[[BIEU_DO_TIEN_DO]]"),
    nhan(van, "{/co_tien_do_thang}"),
]
for e in reversed(moi):
    sau.addnext(e)

# Mục II — đơn quá hạn, lịch cưỡng chế (sau {/co_ho_vuong_mac})
sau = tim("{/co_ho_vuong_mac}")
moi = [
    nhan(dk, "{#co_don_qua_han}"),
    nhan(van, "Đơn khiếu nại, kiến nghị quá hạn thụ lý, giải quyết: {so_don_qua_han} đơn"),
    nhan(dk, "{#don_qua_han}"),
    nhan(dong, "- {du_an} – {ho}: {don} ({tinh_trang}, hạn {han})."),
    nhan(dk, "{/don_qua_han}"),
    nhan(dk, "{/co_don_qua_han}"),
    nhan(dk, "{#co_lich_cc}"),
    nhan(van, "Lịch cưỡng chế (hồ sơ chưa kết thúc, có ngày dự kiến):"),
    nhan(dk, "{#lich_cc}"),
    nhan(dong, "- {ngay}: {du_an} – {ho} ({loai}); đề nghị Công an bảo đảm trật tự gửi chậm nhất {han_cong_an}{luu_y}."),
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
