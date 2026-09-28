import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { D } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, pheDuyet } from "../src/phuong-an";
import { tinhHo } from "../src/tinh-ho";
import { lapBaoCao } from "../src/bao-cao";
import type { DuAn, Ho } from "../src/mo-hinh";
import { taoWorkbookBaoCao } from "../src/xuat-excel";
import ExcelJS from "exceljs";

const cs = cs0 as unknown as BoChinhSach;

async function haiDuAn() {
  const a = taoDuAnMau();
  const b = taoDuAnMau();
  const duAnB: DuAn = { ...b.duAn, ten: "Dự án mẫu B", xa: "Xã Mai Sơn" };
  const hoB = b.ho.map((h) => ({ ...h, duAnId: duAnB.id }));
  // Dự án A: hộ 01 đã duyệt, chi 100 triệu ngày 20/10 và phần còn lại ngày 20/12 (sau ngày báo cáo)
  const p = pheDuyet(await chotPhuongAn(cs, a.duAn, [a.ho[0]!], { ten: "B1", lyDo: "", nguoi: "x" }), { so: "1/QĐ", ngay: "2026-10-01", coQuan: "" }, "x");
  const phaiTra = D(p.ho[0]!.conLai);
  const duAnA: DuAn = { ...a.duAn, phuongAn: [p] };
  const hoA: Ho[] = [
    { ...a.ho[0]!, chiTra: { dot: [
      { id: "d1", ngay: "2026-10-20", soTien: "100000000", hinhThuc: "CHUYEN_KHOAN", chungTu: "UNC 1", nguoiGhi: "a" },
      { id: "d2", ngay: "2026-12-20", soTien: phaiTra.minus(100000000).toFixed(), hinhThuc: "CHUYEN_KHOAN", chungTu: "UNC 2", nguoiGhi: "a" },
    ] } },
    a.ho[1]!,
  ];
  const hoCua = new Map<string, Ho[]>([[duAnA.id, hoA], [duAnB.id, hoB]]);
  const duLieu = (d: DuAn) => hoCua.get(d.id)!.map((h) => ({ h, k: tinhHo(cs, d, h) }));
  return { duAnA, duAnB, duLieu, phaiTra };
}

describe("Báo cáo tổng hợp nhiều dự án", () => {
  it("tổng hợp theo dự án, theo xã; chi trả tính đến ngày báo cáo", async () => {
    const { duAnA, duAnB, duLieu, phaiTra } = await haiDuAn();
    const bc = lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15" });
    expect(bc.dong.map((x) => x.duAn.xa)).toEqual(["Xã Chiềng Mung", "Xã Mai Sơn"]);
    const a = bc.dong[0]!;
    expect(a.soHo).toBe(2);
    expect(a.soHoDaDuyet).toBe(1);
    expect(a.daDuyet.toString()).toBe(phaiTra.toString());
    expect(a.daChi.toNumber()).toBe(100_000_000); // đợt 20/12 sau ngày báo cáo: không tính
    expect(a.conPhaiChi.toString()).toBe(phaiTra.minus(100_000_000).toString());
    expect(a.tamTinh.toString()).toBe(duLieu(duAnA).reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)).toString());
    expect(bc.tong.soDuAn).toBe(2);
    expect(bc.tong.soHo).toBe(4);
    expect(bc.tong.tamTinh.toString()).toBe(bc.dong[0]!.tamTinh.plus(bc.dong[1]!.tamTinh).toString());
    expect(bc.theoXa.map((x) => [x.xa, x.tong.soDuAn])).toEqual([["Xã Chiềng Mung", 1], ["Xã Mai Sơn", 1]]);
    // Hết hạn 30 ngày (31/10) còn nợ: có tiền chậm trả nhưng chưa nhập tỷ lệ → đếm hộ thiếu tỷ lệ, không tự điền mức
    expect(a.soHoChamTraThieuTyLe).toBe(1);
    expect(a.chamTra.toNumber()).toBe(0);
    // Tính đến sau ngày chi đủ
    const sau = lapBaoCao([duAnA], duLieu, { denNgay: "2026-12-31" }).dong[0]!;
    expect(sau.daChi.toString()).toBe(phaiTra.toString());
    expect(sau.soHoDaChiDu).toBe(1);
  });

  it("lọc theo xã, tình trạng", async () => {
    const { duAnA, duAnB, duLieu } = await haiDuAn();
    expect(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15", xa: "Xã Mai Sơn" }).dong.map((x) => x.duAn.ten)).toEqual(["Dự án mẫu B"]);
    const bc = lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15" });
    for (const t of new Set(bc.dong.map((x) => x.tinhTrang)))
      expect(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15", tinhTrang: t }).dong.every((x) => x.tinhTrang === t)).toBe(true);
  });

  it("xuất Excel: trang Tổng hợp (theo xã, cộng xã, tổng cộng) và trang Vướng mắc", async () => {
    const { duAnA, duAnB, duLieu } = await haiDuAn();
    const bc = lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15" });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await taoWorkbookBaoCao(bc, "UBND xã mẫu")).xlsx.writeBuffer());
    const ws = wb.getWorksheet("Tổng hợp")!;
    const chu: string[] = [];
    ws.eachRow((r) => chu.push(r.values!.toString()));
    const t = chu.join("\n");
    expect(t).toContain("Xã Chiềng Mung");
    expect(t).toContain("Cộng xã Mai Sơn");
    expect(t).toContain("TỔNG CỘNG");
    const tong = ws.getRows(1, ws.rowCount)!.find((r) => String(r.getCell(2).value).startsWith("TỔNG CỘNG"))!;
    expect(tong.getCell(4).value).toBe(4);
    expect(wb.getWorksheet("Vướng mắc")).toBeTruthy();
  });
});

