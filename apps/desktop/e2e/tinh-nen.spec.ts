/**
 * 1.0.7 — Lần mở đầu với dữ liệu lớn: Tổng quan hiện ngay, tính phương án các hộ chạy nền (thanh tiến độ), giao diện
 * vẫn bấm được; tính xong hiện đủ số liệu. Dữ liệu tổng hợp nhân bản từ hồ sơ mẫu ẩn danh (không dữ liệu thật).
 * GPMB_SO_HO_DO=20000 để đo thời gian (in ra), mặc định 6.000 hộ.
 */
import { expect, test, type Page } from "@playwright/test";

const SO_HO = Number(process.env.GPMB_SO_HO_DO ?? 6000);
test.setTimeout(240_000);

async function dangNhap(p: Page, moi: boolean) {
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  if (moi) {
    await o.nth(1).fill("Quản trị");
    await p.locator("input[type=password]").nth(0).fill("matkhau123");
    await p.locator("input[type=password]").nth(1).fill("matkhau123");
  } else await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.click("button[type=submit]");
}

test(`mở lần đầu ${SO_HO} hộ: tính nền có tiến độ, không đứng giao diện`, async ({ page: p }) => {
  const loi: string[] = [];
  p.on("pageerror", (e) => loi.push(e.message));
  await p.goto("/");
  await dangNhap(p, true);
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  // nhân bản hồ sơ mẫu trong IndexedDB
  await p.evaluate(async (n) => {
    const db = await new Promise<IDBDatabase>((ok, loi) => {
      const r = indexedDB.open("gpmb-sonla");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => loi(r.error);
    });
    const goc = await new Promise<Record<string, unknown>[]>((ok) => {
      const r = db.transaction("ho").objectStore("ho").getAll();
      r.onsuccess = () => ok(r.result as Record<string, unknown>[]);
    });
    const tx = db.transaction("ho", "readwrite");
    const st = tx.objectStore("ho");
    for (let i = goc.length; i < n; i++) {
      const h = goc[i % goc.length]!;
      st.put({ ...h, id: `nhan-ban-${i}`, ma: `NB${String(i).padStart(5, "0")}`, ten: `Hộ mẫu nhân bản ${i}` });
    }
    await new Promise((ok) => (tx.oncomplete = ok));
    db.close();
  }, SO_HO);
  await p.reload();
  const t0 = Date.now();
  await dangNhap(p, false);
  await expect(p.getByText("Tình trạng chung")).toBeVisible({ timeout: 60_000 });
  const tHien = Date.now() - t0;
  await expect(p.getByRole("status", { name: "Đang tính số liệu tổng hợp" })).toBeVisible();
  // trong lúc tính nền, giao diện vẫn phản hồi: mở hộp Dự án mới rồi đóng
  const tb = Date.now();
  await p.getByRole("button", { name: "Dự án mới" }).click();
  await expect(p.getByRole("dialog")).toBeVisible();
  const tBam = Date.now() - tb;
  await p.keyboard.press("Escape");
  // 1.0.7: mở màn dự án (Alt+3) trong lúc tính nền → cổng hiện tiến độ, tính xong tự mở màn
  await p.keyboard.press("Alt+3");
  await expect(p.getByRole("status", { name: "Đang tính số liệu tổng hợp" })).toBeVisible();
  await expect(p.getByText("Màn hình này cần kết quả tính của các hộ")).toBeVisible();
  await expect(p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" })).toBeVisible({ timeout: 180_000 });
  const tDuAn = Date.now() - t0;
  await p.keyboard.press("Alt+1");
  await expect(p.getByText(new RegExp(`Đang theo dõi 1 dự án với ${SO_HO.toLocaleString("vi-VN").replace(/\./g, "\\.?")} hồ sơ|Đang theo dõi 1 dự án với ${SO_HO} hồ sơ`))).toBeVisible({ timeout: 180_000 });
  const tXong = Date.now() - t0;
  await expect(p.getByRole("status", { name: "Đang tính số liệu tổng hợp" })).toHaveCount(0);
  console.log(`[đo] ${SO_HO} hộ: Tổng quan hiện sau ${tHien} ms; bấm "Dự án mới" phản hồi ${tBam} ms; màn dự án mở sau ${tDuAn} ms; tính xong sau ${tXong} ms`);
  expect(tBam).toBeLessThan(3000);
  expect(loi).toEqual([]);
});
