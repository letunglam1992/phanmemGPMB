/** 1.0.4: đề xuất ngày nghỉ, Bắt đầu sử dụng, Word bảng tính hộ, tìm tờ/thửa, soát đi tới đúng ô. */
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


test("Bắt đầu sử dụng: tự đánh dấu bước xong; lịch ngày nghỉ đề xuất theo k1 Đ112 để chọn, xác nhận", async ({ page: p }) => {
  await vao(p);
  const bd = p.getByLabel("Bắt đầu sử dụng");
  await expect(bd).toContainText(/Đã xong [01]\/6 bước/);
  await expect(bd.locator("[data-buoc=du-an]")).not.toContainText("Đã xong");
  await napMau(p);
  await expect(bd.locator("[data-buoc=du-an]")).toContainText("Đã xong");
  await expect(bd.locator("[data-buoc=ho-so]")).toContainText("Đã xong");
  // bước lịch: mở thẳng thẻ Lịch ngày nghỉ
  await bd.locator("[data-buoc=lich]").getByRole("button").click();
  const nam = new Date().getFullYear();
  await p.getByRole("button", { name: `Đề xuất ngày nghỉ năm ${nam}…` }).click();
  const dx = p.getByRole("region", { name: `Đề xuất ngày nghỉ năm ${nam}` });
  await expect(dx).toContainText("Tết Nguyên đán (mùng 1)");
  await expect(dx).toContainText("Giỗ Tổ Hùng Vương");
  await expect(dx).toContainText("điểm e khoản 1 Điều 112 BLLĐ 2019");
  await dx.getByLabel("Chọn Ngày Chiến thắng").uncheck();
  await dx.getByRole("button", { name: /^Thêm \d+ ngày đã chọn/ }).click();
  await expect(p.getByRole("cell", { name: /Tết Nguyên đán \(mùng 1\)/ })).toBeVisible();
  await expect(p.getByRole("cell", { name: /^Ngày Chiến thắng/ })).toHaveCount(0);
  await p.getByText(`Tôi đã nhập đủ ngày nghỉ, ngày làm bù năm ${nam}`).click();
  await p.getByRole("button", { name: "Lưu lịch" }).click();
  await p.keyboard.press("Escape");
  await expect(bd.locator("[data-buoc=lich]")).toContainText("Đã xong");
  await bd.getByRole("button", { name: "Ẩn hướng dẫn" }).click();
  await expect(bd).toHaveCount(0);
});

test("Tính toán: Xuất Word bảng tính kèm giải trình; Ctrl+K tờ/thửa mở đúng thửa; soát phương án đi tới đúng ô", async ({ page: p }) => {
  await vao(p);
  await napMau(p);
  // Ctrl+K "5/85"
  await p.keyboard.press("Control+k");
  await p.keyboard.type("5/85");
  const kq = p.getByRole("listbox");
  await expect(kq).toContainText("Thửa 85 tờ 5");
  await p.keyboard.press("Enter");
  await expect(p.locator("tr.noi-bat[data-thua-id]")).toBeVisible();
  await expect(p.locator("[role=tab][aria-selected=true]")).toContainText("Thửa đất");
  // Word bảng tính
  await p.locator("[role=tab]", { hasText: "Tính toán, giải trình" }).click();
  await p.getByRole("button", { name: "Xuất Word (kèm giải trình)" }).click();
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith("Bang-tinh-giai-trinh")))).toBeTruthy();
  const ten = await p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith("Bang-tinh-giai-trinh"))!);
  expect(ten).toMatch(/\.docx$/);
  // 1.0.5: Lưu PDF trực tiếp (không qua hộp in)
  await p.getByRole("button", { name: "Lưu PDF" }).click();
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => /^Bang-tinh-giai-trinh.*\.pdf$/.test(k)))).toBeTruthy();
  const pdf = await p.evaluate(() => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; return atob(t[Object.keys(t).find((k) => k.endsWith(".pdf"))!]!); });
  // 1.0.6: PDF có chữ, phông Liberation Serif nhúng tập con
  expect(pdf.startsWith("%PDF-1.7")).toBe(true);
  expect(Number(/\/Count (\d+)/.exec(pdf)![1])).toBeGreaterThanOrEqual(2);
  expect(pdf).toContain("/FontFile2");
  expect(pdf).toContain("/ToUnicode");
  // soát: đi tới đúng thẻ
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Soát phương án" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Soát phương án" });
  await expect(hop.getByRole("group", { name: "Tóm tắt điều kiện chốt theo quy tắc" })).toContainText("Thu hồi toàn bộ thửa đất ở");
  await hop.getByRole("group", { name: "Tóm tắt điều kiện chốt theo quy tắc" }).getByRole("button", { name: /Thu hồi toàn bộ thửa đất ở/ }).click();
  await hop.getByRole("button", { name: /^Đi tới chỗ sửa/ }).first().click();
  await expect(p.locator("[role=tab][aria-selected=true]")).toContainText("Hỗ trợ");
});
