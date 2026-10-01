/**
 * Kịch bản giao diện 0.8.8: trình xem bản đồ kiểu MicroStation — lăn chuột phóng/thu không cuộn trang; bảng "Lớp bản đồ"
 * giữ các tùy chọn GPMB + quản lý lớp DGN (bật/tắt lớp) + chú giải; đo khoảng cách. Tệp DGN thử dựng bằng VietDgn.
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
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.use({ viewport: { width: 1366, height: 768 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("lăn chuột phóng bản đồ, không cuộn trang; bảng lớp giữ tùy chọn GPMB, bật/tắt lớp DGN; đo khoảng cách", async ({ page: p }) => {
  const v = new VietDgn(1000, 1, [0, 0]);
  for (let i = 0; i < 4; i++) {
    const x = 500000 + i * 20;
    v.duongGap({ lop: 10 }, [[x, 1350000], [x + 20, 1350000], [x + 20, 1350020], [x, 1350020], [x, 1350000]], 6).chu({ lop: 4 }, [x + 5, 1350008], String(i + 1)).chu({ lop: 5 }, [x + 5, 1350004], "7");
  }
  v.duongGap({ lop: 23 }, [[500000, 1350030], [500080, 1350030]], 4);
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.DGN"]').setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: Buffer.from(v.xuat()) });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  const cv = p.locator(".ban-do canvas");
  await expect(cv).toBeVisible();

  // bảng Lớp bản đồ: giữ đủ tùy chọn cũ
  const bang = p.locator(".bd-bang");
  for (const t of ["Ranh GPMB", "Thửa đất", "Tô màu", "Nhãn thửa", "Nền địa hình, hạ tầng", "Địa danh", "Ảnh vệ tinh (trực tuyến)"]) await expect(bang.getByText(t, { exact: true })).toBeVisible();
  await expect(bang.getByText("Ranh GPMB đã chọn")).toBeVisible(); // chú giải trong cùng bảng

  // lăn chuột: tỷ lệ đổi, trang không cuộn
  await cv.scrollIntoViewIfNeeded();
  const cuon0 = await p.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
  const tl0 = await p.locator(".toa-do").innerText();
  const b = (await cv.boundingBox())!;
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.wheel(0, -600);
  await expect.poll(() => p.locator(".toa-do").innerText()).not.toBe(tl0);
  expect(await p.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(cuon0);

  // lớp DGN: tắt lớp 23
  await bang.getByRole("button", { name: "Lớp bản vẽ DGN" }).click();
  const l23 = bang.locator("[data-lop='23'] input");
  await expect(l23).toBeChecked();
  await l23.uncheck();
  await expect(bang.getByRole("button", { name: "Lớp bản vẽ DGN" })).toContainText("3/4");

  // đo khoảng cách: 2 điểm → có kết quả
  await p.getByRole("button", { name: "Đo khoảng cách" }).click();
  // bấm bên phải khung (bảng lớp nằm bên trái)
  await p.mouse.click(b.x + b.width * 0.62, b.y + b.height * 0.7);
  await p.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.7);
  await expect(p.locator(".bd-ket-qua")).toContainText("Tổng chiều dài");
  await p.keyboard.press("Escape");
  await expect(p.locator(".bd-ket-qua")).toHaveCount(0);

  // thanh công cụ thu gọn về góc trái, bấm để kéo ra (nhớ trạng thái)
  await p.getByRole("button", { name: "Thu gọn thanh công cụ" }).click();
  await expect(p.getByRole("button", { name: "Phóng to" })).toHaveCount(0);
  await expect(p.getByRole("button", { name: "Mở thanh công cụ" })).toContainText("📏"); // hiện công cụ đang dùng
  await p.getByRole("button", { name: "Mở thanh công cụ" }).click();
  await expect(p.getByRole("button", { name: "Phóng to" })).toBeVisible();
});
