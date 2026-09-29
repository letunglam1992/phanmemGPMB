/**
 * Kịch bản giao diện 0.8.4: Phụ lục II QĐ 106/2025 — chi phí đầu tư vào đất còn lại (Điều 3), đất trong hành lang
 * (Điều 7), nhà trong hành lang lưới điện (k3 Điều 7), Điều 11, Điều 13 (SXKD), nhân khẩu Điều 12. Dữ liệu: bộ mẫu ẩn danh.
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
const the = (p: Page, ten: string) => p.locator("[role=tablist] button", { hasText: ten });
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("Điều 3, Điều 7: chi phí đầu tư và đất trong hành lang ở chi tiết thửa; nhà trong hành lang ở kiểm đếm", async ({ page: p }) => {
  await vao(p, 1);
  await the(p, "Thửa đất").click();
  await p.locator("button[title^='Giấy chứng nhận, phân lớp đất']").first().click();
  const pl = p.locator("[data-phu-luc-ii]").first();
  await pl.getByLabel("Chi phí đầu tư vào đất còn lại").selectOption("DU_TOAN");
  await pl.getByLabel("Giá trị chi phí đầu tư theo dự toán").fill("7.000.000");
  await pl.getByLabel("Dự toán chi phí đầu tư được duyệt").fill("QĐ 01/QĐ-UBND xã (thử)");
  await pl.getByLabel("Đất trong hành lang bảo vệ an toàn").selectOption("DIEN");
  await pl.getByLabel("DT trong hành lang").fill("50");
  await pl.getByLabel("Căn cứ DT hành lang").fill("Biên bản trích đo (thử)");
  await the(p, "Kiểm đếm tài sản").click();
  await p.getByLabel("Cách tính nhà, công trình").first().selectOption("HANH_LANG");
  await expect(p.getByLabel("Điểm khoản 3 Điều 7").first()).toHaveValue("a");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await the(p, "Tính toán").click();
  await expect(p.locator("tr", { hasText: /Chi phí đầu tư vào đất còn lại/ }).first()).toContainText("7.000.000");
  await expect(p.getByText(/Bồi thường đất trong hành lang/).first()).toBeVisible();
  await expect(p.locator("tr", { hasText: /Bồi thường, hỗ trợ nhà, công trình trong hành lang lưới điện – Nhà tạm/ }).first()).toContainText("28.350.000"); // 27 m² × 1.500.000 × 70%
});

test("Điều 11, Điều 13 ở thẻ Hỗ trợ khác; Điều 12 nhân khẩu ở thẻ Hỗ trợ", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("tab", { name: "Hỗ trợ", exact: true }).click();
  const od = p.locator(".the", { hasText: "Hỗ trợ ổn định đời sống" }).first();
  await od.getByLabel("Áp dụng").check();
  await expect(p.getByLabel("Số nhân khẩu ổn định đời sống")).toBeVisible();
  await p.getByRole("tab", { name: "Hỗ trợ khác" }).click();
  const d11 = p.locator("[data-dieu-11]");
  await d11.getByLabel("Áp dụng Điều 11").check();
  await d11.getByLabel("Số tháng thuê nhà Điều 11").fill("8");
  const sx = p.locator("[data-sxkd]");
  await sx.getByLabel("Áp dụng ổn định SXKD").check();
  await sx.getByLabel("Trường hợp ổn định SXKD").selectOption("K3");
  await sx.getByLabel("Doanh thu bình quân").fill("90.000.000");
  await sx.getByLabel("Căn cứ số liệu SXKD").fill("Văn bản cơ quan thuế (thử)");
  const kq = p.locator(".the", { hasText: "Kết quả tạm tính — Hỗ trợ khác" });
  await expect(kq).toContainText("C09");
  await expect(kq.locator("tr", { hasText: "C04" })).toContainText("2.400.000");
  await expect(kq.locator("tr", { hasText: "C09" })).toContainText("tối đa 6 tháng");
});
