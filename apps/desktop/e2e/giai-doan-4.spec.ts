/**
 * Kịch bản giao diện Giai đoạn 4 (docs/17 §13): lịch sử từng ô (§11.5), đối chiếu diện tích (§11.3), dự báo tiến độ (§11.2),
 * báo cáo định kỳ và mẫu (§11.4), tệp đính kèm (P2-2), gói chính sách (P2-1). Dữ liệu: bộ mẫu ẩn danh; gói chính sách thử
 * dựng từ bộ có sẵn (đổi mã) — không dùng dữ liệu thật.
 */
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

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
async function moHo(p: Page, i = 0) {
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(i).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}
const oNhap = (p: Page, nhan: string) => p.locator(".o-nhap", { has: p.locator(`label:text-is("${nhan}")`) }).locator("input").first();
const loiTrang: string[] = [];
let traLoi = "";
test.setTimeout(60_000);
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept(traLoi) : d.accept()));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("§11.5: chuột phải trên ô → lịch sử thay đổi của ô", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await oNhap(p, "Họ tên chủ hộ / cá nhân").fill("Hộ mẫu 01 (đổi)");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(p.locator(".trang-ho h1")).toContainText("(đổi)");
  await oNhap(p, "Họ tên chủ hộ / cá nhân").click({ button: "right" });
  await p.getByRole("menuitem", { name: "Lịch sử thay đổi của ô này" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Lịch sử ô" });
  await expect(hop.locator("tbody tr").first()).toContainText("Hộ mẫu 01");
  await expect(hop.locator("tbody tr").first()).toContainText("Hộ mẫu 01 (đổi)");
});

test("§11.2, §11.3: dự báo tiến độ (nhập thời gian dự kiến) và đối chiếu diện tích ở Tổng quan dự án", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  const db = p.locator(".the", { hasText: "Dự báo tiến độ" });
  await expect(db).toContainText("Chưa dự báo được");
  await db.getByRole("button", { name: "Nhập thời gian dự kiến…" }).click();
  await expect(db).toContainText("4 (Điều tra, đo đạc, kiểm đếm)"); // hộ mẫu 02 đang ở bước 4 — không có thời hạn luật định
  for (const [b, n] of [["4", "20"], ["5", "10"], ["7", "15"], ["10", "5"]] as const) await p.getByLabel(`Thời gian dự kiến bước ${b}`).fill(n);
  await p.getByRole("button", { name: "Lưu kế hoạch" }).click();
  await expect(db).not.toContainText("Chưa dự báo được");
  await expect(db.locator("div").filter({ hasText: /^\d{2}\/\d{2}\/\d{4}$/ }).first()).toBeVisible();
  const dc = p.locator(".the", { hasText: "Đối chiếu diện tích" });
  await expect(dc).toContainText("chưa đặt — liệt kê mọi chênh lệch");
});

test("§11.4: báo cáo định kỳ — chọn mẫu, danh sách trường; nút một lần bấm", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("button", { name: "Báo cáo tổng hợp" }).first().click();
  await expect(p.getByRole("button", { name: "Báo cáo định kỳ (một nút)" })).toBeVisible();
  await p.getByRole("button", { name: "Soạn báo cáo Word…" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Soạn báo cáo tổng hợp" });
  await expect(hop.getByLabel("Mẫu báo cáo")).toContainText("Mẫu báo cáo tổng hợp");
  await hop.getByRole("button", { name: "Các trường dữ liệu" }).click();
  await expect(hop.getByText("{#ho_vuong_mac}", { exact: false })).toBeVisible();
});

test("P2-2: đính kèm tệp vào hồ sơ theo bước, xóa tệp", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator("[role=tablist] button", { hasText: "Đính kèm" }).click();
  await p.getByLabel("Bước của tệp đính kèm").selectOption("4");
  await p.locator("input[type=file][multiple]").setInputFiles({ name: "bien-ban-kiem-dem.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 thu") });
  const dong = p.locator("tr", { hasText: "bien-ban-kiem-dem.pdf" });
  await expect(dong).toContainText("4. Điều tra, đo đạc, kiểm đếm");
  await p.locator("input[type=file][multiple]").setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
  await expect(p.getByText(/chỉ nhận/)).toBeVisible();
  await dong.getByRole("button", { name: "Xóa" }).click();
  await expect(dong).toHaveCount(0);
});

test("P2-1: nạp gói chính sách (mã SHA-256), chuyển dự án sang bộ mới kèm chênh lệch", async ({ page: p }) => {
  await vao(p);
  const c = JSON.parse(readFileSync(new URL("../../../policy/goi/sonla-2026-03-31.json", import.meta.url), "utf8")) as Record<string, unknown>;
  c.ma = "SONLA-THU-E2E";
  c.ten = "Bộ chính sách thử (e2e)";
  await p.getByRole("button", { name: "Cài đặt chung" }).first().click();
  await p.getByRole("button", { name: "Gói chính sách" }).click();
  await p.locator("input[type=file][accept='.json']").setInputFiles({ name: "goi-thu.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(c)) });
  const kt = p.locator("[role=dialog]", { hasText: "Kiểm tra gói" }).last();
  await expect(kt).toContainText("Đúng cấu trúc bộ chính sách");
  await expect(kt.getByText(/^[0-9a-f]{64}$/)).toBeVisible();
  await kt.getByRole("button", { name: "Nạp gói" }).click();
  await expect(p.locator("td", { hasText: /^sonla-thu-e2e$/ })).toBeVisible();
  await p.keyboard.press("Escape");
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Thông tin dự án" }).click();
  await p.getByLabel("Chuyển sang bộ chính sách").selectOption("sonla-thu-e2e");
  const hop = p.locator("[role=dialog]", { hasText: "Chuyển bộ chính sách" }).last();
  await expect(hop.locator("tr.tong")).toBeVisible();
  await hop.getByRole("button", { name: "Áp dụng bộ mới" }).click();
  await expect(p.locator(".the", { hasText: "Bộ chính sách áp dụng" })).toContainText("Bộ chính sách thử (e2e)");
});
