"""Trích xuất Phụ lục V (di dời vật nuôi) và Phụ lục VIII (cây trồng, thủy sản) QĐ 106/2025/QĐ-UBND.

PDF gốc có lớp chữ và đường kẻ đầy đủ nên dùng find_tables của PyMuPDF.
Mỗi dòng giữ: biểu, STT, đường dẫn tên nhóm, đơn vị, đơn giá, mật độ (nếu có), trang nguồn.
"""
import json
import re
import sys
import unicodedata

import pymupdf

PRICE = re.compile(r"^\d{1,3}(\.\d{3})*(,\d+)?$")
ROMAN = re.compile(r"^[IVX]+$")
DENSITY = re.compile(r"(\d{1,3}(?:\.\d{3})*)\s*(cây|trụ)/ha")


def clean(s):
    s = (s or "").replace("\n", " ")
    s = re.sub(r"\s+([\u0300-\u036f])", r"\1", s)
    return re.sub(r"\s{2,}", " ", re.sub(r"[\u0300-\u036f]", "", unicodedata.normalize("NFC", s))).strip()


def num(s):
    s = s.replace(".", "")
    return float(s.replace(",", ".")) if "," in s else int(s)


def level(stt):
    if ROMAN.match(stt):
        return 0
    if re.match(r"^[A-Z]$", stt):
        return 1
    if re.match(r"^\d+$", stt):
        return 2
    if re.match(r"^[a-zđ]$", stt):
        return 3
    if stt == "-":
        return 4
    return None


def rows_of(path):
    doc = pymupdf.open(path)
    out, bieu = [], None
    for pno, page in enumerate(doc, 1):
        t = page.get_text()
        m = re.search(r"Biểu số (0\d)", t)
        if m:
            bieu = m.group(1)
        for tab in page.find_tables():
            for r in tab.extract():
                cells = [clean(c) for c in r]
                if not any(cells) or cells[0] in ("STT", "TT"):
                    continue
                out.append((pno, bieu, cells))
    return out


def build(rows, van_ban, phu_luc):
    items, stack = [], {}
    for pno, bieu, c in rows:
        stt, ten = c[0], c[1]
        if not ten and stt:
            continue
        lv = level(stt) if stt else None
        if stt and lv is None:
            continue  # dòng ghi chú cuối bảng
        # định dạng cột: [STT, tên, ĐVT, (mật độ), đơn giá, (ghi chú)]
        prices = [x for x in c[2:] if PRICE.match(x or "")]
        unit = c[2] if len(c) > 2 else ""
        mat_do = None
        if len(c) >= 5 and c[3] and not unit.startswith("Đồng") and PRICE.match(c[3]):
            mat_do = num(c[3])  # hàng tiêu đề nhóm có cột mật độ (Biểu 03)
            prices = []
        if bieu == "04" and len(c) >= 5:
            mat_do = num(c[3]) if c[3] else None
            prices = [c[4]] if PRICE.match(c[4] or "") else []
        elif len(c) >= 5 and unit.startswith("Đồng"):
            prices = [c[4]] if PRICE.match(c[4] or "") else []
        if lv is None and not stt:
            # dòng chú thích thuộc nhóm trước (vd. phân loại gỗ quý hiếm)
            if not prices:
                if stack:
                    k = max(stack)
                    stack[k]["ghi_chu"] = ten
                continue
            lv = 5
        for k in [k for k in stack if k >= lv]:
            del stack[k]
        dms = DENSITY.findall(ten)
        node = {"stt": stt, "ten": ten, "mat_do": mat_do or (num(dms[0][0]) if len(dms) == 1 else None)}
        if len(dms) > 1:  # một nhóm nhiều loài, mỗi loài một mật độ (vd. Mơ, Đào 800; táo 625)
            node["ghi_chu"] = "Nhiều mật độ theo loài – người dùng chọn khi kiểm đếm: " + ten
        stack[lv] = node
        if not prices:
            continue
        chain = [stack[k] for k in sorted(stack)]
        density = next((n["mat_do"] for n in reversed(chain) if n["mat_do"]), None)
        items.append({
            "van_ban": van_ban, "phu_luc": phu_luc, "bieu": bieu,
            "ma": ".".join(n["stt"] for n in chain if n["stt"]),
            "nhom": " > ".join(n["ten"] for n in chain[:-1]),
            "ten": ten, "don_vi": unit.replace("Đồng /", "Đồng/").replace("m2", "m²"),
            "don_gia": num(prices[0]), "mat_do_toi_da": density,
            "ghi_chu_nhom": next((n.get("ghi_chu") for n in chain if n.get("ghi_chu")), None),
            "trang": pno,
        })
    return items


if __name__ == "__main__":
    src, pl, out = sys.argv[1], sys.argv[2], sys.argv[3]
    items = build(rows_of(src), "QĐ 106/2025/QĐ-UBND", pl)
    json.dump(items, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(len(items), "dòng đơn giá")
