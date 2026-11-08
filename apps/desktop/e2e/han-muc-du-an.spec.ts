/** 1.3.5 (QD-46): Thông tin dự án — hạn mức đất NN theo loại đất (Điều 7 Phụ lục I QĐ 106/2025); vị trí đất ở (Điều 3–6). */
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
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("điền hạn mức đất NN theo Điều 7 (xã); chọn vị trí đất ở → mức Điều 3, 4, 5; lưu và mở lại giữ nguyên", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await the(p, "Thông tin dự án").click();
  await p.getByRole("button", { name: "Điền theo Điều 7 Phụ lục I (xã)" }).click();
  await expect(p.getByLabel("Hạn mức đất NN cây hằng năm, NTS")).toHaveValue("20.000");
  await expect(p.getByLabel("Hạn mức đất NN cây lâu năm")).toHaveValue("300.000");
  await expect(p.getByLabel("Hạn mức đất NN rừng")).toHaveValue("300.000");
  await expect(p.getByLabel("Căn cứ hạn mức đất NN theo loại")).toHaveValue(/khoản 1 Điều 7 Phụ lục I/);
  // chưa chọn vị trí: ô số tự nhập; chọn "chỉ giáp đường xã" → công nhận 400/350 (Điều 3, 4), giao 180 (Điều 5)
  await expect(p.getByLabel("Hạn mức công nhận đất ở")).toBeVisible();
  await p.getByLabel("Vị trí hạn mức đất ở của dự án").selectOption("DUONG_XA");
  await expect(p.getByLabel("Hạn mức công nhận đất ở")).toHaveCount(0);
  const bang = p.locator("[data-han-muc-dat-o]");
  await expect(bang).toContainText("400 m²");
  await expect(bang).toContainText("350 m²");
  await expect(bang).toContainText("180 m²");
  await expect(bang).toContainText("Điều 5 Phụ lục I");
  await p.getByLabel("Vị trí hạn mức đất ở của dự án").selectOption("TRUNG_TAM");
  await expect(bang).toContainText("150 m²");
  await p.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(p.getByText("Đã lưu thông tin dự án")).toBeVisible();
  await the(p, "Tổng quan").click();
  await the(p, "Thông tin dự án").click();
  await expect(p.getByLabel("Hạn mức đất NN cây lâu năm")).toHaveValue("300.000");
  await expect(p.getByLabel("Vị trí hạn mức đất ở của dự án")).toHaveValue("TRUNG_TAM");
});
