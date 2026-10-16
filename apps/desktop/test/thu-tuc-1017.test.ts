import { describe, expect, it } from "vitest";
import cs0 from "../../../policy/goi/sonla-2026-03-31.json";
import type { BoChinhSach } from "@gpmb/core";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { chotPhuongAn, ghiThamDinh, pheDuyet } from "../src/phuong-an";
import { tinhHo } from "../src/tinh-ho";
import { tienDoThuTuc } from "../src/tien-do-thu-tuc";
import { hanChinhLyBan, kiemTraTruocThamDinh } from "../src/thu-tuc-ban";
import { LICH_TRONG } from "../src/lich-lam-viec";
import { canhBaoDuAn } from "../src/trang-thai";
import { tomTatDuAn } from "../src/tong-hop-tinh/goi-tinh";
import type { DuAn, Ho } from "../src/mo-hinh";

const cs = cs0 as unknown as BoChinhSach;
const O = { ten: "PA 1", lyDo: "", nguoi: "A", luc: "2026-09-01T08:00:00.000Z" };
const xong = (h: Ho, buoc: string, ngay: string): Ho => ({ ...h, tienDo: { ...h.tienDo, [buoc]: { trangThai: "XONG", ngay } } });

async function banDaDuyet() {
  const { duAn, ho: ho0 } = taoDuAnMau();
  const ho = [ho0[0]!, { ...ho0[0]!, id: `${ho0[0]!.id}-2`, ma: "H99" }];
  const p0 = await chotPhuongAn(cs, duAn, ho, O);
  const p = pheDuyet(ghiThamDinh(p0, { so: "1", ngay: "2026-10-16", coQuan: "PKT", yKien: "THONG_NHAT" }, "B"), { so: "5/QĐ", ngay: "2026-10-26", coQuan: "UBND" }, "L");
  return { duAn: { ...duAn, phuongAn: [p] } as DuAn, ho, p, p0 };
}

