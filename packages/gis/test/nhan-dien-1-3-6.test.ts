/**
 * 1.3.6 — Nhận diện bản đồ trích đo gCadas V8: các tình huống gặp trên 4 tệp thật người dùng cung cấp (đọc tại chỗ, KHÔNG đưa
 * vào kho), dựng lại bằng tệp tổng hợp (họ tên, số liệu giả).
 */
import { describe, expect, test } from "vitest";
import { docDgn, dungThua, goiYCauHinh, nhanDangNutThuocTinh, dienTichGpmbGhi, goiYSoTo, docSoVn, noiDauMut, CAU_HINH_MAC_DINH } from "../src/index.js";
import { ptChu, ptDuong, ptNutChu, vietDgnV8 } from "./viet-dgn-v8.js";

const X0 = 500000, Y0 = 2350000;
const d = (x: number, y: number): [number, number] => [X0 + x, Y0 + y];
const o = (i: number) => ({ x: (i % 3) * 10, y: Math.floor(i / 3) * 10 });
const luoi = (lop = 10) => [
  ptDuong(6, [d(0, 0), d(30, 0), d(30, 20), d(0, 20), d(0, 0)], { lop }),
  ptDuong(3, [d(0, 10), d(30, 10)], { lop }),
  ptDuong(3, [d(10, 0), d(10, 20)], { lop }),
  ptDuong(3, [d(20, 0), d(20, 20)], { lop }),
];
/** Nút thuộc tính trên lớp 12 tại thửa i (dòng đầu ở điểm trong thửa). */
const nut = (dong: string[], x: number, y: number, lop = 12) => [ptNutChu({ lop }), ...dong.map((c, k) => ptChu(c, X0 + x, Y0 + y - k * 0.8, { lop, thanhPhan: true, unicode: true }))];

describe("Nút thuộc tính nhiều trường (bố cục khác nhau giữa các đơn vị đo)", () => {
  test("[thửa, DT, loại, chủ, địa chỉ, ghi chú]: đọc DT trong nút, địa chỉ, ghi chú “Ngoài”", () => {
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) chu.push(...nut([String(i + 1), "100.0", i === 5 ? "ODT" : "HNK", `Lò Văn Thử ${String.fromCharCode(65 + i)}`, "Bản Thử", i % 2 ? "Ngoài" : ""], o(i).x + 3, o(i).y + 8));
    const ban = docDgn(vietDgnV8([luoi(), chu]));
    const n = nhanDangNutThuocTinh(ban)!;
    expect(n.dong).toMatchObject({ soThua: 0, dienTich: 1, loaiDat: 2, chuSuDung: 3, diaChi: 4, ghiChu: 5 });
    const t = dungThua(ban, { ...CAU_HINH_MAC_DINH, nutThuocTinh: n }).thua.sort((a, b) => Number(a.soThua) - Number(b.soThua));
    expect(t).toHaveLength(6);
    expect(t[0]).toMatchObject({ soThua: "1", dienTichGhi: 100, loaiDatBanDo: "HNK", chuSuDung: "Lò Văn Thử A", diaChi: "Bản Thử" });
    expect(t[0]!.co).not.toContain("THIEU_DIEN_TICH_GHI");
    expect(t[1]!.ghiChuBanDo).toBe("Ngoài");
  });

  test("[tờ, thửa, loại, chủ, chủ 2, địa chỉ]: dòng tên thứ hai là người đồng sử dụng", () => {
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) chu.push(...nut(["137", String(i + 1), "ODT+CLN", `Đinh Văn Giả ${"ABCDEF"[i]}`, `Trần Thị Thử ${"ABCDEF"[i]}`, "Tiểu khu Mẫu"], o(i).x + 3, o(i).y + 8));
    const ban = docDgn(vietDgnV8([luoi(), chu]));
    const n = nhanDangNutThuocTinh(ban)!;
    expect(n.dong).toMatchObject({ soTo: 0, soThua: 1, loaiDat: 2, chuSuDung: 3, chuSuDung2: 4, diaChi: 5 });
    const t = dungThua(ban, { ...CAU_HINH_MAC_DINH, nutThuocTinh: n }).thua.find((x) => x.soThua === "1")!;
    expect(t.chuSuDung).toBe("Đinh Văn Giả A");
    expect(t.dongSuDung).toBe("Trần Thị Thử A");
    expect(t.co).not.toContain("NHIEU_CHU");
  });
});

