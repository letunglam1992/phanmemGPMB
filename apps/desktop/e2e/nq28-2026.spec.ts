/**
 * NQ 28/2026/NQ-HĐND (hiệu lực 01/11/2026, QD-33): hộp Chọn giá đất theo thời điểm định giá —
 * tuyến bổ sung, đổi tên (Chiềng La STT 3.3), k8 Đ7 (90% giá đất ở), lý do không giảm chênh cao.
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
const loiTrang: string[] = [];
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("Chọn giá đất theo thời điểm định giá: NQ 152 trước 01/11/2026, NQ 152 sửa đổi bởi NQ 28/2026 từ 01/11/2026", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).click();
  await p.getByRole("button", { name: /^(Đổi|Chọn giá đất…)$/ }).first().click();
  const hop = p.locator(".hop-thoai, [role=dialog]").filter({ hasText: "Chọn giá đất" }).last();
  const ngay = hop.getByLabel("Thời điểm định giá");

  await ngay.fill("31/10/2026");
  await ngay.press("Tab");
  await expect(hop.locator("[data-bang-ap-dung]")).toHaveText(/^Áp dụng: NQ 152\/2025\/NQ-HĐND ngày 29\/12\/2025$/);
  await hop.locator("select").nth(0).selectOption("DAT_O");
  await hop.locator("select").nth(1).selectOption("Xã Chiềng La");
  await expect(hop.getByText("Từ đất nhà Lò Văn Xôm đến đất nhà ông Quàng Văn Ngấn")).toBeVisible();
  await expect(hop.locator("[data-chenh-cao]")).toContainText("giảm 30%");

  await ngay.fill("01/11/2026");
  await ngay.press("Tab");
  await expect(hop.locator("[data-bang-ap-dung]")).toContainText("Nghị quyết số 28/2026/NQ-HĐND");
  await expect(hop.getByText("Đoạn đường từ cầu bản Hình đến giáp đất xã Mường Khiêng")).toBeVisible();
  await expect(hop.locator("[data-thay-doi]").filter({ hasText: "Lò Văn Xôm" })).toContainText("STT 3.1");
  await expect(hop.locator("[data-chenh-cao]")).toContainText("Điều 2 NQ 28/2026");

  // Tuyến bổ sung (Phụ lục I) và k8 Đ7 ở Bảng 06
  await hop.locator("select").nth(1).selectOption("Xã Đoàn Kết");
  const bs = hop.locator("tr").filter({ hasText: "Từ km 46+800 theo Quốc lộ 43 đến Km 45+590" });
  await expect(bs).toContainText("Bổ sung");
  await expect(bs.locator("button").first()).toHaveText("640");
  await hop.locator("select").nth(0).selectOption("TMDV");
  await expect(bs.locator("button").first()).toHaveText("410");
  await hop.getByLabel("Đất TM-DV có nguồn gốc từ đất ở").check();
  await expect(bs.locator("button").first()).toHaveText("576"); // 90% × 640
  await bs.locator("button").first().click();
  await expect(p.getByText(/Đất TM-DV có nguồn gốc từ đất ở: 90% × 640.*khoản 8 Điều 7/)).toBeVisible();
});
