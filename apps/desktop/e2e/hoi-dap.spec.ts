/** Trợ lý AI nổi (Hỏi đáp AI): nội bộ (không dùng mạng) và Gemini API (giả lập máy chủ, kiểm nội dung gửi đi). */
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
const loiTrang: string[] = [];
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("nội bộ: không gọi mạng ngoài; trích nguyên văn; trả lời số liệu dự án", async ({ page: p }) => {
  const ngoai: string[] = [];
  p.on("request", (r) => { if (!r.url().startsWith("http://localhost")) ngoai.push(r.url()); });
  await vao(p);
  // nút robot nổi ở góc dưới phải → mở khung chat; Esc đóng, mở lại vẫn còn hội thoại
  await p.getByRole("button", { name: "Mở trợ lý AI" }).click();
  await expect(p.getByRole("dialog", { name: "Trợ lý AI" })).toBeVisible();
  await expect(p.getByRole("radio", { name: "Nội bộ — không dùng mạng" })).toHaveAttribute("aria-checked", "true");
  await p.getByLabel("Câu hỏi").fill("Hạn mức công nhận đất ở đối với đất sử dụng trước ngày 18/12/1980?");
  await p.getByLabel("Câu hỏi").press("Enter");
  const doan = p.locator(".hd-doan").first();
  await expect(doan).toContainText("Phụ lục I");
  await expect(doan).toContainText("Điều 3");
  await p.getByLabel("Câu hỏi").fill("Dự án có bao nhiêu hộ, tổng kinh phí bao nhiêu?");
  await p.getByRole("button", { name: "Gửi", exact: true }).click();
  await expect(p.getByRole("note", { name: "Số liệu dự án" }).last()).toContainText("2 hồ sơ");
  await expect(p.getByRole("note", { name: "Số liệu dự án" }).last()).toContainText("Tổng giá trị bồi thường, hỗ trợ tạm tính");
  await p.keyboard.press("Escape");
  await expect(p.getByRole("dialog", { name: "Trợ lý AI" })).toBeHidden();
  await p.getByRole("button", { name: "Dự án", exact: true }).click(); // chuyển màn: hội thoại vẫn giữ
  await p.getByRole("button", { name: "Mở trợ lý AI" }).click();
  await expect(p.getByRole("note", { name: "Số liệu dự án" }).last()).toContainText("2 hồ sơ");
  await p.getByRole("button", { name: "Phóng to khung" }).click();
  await expect(p.locator(".tl-khung.to")).toBeVisible();
  await p.getByRole("button", { name: "Đóng trợ lý", exact: true }).click();
  await expect(p.getByRole("dialog", { name: "Trợ lý AI" })).toBeHidden();
  expect(ngoai).toEqual([]);
});

test("Gemini: cần khóa và đồng ý; chỉ gửi câu hỏi đã che số + đoạn trích; hiện câu trả lời và đoạn đối chiếu", async ({ page: p }) => {
  const gui: string[] = [];
  await p.route("https://generativelanguage.googleapis.com/**", async (r) => {
    const h = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, OPTIONS" };
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: h });
    if (r.request().url().endsWith("/models")) return r.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify({ models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }, { name: "models/text-embedding", supportedGenerationMethods: ["embedContent"] }] }) });
    gui.push(r.request().postData() ?? "");
    expect(r.request().headers()["x-goog-api-key"]).toBe("AIzaThu123");
    return r.fulfill({ status: 200, headers: h, contentType: "application/json", body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Theo [1], hạn mức công nhận đất ở … (trả lời thử)." }] } }] }) });
  });
  await vao(p);
  await p.getByRole("button", { name: "Trợ lý AI (hỏi đáp)" }).click(); // lối vào từ thanh bên
  await p.getByRole("radio", { name: "Gemini API — cần Internet" }).click();
  // chưa có khóa → không gửi
  await p.getByLabel("Câu hỏi").fill("Thử");
  await p.getByLabel("Câu hỏi").press("Enter");
  await expect(p.getByText(/Chưa có khóa API Gemini/)).toBeVisible();
  await expect(p.getByText("https://aistudio.google.com/apikey")).toBeVisible();
  await p.getByLabel("Khóa API Gemini").fill("AIzaThu123");
  await p.getByRole("button", { name: "Lưu khóa" }).click();
  await p.getByRole("button", { name: "Kiểm tra khóa" }).click();
  await expect(p.getByText("Khóa hợp lệ — 1 mô hình dùng được")).toBeVisible();
  await p.getByLabel("Đồng ý điều kiện gửi dữ liệu cho Gemini").check();
  await p.getByLabel("Câu hỏi").fill("Hộ có CCCD 012345678901 sử dụng đất trước 18/12/1980 thì hạn mức công nhận đất ở là bao nhiêu?");
  await p.getByLabel("Câu hỏi").press("Enter");
  await expect(p.getByLabel("Câu trả lời")).toContainText("trả lời thử");
  expect(gui).toHaveLength(1);
  expect(gui[0]).not.toContain("012345678901");
  expect(gui[0]).toContain("[số đã ẩn]");
  expect(gui[0]).toContain("Phụ lục I");
  expect(gui[0]).not.toContain("Hộ mẫu 01");
  expect(gui[0]).not.toContain("SỐ LIỆU TỔNG HỢP");
  await expect(p.locator("details summary", { hasText: "Đoạn trích đã gửi kèm" })).toBeVisible();
  await p.screenshot({ path: "test-results/hoi-dap.png" });
});
