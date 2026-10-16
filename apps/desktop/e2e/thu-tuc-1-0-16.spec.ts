/** 1.0.16: hạn ban hành QĐ thu hồi đất cho dự án không chia đợt; tỉnh xem chi tiết khâu thủ tục quá hạn. */
import { expect, test, type Page } from "@playwright/test";
import PizZip from "pizzip";

test.setTimeout(120_000);
test.use({ viewport: { width: 1536, height: 900 } });
const loiTrang: string[] = [];
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.addInitScript(() => {
    // WebView2 bản mới: các hàm cuộn trả về Promise
    for (const [o, k] of [[Element.prototype, "scrollIntoView"], [Element.prototype, "scrollTo"], [window, "scrollTo"]] as const) {
      const goc = (o as unknown as Record<string, (...a: unknown[]) => void>)[k]!;
      (o as unknown as Record<string, unknown>)[k] = function (this: unknown, ...a: unknown[]) { goc.apply(this, a); return Promise.resolve(); };
    }
  });
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
async function tep(p: Page, dau: string): Promise<{ ten: string; buf: Buffer }> {
  await expect.poll(() => p.evaluate((d) => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith(d)), dau)).toBeTruthy();
  const [ten, b64] = await p.evaluate((d) => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; const k = Object.keys(t).find((x) => x.startsWith(d))!; return [k, t[k]!]; }, dau);
  return { ten, buf: Buffer.from(b64, "base64") };
}

test("dự án không chia đợt: ghi ngày đủ điều kiện cho cả dự án → quá hạn; tỉnh thấy khâu quá hạn, Word có bảng", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await expect(p.locator("[data-han-thu-hoi-da]")).toHaveCount(0); // chưa có bản phê duyệt
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  await p.getByRole("button", { name: "Phê duyệt…" }).first().click();
  await p.locator("[role=dialog]").getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
  await expect(p.locator("[data-tt-pa]").first()).toHaveText("Đã phê duyệt");
  const the = p.locator("[data-han-thu-hoi-da]");
  await expect(the).toContainText("chưa ghi ngày đủ điều kiện");
  await expect(the).toContainText("2/2 hộ chưa xác nhận xong bước 13");
  await the.getByRole("button", { name: "Ngày đủ điều kiện…" }).click();
  const ndk = p.locator("[role=dialog]", { hasText: "Ngày đủ điều kiện ban hành QĐ thu hồi đất – Cả dự án" });
  await ndk.locator("input").first().fill("01/09/2026");
  await ndk.locator("input").first().press("Tab");
  await ndk.getByRole("button", { name: "Lưu cho 2 hộ" }).click();
  await expect(the).toContainText("11/09/2026 — quá hạn");
  // --- gửi tỉnh, tổng hợp
  await p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" }).click();
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Tên đơn vị tổng hợp").fill("Sở (thử)");
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauTinh2026");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Tạo khóa cấp tỉnh" }).click();
  await p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }).click();
  const khoa = await tep(p, "Khoa-cong-khai_");
  await p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }).click();
  await p.getByLabel("Chọn tệp khóa của tỉnh").setInputFiles({ name: khoa.ten, mimeType: "application/json", buffer: khoa.buf });
  await p.getByLabel("Tên đơn vị gửi").fill("UBND xã thử");
  await p.getByRole("button", { name: /Xuất gói gửi tỉnh/ }).click();
  const goi = await tep(p, "GPMB-gui-tinh_");
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Đã mở khóa")).toBeVisible();
  await p.getByLabel("Chọn gói dữ liệu của xã").setInputFiles({ name: goi.ten, mimeType: "application/octet-stream", buffer: goi.buf });
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("nhận mới");
  await expect(p.locator("[data-tong-qua-han]")).toContainText("1khâu thủ tục quá hạn");
  await p.locator("[data-qua-han-da]").first().click();
  const hop = p.locator("[role=dialog]", { hasText: "Khâu thủ tục quá hạn" });
  await expect(hop).toContainText("Cả dự án");
  await expect(hop).toContainText("Ban hành QĐ thu hồi đất");
  await expect(hop).toContainText("11/09/2026");
  await hop.getByRole("button", { name: "Đóng" }).click();
  await expect(hop).toHaveCount(0);
  // bấm chỉ số toàn tỉnh cũng mở hộp
  await p.locator("[data-tong-qua-han]").click();
  await expect(hop).toContainText("Ban hành QĐ thu hồi đất");
  await hop.getByRole("button", { name: "Đóng" }).click();
  // Word toàn tỉnh có bảng khâu quá hạn
  await p.getByRole("button", { name: "Báo cáo Word" }).click();
  await p.getByLabel("Cơ quan chủ quản").fill("UBND tỉnh Sơn La");
  await p.getByLabel("Họ tên người ký").fill("Người ký thử");
  await p.getByRole("button", { name: "Tạo tệp Word" }).click();
  const bc = await tep(p, "Bao-cao-tong-hop-GPMB-toan-tinh_");
  const xml = new PizZip(bc.buf).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
  expect(xml).toContain("Có 1 khâu thủ tục quá hạn");
  expect(xml).toContain("Ban hành QĐ thu hồi đất");
});
