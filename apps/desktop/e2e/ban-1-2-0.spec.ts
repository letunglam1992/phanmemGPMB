/** 1.2.0: đối chiếu quy trình NĐ 151 (A3), Mẫu 44 (A2), lịch cưỡng chế (B2), sổ văn bản đi (C1), xem trước (C2). */
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
async function moHo(p: Page, thu = 0) {
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(thu).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}



const chu = (b: Buffer | Uint8Array) => new PizZip(b).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");

test("A3, C1, C2: Căn cứ thời hạn (NĐ 151, Sổ tay); số tiếp theo theo sổ, ghi sổ, cảnh báo trùng; xem trước văn bản", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Căn cứ thời hạn" }).click();
  const bang = p.locator("[data-doi-chieu-quy-trinh]");
  await expect(bang.locator("tr[data-buoc]")).toHaveCount(16);
  await expect(bang.locator("tr[data-buoc='8']")).toContainText("Lệch — phần mềm theo nghị định");
  await p.locator("[role=dialog]", { has: bang }).getByRole("button", { name: "Đóng" }).click();
  // C1: văn bản hộ T18 — số 15, ghi sổ; lần sau gợi ý 16, nhập lại 15 → cảnh báo trùng
  await moHo(p, 0);
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await p.locator(".muc-mau", { hasText: "Thông báo thụ lý giải quyết khiếu nại" }).click();
  await expect(p.locator("[data-so-tiep-theo]")).toContainText("Số tiếp theo theo sổ: 1/TB-UBND");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("15");
  await ngay(p, "Ngày ký", "19/10/2026");
  // C2: xem trước
  await p.locator("[data-xem-truoc]").click();
  const xt = p.locator("[data-noi-dung-xem-truoc]");
  await expect(xt).toContainText("THÔNG BÁO");
  await expect(xt).toContainText("15/TB-UBND");
  await p.getByRole("button", { name: "Đóng" }).last().click();
  await p.getByRole("button", { name: /Tạo văn bản cho 1 hộ/ }).click();
  await expect(p.getByText(/Đã ghi sổ văn bản đi/)).toBeVisible();
  expect(chu((await tep(p, "Mau-T18")).buf)).toContain("15/TB-UBND");
  await expect(p.locator("[data-so-tiep-theo]")).toContainText("16/TB-UBND");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("15");
  await expect(p.getByLabel("Kiểm tra thống nhất")).toContainText("Số 15/TB-UBND đã cấp cho Thông báo thụ lý giải quyết khiếu nại");
  // sổ văn bản đi ở thẻ Tài liệu, văn bản
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Tài liệu, văn bản" }).click();
  const so = p.locator("[data-so-van-ban-di]");
  await expect(so.getByLabel("Sổ văn bản đi")).toContainText("15/TB-UBND");
  await so.getByRole("button", { name: "Xuất Excel" }).click();
  expect((await tep(p, "So-van-ban-di_")).buf.byteLength).toBeGreaterThan(3000);
});

test("A2, B2: T26 Mẫu 44 cho đợt; lịch cưỡng chế ở thẻ Khiếu nại, cưỡng chế", async ({ page: p }) => {
  await vao(p);
  await moHo(p, 0);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await p.getByRole("button", { name: "+ Cưỡng chế thu hồi đất" }).click();
  const cc = p.locator("[data-cc=THU_HOI]");
  await ngay(p, "Ngày dự kiến cưỡng chế", "16/11/2026", cc);
  await expect(cc.getByRole("button", { name: "Biên bản cưỡng chế (T27)" })).toBeVisible();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.keyboard.press("Alt+3");
  const lich = p.locator("[data-lich-cuong-che]");
  await expect(lich).toContainText("16/11/2026");
  await expect(lich).toContainText("09/11/2026");
  // T26 (bước 9): chỉ hộ đã chốt phương án — chốt trước
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T26/ }).click();
  await p.getByRole("button", { name: /Tạo văn bản cho đợt/ }).click();
  const t26 = chu((await tep(p, "Mau-T26")).buf);
  expect(t26).toContain("theo quy định tại khoản 1 Điều 3 của Nghị định số 88/2024/NĐ-CP");
  expect(t26).toContain("TỔNG CỘNG");
});
