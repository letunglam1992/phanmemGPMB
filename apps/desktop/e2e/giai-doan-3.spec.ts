/**
 * Kịch bản giao diện Giai đoạn 3 (docs/17 §13): lịch sử thay đổi "từ … thành …" và khôi phục hồ sơ (quản trị),
 * thời hạn giữ lịch sử, lưu cập nhật tại chỗ (không tải lại toàn bộ), bảng hộ ảo hóa. Dữ liệu: bộ mẫu ẩn danh.
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
async function moHo(p: Page, i = 0) {
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(i).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}
const oNhap = (p: Page, nhan: string) => p.locator(".o-nhap", { has: p.locator(`label:text-is("${nhan}")`) }).locator("input").first();
const loiTrang: string[] = [];
let traLoi = "";
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept(traLoi) : d.accept()));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("P1-5: sửa hồ sơ → lịch sử 'từ … thành …'; quản trị khôi phục về bản cũ (có lý do)", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await oNhap(p, "Họ tên chủ hộ / cá nhân").fill("Hộ mẫu 01 (sửa)");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(p.locator(".trang-ho h1")).toContainText("Hộ mẫu 01 (sửa)");
  await p.locator("[role=tablist] button", { hasText: "Nhật ký" }).click();
  const ls = p.locator(".the", { hasText: "Lịch sử thay đổi" });
  await expect(ls).toContainText("Họ tên / tên tổ chức: Hộ mẫu 01 → Hộ mẫu 01 (sửa)");
  traLoi = "Sửa nhầm tên";
  await ls.getByRole("button", { name: "Khôi phục bản này" }).first().click();
  await expect(p.locator(".trang-ho h1")).toContainText("H01 · Hộ mẫu 01");
  await expect(p.locator(".trang-ho h1")).not.toContainText("(sửa)");
  await expect(p.locator(".the", { hasText: "Nhật ký hồ sơ" })).toContainText("Sửa nhầm tên");
  await expect(ls).toContainText("Trước khi khôi phục");
});

test("P1-5: thời hạn giữ lịch sử do quản trị đặt (0 = không thời hạn)", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("button", { name: "Cài đặt chung" }).first().click();
  await p.getByRole("button", { name: "Lịch sử bản ghi" }).click();
  await expect(p.getByText("Hiện tại: không thời hạn")).toBeVisible();
  await p.getByLabel("Giữ lịch sử (năm)").fill("10");
  await p.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(p.getByText("Hiện tại: 10 năm")).toBeVisible();
});

test("P1-2: lưu hồ sơ cập nhật tại chỗ — danh sách, tổng quan dự án thấy ngay, không tải lại", async ({ page: p }) => {
  await vao(p);
  await moHo(p, 1);
  await oNhap(p, "Họ tên chủ hộ / cá nhân").fill("Hộ mẫu 02 đổi tên");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await expect(p.locator("tr[data-ho-id]", { hasText: "Hộ mẫu 02 đổi tên" })).toBeVisible();
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(2);
});
