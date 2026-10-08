/** 1.0.5: QĐ 64/2026 — tổ, thôn của thửa (hệ số chuyển đổi nghề), ghi nhanh, điều khoản chuyển tiếp khi dự án dùng bộ cũ. */
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



test("QĐ 64/2026: ô tổ, thôn ở thửa; hộp Ghi tổ, thôn; giải trình C06; dự án dùng bộ cũ thấy điều khoản chuyển tiếp", async ({ page: p }) => {
  await vao(p);
  await napMau(p);
  await p.keyboard.press("Alt+3");
  // Thông tin dự án: dữ liệu mẫu dùng bộ mới — không có thông báo chuyển tiếp
  await p.locator("[role=tablist] button", { hasText: "Thông tin dự án" }).click();
  await expect(p.locator(".the", { hasText: "Bộ chính sách áp dụng" })).toContainText("QĐ 64/2026");
  await expect(p.locator("[data-chuyen-tiep]")).toHaveCount(0);
  // chuyển sang bộ cũ → thấy điều khoản chuyển tiếp, nút chuyển lại
  await p.getByLabel("Chuyển sang bộ chính sách").selectOption("sonla-2026-03-31");
  await p.locator("[role=dialog]", { hasText: "Chuyển bộ chính sách" }).last().getByRole("button", { name: "Áp dụng bộ mới" }).click();
  const ct = p.locator("[data-chuyen-tiep]");
  await expect(ct).toContainText("khoản 2 Điều 3 QĐ 64/2026/QĐ-UBND");
  await expect(ct).toContainText("chưa có phương án được phê duyệt");
  await ct.getByRole("button", { name: /Xem chênh lệch, chuyển sang bộ mới/ }).click();
  await p.locator("[role=dialog]", { hasText: "Chuyển bộ chính sách" }).last().getByRole("button", { name: "Áp dụng bộ mới" }).click();
  await expect(p.locator("[data-chuyen-tiep]")).toHaveCount(0);
  // hộp Ghi tổ, thôn (chọn 1 hồ sơ)
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.getByLabel(/^Chọn hồ sơ H01/).check();
  await p.getByRole("toolbar", { name: "Thao tác với hồ sơ đã chọn" }).getByRole("button", { name: "Ghi tổ, thôn…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Ghi tổ, thôn, bản theo thửa" });
  await expect(hop).toContainText("không có tổ, thôn trong Phụ lục");
  await hop.getByLabel("Tổ, thôn chung").fill("Bản Mòng");
  await hop.getByRole("button", { name: "Áp cho mọi thửa" }).click();
  await hop.getByRole("button", { name: /^Lưu \d+ thửa/ }).click();
  await expect(p.getByText(/Đã ghi tổ, thôn, bản cho \d+ thửa của 1 hộ/)).toBeVisible();
  // thẻ Thửa đất của hộ: chip tổ thôn; Tính toán: C06 ghi địa bàn
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tab]", { hasText: "Thửa đất" }).click();
  await expect(p.locator("[data-thon-ban]").first()).toContainText("Bản Mòng");
  await p.locator("[role=tab]", { hasText: "Tính toán, giải trình" }).click();
  await expect(p.getByText(/Xã Chiềng Mung không có tổ, thôn, bản trong Phụ lục → mức chung, hệ số 3/).first()).toBeVisible();
});
