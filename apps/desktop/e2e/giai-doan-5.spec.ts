/**
 * Kịch bản giao diện Giai đoạn 5 (docs/17 §13): đợt thu hồi (P3-1), quỹ tái định cư và bốc thăm (P3-3), người có đất
 * khớp số định danh (P3-2), phân công và "Việc của tôi" (P3-4). Dữ liệu: bộ mẫu ẩn danh; số định danh thử "000000000000".
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
async function moHo(p: Page, i = 0) {
  await p.keyboard.press("Alt+3");
  await the(p, "Hộ, cá nhân").click();
  await p.locator("tr[data-ho-id]").nth(i).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}
const oNhap = (p: Page, nhan: string) => p.locator(".o-nhap", { has: p.locator(`label:text-is("${nhan}")`) }).locator("input").first();
const luuHo = async (p: Page) => {
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(p.getByRole("button", { name: "Lưu hồ sơ" })).toBeDisabled();
};
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("P3-1: khai báo đợt, xếp hộ vào đợt, tổng hợp theo đợt; chốt phương án phải chọn đợt", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await the(p, "Thông tin dự án").click();
  const dot = p.locator(".the", { hasText: "Đợt thu hồi" }).first();
  await dot.getByRole("button", { name: "Thêm đợt" }).click();
  await dot.getByRole("button", { name: "Thêm đợt" }).click();
  await p.getByLabel("Ngày thông báo Đợt 1").fill("2026-01-10");
  await p.getByLabel("Phạm vi Đợt 1").fill("Km0 – Km2");
  await p.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(p.getByText("Đã lưu thông tin dự án")).toBeVisible();
  await the(p, "Hộ, cá nhân").click();
  await p.getByRole("button", { name: "Xếp đợt…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Xếp hộ vào đợt thu hồi" });
  await hop.getByLabel("Chọn tất cả").check();
  await hop.getByRole("button", { name: /^Xếp \d+ hộ$/ }).click();
  await expect(p.getByText(/Đã xếp \d+ hộ vào Đợt 1/)).toBeVisible();
  await p.getByLabel("Lọc đợt thu hồi").selectOption({ label: "Đợt 2" });
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(0);
  await p.getByLabel("Lọc đợt thu hồi").selectOption({ label: "Đợt 1" });
  await expect(p.locator("tr[data-ho-id]").first()).toBeVisible();
  await the(p, "Tổng quan dự án").click();
  const th = p.locator(".the", { hasText: "Tổng hợp theo đợt thu hồi" });
  await expect(th.locator("tbody tr").first()).toContainText("Đợt 1");
  await expect(th.locator("tbody tr").first()).toContainText("10/01/2026");
  await expect(th.locator("tfoot")).toContainText("Cả dự án");
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await expect(chot.getByLabel("Đợt của phương án")).toBeVisible();
  await chot.getByLabel("Đợt của phương án").selectOption({ index: 1 });
  await expect(chot.getByRole("textbox").first()).toHaveValue(/Đợt 2/);
});

test("P3-3: quỹ tái định cư — thêm lô kèm căn cứ giá, ghi nhận bốc thăm, lô ghi vào hồ sơ hộ", async ({ page: p }) => {
  await vao(p);
  // hộ 1 được bố trí TĐC giao đất ở
  await moHo(p);
  await p.locator("[role=tablist] button", { hasText: "Hỗ trợ" }).click();
  const tdc = p.locator(".the", { hasText: "Hỗ trợ tái định cư" });
  await tdc.getByLabel("Áp dụng").check();
  await luuHo(p);
  await p.keyboard.press("Alt+3");
  await the(p, "Tái định cư").click();
  await p.getByRole("button", { name: "Thêm nhiều lô…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Thêm nhiều lô tái định cư" });
  await oNhap(p, "Khu, điểm TĐC").fill("Khu TĐC thử");
  await oNhap(p, "Đến số").fill("3");
  await oNhap(p, "DT mỗi lô (m²)").fill("150");
  await oNhap(p, "Giá (đ/m²)").fill("2500000");
  await expect(hop.getByRole("button", { name: "Thêm 3 lô" })).toBeDisabled(); // giá chưa có căn cứ
  await oNhap(p, "Căn cứ giá").fill("NQ 152/2025, Bảng 05, VT1 (thử)");
  await hop.getByRole("button", { name: "Thêm 3 lô" }).click();
  await expect(p.locator("tr[data-lo]")).toHaveCount(3);
  await p.getByLabel("Giao lô bằng hình thức bốc thăm").click(); // lưu vào dự án rồi mới đổi trạng thái
  await expect(p.getByLabel("Giao lô bằng hình thức bốc thăm")).toBeChecked();
  await p.getByRole("button", { name: "Ghi nhận kết quả bốc thăm…" }).click();
  const bt = p.locator("[role=dialog]", { hasText: "Ghi nhận kết quả bốc thăm" });
  await oNhap(p, "Biên bản số, ngày (bắt buộc)").fill("05/BB-HĐ ngày 10/10/2026");
  await bt.locator("select[aria-label^='Lô bốc được']").first().selectOption({ label: "Khu TĐC thử – lô 2 · 150 m²" });
  await bt.getByRole("button", { name: "Ghi nhận 1 kết quả" }).click();
  await expect(p.locator("tr[data-lo='Khu TĐC thử – lô 2']")).toContainText("Đã giao");
  await expect(p.locator(".the", { hasText: "Kết quả bốc thăm" }).last()).toContainText("05/BB-HĐ");
  // hồ sơ hộ nhận thông tin lô
  await moHo(p);
  await p.locator("[role=tablist] button", { hasText: "Hỗ trợ" }).click();
  await expect(p.getByText(/Lô, căn được giao từ quỹ tái định cư/)).toContainText("Khu TĐC thử – lô 2");
  await expect(oNhap(p, "Lô số / vị trí")).toHaveValue("2");
});

test("P3-2, P3-4: hồ sơ cùng số định danh; phân công cán bộ → Việc của tôi", async ({ page: p }) => {
  await vao(p);
  for (const i of [0, 1]) {
    await moHo(p, i);
    await oNhap(p, "Số định danh cá nhân").fill("000 000 000 000");
    if (i === 0) await p.getByLabel("Cán bộ phụ trách").selectOption("quantri");
    await luuHo(p);
  }
  await expect(p.locator("[data-nguoi-co-dat]")).toContainText("H01");
  await p.getByRole("button", { name: "Người có đất nhiều hồ sơ" }).click();
  await expect(p.locator("h1")).toHaveText("Người có đất nhiều hồ sơ");
  await expect(p.locator("tbody tr")).toHaveCount(1);
  await expect(p.locator("tbody tr").first()).toContainText("000••••••000");
  await p.getByRole("button", { name: "Việc của tôi" }).click();
  await expect(p.locator("[data-viec]")).toHaveCount(1);
  await expect(p.locator("[data-viec='H01']")).toBeVisible();
});
