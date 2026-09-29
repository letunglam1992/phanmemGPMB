/**
 * Kịch bản giao diện 0.8.3: khoản 3 Điều 6 QĐ 14/2026 theo mốc xây dựng (trùng đúng ngày mốc → người dùng chọn mức),
 * khoản 7 cây trồng, khoản 8 chênh lệch giá đất, khoản 5 ổn định sản xuất. Dữ liệu: bộ mẫu ẩn danh.
 */
import { expect, test, type Page } from "@playwright/test";

async function vao(p: Page, i = 0) {
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
  await p.locator("tr[data-ho-id]").nth(i).click();
}
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("k3: nhà xây đúng ngày 01/7/2014 → chọn mức, ghi lý do; chọn cây trồng khoản 7", async ({ page: p }) => {
  await vao(p, 1); // hộ mẫu 02 có nhà tạm
  await p.locator("[role=tablist] button", { hasText: "Kiểm đếm tài sản" }).click();
  const cach = p.getByLabel("Cách tính nhà, công trình").first();
  await cach.selectOption("MOC_K3");
  await p.getByLabel("Ngày xây dựng").first().fill("01/07/2014");
  const chon = p.getByLabel("Chọn mức khi trùng ngày mốc").first();
  await expect(chon).toBeVisible();
  await chon.selectOption({ index: 1 });
  await p.getByLabel("Lý do chọn mức").first().fill("Biên bản xác định hoàn thành trước mốc (thử)");
  await p.getByLabel(/^Cây trồng thửa/).first().selectOption("B");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.locator("[role=tablist] button", { hasText: "Tính toán" }).click();
  await expect(p.getByText(/Hỗ trợ nhà, công trình – Nhà tạm/).first()).toBeVisible();
  await expect(p.locator("tr", { hasText: /Hỗ trợ nhà, công trình – Nhà tạm/ }).first()).toContainText("20.250.000"); // 27 m² × 1.500.000 × 50%
  await expect(p.locator("tr", { hasText: /Hỗ trợ nhà, công trình – Nhà tạm/ }).first()).toContainText("Có lựa chọn");
});

test("k8: chênh lệch giá đất ở chi tiết thửa; k5: ổn định sản xuất ở thẻ Hỗ trợ khác", async ({ page: p }) => {
  await vao(p);
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).click();
  await p.locator("button[title^='Giấy chứng nhận, phân lớp đất']").first().click();
  const cl = p.getByLabel("Hỗ trợ chênh lệch giá đất").first();
  await cl.selectOption("K8_RSX");
  await p.getByLabel("Loại đất hiện trạng").first().selectOption("CLN");
  await p.getByLabel("Giá đất hiện trạng").first().fill("100");
  await p.getByRole("tab", { name: "Hỗ trợ khác" }).click();
  const k5 = p.locator("[data-k5]");
  await k5.getByLabel("Áp dụng").check();
  await expect(k5.locator("input[type=checkbox]")).toHaveCount(5);
  const kq = p.locator(".the", { hasText: "Kết quả tạm tính — Hỗ trợ khác" });
  await expect(kq).toContainText("C03.K5");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.locator("[role=tablist] button", { hasText: "Tính toán" }).click();
  await expect(p.getByText(/Hỗ trợ về đất – CLN/).first().or(p.getByText(/B14/).first())).toBeVisible();
});
