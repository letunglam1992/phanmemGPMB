/**
 * 0.9.17: danh sách thửa ↔ chi tiết thửa (quay lại); hộp Tạo hồ sơ → xem thửa trên bản đồ → quay lại; lớp ranh giới xã;
 * văn bản theo đợt (từ bước 8) chỉ chọn hộ đã chốt phương án; hộp Chốt phương án ẩn hộ đã phê duyệt.
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
/** 4 thửa 20 × 20 m, tờ 7, trong Xã Chiềng Mung (Đông 500 000, Bắc 2 350 000) */
function banDo() {
  const v = new VietDgn(100, 1, [0, 0]);
  for (let i = 0; i < 4; i++) {
    const x = 500000 + i * 20;
    v.duongGap({ lop: 10 }, [[x, 2350000], [x + 20, 2350000], [x + 20, 2350020], [x, 2350020], [x, 2350000]], 6)
      .chu({ lop: 4 }, [x + 5, 2350008], String(i + 1))
      .chu({ lop: 5 }, [x + 5, 2350004], "7")
      .chu({ lop: 13 }, [x + 10, 2350012], "CLN")
      .chu({ lop: 6 }, [x + 3, 2350016], `Chu ${i + 1}`);
  }
  return Buffer.from(v.xuat());
}
const loiTrang: string[] = [];
test.setTimeout(90_000);
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("bản đồ: chi tiết thửa ↔ danh sách; tạo hồ sơ → xem thửa → quay lại; ranh giới xã", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
  const ds = p.locator(".the.gian");
  await ds.locator("select").selectOption("TAT_CA");
  // 1. bấm thửa → chi tiết thay danh sách → quay lại, dòng vừa xem được tô
  await ds.locator("tbody tr", { hasText: "7-2" }).click();
  await expect(p.getByRole("heading", { name: "Tờ 7, thửa 2" })).toBeVisible();
  await expect(ds).toHaveCount(0);
  await p.getByRole("button", { name: "← Danh sách thửa" }).click();
  await expect(ds.locator("tbody tr", { hasText: "7-2" })).toHaveClass(/dang-chon/);
  // lớp ranh giới xã: con trỏ trên vùng thửa → thanh tọa độ ghi xã; nút vừa ranh xã của dự án
  const cv = p.locator(".ban-do canvas");
  await cv.evaluate((e) => e.scrollIntoView({ block: "start" }));
  const b = (await cv.boundingBox())!;
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await expect(p.locator(".toa-do")).toContainText("Xã Chiềng Mung");
  await expect(p.getByRole("button", { name: "Vừa ranh xã của dự án" })).toBeVisible();
  // 2. tạo hồ sơ: chọn tay 2 thửa → hộp → bấm số thửa → xem trên bản đồ → quay lại
  await ds.getByLabel(/Chọn thửa 7-1/).click();
  await expect(ds.getByLabel(/Chọn thửa 7-1/)).toBeChecked();
  await ds.getByLabel(/Chọn thửa 7-3/).click();
  await expect(ds.getByLabel(/Chọn thửa 7-3/)).toBeChecked();
  await p.getByRole("button", { name: "Tạo hồ sơ từ thửa thu hồi" }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Tạo hồ sơ từ các thửa thu hồi" });
  await expect(hop).toBeVisible();
  await hop.getByRole("button", { name: "Xem thửa 7-3 trên bản đồ" }).click();
  await expect(hop).toBeHidden();
  await expect(p.getByRole("status").filter({ hasText: "Đang xem thửa 7-3" })).toBeVisible();
  await expect(p.getByRole("heading", { name: "Tờ 7, thửa 3" })).toBeVisible();
  await p.screenshot({ path: "test-results/ban-do-quay-lai.png" });
  await p.getByRole("button", { name: "← Quay lại danh sách tạo hồ sơ" }).click();
  await expect(hop).toBeVisible();
  await expect(hop.getByRole("button", { name: /^Tạo 2 hồ sơ/ })).toBeVisible();
});

test("văn bản theo đợt từ bước 8 chỉ chọn hộ đã chốt; hộp Chốt phương án ẩn hộ đã phê duyệt", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: "Tờ trình đề nghị phê duyệt phương án (mẫu của xã)" }).click();
  await expect(p.locator(".ds-chon-ho input:disabled")).toHaveCount(2);
  await expect(p.getByRole("note")).toContainText("2 hộ chưa có trong bản phương án đã chốt");
  // T2 (bước 3) vẫn chọn mọi hộ
  await p.locator(".muc-mau", { hasText: "Tờ trình đề nghị ban hành Thông báo thu hồi đất" }).click();
  await expect(p.locator(".ds-chon-ho input:disabled")).toHaveCount(0);
  // chốt phương án H01
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  let chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  // hộ đang trong bản chờ duyệt: không chọn sẵn
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await expect(chot.locator("tr", { hasText: "H01" })).toContainText("Đang trong bản 1 chờ duyệt");
  await expect(chot.locator("tr", { hasText: "H01" }).locator("input[type=checkbox]")).not.toBeChecked();
  await chot.locator(".chan-hop").getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(p.locator("[role=dialog]")).toHaveCount(0);
  // văn bản R4: H01 chọn được, H02 mờ
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: "Tờ trình đề nghị phê duyệt phương án (mẫu của xã)" }).click();
  await expect(p.locator(".ds-chon-ho label", { hasText: "H01" }).locator("input")).toBeEnabled();
  await expect(p.locator(".ds-chon-ho label", { hasText: "H02" }).locator("input")).toBeDisabled();
  // phê duyệt bản 1 → hộp chốt ẩn H01, bật "Hiện cả hộ đã phê duyệt" thì hiện mờ
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Phê duyệt…" }).first().click();
  await p.locator("[role=dialog]").getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await expect(chot.locator("tbody tr", { hasText: "H01" })).toHaveCount(0);
  await chot.getByLabel(/Hiện cả hộ đã phê duyệt/).check();
  await expect(chot.locator("tbody tr", { hasText: "H01" })).toHaveClass(/mo/);
});

test("1.0.7 — hộp Chốt phương án: mặc định chỉ hộ đã xác nhận bước 5, ghi số hộ ẩn; bỏ đánh dấu thì hiện đủ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]", { hasText: "H01" }).click();
  await p.locator("[role=tab]", { hasText: "Tiến độ" }).click();
  await p.locator("tr", { hasText: "Lập phương án" }).first().click();
  await p.getByRole("button", { name: "Xác nhận hoàn thành" }).click();
  await expect(p.locator("tr", { hasText: "Lập phương án" }).first()).toContainText("Hoàn thành");
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  const loc = chot.getByLabel(/Chỉ hộ đã xác nhận hoàn thành bước 5/);
  await expect(loc).toBeChecked();
  await expect(chot.getByText(/ẩn 1 hộ chưa xác nhận/)).toBeVisible();
  await expect(chot.locator("tbody tr", { hasText: "H01" })).toHaveCount(1);
  await expect(chot.locator("tbody tr", { hasText: "H02" })).toHaveCount(0);
  await loc.uncheck();
  await expect(chot.locator("tbody tr", { hasText: "H02" })).toHaveCount(1);
});
