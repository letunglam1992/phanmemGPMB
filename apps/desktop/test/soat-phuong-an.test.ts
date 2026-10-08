import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { QUY_TAC_SOAT, soatPhuongAn } from "../src/soat-phuong-an";
import { D } from "@gpmb/core";
import type { Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const { duAn, ho } = taoDuAnMau();
const soat = (ds: Ho[]) => soatPhuongAn(duAn, ds.map((h) => ({ h, k: tinhHo(cs, duAn, h) })));
const co = (r: ReturnType<typeof soat>, qt: string, hoMa?: string) => r.filter((x) => x.quyTac === qt && (!hoMa || x.doiTuong.startsWith(hoMa)));

describe("Soát phương án (§11.1)", () => {
  it("mọi quy tắc có căn cứ hoặc ghi rõ kiểm tra số liệu", () => {
    for (const q of QUY_TAC_SOAT) expect(q.canCu.length).toBeGreaterThan(5);
  });
  it("dự án mẫu: hộ 02 thu hồi hết thửa đất ở chưa ghi TĐC; hộ 01 có đất NN (CLN) chưa khai DT đang sử dụng; lỗi xếp trước", () => {
    const r = soat(ho);
    expect(co(r, "DAT_O_HET", "H02")).toHaveLength(1);
    expect(co(r, "NN_ON_DINH", "H01")).toHaveLength(1);
    expect(co(r, "NN_ON_DINH", "H02")).toHaveLength(0); // đã khai
    expect(co(r, "NIEM_YET").length).toBe(2);
    const muc = r.map((x) => x.muc);
    expect(muc.indexOf("THONG_TIN") === -1 || muc.lastIndexOf("LOI") < muc.indexOf("THONG_TIN")).toBe(true);
  });
  it("DT thu hồi > DT thửa; thửa trùng giữa hộ (vượt DT thửa = lỗi); mã trùng; tạm cư không nhân khẩu", () => {
    const h1: Ho = { ...ho[0]!, thua: ho[0]!.thua.map((t, i) => (i === 0 ? { ...t, dienTichThuHoi: "9999" } : t)) };
    const h2: Ho = { ...ho[1]!, ma: "H01", nhanKhau: [], hoTro: { ...ho[1]!.hoTro, tamCu: { soThang: 6, tdcBangDat: false } }, thua: [...ho[1]!.thua, { ...ho[0]!.thua[1]!, id: "x" }] };
    const r = soat([h1, h2]);
    expect(co(r, "DT_VUOT", "H01")[0]!.muc).toBe("LOI");
    const trung = co(r, "THUA_TRUNG");
    expect(trung).toHaveLength(1);
    expect(trung[0]!.muc).toBe("LOI"); // 443,2 × 2 > 443,2
    expect(trung[0]!.noiDung).toContain("Thửa 73 tờ 5");
    expect(co(r, "MA_TRUNG")).toHaveLength(1);
    expect(co(r, "TAM_CU_NK")).toHaveLength(1);
  });
  it("thửa trùng chưa vượt DT thửa = cần kiểm tra (đồng sử dụng); thửa chưa phân loại pháp lý = lưu ý", () => {
    const t = { ...ho[1]!.thua[0]!, id: "y", dienTichThuHoi: "100" };
    const h2: Ho = { ...ho[1]!, thua: [{ ...ho[1]!.thua[0]!, dienTichThuHoi: "100", phapLy: "GCN" }, ho[1]!.thua[1]!] };
    const h3: Ho = { ...ho[1]!, id: "h3", ma: "H03", thua: [t] };
    const r = soat([h2, h3]);
    expect(co(r, "THUA_TRUNG")[0]!.muc).toBe("CANH_BAO");
    expect(co(r, "PHAP_LY", "H02")).toHaveLength(1); // thửa 13 chưa phân loại
  });
  it("§11.3: lệch diện tích vượt ngưỡng đơn vị đặt → cần kiểm tra, ghi căn cứ ngưỡng; chưa đặt ngưỡng thì không đưa vào soát", () => {
    const h: Ho = { ...ho[0]!, thua: [{ ...ho[0]!.thua[0]!, dienTichBanDo: 9230 }] };
    const ds = [{ h, k: tinhHo(cs, duAn, h) }];
    expect(soatPhuongAn(duAn, ds).filter((x) => x.quyTac === "DT_LECH")).toHaveLength(0);
    const r = soatPhuongAn(duAn, ds, { m2: "1", phanTram: "", canCu: "Quy chế số 01/QC" }).filter((x) => x.quyTac === "DT_LECH");
    expect(r).toHaveLength(1);
    expect(r[0]!.canCu).toContain("Quy chế số 01/QC");
    expect(r[0]!.noiDung).toContain("lệch 7,9 m²");
  });
});

describe("Lựa chọn linh động không thống nhất giữa các hộ (1.0.6)", () => {
  const gia = (h: Ho, lc: { ma: string; giaTri: string; lyDo: string }[]) => {
    const k = tinhHo(cs, duAn, h);
    const d = k.tatCa[0]!;
    return { h, k: { ...k, tatCa: [{ ...d, dong: { ...d.dong, luaChon: lc } }, ...k.tatCa.slice(1)] } };
  };
  it("cùng mã VM, cách chọn khác → cảnh báo kèm danh sách hộ; khác số liệu cùng cách → không; mã lựa chọn riêng hộ → bỏ qua", async () => {
    const { luaChonKhacNhau } = await import("../src/soat-phuong-an");
    const h3: Ho = { ...ho[0]!, id: "h3", ma: "H03" };
    const ds = [
      gia(ho[0]!, [{ ma: "VM-39", giaTri: "Bồi thường đất ở toàn bộ DT thu hồi", lyDo: "x" }, { ma: "PLVIII-D5K4", giaTri: "A", lyDo: "x" }, { ma: "VM-34", giaTri: "Trừ 12,5 m² công trình", lyDo: "x" }]),
      gia(ho[1]!, [{ ma: "VM-39", giaTri: "Bồi thường đất ở trong hạn mức", lyDo: "y" }, { ma: "PLVIII-D5K4", giaTri: "B", lyDo: "y" }, { ma: "VM-34", giaTri: "Trừ 3 m² công trình", lyDo: "y" }]),
      gia(h3, [{ ma: "VM-39", giaTri: "Bồi thường đất ở toàn bộ DT thu hồi", lyDo: "z" }]),
    ];
    const r = luaChonKhacNhau(ds);
    expect(r).toEqual([{ ma: "VM-39", cach: [{ giaTri: "Bồi thường đất ở toàn bộ DT thu hồi", ho: ["H01", "H03"] }, { giaTri: "Bồi thường đất ở trong hạn mức", ho: ["H02"] }] }]);
    const s = soatPhuongAn(duAn, ds).filter((x) => x.quyTac === "LUA_CHON_KHAC");
    expect(s).toHaveLength(1);
    expect(s[0]!.muc).toBe("CANH_BAO");
    expect(s[0]!.noiDung).toContain("H01, H03");
  });
});

describe("Đối thoại khi còn ý kiến không đồng ý — điểm a k3 Đ87 (1.0.6)", () => {
  it("chưa đối thoại = cần kiểm tra; quá 60 ngày = lỗi; đã đối thoại còn ý kiến = lưu ý; đồng ý = không nhắc", async () => {
    const { LICH_TRONG } = await import("../src/lich-lam-viec");
    const r = (y: Ho["yKienPA"], homNay: string) => soatPhuongAn(duAn, [{ h: { ...ho[0]!, yKienPA: y }, k: tinhHo(cs, duAn, ho[0]!) }], null, undefined, LICH_TRONG, homNay).filter((x) => x.quyTac === "DOI_THOAI");
    const kd = { loai: "KHONG_DONG_Y" as const, ngayLay: "2026-09-01", noiDung: "Không nhất trí đơn giá" };
    expect(r(kd, "2026-10-01").map((x) => x.muc)).toEqual(["CANH_BAO"]);
    expect(r(kd, "2026-10-01")[0]!.noiDung).toContain("hạn 02/11/2026");
    expect(r(kd, "2026-11-03").map((x) => x.muc)).toEqual(["LOI"]);
    expect(r({ ...kd, doiThoai: [{ ngay: "2026-10-10", ketQua: "CON_Y_KIEN" }] }, "2026-11-03").map((x) => x.muc)).toEqual(["THONG_TIN"]);
    expect(r({ loai: "DONG_Y" }, "2026-11-03")).toEqual([]);
    expect(r(kd, "2026-10-01")[0]!.tab).toBe("tien-do");
  });
});

describe("Đối chiếu tổng DT thu hồi (1.0.6)", () => {
  it("tổng hồ sơ ↔ bản đồ (chỉ thửa đã liên kết), ↔ phương án, ↔ văn bản; theo dự án và đợt; soát nhắc khi vượt văn bản", async () => {
    const { doiChieuTongDt } = await import("../src/doi-chieu-dt");
    const h0 = { ...ho[0]!, dotId: "d1", thua: ho[0]!.thua.map((t, i) => (i === 0 ? { ...t, dienTichBanDo: Number(t.dienTichThuHoi) + 2 } : t)) };
    const h1 = { ...ho[1]!, dotId: "d2" };
    const tong0 = h0.thua.reduce((s, t) => s + Number(t.dienTichThuHoi || 0), 0);
    const tong1 = h1.thua.reduce((s, t) => s + Number(t.dienTichThuHoi || 0), 0);
    const duAnD = { ...duAn, dtThuHoiVb: { dienTich: "100", canCu: "TB số 1/TB-UBND" }, dotThuHoi: [{ id: "d1", so: 1, ten: "Bản A", dtThuHoiVb: { dienTich: h0.thua.reduce((a, t) => a.plus(t.dienTichThuHoi || "0"), D(0)).toString(), canCu: "TB số 2" } }, { id: "d2", so: 2, ten: "" }] };
    const r = doiChieuTongDt(duAnD, [h0, h1], null);
    expect(r.map((x) => x.phamVi)).toEqual(["Toàn dự án", "Đợt 1 – Bản A", "Đợt 2"]);
    expect(Number(r[0]!.hoSo)).toBeCloseTo(tong0 + tong1, 6);
    const bd = r[0]!.so.find((x) => x.nguon === "BAN_DO")!;
    expect(Number(bd.chenh)).toBeCloseTo(-2, 6); // chỉ so thửa đã liên kết: hồ sơ − bản đồ
    expect(bd.ghiChu).toMatch(/chưa liên kết bản đồ/);
    const vb = r[0]!.so.find((x) => x.nguon === "VAN_BAN")!;
    expect(vb.vuot).toBe(true);
    expect(r[1]!.so.find((x) => x.nguon === "VAN_BAN")!.vuot).toBe(false); // đợt 1 khớp
    expect(r[2]!.so.some((x) => x.nguon === "VAN_BAN")).toBe(false);
    const s = soatPhuongAn(duAnD, [h0, h1].map((h) => ({ h, k: tinhHo(cs, duAnD, h) }))).filter((x) => x.quyTac === "DT_TONG_VB");
    expect(s).toHaveLength(1);
    expect(s[0]!.muc).toBe("CANH_BAO");
    expect(s[0]!.noiDung).toMatch(/^Toàn dự án: .* lớn hơn DT theo văn bản 100 m²/);
  });
});
