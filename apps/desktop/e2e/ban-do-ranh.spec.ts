/**
 * Kịch bản giao diện 0.9.5 (docs/08 §9.1, §9.2): ranh GPMB nhập ngoài — bảng tọa độ mốc (CSV, X = Bắc), vẽ ranh trên bản
 * đồ; tự cắt thửa, DT thu hồi từng thửa; tạo hồ sơ; cập nhật DT vào hồ sơ; cảnh báo phần còn lại dưới ngưỡng tách thửa.
 */
import { expect, test, type Page } from "@playwright/test";
import { VietDgn } from "../../../packages/gis/test/viet-dgn";

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
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

/** 4 thửa 20 × 20 m, tờ 7, thửa 1–4, đất ở nông thôn, chủ riêng. */
function banDo() {
  const v = new VietDgn(1000, 1, [0, 0]);
  for (let i = 0; i < 4; i++) {
    const x = 500000 + i * 20;
    v.duongGap({ lop: 10 }, [[x, 1350000], [x + 20, 1350000], [x + 20, 1350020], [x, 1350020], [x, 1350000]], 6)
      .chu({ lop: 4 }, [x + 5, 1350008], String(i + 1))
      .chu({ lop: 5 }, [x + 5, 1350004], "7")
      .chu({ lop: 13 }, [x + 12, 1350012], "ONT")
      .chu({ lop: 6 }, [x + 3, 1350016], `Chu ${i + 1}`);
  }
  return Buffer.from(v.xuat());
}

test("ranh từ tọa độ mốc → DT thu hồi từng thửa; tạo hồ sơ; cập nhật DT; phần còn lại dưới ngưỡng; vẽ ranh", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();

  // Bảng mốc: X = Bắc, Y = Đông (quy ước VN-2000) — ranh từ x = 500003 đến 500050, y = 1350000 đến 1350020
  const csv = "Tên mốc,X,Y\nM1,1350000,500003\nM2,1350000,500050\nM3,1350020,500050\nM4,1350020,500003\n";
  await p.getByRole("button", { name: "Nạp tọa độ mốc…" }).click();
  await p.getByLabel("Tệp tọa độ mốc").setInputFiles({ name: "moc.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  const hop = p.locator(".hop-thoai");
  await expect(hop.getByText("Cột X là tọa độ Bắc (quy ước VN-2000) — đã đổi trục.")).toBeVisible();
  await expect(hop.getByText("940,0")).toBeVisible();
  await hop.getByRole("button", { name: "Thêm 1 ranh hợp lệ" }).click();
  const ds = p.getByLabel("Ranh GPMB đã nhập");
  await expect(ds).toContainText("Ranh 1");
  await expect(ds).toContainText("bảng tọa độ mốc (moc.csv)");

  // DT thu hồi từng thửa: 1 còn lại dải rộng 3 m (thu hồi 340 m²), 2 toàn bộ, 3 một nửa, 4 ngoài ranh
  const bang = p.locator(".the.gian table");
  await expect(bang.locator("tr", { hasText: "7-1" })).toContainText("340.0");
  await expect(bang.locator("tr", { hasText: "7-2" })).toContainText("400.0");
  await expect(bang.locator("tr", { hasText: "7-3" })).toContainText("200.0");
  await expect(bang.locator("tr", { hasText: "7-4" })).toHaveCount(0); // lọc "Trong ranh"

  // Phần còn lại (Điều 13 PL I QĐ 106/2025, đất ở tại xã): thửa 1 còn 60 m² nhưng chỉ rộng 3 m < 4 m → cảnh báo kích thước
  const cl = p.getByLabel("Phần đất còn lại");
  await expect(cl.locator(".thong-bao-vang")).toHaveCount(1);
  await expect(cl).toContainText("không bảo đảm kích thước tối thiểu (điểm b khoản 2 Điều 13 Phụ lục I QĐ 106/2025/QĐ-UBND)");
  await expect(cl).toContainText("Không dựng được hình chữ nhật có cạnh chiều rộng 4 m");

  // Tạo hồ sơ cho 3 thửa trong ranh, rồi thu hẹp ranh (vẽ) → cập nhật DT vào hồ sơ
  await p.getByRole("button", { name: "Tạo hồ sơ từ thửa thu hồi" }).click();
  await p.locator(".hop-thoai input[type=checkbox]").check(); // xác nhận đã kiểm tra thửa nghi vấn (thiếu nhãn DT)
  await p.locator(".hop-thoai").getByRole("button", { name: /Tạo \d+ hồ sơ/ }).click();
  await expect(p.getByRole("heading", { name: "Danh sách hộ gia đình, cá nhân, tổ chức" })).toBeVisible(); // chuyển sang danh sách hộ
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await expect(p.getByRole("button", { name: /Cập nhật DT thu hồi vào hồ sơ \(3 thửa/ })).toBeVisible();
  await ds.getByRole("button", { name: "Xóa ranh Ranh 1" }).click();
  // Vẽ ranh nhỏ hơn: dùng lại bảng mốc với ranh 500010–500030 (thửa 1 nửa, thửa 2 nửa)
  await p.getByRole("button", { name: "Nạp tọa độ mốc…" }).click();
  await p.getByLabel("Tệp tọa độ mốc").setInputFiles({ name: "moc2.csv", mimeType: "text/csv", buffer: Buffer.from("Tên mốc;X;Y\nM1;1350000;500010\nM2;1350000;500030\nM3;1350020;500030\nM4;1350020;500010\n") });
  await p.locator(".hop-thoai").getByRole("button", { name: "Thêm 1 ranh hợp lệ" }).click();
  await p.getByRole("button", { name: /Cập nhật DT thu hồi vào hồ sơ/ }).click();
  const hop2 = p.locator(".hop-thoai");
  await expect(hop2.locator("tr", { hasText: "7-2" })).toContainText("200");
  await expect(hop2.locator("tr", { hasText: "7-3" })).toContainText("Ngoài ranh");
  await hop2.getByRole("button", { name: /Cập nhật \d+ thửa/ }).click();
  await expect(p.getByText(/Đã cập nhật DT thu hồi \d+ thửa/)).toBeVisible();

  // Vẽ ranh trên bản đồ: 4 điểm + chuột phải → Dùng làm ranh GPMB
  await p.getByRole("button", { name: "Vẽ ranh trên bản đồ" }).click();
  const cv = p.locator(".ban-do canvas");
  const b = (await cv.boundingBox())!;
  await p.screenshot({ path: "test-results/ban-do-ranh-truoc-ve.png" });
  for (const [fx, fy] of [[0.45, 0.2], [0.6, 0.2], [0.6, 0.32], [0.45, 0.32]] as const) {
    await p.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
    await p.waitForTimeout(150);
  }
  await p.mouse.click(b.x + b.width * 0.45, b.y + b.height * 0.32, { button: "right" });
  await p.getByRole("button", { name: "Dùng làm ranh GPMB" }).click();
  await expect(ds).toContainText("Ranh vẽ 1");
  await p.screenshot({ path: "test-results/ban-do-ranh.png" });
});
