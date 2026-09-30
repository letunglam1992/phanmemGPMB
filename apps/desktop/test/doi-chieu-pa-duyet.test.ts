/**
 * Đối chiếu với một phương án ĐÃ PHÊ DUYỆT thực tế (dự án KCN, xã Chiềng Mung, 2026): 1 đối tượng,
 * 2 thửa CLN, 61 loại – cỡ cây. Đã lược bỏ tên, số định danh, số tờ/thửa, số quyết định — chỉ giữ
 * diện tích, số lượng, đơn giá. Kết quả đối chiếu chi tiết: docs/16-doi-chieu-phuong-an-da-duyet.md
 */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { taoId, type Ho, type TaiSan } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
/** [tên, số lượng, đơn giá PL VIII, mật độ cây/ha theo danh mục (null = không có), đơn vị] */
type L = [string, number, number, number | null, string?];
const THUA_1: L[] = [
  ["Nhãn 30-35", 82, 3900000, 400], ["Nhãn 25-30", 59, 1950000, 400], ["Nhãn 20-25", 42, 1500000, 400], ["Nhãn 15-20", 56, 1200000, 400],
  ["Nhãn 10-15", 62, 800000, 400], ["Nhãn 8-10", 178, 575000, 400], ["Nhãn 4-8", 185, 285000, 400], ["Nhãn 2-4", 76, 120000, 400],
  ["Nhãn ≤2", 31, 90000, 400], ["Xoài 25-30", 9, 1850000, 400], ["Xoài 20-25", 8, 1480000, 400], ["Xoài 15-20", 6, 1150000, 400],
  ["Xoài 10-15", 22, 790000, 400], ["Xoài 8-10", 25, 540000, 400], ["Xoài 6-8", 31, 280000, 400], ["Xoài 4-6", 8, 115000, 400],
  ["Xoài ≤4", 25, 90000, 400], ["Xoan >0,6", 51, 202000, 1600], ["Xoan 0,4-0,5", 12, 118000, 1600], ["Xoan 0,5-0,6", 2, 134000, 1600],
  ["Ổi 10-15", 3, 190000, 625], ["Ổi ≤4", 2, 25000, 625], ["Na ≤3", 6, 110000, 1100], ["Cà phê 10-20 năm", 5012, 68000, 4600],
  ["Cà phê năm 3", 728, 30000, 4600], ["Chuối sắp quả", 710, 38000, null], ["Chuối nhỏ", 334, 10000, null], ["Đu đủ 3-5 năm", 3, 52000, null],
  ["Cỏ chăn nuôi", 400, 4200, null, "m²"], ["Dứa đang ra quả", 62, 51600, null, "m²"], ["Rau ngót", 4, 15200, null, "m²"],
];
const THUA_2: L[] = [
  ["Xoài 30-35", 31, 3240000, 400], ["Xoài 25-30", 47, 1850000, 400], ["Xoài 20-25", 41, 1480000, 400], ["Xoài 15-20", 40, 1150000, 400],
  ["Xoài 10-15", 80, 790000, 400], ["Xoài 8-10", 275, 540000, 400], ["Xoài 6-8", 165, 280000, 400], ["Xoài 4-6", 56, 115000, 400],
  ["Xoài ≤4", 188, 90000, 400], ["Nhãn 30-35", 8, 3900000, 400], ["Nhãn 25-30", 21, 1950000, 400], ["Nhãn 20-25", 5, 1500000, 400],
  ["Nhãn 15-20", 17, 1200000, 400], ["Nhãn 10-15", 11, 800000, 400], ["Nhãn 8-10", 47, 575000, 400], ["Nhãn 4-8", 35, 285000, 400],
  ["Nhãn 2-4", 24, 120000, 400], ["Nhãn ≤2", 8, 90000, 400], ["Đào 5-10", 4, 338000, null], ["Ổi 10-15", 7, 190000, 625],
  ["Cam 7-10", 6, 671000, 625], ["Vải 4-8", 1, 285000, 400], ["Cà phê 10-20 năm", 2300, 68000, 4600], ["Cà phê năm 3", 1100, 30000, 4600],
  ["Tre già", 367, 45000, 500], ["Tre non", 158, 34000, 500], ["Xoan >0,6", 17, 202000, 1600], ["Xoan 0,4-0,5", 11, 118000, 1600],
  ["Xoan 4 năm-khép tán", 8, 47000, 1600], ["Lát 4 năm-khép tán", 3, 76000, 1600],
];

