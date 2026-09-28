/**
 * Kịch bản giao diện Giai đoạn 1 (docs/18 §7): không trắng màn hình, ô số quy ước Việt Nam, mã hồ sơ không trùng,
 * xóa mềm – thùng rác – khôi phục, sao lưu mã hóa, nạp bản đồ lần hai, menu chuột phải, bàn phím.
 * Dữ liệu: bộ mẫu ẩn danh của phần mềm; bản đồ DGN tổng hợp (không dùng tệp thật).
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
async function moHo(p: Page, i = 0) {
  await p.keyboard.press("Alt+3");
  await p.locator('[role=tablist] button', { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(i).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}
const loiTrang: string[] = [];
test.beforeEach(({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("P0-1, P0-2: ô số sai định dạng không làm trắng màn hình; quy ước Việt Nam", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator('[role=tablist] button', { hasText: "Thửa đất" }).click();
  const o = p.locator("input.o-so").nth(1);
  await expect(o).toHaveValue("9.222,1");
  await o.fill("9222.1");
  await expect(o).toHaveAttribute("aria-invalid", "true");
  await o.fill("20.000");
  await o.press("Tab");
  await expect(o).toHaveValue("20.000");
  await expect(o).toHaveAttribute("aria-invalid", "false");
  await expect(p.locator(".trang-ho h1")).toBeVisible();
  await expect(p.getByText("Chưa lưu")).toBeVisible();
});

test("P0-3: thêm hộ trùng mã bị chặn; mã gợi ý theo mẫu", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: /Thêm hộ, tổ chức/ }).click();
  const ma = p.locator(".hop-thoai .o-nhap", { hasText: "Mã hồ sơ" }).locator("input");
  await expect(ma).toHaveValue("H003");
  await ma.fill("h01");
  await expect(p.getByText(/Mã đã dùng cho hồ sơ/)).toBeVisible();
  await p.locator(".hop-thoai .o-nhap", { hasText: "Họ tên" }).locator("input").first().fill("Hộ thử").catch(() => undefined);
  await expect(p.getByRole("button", { name: "Tạo hồ sơ" })).toBeDisabled();
});

test("P0-4: xóa hồ sơ vào thùng rác, khôi phục; xóa hẳn chưa đủ 30 ngày bị khóa", async ({ page: p }) => {
  await vao(p);
  p.on("dialog", (d) => void (d.type() === "prompt" ? d.accept("nhập trùng") : d.accept()));
  await moHo(p, 1);
  await p.locator(".nut-xoa").click();
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(1);
  await p.getByText(/^Thùng rác/).first().click();
  await expect(p.getByRole("button", { name: "Xóa hẳn" })).toBeDisabled();
  await p.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await expect(p.getByText("Không có.").nth(1)).toBeVisible();
});

test("P0-5: sao lưu bắt buộc mật khẩu; mở tệp mã hóa bằng mật khẩu", async ({ page: p }) => {
  await p.addInitScript(() => {
    const w = window as unknown as { __tep: string | null; showSaveFilePicker: unknown };
    w.__tep = null;
    w.showSaveFilePicker = async (o: { suggestedName: string }) => ({
      name: o.suggestedName,
      createWritable: async () => ({ write: async (bl: Blob) => { w.__tep = btoa(String.fromCharCode(...new Uint8Array(await bl.arrayBuffer()))); }, close: async () => undefined }),
    });
  });
  await vao(p);
  await p.getByRole("button", { name: "Sao lưu, khôi phục" }).first().click();
  const hop = p.locator(".hop-thoai");
  const nut = hop.getByRole("button", { name: /Tạo bản sao lưu mã hóa/ });
  await expect(nut).toBeDisabled();
  await hop.locator("input[type=password]").nth(0).fill("Gpmb-sao-luu-2026");
  await hop.locator("input[type=password]").nth(1).fill("Gpmb-sao-luu-2026");
  await nut.click();
  await expect(hop.locator("[role=status]")).toContainText("Đã tạo bản sao lưu");
  const b64 = await p.evaluate(() => (window as unknown as { __tep: string }).__tep);
  await hop.locator("input[type=file]").setInputFiles({ name: "sl.gpmb", mimeType: "application/octet-stream", buffer: Buffer.from(b64, "base64") });
  await hop.getByPlaceholder(/Mật khẩu sao lưu hoặc/).fill("sai-mat-khau-1");
  await hop.getByRole("button", { name: "Mở tệp" }).click();
  await expect(hop.locator("[role=status]")).toContainText("không đúng");
  await hop.getByPlaceholder(/Mật khẩu sao lưu hoặc/).fill("Gpmb-sao-luu-2026");
  await hop.getByRole("button", { name: "Mở tệp" }).click();
  await expect(hop.getByText("tệp đã mã hóa")).toBeVisible();
});

test("Bản đồ: nạp tệp thứ hai vẫn hiển thị; xóa bản đồ", async ({ page: p }) => {
  const tao = (ox: number, oy: number, n: number) => {
    const v = new VietDgn(1000, 1, [0, 0]);
    for (let i = 0; i < n; i++) {
      const x = ox + i * 20;
      v.duongGap({ lop: 10 }, [[x, oy], [x + 20, oy], [x + 20, oy + 20], [x, oy + 20], [x, oy]], 6).chu({ lop: 4 }, [x + 5, oy + 8], String(i + 1)).chu({ lop: 5 }, [x + 5, oy + 4], "7");
    }
    return Buffer.from(v.xuat());
  };
  await vao(p);
  p.on("dialog", (d) => void d.accept());
  await p.keyboard.press("Alt+3");
  await p.locator('[role=tablist] button', { hasText: "Bản đồ" }).click();
  const tep = p.locator('input[type=file][accept=".dgn,.DGN"]');
  const doVe = () => p.evaluate(() => {
    const c = document.querySelector(".ban-do-khung canvas") as HTMLCanvasElement | null;
    if (!c) return -1;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (!(d[i] === 0xfb && d[i + 1] === 0xfc && d[i + 2] === 0xfb)) n++;
    return n;
  });
  await tep.setInputFiles({ name: "a.dgn", mimeType: "application/octet-stream", buffer: tao(500000, 2350000, 3) });
  await expect(p.getByText("a.dgn ·")).toBeVisible();
  await tep.setInputFiles({ name: "b.dgn", mimeType: "application/octet-stream", buffer: tao(530000, 2410000, 5) });
  await expect(p.getByText("b.dgn ·")).toBeVisible();
  await expect.poll(doVe).toBeGreaterThan(3000);
  await p.getByRole("button", { name: "Xóa bản đồ" }).click();
  await expect(p.getByText("Chưa nạp bản đồ ·")).toBeVisible();
});

test("Menu chuột phải và bàn phím", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator('[role=tablist] button', { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click({ button: "right" });
  await expect(p.locator(".menu-chuot-phai")).toContainText("Tính toán, giải trình");
  await p.getByRole("menuitem", { name: "Tính toán, giải trình" }).click();
  await expect(p.locator('[role=tablist] [aria-selected=true]')).toContainText("Tính toán");
  await p.keyboard.press("F1");
  await expect(p.locator(".hop-thoai h2")).toHaveText("Phím tắt");
  await p.keyboard.press("Escape");
  await expect(p.locator(".hop-thoai")).toHaveCount(0);
});
