/**
 * Kịch bản giao diện 0.9.4: mẫu theo văn bản thực tế (docs/19) — QĐ phê duyệt phương án 01 hộ (T5) ghi số vào hộ; QĐ thu hồi
 * đất nhiều hộ (T7) tự dẫn QĐ phê duyệt PA từng hộ; bảng kiểm tra thống nhất; chọn căn cứ theo dự án.
 */
import { expect, test, type Page } from "@playwright/test";
import PizZip from "pizzip";

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
  page.on("dialog", (d) => d.accept());
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

const chuDocx = async (p: Page, loc: RegExp) => {
  const teps = await p.evaluate(() => (window as unknown as { __tep: Record<string, string> }).__tep);
  const ten = Object.keys(teps).find((k) => loc.test(k));
  expect(ten, `tệp ${loc}`).toBeTruthy();
  return new PizZip(Buffer.from(teps[ten!]!, "base64")).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
};

test("T5 phê duyệt PA 01 hộ ghi số vào hộ → T7 thu hồi nhiều hộ dẫn đúng số; kiểm tra thống nhất; chọn căn cứ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await p.locator(".muc-mau", { hasText: "Quyết định phê duyệt phương án BT, HT, TĐC (01 hộ)" }).click();
  await expect(p.locator(".muc-mau.chon")).toContainText("T5");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("31");
  await p.getByRole("button", { name: /Tạo văn bản cho 1 hộ/ }).click();
  await expect(p.getByText(/Đã tạo 1 văn bản Mẫu T5/)).toBeVisible();
  const t5 = await chuDocx(p, /^Mau-T5_/);
  expect(t5).toContain("Số: 31/QĐ-UBND");
  expect(t5).toMatch(/8\.1\. Tổng kinh phí bồi thường, hỗ trợ \(đã làm tròn\): [\d.]+ đồng/);
  expect(t5).toContain("Hỗ trợ khác theo khoản 13 Điều 6 Quyết định số 14/2026/QĐ-UBND");

  // Văn bản cấp dự án: T7 thu hồi đất nhiều hộ
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T7/ }).click();
  const kt = p.getByLabel("Kiểm tra thống nhất");
  await expect(kt).toContainText("1 hộ chưa có số, ngày QĐ phê duyệt phương án");
  await expect(kt).toContainText("Chưa nhập số văn bản");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("40");
  await expect(kt).not.toContainText("Chưa nhập số văn bản");
  await p.getByRole("button", { name: /Tạo văn bản cho đợt/ }).click();
  await expect(p.getByText(/Đã tạo Quyết định thu hồi đất \(nhiều hộ\)/)).toBeVisible();
  const t7 = await chuDocx(p, /^Mau-T7_/);
  expect(t7).toMatch(/Căn cứ Quyết định số 31\/QĐ-UBND ngày\s*\S*\s*của Chủ tịch Ủy ban nhân dân xã Chiềng Mung về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư đối với hộ Hộ mẫu 01;/);
  expect(t7).toContain("(Kèm theo Quyết định số 40/QĐ-UBND");

  // Chọn căn cứ: NQ 254/2025/QH15 mặc định bỏ chọn (chưa có nguyên văn)
  await p.getByRole("button", { name: /Sửa thông tin chung/ }).click();
  await expect(p.getByLabel(/In căn cứ: .*254\/2025\/QH15/)).not.toBeChecked();
  await expect(p.getByLabel(/In căn cứ: .*88\/2024\/NĐ-CP/)).toBeChecked();
  await p.screenshot({ path: "test-results/van-ban-thuc-te.png", fullPage: false });
});

test("Kiểm đếm: tài sản không bồi thường, hỗ trợ — bắt buộc lý do, căn cứ; dòng thành tiền 0 trong bảng tính", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator(".tab-gon button", { hasText: "Kiểm đếm tài sản" }).click();
  await p.locator("label", { hasText: "Không BT, HT" }).first().locator("input").check();
  const lyDo = p.getByLabel("Lý do không bồi thường, hỗ trợ").first();
  await expect(lyDo).toHaveClass(/loi-nhap/);
  await lyDo.fill("Xây dựng sau thông báo thu hồi đất");
  await p.getByLabel("Căn cứ không bồi thường, hỗ trợ").first().fill("Điều 105 Luật Đất đai 2024");
  await p.locator(".tab-gon button", { hasText: "Tính toán, giải trình" }).click();
  await expect(p.getByText(/Không bồi thường, hỗ trợ – /).first()).toBeVisible();
});
