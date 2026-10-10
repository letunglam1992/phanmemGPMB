/** 1.0.7 — Phiên bản tệp đính kèm: tải bản mới (giữ bản cũ), xem bản trước, dùng lại bản cũ. Dữ liệu mẫu ẩn danh. */
import { expect, test, type Page } from "@playwright/test";

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
test.setTimeout(90_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void (d.type() === "prompt" ? d.accept("Bản đã ký") : d.accept()));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("đính kèm → bản mới → 1 bản trước → dùng lại bản cũ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(0).click();
  await p.locator("[role=tab]", { hasText: "Đính kèm" }).click();
  await p.locator('input[type=file][multiple]').setInputFiles({ name: "bb-kiem-dem.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 v1") });
  await expect(p.getByRole("button", { name: "bb-kiem-dem.pdf" })).toBeVisible();
  await p.getByLabel("Tải bản mới của bb-kiem-dem.pdf").setInputFiles({ name: "bb-kiem-dem-da-ky.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 v2 da ky") });
  await expect(p.getByRole("button", { name: "bb-kiem-dem-da-ky.pdf" })).toBeVisible();
  await expect(p.getByRole("cell", { name: "Bản đã ký", exact: true })).toBeVisible();
  const tr = p.getByLabel("Bản trước của bb-kiem-dem-da-ky.pdf");
  await expect(tr).toHaveText("1 bản trước");
  await tr.click();
  await p.getByRole("button", { name: "Dùng lại bản này" }).click();
  await expect(p.getByLabel("Bản trước của bb-kiem-dem.pdf")).toHaveText("1 bản trước");
  await expect(p.locator("table.bang tbody tr")).toHaveCount(1);
});
