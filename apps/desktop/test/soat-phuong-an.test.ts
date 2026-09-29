import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { QUY_TAC_SOAT, soatPhuongAn } from "../src/soat-phuong-an";
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
