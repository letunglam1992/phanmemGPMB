import { describe, expect, test } from "vitest";
import { docDgn, dungThua, giaiMaTcvn3, LoiDgn, tinhDienTichThuHoi, vaxDouble, CAU_HINH_MAC_DINH } from "../src/index.js";
import { vaxBytes, VietDgn } from "./viet-dgn.js";

const TCVN3_DINH_VAN_A = [0xa7, ..."inh V".split("").map((c) => c.charCodeAt(0)), 0xa8, ..."n A".split("").map((c) => c.charCodeAt(0))];

/**
 * Bản đồ mẫu: khung 20 × 10 m chia đôi tại x = 10 → thửa 12 (trái) và 13 (phải), mỗi thửa 100 m².
 * Ranh phải vẽ bằng chuỗi phức; ranh GPMB (lớp 30) là vùng x 5..15, y −5..15.
 */
function banDoMau(goc: [number, number] = [0, 0]) {
  return new VietDgn(1000, 1, goc)
    .duongGap({ lop: 10 }, [[10, 0], [0, 0], [0, 10], [10, 10]])
    .duong({ lop: 10 }, [10, 0], [10, 10])
    .chuoiPhuc({ lop: 10 }, [
      [[10, 10], [20, 10], [20, 5]],
      [[20, 5], [20, 0], [10, 0]],
    ])
    .chu({ lop: 13 }, [3, 6], "LUC12/100.0")
    .chu({ lop: 4 }, [3, 4], "12")
    .chu({ lop: 5 }, [3, 2], "3")
    .chu({ lop: 6 }, [3, 8], TCVN3_DINH_VAN_A)
    .chu({ lop: 13 }, [14, 7], "CLN")
    .chu({ lop: 13 }, [14, 5], "13")
    .chu({ lop: 13 }, [14, 3], "90.0")
    .chu({ lop: 5 }, [17, 2], "3")
    .chu({ lop: 6 }, [17, 8], "UBND X·")
    .chu({ lop: 6, daXoa: true }, [16, 8], "da xoa")
    .duongGap({ lop: 30 }, [[5, -5], [15, -5], [15, 15], [5, 15], [5, -5]], 6)
    .cung({ lop: 63 }, [50, 50], 2, 0, 90)
    .xuat();
}

describe("Đọc DGN V7", () => {
  test("số thực VAX D-float: mã hóa và giải mã khớp", () => {
    for (const v of [1, -2.5, 0.001, 56235265, 234354756.5, 1e-9]) {
      const dv = new DataView(new Uint8Array(vaxBytes(v)).buffer);
      expect(vaxDouble(dv, 0)).toBeCloseTo(v, 9);
    }
  });

  test("TCB, phần tử, chuỗi phức, phần tử đã xóa", () => {
    const kq = docDgn(banDoMau());
    expect(kq.tcb).toMatchObject({ soChieu: 2, suTrenMu: 1000, uorTrenSu: 1, heSo: 0.001, donViChinh: "m" });
    const phuc = kq.phanTu.find((p) => p.loai === "CHUOI_PHUC");
    expect(phuc && "diem" in phuc ? phuc.diem : []).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 5 },
      { x: 20, y: 0 },
      { x: 10, y: 0 },
    ]);
    // Thành phần chuỗi phức không đứng riêng; chữ đã xóa bị bỏ
    expect(kq.phanTu.filter((p) => p.loai === "DUONG_GAP")).toHaveLength(1);
    expect(kq.phanTu.filter((p) => p.loai === "CHU")).toHaveLength(9);
    const cung = kq.phanTu.find((p) => p.loai === "CUNG");
    const dCung = cung && "diem" in cung ? cung.diem : [];
    expect(dCung[0]!.x).toBeCloseTo(52, 6);
    expect(dCung[dCung.length - 1]!.y).toBeCloseTo(52, 6);
  });

  test("gốc tọa độ toàn cục (global origin) được trừ đúng", () => {
    const kq = docDgn(banDoMau([123456789, -98765]));
    const dg = kq.phanTu.find((p) => p.loai === "DUONG_GAP");
    expect(dg && "diem" in dg ? dg.diem[0] : null).toEqual({ x: 10, y: 0 });
  });

  test("tệp không phải DGN V7 bị từ chối, có thông báo", () => {
    expect(() => docDgn(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]))).toThrow(LoiDgn);
  });
});

describe("TCVN3", () => {
  test("giải mã tên, địa danh", () => {
    expect(giaiMaTcvn3(TCVN3_DINH_VAN_A).chu).toBe("Đinh Văn A");
    const b = (s: string) => [...s].map((c) => c.charCodeAt(0));
    expect(giaiMaTcvn3(b("Thµnh Phè")).chu).toBe("Thành Phố");
    expect(giaiMaTcvn3(b("TËp ThÓ")).chu).toBe("Tập Thể");
    expect(giaiMaTcvn3(b("§i M­êng La")).chu).toBe("Đi Mường La");
    expect(giaiMaTcvn3(b("ThÖu")).chu).toBe("Thệu");
    expect(giaiMaTcvn3([0x41, 0x80]).byteLa).toEqual([0x80]);
  });
});

describe("Dựng thửa, gắn nhãn, diện tích thu hồi", () => {
  const kq = dungThua(docDgn(banDoMau()));

  test("khép 2 thửa từ đường ranh (kể cả chuỗi phức)", () => {
    expect(kq.thua).toHaveLength(2);
    for (const t of kq.thua) expect(t.dienTichHinhHoc).toBeCloseTo(100, 9);
  });

  test("nhãn gộp và nhãn tách rời; gắn cờ lệch diện tích", () => {
    const a = kq.thua.find((t) => t.soThua === "12")!;
    expect(a).toMatchObject({ ma: "T3-12", soTo: "3", loaiDatBanDo: "LUC", dienTichGhi: 100, chuSuDung: "Đinh Văn A", co: [] });
    const b = kq.thua.find((t) => t.soThua === "13")!;
    expect(b).toMatchObject({ soTo: "3", loaiDatBanDo: "CLN", dienTichGhi: 90, chuSuDung: "UBND Xã" });
    expect(b.co).toContain("LECH_DIEN_TICH"); // 90 so với 100 m² > 5%
  });

  test("vùng ranh GPMB ứng viên: không trùng lặp, người dùng chọn", () => {
    expect(kq.vungGpmb).toHaveLength(1);
    expect(kq.vungGpmb[0]).toMatchObject({ nguon: "VUNG_KHEP_KIN" });
    expect(kq.vungGpmb[0]!.dienTich).toBeCloseTo(200, 9);
  });

  test("diện tích thu hồi = phần giao với ranh", () => {
    const r = tinhDienTichThuHoi(kq.thua, [kq.vungGpmb[0]!.vong]);
    expect(r.map((x) => [x.phamVi, Number(x.dienTichThuHoi.toFixed(6))]).sort()).toEqual([
      ["MOT_PHAN", 50],
      ["MOT_PHAN", 50],
    ]);
    const toanBo = tinhDienTichThuHoi(kq.thua, [[[[-1, -1], [30, -1], [30, 11], [-1, 11], [-1, -1]].map(([x, y]) => ({ x: x!, y: y! }))]]);
    expect(toanBo.every((x) => x.phamVi === "TOAN_BO")).toBe(true);
  });

  test("cấu hình lớp đổi được", () => {
    const khac = dungThua(docDgn(banDoMau()), { ...CAU_HINH_MAC_DINH, ranhThua: [99] });
    expect(khac.thua).toHaveLength(0);
  });
});
