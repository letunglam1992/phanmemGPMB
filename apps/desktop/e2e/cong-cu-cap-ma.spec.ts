/**
 * 1.0.10 — Trang cấp mã của tác giả (tools/giay-phep/cap-ma.html): nạp khóa riêng (khóa THỬ sinh trong kiểm thử), cấp
 * mã → mã kiểm được bằng docGiayPhep của phần mềm; danh sách mã đã cấp, xuất CSV.
 */
import { expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { bamMa, docGiayPhep, trangThaiGiayPhep } from "../src/giay-phep";
import { kiemChuKyGoi } from "../src/ky-goi";

test("cấp mã bằng trang công cụ: mã hợp lệ với khóa công khai tương ứng; danh sách, CSV", async ({ page: p }) => {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const thuMuc = mkdtempSync(join(tmpdir(), "cap-ma-"));
  const tep = join(thuMuc, "khoa-thu.json");
  writeFileSync(tep, JSON.stringify({ ghiChu: "khóa thử", ...(await crypto.subtle.exportKey("jwk", k.privateKey)) }));
  const cong = await crypto.subtle.exportKey("jwk", k.publicKey);
  p.on("dialog", (d) => void (d.type() === "prompt" ? d.accept("wxyz-2345-6789-abcd") : d.accept()));
  await p.goto(`file://${resolve(process.cwd(), "../../tools/giay-phep/cap-ma.html")}`);
  await p.locator("#tep").setInputFiles(tep);
  await expect(p.locator("#ttKhoa")).toHaveText("Đã nạp khóa riêng.");
  await p.locator("#donVi").fill("UBND xã Thử");
  await p.locator("#maCaiDat").fill("abcd-efgh-jkmn-pqrs");
  await p.locator("#soDuAn").fill("4");
  await p.locator("#hetHan").fill("2027-06-30");
  await p.locator("#cap").click();
  // ký bất đồng bộ — chờ mã hiện ra rồi mới đọc
  await expect(p.locator("#ketQua")).toHaveValue(/^GPMB1\./);
  const ma = await p.locator("#ketQua").inputValue();
  const nd = await docGiayPhep(ma, cong);
  expect(nd).toMatchObject({ v: 1, donVi: "UBND xã Thử", maCaiDat: "ABCD-EFGH-JKMN-PQRS", soDuAn: 4, hetHan: "2027-06-30" });
  // thiếu mã cài đặt đúng dạng → báo
  await p.locator("#maCaiDat").fill("123");
  await p.locator("#cap").click();
  await expect(p.locator("#loi")).toContainText("16 ký tự");
  // danh sách đã cấp, xuất CSV
  await expect(p.locator("#bang")).toContainText("UBND xã Thử");
  await expect(p.locator("#bang")).toContainText("30/06/2027");
  const tai = p.waitForEvent("download");
  await p.locator("#xuatCsv").click();
  const csv = readFileSync((await (await tai).path())!, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"UBND xã Thử","ABCD-EFGH-JKMN-PQRS","4","30/06/2027"');
  expect(csv).toContain(ma);
  // 1.0.11: phiếu cấp mã (Word) có đơn vị, mã cài đặt, hạn, mã kích hoạt
  const tai2 = p.waitForEvent("download");
  await p.locator("#phieu").click();
  const dl = await tai2;
  expect(dl.suggestedFilename()).toMatch(/^Phieu-cap-ma_UBND-xa-Thu_\d{4}-\d{2}-\d{2}\.doc$/);
  const doc = readFileSync((await dl.path())!, "utf8");
  for (const x of ["PHIẾU CẤP MÃ KÍCH HOẠT", "UBND xã Thử", "ABCD-EFGH-JKMN-PQRS", "đến hết ngày 30/06/2027", ma]) expect(doc).toContain(x);
  // 1.0.11: cấp lại cho mã cài đặt mới (thay máy) giữ số dự án, hạn dùng
  await p.locator("[data-cap-lai='0']").click();
  await expect(p.locator("#bang")).toContainText("cấp lại, thay ABCD-EFGH-JKMN-PQRS");
  const ma2 = await p.locator("#ketQua").inputValue();
  expect(ma2).not.toBe(ma);
  expect(await docGiayPhep(ma2, cong)).toMatchObject({ donVi: "UBND xã Thử", maCaiDat: "WXYZ-2345-6789-ABCD", soDuAn: 4, hetHan: "2027-06-30" });
  const tai3 = p.waitForEvent("download");
  await p.locator("[data-phieu='0']").click();
  expect(readFileSync((await (await tai3).path())!, "utf8")).toContain("Cấp lại thay mã cài đặt ABCD-EFGH-JKMN-PQRS");
  // 1.0.12: cấp lại → mã cũ được đánh dấu chặn; xuất danh sách chặn đúng mã băm, phần mềm coi mã cũ là bị chặn
  await expect(p.locator("#bang")).toContainText("cần chặn");
  const tai4 = p.waitForEvent("download");
  await p.locator("#xuatChan").click();
  const tepChan = readFileSync((await (await tai4).path())!, "utf8");
  expect(tepChan).toContain("export const MA_CHAN: string[] = [");
  const chan = new Set([...tepChan.matchAll(/"([0-9a-f]{64})"/g)].map((m) => m[1]!));
  expect([...chan]).toEqual([await bamMa(ma)]);
  expect((await trangThaiGiayPhep(ma, "ABCD-EFGH-JKMN-PQRS", "2026-10-15", cong, chan)).loai).toBe("BI_CHAN");
  expect((await trangThaiGiayPhep(ma2, "WXYZ-2345-6789-ABCD", "2026-10-15", cong, chan)).loai).toBe("HOP_LE");
});

test("1.0.18: ký gói chính sách bằng trang công cụ — phần mềm kiểm đúng chữ ký; sửa một số thì chữ ký sai", async ({ page: p }) => {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const thuMuc = mkdtempSync(join(tmpdir(), "ky-goi-"));
  const tepKhoa = join(thuMuc, "khoa-thu.json");
  writeFileSync(tepKhoa, JSON.stringify({ ghiChu: "khóa thử", ...(await crypto.subtle.exportKey("jwk", k.privateKey)) }));
  const cong = await crypto.subtle.exportKey("jwk", k.publicKey);
  await p.goto(`file://${resolve(process.cwd(), "../../tools/giay-phep/cap-ma.html")}`);
  await p.locator("#kyGoi").click();
  await expect(p.locator("#ttGoi")).toContainText("Chưa nạp tệp khóa riêng");
  await p.locator("#tep").setInputFiles(tepKhoa);
  await expect(p.locator("#ttKhoa")).toHaveText("Đã nạp khóa riêng.");
  await p.locator("#tepGoi").setInputFiles({ name: "Gói thử.json", mimeType: "application/json", buffer: readFileSync(resolve(process.cwd(), "../../policy/goi/sonla-2026-10-06.json")) });
  await p.locator("#nguoiKyGoi").fill("Người ký thử");
  const tai = p.waitForEvent("download");
  await p.locator("#kyGoi").click();
  const dl = await tai;
  expect(dl.suggestedFilename()).toBe("Goi-thu_da-ky.json");
  const chu = readFileSync((await dl.path())!, "utf8");
  await expect(p.locator("#ttGoi")).toContainText("Đã ký gói");
  expect(await kiemChuKyGoi(chu, cong)).toMatchObject({ tt: "DA_KY", chuKy: { donVi: "Tác giả phần mềm GPMB Sơn La", nguoiKy: "Người ký thử" } });
  const sua = JSON.parse(chu);
  sua.chinhSach.ma = `${sua.chinhSach.ma}-sua`;
  expect((await kiemChuKyGoi(JSON.stringify(sua), cong)).tt).toBe("SAI");
});
