import { describe, expect, it } from "vitest";
import { doiChieuDienTich, loiNguong } from "../src/doi-chieu-dt";
import { taoDuAnMau } from "../src/du-lieu-mau";
import type { Ho } from "../src/mo-hinh";

describe("Đối chiếu diện tích ba nguồn (§11.3)", () => {
  const { duAn, ho } = taoDuAnMau();
  const h: Ho = { ...ho[0]!, thua: [{ ...ho[0]!.thua[0]!, dienTichBanDo: 9222.4, gcn: { seri: "", soTo: "", soThua: "", dienTich: "9200", loaiDat: "", dtThuHoiCoGcn: "", loaiDatThuHoi: "" } }] };
  it("chưa đặt ngưỡng: liệt kê mọi chênh lệch (Decimal, không sai số dấu phẩy động)", () => {
    const r = doiChieuDienTich(duAn, [h], null);
    const bd = r.find((x) => x.cap === "BAN_DO_HO_SO")!;
    expect(bd).toMatchObject({ a: "9222.4", b: "9222.1", chenh: "0.3", vuot: true });
    expect(r.find((x) => x.cap === "THUA_GCN")).toMatchObject({ chenh: "22.1", vuot: true });
  });
  it("ngưỡng đơn vị đặt: m² hoặc %, vượt một trong hai là cảnh báo; bắt buộc căn cứ", () => {
    const n = { m2: "0.5", phanTram: "", canCu: "Quy chế nội bộ số 01" };
    const r = doiChieuDienTich(duAn, [h], n);
    expect(r.find((x) => x.cap === "BAN_DO_HO_SO")!.vuot).toBe(false);
    expect(r.find((x) => x.cap === "THUA_GCN")!.vuot).toBe(true);
    expect(doiChieuDienTich(duAn, [h], { m2: "", phanTram: "1", canCu: "x" }).find((x) => x.cap === "THUA_GCN")!.vuot).toBe(false); // 0,24%
    expect(loiNguong({ m2: "0.5", phanTram: "", canCu: " " })).toMatch(/căn cứ/);
    expect(loiNguong({ m2: "0,5", phanTram: "", canCu: "x" })).toMatch(/số/);
    expect(loiNguong({ m2: "", phanTram: "", canCu: "" })).toBeNull();
  });
  it("hồ sơ ↔ phương án: so với bản chốt/duyệt gần nhất chứa hộ", () => {
    const pa = { id: "p1", so: 2, trangThai: "DA_PHE_DUYET", ho: [{ hoId: h.id, duLieu: { ...h, thua: [{ ...h.thua[0]!, dienTichThuHoi: "9000" }] } }] };
    const r = doiChieuDienTich({ ...duAn, phuongAn: [pa as never] }, [h], null);
    expect(r.find((x) => x.cap === "HO_SO_PHUONG_AN")).toMatchObject({ a: "9222.1", b: "9000", chenh: "222.1", nguonB: "bản 2 – đã phê duyệt" });
  });
});
