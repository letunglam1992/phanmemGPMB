/** 1.0.6 nhóm A: ý kiến, đối thoại ở bước 7 (điểm a k3 Đ87); DT thu hồi theo văn bản đối chiếu tổng; soát. Dữ liệu mẫu ẩn danh. */
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
test.setTimeout(90_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("Bước 7: ghi không đồng ý, ngày lấy ý kiến → hạn đối thoại; ghi đối thoại; Soát phương án nhắc", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(0).click();
  await p.locator("[role=tab]", { hasText: "Tiến độ" }).click();
  await p.locator("tr", { hasText: "Lấy ý kiến, đối thoại" }).first().click();
  const k = p.getByLabel("Ý kiến về phương án, đối thoại");
  await k.getByLabel("Ý kiến của hộ về phương án").selectOption({ label: "Không đồng ý" });
  await k.getByLabel("Ngày tổ chức lấy ý kiến").fill("01/09/2026");
  await k.getByLabel("Ngày tổ chức lấy ý kiến").press("Tab");
  await k.getByLabel("Nội dung ý kiến về phương án").fill("Đề nghị xem lại đơn giá cây nhãn");
  await expect(k).toContainText("hạn tổ chức đối thoại: 02/11/2026");
  await expect(k.getByRole("button", { name: /Ghi ngày lấy ý kiến này cho 1 hồ sơ khác/ })).toBeVisible();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  // Soát phương án: nhắc chưa đối thoại (hoặc quá hạn, tùy ngày chạy)
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Soát phương án" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Soát phương án" });
  await expect(hop).toContainText("Không đồng ý phương án (Đề nghị xem lại đơn giá cây nhãn), chưa ghi đối thoại — hạn 02/11/2026");
  await p.keyboard.press("Escape");
  // ghi đối thoại → thống nhất
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(0).click();
  await p.locator("[role=tab]", { hasText: "Tiến độ" }).click();
  await p.locator("tr", { hasText: "Lấy ý kiến, đối thoại" }).first().click();
  await k.getByRole("button", { name: "+ Ghi lần đối thoại" }).click();
  await k.getByLabel("Kết quả đối thoại lần 1").selectOption({ label: "Đã thống nhất" });
  await expect(k).toContainText("Đã đối thoại, thống nhất");
  await expect(k.getByRole("button", { name: "Soạn biên bản đối thoại (T12)" })).toBeVisible();
});

test("Đối chiếu diện tích: nhập DT thu hồi theo văn bản (bắt buộc căn cứ) → bảng tổng, chênh lệch", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  const dc = p.locator(".the", { hasText: "Đối chiếu diện tích" });
  await expect(dc.getByLabel("Đối chiếu tổng diện tích thu hồi")).toContainText("Toàn dự án");
  await expect(dc).toContainText("Chưa nhập DT thu hồi theo văn bản");
  await dc.getByRole("button", { name: "DT thu hồi theo văn bản…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Diện tích thu hồi theo văn bản" });
  await hop.getByLabel("DT thu hồi theo văn bản — Toàn dự án").fill("10.000");
  await expect(hop.getByRole("button", { name: "Lưu" })).toBeDisabled();
  await hop.getByLabel("Căn cứ DT thu hồi — Toàn dự án").fill("Thông báo thu hồi đất số 1/TB-UBND (thử)");
  await hop.getByRole("button", { name: "Lưu" }).click();
  await expect(dc).toContainText("DT thu hồi theo văn bản");
  await expect(dc).toContainText("10.000,00");
  await expect(dc).toContainText("Thông báo thu hồi đất số 1/TB-UBND (thử)");
});
