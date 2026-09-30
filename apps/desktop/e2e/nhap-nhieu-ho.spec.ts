/**
 * Kịch bản giao diện 0.9.1: danh sách hộ có ô tích chọn, chọn tất cả theo bộ lọc, xóa nhiều hồ sơ vào thùng rác;
 * luồng nhập nhiều hộ — Hộ tiếp theo / Hộ trước theo danh sách đang lọc, Xong hộ này → Danh sách hộ (giữ bộ lọc, tô sáng),
 * phím Alt + ↑ / Alt + →, hỏi lưu khi chưa lưu. Dữ liệu: bộ mẫu ẩn danh (2 hộ).
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

test("chuyển hộ theo danh sách đang lọc; hỏi lưu; Xong hộ này → Danh sách hộ giữ bộ lọc, tô sáng hộ vừa làm", async ({ page: p }) => {
  await vao(p);
  await p.getByLabel("Tìm hộ trong dự án").fill("Hộ mẫu");
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(2);
  await p.locator("tr[data-ho-id]").first().click();
  const chuyen = p.locator("[data-chuyen-ho]");
  await expect(chuyen).toContainText("1/2 (theo danh sách đang lọc)");
  await expect(chuyen.getByRole("button", { name: "← Hộ trước" })).toBeDisabled();
  // Alt + → sang hộ tiếp theo
  await p.keyboard.press("Alt+ArrowRight");
  await expect(p.locator("h1")).toContainText("Hộ mẫu 02");
  await expect(chuyen).toContainText("2/2");
  await expect(chuyen.getByRole("button", { name: "Hộ tiếp theo →" })).toBeDisabled();
  // sửa chưa lưu → hỏi; "Ở lại" giữ nguyên hồ sơ
  await p.locator(".o-nhap", { hasText: "Điện thoại" }).locator("input").fill("0900000000");
  await chuyen.getByRole("button", { name: "← Hộ trước" }).click();
  const hoi = p.locator("[role=dialog]", { hasText: "Hồ sơ chưa lưu" });
  await expect(hoi).toBeVisible();
  await hoi.getByRole("button", { name: "Ở lại" }).click();
  await expect(p.locator("h1")).toContainText("Hộ mẫu 02");
  // thanh "Xong hộ này" sau thẻ Văn bản; Lưu rồi chuyển
  await p.locator("[role=tablist] button", { hasText: "Văn bản" }).first().click();
  await p.locator("[data-xong-ho]").getByRole("button", { name: "Xong hộ này → Danh sách hộ" }).click();
  await hoi.getByRole("button", { name: "Lưu rồi chuyển" }).click();
  await expect(p.getByLabel("Tìm hộ trong dự án")).toHaveValue("Hộ mẫu");
  const vuaLam = p.locator("tr.vua-lam");
  await expect(vuaLam).toHaveCount(1);
  await expect(vuaLam).toContainText("Hộ mẫu 02");
  // đã lưu thật: mở lại thấy số điện thoại; Alt + ↑ về danh sách không hỏi (không có thay đổi)
  await vuaLam.click();
  await expect(p.locator(".o-nhap", { hasText: "Điện thoại" }).locator("input")).toHaveValue("0900000000");
  await p.keyboard.press("Alt+ArrowUp");
  await expect(p.locator("tr.vua-lam")).toContainText("Hộ mẫu 02");
});

test("chọn tất cả theo bộ lọc, xóa nhiều hồ sơ vào thùng rác (bắt buộc lý do), ghi nhật ký", async ({ page: p }) => {
  await vao(p);
  await p.getByLabel("Tìm hộ trong dự án").fill("02");
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(1);
  await p.getByLabel("Chọn tất cả hồ sơ theo bộ lọc").check();
  await p.getByLabel("Tìm hộ trong dự án").fill("");
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(2);
  await expect(p.locator("tr.dang-chon[data-ho-id]")).toHaveCount(1);
  await p.getByLabel(/^Chọn hồ sơ H01/).check();
  const thanh = p.getByRole("toolbar", { name: "Thao tác với hồ sơ đã chọn" });
  await expect(thanh).toContainText("Đã chọn 2 hồ sơ");
  await thanh.getByRole("button", { name: "Xóa 2 hồ sơ" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Xóa 2 hồ sơ đã chọn" });
  const nut = hop.getByRole("button", { name: "Xóa 2 hồ sơ vào thùng rác" });
  await expect(nut).toBeDisabled();
  await hop.getByLabel("Lý do xóa nhiều hồ sơ").fill("Nhập trùng (thử)");
  await nut.click();
  await expect(p.getByText("Đã đưa 2 hồ sơ vào thùng rác")).toBeVisible();
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(0);
  await expect(thanh).toHaveCount(0);
});
