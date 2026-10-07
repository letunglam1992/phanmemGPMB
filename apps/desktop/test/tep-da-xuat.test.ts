import { describe, expect, it, beforeEach } from "vitest";
import { coDuongDan, dsTepDaXuat, ghiTepDaXuat, thuMucCua, xoaDsTepDaXuat } from "../src/tep-da-xuat";

const kho = new Map<string, string>();
beforeEach(() => {
  kho.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => kho.get(k) ?? null,
    setItem: (k: string, v: string) => void kho.set(k, v),
    removeItem: (k: string) => void kho.delete(k),
  } as Storage;
});

describe("Tệp đã xuất (1.0.2)", () => {
  it("mới nhất lên đầu, bỏ trùng đường dẫn, tối đa 30; tên, thư mục; xóa danh sách", () => {
    ghiTepDaXuat("C:\\Users\\a\\Downloads\\Bao-cao.xlsx", "2026-10-07T01:00:00.000Z");
    ghiTepDaXuat("C:\\Users\\a\\Documents\\Mau-14.docx", "2026-10-07T02:00:00.000Z");
    ghiTepDaXuat("C:\\Users\\a\\Downloads\\Bao-cao.xlsx", "2026-10-07T03:00:00.000Z");
    const ds = dsTepDaXuat();
    expect(ds.map((x) => x.ten)).toEqual(["Bao-cao.xlsx", "Mau-14.docx"]);
    expect(thuMucCua(ds[1]!)).toBe("C:\\Users\\a\\Documents");
    expect(coDuongDan(ds[0]!)).toBe(true);
    expect(coDuongDan({ ten: "a.xlsx", duongDan: "a.xlsx", luc: "" })).toBe(false);
    for (let i = 0; i < 40; i++) ghiTepDaXuat(`/home/a/t${i}.xlsx`);
    expect(dsTepDaXuat()).toHaveLength(30);
    xoaDsTepDaXuat();
    expect(dsTepDaXuat()).toEqual([]);
  });
});
