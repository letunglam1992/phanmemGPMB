/**
 * 1.0.10 — Trang cấp mã của tác giả (tools/giay-phep/cap-ma.html): nạp khóa riêng (khóa THỬ sinh trong kiểm thử), cấp
 * mã → mã kiểm được bằng docGiayPhep của phần mềm; danh sách mã đã cấp, xuất CSV.
 */
import { expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { docGiayPhep } from "../src/giay-phep";

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
});
