/** 1.0.21: thụ lý khiếu nại theo ngày làm việc (NĐ 124/2020, NĐ 155/2026); mẫu T14–T17 (B2); ổn định đời sống — trường hợp áp dụng (B4). */
import { expect, test, type Page } from "@playwright/test";

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
async function moHo(p: Page) {
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}

test("V2, B2: hạn thụ lý 07 ngày làm việc; nút soạn T14–T17 trong thẻ Khiếu nại; Tạo nhanh T14, T15 tự điền", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await p.getByRole("button", { name: "+ Ghi đơn khiếu nại" }).click();
  const don = p.locator("[data-don]").first();
  await ngay(p, "Ngày nhận đơn", "09/10/2026", don);
  // thứ Sáu 09/10/2026 + 07 ngày làm việc (12–16, 19, 20/10) = thứ Ba 20/10/2026
  await expect(don).toContainText("Hạn thụ lý 20/10/2026 (7 ngày làm việc, còn 1 ngày) — k1 Điều 16 NĐ 124/2020/NĐ-CP (sửa bởi Điều 10 NĐ 155/2026/NĐ-CP)");
  await don.getByLabel("Nội dung đơn").fill("Không đồng ý đơn giá cây trồng (thử)");
  await p.getByRole("button", { name: "+ Cưỡng chế thu hồi đất" }).click();
  const cc = p.locator("[data-cc=THU_HOI]");
  await ngay(p, "Vận động từ ngày", "01/10/2026", cc);
  await ngay(p, "Vận động đến ngày", "10/10/2026", cc);
  await cc.getByLabel("Số QĐ cưỡng chế").fill("12/QĐ-UBND");
  await expect(cc.getByRole("button", { name: "Biên bản vận động (T15)" })).toBeVisible();
  await expect(cc.getByRole("button", { name: "QĐ thành lập Ban (T16)" })).toBeVisible();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await don.locator("[data-soan-t14]").click();
  await expect(p.getByRole("heading", { name: /Quyết định giải quyết khiếu nại \(lần đầu\)/ })).toBeVisible();
  await p.getByText("Tạo nhanh các mẫu của hộ theo bước").click();
  const PizZip = (await import("pizzip")).default;
  const chu = (b: Buffer) => new PizZip(b).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
  await p.locator("tr", { hasText: "Quyết định giải quyết khiếu nại (lần đầu)" }).getByRole("button", { name: "Tạo nhanh (.docx)" }).click();
  const t14 = chu((await tep(p, "Mau-T14")).buf);
  expect(t14).toContain("Không đồng ý đơn giá cây trồng (thử)");
  expect(t14).toContain("Nghị định số 155/2026/NĐ-CP");
  expect(t14).toContain("Trong thời hạn 30 ngày");
  await p.locator("tr", { hasText: "Biên bản vận động, thuyết phục bàn giao đất" }).getByRole("button", { name: "Tạo nhanh (.docx)" }).click();
  expect(chu((await tep(p, "Mau-T15")).buf)).toContain("từ ngày 01/10/2026 đến ngày 10/10/2026");
});

test("B4: ổn định đời sống — chọn trường hợp nhận giao khoán (k2 Điều 12 PL II), gợi ý điểm b k1 Đ19", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator("[role=tablist] button", { hasText: "Hỗ trợ" }).first().click();
  const od = p.locator(".the", { has: p.getByRole("heading", { name: "Hỗ trợ ổn định đời sống" }) });
  if (!(await od.getByLabel("Áp dụng").isChecked())) await od.getByLabel("Áp dụng").check();
  await od.locator("input.o-so").first().fill("1000");
  await p.getByLabel("Trường hợp ổn định đời sống").selectOption("GIAO_KHOAN");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  // dữ liệu mẫu chưa có giá gạo → dòng C01 "Thiếu căn cứ"; số tiền, căn cứ của từng trường hợp kiểm ở phu-luc-ii.test.ts
  await expect(p.getByText(/không cộng dồn DT đã thu hồi của dự án trước \(điểm b k1 Đ19/).first()).toBeAttached();
  await p.locator("[role=tablist] button", { hasText: "Tính toán, giải trình" }).click();
  await p.locator("[role=tablist] button", { hasText: "Hỗ trợ" }).first().click();
  await expect(p.getByLabel("Trường hợp ổn định đời sống")).toHaveValue("GIAO_KHOAN");
});

test("A1, A2, A3: tạm đình chỉ không tính vào hạn; nút T18–T22; ngày gửi QĐ", async ({ page: p }) => {
  await vao(p);
  await moHo(p);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await p.getByRole("button", { name: "+ Ghi đơn khiếu nại" }).click();
  const don = p.locator("[data-don]").first();
  await ngay(p, "Ngày nhận đơn", "01/10/2026", don);
  await ngay(p, "Ngày thụ lý", "05/10/2026", don);
  await expect(don).toContainText("Hạn giải quyết 04/11/2026 (30 ngày");
  await don.getByRole("button", { name: "+ Tạm đình chỉ" }).click();
  const tdc = don.locator("[data-tam-dinh-chi]");
  await ngay(p, "Ngày QĐ tạm đình chỉ", "10/10/2026", tdc);
  await tdc.getByLabel("Lý do tạm đình chỉ").fill("Người khiếu nại ốm (thử)");
  await expect(don.locator("[data-tt-don]")).toHaveText("Tạm đình chỉ");
  await ngay(p, "Ngày QĐ tiếp tục giải quyết", "20/10/2026", tdc);
  // 30 + 10 ngày tạm đình chỉ = 14/11/2026 (thứ Bảy) → 16/11/2026
  await expect(don).toContainText("Hạn giải quyết 16/11/2026 (30 ngày");
  await expect(don).toContainText("k4 Điều 11a");
  for (const n of ["TB thụ lý (T18)", "TB không thụ lý (T19)", "BB đối thoại (T20)", "QĐ tạm đình chỉ / đình chỉ (T21)", "QĐ tiếp tục giải quyết (T22)"]) await expect(don.getByRole("button", { name: n })).toBeVisible();
  await don.getByLabel("Kết quả giải quyết").selectOption("SAI");
  await expect(don.getByLabel("Ngày gửi QĐ giải quyết")).toBeVisible();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await don.getByRole("button", { name: "QĐ tiếp tục giải quyết (T22)" }).click();
  await expect(p.getByRole("heading", { name: /Quyết định tiếp tục giải quyết khiếu nại/ })).toBeVisible();
});
