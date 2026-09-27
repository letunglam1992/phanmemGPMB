import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { tinhHo } from "../src/tinh-ho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { taoWorkbook } from "../src/xuat-excel";
import danhMuc from "../src/danh-muc-xa.json";
import nq152 from "../../../policy/nguon/nq152-2025-bang-gia-dat.json";

const cs = cs0 as unknown as BoChinhSach;

describe("Xuất Excel theo cấu trúc biểu mẫu", () => {
  it("TH ĐẤT, TH GIÁ TRỊ và trang từng hộ; số liệu khớp kết quả tính", async () => {
    const { duAn, ho } = taoDuAnMau();
    const ds = ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
    const wb = await taoWorkbook(duAn, ds);
    const buf = await wb.xlsx.writeBuffer();
    const doc = new ExcelJS.Workbook();
    await doc.xlsx.load(buf as ArrayBuffer);
    expect(doc.worksheets.map((w) => w.name)).toEqual(["TH ĐẤT", "TH GIÁ TRỊ TRÌNH DUYỆT", "1. Hộ mẫu 01", "2. Hộ mẫu 02"]);
    const tg = doc.getWorksheet("TH GIÁ TRỊ TRÌNH DUYỆT")!;
    const hang = tg.getRow(4).values as unknown[];
    expect(hang[2]).toBe("Hộ mẫu 01");
    // Cột "Tổng cộng (làm tròn)" = 3 + 8 cột giá trị + 2 cột tổng + 1
    const tieuDe = (tg.getRow(3).values as unknown[]).map(String);
    const cotTong = tieuDe.indexOf("Tổng cộng (làm tròn)");
    expect(hang[cotTong]).toBe(ds[0]!.k.tong.tongLamTron.toNumber());
    const ws = doc.getWorksheet("1. Hộ mẫu 01")!;
    let thayTong = false;
    let dangChiTiet = false;
    let congChiTiet = 0;
    let soDongVuot = 0;
    ws.eachRow((r) => {
      const a = r.getCell(1).value, b = r.getCell(2).value;
      if (b === "Danh mục") dangChiTiet = true;
      else if (b === "TỔNG CỘNG (A + B)") {
        dangChiTiet = false;
        expect(r.getCell(7).value).toBe(ds[0]!.k.tong.tongChuaLamTron.toDecimalPlaces(0).toNumber());
      } else if (dangChiTiet && (typeof a === "number" || (a === "" || a === null) && r.getCell(3).value)) {
        congChiTiet += Number(r.getCell(7).value ?? 0);
        if (String(b).includes("Vượt mật độ")) {
          soDongVuot++;
          expect(r.getCell(5).value).toBe(0.3);
        }
      }
      if (b === "Làm tròn (lên đến nghìn đồng)") {
        expect(r.getCell(7).value).toBe(ds[0]!.k.tong.tongLamTron.toNumber());
        thayTong = true;
      }
    });
    expect(thayTong).toBe(true);
    // Cộng các dòng chi tiết (kể cả tách 100%/30%) = tổng A + B (sai khác chỉ do làm tròn hiển thị từng dòng)
    expect(Math.abs(congChiTiet - ds[0]!.k.tong.tongChuaLamTron.toNumber())).toBeLessThan(ds[0]!.k.tatCa.length * 2);
    expect(soDongVuot).toBeGreaterThan(0);
    // Hộ 2 chưa chốt → ghi "DỰ THẢO – CHƯA CHỐT"
    expect(doc.getWorksheet("2. Hộ mẫu 02")!.getCell("H1").value).toBe("DỰ THẢO – CHƯA CHỐT");
  });

  it("danh mục xã rút gọn trùng NQ 152", () => {
    expect(danhMuc).toEqual((nq152 as { danh_muc_xa: string[] }).danh_muc_xa);
  });
});