function dung(p: { chonKhongMatDo?: "TINH_100" | "TINH_30" | "TU_NHAP"; tyLe?: string; matDoDao?: number; b13?: boolean; hoSo?: string; onDinh?: Ho["hoTro"]["onDinh"] }) {
  const { duAn } = taoDuAnMau();
  const a = taoId(), b = taoId();
  const gia = { giaNghinDong: "54", nguon: "NQ 152/2025 Bảng 02, STT 45, Xã Chiềng Mung, CLN" };
  const nlt = p.b13 ? { truongHop: "9.1.a" as const, hoSo: p.hoSo ?? "Hợp đồng giao khoán; QĐ thu hồi đất của UBND tỉnh" } : undefined;
  const cayXen = { dienTichTru: "0", lyDoTru: "", cachXep: "DUNG_KHI_VUOT" as const, khongMatDo: p.chonKhongMatDo, lyDoKhongMatDo: p.chonKhongMatDo ? "Theo phương án đã duyệt" : "", tyLeKhongMatDo: p.tyLe };
  const mk = (thuaId: string, l: L[]): TaiSan[] =>
    l.map(([ten, sl, dg, md, dv]) => {
      const matDo = ten.startsWith("Đào") && p.matDoDao ? p.matDoDao : md;
      return { id: taoId(), thuaId, dot: 1, loai: "CAY", ten, maDonGia: "PL VIII QĐ 106/2025", donVi: dv ?? "cây", donGia: String(dg), soLuong: String(sl), matDoHa: matDo == null ? null : String(matDo) } as TaiSan;
    });
  const ho: Ho = {
    id: taoId(), duAnId: duAn.id, ma: "DC1", loai: "CA_NHAN", ten: "Đối tượng đối chiếu", diaChi: "", soDinhDanh: "", dienThoai: "",
    nhanKhau: [{ id: "nk1", hoTen: "Đối tượng đối chiếu", quanHe: "Chủ hộ" }],
    thua: [
      { id: a, soTo: "", soThua: "1", loaiDat: "CLN", dienTich: "6358.8", dienTichThuHoi: "6358.8", nguonGoc: "Nông trường", gia, cayXen, nongLamTruong: nlt },
      { id: b, soTo: "", soThua: "2", loaiDat: "CLN", dienTich: "5523.2", dienTichThuHoi: "5523.2", nguonGoc: "Nông trường", gia, cayXen, nongLamTruong: nlt },
    ] as Ho["thua"],
    taiSan: [...mk(a, THUA_1), ...mk(b, THUA_2)],
    hoTro: { chuyenDoiNghe: true, ...(p.onDinh ? { onDinh: p.onDinh } : {}) },
    khauTru: "0", tienDo: {} as Ho["tienDo"], nhatKy: [],
  };
  return tinhHo(cs, { ...duAn, giaGao: { dongKg: "15000", nguon: "Giá gạo mẫu" } }, ho);
}

describe("Đối chiếu phương án đã phê duyệt (ẩn danh)", () => {
  it("chưa chọn cách tính cây không có mật độ trên thửa trồng xen → các dòng đó cần xác nhận, không cộng", () => {
    const kq = dung({});
    const cxn = kq.tatCa.filter((d) => d.dong.trangThai === "CAN_XAC_NHAN").map((d) => d.dong.noiDung);
    expect(cxn).toEqual(["Cây trồng – Chuối sắp quả", "Cây trồng – Chuối nhỏ", "Cây trồng – Đu đủ 3-5 năm", "Cây trồng – Cỏ chăn nuôi", "Cây trồng – Dứa đang ra quả", "Cây trồng – Rau ngót", "Cây trồng – Đào 5-10"]);
  });

  it("chọn 30% (có lý do) và nhập mật độ đào 800 cây/ha → khớp phương án đã duyệt đến đồng", () => {
    const kq = dung({ chonKhongMatDo: "TINH_30", matDoDao: 800 });
    expect(kq.tatCa.every((d) => d.dong.trangThai === "TAM_TINH")).toBe(true);
    expect(kq.theoCot.BT_DAT.toString()).toBe("641628000");
    expect(kq.theoCot.BT_CAY.toString()).toBe("1413166700");
    expect(kq.theoCot.HT_CDN.toString()).toBe("1924884000");
    // Phương án đã duyệt không làm tròn (3.979.678.700 đ); phần mềm làm tròn lên nghìn đồng ở cấp hộ (QD-03).
    expect(kq.tong.tongLamTron.toString()).toBe("3979679000");
    const vuot = kq.tatCa.find((d) => d.dong.noiDung.endsWith("Nhãn 8-10") && d.thuaId === kq.tatCa[0]!.thuaId);
    expect(vuot?.bieu?.map((x) => x.kl.toString())).toEqual(["80", "98"]);
  });

  it("chọn 100% (có lý do) → cao hơn phương án đã duyệt 24.791.200 đ ở thửa 1 (chuối, đu đủ, cỏ, dứa, rau ngót)", () => {
    const kq = dung({ chonKhongMatDo: "TINH_100", matDoDao: 800 });
    expect(kq.theoCot.BT_CAY.minus(1413166700).toString()).toBe("24791200");
  });

  it("VM-35 tự điền tỷ lệ (QD-32): 30% khớp lựa chọn 30%; 50% nằm giữa; chưa nhập tỷ lệ → cần xác nhận", () => {
    expect(dung({ chonKhongMatDo: "TU_NHAP", tyLe: "30", matDoDao: 800 }).theoCot.BT_CAY.toString()).toBe("1413166700");
    const k50 = dung({ chonKhongMatDo: "TU_NHAP", tyLe: "50", matDoDao: 800 });
    expect(k50.tatCa.every((d) => d.dong.trangThai === "TAM_TINH")).toBe(true);
    expect(k50.theoCot.BT_CAY.gt(1413166700) && k50.theoCot.BT_CAY.lt(1413166700 + 24791200)).toBe(true);
    expect(k50.tatCa.some((d) => d.dong.luaChon.some((l) => l.ma === "VM-35" && l.giaTri.includes("50%")))).toBe(true);
    const thieu = dung({ chonKhongMatDo: "TU_NHAP", matDoDao: 800 });
    expect(thieu.tatCa.some((d) => d.dong.trangThai === "CAN_XAC_NHAN")).toBe(true);
    expect(dung({ chonKhongMatDo: "TU_NHAP", tyLe: "120", matDoDao: 800 }).tatCa.some((d) => d.dong.trangThai === "CAN_XAC_NHAN")).toBe(true);
  });
});

