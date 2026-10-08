/** 1.0.5: báo cáo theo đoạn tuyến (lý trình) — báo cáo tổng hợp, Excel, Word. */
import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-10-06.json";
import { D, type BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { tinhHo } from "../src/tinh-ho";
import { dongTheoDoan, lapBaoCao } from "../src/bao-cao";
import { taoWorkbookBaoCao } from "../src/xuat-excel";
import { duLieuBaoCaoWord } from "../src/bao-cao-van-ban";
import { excelLyTrinh } from "../src/ly-trinh";
import ExcelJS from "exceljs";

const cs = cs0 as unknown as BoChinhSach;

describe("Báo cáo theo đoạn tuyến (1.0.5)", () => {
  const { duAn, ho } = taoDuAnMau();
  const [h1, h2, ...con] = ho;
  const hos = [
    { ...h1!, banGiao: { ngay: "2026-10-01" } as never, thua: h1!.thua.map((t, i) => ({ ...t, lyTrinh: i ? { tu: 1500, den: 1800 } : { tu: 200, den: 600 } })) },
    { ...h2!, thua: h2!.thua.map((t) => ({ ...t, lyTrinh: { tu: 500, den: 900 } })) },
    ...con,
  ];
  const ds = hos.map((h) => ({ h, k: tinhHo(cs, duAn, h) }));
  it("không ghi lý trình → không tách; có → đoạn 1 km theo điểm đầu nhỏ nhất của hộ, dòng chưa ghi lý trình, km sạch", () => {
    expect(dongTheoDoan(duAn, ho.map((h) => ({ h, k: tinhHo(cs, duAn, h) })), "2026-10-08")).toBeUndefined();
    const d = dongTheoDoan(duAn, ds, "2026-10-08")!;
    expect(d.map((x) => x.ten)).toEqual(["Km0+000 – Km1+000", ...(con.length ? ["Chưa ghi lý trình"] : [])]);
    expect(d[0]!.soHo).toBe(2); // h1 (bắt đầu 200) và h2 (500) cùng đoạn Km0
    expect(d[0]!.soDuAn).toBe(0);
    // có ghi trong Km0–Km1: hợp [200,900] = 700 m; sạch: [200,600] trừ phần chồng [500,900] của h2 chưa bàn giao → [200,500] = 300 m
    expect(d[0]!.mCoGhi).toBe(700);
    expect(d[0]!.mSach).toBe(300);
    expect(d[0]!.dtThuHoi.toString()).toBe(ds.slice(0, 2).reduce((s, x) => x.h.thua.reduce((a, t) => a.plus(t.dienTichThuHoi), s), D(0)).toString());
  });
  it("lapBaoCao gắn theoDoan; Excel có dòng '– Đoạn'; Word thêm dòng đoạn trong bảng dự án", async () => {
    const bc = lapBaoCao([duAn], () => ds, { denNgay: "2026-10-08" });
    expect(bc.dong[0]!.theoDoan?.length).toBeGreaterThan(0);
    expect(bc.tong.soDuAn).toBe(1);
    const wb = await taoWorkbookBaoCao(bc, "Đơn vị thử");
    const chu: string[] = [];
    wb.worksheets[0]!.eachRow((r) => chu.push(String(r.getCell(2).value ?? "")));
    expect(chu.some((c) => c.startsWith("   – Đoạn Km0+000 – Km1+000 (sạch 0,3/0,7 km)"))).toBe(true);
    const w = duLieuBaoCaoWord(bc, { coQuanCapTren: "", coQuan: "", kyHieu: "", so: "", diaDanh: "", ngayKy: "", kinhGui: "", moDau: "", khoKhanKhac: "", nhiemVu: "", kienNghi: "", ketThuc: "", noiNhan: "", quyenHan: "", nguoiKy: "" } as never) as { du_an: { ten: string; la_dot: boolean }[]; co_doan: boolean };
    expect(w.co_doan).toBe(true);
    expect(w.du_an.some((x) => x.la_dot && x.ten.startsWith("– Đoạn Km0+000"))).toBe(true);
  });
  it("Excel mặt bằng theo lý trình có trang Theo doan Km", async () => {
    const b = await excelLyTrinh("Dự án thử", [], () => "", [{ ten: "Km0+000 – Km1+000", soHo: 2, banGiao: 1, dtThuHoi: "100.5", tamTinh: "1000000", daDuyet: "0", mCoGhi: 700, mSach: 300 }]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(b as unknown as ArrayBuffer);
    const w = wb.getWorksheet("Theo doan Km")!;
    expect(w.getCell("B4").value).toBe("Km0+000 – Km1+000");
    expect(w.getCell("F4").value).toBe(0.3);
  });
});
