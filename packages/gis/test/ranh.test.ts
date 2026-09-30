/** Ranh GPMB nhập ngoài (docs/08 §9.1): bảng tọa độ mốc, kiểm tra vùng, vùng từ tệp DGN khác, cắt thửa. Dữ liệu tổng hợp. */
import { describe, expect, test } from "vitest";
import { docDgn, docToaDoMoc, dungThua, kiemTraVung, tinhDienTichThuHoi, vungTuLop } from "../src/index.js";
import { ptDuong, vietDgnV8 } from "./viet-dgn-v8.js";

const X0 = 500000, Y0 = 2350000;
const d = (x: number, y: number): [number, number] => [X0 + x, Y0 + y];

describe("Bảng tọa độ mốc", () => {
  test("tiêu đề X, Y theo quy ước VN-2000 (X = Bắc) → đổi trục; số kiểu Việt; nhiều vùng theo cột Vùng", () => {
    const kq = docToaDoMoc([
      ["BẢNG TỌA ĐỘ MỐC GPMB"],
      ["STT", "Tên mốc", "X (m)", "Y (m)", "Vùng"],
      [1, "M1", "2.350.000,00", "500.000,00", "Khu A"],
      [2, "M2", 2350000, 500010, "Khu A"],
      [3, "M3", 2350010, 500010, "Khu A"],
      [4, "M4", 2350010, 500000, "Khu A"],
      [5, "N1", 2350020, 500000, "Khu B"],
      [6, "N2", 2350020, 500005, "Khu B"],
      [7, "N3", 2350025, 500005, "Khu B"],
    ]);
    expect(kq.doiTruc).toBe(true);
    expect(kq.vung.map((v) => v.ten)).toEqual(["Khu A", "Khu B"]);
    expect(kq.vung[0]!.diem[1]).toEqual({ x: 500010, y: 2350000 });
    expect(kiemTraVung(kq.vung[0]!.diem)).toMatchObject({ hopLe: true, dienTich: 100 });
  });

  test("không tiêu đề: hai cột số cuối; dòng trống tách vùng; cột đã là Đông, Bắc thì giữ nguyên", () => {
    const kq = docToaDoMoc([
      ["M1", 500000, 2350000],
      ["M2", 500010, 2350000],
      ["M3", 500010, 2350010],
      [],
      ["P1", 500100, 2350100],
      ["P2", 500110, 2350100],
      ["P3", 500110, 2350110],
    ]);
    expect(kq.doiTruc).toBe(false);
    expect(kq.vung).toHaveLength(2);
    expect(kq.canhBao[0]).toMatch(/Không có tiêu đề X, Y/);
    expect(kiemTraVung(kq.vung[0]!.diem).dienTich).toBeCloseTo(50, 6);
  });

  test("vùng tự cắt, thẳng hàng, thiếu điểm → báo lỗi", () => {
    expect(kiemTraVung([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }]).loi).toMatch(/tự cắt/);
    expect(kiemTraVung([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }]).loi).toMatch(/thẳng hàng/);
    expect(kiemTraVung([{ x: 0, y: 0 }, { x: 5, y: 5 }]).loi).toMatch(/ít nhất 3/);
  });
});

describe("Ranh từ tệp DGN khác và cắt thửa", () => {
  test("vùng khép kín trên lớp chọn; DT thu hồi từng thửa = phần giao; phần còn lại", () => {
    // Bản đồ thửa: 2 ô 10 × 10 m
    const thua = dungThua(docDgn(vietDgnV8([[ptDuong(6, [d(0, 0), d(20, 0), d(20, 10), d(0, 10), d(0, 0)], { lop: 10 }), ptDuong(3, [d(10, 0), d(10, 10)], { lop: 10 })]])), { ranhThua: [10], nhanThua: [], soThua: [], soTo: [], chuSuDung: [], ranhGpmb: [], dienTichToiThieu: 1, lechDienTichChoPhep: 0.05 }).thua;
    expect(thua).toHaveLength(2);
    // Tệp ranh riêng: dải rộng 4 m cắt qua cả hai thửa (lớp 30), lớp 5 là nét khác
    const ban2 = docDgn(vietDgnV8([[ptDuong(6, [d(-5, 3), d(25, 3), d(25, 7), d(-5, 7), d(-5, 3)], { lop: 30 }), ptDuong(3, [d(0, 0), d(5, 5)], { lop: 5 })]]));
    const vung = vungTuLop(ban2, 30);
    expect(vung).toHaveLength(1);
    expect(vung[0]!.dienTich).toBeCloseTo(120, 6);
    expect(vungTuLop(ban2, 5)).toHaveLength(0);
    const kq = tinhDienTichThuHoi(thua, [vung[0]!.vong]);
    expect(kq.map((x) => x.phamVi)).toEqual(["MOT_PHAN", "MOT_PHAN"]);
    expect(kq.map((x) => Math.round(x.dienTichThuHoi * 100) / 100)).toEqual([40, 40]);
    expect(kq.map((x) => Math.round((x.dienTichHinhHoc - x.dienTichThuHoi) * 100) / 100)).toEqual([60, 60]);
  });
});
