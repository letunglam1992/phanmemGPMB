/** 1.0.2: xuất tệp → nút "Tệp đã xuất" trên thanh tiêu đề tự mở danh sách (như nút tải về của trình duyệt). */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1536, height: 900 } });
test("xuất Excel báo cáo → danh sách tệp đã xuất có tệp vừa lưu; xóa danh sách", async ({ page: p }) => {
  const loi: string[] = [];
  p.on("pageerror", (e) => loi.push(e.message));
  await p.addInitScript(() => {
    (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = async (o: { suggestedName: string }) => ({
      name: o.suggestedName,
      createWritable: async () => ({ write: async () => undefined, close: async () => undefined }),
    });
  });
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  await p.getByRole("button", { name: "Báo cáo tổng hợp" }).first().click();
  await p.getByRole("button", { name: "Xuất Excel" }).first().click();
  const menu = p.getByRole("menu", { name: "Danh sách tệp đã xuất" });
  await expect(menu).toBeVisible();
  await expect(menu.getByText(/\.xlsx$/).first()).toBeVisible();
  await expect(menu.getByText(/chỉ có trong bản cài Windows/)).toBeVisible();
  await menu.getByRole("menuitem", { name: /Xóa danh sách/ }).click();
  await p.getByRole("button", { name: "Tệp đã xuất" }).click();
  await expect(p.getByText("Chưa xuất tệp nào.")).toBeVisible();
  expect(loi).toEqual([]);
});