describe("VM-36: cách làm tròn do dự án chọn", () => {
  it("không làm tròn / xuống / nửa lên; thiếu lý do thì giữ QD-03", () => {
    const { duAn, ho } = taoDuAnMau();
    const h = ho[0]!;
    const goc = tinhHo(cs, duAn, h);
    const t = goc.tong.tongChuaLamTron;
    expect(tinhHo(cs, { ...duAn, lamTron: { cach: "KHONG", lyDo: "Theo phương án đã duyệt" } }, h).tong.tongLamTron.eq(t)).toBe(true);
    expect(tinhHo(cs, { ...duAn, lamTron: { cach: "XUONG", lyDo: "x" } }, h).tong.tongLamTron.toString()).toBe(t.div(1000).floor().mul(1000).toString());
    expect(tinhHo(cs, { ...duAn, lamTron: { cach: "KHONG", lyDo: " " } }, h).tong.tongLamTron.eq(goc.tong.tongLamTron)).toBe(true);
    expect(tinhHo(cs, { ...duAn, lamTron: { cach: "KHONG", lyDo: "Theo PA" } }, h).moTaLamTron).toContain("VM-36");
  });
});

describe("B13: đất nguồn gốc nông, lâm trường (điểm a mục 9.1 k9 Đ6 QĐ 14/2026)", () => {
  it("khoản đất, cây trồng chuyển sang hỗ trợ; số tiền như phương án đã duyệt; ổn định đời sống phải xác định (VM-38)", () => {
    const kq = dung({ chonKhongMatDo: "TINH_30", matDoDao: 800, b13: true });
    expect(kq.theoCot.BT_DAT.toString()).toBe("0");
    expect(kq.theoCot.BT_CAY.toString()).toBe("0");
    expect(kq.theoCot.HT_DAT.toString()).toBe("641628000");
    expect(kq.theoCot.HT_CAY.toString()).toBe("1413166700");
    expect(kq.theoCot.HT_CDN.toString()).toBe("1924884000");
    const dat = kq.nhom.find((n) => n.ma === "B.I")!.dong[0]!.dong;
    expect(dat.noiDung).toContain("Hỗ trợ về đất");
    expect(dat.canCu.map((c) => c.viTri)).toContain("điểm a mục 9.1 khoản 9 Điều 6");
    const od = kq.nhom.find((n) => n.ma === "B.V")!.dong.map((x) => x.dong);
    expect(od.some((d) => d.trangThai === "CAN_XAC_NHAN" && d.canhBao.join().includes("VM-38"))).toBe(true);
    expect(kq.tong.duocChot).toBe(false);
  });

  it("thiếu hồ sơ nguồn gốc → khoản đất cần xác nhận (VM-37)", () => {
    const kq = dung({ chonKhongMatDo: "TINH_30", matDoDao: 800, b13: true, hoSo: " " });
    expect(kq.nhom.find((n) => n.ma === "B.I")!.dong.every((x) => x.dong.trangThai === "CAN_XAC_NHAN")).toBe(true);
  });

  it("đã nhập DT đất NN đang sử dụng → tính theo tỷ lệ, không còn dòng nhắc VM-38", () => {
    const kq = dung({ chonKhongMatDo: "TINH_30", matDoDao: 800, b13: true, onDinh: { dienTichNNDangSuDung: "200000", diChuyen: "KHONG_DI_CHUYEN" } });
    const od = kq.nhom.find((n) => n.ma === "B.V")!.dong.map((x) => x.dong);
    expect(od.some((d) => d.canhBao.join().includes("VM-38"))).toBe(false);
    // 11.882 / 200.000 = 5,94% < 10% → không hỗ trợ
    expect(od.map((d) => [d.trangThai, String(d.thanhTien)])).toEqual([["TAM_TINH", "0"]]);
  });
});
