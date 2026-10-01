/** Báo cáo kiểm thử 0.9.12: lọc hộ theo mã ("HO80") rồi chọn; phân biệt mẫu cấp dự án khi mở từ hồ sơ hộ. */
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
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("Mẫu 17: lọc theo mã hộ không dấu gạch → Enter chọn; Bỏ chọn tất cả; Mẫu 20 ghi rõ cấp dự án", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  const dong = p.locator("tr[data-ho-id]").nth(1);
  await dong.click();
  await p.locator("[role=tablist] button", { hasText: "Văn bản" }).click();
  await p.locator(".muc-mau", { hasText: "Biên bản vận động nhận tiền" }).click();
  const dem = p.getByLabel("Số hộ đã chọn");
  await p.getByRole("button", { name: "Bỏ chọn tất cả" }).click();
  await expect(dem).toContainText("đã chọn 0/");
  // gõ mã kiểu khác (chữ thường, khoảng trắng, bỏ số 0 đầu: "h 2" ↔ "H02") vẫn lọc ra hộ
  await p.getByLabel("Lọc hộ").fill("h 2");
  await expect(p.locator(".ds-chon-ho label")).toHaveCount(1);
  await expect(p.locator(".ds-chon-ho label")).toContainText("H02");
  await p.getByLabel("Lọc hộ").press("Enter");
  await expect(dem).toContainText("đã chọn 1/");
  await expect(p.getByRole("button", { name: "Tạo văn bản cho 1 hộ" })).toBeVisible();
  await p.getByLabel("Lọc hộ").fill("khong-co-ho-nay");
  await expect(p.getByText("Không có hộ khớp")).toBeVisible();
  // Mẫu 20: cấp dự án
  await p.locator(".muc-mau", { hasText: "Tờ trình phê duyệt danh sách hỗ trợ bàn giao" }).click();
  await expect(p.getByText(/Mẫu cấp dự án — một văn bản chung cho cả dự án/)).toBeVisible();
  await expect(p.getByRole("button", { name: "Tạo văn bản cấp dự án (.docx)" })).toBeVisible();
});
