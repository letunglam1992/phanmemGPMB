"""Hàm dùng chung cho các script dựng mẫu văn bản riêng của địa phương (mau-rieng.py, mau-rieng-pa.py)."""
import copy

from docx.oxml.ns import qn


def t_elems(el):
    return [t for t in el.iter(qn("w:t"))]


def thay_chu(el, cu, moi):
    """Thay chuỗi trong các w:t (sau khi đã gộp run)."""
    n = 0
    for t in t_elems(el):
        if t.text and cu in t.text:
            t.text = t.text.replace(cu, moi)
            t.set(qn("xml:space"), "preserve")
            n += 1
    if n == 0:
        raise SystemExit(f"Không tìm thấy '{cu}'")


def dat_doan(p, doan):
    """Ghi lại nội dung đoạn: doan = [(chữ, đậm)] — giữ pPr và định dạng run đầu tiên (bỏ hình vẽ)."""
    runs = [r for r in p.findall(qn("w:r"))]
    rpr = None
    for r in runs:
        if r.find(qn("w:t")) is not None:
            rpr = r.find(qn("w:rPr"))
            break
    for c in list(p):
        if c.tag != qn("w:pPr"):
            p.remove(c)
    for chu, dam in doan:
        r = p.makeelement(qn("w:r"), {})
        if rpr is not None:
            rp = copy.deepcopy(rpr)
            for b in rp.findall(qn("w:b")) + rp.findall(qn("w:bCs")):
                rp.remove(b)
            if dam:
                rp.insert(0, rp.makeelement(qn("w:b"), {}))
            r.append(rp)
        elif dam:
            rp = r.makeelement(qn("w:rPr"), {})
            rp.append(rp.makeelement(qn("w:b"), {}))
            r.append(rp)
        t = r.makeelement(qn("w:t"), {})
        t.text = chu
        t.set(qn("xml:space"), "preserve")
        r.append(t)
        p.append(r)


def xoa(*els):
    for e in els:
        e.getparent().remove(e)


def lap(p, ten, doan):
    """Biến đoạn p thành đoạn lặp {#ten}…{/ten} (mỗi phần tử một đoạn)."""
    truoc = copy.deepcopy(p)
    sau = copy.deepcopy(p)
    dat_doan(truoc, [(f"{{#{ten}}}", False)])
    dat_doan(sau, [(f"{{/{ten}}}", False)])
    dat_doan(p, doan)
    p.addprevious(truoc)
    p.addnext(sau)


def noi_nhan_va_ky(tbl, cu_quyen, cu_ten, bo_dong=None):
    """Ô nơi nhận → danh sách lặp; ô ký → {quyen_han}, {nguoi_ky}."""
    tcs = list(tbl.iter(qn("w:tc")))
    for tc in tcs:
        ps = tc.findall(qn("w:p"))
        chu = ["".join(t.text or "" for t in t_elems(p)) for p in ps]
        if chu and chu[0].strip().startswith("Nơi nhận"):
            muc = [p for p, c in zip(ps[1:], chu[1:]) if c.strip()]
            if muc:
                lap(muc[0], "noi_nhan_ds", [("{.}", False)])
                xoa(*muc[1:])
    thay_chu(tbl, cu_quyen, "{quyen_han}")
    thay_chu(tbl, cu_ten, "{nguoi_ky}")
    if bo_dong:
        for p in list(tbl.iter(qn("w:p"))):
            if "".join(t.text or "" for t in t_elems(p)).strip() == bo_dong:
                xoa(p)


def than(doc):
    return list(doc.element.body.iterchildren())


def lam_sach(doc):
    """Xóa ảnh nhúng (tệp gốc có ảnh CHỮ KÝ TAY) và thuộc tính tác giả, email."""
    A = "{http://schemas.openxmlformats.org/drawingml/2006/main}blip"
    R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
    for blip in list(doc.element.body.iter(A)):
        rid = blip.get(R)
        dr = blip
        while dr is not None and dr.tag != qn("w:drawing"):
            dr = dr.getparent()
        if dr is not None:
            dr.getparent().remove(dr)
        if rid and rid in doc.part.rels:
            doc.part.drop_rel(rid)
    cp = doc.core_properties
    cp.author = "GPMB Sơn La"
    cp.last_modified_by = "GPMB Sơn La"
    cp.title = cp.subject = cp.keywords = cp.comments = cp.category = ""


def dong_goi_lai(path):
    """Tệp nguồn (chuyển đổi bằng LibreOffice) khiến python-docx ghi trùng docProps/core.xml → giữ bản cuối."""
    import zipfile

    with zipfile.ZipFile(path) as z:
        muc = {}
        for info in z.infolist():
            muc[info.filename] = (info, z.read(info))
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for ten, (info, du) in muc.items():
            z.writestr(ten, du)


def khoi_phap_ly(p_sau):
    """1.0.7 — Sau đoạn p_sau (thường là {/dt_khong_bt_loai}): khối tùy chọn diện tích thu hồi theo tình trạng pháp lý
    nguồn gốc đất (dữ kiện cán bộ ghi ở từng thửa). Chỉ hiện khi có thửa đã phân loại ({#co_phap_ly})."""
    mau = copy.deepcopy(p_sau)
    doan = [
        ("{#co_phap_ly}", False),
        ("* Phân theo tình trạng pháp lý nguồn gốc đất (theo hồ sơ thửa đất):", False),
        ("{#dt_theo_phap_ly}", False),
        ("+ {ten}: {so_thua} thửa, {dien_tich} m2.", False),
        ("{/dt_theo_phap_ly}", False),
        ("{/co_phap_ly}", False),
    ]
    truoc = p_sau
    for chu, dam in doan:
        p = copy.deepcopy(mau)
        dat_doan(p, [(chu, dam)])
        truoc.addnext(p)
        truoc = p
