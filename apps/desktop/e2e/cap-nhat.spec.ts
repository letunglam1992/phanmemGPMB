/** Giới thiệu → Cập nhật phần mềm: bản chạy trong trình duyệt không có cập nhật, không gửi yêu cầu ra ngoài. */
import { expect, test } from "@playwright/test";

test("Giới thiệu có thẻ cập nhật; trình duyệt: báo chỉ có trong bản cài, không gọi GitHub", async ({ page: p }) => {
  const ngoai: string[] = [];
  p.on("request", (r) => { if (!r.url().startsWith("http://localhost")) ngoai.push(r.url()); });
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByRole("button", { name: /Giới thiệu, bản quyền/ }).first().click();
  const hop = p.locator("[role=dialog]", { hasText: "Giới thiệu, bản quyền" });
  await expect(hop.getByText("Cập nhật phần mềm chỉ có trong bản cài đặt Windows.")).toBeVisible();
  expect(ngoai.filter((u) => u.includes("github"))).toEqual([]);
});
