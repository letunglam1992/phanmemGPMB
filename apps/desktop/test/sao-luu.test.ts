import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { taoKhoBoNho } from "../src/kho";
import { taoDuAnMau } from "../src/du-lieu-mau";
import { LoiSaoLuu, canhBaoSaoLuu, docBanSaoLuu, khoiPhuc, taoBanSaoLuu, tenTepSaoLuu } from "../src/sao-luu";

async function khoCoDuLieu() {
  const kho = taoKhoBoNho();
  const { duAn, ho } = taoDuAnMau();
  await kho.luuDuAn(duAn);
  for (const h of ho) await kho.luuHo(h);
  await kho.luuBanDo(duAn.id, new Uint8Array([8, 9, 0xfe, 1, 2, 3]));
  await kho.luuMau("05", new Uint8Array([0x50, 0x4b, 3, 4]), "mau-05-cua-xa.docx");
  await kho.luuCaiDat("lichLamViec", { nghi: [{ ngay: "2026-09-02", ten: "Quốc khánh" }], lamBu: [], namDaDu: [2026] });
  await kho.luuCaiDat("kyBaoCao", [{ id: "ky-1", ten: "Tháng 8/2026", denNgay: "2026-08-31", chotLuc: "", nguoi: "", dong: [], bam: "" }]);
  return { kho, duAn, ho };
}

describe("Sao lưu, khôi phục dữ liệu", () => {
  it("sao lưu rồi khôi phục (thay thế) vào kho trống cho lại đúng dự án, hồ sơ, bản đồ, mẫu tự chỉnh", async () => {
    const { kho, duAn, ho } = await khoCoDuLieu();
    const { bytes, thongTin } = await taoBanSaoLuu(kho);
    expect(thongTin).toMatchObject({ soDuAn: 1, soHo: ho.length, soBanDo: 1, soMau: 1 });
    const ban = await docBanSaoLuu(bytes);
    const moi = taoKhoBoNho();
    await khoiPhuc(moi, ban, "THAY_THE");
    expect(await moi.dsDuAn()).toEqual([duAn]);
    expect(await moi.dsHo(duAn.id)).toEqual(await kho.dsHo(duAn.id));
    expect([...(await moi.docBanDo(duAn.id))!]).toEqual([8, 9, 0xfe, 1, 2, 3]);
    const m = await moi.docMau("05");
    expect(m?.tenTep).toBe("mau-05-cua-xa.docx");
    expect([...m!.bytes]).toEqual([0x50, 0x4b, 3, 4]);
    expect(await moi.docCaiDat("lichLamViec")).toMatchObject({ namDaDu: [2026] });
    expect(await moi.docCaiDat("kyBaoCao")).toMatchObject([{ ten: "Tháng 8/2026" }]);
  });

  it("THAY_THE xóa dữ liệu cũ; GOP giữ dữ liệu khác mã", async () => {
    const { kho } = await khoCoDuLieu();
    const ban = await docBanSaoLuu((await taoBanSaoLuu(kho)).bytes);
    const khac = taoDuAnMau();
    const k1 = taoKhoBoNho();
    await k1.luuDuAn(khac.duAn);
    await khoiPhuc(k1, ban, "GOP");
    expect(await k1.dsDuAn()).toHaveLength(2);
    const k2 = taoKhoBoNho();
    await k2.luuDuAn(khac.duAn);
    await k2.luuMau("09", new Uint8Array([1]), "x.docx");
    await khoiPhuc(k2, ban, "THAY_THE");
    expect((await k2.dsDuAn()).map((d) => d.id)).toEqual(ban.duAn.map((d) => d.id));
    expect(await k2.docMau("09")).toBeNull();
  });

  it("phát hiện tệp bị sửa, sai định dạng, phiên bản mới hơn", async () => {
    const { kho } = await khoCoDuLieu();
    const { bytes } = await taoBanSaoLuu(kho);
    const zip = new PizZip(bytes);
    zip.file("du-lieu.json", zip.file("du-lieu.json")!.asText().replace("Dự án mẫu", "Dự án sửa"));
    await expect(docBanSaoLuu(zip.generate({ type: "uint8array" }))).rejects.toThrow(/không khớp mã kiểm tra/);

    await expect(docBanSaoLuu(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(LoiSaoLuu);

    const z2 = new PizZip(bytes);
    const tt = JSON.parse(z2.file("thong-tin.json")!.asText());
    z2.file("thong-tin.json", JSON.stringify({ ...tt, phienBan: 99 }));
    await expect(docBanSaoLuu(z2.generate({ type: "uint8array" }))).rejects.toThrow(/mới hơn phần mềm/);

    const z3 = new PizZip(bytes);
    z3.remove("ban-do/" + (await kho.dsBanDo())[0] + ".dgn");
    await expect(docBanSaoLuu(z3.generate({ type: "uint8array" }))).rejects.toThrow(/không khớp/);
  });

  it("nhắc sao lưu và tên tệp không dấu", () => {
    expect(canhBaoSaoLuu(null, "2026-09-27", false)).toBeNull();
    expect(canhBaoSaoLuu(null, "2026-09-27", true)).toContain("Chưa có bản sao lưu");
    expect(canhBaoSaoLuu("2026-09-22T08:00:00.000Z", "2026-09-27", true)).toBeNull();
    expect(canhBaoSaoLuu("2026-09-10T08:00:00.000Z", "2026-09-27", true)).toContain("17 ngày");
    expect(tenTepSaoLuu("2026-09-27T08:05:00.000Z")).toBe("GPMB-sao-luu_2026-09-27_0805.gpmb");
  });
});
