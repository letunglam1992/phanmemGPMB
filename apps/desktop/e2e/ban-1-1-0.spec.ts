/** 1.1.0: thủ tục khiếu nại (A1, A2), tạo nhiều văn bản một lần (D1), báo cáo khiếu nại dự án (A4), mốc bàn giao đất thực địa (D3). */
import { expect, test, type Page } from "@playwright/test";
import PizZip from "pizzip";

test.setTimeout(120_000);
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

async function ghiDon(p: Page, thu: number, noiDung: string) {
  await moHo(p, thu);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await p.getByRole("button", { name: "+ Ghi đơn khiếu nại" }).click();
  const don = p.locator("[data-don]").first();
  await ngay(p, "Ngày nhận đơn", "09/10/2026", don);
  await don.getByLabel("Nội dung đơn").fill(noiDung);
  return don;
}

test("A1, A2, D1, A4: nhắc thông báo đối thoại; T18 cho nhiều hộ một lần (số liên tiếp, ghi ngược từng đơn); thẻ Khiếu nại ở Tổng quan, Excel", async ({ page: p }) => {
  await vao(p);
  let don = await ghiDon(p, 0, "Không đồng ý đơn giá (thử 1)");
  // hôm nay 19/10/2026; đối thoại 22/10 → thông báo chậm nhất 17/10 (trước ít nhất 05 ngày — k1 Điều 28 NĐ 124 sửa bởi NĐ 155)
  await ngay(p, "Ngày tổ chức đối thoại", "22/10/2026", don);
  await expect(don.locator("[data-canh-bao-thu-tuc]")).toContainText("Chưa ghi ngày gửi thông báo tổ chức đối thoại (đối thoại 22/10/2026; phải gửi chậm nhất 17/10/2026");
  await ngay(p, "Ngày gửi thông báo đối thoại", "16/10/2026", don);
  await expect(don.locator("[data-canh-bao-thu-tuc]")).toHaveCount(0);
  await expect(don.getByRole("button", { name: "TB tổ chức đối thoại (T24)" })).toBeVisible();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  don = await ghiDon(p, 1, "Không đồng ý diện tích (thử 2)");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  // D1: mở T18 từ đơn của hộ thứ hai, chọn thêm hộ thứ nhất → 2 văn bản, số 15, 16
  await don.getByRole("button", { name: "TB thụ lý (T18)" }).click();
  await expect(p.getByRole("heading", { name: /Thông báo thụ lý giải quyết khiếu nại/ })).toBeVisible();
  const ma = await p.locator(".ds-chon-ho label").first().innerText();
  await p.getByLabel("Lọc hộ").fill(ma.split(/\s/)[0]!);
  await p.getByLabel("Lọc hộ").press("Enter");
  await p.getByLabel("Lọc hộ").fill("");
  await expect(p.getByLabel("Số hộ đã chọn")).toContainText("đã chọn 2/");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("15");
  await ngay(p, "Ngày ký", "19/10/2026");
  await p.getByRole("button", { name: "Tạo văn bản cho 2 hộ" }).click();
  await expect(p.getByText(/Đã tạo 2 văn bản Mẫu T18 \(tệp \.zip\)/)).toBeVisible();
  const zip = new PizZip((await tep(p, "Mau-T18_2-ho")).buf);
  const vb = Object.keys(zip.files).filter((k) => k.endsWith(".docx")).map((k) => chu(zip.file(k)!.asUint8Array()));
  expect(vb).toHaveLength(2);
  expect(vb.some((x) => x.includes("Số: 15/TB-UBND") && x.includes("thử 1"))).toBe(true);
  expect(vb.some((x) => x.includes("Số: 16/TB-UBND") && x.includes("thử 2"))).toBe(true);
  // ghi ngược số thông báo thụ lý vào từng đơn
  await moHo(p, 0);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await expect(p.getByLabel("Số thông báo thụ lý")).toHaveValue("15/TB-UBND");
  await moHo(p, 1);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await expect(p.getByLabel("Số thông báo thụ lý")).toHaveValue("16/TB-UBND");
  // A4: thẻ Khiếu nại, cưỡng chế ở Tổng quan dự án; xuất Excel
  await p.keyboard.press("Alt+3");
  const the = p.locator("[data-the-khieu-nai-du-an]");
  await expect(the.locator("[data-tk-khieu-nai]")).toContainText("2 đơn của 2 hộ");
  await the.getByRole("button", { name: "Xuất Excel" }).click();
  const xl = await tep(p, "Khieu-nai-cuong-che_");
  expect(xl.buf.byteLength).toBeGreaterThan(5000);
});

test("D3: mốc bàn giao đất trên thực địa — ghi tay, tạo T23 thì tự ghi", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  const the = p.locator("[data-the-ban-giao-thuc-dia]");
  await expect(the).toContainText("Chưa ghi");
  await the.getByRole("button", { name: "Ghi mốc" }).click();
  await ngay(p, "Ngày bàn giao", "15/10/2026", the);
  await the.getByLabel("Bên nhận bàn giao").fill("Ban QLDA thử");
  await the.getByLabel("Diện tích bàn giao").fill("1200,5");
  await the.getByRole("button", { name: "Lưu mốc" }).click();
  await expect(the.locator("[data-ds-ban-giao]")).toContainText("15/10/2026: bàn giao cho Ban QLDA thử, 1200,5 m²");
  await the.getByRole("button", { name: "Soạn biên bản (T23)" }).click();
  await expect(p.locator(".muc-mau.chon")).toContainText("T23");
  await ngay(p, "Ngày ký", "19/10/2026");
  await p.getByRole("button", { name: "Tạo văn bản cấp dự án (.docx)" }).click();
  await expect(p.getByText(/Đã ghi mốc bàn giao đất trên thực địa/)).toBeVisible();
  await p.keyboard.press("Alt+3");
  await expect(the.locator("[data-ds-ban-giao] li")).toHaveCount(2);
  await expect(the.locator("[data-ds-ban-giao] li").nth(1)).toContainText("19/10/2026: bàn giao cho");
});
