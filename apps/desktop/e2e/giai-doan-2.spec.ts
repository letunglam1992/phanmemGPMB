/**
 * Kịch bản giao diện Giai đoạn 2 (docs/17 §13): bước "Không áp dụng", bàn giao mặt bằng, pháp lý nguồn gốc đất,
 * soát phương án, giao diện laptop 1366×768. Dữ liệu: bộ mẫu ẩn danh của phần mềm.
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
  await p.locator('[role=tablist] button', { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(i).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}
const loiTrang: string[] = [];
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept("Hộ tự nguyện bàn giao") : d.accept()));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("P1-3, P1-4: bước 14 không áp dụng; ghi bàn giao mặt bằng → hoàn thành", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator('[role=tablist] button', { hasText: "Tiến độ" }).click();
  await p.locator("tr.co-the-chon", { hasText: "Cưỡng chế" }).click();
  await p.getByRole("button", { name: "Không áp dụng" }).click();
  await expect(p.getByText(/Không áp dụng: Hộ tự nguyện/)).toBeVisible();
  const the = p.locator(".the", { hasText: "Bàn giao mặt bằng" }).last();
  await the.locator("input[type=date]").fill("2026-09-20");
  await the.getByPlaceholder(/BB-BGMB/).fill("12/BB-BGMB");
  await the.getByRole("button", { name: /Ghi bàn giao mặt bằng/ }).click();
  await expect(the.getByText("Đã bàn giao 20/09/2026")).toBeVisible();
});

test("P2-5: chọn pháp lý nguồn gốc ở thửa → thống kê dự án", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator('[role=tablist] button', { hasText: "Thửa đất" }).click();
  await p.getByLabel(/Tình trạng pháp lý/).first().selectOption("GCN");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.locator(".trang-ho h1").click();
  await p.keyboard.press("Alt+3");
  const the = p.locator(".the", { hasText: "DT thu hồi theo pháp lý nguồn gốc" });
  await expect(the.locator("tr", { hasText: "Có GCN" })).toContainText("9.222,1");
  await expect(the.locator("tr", { hasText: "Chưa phân loại" })).toBeVisible();
});

test("§11.1: soát phương án liệt kê vấn đề kèm căn cứ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Soát phương án" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Soát phương án" });
  await expect(hop.locator("td", { hasText: /^Thu hồi toàn bộ thửa đất ở \(/ })).toBeVisible();
  await expect(hop.getByText("Điều 111 Luật Đất đai 2024").first()).toBeVisible();
  await hop.getByRole("button", { name: /^Lưu ý/ }).click();
  await expect(hop.locator("td", { hasText: /^Thu hồi toàn bộ thửa đất ở \(/ })).toHaveCount(0);
});

test.describe("P1-7: laptop 1366×768", () => {
  test.use({ viewport: { width: 1366, height: 768 } });
  test("thanh tiêu đề một hàng ≤ 64 px; nội dung hồ sơ bắt đầu trong nửa trên màn hình; 12 thẻ hồ sơ vừa một hàng (0.8.6); thanh bên thu gọn", async ({ page: p }) => {
    await vao(p);
    await moHo(p);
    expect((await p.locator("header.thanh-tren").boundingBox())!.height).toBeLessThanOrEqual(64);
    expect((await p.locator(".the-buoc-tron").boundingBox())!.height).toBeLessThanOrEqual(56);
    expect((await p.locator(".ho-khung").boundingBox())!.y).toBeLessThan(768 / 2);
    // 0.8.6: thẻ hồ sơ hộ co chữ để vừa một hàng — không cần mũi tên cuộn, thẻ cuối nằm trong khung
    await expect(p.locator(".the-tab .tab-mui-ten")).toHaveCount(0);
    const khung = (await p.locator(".the-tab").boundingBox())!;
    const cuoi = (await p.locator("[role=tablist] button", { hasText: "Nhật ký" }).boundingBox())!;
    expect(cuoi.x + cuoi.width).toBeLessThanOrEqual(khung.x + khung.width + 1);
    await p.locator("[role=tablist] button", { hasText: "Nhật ký" }).click();
    await expect(p.locator("[role=tablist] button[aria-selected=true]")).toHaveText(/Nhật ký/);
    await p.getByRole("button", { name: "Thu gọn thanh bên" }).click();
    expect((await p.locator("aside.thanh-ben").boundingBox())!.width).toBeLessThanOrEqual(72);
    await p.locator(".nut-nguoi").click();
    await expect(p.locator(".menu-meta")).toContainText("Máy đơn");
  });
});
