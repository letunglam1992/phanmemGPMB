/** 1.0.20: khiếu nại, cưỡng chế (B1, B2); chi trả, kinh phí (B3, B4); nhật ký sự cố (C2); dự án tập huấn (D2). */
import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

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

test("B1, B2: đơn khiếu nại — hạn thụ lý, giải quyết; cưỡng chế thu hồi — điều kiện, hạn, Tết", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await expect(p.locator("[data-khieu-nai]")).toContainText("chưa có đơn");
  await p.getByRole("button", { name: "+ Ghi đơn khiếu nại" }).click();
  const don = p.locator("[data-don]").first();
  await ngay(p, "Ngày nhận đơn", "01/09/2026", don);
  await expect(don.locator("[data-tt-don]")).toHaveText("Quá hạn thụ lý");
  await expect(don).toContainText("Hạn thụ lý 11/09/2026");
  await ngay(p, "Ngày thụ lý", "05/10/2026", don);
  await expect(don.locator("[data-tt-don]")).toHaveText("Đang giải quyết");
  await expect(don).toContainText("Hạn giải quyết 04/11/2026 (30 ngày, còn 16 ngày) — Điều 28 Luật Khiếu nại 2011");
  await don.getByLabel("Vùng sâu, vùng xa đi lại khó khăn").check();
  await expect(don).toContainText("Hạn giải quyết 19/11/2026 (45 ngày");
  await don.getByLabel("Nội dung đơn").fill("Không đồng ý đơn giá cây trồng");
  // cưỡng chế thu hồi: ngày dự kiến trong khoảng Tết, ngày nghỉ
  await p.getByRole("button", { name: "+ Cưỡng chế thu hồi đất" }).click();
  const cc = p.locator("[data-cc=THU_HOI]");
  await expect(cc.locator("[data-kiem-cc]")).toContainText("Hộ chưa có ngày quyết định thu hồi đất (bước 13)");
  await ngay(p, "Vận động đến ngày", "05/10/2026", cc);
  await expect(cc).toContainText("QĐ cưỡng chế sớm nhất 16/10/2026");
  await cc.getByLabel("Số QĐ cưỡng chế").fill("12/QĐ-UBND");
  await ngay(p, "Ngày QĐ cưỡng chế", "15/10/2026", cc);
  await expect(cc.locator("[data-kiem-cc]")).toContainText("chưa quá 10 ngày kể từ ngày kết thúc vận động");
  await ngay(p, "Ngày dự kiến cưỡng chế", "13/02/2027", cc);
  await expect(cc.locator("[data-kiem-cc]")).toContainText("ngày nghỉ");
  await expect(cc.locator("[data-kiem-cc]")).toContainText("nghỉ Tết Âm lịch");
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(p.locator('[role=tablist] button', { hasText: "Khiếu nại" }).locator(".dem")).toHaveText("2");
});

test("B3, B4: thẻ Chi trả, kinh phí — tổng hợp theo bản phê duyệt, kinh phí thiếu căn cứ / có căn cứ, Excel quyết toán", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Chốt phương án…" }).click();
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }).click();
  await expect(chot).toHaveCount(0);
  await p.getByRole("button", { name: "Phê duyệt…" }).first().click();
  await p.locator("[role=dialog]").getByRole("button", { name: "Ghi nhận phê duyệt" }).click();
  await p.locator("[role=tablist] button", { hasText: "Chi trả, kinh phí" }).click();
  const qt = p.locator("[data-quyet-toan]");
  await expect(qt).toContainText("Bản 1");
  await expect(qt).toContainText(/Phải trả \(\d+ hộ\)/);
  const kp = p.locator("[data-kinh-phi]");
  await kp.getByLabel("Tỷ lệ trích").fill("2");
  await expect(kp.locator("[data-muc-toi-da]")).toContainText("Thiếu căn cứ");
  await expect(kp.locator("[data-canh-bao-kp]").first()).toContainText("chưa ghi căn cứ");
  await kp.getByLabel("Căn cứ tỷ lệ").fill("Văn bản giả định để kiểm thử");
  await kp.getByLabel("Cơ sở tính").fill("100000000");
  await expect(kp.locator("[data-muc-toi-da]")).toHaveText("2.000.000 đ");
  await kp.getByLabel("Nội dung khoản dự toán").fill("Họp dân, niêm yết");
  await kp.getByLabel("Số tiền dự toán").fill("2500000");
  await kp.getByRole("button", { name: "Thêm khoản" }).click();
  await expect(kp.locator("[data-tong-du-toan]")).toHaveText("2.500.000 đ");
  await expect(kp.locator("[data-canh-bao-kp]")).toContainText("vượt mức theo tỷ lệ 2%");
  await kp.getByRole("button", { name: "Lưu kinh phí" }).click();
  await expect(kp.getByRole("button", { name: "Lưu kinh phí" })).toBeDisabled();
  await qt.getByRole("button", { name: "Xuất Excel quyết toán" }).click();
  const x = await tep(p, "Quyet-toan-chi-tra_");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(x.buf);
  expect(wb.worksheets.map((w) => w.name)).toEqual(["THEO DÕI CHI TRẢ", "QUYET TOAN CHI TRA", "KINH PHI TCTH"]);
  const chu: string[] = [];
  wb.getWorksheet("KINH PHI TCTH")!.eachRow((r) => r.eachCell((c) => void chu.push(String(c.value))));
  expect(chu.join("|")).toContain("Họp dân, niêm yết");
  expect(chu.join("|")).toContain("Văn bản giả định để kiểm thử");
});

