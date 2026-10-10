/**
 * Kịch bản giao diện 0.9.8 (docs/08 §9.6–9.10): ghi chú hiện trường, điểm đo hiện trạng, bắt điểm nâng cao và lưu kết quả
 * đo, so sánh hai bản đồ, ghép nhiều tệp DGN.
 */
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
function banDo(soTo = "7", x0 = 500000, rong = [20, 20, 20, 20]) {
  const v = new VietDgn(1000, 1, [0, 0]);
  let x = x0;
  for (let i = 0; i < rong.length; i++) {
    const w = rong[i]!;
    v.duongGap({ lop: 10 }, [[x, 1350000], [x + w, 1350000], [x + w, 1350020], [x, 1350020], [x, 1350000]], 6)
      .chu({ lop: 4 }, [x + 5, 1350008], String(i + 1))
      .chu({ lop: 5 }, [x + 5, 1350004], soTo)
      .chu({ lop: 13 }, [x + w / 2, 1350012], "ONT")
      .chu({ lop: 6 }, [x + 3, 1350016], `Chu ${soTo}-${i + 1}`);
    x += w;
  }
  return Buffer.from(v.xuat());
}

test("ghi chú hiện trường, điểm đo, bắt điểm và lưu kết quả đo, so sánh bản đồ, nhiều tờ bản đồ", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
  await p.getByRole("button", { name: "Thu gọn bảng lớp" }).click();
  const cv = p.locator(".ban-do canvas");
  /** Bấm trên bản đồ theo tỷ lệ khung (cuộn bản đồ vào tầm nhìn trước, vì cột phải dài làm trang cuộn) */
  const bam = async (fx: number, fy: number, o: { button?: "right" } = {}) => {
    await cv.evaluate((e) => e.scrollIntoView({ block: "start" }));
    const b = (await cv.boundingBox())!;
    await p.mouse.click(b.x + b.width * fx, b.y + b.height * fy, o);
  };

  // Ghi chú hiện trường: nút + Ghi chú → bấm vị trí → nhóm, nội dung → danh sách; đánh dấu đã xử lý
  const gc = p.getByLabel("Danh sách ghi chú hiện trường");
  await gc.getByRole("button", { name: "+ Ghi chú" }).click();
  await bam(0.3, 0.5);
  const hop = p.locator(".hop-thoai");
  await hop.getByLabel("Nhóm ghi chú").selectOption("MO");
  await hop.getByLabel("Nội dung ghi chú").fill("02 mộ đất chưa kiểm đếm");
  await hop.getByRole("button", { name: "Lưu ghi chú" }).click();
  await expect(gc).toContainText("Mồ mả: 02 mộ đất chưa kiểm đếm");
  await gc.getByRole("button", { name: "Đã xử lý" }).click();
  await expect(gc).toContainText("Chưa có ghi chú chưa xử lý");

  // Đo khoảng cách có bắt trung điểm → lưu kết quả đo → xuất CSV
  await p.getByLabel("Kiểu bắt điểm").click();
  await p.getByRole("checkbox", { name: "Trung điểm" }).check();
  await p.getByRole("button", { name: "Đo khoảng cách" }).click();
  await bam(0.45, 0.5);
  await bam(0.6, 0.5);
  await bam(0.6, 0.5, { button: "right" });
  await p.getByRole("button", { name: "Lưu kết quả đo" }).click();
  const kq = p.getByLabel("Kết quả đo đã lưu");
  await expect(kq).toContainText("Khoảng cách 1");
  await kq.getByRole("button", { name: "Xuất CSV tọa độ" }).click();
  await expect.poll(() => p.evaluate(() => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).some((k) => k.startsWith("Ket-qua-do_")))).toBe(true);
  const teps = await p.evaluate(() => (window as unknown as { __tep: Record<string, string> }).__tep);
  const csv = Buffer.from(teps[Object.keys(teps).find((k) => k.startsWith("Ket-qua-do_"))!]!, "base64").toString("utf8");
  expect(csv).toMatch(/Khoảng cách 1;Chieu dai \(m\);[\d,]+;1;1350\d{3},\d{3};5000\d{2},\d{3}/);

  // Điểm đo hiện trạng: bảng CSV (X = Bắc) → 2 điểm, thửa chứa điểm
  await p.getByLabel("Tệp điểm đo").setInputFiles({ name: "diem.csv", mimeType: "text/csv", buffer: Buffer.from("Tên điểm;X;Y;Mô tả\nP1;1350010;500030;Góc nhà\nP2;1350010;500070;Cột điện\n") });
  const dd = p.getByLabel("Điểm đo hiện trạng");
  await expect(dd).toContainText("2 điểm");
  await expect(dd).toContainText("Góc nhà · thửa 7-2");
  await expect(dd).toContainText("Cột điện · thửa 7-4");

  // So sánh: bản mới thửa 2 rộng 25 m, thửa 3 rộng 15 m
  await p.getByRole("button", { name: "So sánh bản đồ…" }).click();
  await p.getByLabel("Tệp bản đồ bản mới").setInputFiles({ name: "moi.dgn", mimeType: "application/octet-stream", buffer: banDo("7", 500000, [20, 25, 15, 20]) });
  const bss = p.getByLabel("Kết quả so sánh");
  await expect(bss.locator("tr", { hasText: "7-2" })).toContainText("Đổi diện tích");
  await expect(bss.locator("tr", { hasText: "7-3" })).toContainText("-100,00");
  await expect(bss.locator("tr", { hasText: "7-1" })).toHaveCount(0);
  await p.locator(".hop-thoai").getByRole("button", { name: "Hiện trên bản đồ" }).click();
  await expect(p.getByLabel("Kết quả so sánh bản đồ")).toContainText("2 thửa thay đổi");

  // Thêm tờ 8 (tệp tờ 8 nhắc tới tệp to9.dgn chưa nạp) → bảng thửa có thêm 2 thửa của tờ 8
  await p.getByRole("button", { name: /^Tờ bản đồ/ }).click();
  const to8 = Buffer.concat([banDo("8", 500200, [20, 20]), Buffer.from("\0\0REF C:\\DiaChinh\\to9.dgn\0\0")]);
  await p.getByLabel("Tệp DGN ghép thêm").setInputFiles({ name: "to8.dgn", mimeType: "application/octet-stream", buffer: to8 });
  const hopTo = p.locator(".hop-thoai");
  await expect(hopTo.getByLabel("Danh sách tờ bản đồ")).toContainText("to8.dgn");
  await expect(hopTo.getByLabel("Số tờ đọc được")).toContainText("Tờ 7 · 4 thửa");
  await expect(hopTo.getByLabel("Số tờ đọc được")).toContainText("Tờ 8 · 2 thửa");
  await expect(hopTo.getByRole("status")).toContainText("to9.dgn (trong to8.dgn)");
  await p.locator(".hop-thoai .chan-hop").getByRole("button", { name: "Đóng" }).click();
  await expect(p.getByRole("button", { name: "Tờ bản đồ (2/2)…" })).toBeVisible();
  await expect(p.getByText(/Bản đồ nhắc tới tệp chưa nạp.*to9\.dgn/)).toBeVisible();
  await p.locator(".the.gian select").selectOption("TAT_CA");
  await expect(p.locator(".the.gian tbody tr")).toHaveCount(6);
  await expect(p.locator(".the.gian tbody tr", { hasText: "8-2" })).toBeVisible();
  // Chọn tờ: tắt tờ 8 → còn 4 thửa; "Chỉ tờ này" ở tờ 8 → còn 2 thửa; dùng tất cả → 6
  await p.getByRole("button", { name: /^Tờ bản đồ/ }).click();
  await hopTo.getByLabel("Dùng tờ to8.dgn").click();
  await expect(hopTo.getByLabel("Dùng tờ to8.dgn")).not.toBeChecked();
  await expect(hopTo.getByLabel("Số tờ đọc được")).not.toContainText("Tờ 8");
  await p.locator(".hop-thoai .chan-hop").getByRole("button", { name: "Đóng" }).click();
  await expect(p.getByRole("button", { name: "Tờ bản đồ (1/2)…" })).toBeVisible();
  await p.locator(".the.gian select").selectOption("TAT_CA");
  await expect(p.locator(".the.gian tbody tr")).toHaveCount(4);
  await p.getByRole("button", { name: /^Tờ bản đồ/ }).click();
  await hopTo.getByLabel("Dùng tờ to8.dgn").click();
  await expect(hopTo.getByLabel("Dùng tờ to8.dgn")).toBeChecked();
  await hopTo.locator("tr", { hasText: "to8.dgn" }).getByRole("button", { name: "Chỉ tờ này" }).click();
  await expect(hopTo.getByLabel("Dùng tờ thu.dgn")).not.toBeChecked();
  await expect(hopTo.getByLabel("Số tờ đọc được")).toContainText("Tờ 8 · 2 thửa");
  await expect(hopTo.getByLabel("Số tờ đọc được")).not.toContainText("Tờ 7");
  // tắt nốt tờ cuối cùng → không cho
  await hopTo.getByLabel("Dùng tờ to8.dgn").click();
  await expect(p.getByText("Cần bật ít nhất một tờ bản đồ")).toBeVisible();
  await expect(hopTo.getByLabel("Dùng tờ to8.dgn")).toBeChecked();
  await hopTo.getByRole("button", { name: "Dùng tất cả các tờ" }).click();
  await expect(hopTo.getByLabel("Số tờ đọc được")).toContainText("Tờ 7 · 4 thửa");
  await hopTo.getByLabel("Số tờ đọc được").getByRole("button", { name: /Tờ 8/ }).click();
  await expect(p.locator(".hop-thoai")).toHaveCount(0);
  await p.locator(".the.gian select").selectOption("TAT_CA");
  await expect(p.locator(".the.gian tbody tr")).toHaveCount(6);
  await p.screenshot({ path: "test-results/ban-do-lop-phu.png" });
});