describe("Khép thửa", () => {
  test("thửa nhỏ hơn ngưỡng (2 m²) có nút vẫn giữ; mảnh vụn không nút bị bỏ", () => {
    const hinh = [...luoi(), ptDuong(6, [d(1, 1), d(3, 1), d(3, 2), d(1, 2), d(1, 1)], { lop: 10 }), ptDuong(6, [d(21, 1), d(22, 1), d(22, 2), d(21, 2), d(21, 1)], { lop: 10 })];
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) chu.push(...nut([String(i + 1), "100.0", "HNK", `Chủ Thử ${"ABCDEFGH"[i]}`], o(i).x + 5, o(i).y + 8));
    chu.push(...nut(["99", "2.0", "HNK", "Chủ Nhỏ"], 1.5, 1.8));
    const ban = docDgn(vietDgnV8([hinh, chu]));
    const k = dungThua(ban, { ...CAU_HINH_MAC_DINH, nutThuocTinh: nhanDangNutThuocTinh(ban) });
    const nho = k.thua.find((t) => t.soThua === "99")!;
    expect(nho.dienTichHinhHoc).toBeCloseTo(2, 5);
    expect(k.thongKe.soVungNhoGiuLai).toBe(1);
    expect(k.thua.filter((t) => t.dienTichHinhHoc < 5)).toHaveLength(1);
  });

  test("ranh hở 2 cm: không nối thì mất thửa và báo đầu mút treo; nối theo dung sai 5 cm thì dựng đủ", () => {
    const hinh = [
      ptDuong(4, [d(0, 0), d(20, 0), d(20, 20), d(0, 20), d(0, 0.02)], { lop: 10 }),
      ptDuong(3, [d(10, 0), d(10, 20)], { lop: 10 }),
    ];
    const ban = docDgn(vietDgnV8([hinh]));
    const k0 = dungThua(ban, CAU_HINH_MAC_DINH);
    expect(k0.thua).toHaveLength(1);
    expect(k0.dauTreo!.length).toBeGreaterThan(0);
    expect(k0.dauTreo!.some((p) => Math.hypot(p.x - X0, p.y - (Y0 + 0.02)) < 1e-6)).toBe(true);
    const k1 = dungThua(ban, { ...CAU_HINH_MAC_DINH, dungSaiNoi: 0.05 });
    expect(k1.thua).toHaveLength(2);
    expect(k1.thongKe.soNoi).toBeGreaterThanOrEqual(1);
    expect(k1.dauTreo).toHaveLength(0);
  });

  test("noiDauMut không đổi đường đã khép, không nối khi vượt dung sai", () => {
    const l = [[{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 5, y: 0.5 }, { x: 5, y: 5 }]];
    expect(noiDauMut(l, 0.2).soNoi).toBe(0);
    expect(noiDauMut(l, 0.6).soNoi).toBe(1);
  });

  test("ranh thửa ở nhiều lớp, ranh GPMB tự khép là cạnh thửa: thêm vào ranh thửa và GIỮ làm ranh GPMB", () => {
    // thửa 0..5 nằm trong ranh GPMB (lớp 30) — cạnh ngoài của lưới chỉ có ở lớp 30
    const hinh = [
      ptDuong(6, [d(0, 0), d(30, 0), d(30, 20), d(0, 20), d(0, 0)], { lop: 30 }),
      ptDuong(3, [d(0, 10), d(30, 10)], { lop: 10 }),
      ptDuong(3, [d(10, 0), d(10, 20)], { lop: 10 }),
      ptDuong(3, [d(20, 0), d(20, 20)], { lop: 10 }),
    ];
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) chu.push(...nut(["7", String(i + 1), "HNK", `Chủ Thử ${"ABCDEFGH"[i]}`], o(i).x + 3, o(i).y + 8));
    chu.push(ptChu("* Tổng diện đo đạc GPMB: 600,0 m2", X0 + 50, Y0 + 50, { lop: 63, unicode: true }));
    const ban = docDgn(vietDgnV8([hinh, chu]));
    const g = goiYCauHinh(ban);
    expect([...g.cauHinh.ranhThua].sort()).toEqual([10, 30]);
    expect(g.cauHinh.ranhGpmb).toEqual([30]);
    expect(g.ghiChu.join(" ")).toMatch(/Lớp 30 khép được vùng 600 m², khớp diện tích ghi/);
    expect(g.dienTichGpmbGhi?.dienTich).toBe(600);
    expect(dungThua(ban, g.cauHinh).thua.filter((t) => t.soThua)).toHaveLength(6);
  });

  test("lớp ký hiệu nhãn (vòng tròn quanh số thửa) không bị thêm vào ranh thửa", () => {
    const hinh = [...luoi()];
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) {
      const { x, y } = o(i);
      hinh.push(ptDuong(6, [d(x + 2, y + 6), d(x + 4, y + 6), d(x + 4, y + 8), d(x + 2, y + 8), d(x + 2, y + 6)], { lop: 11, thanhPhan: true }));
      chu.push(...nut(["7", String(i + 1), "HNK", `Chủ Thử ${"ABCDEFGH"[i]}`], x + 3, y + 7));
    }
    // một thửa thiếu cạnh để kích hoạt bổ sung lớp
    const g = goiYCauHinh(docDgn(vietDgnV8([hinh.filter((_, i) => i !== 3), chu])));
    expect(g.cauHinh.ranhThua).not.toContain(11);
  });
});