test("C2, D2: dự án tập huấn tạo — có bản đồ, không gửi tỉnh, xóa sạch; nhật ký sự cố xuất được", async ({ page: p }) => {
  await vao(p, false);
  await p.getByRole("button", { name: "Dự án", exact: true }).click();
  await p.locator("[data-tao-tap-huan]").click();
  await expect(p.locator("[data-du-an-tap-huan]")).toBeVisible();
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await expect(p.locator("tr[data-ho-id]")).toHaveCount(6);
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await expect(p.getByText("Ban-do-tap-huan.dxf").first()).toBeVisible();
  // không có trong danh sách gửi tỉnh
  await p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" }).click();
  await expect(p.getByText("Dự án gửi (0/1):")).toBeVisible();
  // xóa sạch
  await p.getByRole("button", { name: "Hồ sơ", exact: true }).click();
  await p.locator("[data-xoa-tap-huan]").click();
  await expect(p.locator("[data-tao-tap-huan]")).toBeVisible();
  await expect(p.getByText("Chưa có dự án.")).toBeVisible();
  // nhật ký sự cố: ghi một lỗi thử rồi xuất
  await p.evaluate(() => localStorage.setItem("gpmb-nhat-ky-loi", JSON.stringify([{ luc: "2026-10-19T02:00:00.000Z", nguon: "GIAO_DIEN", thongDiep: "thẻ Thử: lỗi giả lập 012345678901", phienBan: "x" }])));
  await p.locator(".ben-phien-ban").click();
  const nk = p.locator("[data-nhat-ky-loi]");
  await expect(nk.locator("[data-so-loi]")).toHaveText("1");
  await nk.getByRole("button", { name: "Xuất nhật ký lỗi" }).click();
  const t = await tep(p, "Nhat-ky-su-co_");
  const s = t.buf.toString("utf8");
  expect(s).toContain("NHẬT KÝ SỰ CỐ");
  expect(s).toContain("lỗi giả lập 012345678901");
  await nk.getByRole("button", { name: "Xóa" }).click();
  await expect(nk.locator("[data-so-loi]")).toHaveText("0");
});

test("D1: tải hướng dẫn sử dụng (Word, có ảnh) ở màn Hướng dẫn", async ({ page: p }) => {
  await vao(p, false);
  await p.getByRole("button", { name: "Hướng dẫn sử dụng", exact: true }).click();
  await p.locator("[data-tai-huong-dan]").click();
  const t = await tep(p, "Huong-dan-su-dung-GPMB_");
  expect(t.buf.length).toBeGreaterThan(500_000);
  const PizZip = (await import("pizzip")).default;
  const z = new PizZip(t.buf);
  expect(z.file("word/document.xml")!.asText()).toContain("HƯỚNG DẪN SỬ DỤNG");
  expect(Object.keys(z.files).filter((k) => k.startsWith("word/media/")).length).toBeGreaterThanOrEqual(20);
});
