"""Trích xuất đơn giá QĐ 32/2025/QĐ-UBND (Phụ lục I, II) từ PDF gốc có lớp chữ.

Nguyên tắc: dùng đường kẻ bảng làm ranh giới. Cột TT là ô gộp nhiều hàng (một mã TT
bao nhiều dòng tên), có thể kéo sang trang sau; hàng không có đơn giá là tiêu đề nhóm.
Đầu ra: JSON danh sách dòng đơn giá, mỗi dòng giữ trang nguồn để đối chiếu.
"""
import json
import re
import sys
import unicodedata

import pymupdf

CODE = re.compile(r"^([IVX]+|\d+(\.\d+)*)$")
PRICE = re.compile(r"^\d{1,3}(\.\d{3})*(,\d+)?$")


def rulings(page):
    hs, vs = [], []
    for dr in page.get_drawings():
        for it in dr["items"]:
            if it[0] == "l":
                a, b = it[1], it[2]
                if abs(a.y - b.y) < 1:
                    hs.append((a.y, min(a.x, b.x), max(a.x, b.x)))
                elif abs(a.x - b.x) < 1:
                    vs.append(a.x)
            elif it[0] == "re":
                r = it[1]
                if r.height < 2:
                    hs.append((r.y0, r.x0, r.x1))
                elif r.width < 2:
                    vs.append(r.x0)
    return hs, sorted(set(round(v) for v in vs))


def ys_crossing(hs, x):
    ys = sorted(round(y, 1) for y, x0, x1 in hs if x0 - 1 <= x <= x1 + 1)
    out = []
    for y in ys:
        if not out or y - out[-1] > 2:
            out.append(y)
    return out


def text_in(words, x0, x1, y0, y1):
    ws = [w for w in words if x0 <= (w[0] + w[2]) / 2 <= x1 and y0 < (w[1] + w[3]) / 2 < y1]
    ws.sort(key=lambda w: (round((w[1] + w[3]) / 2), w[0]))
    lines, cur, last = [], [], None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if last is not None and abs(yc - last) > 4:
            lines.append(" ".join(cur))
            cur = []
        cur.append(w[4])
        last = yc
    if cur:
        lines.append(" ".join(cur))
    return lines


def page_bands(page):
    """Trả về danh sách băng hàng: (tt_cell_id, tt_text, ten[], don_vi[], gia[])."""
    hs, vs = rulings(page)
    if len(vs) < 5:
        return []
    c = vs[:5]
    words = page.get_text("words")
    name_ys = ys_crossing(hs, (c[1] + c[2]) / 2)
    tt_ys = ys_crossing(hs, (c[0] + c[1]) / 2)
    out = []
    for y0, y1 in zip(name_ys, name_ys[1:]):
        mid = (y0 + y1) / 2
        cell = next(((a, b) for a, b in zip(tt_ys, tt_ys[1:]) if a - 1 <= mid <= b + 1), None)
        gia = [g for g in text_in(words, c[3], c[4] + 5, y0, y1) if PRICE.match(g)]
        if gia:
            ten = text_in(words, c[1], c[2], y0, y1)
            dv = text_in(words, c[2], c[3], y0, y1)
        else:  # hàng tiêu đề: chữ có thể tràn sang cột đơn vị, đơn giá
            ten = text_in(words, c[1], c[4] + 5, y0, y1)
            dv = []
        if not (ten or gia):
            continue
        tt = " ".join(text_in(words, c[0], c[1], cell[0], cell[1])) if cell else ""
        out.append({"cell": cell, "tt": tt.strip(), "ten": ten, "dv": dv, "gia": gia, "y": y0,
                    "ten_cot": text_in(words, c[1], c[2], y0, y1), "dv_cot": text_in(words, c[2], c[3], y0, y1)})
    return out