describe("1.0.17 — chỉnh lý hồ sơ địa chính theo bản; chi trả, chỉnh lý quá hạn gửi tỉnh; kiểm tra trước thẩm định", () => {
  it("chỉnh lý: hạn 3 NLV sau chi trả, một cảnh báo cho cả bản, Excel tiến độ có khâu chỉnh lý", async () => {
    const { duAn, ho, p } = await banDaDuyet();
    // hộ 1 chi trả xong thứ Hai 02/11 → hạn chỉnh lý thứ Năm 05/11; hộ 2 chưa chi trả (chưa có mốc)
    const hos = [xong(ho[0]!, "12", "2026-11-02"), ho[1]!];
    const t = hanChinhLyBan(p, hos, duAn.phuongAn!, "2026-11-10", LICH_TRONG)!;
    expect(t).toMatchObject({ moc: "2026-11-02", hanChot: "2026-11-05", trangThai: "QUA_HAN" });
    const cb = canhBaoDuAn(duAn, hos.map((h) => ({ h, k: tinhHo(cs, duAn, h) })), "2026-11-10");
    expect(cb.filter((c) => /quá hạn chỉnh lý hồ sơ địa chính/.test(c.noiDung))).toHaveLength(1);
    expect(cb.some((c) => /bước 15/.test(c.noiDung) && c.hoId)).toBe(false);
    const [d] = tienDoThuTuc(duAn, hos, "2026-11-10", LICH_TRONG);
    expect(d!.chinhLy).toMatchObject({ han: "2026-11-05", xong: null, cham: 3, dangCham: true, daXong: 0, soHo: 2 });
    // cả hai hộ chỉnh lý xong → ngày xong muộn nhất, chậm tính từ hạn sớm nhất
    const hos2 = [xong(xong(ho[0]!, "12", "2026-11-02"), "15", "2026-11-04"), xong(xong(ho[1]!, "12", "2026-11-09"), "15", "2026-11-11")];
    const [d2] = tienDoThuTuc(duAn, hos2, "2026-11-20", LICH_TRONG);
    expect(d2!.chinhLy).toMatchObject({ xong: "2026-11-11", daXong: 2, dangCham: false });
    expect(hanChinhLyBan(p, hos2, duAn.phuongAn!, "2026-11-20", LICH_TRONG)).toBeNull();
  });

  it("tóm tắt gửi tỉnh có khâu chi trả và chỉnh lý quá hạn", async () => {
    const { duAn, ho } = await banDaDuyet();
    const hos = [xong(ho[0]!, "12", "2026-11-02"), ho[1]!];
    const [tt] = tomTatDuAn([duAn], hos, () => 0, "2026-12-01");
    const khau = (tt!.quaHan ?? []).map((q) => [q.khau, q.han]);
    expect(khau).toContainEqual(["Chi trả (2/2 hộ chưa chi đủ)", "2026-11-25"]);
    expect(khau).toContainEqual(["Chỉnh lý hồ sơ địa chính", "2026-11-05"]);
    expect(tt!.quaHan!.find((q) => q.khau.startsWith("Chi trả"))!.canCu).toBe("điểm a khoản 3 Điều 94 Luật Đất đai 2024");
  });

  it("kiểm tra trước thẩm định: niêm yết 30 ngày, bước 6, ý kiến, đối thoại", async () => {
    const { duAn, ho, p0 } = await banDaDuyet();
    const da: DuAn = { ...duAn, phuongAn: [p0] };
    expect(kiemTraTruocThamDinh(da, p0, ho, null, "2026-10-01", LICH_TRONG)).toEqual([
      "Chưa ghi thời gian niêm yết công khai phương án (ô \"Niêm yết từ … đến …\" của mẫu 09/10) — chưa kiểm tra được đủ 30 ngày.",
      "2/2 hộ chưa xác nhận xong bước 6 (niêm yết công khai).",
      "2/2 hộ chưa ghi ý kiến về phương án.",
    ]);
    const vb = (tu: string, den: string): DuAn => ({ ...da, vanBan: { ...(da.vanBan ?? {}), tg_niem_yet_tu: tu, tg_niem_yet_den: den } });
    const ok = ho.map((h) => ({ ...xong(h, "6", "2026-10-01"), yKienPA: { loai: "DONG_Y" as const } }));
    expect(kiemTraTruocThamDinh(vb("01/09/2026", "20/09/2026"), p0, ok, null, "2026-10-05", LICH_TRONG)).toEqual(["Thời gian niêm yết ghi 01/09/2026 – 20/09/2026 chưa đủ 30 ngày (đủ vào ngày 01/10/2026)."]);
    expect(kiemTraTruocThamDinh(vb("01/09/2026", ""), p0, ok, "2026-09-25", "2026-10-05", LICH_TRONG)).toEqual(["Ngày nhận hồ sơ 25/09/2026 trước khi hết 30 ngày niêm yết (niêm yết từ 01/09/2026, đủ 30 ngày vào 01/10/2026)."]);
    expect(kiemTraTruocThamDinh(vb("01/09/2026", "01/10/2026"), p0, ok, "2026-10-05", "2026-10-05", LICH_TRONG)).toEqual([]);
    const kdy = [{ ...ok[0]!, yKienPA: { loai: "KHONG_DONG_Y" as const, ngayLay: "2026-10-02" } }, ok[1]!];
    expect(kiemTraTruocThamDinh(vb("01/09/2026", "01/10/2026"), p0, kdy, "2026-10-05", "2026-10-05", LICH_TRONG)).toEqual(["1 hộ không đồng ý chưa được đối thoại."]);
    // bản thuộc đợt: lấy thời gian niêm yết của đợt
    const daDot: DuAn = { ...da, dotThuHoi: [{ id: "d1", so: 1, ten: "Đợt 1", vanBan: { tg_niem_yet_tu: "01/09/2026", tg_niem_yet_den: "01/10/2026" } }] };
    expect(kiemTraTruocThamDinh(daDot, { ...p0, dotId: "d1" }, ok, "2026-10-05", "2026-10-05", LICH_TRONG)).toEqual([]);
  });
});
