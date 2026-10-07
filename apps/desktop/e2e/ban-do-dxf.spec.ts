/**
 * 0.9.27: nạp bản đồ DXF, hỏi cách gán lớp, tự chọn lớp cho từng đối tượng (bảng tích), nhãn nhiều nội dung,
 * số tờ nhập tay; DWG báo cách đổi sang DXF. Tệp dựng trong kiểm thử (không dùng bản đồ thật).
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
test.setTimeout(90_000);
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

const nhom = (...c: (string | number)[]) => c.map(String).join("\n");
/** 2 thửa 40 × 32,75 m (1.310 m²) trên lớp "RANH" (tên chữ); nhãn như bản đồ địa phương: CLN · 13 / 1310,0 · tên chủ — cùng lớp "NHAN". Không có số tờ. */
function dxf() {
  const X = 500000, Y = 2350000;
  const lw = (x0: number) => nhom(0, "LWPOLYLINE", 8, "RANH", 90, 4, 70, 1, 10, X + x0, 20, Y, 10, X + x0 + 40, 20, Y, 10, X + x0 + 40, 20, Y + 32.75, 10, X + x0, 20, Y + 32.75);
  const t = (s: string, x: number, y: number) => nhom(0, "TEXT", 8, "NHAN", 10, X + x, 20, Y + y, 40, 1.5, 1, s);
  const ent = [lw(0), lw(40), t("CLN", 5, 15), t("13", 15, 17), t("1310,0", 14, 12), t("Lèo Văn Pản", 12, 22), t("ONT", 45, 15), t("14", 55, 17), t("1310", 54, 12), t("Lò Thị Ánh", 52, 22)];
  return Buffer.from([nhom(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, "AC1032", 0, "ENDSEC"), nhom(0, "SECTION", 2, "ENTITIES", ...ent, 0, "ENDSEC", 0, "EOF")].join("\n"), "utf8");
}

test("Nạp DXF → tự chọn lớp cho từng đối tượng → nhãn nhiều nội dung, số tờ nhập tay", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  const tep = p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first();
  await tep.setInputFiles({ name: "thu.dwg", mimeType: "application/octet-stream", buffer: Buffer.from("AC1032\0\0\0\0\0\0\0\0") });
  await expect(p.getByText(/Save As → AutoCAD DXF/)).toBeVisible();
  await tep.setInputFiles({ name: "thu.dxf", mimeType: "application/octet-stream", buffer: dxf() });
  await expect(p.getByText("Đã nạp bản đồ: thu.dxf")).toBeVisible();
  await p.getByText("Tự chọn lớp cho từng đối tượng").click();
  await p.getByLabel("Số tờ bản đồ của tệp").fill("21");
  await p.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(p.getByText("Cấu hình lớp bản đồ")).toBeVisible();
  await expect(p.getByRole("cell", { name: "RANH", exact: true })).toBeVisible();
  const lopRanh = (await p.getByRole("row").filter({ has: p.getByRole("cell", { name: "RANH", exact: true }) }).locator("td").first().textContent())!.trim();
  const lopNhan = (await p.getByRole("row").filter({ has: p.getByRole("cell", { name: "NHAN", exact: true }) }).locator("td").first().textContent())!.trim();
  await p.getByLabel(`Lớp ${lopRanh} là Ranh thửa`).check();
  await p.getByLabel(`Lớp ${lopNhan} là Nhãn thửa (nhiều nội dung)`).check();
  await p.getByRole("button", { name: "Chốt cấu hình và dựng lại thửa" }).click();
  await expect(p.getByText("Cấu hình lớp bản đồ")).toBeHidden();
  // Thửa đọc đúng: tờ 21 (nhập tay, *), thửa 13, 14
  await expect(p.getByText("21*-13").first()).toBeVisible();
  await expect(p.getByText("21*-14").first()).toBeVisible();
  await p.getByText("21*-13").first().click();
  await expect(p.getByText("Lèo Văn Pản").first()).toBeVisible();
  await expect(p.getByText("CLN").first()).toBeVisible();
});
