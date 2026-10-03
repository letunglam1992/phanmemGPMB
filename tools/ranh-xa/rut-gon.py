"""Rút gọn ranh giới xã, phường (GeoJSON WGS-84) → apps/desktop/public/ban-do/ranh-xa-son-la.json.

Douglas–Peucker theo mét (quy đổi kinh/vĩ độ sang mét cục bộ), dung sai mặc định 2 m; tọa độ làm tròn 6 chữ số thập phân
(~0,1 m). Dùng: python3 tools/ranh-xa/rut-gon.py <tệp.geojson> [dung_sai_m]
"""
import json, math, sys

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    giu = [False] * len(pts)
    giu[0] = giu[-1] = True
    ngan = [(0, len(pts) - 1)]
    while ngan:
        a, b = ngan.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        dmax, imax = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / L if L else math.hypot(px - ax, py - ay)
            if d > dmax:
                dmax, imax = d, i
        if dmax > eps:
            giu[imax] = True
            ngan += [(a, imax), (imax, b)]
    return [p for p, g in zip(pts, giu) if g]

def main():
    nguon = sys.argv[1]
    eps = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    d = json.load(open(nguon, encoding="utf-8"))
    lat0 = 21.3
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110574
    ra, tong_vao, tong_ra = [], 0, 0
    for f in d["features"]:
        g = f["geometry"]
        da_giac = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        moi = []
        for poly in da_giac:
            vongs = []
            for vong in poly:
                m = [(x * kx, y * ky) for x, y in vong]
                r = rdp(m, eps)
                if len(r) < 4:
                    continue
                tong_vao += len(vong); tong_ra += len(r)
                vongs.append([[round(x / kx, 6), round(y / ky, 6)] for x, y in r])
            if vongs:
                moi.append(vongs)
        ra.append({"stt": f["properties"].get("stt"), "ten": f["properties"]["ten"], "da_giac": moi})
    ra.sort(key=lambda x: x["stt"] or 0)
    out = {"mo_ta": "Ranh giới 75 xã, phường tỉnh Sơn La (WGS-84, kinh độ/vĩ độ) — tệp do tác giả cung cấp, rút gọn Douglas–Peucker %g m; chỉ để tham khảo trên bản đồ, không dùng xác định ranh giới pháp lý" % eps, "xa": ra}
    json.dump(out, open("apps/desktop/public/ban-do/ranh-xa-son-la.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(ra)} xã, phường; {tong_vao} → {tong_ra} điểm")

main()
