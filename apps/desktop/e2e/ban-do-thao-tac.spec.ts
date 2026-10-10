/**
 * Kịch bản giao diện 0.9.6 (docs/08 §9.3–9.5): quét khung chọn nhiều thửa (tổng hợp, mở danh sách hộ đã lọc), tìm thửa/chủ
 * và thẻ tóm tắt hồ sơ, xuất PDF bản đồ tiến độ.
 */
import { writeFileSync } from "node:fs";
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
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(() => {
    const w = window as unknown as { __tep: Record<string, string>; showSaveFilePicker: unknown };
    w.__tep = {};
    w.showSaveFilePicker = async (o: { suggestedName: string }) => ({
      name: o.suggestedName,
      createWritable: async () => ({
        write: async (bl: Blob) => {
          const u = new Uint8Array(await bl.arrayBuffer());
          let s = "";
          for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
          w.__tep[o.suggestedName] = btoa(s);
        },
        close: async () => undefined,
      }),
    });
  });
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

test("quét khung chọn nhiều thửa, mở danh sách hộ đã lọc; tìm thửa → tóm tắt hồ sơ; xuất PDF tiến độ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
  await p.getByRole("button", { name: "Nạp tọa độ mốc…" }).click();
  await p.getByLabel("Tệp tọa độ mốc").setInputFiles({ name: "moc.csv", mimeType: "text/csv", buffer: Buffer.from("X,Y\n1350000,500000\n1350000,500060\n1350020,500060\n1350020,500000\n") });
  await p.locator(".hop-thoai").getByRole("button", { name: "Thêm 1 ranh hợp lệ" }).click();
  await p.getByRole("button", { name: "Tạo hồ sơ từ thửa thu hồi" }).click();
  await p.locator(".hop-thoai input[type=checkbox]").check();
  await p.locator(".hop-thoai").getByRole("button", { name: /Tạo \d+ hồ sơ/ }).click();
  await expect(p.getByRole("heading", { name: "Danh sách hộ gia đình, cá nhân, tổ chức" })).toBeVisible();
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();

  // Quét khung toàn bộ bản đồ → 4 thửa, 3 hồ sơ (thửa 4 ngoài ranh, chưa có hồ sơ)
  await p.getByRole("button", { name: "Thu gọn bảng lớp" }).click();
  await p.getByRole("button", { name: "Chọn nhiều thửa (quét khung)" }).click();
  const cv = p.locator(".ban-do canvas");
  await cv.evaluate((e) => e.scrollIntoView({ block: "start" }));
  const b = (await cv.boundingBox())!;
  await p.mouse.move(b.x + b.width * 0.145, b.y + b.height * 0.2);
  await p.mouse.down();
  await p.mouse.move(b.x + b.width * 0.9, b.y + b.height * 0.75, { steps: 5 });
  await p.mouse.up();
  const vc = p.getByLabel("Vùng thửa đang chọn");
  await expect(vc).toContainText("Vùng chọn: 4 thửa");
  await expect(vc).toContainText("3 hồ sơ · 1 thửa chưa có hồ sơ");
  await expect(vc.getByRole("button", { name: "Tạo hồ sơ (1 thửa)…" })).toBeVisible();
  await vc.getByRole("button", { name: "Mở danh sách 3 hộ" }).click();
  await expect(p.getByLabel("Lọc theo vùng chọn trên bản đồ")).toContainText("3 hộ chọn trên bản đồ");
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(3);
  await p.getByLabel("Bỏ lọc vùng chọn").click();
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(5);

  // Tìm thửa 7-3 → chọn, thẻ tóm tắt hồ sơ, nút mở hồ sơ
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.getByLabel("Tìm thửa trên bản đồ").fill("7-3");
  await p.getByRole("listbox").getByRole("option").first().click();
  const tt = p.getByLabel("Tóm tắt hồ sơ");
  await expect(tt).toContainText("Chu 3");
  await expect(tt).toContainText("DT thu hồi 400 m²");
  await expect(tt.getByRole("button", { name: "Mở hồ sơ" })).toBeVisible();

  // Xuất PDF A4
  await p.getByLabel("Khổ giấy PDF").selectOption("A4");
  await p.getByRole("button", { name: "Xuất PDF tiến độ" }).click();
  await expect(p.getByText("Đã xuất PDF bản đồ tiến độ")).toBeVisible();
  const teps = await p.evaluate(() => (window as unknown as { __tep: Record<string, string> }).__tep);
  const ten = Object.keys(teps).find((k) => k.startsWith("Ban-do-tien-do_") && k.endsWith("_A4.pdf"))!;
  const pdf = Buffer.from(teps[ten]!, "base64");
  // 1.0.6: PDF vector, chữ thật (phông nhúng), lưới tọa độ
  expect(pdf.subarray(0, 8).toString("latin1")).toBe("%PDF-1.7");
  expect(pdf.toString("latin1")).toContain("/MediaBox [0 0 841.89 595.28]");
  expect(pdf.toString("latin1")).toContain("/FontFile2");
  expect(pdf.toString("latin1")).not.toContain("/DCTDecode");
  writeFileSync("test-results/ban-do-tien-do.pdf", pdf);
  // 1.0.7: in theo khung đang xem → tên tệp có "_vung-chon"
  await p.getByLabel("Phạm vi in").selectOption("KHUNG");
  await p.getByRole("button", { name: "Xuất PDF tiến độ" }).click();
  await expect.poll(async () => Object.keys(await p.evaluate(() => (window as unknown as { __tep: Record<string, string> }).__tep)).some((k) => k.endsWith("_A4_vung-chon.pdf"))).toBe(true);
  // 1.0.7: vẽ khung in bằng chuột → phạm vi "Khung đã vẽ"; bỏ khung → về theo ranh
  await p.getByRole("button", { name: "Vẽ khung in" }).click();
  const cv2 = p.locator(".ban-do canvas");
  await cv2.evaluate((e) => e.scrollIntoView({ block: "start" }));
  const b2 = (await cv2.boundingBox())!;
  await p.mouse.move(b2.x + b2.width * 0.3, b2.y + b2.height * 0.3);
  await p.mouse.down();
  await p.mouse.move(b2.x + b2.width * 0.6, b2.y + b2.height * 0.6, { steps: 5 });
  await p.mouse.up();
  await expect(p.getByLabel("Phạm vi in")).toHaveValue("VE");
  await p.getByRole("button", { name: "Bỏ khung in" }).click();
  await expect(p.getByLabel("Phạm vi in")).toHaveValue("RANH");
});
