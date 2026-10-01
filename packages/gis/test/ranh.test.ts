/** Ranh GPMB nhập ngoài (docs/08 §9.1): bảng tọa độ mốc, kiểm tra vùng, vùng từ tệp DGN khác, cắt thửa. Dữ liệu tổng hợp. */
import { describe, expect, test } from "vitest";
import { coTheDungRong, docBangDiem, docDgn, docToaDoMoc, dungThua, ghepBanDo, kiemTraVung, phanConLai, soSanhBanDo, tinhDienTichThuHoi, vungTuLop } from "../src/index.js";
import { ptChu } from "./viet-dgn-v8.js";
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

describe("Phần còn lại sau thu hồi (Điều 13, 16 PL I QĐ 106/2025)", () => {
  const o = (x0: number, y0: number, w: number, h: number) => [[{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h }, { x: x0, y: y0 }]];
  test("ranh cắt giữa thửa → hai mảnh còn lại; dải hẹp 3 m không dựng được hình chữ nhật rộng 4 m", () => {
    const thua = o(0, 0, 20, 10); // 200 m²
    const giao = [o(3, 0, 10, 10)]; // thu hồi 100 m² ở giữa → còn 30 m² (rộng 3 m) và 70 m² (rộng 7 m)
    const ml = phanConLai(thua, giao);
    expect(ml.map((m) => Math.round(m.dienTich))).toEqual([70, 30]);
    expect(coTheDungRong(ml[0]!.vong, 4)).toBe(true);
    expect(coTheDungRong(ml[1]!.vong, 4)).toBe(false);
    expect(coTheDungRong(ml[1]!.vong, 3.5)).toBe(false);
    expect(coTheDungRong(ml[1]!.vong, 2.9)).toBe(true);
    expect(phanConLai(thua, [thua])).toEqual([]);
  });
});

describe("Ghép nhiều tệp, so sánh hai bản đồ, bảng điểm đo (docs/08 §9.7–9.9)", () => {
  const ch = { ranhThua: [10], nhanThua: [], soThua: [4], soTo: [5], chuSuDung: [], ranhGpmb: [], dienTichToiThieu: 1, lechDienTichChoPhep: 0.05 };
  /** Một tờ: các ô 10 × 10 m bắt đầu từ x0, có số tờ, số thửa */
  const to = (soTo: string, x0: number, rong: number[]) => {
    const hinh: Uint8Array[] = [], chu: Uint8Array[] = [];
    let x = x0;
    rong.forEach((w, i) => {
      hinh.push(ptDuong(6, [d(x, 0), d(x + w, 0), d(x + w, 10), d(x, 10), d(x, 0)], { lop: 10 }));
      chu.push(ptChu(String(i + 1), X0 + x + w / 2, Y0 + 6, { lop: 4, unicode: true }), ptChu(soTo, X0 + x + w / 2, Y0 + 3, { lop: 5, unicode: true }));
      x += w;
    });
    return docDgn(vietDgnV8([hinh, chu]));
  };
  test("ghép hai tờ: đủ thửa của cả hai, stt không trùng", () => {
    const a = to("7", 0, [10, 10]), b = to("8", 100, [10]);
    const g = ghepBanDo([{ ten: "to7.dgn", ban: a }, { ten: "to8.dgn", ban: b }]);
    expect(new Set(g.phanTu.map((p) => p.stt)).size).toBe(g.phanTu.length);
    const thua = dungThua(g, ch).thua.map((t) => `${t.soTo}-${t.soThua}`).sort();
    expect(thua).toEqual(["7-1", "7-2", "8-1"]);
    expect(g.canhBao.every((c) => /^\[to[78]\.dgn\]/.test(c))).toBe(true);
  });
  test("so sánh: thửa đổi diện tích, thửa mới, thửa mất, thửa không đổi", () => {
    const cu = dungThua(to("7", 0, [10, 10, 10]), ch).thua;
    const moi = dungThua(to("7", 0, [10, 12, 8, 10]), ch).thua;
    const kq = Object.fromEntries(soSanhBanDo(cu, moi).map((x) => [`${x.soTo}-${x.soThua}`, x.trangThai]));
    expect(kq).toEqual({ "7-1": "GIONG", "7-2": "DOI_DT", "7-3": "DOI_DT", "7-4": "MOI" });
    const mat = soSanhBanDo(moi, cu).find((x) => x.trangThai === "MAT");
    expect(mat?.soThua).toBe("4");
  });
  test("bảng điểm đo: tiêu đề Tên điểm, X, Y, Mô tả; đổi trục", () => {
    const kq = docBangDiem([["Tên điểm", "X (m)", "Y (m)", "Mô tả"], ["P1", "2.350.010,5", "500.020,25", "Góc nhà"], ["P2", 2350012, 500021, ""]]);
    expect(kq.doiTruc).toBe(true);
    expect(kq.diem[0]).toEqual({ ten: "P1", x: 500020.25, y: 2350010.5, moTa: "Góc nhà" });
    expect(kq.diem).toHaveLength(2);
  });
});
