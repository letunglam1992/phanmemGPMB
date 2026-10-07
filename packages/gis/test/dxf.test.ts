/** Đọc DXF (0.9.27): tệp dựng trong kiểm thử, không dùng bản đồ thật. */
import { describe, expect, test } from "vitest";
import { chuMtext, docDgn, docDxf, dungThua, giaiMaNhan, LoiDgn, CAU_HINH_MAC_DINH, type PhanTuChu, type PhanTuHinh } from "../src/index.js";

const X0 = 500000, Y0 = 2350000;
const nhom = (...cap: (string | number)[]) => cap.map(String).join("\n");
const lw = (lop: string, pts: [number, number][], kin = true, bulge: Record<number, number> = {}) =>
  nhom(0, "LWPOLYLINE", 8, lop, 90, pts.length, 70, kin ? 1 : 0, ...pts.flatMap(([x, y], i) => [10, X0 + x, 20, Y0 + y, ...(bulge[i] ? [42, bulge[i]!] : [])]));
const text = (lop: string, s: string, x: number, y: number) => nhom(0, "TEXT", 8, lop, 10, X0 + x, 20, Y0 + y, 40, 1.5, 1, s);
function dxf(o: { ver?: string; thucThe: string[]; khoi?: string[]; lop?: string[] }) {
  return [
    nhom(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, o.ver ?? "AC1015", 9, "$INSUNITS", 70, 6, 0, "ENDSEC"),
    nhom(0, "SECTION", 2, "TABLES", 0, "TABLE", 2, "LAYER", ...(o.lop ?? []).flatMap((l) => [0, "LAYER", 2, l, 70, 0, 62, 3]), 0, "ENDTAB", 0, "ENDSEC"),
    nhom(0, "SECTION", 2, "BLOCKS", ...(o.khoi ?? []), 0, "ENDSEC"),
    nhom(0, "SECTION", 2, "ENTITIES", ...o.thucThe, 0, "ENDSEC", 0, "EOF"),
  ].join("\n");
}
const bytes = (s: string, latin = true) => (latin ? Uint8Array.from(s, (c) => c.charCodeAt(0)) : new TextEncoder().encode(s));

describe("Đọc bản đồ DXF", () => {
  test("polyline kín, đường, chữ trên lớp số → dựng thửa như DGN; nhận dạng qua docDgn", () => {
    const s = dxf({
      thucThe: [
        lw("10", [[0, 0], [20, 0], [20, 10], [0, 10]]),
        nhom(0, "LINE", 8, "10", 10, X0 + 10, 20, Y0, 11, X0 + 10, 21, Y0 + 10),
        text("4", "12", 4, 5), text("4", "13", 14, 5), text("5", "7", 4, 3), text("5", "7", 14, 3),
      ],
    });
    const ban = docDgn(bytes(s));
    expect(ban.phanTu.filter((p) => p.loai === "VUNG")).toHaveLength(1);
    const kq = dungThua(ban, CAU_HINH_MAC_DINH);
    expect(kq.thua.map((t) => [t.soTo, t.soThua, Math.round(t.dienTichHinhHoc)]).sort()).toEqual([["7", "12", 100], ["7", "13", 100]]);
  });

  test("lớp tên chữ đánh số từ 1000, giữ tên; 'Level 13' → 13; màu theo lớp; bảng màu ACI", () => {
    const b = docDxf(bytes(dxf({ lop: ["RANH THUA"], thucThe: [lw("RANH THUA", [[0, 0], [1, 0], [1, 1]]), lw("Level 13", [[0, 0], [2, 0], [2, 2]])] })));
    expect(b.tenLop).toEqual({ 13: "Level 13", 1000: "RANH THUA" });
    expect(b.phanTu.map((p) => p.lop)).toEqual([1000, 13]);
    expect(b.phanTu[0]!.mau).toBe(3);
    expect(b.bangMau![1]).toBe("#ff0000");
  });

  test("cung (bulge) — nửa hình tròn bán kính 5: diện tích ≈ 39,27 m²", () => {
    const b = docDxf(bytes(dxf({ thucThe: [lw("10", [[0, 0], [10, 0]], true, { 1: 1 })] })));
    const d = (b.phanTu[0] as PhanTuHinh).diem;
    let s = 0;
    for (let i = 0; i + 1 < d.length; i++) s += d[i]!.x * d[i + 1]!.y - d[i + 1]!.x * d[i]!.y;
    expect(Math.abs(s / 2)).toBeGreaterThan(39);
    expect(Math.abs(s / 2)).toBeLessThan(39.3);
  });

  test("INSERT bung khối (dời, xoay 90°), ATTRIB; MTEXT nhiều dòng là một nút chữ", () => {
    const khoi = [nhom(0, "BLOCK", 8, "0", 2, "O", 70, 0, 10, 0, 20, 0), nhom(0, "LINE", 8, "0", 10, 0, 20, 0, 11, 2, 21, 0), nhom(0, "ENDBLK")];
    const b = docDxf(bytes(dxf({
      khoi,
      thucThe: [
        nhom(0, "INSERT", 8, "20", 66, 1, 2, "O", 10, 100, 20, 200, 50, 90),
        nhom(0, "ATTRIB", 8, "20", 10, 100, 20, 201, 40, 1, 1, "A1", 2, "TAG", 70, 0),
        nhom(0, "SEQEND"),
        nhom(0, "MTEXT", 8, "19", 10, 0, 20, 0, 40, 1, 1, "{\\fArial|b0;7}\\P12\\PB\\U+1EA3n M\\U+00E9"),
      ],
    })));
    const duong = b.phanTu.find((p) => p.loai === "DUONG") as PhanTuHinh;
    expect(duong.lop).toBe(20);
    expect(duong.diem[1]!.x).toBeCloseTo(100);
    expect(duong.diem[1]!.y).toBeCloseTo(202);
    const chu = b.phanTu.filter((p): p is PhanTuChu => p.loai === "CHU");
    expect(chu.map(giaiMaNhan)).toEqual(["A1", "7", "12", "Bản Mé"]);
    expect(new Set(chu.slice(1).map((c) => c.nut)).size).toBe(1);
    expect(chuMtext("a\\Pb")).toEqual(["a", "b"]);
  });

  test("chữ TCVN3 (bản cũ, byte giữ nguyên) và UTF-8 (R2007+)", () => {
    // "Bản" theo TCVN3: B ¶ n (0xB6)
    const cu = docDxf(bytes(dxf({ thucThe: [text("6", "B¶n", 0, 0)] })));
    expect(giaiMaNhan(cu.phanTu[0] as PhanTuChu)).toBe("Bản");
    const moi = docDxf(bytes(dxf({ ver: "AC1032", thucThe: [text("6", "Lò Văn Ánh", 0, 0)] }), false));
    expect(giaiMaNhan(moi.phanTu[0] as PhanTuChu)).toBe("Lò Văn Ánh");
  });

  test("DWG, DXF nhị phân: báo cách đổi; phần tử chưa hỗ trợ: cảnh báo", () => {
    expect(() => docDgn(bytes("AC1032\0\0\0\0\0"))).toThrow(LoiDgn);
    expect(() => docDgn(bytes("AC1032\0\0\0\0\0"))).toThrow(/Save As/);
    expect(() => docDgn(bytes("AutoCAD Binary DXF\r\n\x1a\0xxxx"))).toThrow(/nhị phân/);
    const b = docDxf(bytes(dxf({ thucThe: [nhom(0, "HATCH", 8, "1"), nhom(0, "SPLINE", 8, "1")] })));
    expect(b.canhBao.join()).toMatch(/HATCH \(1\), SPLINE \(1\)/);
  });
});

