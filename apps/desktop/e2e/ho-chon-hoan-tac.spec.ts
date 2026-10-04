/** 0.9.19: xuất Excel, chốt phương án theo hồ sơ đã chọn; hoàn tác cập nhật tiến độ nhiều hộ; văn bản theo đợt phương án. */
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

test("chọn hồ sơ → xuất Excel chỉ hồ sơ đã chọn → chốt phương án hồ sơ đã chọn → văn bản theo đợt phương án", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.getByLabel(/^Chọn hồ sơ H01/).check();
  const thanh = p.getByRole("toolbar", { name: "Thao tác với hồ sơ đã chọn" });
  await thanh.getByRole("button", { name: "Xuất Excel 1 hồ sơ" }).click();
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith("Phuong-an_")))).toBeTruthy();
  const b64 = await p.evaluate(() => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; return t[Object.keys(t).find((k) => k.startsWith("Phuong-an_"))!]!; });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(b64, "base64"));
  const ten = wb.worksheets.map((w) => w.name).join("|");
  expect(ten).toContain("Hộ mẫu 01");
  expect(ten).not.toContain("Hộ mẫu 02");
  // chốt phương án hồ sơ đã chọn (nút dưới bảng)
  await p.getByRole("button", { name: "Chốt phương án 1 hồ sơ đã chọn…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await expect(chot.getByRole("status")).toContainText("đã chọn sẵn 1/1 hồ sơ");
  await expect(chot.locator("tr", { hasText: "H01" }).locator("input[type=checkbox]")).toBeChecked();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  // văn bản T6 (theo đợt): chọn theo bản phương án
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T6/ }).click();
  await p.getByRole("button", { name: "Bỏ chọn tất cả" }).click();
  await p.getByLabel("Theo đợt phương án").selectOption({ label: "Bản 1 – đã chốt, chờ phê duyệt · 1 hộ" });
  await expect(p.getByLabel("Số hộ đã chọn")).toContainText("đã chọn 1/");
  await expect(p.locator(".ds-chon-ho label", { hasText: "H01" }).locator("input")).toBeChecked();
});

test("cập nhật tiến độ nhiều hộ → hoàn tác", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Cập nhật tiến độ" }).first().click();
  const hop = p.locator("[role=dialog]", { hasText: "Cập nhật tiến độ" });
  await hop.getByRole("button", { name: "Cập nhật nhiều hộ (bước 5–16)" }).click();
  const chonBuoc = hop.locator("select").first();
  await chonBuoc.selectOption("5");
  await expect(chonBuoc.locator("option:checked")).toContainText("0/2 hộ xong");
  await hop.locator("select").nth(1).selectOption("CHO_DUYET");
  await hop.getByRole("button", { name: /Chọn tất cả hộ hợp lệ/ }).click();
  await hop.getByRole("button", { name: /^Áp dụng cho [12] hộ/ }).click();
  await expect(hop.getByText(/Đã cập nhật [12] hộ/)).toBeVisible();
  await expect(hop.locator("tbody tr", { hasText: "H01" })).toContainText("Chờ duyệt");
  await hop.getByRole("button", { name: /Hoàn tác lần cập nhật vừa rồi/ }).click();
  await expect(p.getByText(/Đã hoàn tác [12] hộ/)).toBeVisible();
  await expect(hop.locator("tbody tr", { hasText: "H01" })).not.toContainText("Chờ duyệt");
  await expect(hop.getByRole("button", { name: /Hoàn tác lần cập nhật vừa rồi/ })).toHaveCount(0);
});