describe("Thông tin ở khung tờ", () => {
  test("đọc số kiểu Việt; diện tích trong phạm vi GPMB (bỏ dòng ngoài phạm vi; số tách dòng trong nút)", () => {
    expect(docSoVn("156.361,2")).toBe(156361.2);
    expect(docSoVn("382667,0")).toBe(382667);
    const chu = [
      ...nut(["* Tổng diện tích đo đạc là: 2.000,0 m", "- Diện tích trong phạm vi GPMB: 1.500,5 m", "- Diện tích ngoài phạm vi GPMB: 499,5 m"], 100, 100, 61),
    ];
    expect(dienTichGpmbGhi(docDgn(vietDgnV8([chu])))?.dienTich).toBe(1500.5);
    const tach = nut(["1.", "Diện tích trong phạm vi GPMB là:", "382.667,0", "m²"], 100, 100, 48);
    expect(dienTichGpmbGhi(docDgn(vietDgnV8([tach])))?.dienTich).toBe(382667);
  });

  test("lớp tô thửa NGOÀI phạm vi: phần còn lại khớp diện tích ghi → gợi ý chọn các thửa còn lại", () => {
    const hinh = [...luoi()];
    for (const i of [0, 1, 2]) {
      const { x, y } = o(i);
      hinh.push(ptDuong(6, [d(x, y), d(x + 10, y), d(x + 10, y + 10), d(x, y + 10), d(x, y)], { lop: 40 }));
    }
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) chu.push(...nut(["7", String(i + 1), "HNK", `Chủ Thử ${"ABCDEFGH"[i]}`], o(i).x + 3, o(i).y + 8));
    chu.push(...nut(["- Diện tích trong phạm vi GPMB: 300,0 m"], 100, 100, 61));
    const g = goiYCauHinh(docDgn(vietDgnV8([hinh, chu])));
    expect(g.lopThuaNgoai).toMatchObject({ lop: 40, soThuaTrong: 3 });
    expect(g.ghiChu.join(" ")).toMatch(/Lớp 40 tô các thửa NGOÀI phạm vi GPMB: 3 thửa còn lại/);
    expect(g.cauHinh.ranhGpmb).not.toContain(40);
  });

  test("gợi ý số tờ: số hiệu mảnh trùng tên tệp; chỉ theo tên tệp", () => {
    const ban = docDgn(vietDgnV8([[ptChu("TĐ18-2026", X0, Y0, { lop: 63, unicode: true }), ptChu("TĐ19-2026", X0, Y0 + 5, { lop: 61, unicode: true })]]));
    expect(goiYSoTo(ban, "TD18_2026.dgn")).toEqual({ soTo: "TĐ18-2026", nguon: "số hiệu mảnh ghi trên bản vẽ, trùng tên tệp" });
    expect(goiYSoTo(ban, "")).toBeNull();
    expect(goiYSoTo(docDgn(vietDgnV8([[ptChu("x", X0, Y0, { lop: 1, unicode: true })]])), "In TD48-2026.dgn")?.soTo).toBe("TĐ48-2026");
  });
});

