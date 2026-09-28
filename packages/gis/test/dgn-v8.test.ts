/**
 * DGN V8 (MicroStation V8/V8i) trên tệp tổng hợp do test/viet-dgn-v8.ts tạo — không dùng dữ liệu thật.
 * Tệp thật (gCadas, có họ tên chủ sử dụng) chỉ kiểm khi có biến môi trường GPMB_DGN_V8 (xem cuối tệp).
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  docCfb,
  docDgn,
  dungThua,
  goiYCauHinh,
  giaiMaNhan,
  laCfb,
  LoiCfb,
  LoiDgn,
  nhanDangNutThuocTinh,
  thongKeLop,
  CAU_HINH_MAC_DINH,
  type PhanTuChu,
} from "../src/index.js";
import { ptChu, ptDuong, ptKieu, ptNutChu, ptPhuc, vietCfb, vietDgnV8 } from "./viet-dgn-v8.js";

describe("Tệp ghép CFB", () => {
  test("đọc lại luồng nhỏ (mini stream) và luồng lớn (FAT), kho lồng nhau", () => {
    const nho = Uint8Array.from({ length: 700 }, (_, i) => (i * 7) & 0xff);
    const lon = Uint8Array.from({ length: 9000 }, (_, i) => (i * 13 + 5) & 0xff);
    const t = docCfb(vietCfb({ "A/nho": nho, "A/B/lon": lon, "rong": new Uint8Array(0) }));
    expect(t.dsLuong.sort()).toEqual(["A/B/lon", "A/nho", "rong"]);
    expect(t.doc("A/nho")).toEqual(nho);
    expect(t.doc("A/B/lon")).toEqual(lon);
    expect(t.doc("rong")).toEqual(new Uint8Array(0));
    expect(t.doc("khong/co")).toBeNull();
  });

  test("nhận dạng chữ ký, báo lỗi tệp hỏng", () => {
    expect(laCfb(vietCfb({ x: new Uint8Array(3) }))).toBe(true);
    expect(laCfb(new Uint8Array([0x08, 0x09, 0xfe, 0x02]))).toBe(false);
    expect(() => docCfb(new Uint8Array(600))).toThrow(LoiCfb);
    const hong = vietCfb({ "A/nho": new Uint8Array(100) });
    hong[30] = 3; // cỡ sector 8 byte
    expect(() => docCfb(hong)).toThrow(LoiCfb);
  });
});

/* Bản đồ thử: lưới 3 × 2 ô vuông 10 m (6 thửa 100 m²) quanh gốc VN-2000 giả định (500000; 2350000). */
const X0 = 500000, Y0 = 2350000;
const d = (x: number, y: number): [number, number] => [X0 + x, Y0 + y];
const TEN = ["Lò Văn An", "Cầm Thị Bình", "Quàng Văn Chung", "Lường Thị Dung", "Tòng Văn Én", "Vì Thị Gấm"];

