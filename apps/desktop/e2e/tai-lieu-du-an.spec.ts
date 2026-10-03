/** 0.9.18: tài liệu, văn bản cấp dự án; tệp của hộ hiện chung; xem ảnh; tải tất cả (.zip) kèm bảng kê. */
import { expect, test } from "@playwright/test";
import PizZip from "pizzip";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const loiTrang: string[] = [];
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

test("tải lên văn bản pháp lý chung, xem ảnh, thấy tệp của hộ, tải tất cả .zip có bảng kê", async ({ page: p }) => {
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  // tệp của hộ H01 (thẻ Đính kèm của hồ sơ)
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator(".tab-gon button", { hasText: "Đính kèm" }).click();
  await p.locator('input[type=file][accept*=".heic"]').setInputFiles({ name: "Biên bản kiểm đếm.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 thu") });
  await expect(p.getByText("Đã đính kèm 1 tệp")).toBeVisible();
  // tài liệu chung của dự án
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Tài liệu, văn bản" }).click();
  const the = p.getByLabel("Tài liệu, văn bản của dự án");
  await the.getByLabel("Nhóm tài liệu", { exact: true }).selectOption("PHUONG_AN");
  await the.getByLabel("Số, ký hiệu, ngày văn bản").fill("12/QĐ-UBND ngày 02/10/2026");
  await the.getByLabel("Tệp tài liệu dự án").setInputFiles([
    { name: "QĐ phê duyệt phương án.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 qd") },
    { name: "Ảnh niêm yết.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(p.getByText("Đã lưu 2 tệp vào tài liệu dự án")).toBeVisible();
  const bang = the.getByLabel("Danh sách tài liệu");
  await expect(bang.locator("tbody tr")).toHaveCount(2);
  await expect(bang.locator("tr", { hasText: "QĐ phê duyệt phương án.pdf" })).toContainText("12/QĐ-UBND ngày 02/10/2026");
  await expect(bang.locator("tr", { hasText: "QĐ phê duyệt phương án.pdf" })).toContainText("Phương án BT, HT, TĐC");
  // xem ảnh trong phần mềm
  await bang.getByRole("button", { name: "Ảnh niêm yết.png", exact: true }).click();
  await expect(p.locator("[role=dialog] img")).toBeVisible();
  await p.locator("[role=dialog] .chan-hop").getByRole("button", { name: "Đóng" }).click();
  // tất cả: thêm tệp của hộ; tìm theo mã hộ
  await the.getByLabel("Phạm vi tài liệu").selectOption("TAT_CA");
  await expect(bang.locator("tbody tr")).toHaveCount(3);
  await the.getByLabel("Tìm tài liệu").fill("H01");
  await expect(bang.locator("tbody tr")).toHaveCount(1);
  await expect(bang.locator("tbody tr")).toContainText("Chung của hồ sơ");
  await the.getByLabel("Tìm tài liệu").fill("");
  // tải tất cả → zip có thư mục dự án/hộ và bảng kê
  await the.getByRole("button", { name: "Tải tất cả (.zip)" }).click();
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith("Tai-lieu_")))).toBeTruthy();
  const b64 = await p.evaluate(() => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; return t[Object.keys(t).find((k) => k.startsWith("Tai-lieu_"))!]!; });
  const zip = new PizZip(Buffer.from(b64, "base64"));
  const ten = Object.keys(zip.files).sort();
  expect(ten.some((x) => /^Du-an\/Phuong-an-.*\/QD-phe-duyet-phuong-an\.pdf$/.test(x))).toBe(true);
  expect(ten.some((x) => /^Ho\/H01_.*\/Bien-ban-kiem-dem\.pdf$/.test(x))).toBe(true);
  expect(zip.file("Bang-ke-tai-lieu.csv")!.asText()).toContain("12/QĐ-UBND ngày 02/10/2026");
  await p.screenshot({ path: "test-results/tai-lieu-du-an.png" });
});
