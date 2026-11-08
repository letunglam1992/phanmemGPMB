/** 1.0.2: xuất tệp → nút "Tệp đã xuất" trên thanh tiêu đề tự mở danh sách (như nút tải về của trình duyệt). */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1536, height: 900 } });
test("xuất Excel báo cáo → danh sách tệp đã xuất có tệp vừa lưu; xóa danh sách", async ({ page: p }) => {
  const loi: string[] = [];
  p.on("pageerror", (e) => loi.push(e.message));
  await p.addInitScript(() => {
    (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = async (o: { suggestedName: string }) => ({
      name: o.suggestedName,
      createWritable: async () => ({ write: async () => undefined, close: async () => undefined }),
    });
  });
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  await p.getByRole("button", { name: "Báo cáo tổng hợp" }).first().click();
  await p.getByRole("button", { name: "Xuất Excel" }).first().click();
  const menu = p.getByRole("menu", { name: "Danh sách tệp đã xuất" });
  await expect(menu).toBeVisible();
  await expect(menu.getByText(/\.xlsx$/).first()).toBeVisible();
  await expect(menu.getByText(/chỉ có trong bản cài Windows/)).toBeVisible();
  await menu.getByRole("menuitem", { name: /Xóa danh sách/ }).click();
  await p.getByRole("button", { name: "Tệp đã xuất" }).click();
  await expect(p.getByText("Chưa xuất tệp nào.")).toBeVisible();
  expect(loi).toEqual([]);
});

test("1.3.5: bản cài — chọn thư mục lưu thẳng; tệp xuất ghi vào thư mục đó; danh sách hiện tên tệp và nút Thư mục; quay lại hỏi nơi lưu", async ({ page: p }) => {
  const loi: string[] = [];
  p.on("pageerror", (e) => loi.push(e.message));
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  // giả lập bản cài sau khi đã nạp dữ liệu (kho đã chọn IndexedDB) — các hàm lưu tệp dò bản cài lúc gọi
  await p.evaluate(() => {
    const w = window as unknown as { __goi: { cmd: string; headers?: Record<string, string> }[]; __TAURI_INTERNALS__: unknown };
    w.__goi = [];
    const giai = (s?: string) => (s ? decodeURIComponent(s) : "");
    w.__TAURI_INTERNALS__ = {
      transformCallback: () => 0,
      invoke: async (cmd: string, _a: unknown, o?: { headers?: Record<string, string> }) => {
        w.__goi.push({ cmd, headers: o?.headers });
        if (cmd === "chon_thu_muc_luu") return "D:\\Ho so GPMB";
        if (cmd === "luu_tai_xuong") return `${giai(o?.headers?.["thu-muc"]) || "C:\\Users\\cb\\Downloads"}\\${giai(o?.headers?.["ten-tep"])}`;
        if (cmd === "luu_tep_chon_noi") return `C:\\Users\\cb\\Desktop\\${giai(o?.headers?.["ten-tep"])}`;
        return null;
      },
    };
  });
  // chọn thư mục lưu thẳng ngay trong ô Tệp đã xuất
  await p.getByRole("button", { name: "Tệp đã xuất", exact: true }).click();
  const menu = p.getByRole("menu", { name: "Danh sách tệp đã xuất" });
  await expect(menu.getByRole("radio", { name: /Hỏi nơi lưu mỗi lần/ })).toBeChecked();
  await menu.getByRole("button", { name: "Chọn thư mục…" }).click();
  await expect(menu.getByRole("radio", { name: /Lưu thẳng vào/ })).toBeChecked();
  await expect(menu.locator("[data-noi-luu]")).toContainText("D:\\Ho so GPMB");
  await p.keyboard.press("Escape");
  // xuất Excel → lưu thẳng vào thư mục đã chọn
  await p.getByRole("button", { name: "Báo cáo tổng hợp" }).first().click();
  await p.getByRole("button", { name: "Xuất Excel" }).first().click();
  await expect(menu).toBeVisible();
  const goi = await p.evaluate(() => (window as unknown as { __goi: { cmd: string; headers?: Record<string, string> }[] }).__goi.filter((x) => x.cmd.startsWith("luu_")));
  expect(goi.map((x) => x.cmd)).toEqual(["luu_tai_xuong"]);
  expect(decodeURIComponent(goi[0]!.headers!["thu-muc"]!)).toBe("D:\\Ho so GPMB");
  const dong = menu.locator(".tep-dong").first();
  const ten = dong.locator(".tep-ten b");
  await expect(ten).toHaveText(/\.xlsx$/);
  expect((await ten.boundingBox())!.width).toBeGreaterThan(120); // tên tệp không bị nút "Thư mục" đẩy mất
  await expect(dong.getByRole("button", { name: /Mở thư mục chứa/ })).toBeVisible();
  await expect(dong.locator(".tep-ten small")).toContainText("D:\\Ho so GPMB");
  // quay lại hỏi nơi lưu → lần xuất sau mở hộp "Lưu thành"
  await menu.getByRole("radio", { name: /Hỏi nơi lưu mỗi lần/ }).check();
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Xuất Excel" }).first().click();
  await expect.poll(async () => p.evaluate(() => (window as unknown as { __goi: { cmd: string }[] }).__goi.filter((x) => x.cmd.startsWith("luu_")).map((x) => x.cmd))).toEqual(["luu_tai_xuong", "luu_tep_chon_noi"]);
  expect(loi).toEqual([]);
});