describe("Nhãn thửa nhiều nội dung, số tờ nhập tay (0.9.27)", () => {
  // Thửa 40 × 32,75 m = 1.310 m²; nhãn như ảnh người dùng gửi: "CLN" | "13" trên "1310,0" | "Lèo Văn Pản" — cùng lớp nhãn thửa
  const thua = (dtChu: string, them: string[] = []) =>
    dxf({ ver: "AC1032", thucThe: [lw("10", [[0, 0], [40, 0], [40, 32.75], [0, 32.75]]), text("13", "CLN", 5, 15), text("13", "13", 15, 17), text("13", dtChu, 14, 12), text("13", "Lèo Văn Pản", 12, 22), ...them] });
  test("loại đất, số thửa, diện tích, chủ sử dụng đọc từ các chữ riêng cùng lớp", () => {
    const t = dungThua(docDgn(bytes(thua("1310,0"), false))).thua[0]!;
    expect([t.loaiDatBanDo, t.soThua, t.dienTichGhi, t.chuSuDung]).toEqual(["CLN", "13", 1310, "Lèo Văn Pản"]);
    expect(t.co).toContain("THIEU_SO_TO");
  });
  test("diện tích số nguyên ('1310') hoặc có phân cách nghìn ('1.310,0')", () => {
    for (const s of ["1310", "1.310,0"]) {
      const t = dungThua(docDgn(bytes(thua(s), false))).thua[0]!;
      expect([t.soThua, t.dienTichGhi]).toEqual(["13", 1310]);
    }
  });
  test("số tờ cán bộ nhập cho tệp dùng khi bản đồ không ghi; bản đồ có số tờ thì giữ số tờ đọc được", () => {
    const ban = docDgn(bytes(thua("1310,0"), false));
    ban.phanTu.forEach((pt) => (pt.soToTep = "21"));
    const t = dungThua(ban).thua[0]!;
    expect([t.soTo, t.soToNhapTay, t.co.includes("THIEU_SO_TO")]).toEqual(["21", true, false]);
    const ban2 = docDgn(bytes(thua("1310,0", [text("5", "7", 20, 5)]), false));
    ban2.phanTu.forEach((pt) => (pt.soToTep = "21"));
    expect(dungThua(ban2).thua[0]!.soTo).toBe("7");
  });
  test("lớp loại đất, diện tích riêng do cán bộ chọn", () => {
    const s = dxf({ thucThe: [lw("10", [[0, 0], [40, 0], [40, 32.75], [0, 32.75]]), text("LOAI DAT", "CLN", 5, 15), text("4", "13", 15, 17), text("DIEN TICH", "1310", 14, 12)] });
    const ban = docDgn(bytes(s));
    const lop = (ten: string) => Number(Object.entries((ban as { tenLop?: Record<number, string> }).tenLop!).find(([, v]) => v === ten)![0]);
    const t = dungThua(ban, { ...CAU_HINH_MAC_DINH, loaiDat: [lop("LOAI DAT")], dienTich: [lop("DIEN TICH")] }).thua[0]!;
    expect([t.loaiDatBanDo, t.soThua, t.dienTichGhi]).toEqual(["CLN", "13", 1310]);
  });
});