describe("Báo cáo tổng hợp — mẫu Word", () => {
  it("điền được mẫu, không còn trường {…}; bảng từng dự án, tổng cộng, vướng mắc", async () => {
    const { readFileSync } = await import("node:fs");
    const PizZip = (await import("pizzip")).default;
    const { dienMau } = await import("../src/van-ban/dien-mau");
    const { duLieuBaoCaoWord } = await import("../src/bao-cao-van-ban");
    const { duAnA, duAnB, duLieu } = await haiDuAn();
    const bc = lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15" });
    const du = duLieuBaoCaoWord(bc, { coQuanCapTren: "UBND xã mẫu", coQuan: "Phòng Kinh tế", kyHieu: "KT", diaDanh: "Chiềng Mung", kinhGui: "Ủy ban nhân dân xã", so: "15", ngayKy: "2026-11-16", moDau: "Thực hiện chỉ đạo …", khoKhanKhac: "", nhiemVu: "Tiếp tục chi trả.", kienNghi: "Không.", ketThuc: "Trên đây là báo cáo …/.", noiNhan: "Như trên\nLưu: VT", quyenHan: "Trưởng phòng", nguoiKy: "Cán bộ mẫu" });
    const mau = readFileSync(new URL("../public/mau-van-ban/bao-cao-tong-hop.docx", import.meta.url));
    const t = new PizZip(dienMau(mau, du)).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
    expect(t).not.toMatch(/\{[#/^]?[\w.]+\}/);
    expect(t).toContain("Số: 15/BC-KT");
    expect(t).toContain("Tổng số 2 dự án; 4 hộ gia đình, cá nhân, tổ chức có đất thu hồi");
    expect(t).toContain("Dự án mẫu B (Xã Mai Sơn)");
    expect(t).toContain("Tổng cộng");
    expect(t).toContain("(Số liệu tính đến ngày 15/11/2026)");
    expect(t).toContain("- Như trên;");
    expect(t).toContain("Cán bộ mẫu");
    expect(t).toContain("các dự án\n");
    expect(t).not.toContain("các dự án…");
    // Lọc theo xã: tiêu đề nêu địa bàn; khó khăn khác bỏ trống thì không in dấu chấm
    const bcXa = lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-11-15", xa: "Xã Mai Sơn" });
    const t2 = new PizZip(dienMau(mau, duLieuBaoCaoWord(bcXa, { coQuanCapTren: "", coQuan: "", kyHieu: "", diaDanh: "", kinhGui: "", so: "", ngayKy: "", moDau: "", khoKhanKhac: "", nhiemVu: "", kienNghi: "", ketThuc: "", noiNhan: "", quyenHan: "", nguoiKy: "" }))).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
    expect(t2).toContain("các dự án trên địa bàn xã Mai Sơn");
    expect(t2.split("\n").filter((d) => d.trim() === "").length).toBeLessThan(t.split("\n").filter((d) => d.trim() === "").length + 3);
  });
});