def clean(s):
    """Chuẩn hóa Unicode NFC, bỏ khoảng trắng thừa trước dấu thanh tách rời."""
    s = re.sub(r"\s+([\u0300-\u036f])", r"\1", s)
    return re.sub(r"\s{2,}", " ", re.sub(r"[\u0300-\u036f]", "", unicodedata.normalize("NFC", s))).strip()


def num(s):
    s = s.replace(".", "")
    return float(s.replace(",", ".")) if "," in s else int(s)


def norm_unit(parts):
    u = " ".join(parts).replace(" ", "")
    u = u.replace("đồng/m2xd", "đồng/m²xd").replace("đồng/m2sàn", "đồng/m²sàn")
    u = re.sub(r"đồng/m2$", "đồng/m²", u).replace("đồng/m3", "đồng/m³").replace("đồng/mdài", "đồng/m dài")
    return u.replace("đồng/cấukiện", "đồng/cấu kiện").replace("đồng/côngtrình", "đồng/công trình")


def extract(path):
    doc = pymupdf.open(path)
    groups, cur, phu_luc = [], None, "I"
    for pno, page in enumerate(doc, 1):
        text = page.get_text()
        if "Phụ lục II" in text and "Loại công tác" in text:
            phu_luc = "II"
        if "Phụ lục III" in text and "NỘI DUNG ĐƠN GIÁ" in text:
            break
        last_cell, first = None, True
        for b in page_bands(page):
            head = " ".join(b["ten"])
            if head.startswith(("Danh mục nhà", "Loại công tác")) or b["tt"] == "TT":
                continue
            if first and cur and cur["bands"] and not b["tt"] and not b["gia"]:
                # dòng chữ bị ngắt trang: nối vào hàng cuối của trang trước
                prev = cur["bands"][-1]
                if prev["gia"]:
                    prev["ten"] = [" ".join(prev["ten"] + b["ten_cot"])]
                    prev["dv"] = prev["dv"] + b["dv_cot"]
                else:
                    prev["ten"] = [" ".join(prev["ten"] + b["ten"])]
                first, last_cell = False, b["cell"]
                continue
            first = False
            new_cell = b["cell"] != last_cell
            last_cell = b["cell"]
            if new_cell and (b["tt"] or cur is None):
                cur = {"phu_luc": phu_luc, "tt": b["tt"], "bands": [], "trang": pno}
                groups.append(cur)
            b["trang"] = pno
            cur["bands"].append(b)
    return groups


def build(groups):
    items, section, sub = [], "", ""
    for g in groups:
        tt, pl = g["tt"], g["phu_luc"]
        heads = [" ".join(b["ten"]) for b in g["bands"] if not b["gia"]]
        priced = [b for b in g["bands"] if b["gia"]]
        if not priced:
            title = " ".join(heads)
            if re.match(r"^[IVX]+$", tt):
                section, sub = f"{tt}. {title}", ""
            else:
                sub = f"{tt}. {title}"
            continue
        title = " ".join(heads)
        seq = 0
        for b in priced:
            names = b["ten"]
            if len(b["gia"]) > 1 and len(names) != len(b["gia"]):
                names = [" ".join(names)] * len(b["gia"])
            elif len(b["gia"]) == 1:
                names = [" ".join(names)]
            units = [norm_unit(b["dv"])] * len(b["gia"])
            for name, gia, dv in zip(names, b["gia"], units):
                seq += 1
                ten = f"{title} – {name}" if title else name
                items.append({
                    "phu_luc": pl, "tt": tt, "stt_trong_o": seq if len(priced) + len(b["gia"]) > 2 else None,
                    "nhom": clean(section), "nhom_con": clean(sub) if pl == "I" else "", "ten": clean(ten),
                    "don_vi": dv, "don_gia": num(gia), "trang": b["trang"],
                })
    return items


if __name__ == "__main__":
    groups = extract(sys.argv[1])
    items = build(groups)
    json.dump(items, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(len(groups), "ô TT;", len(items), "dòng đơn giá")
