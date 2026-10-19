import { beforeEach, describe, expect, it } from "vitest";
import { SO_DONG_TOI_DA, anDanh, docLoi, ghiLoi, taoTepNhatKy, xoaLoi } from "../src/nhat-ky-loi";

const kho = new Map<string, string>();
beforeEach(() => {
  kho.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => kho.get(k) ?? null,
    setItem: (k: string, v: string) => void kho.set(k, v),
    removeItem: (k: string) => void kho.delete(k),
  } as Storage;
});

describe("Nhật ký sự cố (1.0.20, C2)", () => {
  it("che số định danh, điện thoại, thư điện tử; giữ số ngắn (mã hộ, năm)", () => {
    expect(anDanh("Hộ H01 CCCD 014203001234 đt 0912345678 thư a.b@x.vn năm 2026")).toBe("Hộ H01 CCCD [số] đt [số] thư [thư] năm 2026");
  });
  it("ghi, bỏ lặp trong 5 giây, giới hạn số dòng, xóa", () => {
    ghiLoi("GIAO_DIEN", "thẻ Tính toán: lỗi A", "stack 012345678901");
    ghiLoi("GIAO_DIEN", "thẻ Tính toán: lỗi A");
    expect(docLoi()).toHaveLength(1);
    expect(docLoi()[0]!.chiTiet).toBe("stack [số]");
    for (let i = 0; i < SO_DONG_TOI_DA + 20; i++) ghiLoi("MAY_CHU", `lỗi ${i}`);
    expect(docLoi()).toHaveLength(SO_DONG_TOI_DA);
    expect(docLoi().at(-1)!.thongDiep).toBe(`lỗi ${SO_DONG_TOI_DA + 19}`);
    xoaLoi();
    expect(docLoi()).toEqual([]);
  });
  it("tệp xuất có phiên bản, chế độ, lỗi trên máy và lỗi máy chủ (đã che số)", () => {
    ghiLoi("KHONG_BAT", "Không đọc được tệp");
    const t = taoTepNhatKy({ cheDo: "Máy trạm", mayChu: ["2026-10-19T08:00:00Z 500 Lỗi cơ sở dữ liệu: hộ 012345678901"], homNay: new Date("2026-10-19T09:00:00Z") });
    expect(t).toMatch(/^NHẬT KÝ SỰ CỐ/);
    expect(t).toMatch(/Chế độ: Máy trạm/);
    expect(t).toMatch(/\[Thao tác\] \[[^\]]+\] Không đọc được tệp/);
    expect(t).toMatch(/=== Lỗi nội bộ gần đây của máy chủ ===\r\n.*hộ \[số\]/);
    expect(taoTepNhatKy({ cheDo: "Máy đơn" })).not.toMatch(/máy chủ ===/);
  });
});