function banDoThu(o: { chuMauThuan?: boolean } = {}) {
  const ranh: Uint8Array[] = [
    ptDuong(4, [d(0, 0), d(30, 0), d(30, 20)], { lop: 10 }),
    // chuỗi phức 2 thành phần: đường trên + cạnh trái
    ptPhuc(12, 2, { lop: 10 }),
    ptDuong(3, [d(30, 20), d(0, 20)], { lop: 10, thanhPhan: true }),
    ptDuong(3, [d(0, 20), d(0, 0)], { lop: 10, thanhPhan: true }),
    ptDuong(3, [d(0, 10), d(30, 10)], { lop: 10 }),
    ptDuong(3, [d(10, 0), d(10, 20)], { lop: 10 }),
    ptDuong(3, [d(20, 0), d(20, 20)], { lop: 10 }),
    // ranh GPMB: vùng khép kín bao 2 cột trái
    ptDuong(6, [d(-1, -1), d(20, -1), d(20, 21), d(-1, 21), d(-1, -1)], { lop: 30 }),
  ];
  const nhan: Uint8Array[] = [];
  for (let i = 0; i < 6; i++) {
    const cx = (i % 3) * 10 + 5, cy = Math.floor(i / 3) * 10 + 5;
    nhan.push(ptNutChu({ lop: 19 }));
    const dong = ["7", String(i + 1), "Bản Mé", i % 2 ? "CLN" : "ONT", TEN[i]!];
    dong.forEach((c, k) => nhan.push(ptChu(c, X0 + cx - 2, Y0 + cy + 3 - k, { lop: 19, thanhPhan: true, unicode: true })));
    nhan.push(ptChu("100,0", X0 + cx + 2, Y0 + cy - 3, { lop: 13 }));
    const chu = o.chuMauThuan && i === 2 ? "Người Khác" : TEN[i]!;
    nhan.push(ptChu(chu, X0 + cx, Y0 + cy - 4, { lop: 54, unicode: true }));
  }
  // chữ 8 bit (ASCII) + phần tử điều khiển
  nhan.push(ptChu("Suoi", X0 + 15, Y0 + 25, { lop: 39 }));
  nhan.push(ptKieu(17, 176, { lop: 64 })); // kiểu 17 không có dấu chữ: phần tử điều khiển
  const khac = [ptDuong(3, [d(0, 0), d(1, 1)], { lop: 11 }, 3), ptKieu(16, 200, { lop: 11 })];
  return vietDgnV8([ranh, [...nhan, ...khac]]);
}

describe("DGN V8", () => {
  test("đọc đơn vị, gốc, phần tử; gộp chuỗi phức; cảnh báo phần tử chưa hỗ trợ", () => {
    const ban = docDgn(banDoThu());
    expect(ban.tcb).toMatchObject({ soChieu: 2, uorTrenSu: 1000, heSo: 0.001 });
    const phuc = ban.phanTu.find((p) => p.loai === "CHUOI_PHUC");
    expect(phuc && "diem" in phuc ? phuc.diem.map((q) => [q.x, q.y]) : null).toEqual([[X0 + 30, Y0 + 20], [X0, Y0 + 20], [X0, Y0]]);
    expect(ban.phanTu.filter((p) => p.laThanhPhan && p.loai !== "CHU")).toHaveLength(0); // thành phần hình đã gộp
    const chu = ban.phanTu.filter((p): p is PhanTuChu => p.loai === "CHU");
    expect(chu.map(giaiMaNhan)).toContain("Quàng Văn Chung");
    expect(chu.map(giaiMaNhan)).toContain("Suoi");
    expect(chu.filter((c) => c.nut !== undefined)).toHaveLength(30);
    expect(ban.canhBao.join(" ")).toMatch(/1 phần tử 3D/);
    expect(ban.canhBao.join(" ")).toMatch(/1 cung tròn/);
    expect(ban.canhBao.join(" ")).not.toMatch(/lệch/);
  });

  test("nhận dạng nút thuộc tính gCadas và lớp chủ đứng riêng; dựng thửa đủ tờ/thửa/loại/chủ", () => {
    const ban = docDgn(banDoThu());
    expect(nhanDangNutThuocTinh(ban)).toMatchObject({ lop: [19], dong: { soTo: 0, soThua: 1, loaiDat: 3, chuSuDung: 4 }, soNut: 6 });
    const g = goiYCauHinh(ban);
    expect(g.cauHinh.chuSuDung).toEqual([54]);
    expect(g.ghiChu.join(" ")).toMatch(/lớp 19/);
    const kq = dungThua(ban, g.cauHinh);
    expect(kq.thua).toHaveLength(6);
    const theoSo = new Map(kq.thua.map((t) => [t.soThua, t]));
    for (let i = 0; i < 6; i++) {
      const t = theoSo.get(String(i + 1))!;
      expect(t).toMatchObject({ soTo: "7", chuSuDung: TEN[i], loaiDatBanDo: i % 2 ? "CLN" : "ONT", dienTichGhi: 100 });
      expect(t.dienTichHinhHoc).toBeCloseTo(100, 6);
      expect(t.co).toEqual([]);
    }
    expect(kq.vungGpmb).toHaveLength(1);
    expect(kq.vungGpmb[0]!.dienTich).toBeCloseTo(21 * 22, 6);
  });

  test("tên chủ trong nút khác nhãn chủ đứng riêng → gắn cờ Nhiều chủ để cán bộ kiểm tra", () => {
    const ban = docDgn(banDoThu({ chuMauThuan: true }));
    const kq = dungThua(ban, goiYCauHinh(ban).cauHinh);
    const t3 = kq.thua.find((t) => t.soThua === "3")!;
    expect(t3.nhan.map((n) => n.chu)).toEqual(expect.arrayContaining(["Quàng Văn Chung", "Người Khác"]));
    expect(t3.co).toContain("NHIEU_CHU");
  });

  test("cấu hình mặc định (không nút): thiếu số tờ/chủ được gắn cờ; thống kê lớp", () => {
    const ban = docDgn(banDoThu());
    const kq = dungThua(ban, CAU_HINH_MAC_DINH);
    expect(kq.thua.every((t) => t.co.includes("THIEU_SO_TO"))).toBe(true);
    const tk = new Map(thongKeLop(ban).map((x) => [x.lop, x]));
    expect(tk.get(19)).toMatchObject({ soChu: 30, soNut: 6 });
    expect(tk.get(10)!.soDuong).toBeGreaterThan(0);
    expect(tk.get(30)).toMatchObject({ soVung: 1 });
  });

  test("tệp ghép OLE không phải DGN V8 → báo lỗi rõ ràng", () => {
    expect(() => docDgn(vietCfb({ WordDocument: new Uint8Array(10) }))).toThrow(LoiDgn);
  });
});

