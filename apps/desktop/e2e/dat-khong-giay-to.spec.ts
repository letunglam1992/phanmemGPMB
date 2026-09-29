/**
 * Kịch bản giao diện 0.8.5: bồi thường về đất khi không có giấy tờ (Điều 8 NĐ 88/2024) — hạn mức đất ở ở Thông tin dự án,
 * chọn Điều, thời điểm sử dụng ổn định ở chi tiết thửa; dòng tóm tắt phân bổ và dòng tính B03. Dữ liệu: bộ mẫu ẩn danh.
 */
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
const the = (p: Page, ten: string) => p.locator("[role=tablist] button", { hasText: ten });
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("Điều 8 NĐ 88: hạn mức đất ở dự án → phân bổ đất ở ở chi tiết thửa → dòng B03", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await the(p, "Thông tin dự án").click();
  await p.getByLabel("Hạn mức công nhận đất ở").fill("400");
  await p.getByLabel("Hạn mức giao đất ở").fill("200");
  await p.getByLabel("Căn cứ hạn mức đất ở").fill("QĐ hạn mức đất ở (thử)");
  await p.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(p.getByText("Đã lưu thông tin dự án")).toBeVisible();
  await the(p, "Hộ, cá nhân").click();
  await p.locator("tr[data-ho-id]").first().click();
  await the(p, "Thửa đất").click();
  await p.locator("button[title^='Giấy chứng nhận, phân lớp đất']").first().click();
  const k = p.locator("[data-khong-giay-to]").first();
  await k.getByLabel("Bồi thường về đất không có giấy tờ").selectOption("D8");
  await k.getByLabel("Thời điểm sử dụng đất ổn định").fill("01/01/1990");
  await expect(k.locator("[data-tom-tat-kgt]")).toContainText("khoản 2 Điều 8");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await the(p, "Tính toán").click();
  await expect(p.getByText(/Bồi thường về đất ở –/).first()).toBeVisible();
});
