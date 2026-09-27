import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import pl5 from "../../../policy/nguon/qd106-2025-pl5-di-doi-vat-nuoi.json";
import nq152 from "../../../policy/nguon/nq152-2025-bang-gia-dat.json";
import type { BoChinhSach } from "../src";

const cs = cs0 as unknown as BoChinhSach;

describe("Bộ chính sách khớp dữ liệu trích xuất từ văn bản gốc", () => {
  it("đơn giá di dời vật nuôi = Phụ lục V", () => {
    const duong = { "Đường cứng hoá (Đường nhựa, bê tông, đường cấp phối)": "CUNG_HOA", "Loại đường đất": "DUONG_DAT" } as const;
    const loai = ["TRAU_BO_NGUA", "LON", "DE_CUU_HUOU_CHO_THO_NHIM", "GIA_CAM", "CON_TRUNG_SINH_VAT_NHO"] as const;
    const nhom: Record<string, string[]> = {};
    for (const r of pl5 as { nhom: string; don_gia: number }[]) {
      const [muc, d] = r.nhom.split(" > ");
      const k = `${muc!.includes("đến 05 km") ? "den5km" : "tren5km"}|${duong[d as keyof typeof duong]}`;
      (nhom[k] ??= []).push(String(r.don_gia));
    }
    for (const d of ["CUNG_HOA", "DUONG_DAT"] as const) {
      loai.forEach((l, i) => {
        expect(Number(cs.vatNuoi.donGia[d][l].den5km)).toBe(Number(nhom[`den5km|${d}`]![i]));
        expect(Number(cs.vatNuoi.donGia[d][l].tren5km)).toBe(Number(nhom[`tren5km|${d}`]![i]));
      });
    }
  });
  it("tên xã trong các bảng phân nhóm đều có trong danh mục 75 xã, phường (NQ 152)", () => {
    const dm = new Set((nq152 as { danh_muc_xa: string[] }).danh_muc_xa);
    expect(dm.size).toBe(75);
    const tatCa = [...Object.values(cs.tamCu.phanNhom), ...Object.values(cs.chuyenDoiNghe.phanNhom)].flat();
    expect(tatCa.filter((x) => !dm.has(x))).toEqual([]);
  });
});