test("1.0.7 — điểm đo gắn tài sản kiểm đếm: đúng thửa → vị trí thực địa; tài sản ở thửa khác → cảnh báo đối chiếu biên bản", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "thu.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("thu.dgn ·")).toBeVisible();
  // Gắn thửa hồ sơ H01 với thửa bản đồ 7-2, 7-3 và đặt 2 tài sản kiểm đếm vào hai thửa đó (ghi thẳng CSDL trình duyệt)
  const ten = await p.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open("gpmb-sonla"); r.onsuccess = () => ok(r.result); });
    const ds = await new Promise<Record<string, any>[]>((ok) => { const r = db.transaction("ho").objectStore("ho").getAll(); r.onsuccess = () => ok(r.result); });
    const h = ds.sort((a, b) => String(a.ma).localeCompare(String(b.ma)))[0]!;
    if (h.thua.length < 2) h.thua.push({ ...h.thua[0], id: "thua-them", soThua: "999" });
    h.thua[0].maBanDo = "T7-2";
    h.thua[1].maBanDo = "T7-3";
    while (h.taiSan.length < 2) h.taiSan.push({ ...h.taiSan[0], id: `ts-${h.taiSan.length}` });
    h.taiSan[0].ten = "Nhà thử A";
    h.taiSan[0].thuaId = h.thua[0].id;
    h.taiSan[1].ten = "Nhà thử B";
    h.taiSan[1].thuaId = h.thua[1].id;
    const tx = db.transaction("ho", "readwrite");
    tx.objectStore("ho").put(h);
    await new Promise((ok) => (tx.oncomplete = ok));
    db.close();
    return h.ma as string;
  });
  await p.reload();
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.click("button[type=submit]");
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  const hop = p.getByRole("button", { name: "Để sau" });
  if (await hop.isVisible().catch(() => false)) await hop.click();
  await p.getByLabel("Tệp điểm đo").setInputFiles({ name: "diem.csv", mimeType: "text/csv", buffer: Buffer.from("Tên điểm;X;Y;Mô tả\nP1;1350010;500030;Góc nhà\n") });
  const dd = p.getByLabel("Điểm đo hiện trạng");
  await expect(dd).toContainText(`Góc nhà · thửa 7-2 · ${ten}`);
  const chon = dd.getByLabel("Tài sản của điểm P1");
  await chon.selectOption({ label: await chon.locator("option", { hasText: "Nhà thử A" }).textContent() ?? "" });
  await expect(dd).toContainText("Vị trí thực địa của tài sản “Nhà thử A”");
  await chon.selectOption({ label: await chon.locator("option", { hasText: "Nhà thử B" }).textContent() ?? "" });
  await expect(dd).toContainText("Điểm đo nằm ngoài thửa của tài sản “Nhà thử B”");
  await expect(dd).toContainText("đối chiếu biên bản kiểm đếm");
});
