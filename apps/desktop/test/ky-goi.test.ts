import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { kiemChuKyGoi, kyGoi } from "../src/ky-goi";
import { docGoi } from "../src/goi-chinh-sach";
import { KHOA_CONG_GIAY_PHEP } from "../src/giay-phep-khoa";

const goc = readFileSync(new URL("../../../policy/goi/sonla-2026-03-31.json", import.meta.url), "utf8");
const taoKhoa = async () => {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { rieng: await crypto.subtle.exportKey("jwk", k.privateKey), cong: await crypto.subtle.exportKey("jwk", k.publicKey) };
};

describe("1.0.18 — chữ ký gói chính sách", () => {
  it("ký gói nguyên bộ chính sách (tự bọc) → kiểm đúng; docGoi vẫn đọc được, mã SHA-256 không đổi", async () => {
    const k = await taoKhoa();
    const da = await kyGoi(goc, { donVi: "Tác giả phần mềm GPMB Sơn La", nguoiKy: "Người ký thử", luc: "2026-10-17T01:00:00.000Z" }, k.rieng);
    expect(JSON.parse(da)).toMatchObject({ dinhDang: "gpmb-goi-chinh-sach", chuKy: { v: 1, nguoiKy: "Người ký thử" } });
    expect(await kiemChuKyGoi(da, k.cong)).toEqual({ tt: "DA_KY", chuKy: { v: 1, donVi: "Tác giả phần mềm GPMB Sơn La", nguoiKy: "Người ký thử", luc: "2026-10-17T01:00:00.000Z" } });
    const a = await docGoi(goc, []), b = await docGoi(da, []);
    expect(b.loi).toEqual([]);
    expect(b.goi!.sha256).toBe(a.goi!.sha256);
    // ký lại tệp đã ký: thay chữ ký cũ
    const lai = await kyGoi(da, { donVi: "Tác giả", nguoiKy: "B" }, k.rieng);
    expect((await kiemChuKyGoi(lai, k.cong)).tt).toBe("DA_KY");
  });

  it("sửa nội dung, sửa người ký, khóa khác → SAI; không có chữ ký → CHUA_KY", async () => {
    const k = await taoKhoa(), k2 = await taoKhoa();
    const da = await kyGoi(goc, { donVi: "Tác giả", nguoiKy: "A" }, k.rieng);
    const sua = (f: (o: Record<string, any>) => void) => { const o = JSON.parse(da); f(o); return JSON.stringify(o); };
    expect((await kiemChuKyGoi(sua((o) => { o.chinhSach.hieuLucTu = "2026-01-01"; }), k.cong)).tt).toBe("SAI");
    expect((await kiemChuKyGoi(sua((o) => { o.chuKy.nguoiKy = "Người khác"; }), k.cong)).tt).toBe("SAI");
    expect((await kiemChuKyGoi(sua((o) => { o.donGia = { canCu: "x", dong: [] }; }), k.cong)).tt).toBe("SAI");
    expect((await kiemChuKyGoi(da, k2.cong)).tt).toBe("SAI");
    expect(await kiemChuKyGoi(sua((o) => { o.chuKy.ky = "@@"; }), k.cong)).toEqual({ tt: "SAI", lyDo: "Chữ ký hỏng (sai ký tự)" });
    expect(await kiemChuKyGoi(goc)).toEqual({ tt: "CHUA_KY" });
    expect(await kiemChuKyGoi("không phải json")).toEqual({ tt: "CHUA_KY" });
    // khóa công khai thật của phần mềm không nhận chữ ký bằng khóa thử
    expect((await kiemChuKyGoi(da, KHOA_CONG_GIAY_PHEP)).tt).toBe("SAI");
  });
});
