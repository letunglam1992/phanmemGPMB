/** 1.0.4: lý trình theo thửa (không bắt buộc) — ghi nhanh nhiều hộ, mặt bằng theo lý trình, Excel; ô nhập ở bảng thửa. */
import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

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
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.addInitScript(() => {
    const w = window as unknown as { __tep: Record<string, string>; showSaveFilePicker: unknown };
    w.__tep = {};
    w.showSaveFilePicker = async (o: { suggestedName: string }) => ({
      name: o.suggestedName,
      createWritable: async () => ({
        write: async (bl: Blob) => {
          const u = new Uint8Array(await bl.arrayBuffer());
          let s = "";
          for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
          w.__tep[o.suggestedName] = btoa(s);
        },
        close: async () => undefined,
      }),
    });
  });
});
test.afterEach(() => expect(loiTrang).toEqual([]));


test("ghi lý trình nhanh cho hồ sơ đã chọn → thẻ mặt bằng theo lý trình, Excel; ô lý trình ở bảng thửa báo lỗi khi viết sai", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  // chưa ghi lý trình: không có thẻ
  await expect(p.getByLabel("Mặt bằng theo lý trình")).toHaveCount(0);
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.getByLabel(/^Chọn hồ sơ H01/).check();
  await p.getByLabel(/^Chọn hồ sơ H02/).check();
  await p.getByRole("toolbar", { name: "Thao tác với hồ sơ đã chọn" }).getByRole("button", { name: "Ghi lý trình…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Ghi lý trình theo thửa" });
  await hop.getByLabel("Lý trình chung").fill("Km1+000 – Km1+200");
  await hop.getByRole("button", { name: "Áp cho mọi thửa" }).click();
  const o = hop.locator("input[aria-label^='Lý trình H01']").first();
  await expect(o).toHaveValue("Km1+000 – Km1+200");
  await o.fill("abc");
  await expect(hop.getByText(/"abc" không phải lý trình/)).toBeVisible();
  await expect(hop.getByRole("button", { name: /^Lưu/ })).toBeDisabled();
  await o.fill("0+900 đến 1+050");
  await o.press("Enter");
  await hop.getByRole("button", { name: /^Lưu \d+ thửa/ }).click();
  await expect(p.getByText(/Đã ghi lý trình \d+ thửa của 2 hộ/)).toBeVisible();
  // Tổng quan dự án: thẻ mặt bằng theo lý trình
  await p.locator("[role=tablist] button", { hasText: "Tổng quan dự án" }).click();
  const the = p.getByLabel("Mặt bằng theo lý trình");
  await expect(the).toContainText("Chiều dài có ghi lý trình");
  await expect(the).toContainText("0,3 km");
  await expect(the).toContainText("Km0+900 – Km1+200");
  await the.getByRole("button", { name: "Xem bảng thửa theo Km" }).click();
  await expect(the.locator("tbody tr").first()).toContainText("Km0+900 – Km1+050");
  await the.getByRole("button", { name: "Xuất Excel" }).click();
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith("Mat-bang-theo-ly-trinh")))).toBeTruthy();
  const b64 = await p.evaluate(() => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; return t[Object.keys(t).find((k) => k.startsWith("Mat-bang-theo-ly-trinh"))!]!; });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(b64, "base64"));
  const ws = wb.getWorksheet("Ly trinh")!;
  expect(String(ws.getCell("A1").value)).toContain("MẶT BẰNG THEO LÝ TRÌNH");
  expect(ws.getCell("B5").value).toBe("Km0+900 – Km1+050");
  // ô lý trình trong bảng thửa của hộ
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).click();
  const ot = p.locator("input[aria-label^='Lý trình thửa']").first();
  await expect(ot).toHaveValue(/^Km/);
  await ot.fill("Km 5");
  await ot.press("Tab");
  await expect(p.getByRole("alert").filter({ hasText: "không phải lý trình" })).toBeVisible();
  await ot.fill("");
  await ot.press("Tab");
  await expect(p.getByRole("alert").filter({ hasText: "không phải lý trình" })).toHaveCount(0);
});
