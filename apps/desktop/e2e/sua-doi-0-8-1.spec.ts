/**
 * Kịch bản giao diện bản 0.8.1: ngày dd/mm/yyyy (không phụ thuộc ngôn ngữ Windows), mục Bản đồ ở thanh bên,
 * sửa chữa phần nhà còn lại (Điều 5 QĐ 14/2026) và thẻ Hỗ trợ khác (Điều 6). Dữ liệu: bộ mẫu ẩn danh.
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
const oNhap = (p: Page, nhan: string) => p.locator(".o-nhap", { has: p.locator(`label:text-is("${nhan}")`) }).locator("input").first();
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("Ngày hiển thị, nhập theo dd/mm/yyyy; thanh bên có Bản đồ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await the(p, "Thông tin dự án").click();
  const ngay = oNhap(p, "Ngày thông báo thu hồi đất");
  await expect(ngay).toHaveValue("15/04/2026"); // dữ liệu mẫu 2026-04-15
  await ngay.fill("09/01/2026");
  await p.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(p.getByText("Đã lưu thông tin dự án")).toBeVisible();
  await expect(p.locator(".kg-dau")).toContainText("TB: 09/01/2026"); // 9 tháng 1, không phải 1 tháng 9
  await ngay.fill("31/02/2026");
  await ngay.blur();
  await expect(ngay).toHaveAttribute("aria-invalid", "true");
  // thanh bên: Hồ sơ → Bản đồ → Báo cáo tổng hợp
  const ben = p.locator("nav button, aside button").filter({ hasText: /^(Hồ sơ|Bản đồ|Báo cáo tổng hợp)$/ });
  await expect(ben).toHaveText(["Hồ sơ", "Bản đồ", "Báo cáo tổng hợp"]);
  await p.getByRole("button", { name: "Bản đồ", exact: true }).first().click();
  await expect(the(p, "Bản đồ")).toHaveAttribute("aria-selected", "true");
});

test("Đ5: sửa chữa phần nhà còn lại theo dự toán; Đ6: thẻ Hỗ trợ khác (hộ nghèo, khoản k4)", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await the(p, "Hộ, cá nhân").click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Kiểm đếm tài sản" }).click();
  await p.getByRole("button", { name: "+ Sửa chữa phần còn lại (Đ5 QĐ14)" }).first().click();
  await p.getByLabel("Chi phí sửa chữa theo dự toán").last().fill("25.000.000");
  await p.getByLabel("Căn cứ dự toán sửa chữa").last().fill("Dự toán số 12 ngày 01/9/2026 (thử)");
  await p.getByLabel("Xác nhận phần còn lại bảo đảm tiêu chuẩn kỹ thuật").last().fill("Biên bản số 5 (thử)");
  await p.locator("[role=tablist] button", { hasText: "Hỗ trợ khác" }).click();
  const hn = p.locator(".the", { has: p.locator("h3", { hasText: /^Hộ nghèo$/ }) });
  await hn.getByLabel("Áp dụng").check();
  await oNhap(p, "Giấy tờ xác nhận hộ nghèo *").fill("QĐ công nhận hộ nghèo số 3 (thử)");
  await p.getByRole("button", { name: /Công trình ngoài cọc/ }).click();
  const kq = p.locator(".the", { hasText: "Kết quả tạm tính — Hỗ trợ khác" });
  await expect(kq).toContainText("C15");
  await expect(kq).toContainText("4.000.000");
  await expect(kq).toContainText("C17.4"); // khoản k4 chưa có căn cứ → Thiếu căn cứ
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.locator("[role=tablist] button", { hasText: "Tính toán" }).click();
  await expect(p.getByText("Hỗ trợ khác (Điều 6 QĐ 14/2026; Phụ lục II QĐ 106/2025)").first()).toBeVisible();
  await expect(p.getByText(/Sửa chữa phần còn lại/).first()).toBeVisible();
});