describe("Nhãn lạ, nút lệch ra ngoài thửa", () => {
  test("chữ ở vị trí loại đất không phải ký hiệu → cờ LOAI_DAT_LA, giữ nguyên chữ", () => {
    const ban = docDgn(vietDgnV8([[ptDuong(6, [d(0, 0), d(20, 0), d(20, 20), d(0, 20), d(0, 0)], { lop: 10 }), ptChu("Mương", X0 + 5, Y0 + 8, { lop: 13, unicode: true }), ptChu("12", X0 + 5, Y0 + 5, { lop: 13, unicode: true }), ptChu("400.0", X0 + 5, Y0 + 3, { lop: 13, unicode: true })]]));
    const t = dungThua(ban).thua[0]!;
    expect(t.loaiDatBanDo).toBe("Mương");
    expect(t.co).toContain("LOAI_DAT_LA");
  });

  test("nút đặt sát ngoài thửa (≤ 2 m) → gán cho thửa gần nhất chưa có nút, cờ GAN_THEO_KHOANG_CACH; xa hơn thì không gán", () => {
    const chu: Uint8Array[] = [];
    for (let i = 0; i < 5; i++) chu.push(...nut(["7", String(i + 1), "HNK", `Chủ Thử ${"ABCDEFGH"[i]}`], o(i).x + 3, o(i).y + 8));
    chu.push(...nut(["7", "6", "HNK", "Chủ Lệch"], 31, 18)); // thửa 6 (20..30, 10..20): nút lệch ra ngoài 1 m
    const ban = docDgn(vietDgnV8([luoi(), chu]));
    const k = dungThua(ban, { ...CAU_HINH_MAC_DINH, nutThuocTinh: nhanDangNutThuocTinh(ban) });
    const t = k.thua.find((x) => x.soThua === "6")!;
    expect(t.chuSuDung).toBe("Chủ Lệch");
    expect(t.co).toContain("GAN_THEO_KHOANG_CACH");
    const xa = [...chu.slice(0, -5), ...nut(["7", "6", "HNK", "Chủ Lệch"], 35, 18)];
    const k2 = dungThua(docDgn(vietDgnV8([luoi(), xa])), { ...CAU_HINH_MAC_DINH, nutThuocTinh: nhanDangNutThuocTinh(docDgn(vietDgnV8([luoi(), xa]))) });
    expect(k2.thua.find((x) => x.soThua === "6")).toBeUndefined();
  });
});

