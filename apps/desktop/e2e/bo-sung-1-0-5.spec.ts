/** Ca giao diện bổ sung cho phần 1.0.5 (D10): thẻ rà soát QĐ 64, chi trả gửi ngân hàng + ghi trả lãi, mẫu T10/T11. Dữ liệu mẫu ẩn danh. */
import PizZip from "pizzip";
import { expect, test, type Page } from "@playwright/test";

async function vao(p: Page) {
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
}
async function napMau(p: Page) {
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
const oNhap = (p: Page | import("@playwright/test").Locator, nhan: string) => p.locator(".o-nhap", { has: ("page" in p ? p.page() : p).locator(`label:text-is("${nhan}")`) }).locator("input").first();
const tep = async (p: Page, dau: RegExp) => {
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep))).toEqual(expect.arrayContaining([expect.stringMatching(dau)]));
  const t = await p.evaluate(() => (window as unknown as { __tep: Record<string, string> }).__tep);
  return Buffer.from(t[Object.keys(t).find((k) => dau.test(k))!]!, "base64");
};

test("Thẻ Áp dụng QĐ 64 ở Tổng quan: dự án dùng bộ cũ → rà soát, xuất Excel, mở dự án", async ({ page: p }) => {
  await vao(p);
  await napMau(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Thông tin dự án" }).click();
  await p.getByLabel("Chuyển sang bộ chính sách").selectOption("sonla-2026-03-31");
  await p.locator("[role=dialog]", { hasText: "Chuyển bộ chính sách" }).last().getByRole("button", { name: "Áp dụng bộ mới" }).click();
  await p.getByRole("button", { name: "Tổng quan" }).first().click();
  const the = p.getByLabel("Áp dụng QĐ 64/2026");
  await expect(the).toContainText("1 dự án còn dùng bộ chính sách cũ");
  await the.getByRole("button", { name: "Rà soát…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Rà soát áp dụng QĐ 64/2026/QĐ-UBND" });
  await expect(hop.getByLabel("Bảng rà soát QĐ 64")).toContainText("Dự án mẫu – Khu công nghiệp");
  await hop.getByRole("button", { name: "Xuất Excel" }).click();
  const x = await tep(p, /^Ra-soat-QD64-2026_/);
  expect(new PizZip(x).file("xl/worksheets/sheet1.xml")).toBeTruthy();
  await hop.getByRole("button", { name: "Mở" }).first().click();
  await expect(p.locator("[data-chuyen-tiep]")).toContainText("khoản 2 Điều 3 QĐ 64/2026/QĐ-UBND");
});

test("Chi trả: gửi ngân hàng bắt buộc ghi ngân hàng; ghi trả người có đất kèm lãi theo sao kê; T10 phương án chi trả chậm", async ({ page: p }) => {
  await vao(p);
  await napMau(p);
  await p.keyboard.press("Alt+3");
  // chốt, ghi nhận phê duyệt (QĐ ngày 01/08/2026 → hạn chi 31/08/2026)
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  await p.getByRole("button", { name: "Phê duyệt…" }).first().click();
  const pd = p.locator("[role=dialog]", { hasText: "Ghi nhận phê duyệt" });
  await oNhap(pd, "Số quyết định (có thể bổ sung sau)").fill("5/QĐ-UBND");
  await oNhap(pd, "Ngày quyết định (có thể bổ sung sau)").fill("01/08/2026");
  await oNhap(pd, "Ngày quyết định (có thể bổ sung sau)").press("Tab");
  await pd.getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
  await expect(pd).toHaveCount(0);
  // hồ sơ đã chốt: thẻ Chi trả
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tab]", { hasText: "Chi trả" }).click();
  await expect(p.getByText("Phải trả theo bản 1")).toBeVisible();
  await oNhap(p, "Số tiền (đ)").fill("1.000.000");
  await p.locator(".o-nhap", { has: p.locator('label:text-is("Hình thức")') }).locator("select").selectOption({ label: "Gửi ngân hàng (không nhận / tranh chấp — k4 Đ94)" });
  await oNhap(p, "Chứng từ").fill("UNC 12");
  await p.getByRole("button", { name: "Thêm đợt chi" }).click();
  await expect(p.getByText(/Gửi ngân hàng: ghi ngân hàng thương mại/)).toBeVisible();
  await p.getByLabel("Ngân hàng, tài khoản tiền gửi").fill("NH thử – TK 123");
  await p.getByRole("button", { name: "Thêm đợt chi" }).click();
  await expect(p.getByText(/đang gửi \d+ ngày/)).toBeVisible();
  await p.getByRole("button", { name: "Ghi trả cho người có đất…" }).click();
  const tl = p.getByLabel("Ghi trả tiền gửi ngân hàng");
  await tl.getByLabel("Tiền lãi theo sao kê").fill("1.250");
  await tl.getByLabel("Chứng từ trả tiền gửi").fill("PC 99");
  await tl.getByRole("button", { name: "Ghi nhận" }).click();
  await expect(p.getByText(/Đã trả người có đất ngày .*; tiền lãi 1\.250 đ \(PC 99\)/)).toBeVisible();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  // T10: tờ trình phương án chi trả bồi thường chậm (hạn đã qua, chưa chi đủ)
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T10/ }).click();
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("7");
  await p.getByRole("button", { name: /Tạo văn bản/ }).first().click();
  const t10 = new PizZip(await tep(p, /^Mau-T10_/)).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
  expect(t10).toContain("Đề nghị phê duyệt phương án chi trả bồi thường chậm");
  expect(t10).toContain("Căn cứ điểm b khoản 3 Điều 94 Luật Đất đai năm 2024");
  expect(t10).toContain("Hộ mẫu 01");
});
