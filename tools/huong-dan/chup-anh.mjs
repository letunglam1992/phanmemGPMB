/**
 * Chụp ảnh màn hình cho tài liệu "Hướng dẫn sử dụng" (D1, 1.0.20) — chạy trên bản build (vite preview) bằng Chromium,
 * chỉ dùng dữ liệu mẫu ẩn danh và dự án tập huấn giả lập (không có dữ liệu thật).
 *
 *   cd apps/desktop && npx vite build && npx vite preview --port 4173 &
 *   PW_CHROMIUM=... node tools/huong-dan/chup-anh.mjs [thư mục ra]   (mặc định tools/huong-dan/anh, không đưa vào kho)
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ra = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "anh");
mkdirSync(ra, { recursive: true });
const URL = process.env.GPMB_URL ?? "http://localhost:4173";

const trinh = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await trinh.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1.25, locale: "vi-VN" });
const p = await ctx.newPage();
await p.clock.setFixedTime(new Date("2026-10-19T09:00:00+07:00"));
p.on("dialog", (d) => void d.accept());
p.on("pageerror", (e) => console.error("Lỗi trang:", e.message));

const cho = (ms = 500) => p.waitForTimeout(ms);
let dem = 0;
async function chup(ten, o = {}) {
  await cho(o.cho ?? 600);
  const tep = join(ra, `${String(++dem).padStart(2, "0")}-${ten}.jpg`);
  if (o.phanTu) await p.locator(o.phanTu).first().screenshot({ path: tep, type: "jpeg", quality: 72 });
  else await p.screenshot({ path: tep, type: "jpeg", quality: 72 });
  console.log("Đã chụp", tep);
}
const nut = (ten, exact = true) => p.getByRole("button", { name: ten, exact }).first();
const the = (ten) => p.locator("[role=tablist] button", { hasText: ten }).first();
const thanhBen = (ten) => p.locator("nav button, aside button", { hasText: ten }).first();

// 1. Lần đầu: tạo tài khoản quản trị
await p.goto(URL);
await cho(800);
const o = p.locator("form input");
await o.nth(0).fill("quantri");
await o.nth(1).fill("Nguyễn Văn Quản Trị");
await p.locator("input[type=password]").nth(0).fill("matkhau123");
await p.locator("input[type=password]").nth(1).fill("matkhau123");
await chup("tao-tai-khoan");
await p.click("button[type=submit]");
await cho(800);

// 2. Tổng quan (dữ liệu mẫu)
await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
await p.getByText(/Đang theo dõi 1 dự án/).waitFor();
await chup("tong-quan", { cho: 1200 });

// 3. Danh sách dự án
await thanhBen("Dự án").click();
await chup("danh-sach-du-an");

// 4. Không gian dự án
await p.locator(".da-luoi .da-the, .da-luoi > *").first().click();
await cho(800);
await chup("tong-quan-du-an", { cho: 1000 });
await the("Thông tin dự án").click();
await chup("thong-tin-du-an");
await the("Bước chung").click();
await chup("buoc-chung");
await the("Hộ, cá nhân").click();
await chup("danh-sach-ho");

// 5. Hồ sơ hộ
await p.locator("tr[data-ho-id]").first().click();
await p.locator(".trang-ho h1").waitFor();
await chup("ho-thong-tin");
await the("Thửa đất").click();
await chup("ho-thua-dat");
await the("Kiểm đếm tài sản").click();
await chup("ho-kiem-dem");
await the("Tính toán, giải trình").click();
await chup("ho-tinh-toan", { cho: 1000 });
await the("Văn bản").click();
await chup("ho-van-ban", { cho: 1200 });
await the("Tiến độ").click();
await chup("ho-tien-do");
await the("Khiếu nại").click();
await nut("+ Ghi đơn khiếu nại").click();
const don = p.locator("[data-don]").first();
await don.getByLabel("Ngày nhận đơn", { exact: true }).fill("05/10/2026");
await don.getByLabel("Ngày nhận đơn", { exact: true }).press("Tab");
await don.getByLabel("Ngày thụ lý", { exact: true }).fill("08/10/2026");
await don.getByLabel("Ngày thụ lý", { exact: true }).press("Tab");
await don.getByLabel("Nội dung đơn").fill("Đề nghị xem xét lại đơn giá cây trồng (minh họa)");
await chup("ho-khieu-nai");
await nut("Hoàn tác").click().catch(() => undefined);
await cho(400);

// 6. Phương án: chốt, phê duyệt
await thanhBen("Hồ sơ").click();
await the("Tổng quan dự án").click();
await nut("Chốt phương án…").click();
const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
await chup("chot-phuong-an");
await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
await chot.waitFor({ state: "detached" });
await nut("Phê duyệt…").click();
await chup("phe-duyet-phuong-an");
await p.locator("[role=dialog]").getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
await cho(600);
await p.locator("#the-phuong-an").scrollIntoViewIfNeeded().catch(() => undefined);
await chup("phuong-an-phien-ban");

// 7. Chi trả của hộ, chi trả – kinh phí của dự án
await the("Hộ, cá nhân").click();
await p.locator("tr[data-ho-id]").first().click();
await the("Chi trả").click();
await chup("ho-chi-tra");
await thanhBen("Hồ sơ").click();
await the("Chi trả, kinh phí").click();
await chup("chi-tra-kinh-phi", { cho: 900 });

// 8. Báo cáo, gửi tỉnh
await thanhBen("Báo cáo tổng hợp").click();
await chup("bao-cao", { cho: 1000 });
await thanhBen("Gửi tỉnh, tổng hợp tỉnh").click();
await chup("gui-tinh");

// 9. Dự án tập huấn, bản đồ
await thanhBen("Dự án").click();
await p.locator("[data-tao-tap-huan]").click();
await p.locator("[data-du-an-tap-huan]").waitFor();
await chup("du-an-tap-huan");
await the("Bản đồ").click();
await cho(2500);
await p.locator("canvas").first().evaluate((e) => e.closest(".the, section, div")?.scrollIntoView({ block: "center" })).catch(() => undefined);
await p.getByText("Lớp bản đồ", { exact: true }).first().click().catch(() => undefined);
await chup("ban-do", { cho: 1500 });

// 10. Sao lưu, cài đặt, hướng dẫn, giới thiệu
await thanhBen("Sao lưu, khôi phục").click();
await chup("sao-luu");
await p.keyboard.press("Escape");
await cho(300);
await thanhBen("Cài đặt chung").click();
await chup("cai-dat");
await p.keyboard.press("Escape");
await cho(300);
await thanhBen("Hướng dẫn sử dụng").click();
await chup("huong-dan");
await thanhBen("Giới thiệu, bản quyền").click();
await chup("gioi-thieu");

await trinh.close();
