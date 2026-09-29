import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { Ho, HoTroKhacHo, TaiSan } from "../src/mo-hinh";
import { tinhHo } from "../src/tinh-ho";
import { docNgay, hienNgay } from "../src/thanh-phan/ONgay";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const h0 = ho[0]!;
const voi = (khac: HoTroKhacHo, onDinh = false): Ho => ({ ...h0, hoTro: { ...h0.hoTro, khac, onDinh: onDinh ? { dienTichNNDangSuDung: "20000", diChuyen: "DI_CHUYEN" } : undefined } });
const b7 = (h: Ho) => tinhHo(cs, duAn, h).nhom.find((x) => x.ma === "B.VII")?.dong.map((x) => x.dong) ?? [];

describe("Đ5 QĐ 14/2026 — sửa chữa phần nhà còn lại", () => {
  const nha = h0.taiSan.find((x) => x.loai === "NHA_CT");
  const sc = (p: Partial<Extract<TaiSan, { loai: "SUA_CHUA" }>>): Ho => ({
    ...h0,
    taiSan: [...h0.taiSan, { id: "sc", thuaId: h0.thua[0]!.id, dot: 1, loai: "SUA_CHUA", ten: "Sửa chữa tường hồi", taiSanGocId: nha?.id, soTien: "25000000", canCu: "Dự toán số 12 ngày 01/9/2026", xacNhan: "BB xác nhận số 5", ...p }],
  });
  const a06 = (h: Ho) => tinhHo(cs, duAn, h).nhom.find((x) => x.ma === "A.II")!.dong.find((x) => x.dong.ma === "A06")!;
  it("theo dự toán được duyệt, là bồi thường tài sản, căn cứ Điều 5", () => {
    const d = a06(sc({}));
    expect(d.cot).toBe("BT_TAI_SAN");
    expect(d.dong.thanhTien!.toString()).toBe("25000000");
    expect(d.dong.trangThai).toBe("TAM_TINH");
    expect(d.dong.canCu[0]).toEqual({ vanBan: "QĐ 14/2026/QĐ-UBND", viTri: "Điều 5" });
  });
  it("thiếu dự toán → Thiếu căn cứ; thiếu xác nhận kỹ thuật → Cần xác nhận", () => {
    expect(a06(sc({ canCu: "" })).dong.trangThai).toBe("THIEU_CAN_CU");
    expect(a06(sc({ soTien: "" })).dong.trangThai).toBe("THIEU_CAN_CU");
    expect(a06(sc({ xacNhan: "" })).dong.trangThai).toBe("CAN_XAC_NHAN");
  });
});

describe("Hỗ trợ khác — Điều 6 QĐ 14/2026", () => {
  const k1 = { doiTuongCs: [{ id: "a", ten: "Thương binh", muc: "5000000", xacNhan: "XN 01" }], khoan: [] };
  const k2 = { hoNgheo: { xacNhan: "QĐ hộ nghèo 3" }, khoan: [] };
  it("VM-17: có cả k1, k2 mà chưa chọn → cả hai Cần xác nhận; chọn cộng / chỉ lấy khoản cao hơn (có lý do)", () => {
    const chua = b7(voi({ ...k1, ...k2 }));
    expect(chua.map((d) => [d.ma, d.trangThai])).toEqual([["C14", "CAN_XAC_NHAN"], ["C15", "CAN_XAC_NHAN"]]);
    const cong = b7(voi({ ...k1, ...k2, vm17: { cach: "CONG", lyDo: "Hai diện độc lập" } }));
    expect(cong.map((d) => d.thanhTien!.toString())).toEqual(["5000000", "4000000"]);
    expect(cong[0]!.luaChon[0]!.ma).toBe("VM-17");
    const cao = b7(voi({ ...k1, ...k2, vm17: { cach: "CAO_HON", lyDo: "Chỉ một khoản" } }));
    expect(cao.map((d) => d.ma)).toEqual(["C14"]);
    expect(b7(voi({ ...k1, ...k2, vm17: { cach: "CONG", lyDo: " " } }))[0]!.trangThai).toBe("CAN_XAC_NHAN"); // thiếu lý do
  });
  it("k6: cán bộ tích; hộ có ổn định đời sống Điều 12 PL II → nhắc kiểm tra, không tự loại", () => {
    const d = b7(voi({ xayLaiNha: true, khoan: [] }, true))[0]!;
    expect(d.ma).toBe("C16");
    expect(d.canhBao.join(" ")).toMatch(/tránh hỗ trợ trùng/);
    expect(d.trangThai).toBe("THIEU_CAN_CU"); // dự án mẫu chưa nhập giá gạo
    const coGao = { ...duAn, giaGao: { dongKg: "15000", nguon: "Thông báo giá (thử)" } };
    const d2 = tinhHo(cs, coGao, voi({ xayLaiNha: true, khoan: [] })).nhom.find((x) => x.ma === "B.VII")!.dong[0]!.dong;
    expect(d2.thanhTien!.toString()).toBe(String(30 * 15000 * h0.nhanKhau.length * 6));
  });
  it("k4, k13, k14: nhập tay, bắt buộc căn cứ", () => {
    const ds = b7(voi({ khoan: [{ id: "1", loai: "K4", noiDung: "Bếp ngoài cọc", soTien: "3000000", canCu: "QĐ 7 của Chủ tịch UBND xã" }, { id: "2", loai: "K13_14", noiDung: "", soTien: "1000000", canCu: "" }] }));
    expect(ds[0]).toMatchObject({ ma: "C17.4", trangThai: "TAM_TINH" });
    expect(ds[0]!.canCu[0]!.viTri).toBe("khoản 4 Điều 6");
    expect(ds[1]!.trangThai).toBe("THIEU_CAN_CU");
  });
});

describe("Ô ngày dd/mm/yyyy", () => {
  it("đọc ngày kiểu Việt Nam (ngày trước), ISO; hiện dd/mm/yyyy", () => {
    expect(docNgay("09/01/2026")).toBe("2026-01-09");
    expect(docNgay("9/1/2026")).toBe("2026-01-09");
    expect(docNgay("09.01.2026")).toBe("2026-01-09");
    expect(docNgay("09012026")).toBe("2026-01-09");
    expect(docNgay("2026-01-09")).toBe("2026-01-09");
    expect(docNgay("31/02/2026")).toBe("");
    expect(docNgay("13/13/2026")).toBe("");
    expect(docNgay("29/02/2028")).toBe("2028-02-29");
    expect(hienNgay("2026-01-09")).toBe("09/01/2026");
  });
});
