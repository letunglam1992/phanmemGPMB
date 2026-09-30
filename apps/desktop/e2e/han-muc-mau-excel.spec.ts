/**
 * Kịch bản giao diện 0.9.0 (QD-32): hạn mức theo Phụ lục I QĐ 106/2025 khi chọn vị trí thửa; biểu mẫu Excel của đơn vị
 * (thay mẫu, điền thử, báo trường không có dữ liệu, khôi phục bố cục của phần mềm). Dữ liệu: bộ mẫu ẩn danh.
 */
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
  await p.keyboard.press("Alt+3");
}
const loiTrang: string[] = [];
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("hạn mức đất ở theo Phụ lục I: chọn vị trí thửa → Điều 3 (trước 18/12/1980) tại xã", async ({ page: p }) => {
  await vao(p);
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).click();
  await p.locator("button[title^='Giấy chứng nhận, phân lớp đất']").first().click();
  const k = p.locator("[data-khong-giay-to]").first();
  await k.getByLabel("Bồi thường về đất không có giấy tờ").selectOption("D8");
  await k.getByLabel("Thời điểm sử dụng đất ổn định").fill("01/01/1975");
  await k.getByLabel("Vị trí thửa tra hạn mức").selectOption("CON_LAI");
  await expect(k.locator("[data-han-muc-dat-o]")).toContainText("450 m²");
  await expect(k.locator("[data-han-muc-dat-o]")).toContainText("Điều 3 Phụ lục I QĐ 106/2025/QĐ-UBND");
  await expect(k.locator("[data-tom-tat-kgt]")).toContainText("khoản 1 Điều 8");
});

test("biểu mẫu Excel của đơn vị: thay mẫu (điền thử), báo trường lạ, khôi phục", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("button", { name: "Thêm", exact: true }).click();
  await p.getByRole("menuitem", { name: "Biểu mẫu Excel…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Biểu mẫu Excel phương án" });
  await expect(hop.locator("[data-mau-excel]")).toContainText("bố cục của phần mềm");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("TH");
  ws.getCell("A1").value = "{{ten_du_an}} {{truong_la}}";
  ws.getRow(2).values = ["{{#ho}}{{stt}}", "{{ten}}", "{{tong_lam_tron}}"];
  await hop.getByLabel("Chọn tệp mẫu Excel").setInputFiles({ name: "mau-don-vi.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await wb.xlsx.writeBuffer()) });
  await expect(hop.locator("[data-mau-excel]")).toContainText("mẫu của đơn vị — mau-don-vi.xlsx");
  await expect(hop).toContainText("{{truong_la}}");
  await hop.getByRole("button", { name: "Khôi phục bố cục của phần mềm" }).click();
  await expect(hop.locator("[data-mau-excel]")).toContainText("bố cục của phần mềm");
});
