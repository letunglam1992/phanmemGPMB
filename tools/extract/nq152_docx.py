"""Trích xuất Bảng giá đất NQ 152/2025/NQ-HĐND từ bản Word (.docx) – nguồn chính.

Bản Word giữ nguyên cấu trúc bảng (ô trống đúng vị trí), nên đây là nguồn ưu tiên thay
cho bản Markdown. Đơn vị giữ nguyên như văn bản: nghìn đồng/m².
"""
import json
import re
import sys
import unicodedata

import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

NUM = re.compile(r"^\d{1,3}(\.\d{3})*$")
LOAI_NN = {"01": ["LUC", "LUK", "HNK"], "02": ["CLN"], "03": ["NTS"], "04": ["RSX"]}
LOAI_PNN = {"05": ("dat_o", "ODT/ONT"), "06": ("dat_tmdv", "TMD"), "07": ("dat_skc", "SKC")}


def clean(s):
    s = unicodedata.normalize("NFC", s or "")
    return re.sub(r"\s+", " ", s).strip()


def num(s):
    return int(s.replace(".", ""))


def rows_of(tb):
    for r in tb.rows:
        cells = []
        for c in r.cells:  # ô gộp ngang lặp lại -> vẫn giữ theo cột để đúng vị trí
            cells.append(clean(c.text))
        yield cells


def extract(path):
    d = docx.Document(path)
    res = {"van_ban": "NQ 152/2025/NQ-HĐND ngày 29/12/2025", "hieu_luc_tu": "2026-01-01",
           "don_vi": "nghìn đồng/m²", "nguon": "Bản Word", "dat_nong_nghiep": [],
           "dat_o": [], "dat_tmdv": [], "dat_skc": [], "dat_kcn_ccn": []}
    bang, xa = None, None
    for el in d.element.body.iterchildren():
        tag = el.tag.split("}")[1]
        if tag == "p":
            t = clean(Paragraph(el, d).text)
            m = re.match(r"^BẢNG 0(\d)", t)
            if m:
                bang, xa = "0" + m.group(1), None
            m = re.match(r"^\d\.(\d+)\.\s*((Xã|Phường)\s+.+)$", t)
            if m:
                xa = m.group(2)
            continue
        if tag != "tbl" or bang is None:
            continue
        nhom, stt_nhom = None, None
        for c in rows_of(Table(el, d)):
            if not c or c[0] in ("STT", "Stt", "TT"):
                continue
            if bang in LOAI_NN:
                if bang == "04":
                    if len(c) >= 3 and NUM.match(c[2]):
                        res["dat_nong_nghiep"].append({"bang": "04", "xa": "Toàn tỉnh", "loai_dat": "RSX", "gia": num(c[2])})
                    continue
                if not re.match(r"^\d+$", c[0]):
                    continue
                for code, v in zip(LOAI_NN[bang], c[2:]):
                    if NUM.match(v):
                        res["dat_nong_nghiep"].append({"bang": bang, "stt": int(c[0]), "xa": c[1], "loai_dat": code, "gia": num(v)})
            elif bang in LOAI_PNN:
                key, loai = LOAI_PNN[bang]
                stt, ten, vals = c[0], c[1], c[2:7]
                if not any(NUM.match(v) for v in vals):
                    if re.match(r"^\d+$", stt):
                        nhom = f"{stt}. {ten}"
                    elif ten:
                        nhom_con = ten  # dòng tiêu đề cấp dưới (vd. tên khu TĐC)
                    continue
                vt = [num(v) if NUM.match(v) else None for v in vals]
                while vt and vt[-1] is None:
                    vt.pop()
                canh_bao = []
                if None in vt:
                    canh_bao.append("Có vị trí trống xen giữa")
                gia = [v for v in vt if v is not None]
                if any(b > a for a, b in zip(gia, gia[1:])):
                    canh_bao.append("Giá vị trí sau cao hơn vị trí trước")
                res[key].append({"bang": bang, "loai_dat": loai, "xa": xa, "stt": stt,
                                 "nhom": nhom if "." in stt or stt in ("-",) else None,
                                 "tuyen": ten, "vt": vt, "so_vi_tri": len(vt), "canh_bao": canh_bao})
            elif bang == "08":
                if len(c) >= 4 and re.match(r"^\d+$", c[0]) and NUM.match(c[3]):
                    res["dat_kcn_ccn"].append({"bang": "08", "loai_dat": "SKK/SKN", "ten": c[1], "xa": c[2], "gia": num(c[3])})
    res["danh_muc_xa"] = sorted({x["xa"] for x in res["dat_nong_nghiep"] if x["xa"] != "Toàn tỉnh"})
    return res


if __name__ == "__main__":
    res = extract(sys.argv[1])
    json.dump(res, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=1)
    for k, v in res.items():
        if isinstance(v, list):
            print(k, len(v))