describe("Ranh GPMB dạng tuyến", () => {
  test("hai nét mép tuyến không khép đầu → vùng nối hai đầu (NOI_HAI_DAU); nét đã khép thì không nối", async () => {
    const { khepHaiDau } = await import("../src/index.js");
    const ban = docDgn(vietDgnV8([[...luoi(), ptDuong(4, [d(-20, 4), d(15, 4), d(60, 5)], { lop: 30 }), ptDuong(4, [d(-20, 14), d(15, 14), d(60, 15)], { lop: 30 })]]));
    const v = dungThua(ban).vungGpmb;
    expect(v).toHaveLength(1);
    expect(v[0]!.nguon).toBe("NOI_HAI_DAU");
    expect(v[0]!.dienTich).toBeCloseTo(800, 0);
    // đoạn nối dài hơn 1/4 nét ngắn → không nối
    expect(khepHaiDau([[{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 0, y: 30 }, { x: 10, y: 30 }]])).toBeNull();
    const kin = docDgn(vietDgnV8([[...luoi(), ptDuong(6, [d(-5, -5), d(35, -5), d(35, 25), d(-5, 25), d(-5, -5)], { lop: 30 })]]));
    expect(dungThua(kin).vungGpmb.every((x) => x.nguon !== "NOI_HAI_DAU")).toBe(true);
  });
});

describe("Dò lớp tổng quát (tệp DXF đặt tên lớp, không theo số lớp mặc định)", () => {
  test("lớp RANH_THUA / NHAN_THUA / TEN_CHU / RANH_GPMB → dựng đủ thửa; ranh tuyến hai nét được khép hai đầu", async () => {
    const { docDxf } = await import("../src/index.js");
    const L: string[] = ["0", "SECTION", "2", "ENTITIES"];
    const line = (l: string, x1: number, y1: number, x2: number, y2: number) => L.push("0", "LINE", "8", l, "10", String(x1), "20", String(y1), "11", String(x2), "21", String(y2));
    const text = (l: string, x: number, y: number, s: string) => L.push("0", "TEXT", "8", l, "10", String(x), "20", String(y), "40", "1.5", "1", s);
    for (let i = 0; i < 6; i++) {
      const x = X0 + (i % 3) * 30, y = Y0 + Math.floor(i / 3) * 40;
      line("RANH_THUA", x, y, x + 30, y); line("RANH_THUA", x + 30, y, x + 30, y + 40); line("RANH_THUA", x + 30, y + 40, x, y + 40); line("RANH_THUA", x, y + 40, x, y);
      text("NHAN_THUA", x + 5, y + 10, `LUC ${i + 1}/1200.0`);
      text("TEN_CHU", x + 5, y + 25, `Lo Van ${"ABCDEF"[i]}`);
    }
    line("RANH_GPMB", X0 - 5, Y0 + 15, X0 + 195, Y0 + 15);
    line("RANH_GPMB", X0 - 5, Y0 + 55, X0 + 195, Y0 + 55);
    L.push("0", "ENDSEC", "0", "EOF");
    const ban = docDxf(new TextEncoder().encode(L.join("\n") + "\n"));
    expect(dungThua(ban).thua).toHaveLength(0); // cấu hình mặc định (lớp 10, 13…) không dựng được thửa nào
    const g = goiYCauHinh(ban);
    expect(g.ghiChu.join(" ")).toMatch(/dò theo nội dung: lớp \d+ \(“RANH_THUA”\) là ranh thửa/);
    const k = dungThua(ban, g.cauHinh);
    expect(k.thua).toHaveLength(6);
    expect(k.thua.every((t) => t.soThua && t.loaiDatBanDo === "LUC" && t.dienTichGhi === 1200 && t.chuSuDung)).toBe(true);
    expect(k.vungGpmb.map((v) => v.nguon)).toEqual(["NOI_HAI_DAU"]);
    expect(k.vungGpmb[0]!.dienTich).toBeCloseTo(8000, 0);
  });
});
