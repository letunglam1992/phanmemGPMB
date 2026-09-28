/**
 * Phạm vi thu hồi khi bản đồ không có ranh GPMB: lớp vùng thửa đã thu hồi (vd. DC5 lớp 40) và lớp chữ
 * hiện trạng GPMB (vd. DC5 lớp 62 "Đã GPMB" / "Chưa GPMB" / "NQH"). Dữ liệu tổng hợp, không dùng tệp thật.
 */
import { describe, expect, test } from "vitest";
import { docDgn, dungThua, goiYCauHinh, loaiHienTrangBanDo, tenLopPl21, tinhDienTichThuHoi } from "../src/index.js";
import { ptChu, ptDuong, ptNutChu, vietDgnV8 } from "./viet-dgn-v8.js";

const X0 = 500000, Y0 = 2350000;
const d = (x: number, y: number): [number, number] => [X0 + x, Y0 + y];
/** Thửa i (0..5) là ô 10 × 10 m trong lưới 3 × 2. */
const o = (i: number) => ({ x: (i % 3) * 10, y: Math.floor(i / 3) * 10 });
const HIEN_TRANG = ["Đã GPMB", "Đã GPMB", "Chưa GPMB", "Đã GPMB", "Chưa GPMB", "NQH"];
const THU_HOI = [0, 1, 3]; // thửa 1, 2, 4 đã thu hồi → vùng khép kín trên lớp 40

function banDo(o2: { coLop62?: boolean } = {}) {
  const hinh: Uint8Array[] = [
    ptDuong(6, [d(0, 0), d(30, 0), d(30, 20), d(0, 20), d(0, 0)], { lop: 10 }),
    ptDuong(3, [d(0, 10), d(30, 10)], { lop: 10 }),
    ptDuong(3, [d(10, 0), d(10, 20)], { lop: 10 }),
    ptDuong(3, [d(20, 0), d(20, 20)], { lop: 10 }),
  ];
  for (const i of THU_HOI) {
    const { x, y } = o(i);
    hinh.push(ptDuong(6, [d(x, y), d(x + 10, y), d(x + 10, y + 10), d(x, y + 10), d(x, y)], { lop: 40 }));
  }
  const chu: Uint8Array[] = [];
  for (let i = 0; i < 6; i++) {
    const { x, y } = o(i);
    chu.push(ptNutChu({ lop: 19 }));
    ["7", String(i + 1), "Bản Mé", "CLN", `Chủ ${i + 1}`].forEach((c, k) => chu.push(ptChu(c, X0 + x + 3, Y0 + y + 8 - k, { lop: 19, thanhPhan: true, unicode: true })));
    if (o2.coLop62 !== false) chu.push(ptChu(HIEN_TRANG[i]!, X0 + x + 5, Y0 + y + 1.5, { lop: 62, unicode: true }));
  }
  return docDgn(vietDgnV8([hinh, chu]));
}

describe("Nhãn hiện trạng GPMB trên bản đồ", () => {
  test("phân loại chữ: Đã GPMB / Chưa GPMB / NQH, không phân biệt dấu, hoa thường", () => {
    expect(loaiHienTrangBanDo("Đã GPMB")).toBe("DA");
    expect(loaiHienTrangBanDo("da gpmb")).toBe("DA");
    expect(loaiHienTrangBanDo("Chưa GPMB")).toBe("CHUA");
    expect(loaiHienTrangBanDo("NQH")).toBe("CHUA");
    expect(loaiHienTrangBanDo("CLN")).toBeNull();
    expect(loaiHienTrangBanDo(null)).toBeNull();
  });

  test("gợi ý lớp 62 là nhãn hiện trạng, gắn nhãn vào đúng thửa", () => {
    const ban = banDo();
    const g = goiYCauHinh(ban);
    expect(g.cauHinh.nhanHienTrang).toEqual([62]);
    const kq = dungThua(ban, g.cauHinh);
    const theoSo = new Map(kq.thua.map((t) => [t.soThua, t]));
    for (let i = 0; i < 6; i++) expect(theoSo.get(String(i + 1))!.hienTrangBanDo).toBe(HIEN_TRANG[i]);
  });

  test("bản đồ không có lớp hiện trạng: không gợi ý, trường để trống", () => {
    const ban = banDo({ coLop62: false });
    const g = goiYCauHinh(ban);
    expect(g.cauHinh.nhanHienTrang ?? []).toEqual([]);
    expect(dungThua(ban, g.cauHinh).thua.every((t) => t.hienTrangBanDo === undefined)).toBe(true);
  });
});

describe("Lớp vùng thửa đã thu hồi (không có ranh GPMB)", () => {
  test("gợi ý lớp 40 làm phạm vi thu hồi, ghi chú yêu cầu cán bộ xác nhận", () => {
    const ban = banDo();
    const g = goiYCauHinh(ban);
    expect(g.cauHinh.ranhGpmb).toEqual([40]);
    expect(g.ghiChu.join(" ")).toMatch(/lớp 40 có 3 vùng/);
    expect(g.ghiChu.join(" ")).toMatch(/xác nhận/);
  });

  test("hợp nhiều vùng: đúng 3 thửa thu hồi toàn bộ, 300 m²", () => {
    const ban = banDo();
    const g = goiYCauHinh(ban);
    const kq = dungThua(ban, g.cauHinh);
    expect(kq.vungGpmb).toHaveLength(3);
    const th = new Map(tinhDienTichThuHoi(kq.thua, kq.vungGpmb.map((v) => v.vong)).map((x) => [x.ma, x]));
    const trong = kq.thua.filter((t) => {
      const x = th.get(t.ma);
      return x && x.phamVi !== "NGOAI";
    });
    expect(trong.map((t) => t.soThua).sort()).toEqual(["1", "2", "4"]);
    expect(trong.every((t) => th.get(t.ma)!.phamVi === "TOAN_BO")).toBe(true);
    expect(trong.reduce((s, t) => s + th.get(t.ma)!.dienTichThuHoi, 0)).toBeCloseTo(300, 3);
  });

  test("bảng phân lớp PL 21 TT 26/2024: lớp 40 có nghĩa khác (biên giới) → cần cán bộ xác nhận; lớp 62 bỏ trống", () => {
    expect(tenLopPl21(10)).toMatch(/Ranh giới thửa/);
    expect(tenLopPl21(40)).toMatch(/Biên giới/);
    expect(tenLopPl21(62)).toBeNull();
    expect(tenLopPl21(44)).toBeNull(); // bãi bỏ theo điểm b khoản 8 Điều 8 TT 23/2025
  });
});
