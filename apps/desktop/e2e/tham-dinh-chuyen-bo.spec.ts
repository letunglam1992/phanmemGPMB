/** 1.0.11: ghi nhận thẩm định phương án trước phê duyệt; chuyển bộ chính sách theo hộ kèm giải trình Word, Excel. */
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function vao(p: Page) {
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
}
const loiTrang: string[] = [];
test.use({ viewport: { width: 1366, height: 800 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("thẩm định: ghi nhận → trạng thái Đã thẩm định; ô đã ghi bị khóa; phê duyệt không còn nhắc", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  // 1.0.12: hạn thẩm định theo bản — ghi ngày nhận đủ hồ sơ cho cả bản
  const han = p.locator("[data-han-td]").first();
  await expect(han).toContainText("chưa ghi ngày nhận đủ hồ sơ");
  await han.getByRole("button", { name: "Ngày nhận đủ hồ sơ…" }).click();
  const nhs = p.locator("[role=dialog]", { hasText: "Ngày nhận đủ hồ sơ thẩm định" });
  await nhs.locator("input").first().fill("01/09/2026");
  await nhs.locator("input").first().press("Tab");
  await nhs.getByRole("button", { name: /^Lưu cho \d+ hộ$/ }).click();
  await expect(han).toContainText("Hạn thẩm định 13/10/2026");
  // chưa thẩm định: hộp phê duyệt nhắc
  await p.getByRole("button", { name: "Phê duyệt…" }).first().click();
  await expect(p.locator("[data-canh-bao-td]")).toContainText("Nghị định 88/2024");
  await p.locator("[role=dialog]").getByText("Đóng", { exact: true }).click();
  await p.getByRole("button", { name: "Thẩm định…" }).first().click();
  const td = p.locator("[role=dialog]", { hasText: "Ghi nhận thẩm định" });
  await td.getByPlaceholder("vd. Phòng Kinh tế xã …").fill("Phòng Kinh tế");
  await td.getByRole("button", { name: "Ghi nhận thẩm định" }).click();
  await expect(td).toHaveCount(0);
  await expect(p.locator("[data-tt-pa]").first()).toHaveText("Đã thẩm định, chờ phê duyệt");
  await expect(p.locator("[data-han-td]")).toHaveCount(0); // đã thẩm định thì không còn đếm hạn
  // 1.0.13: hạn phê duyệt 5 NLV — chưa có tờ trình → ghi ngày nhận tờ trình cho cả bản
  const hanPd = p.locator("[data-han-pd]").first();
  await expect(hanPd).toContainText("chưa có ngày tờ trình");
  await hanPd.getByRole("button", { name: "Ngày nhận tờ trình…" }).click();
  const ntt = p.locator("[role=dialog]", { hasText: "Ngày nhận tờ trình phê duyệt phương án" });
  await ntt.locator("input").first().fill("05/10/2026");
  await ntt.locator("input").first().press("Tab");
  await ntt.getByRole("button", { name: /^Lưu cho \d+ hộ$/ }).click();
  await expect(hanPd).toContainText("Hạn phê duyệt 12/10/2026");
  // còn thiếu số, ngày → bổ sung; cơ quan, ý kiến đã khóa
  await p.getByRole("button", { name: "Bổ sung thẩm định…" }).first().click();
  const bs = p.locator("[role=dialog]", { hasText: "Bổ sung kết quả thẩm định" });
  await expect(bs.getByPlaceholder("vd. Phòng Kinh tế xã …")).toBeDisabled();
  await expect(bs.getByLabel("Ý kiến thẩm định")).toBeDisabled();
  await bs.getByPlaceholder("…/BC-…").fill("45/BC-KT");
  await bs.getByRole("button", { name: "Lưu bổ sung" }).click();
  await expect(p.locator("#the-phuong-an")).toContainText("Thẩm định: 45/BC-KT");
  await p.getByRole("button", { name: "Phê duyệt…" }).first().click();
  await expect(p.locator("[data-canh-bao-td]")).toHaveCount(0);
  await p.locator("[role=dialog]").getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
  await expect(p.locator("[data-tt-pa]").first()).toHaveText("Đã phê duyệt");
  await expect(p.locator("[data-han-pd]")).toHaveCount(0);
});

test("chuyển bộ theo hộ: bảng chênh lệch, Word giải trình, Excel; áp dụng → hộ có bộ riêng", async ({ page: p }) => {
  // tải bằng liên kết (không mở hộp lưu của trình duyệt) để bắt được tệp
  await p.addInitScript(() => void ((window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker = undefined));
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Thông tin dự án" }).click();
  await p.getByRole("button", { name: "Chuyển theo hộ, đợt…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Chuyển bộ chính sách theo hộ, đợt" });
  await hop.getByLabel("Phạm vi chuyển").selectOption("ho");
  await hop.getByLabel("Bộ chính sách đích").selectOption("sonla-2026-03-31");
  await hop.locator("[data-chon-ho-bo] input[type=checkbox]").first().check();
  await expect(hop.locator("[data-bang-chuyen-bo] tbody tr")).toHaveCount(2); // 1 hộ + dòng tổng
  await expect(hop.getByRole("button", { name: "Áp dụng" })).toBeDisabled(); // chưa ghi lý do
  await hop.getByLabel("Lý do chuyển bộ").fill("Hộ đã lập xong trước ngày QĐ 64/2026 có hiệu lực");
  const w = p.waitForEvent("download");
  await hop.getByRole("button", { name: "Giải trình (Word)" }).click();
  const tw = await w;
  const docx = readFileSync((await tw.path())!);
  expect(docx.subarray(0, 2).toString()).toBe("PK");
  const x = p.waitForEvent("download");
  await hop.getByRole("button", { name: "Xuất Excel" }).click();
  const tx = await x;
  expect(readFileSync((await tx.path())!).subarray(0, 2).toString()).toBe("PK");
  await hop.getByRole("button", { name: "Áp dụng" }).click();
  await expect(hop).toHaveCount(0);
  await expect(p.locator("[data-bo-rieng]")).toContainText("1 hộ");
  await expect(p.locator("[data-bo-rieng]")).toContainText("sonla-2026-03-31");
});
