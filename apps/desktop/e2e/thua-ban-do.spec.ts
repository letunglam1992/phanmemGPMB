/**
 * Kịch bản 0.9.11: hồ sơ hộ → Thửa đất → nút 🗺 "Xem trên bản đồ": tìm thửa theo số tờ/số thửa, theo liên kết đã gắn; thửa
 * chưa khớp thì bấm thửa trên bản đồ để gắn; mở màn Bản đồ tại thửa.
 */
import { expect, test, type Page } from "@playwright/test";
import { VietDgn } from "../../../packages/gis/test/viet-dgn";

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
/** 4 thửa 20 × 20 m, tờ 7, thửa 1–4 */
function banDo() {
  const v = new VietDgn(100, 1, [0, 0]);
  for (let i = 0; i < 4; i++) {
    const x = 500000 + i * 20;
    v.duongGap({ lop: 10 }, [[x, 2350000], [x + 20, 2350000], [x + 20, 2350020], [x, 2350020], [x, 2350000]], 6)
      .chu({ lop: 4 }, [x + 5, 2350008], String(i + 1))
      .chu({ lop: 5 }, [x + 5, 2350004], "7")
      .chu({ lop: 13 }, [x + 10, 2350012], "CLN");
  }
  return Buffer.from(v.xuat());
}
const loiTrang: string[] = [];
test.setTimeout(90_000);
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("thửa trong hồ sơ → xem trên bản đồ GPMB, gắn thửa, mở màn Bản đồ tại thửa", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).click();
  const dong = p.locator(".trang-ho table.bang tbody tr").first();
  await dong.locator("td").nth(0).locator("input").fill("07");
  await dong.locator("td").nth(1).locator("input").fill("2");
  // tìm theo số tờ, số thửa (bỏ số 0 đầu)
  await p.getByRole("button", { name: "Xem thửa 2 tờ 07 trên bản đồ" }).click();
  const kq = p.getByRole("status", { name: "Kết quả tìm thửa trên bản đồ" });
  await expect(kq).toContainText("Thửa bản đồ 7/2");
  await expect(kq).toContainText("tìm theo số tờ, số thửa");
  await p.locator(".hop-thoai .chan-hop").getByRole("button", { name: "Đóng" }).click();
  // không khớp → chọn thửa trên bản đồ để gắn
  await dong.locator("td").nth(1).locator("input").fill("9");
  await p.getByRole("button", { name: "Xem thửa 9 tờ 07 trên bản đồ" }).click();
  await expect(kq).toContainText("Chưa tìm thấy thửa 9 tờ 07");
  await p.getByRole("button", { name: "Chọn thửa trên bản đồ để gắn…" }).click();
  const cv = p.locator(".hop-thoai .ban-do canvas");
  const b = (await cv.boundingBox())!;
  const tyLe = Math.min(b.width / 80, b.height / 20) * 0.92;
  await p.mouse.click(b.x + b.width / 2 + 10 * tyLe, b.y + b.height / 2); // tâm thửa 3
  await p.getByRole("button", { name: "Gắn thửa đang chọn (7/3)" }).click();
  await expect(kq).toContainText("Thửa bản đồ 7/3");
  await expect(kq).toContainText("tìm theo liên kết bản đồ đã gắn");
  await expect(kq).toContainText("Số tờ/số thửa hồ sơ (07/9) khác nhãn bản đồ");
  await expect(dong.getByText("Bản đồ: 400,00")).toBeVisible();
  await p.screenshot({ path: "test-results/thua-ban-do.png" });
  // mở màn Bản đồ tại thửa
  await p.getByRole("button", { name: "Mở màn Bản đồ tại thửa này" }).click();
  await expect(p.getByRole("heading", { name: "Tờ 7, thửa 3" })).toBeVisible();
});

test("xóa thửa khỏi bản đồ (lý do, giữ khi mở lại), khôi phục", async ({ page: p }) => {
  const hoi: string[] = [];
  p.on("dialog", (d) => {
    hoi.push(d.message());
    void (d.type() === "prompt" ? d.accept("Thửa dựng trùng") : d.accept());
  });
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
  await p.getByRole("button", { name: "Thu gọn bảng lớp" }).click();
  const cv = p.locator(".ban-do canvas");
  await cv.evaluate((e) => e.scrollIntoView({ block: "start" }));
  const b = (await cv.boundingBox())!;
  const tyLe = Math.min(b.width / 80, b.height / 20) * 0.92;
  await p.mouse.click(b.x + b.width / 2 - 10 * tyLe, b.y + b.height / 2); // tâm thửa 2
  await expect(p.getByRole("heading", { name: "Tờ 7, thửa 2" })).toBeVisible();
  await p.getByRole("button", { name: "Xóa thửa khỏi bản đồ" }).click();
  expect(hoi[0]).toContain("tờ/thửa: 7/2");
  expect(hoi[0]).toContain("tệp DGN giữ nguyên");
  await expect(p.getByRole("heading", { name: "Tờ 7, thửa 2" })).toHaveCount(0);
  await p.locator(".the.gian select").selectOption("TAT_CA");
  await expect(p.locator(".the.gian tbody tr")).toHaveCount(3);
  await expect(p.locator(".the.gian tbody tr", { hasText: "7-2" })).toHaveCount(0);
  const the = p.getByLabel("Thửa đã xóa khỏi bản đồ");
  await the.getByRole("button", { name: "Xem" }).click();
  await expect(the).toContainText("Tờ 7, thửa 2");
  await expect(the).toContainText("Lý do: Thửa dựng trùng");
  // mở lại màn (dựng lại từ tệp) → thửa vẫn đã xóa
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator(".the.gian select").selectOption("TAT_CA");
  await expect(p.locator(".the.gian tbody tr")).toHaveCount(3);
  await p.getByLabel("Thửa đã xóa khỏi bản đồ").getByRole("button", { name: "Xem" }).click();
  await p.getByRole("button", { name: "Khôi phục thửa 2 tờ 7" }).click();
  await expect(p.getByLabel("Thửa đã xóa khỏi bản đồ")).toHaveCount(0);
  await p.locator(".the.gian select").selectOption("TAT_CA");
  await expect(p.locator(".the.gian tbody tr")).toHaveCount(4);
});

test("1.0.5: lý trình trên bản đồ — dải Km, bấm đoạn còn vướng chọn đúng thửa đã gắn", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).click();
  const dong = p.locator(".trang-ho table.bang tbody tr").first();
  await dong.locator("td").nth(0).locator("input").fill("7");
  await dong.locator("td").nth(1).locator("input").fill("2");
  await p.getByRole("button", { name: "Xem thửa 2 tờ 7 trên bản đồ" }).click();
  await expect(p.getByRole("status", { name: "Kết quả tìm thửa trên bản đồ" })).toContainText("Thửa bản đồ 7/2");
  await p.locator(".hop-thoai .chan-hop").getByRole("button", { name: "Đóng" }).click();
  await p.getByLabel("Lý trình thửa 2 tờ 7").fill("Km0+100 – Km0+300");
  await p.getByLabel("Lý trình thửa 2 tờ 7").press("Tab");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(p.getByRole("button", { name: "Lưu hồ sơ" })).toBeDisabled();
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  const the = p.getByLabel("Lý trình trên bản đồ");
  await expect(the.locator("[data-dai-km]")).toBeVisible();
  await the.getByRole("button", { name: "Km0+100 – Km0+300" }).click();
  await expect(the.getByRole("status")).toContainText("Đã chọn 1 thửa trên bản đồ");
});
