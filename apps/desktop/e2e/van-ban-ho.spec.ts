/**
 * Kịch bản giao diện 0.8.6: thẻ "Văn bản" trong hồ sơ hộ ngay sau "Tính toán, giải trình" — soạn đủ các mẫu, hộ chọn sẵn,
 * tự điền số liệu tính toán; thanh 12 thẻ vừa một hàng ở 1366 px; hồ sơ chưa lưu thì chặn tạo văn bản.
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
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
}
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.use({ viewport: { width: 1366, height: 768 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("thẻ Văn bản sau Tính toán; hộ chọn sẵn, tự điền; thẻ vừa một hàng; chưa lưu thì chặn tạo", async ({ page: p }) => {
  await vao(p);
  const tenThe = await p.locator(".tab-gon button").allInnerTexts();
  const i = tenThe.findIndex((t) => t.includes("Tính toán, giải trình"));
  expect(tenThe[i + 1]).toContain("Văn bản");
  await expect(p.locator(".the-tab .tab-mui-ten")).toHaveCount(0);
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await expect(p.locator(".vb-nhung-dau")).toContainText("Văn bản của hộ H01");
  await expect(p.getByText("Chọn hộ, tổ chức (1/")).toBeVisible();
  await expect(p.locator(".giai-trinh dd").filter({ hasText: /m²$/ }).first()).not.toContainText("undefined");
  await expect(p.getByRole("button", { name: /Tạo văn bản cho 1 hộ/ })).toBeEnabled();
  // mẫu cấp dự án cũng soạn được ngay trong hồ sơ hộ
  await p.locator(".muc-mau", { hasText: "Biên bản niêm yết công khai" }).first().click();
  await expect(p.getByRole("button", { name: "Tạo văn bản (.docx)" })).toBeVisible();
  // sửa hồ sơ chưa lưu → chặn tạo văn bản
  await p.locator(".tab-gon button", { hasText: "Thông tin" }).first().click();
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Họ tên chủ hộ / cá nhân')") }).locator("input").first().fill("Hộ mẫu 01 (sửa)");
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await expect(p.getByText(/Hồ sơ có thay đổi/)).toBeVisible();
});
