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
import { chotKy, kiemTraKy, kyTruoc, soSanhKyTruoc, tongKy } from "../src/ky-bao-cao";
import { cauSoSanh } from "../src/bao-cao-van-ban";

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

describe("Báo cáo tổng hợp theo đợt thu hồi (P3-1, 0.9.27)", () => {
  it("dự án có đợt: số liệu tách theo đợt, hộ chưa xếp đợt một dòng; tổng đợt bằng dự án; Excel có dòng đợt", async () => {
    const { duAnA, duAnB, duLieu } = await haiDuAn();
    const da: DuAn = { ...duAnA, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1" }, { id: "d2", so: 2, ten: "Đợt 2" }] };
    const ds = duLieu(duAnA);
    const duLieu2 = (d: DuAn) => (d.id === da.id ? ds.map((x, i) => ({ ...x, h: i === 0 ? { ...x.h, dotId: "d1" } : x.h })) : duLieu(d));
    const bc = lapBaoCao([da, duAnB], duLieu2, { denNgay: "2026-11-15" });
    const a = bc.dong.find((x) => x.duAn.id === da.id)!;
    expect(a.theoDot!.map((x) => [x.ten, x.soHo, x.soDuAn])).toEqual([["Đợt 1", 1, 0], ["Đợt 2", 0, 0], ["Chưa xếp đợt", 1, 0]]);
    expect(a.theoDot!.reduce((s, x) => s.plus(x.tamTinh), D(0)).toString()).toBe(a.tamTinh.toString());
    expect(a.theoDot!.reduce((s, x) => s.plus(x.daDuyet), D(0)).toString()).toBe(a.daDuyet.toString());
    expect(bc.dong.find((x) => x.duAn.id === duAnB.id)!.theoDot).toBeUndefined();
    expect(bc.tong.soDuAn).toBe(2);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await taoWorkbookBaoCao(bc, "UBND xã mẫu")).xlsx.writeBuffer());
    const ten = ws(wb).map((r) => String(r.getCell(2).value ?? ""));
    expect(ten.filter((x) => x.includes("– Đợt"))).toHaveLength(2);
    expect(ws(wb).find((r) => String(r.getCell(2).value).startsWith("TỔNG CỘNG"))!.getCell(4).value).toBe(4);
  });
});
const ws = (wb: ExcelJS.Workbook) => wb.getWorksheet("Tổng hợp")!.getRows(1, wb.getWorksheet("Tổng hợp")!.rowCount)!;

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

