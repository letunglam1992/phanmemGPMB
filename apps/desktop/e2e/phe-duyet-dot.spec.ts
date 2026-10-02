/** 0.9.14: xóa đối tượng hưởng trợ cấp (dòng không lẹm ra ngoài thẻ); ghi nhận phê duyệt theo đợt, không bắt buộc số/ngày QĐ, bổ sung sau. */
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
test.use({ viewport: { width: 1366, height: 800 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));
/** Ô nhập trong khung O (nhãn là <label> anh em, không gắn for) */
const oNhap = (hop: import("@playwright/test").Locator, nhan: string) => hop.locator(".o-nhap", { has: hop.page().locator(`label:text-is("${nhan}")`) }).locator("input").first();

test("hỗ trợ khác: thêm, xóa đối tượng; nút Xóa nằm trong thẻ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Hỗ trợ khác" }).click();
  const the = p.locator(".the", { hasText: "Người hưởng trợ cấp xã hội phải di chuyển chỗ ở" }).first();
  await the.getByRole("button", { name: "Thêm đối tượng" }).click();
  await the.getByRole("button", { name: "Thêm đối tượng" }).click();
  const dong = the.locator(".dong-doi-tuong");
  await expect(dong).toHaveCount(2);
  await dong.first().locator("input").first().fill("Người A");
  const bThe = (await the.boundingBox())!;
  for (const b of await the.getByRole("button", { name: /^Xóa đối tượng/ }).all()) {
    const bb = (await b.boundingBox())!;
    expect(bb.x + bb.width).toBeLessThanOrEqual(bThe.x + bThe.width + 0.5);
  }
  await p.screenshot({ path: "test-results/ho-tro-khac-xoa.png" });
  await the.getByRole("button", { name: "Xóa đối tượng Người A" }).click();
  await expect(dong).toHaveCount(1);
  await the.getByRole("button", { name: "Xóa đối tượng chưa ghi tên" }).click();
  await expect(dong).toHaveCount(0);
});

test("ghi nhận phê duyệt – đợt 1 không có số, ngày QĐ; bổ sung sau", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  const nut = p.getByRole("button", { name: "Phê duyệt…" }).first();
  await expect(nut).toBeEnabled();
  await nut.click();
  const hop = p.locator("[role=dialog]", { hasText: "Ghi nhận phê duyệt – đợt 1" });
  await expect(hop.locator("h2")).toHaveText("Ghi nhận phê duyệt – đợt 1");
  await oNhap(hop, "Số quyết định (có thể bổ sung sau)").fill("");
  await expect(hop.getByRole("status")).toContainText("Chưa có số, ngày quyết định — vẫn ghi nhận được");
  await p.screenshot({ path: "test-results/phe-duyet-dot.png" });
  await hop.getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
  await expect(hop).toHaveCount(0);
  await expect(p.getByText("Đợt 1 · (chưa ghi số, ngày QĐ)")).toBeVisible();
  await p.getByRole("button", { name: "Bổ sung số, ngày QĐ…" }).click();
  const bs = p.locator("[role=dialog]", { hasText: "Bổ sung số, ngày QĐ phê duyệt – đợt 1" });
  await oNhap(bs, "Số quyết định (có thể bổ sung sau)").fill("12/QĐ-UBND");
  await oNhap(bs, "Ngày quyết định (có thể bổ sung sau)").fill("02/10/2026");
  await oNhap(bs, "Ngày quyết định (có thể bổ sung sau)").press("Tab");
  await bs.getByRole("button", { name: "Lưu bổ sung" }).click();
  await expect(p.getByText("Đợt 1 · 12/QĐ-UBND ngày 02/10/2026")).toBeVisible();
  await expect(p.getByRole("button", { name: "Bổ sung số, ngày QĐ…" })).toHaveCount(0);
});
