/** 1.3.2: gợi ý căn cứ bảng giá đất theo ngày ký (A1); kiểm tra phương án theo ngày phê duyệt dự kiến (A2). */
import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";

test.setTimeout(45_000);
test.use({ viewport: { width: 1536, height: 900 } });
const loiTrang: string[] = [];
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.clock.setFixedTime(new Date("2026-10-29T09:00:00+07:00"));
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
async function ngay(p: Page, nhan: string, gt: string) {
  const o = p.getByLabel(nhan, { exact: true }).first();
  await o.fill(gt);
  await o.press("Tab");
}

test("A1: Mẫu 14 ký từ 01/11/2026 → gợi ý căn cứ NQ 152 sửa đổi bởi NQ 28; bấm mới thêm", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^14/ }).click();
  const goiY = p.locator("[data-goi-y-can-cu-gia]");
  await ngay(p, "Ngày ký", "30/10/2026");
  await expect(goiY).toContainText("Nghị quyết số 152/2025/NQ-HĐND ngày 29/12/2025");
  await expect(goiY).not.toContainText("28/2026/NQ-HĐND ngày 19/10/2026");
  await ngay(p, "Ngày ký", "05/11/2026");
  await expect(goiY).toContainText("được sửa đổi, bổ sung bởi Nghị quyết số 28/2026/NQ-HĐND ngày 19/10/2026");
  await goiY.getByRole("button", { name: "Thêm vào căn cứ riêng của dự án" }).click();
  await expect(goiY).toHaveCount(0);
  await p.getByRole("button", { name: /Sửa thông tin chung của dự án/ }).click();
  await expect(p.getByLabel(/^In căn cứ: Căn cứ Nghị quyết số 152\/2025\/NQ-HĐND/)).toBeChecked();
  // Mẫu không dẫn giá đất: không gợi ý
  await p.locator(".muc-mau", { hasText: /^12/ }).first().click();
  await expect(goiY).toHaveCount(0);
});

test("A2: kiểm tra phương án — tuyến đã bãi bỏ, duyệt từ 01/11/2026 → cảnh báo", async ({ page: p }) => {
  const bang = JSON.parse(readFileSync(new URL("../../../policy/nguon/nq152-2025-bang-gia-dat.json", import.meta.url), "utf8")) as { dat_o: { xa: string; stt: string; tuyen: string; vt: (number | null)[] }[] };
  const sua = JSON.parse(readFileSync(new URL("../../../policy/nguon/nq28-2026-sua-bang-gia-dat.json", import.meta.url), "utf8")) as { bai_bo: { xa: string; khop: { "05"?: { stt: string; tuyen: string } } }[]; bo_sung: { dat_o: { xa: string; vt: (number | null)[] }[] } };
  const tatCa = (xa: string) => [...bang.dat_o, ...sua.bo_sung.dat_o].filter((r) => r.xa === xa).flatMap((r) => r.vt);
  const bo = sua.bai_bo.flatMap((x) => { const k = x.khop["05"]; const r = k && bang.dat_o.find((y) => y.xa === x.xa && y.stt === k.stt && y.tuyen === k.tuyen); return r && r.vt[0] != null && tatCa(r.xa).filter((g) => g === r.vt[0]).length === 1 ? [r] : []; })[0]!;
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("PA").addRows([
    ["STT", "Nội dung", "Đơn vị tính", "Khối lượng", "Đơn giá (đồng)", "Tỷ lệ (%)", "Thành tiền (đồng)", "Căn cứ"],
    [1, `Đất ${bo.xa.startsWith("Phường") ? "ODT" : "ONT"} thửa 1`, "m²", 10, bo.vt[0]! * 1000, 100, bo.vt[0]! * 10000, null],
  ]);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  await vao(p);
  await p.getByRole("button", { name: "Kiểm tra phương án" }).first().click();
  await p.locator("input[type=file]").setInputFiles({ name: "pa-thu.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: buf });
  await p.locator(".o-nhap", { has: p.locator("label", { hasText: "Xã/phường có đất thu hồi" }) }).locator("select").selectOption(bo.xa);
  const khong = p.getByText("Không có dòng nào có lỗi hoặc cảnh báo.");
  await expect(khong).toBeVisible();
  await ngay(p, "Ngày phê duyệt phương án dự kiến", "10/11/2026");
  await expect(p.getByText(/trùng tuyến đã bãi bỏ từ 01\/11\/2026/).first()).toBeVisible();
  await ngay(p, "Ngày phê duyệt phương án dự kiến", "20/10/2026");
  await expect(khong).toBeVisible();
});