describe("Chốt số liệu kỳ báo cáo, so sánh kỳ trước", () => {
  it("chốt từ báo cáo không lọc; mã băm phát hiện sửa; số liệu kỳ không đổi khi hồ sơ sửa sau", async () => {
    const { duAnA, duAnB, duLieu } = await haiDuAn();
    await expect(chotKy(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-10-31", xa: "Xã Mai Sơn" }), "x", "a")).rejects.toThrow(/không lọc/);
    const k = await chotKy(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-10-31" }), "Tháng 10/2026", "Lãnh đạo mẫu", "2026-11-01T01:00:00Z");
    expect(k.dong).toHaveLength(2);
    expect(await kiemTraKy(k)).toBe(true);
    expect(await kiemTraKy({ ...k, dong: k.dong.map((x, i) => (i === 0 ? { ...x, daChi: "999" } : x)) })).toBe(false);
    expect(tongKy(k, { xa: "Xã Mai Sơn" }).soDuAn).toBe(1);
    expect(tongKy(k, {}).daChi.toNumber()).toBe(100_000_000);
  });

  it("so sánh với kỳ gần nhất trước ngày báo cáo, cùng bộ lọc; câu so sánh trong báo cáo Word", async () => {
    const { duAnA, duAnB, duLieu, phaiTra } = await haiDuAn();
    const k10 = await chotKy(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-10-31" }), "Tháng 10/2026", "a");
    const k9 = await chotKy(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-09-30" }), "Tháng 9/2026", "a");
    expect(kyTruoc([k10, k9], "2026-12-31")?.ten).toBe("Tháng 10/2026");
    expect(kyTruoc([k10, k9], "2026-10-15")?.ten).toBe("Tháng 9/2026");
    expect(kyTruoc([k10, k9], "2026-09-30")).toBeNull();
    const bc = lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-12-31" });
    const ss = soSanhKyTruoc(bc, k10);
    expect(ss.daChi.toString()).toBe(phaiTra.minus(100_000_000).toString()); // đợt chi 20/12
    expect(ss.hoanThanh).toBe(0);
    expect(cauSoSanh(ss)).toMatch(/^So với kỳ trước \(Tháng 10\/2026, số liệu đến 31\/10\/2026\): số hộ hoàn thành giải phóng mặt bằng không đổi; số hộ được phê duyệt phương án không đổi; chi trả thêm [\d.]+ đồng; số hộ vướng mắc/);
    // Bộ lọc xã áp cho cả số liệu kỳ trước
    expect(soSanhKyTruoc(lapBaoCao([duAnA, duAnB], duLieu, { denNgay: "2026-12-31", xa: "Xã Mai Sơn" }), k10).daChi.toNumber()).toBe(0);
    // Excel có trang Diễn biến: 2 kỳ + hiện tại
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await taoWorkbookBaoCao(bc, "x", [k10, k9])).xlsx.writeBuffer());
    const db = wb.getWorksheet("Diễn biến")!;
    expect([2, 3, 4].map((r) => db.getRow(r).getCell(1).value)).toEqual(["Tháng 9/2026", "Tháng 10/2026", "Hiện tại (chưa chốt)"]);
  });
});

describe("Báo cáo định kỳ (§11.4)", () => {
  it("hộ vướng mắc: bước đang thực hiện, số ngày tồn đọng từ ngày ghi vướng mắc; mẫu gốc có danh sách hộ vướng mắc", async () => {
    const { dsHoVuongMac } = await import("../src/bao-cao-dinh-ky");
    const { taoDuAnMau } = await import("../src/du-lieu-mau");
    const { tinhHo } = await import("../src/tinh-ho");
    const { duLieuBaoCaoWord } = await import("../src/bao-cao-van-ban");
    const { lapBaoCao } = await import("../src/bao-cao");
    const { dienMau } = await import("../src/van-ban/dien-mau");
    const cs1 = (await import("../../../policy/goi/sonla-2026-03-31.json")).default as unknown as import("@gpmb/core").BoChinhSach;
    const { duAn, ho } = taoDuAnMau();
    const hs = [{ ...ho[0]!, vuongMac: { noiDung: "Chưa nhận tiền", ngay: "2026-09-01" } }, ho[1]!];
    const f = () => hs.map((h) => ({ h, k: tinhHo(cs1, duAn, h) }));
    const vm = dsHoVuongMac([duAn], f, "2026-09-28");
    expect(vm).toHaveLength(1);
    expect(vm[0]).toMatchObject({ ma: hs[0]!.ma, so_ngay: 27, buoc: "5. Lập phương án" });
    expect(vm[0]!.noi_dung).toContain("Chưa nhận tiền");
    const bc = lapBaoCao([duAn], f, { denNgay: "2026-09-28" });
    const { readFileSync: doc } = await import("node:fs");
    const mau = doc(new URL("../public/mau-van-ban/bao-cao-tong-hop.docx", import.meta.url));
    const out = dienMau(mau, duLieuBaoCaoWord(bc, { coQuanCapTren: "", coQuan: "", kyHieu: "", diaDanh: "", kinhGui: "", so: "", ngayKy: "2026-09-28", moDau: "", khoKhanKhac: "", nhiemVu: "", kienNghi: "", ketThuc: "", noiNhan: "", quyenHan: "", nguoiKy: "" }, null, vm));
    const PizZip = (await import("pizzip")).default;
    const xml = new PizZip(out).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
    expect(xml).toContain("tồn đọng 27 ngày");
    expect(xml).toContain("Chưa nhận tiền");
  });
});
