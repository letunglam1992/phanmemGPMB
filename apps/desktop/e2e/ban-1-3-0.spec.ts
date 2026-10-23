/** 1.3.0: T29–T31, phiếu kiểm tra (C2), báo cáo phân cấp 06 tháng (A1), văn bản phân cấp trong Cài đặt (A3). */
import { expect, test, type Page } from "@playwright/test";
import PizZip from "pizzip";

test.setTimeout(45_000);
test.use({ viewport: { width: 1536, height: 900 } });
const loiTrang: string[] = [];
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.clock.setFixedTime(new Date("2026-10-19T09:00:00+07:00"));
  await page.addInitScript(() => {
    for (const [o, k] of [[Element.prototype, "scrollIntoView"], [Element.prototype, "scrollTo"], [window, "scrollTo"]] as const) {
      const goc = (o as unknown as Record<string, (...a: unknown[]) => void>)[k]!;
      (o as unknown as Record<string, unknown>)[k] = function (this: unknown, ...a: unknown[]) { goc.apply(this, a); return Promise.resolve(); };
    }
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

async function vao(p: Page, mau = true) {
  await p.goto("/");
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Quản trị");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  if (mau) {
    await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
    await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  }
}
async function tep(p: Page, dau: string): Promise<{ ten: string; buf: Buffer }> {
  await expect.poll(() => p.evaluate((d) => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith(d)), dau)).toBeTruthy();
  const [ten, b64] = await p.evaluate((d) => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; const k = Object.keys(t).find((x) => x.startsWith(d))!; return [k, t[k]!]; }, dau);
  return { ten, buf: Buffer.from(b64, "base64") };
}
async function ngay(p: Page, nhan: string, gt: string, khung = p.locator("body")) {
  const o = khung.getByLabel(nhan, { exact: true }).first();
  await o.fill(gt);
  await o.press("Tab");
}



const chu = (b: Buffer | Uint8Array) => new PizZip(b).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

test("A1, A2, A3, C2: T29 Hội đồng BT + phiếu kiểm tra; báo cáo phân cấp đếm T29; Cài đặt đổi văn bản phân cấp", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T29/ }).click();
  await p.locator(".o-nhap", { has: p.locator("label", { hasText: "Thành viên Hội đồng" }) }).locator("textarea").fill("Ông A – Phó Chủ tịch UBND xã, Chủ tịch Hội đồng");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("5");
  await ngay(p, "Ngày ký", "19/10/2026");
  await p.locator("[data-phieu-kiem-tra]").click();
  const phieu = chu((await tep(p, "Phieu-kiem-tra_T29")).buf);
  expect(phieu).toContain("PHIẾU KIỂM TRA VĂN BẢN TRƯỚC KHI KÝ");
  expect(phieu).toContain("khoản 1 mục II Phụ lục II");
  await p.getByRole("button", { name: /Tạo văn bản cấp dự án/ }).click();
  expect(chu((await tep(p, "Mau-T29")).buf)).toContain("Ông A – Phó Chủ tịch UBND xã, Chủ tịch Hội đồng");
  // A1: báo cáo phân cấp — kỳ mặc định 30/06–14/12/2026, đếm T29 vừa ghi sổ
  await p.getByRole("button", { name: "Báo cáo tổng hợp" }).first().click();
  await p.locator("[data-mo-bao-cao-phan-cap]").click();
  const hop = p.locator("[role=dialog]", { has: p.locator("[data-bao-cao-phan-cap]") });
  await expect(hop).toContainText("trước 15/12/2026");
  await expect(hop.locator("tr[data-nv=HOI_DONG] td").last()).toHaveText("1");
  await hop.getByRole("button", { name: "Tạo tệp Word" }).click();
  expect(chu((await tep(p, "Bao-cao-phan-cap_")).buf)).toContain("Quyết định thành lập Hội đồng bồi thường, hỗ trợ, tái định cư đối với từng dự án");
  await hop.getByRole("button", { name: "Đóng" }).last().click();
  // A3: Cài đặt → Thẩm quyền phân cấp: đổi sang văn bản thay thế
  await p.getByRole("button", { name: "Cài đặt chung" }).first().click();
  await p.locator(".tab button", { hasText: "Thẩm quyền phân cấp" }).click();
  const the = p.locator("[data-the-tham-quyen]");
  await the.getByLabel("Số văn bản phân cấp").fill("05/2027/QĐ-UBND");
  await ngay(p, "Văn bản phân cấp có hiệu lực từ", "01/03/2027", the);
  await the.getByLabel("Văn bản phân cấp hết hiệu lực từ").fill("");
  await the.getByRole("button", { name: "Lưu văn bản phân cấp" }).click();
  await expect(the).toContainText("Cập nhật bởi");
  await expect(the.getByRole("button", { name: "Dùng lại QĐ 27/2026 (mặc định)" })).toBeVisible();
});