const tep = process.env.GPMB_DGN_V8;
describe.skipIf(!tep || !existsSync(tep))("Tệp DGN V8i thật (GPMB_DGN_V8)", () => {
  test("đọc đủ phần tử, khép thửa, nhận nút thuộc tính", () => {
    const ban = docDgn(readFileSync(tep!));
    expect(ban.canhBao.join(" ")).not.toMatch(/lệch/);
    const g = goiYCauHinh(ban);
    expect(g.cauHinh.nutThuocTinh).toBeTruthy();
    const kq = dungThua(ban, g.cauHinh);
    const coSoTo = kq.thua.filter((t) => t.soTo).length;
    expect(coSoTo / kq.thua.length).toBeGreaterThan(0.9);
    // Tệp mẫu DC5 (74 thửa, 64 có nhãn diện tích): diện tích ghi khớp hình học trong 0,1% (lớn nhất 0,38 m² / 1.490,7 m²)
    const coDt = kq.thua.filter((t) => t.dienTichGhi !== null);
    expect(coDt.length / kq.thua.length).toBeGreaterThan(0.8);
    expect(coDt.filter((t) => Math.abs(t.dienTichGhi! - t.dienTichHinhHoc) / t.dienTichHinhHoc > 0.001)).toHaveLength(0);
  });

  test("không có ranh GPMB: gợi ý lớp 40 (thửa đã thu hồi) và lớp 62 (nhãn hiện trạng)", () => {
    const ban = docDgn(readFileSync(tep!));
    const g = goiYCauHinh(ban);
    expect(g.cauHinh.ranhGpmb).toEqual([40]);
    expect(g.cauHinh.nhanHienTrang).toEqual([62]);
    const kq = dungThua(ban, g.cauHinh);
    expect(kq.vungGpmb.length).toBeGreaterThanOrEqual(10);
    expect(kq.thua.filter((t) => t.hienTrangBanDo).length).toBeGreaterThan(40);
  });
});
