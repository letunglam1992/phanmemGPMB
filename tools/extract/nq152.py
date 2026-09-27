"""Trích xuất Bảng giá đất NQ 152/2025/NQ-HĐND (Bảng 01–08) từ bản chuyển đổi Markdown.

Đơn vị trong văn bản: nghìn đồng/m². Dữ liệu xuất giữ nguyên đơn vị nghìn đồng/m²
(trường don_vi) để đối chiếu 1-1 với văn bản; phần mềm quy đổi khi tính.
"""
import json
import re
import sys
import unicodedata

NUM = re.compile(r"^\d{1,3}(\.\d{3})*$")


def clean(s):
    s = re.sub(r"<br>|~~.*?~~|\*\*|_", " ", s or "")
    # bản Markdown: dấu tổ hợp đứng lẻ là rác chuyển đổi, bỏ đi (không ghép vào chữ trước)
    s = re.sub("[\u0300-\u036f]", "", unicodedata.normalize("NFC", s))
    return re.sub(r"\s{2,}", " ", s).strip()


def cells(line):
    s = re.sub(r"~~.*?~~", "", line).strip()  # ký hiệu gạch/đóng dấu lọt vào ô
    s = s[1:] if s.startswith("|") else s
    s = s[:-1] if s.endswith("|") else s
    return [clean(c) for c in s.split("|")]


def num(s):
    return int(s.replace(".", ""))


def parse_nn(path):
    """Bảng 01–04: giá đất nông nghiệp theo xã (một vị trí/xã)."""
    out, bang = [], None
    loai = {"01": ["LUC", "LUK", "HNK"], "02": ["CLN"], "03": ["NTS"], "04": ["RSX"]}
    for line in open(path, encoding="utf8"):
        line = unicodedata.normalize("NFC", line)
        m = re.search(r"BẢNG 0(\d)", line)
        if m:
            bang = "0" + m.group(1)
        if bang == "04" and "Đất rừng sản xuất" in line:
            v = re.search(r"Đất rừng sản xuất\s+(\d+)", line)
            out.append({"bang": "04", "xa": "Toàn tỉnh", "loai_dat": "RSX", "gia": int(v.group(1))})
            continue
        if not line.startswith("|"):
            continue
        c = [x for x in cells(line) if x != ""]
        if len(c) < 3 or not re.match(r"^\d+$", c[0]):
            continue
        vals = [x for x in c[2:] if NUM.match(x)]
        for code, v in zip(loai[bang], vals):
            out.append({"bang": bang, "stt": int(c[0]), "xa": c[1], "loai_dat": code, "gia": num(v)})
    return out


def parse_pnn(path, bang, loai_dat):
    """Bảng 05–07: giá theo xã > tuyến đường > vị trí 1..5."""
    out, xa, nhom, pending = [], None, None, ""
    for line in open(path, encoding="utf8"):
        line = unicodedata.normalize("NFC", line)
        h = re.search(r"\*\*\d\.(\d+)\.\s*(Xã|Phường)\s+([^*#<]+)\*\*", line)
        if h:  # tiêu đề xã có thể nằm lọt trong một ô bảng do lỗi chuyển đổi
            xa, nhom, pending = f"{h.group(2)} {clean(h.group(3))}", None, ""
            continue
        if not line.startswith("|") or xa is None:
            continue
        c = cells(line)
        if not c or c[0] in ("STT",) or "Vị trí" in " ".join(c) or set("".join(c)) <= set("-: "):
            continue
        stt = c[0]
        ten = next((x for x in c[1:3] if x and not NUM.match(x)), "")
        vals = [x for x in c[1:] if NUM.match(x)]
        if not vals:
            if re.match(r"^\d+$", stt):
                nhom, pending = f"{stt}. {ten}", ""
            elif not stt and ten:
                pending = (pending + " " + ten).strip()  # dòng tên bị tách
            continue
        ten = (pending + " " + ten).strip()
        pending = ""
        vt = [num(v) for v in vals[:5]]
        canh_bao = []
        if not re.match(r"^(\d+(\.\d+)*|-|[a-zđ])$", stt):
            canh_bao.append("STT bất thường (có thể gộp 2 hàng)")
        if len(vt) not in (1, 5):
            canh_bao.append(f"Chỉ có {len(vt)} mức giá – kiểm tra vị trí bị trống")
        if any(b > a for a, b in zip(vt, vt[1:])):
            canh_bao.append("Giá vị trí sau cao hơn vị trí trước")
        out.append({"bang": bang, "loai_dat": loai_dat, "xa": xa, "stt": stt, "canh_bao": canh_bao,
                    "nhom": nhom if "." in stt else None, "tuyen": ten,
                    "vt": vt, "so_vi_tri": len(vt)})
    return out


def parse_kcn(path):
    out = []
    for line in open(path, encoding="utf8"):
        line = unicodedata.normalize("NFC", line)
        c = cells(line) if line.startswith("|") else []
        if len(c) >= 4 and re.match(r"^\d+$", c[0]):
            out.append({"bang": "08", "loai_dat": "SKK/SKN", "ten": c[1], "xa": c[2], "gia": num(c[3])})
    return out


if __name__ == "__main__":
    d = json.loads(sys.argv[1])
    res = {"van_ban": "NQ 152/2025/NQ-HĐND ngày 29/12/2025", "hieu_luc_tu": "2026-01-01",
           "don_vi": "nghìn đồng/m²",
           "dat_nong_nghiep": parse_nn(d["nn"]),
           "dat_o": parse_pnn(d["o"], "05", "ODT/ONT"),
           "dat_tmdv": parse_pnn(d["tmd"], "06", "TMD"),
           "dat_skc": parse_pnn(d["skc"], "07", "SKC"),
           "dat_kcn_ccn": parse_kcn(d["kcn"])}
    # chuẩn hóa tên xã về danh mục lấy từ tiêu đề Bảng 05 (sạch hơn cột tên trong bảng)
    key = lambda n: re.sub(r"\s", "", n).lower()
    canon = {key(x["xa"]): x["xa"] for x in res["dat_o"]}
    for k in ("dat_nong_nghiep", "dat_tmdv", "dat_skc", "dat_kcn_ccn"):
        for x in res[k]:
            x["xa"] = canon.get(key(x["xa"]), x["xa"])
    res["danh_muc_xa"] = sorted(set(canon.values()))
    json.dump(res, open(d["out"], "w", encoding="utf8"), ensure_ascii=False, indent=1)
    for k, v in res.items():
        if isinstance(v, list):
            print(k, len(v))
