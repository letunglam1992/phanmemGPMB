/**
 * Kịch bản giao diện 1.0.10: bản dùng thử — 1 dự án (dự án mẫu không tính); dự án thứ 2 mở hộp "Dùng thêm dự án" có mã cài
 * đặt, liên hệ tác giả; mã kích hoạt sai báo lỗi. (Kích hoạt bằng mã thật cần khóa riêng của tác giả — kiểm ở test/giay-phep.)
 */
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

async function taoDuAn(p: Page, ten: string) {
  await p.keyboard.press("Alt+2");
  await p.getByRole("button", { name: "Dự án mới" }).first().click();
  const hop = p.locator(".hop-thoai");
  await hop.locator(".o-nhap", { has: p.locator('label:text-is("Tên dự án *")') }).locator("input").fill(ten);
  await hop.locator(".o-nhap", { has: p.locator('label:text-is("Xã, phường *")') }).locator("select").selectOption({ index: 1 });
  await hop.getByRole("button", { name: "Lưu" }).click();
}

test("dùng thử 1 dự án: dự án mẫu không tính; dự án thứ 2 bị chặn, hiện mã cài đặt, liên hệ; mã kích hoạt sai báo lỗi", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+2");
  await expect(p.locator("[data-dung-thu]")).toContainText("Bản dùng thử · 0/1 dự án");
  await taoDuAn(p, "Dự án thử thứ nhất");
  await expect(p.locator(".hop-thoai")).toHaveCount(0);
  await p.keyboard.press("Alt+2");
  await expect(p.locator("[data-dung-thu]")).toContainText("1/1 dự án");
  await taoDuAn(p, "Dự án thử thứ hai");
  const hop = p.locator(".hop-thoai", { hasText: "Dùng thêm dự án" });
  await expect(hop.getByRole("alert")).toContainText("Bản dùng thử dùng được 1 dự án; đang có 1 dự án");
  await expect(hop).toContainText("0987559092");
  await expect(hop.getByLabel("Mã cài đặt")).toHaveText(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
  await hop.getByLabel("Mã kích hoạt").fill("GPMB1.abc.def");
  await hop.getByRole("button", { name: "Kích hoạt" }).click();
  await expect(p.getByText(/Mã kích hoạt không dùng được/)).toBeVisible();
  await hop.getByRole("button", { name: "Đóng" }).last().click();
  // hộp tạo dự án vẫn mở (chưa lưu); hủy → danh sách vẫn 1 dự án tính giới hạn
  await p.keyboard.press("Escape");
  await p.keyboard.press("Alt+2");
  await expect(p.locator("[data-dung-thu]")).toContainText("1/1 dự án");
  // Giới thiệu, bản quyền có mục Bản quyền sử dụng
  await p.locator("button.nut-nguoi").click();
  await p.getByRole("menuitem", { name: /Giới thiệu, bản quyền/ }).click();
  await expect(p.locator("[data-giay-phep=DUNG_THU]")).toContainText("Bản dùng thử — 1 dự án");
});
