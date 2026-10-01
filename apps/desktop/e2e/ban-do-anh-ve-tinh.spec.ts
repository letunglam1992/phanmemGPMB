/**
 * Kịch bản giao diện 0.9.9: lớp ảnh vệ tinh trực tuyến dưới bản đồ VN-2000. Máy chủ ảnh được giả lập (route) — kiểm tra
 * ô ảnh vẽ lên bản đồ, chỉ gửi số hiệu ô z/x/y, mặc định tắt, đổi kinh tuyến trục thì đổi ô, tắt thì không tải nữa.
 */
import { expect, test, type Page } from "@playwright/test";
import zlib from "node:zlib";
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

/** PNG một màu w × h (RGB). */
function png(w: number, h: number, mau: [number, number, number]) {
  const bang = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = bang[(c ^ x) & 255]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const khoi = (loai: string, du: Buffer) => {
    const l = Buffer.alloc(4);
    l.writeUInt32BE(du.length);
    const t = Buffer.concat([Buffer.from(loai), du]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(t));
    return Buffer.concat([l, t, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const tho = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tho.set(mau, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), khoi("IHDR", ihdr), khoi("IDAT", zlib.deflateSync(tho)), khoi("IEND", Buffer.alloc(0))]);
}

function banDo() {
  // 4 thửa 20 × 20 m quanh tọa độ VN-2000 khu vực Sơn La (Đông 500 000, Bắc 2 350 000)
  const v = new VietDgn(100, 1, [0, 0]);
  for (let i = 0; i < 4; i++) {
    const x = 500000 + i * 20;
    v.duongGap({ lop: 10 }, [[x, 2350000], [x + 20, 2350000], [x + 20, 2350020], [x, 2350020], [x, 2350000]], 6)
      .chu({ lop: 4 }, [x + 5, 2350008], String(i + 1))
      .chu({ lop: 5 }, [x + 5, 2350004], "3")
      .chu({ lop: 13 }, [x + 10, 2350012], "LUC");
  }
  return Buffer.from(v.xuat());
}

/** Màu điểm ảnh tại (fx, fy) của khung bản đồ — chụp màn hình rồi đọc trong trang (ảnh data: không làm bẩn canvas). */
async function mauTai(p: Page, fx: number, fy: number) {
  const cv = p.locator(".ban-do canvas");
  const b = (await cv.boundingBox())!;
  const anh = await p.screenshot({ clip: { x: b.x + b.width * fx, y: b.y + b.height * fy, width: 2, height: 2 } });
  return p.evaluate(async (s) => {
    const img = new Image();
    img.src = `data:image/png;base64,${s}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, anh.toString("base64"));
}

const loiTrang: string[] = [];
test.setTimeout(90_000);
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
});
test.afterEach(() => expect(loiTrang).toEqual([]));

test("ảnh vệ tinh: mặc định tắt, hỏi đồng ý, vẽ ô ảnh dưới thửa, chỉ gửi z/x/y, đổi kinh tuyến trục, tắt", async ({ page: p }) => {
  const ngoai: string[] = [];
  p.on("request", (r) => {
    if (!r.url().startsWith("http://localhost")) ngoai.push(r.url());
  });
  await p.route("https://server.arcgisonline.com/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png(256, 256, [20, 160, 60]) }));
  const hoi: string[] = [];
  p.on("dialog", (d) => {
    hoi.push(d.message());
    void d.accept();
  });
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.DGN"]').first().setInputFiles({ name: "anh.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("anh.dgn ·")).toBeVisible();
  await p.locator(".ban-do canvas").evaluate((e) => e.scrollIntoView({ block: "start" }));
  // mặc định tắt: không có yêu cầu ra ngoài, nền sáng
  await expect(p.getByLabel("Ảnh vệ tinh", { exact: true })).not.toBeChecked();
  await p.waitForTimeout(300);
  expect(ngoai).toEqual([]);
  expect(await mauTai(p, 0.5, 0.15)).toEqual([251, 252, 251]);

  await p.getByLabel("Ảnh vệ tinh", { exact: true }).check();
  expect(hoi[0]).toContain("Chỉ gửi số hiệu ô ảnh");
  expect(hoi[0]).toContain("server.arcgisonline.com");
  await expect(p.getByRole("status", { name: "Ghi nguồn ảnh nền" })).toContainText(/Ảnh: Esri.*mức 1\d/);
  await expect.poll(() => ngoai.length).toBeGreaterThan(0);
  // chỉ số hiệu ô, không tham số khác
  for (const u of ngoai) expect(u).toMatch(/^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/\d+\/\d+\/\d+$/);
  await p.getByRole("button", { name: "Thu gọn bảng lớp" }).click();
  await expect.poll(() => mauTai(p, 0.5, 0.15)).toEqual([20, 160, 60]);
  // vùng thửa vẫn có nét thửa vẽ trên ảnh (màu vàng) — tâm thửa 1 vẫn là ảnh
  await p.screenshot({ path: "test-results/ban-do-anh-ve-tinh.png" });

  // ô ở kinh tuyến trục 104°: x của ô quanh 104° kinh Đông
  const xO = (ds: string[]) => [...new Set(ds.map((u) => Number(/\/tile\/\d+\/\d+\/(\d+)$/.exec(u)![1])))];
  const z = Number(/\/tile\/(\d+)\//.exec(ngoai[0]!)![1]);
  const lon = (x: number) => (x / 2 ** z) * 360 - 180;
  expect(xO(ngoai).every((x) => Math.abs(lon(x) - 104) < 0.05)).toBe(true);
  // đổi kinh tuyến trục 105°45′ → ô quanh 105,75°
  await p.getByRole("button", { name: "Mở bảng lớp" }).click();
  await p.getByRole("button", { name: "Cài đặt ảnh vệ tinh" }).click();
  const truoc = ngoai.length;
  await p.getByLabel("Kinh tuyến trục").fill("105°45'");
  await expect.poll(() => ngoai.slice(truoc).some((u) => Math.abs(lon(Number(/\/(\d+)$/.exec(u)![1])) - 105.75) < 0.05)).toBe(true);
  await expect(p.getByLabel("Kinh tuyến trục")).toHaveValue("105°45'");
  await p.getByLabel("Kinh tuyến trục").blur();
  await expect(p.getByLabel("Kinh tuyến trục")).toHaveValue("105°45′");
  // URL tùy chỉnh sai → báo, không tải
  await p.getByLabel("Chọn nguồn ảnh nền").selectOption("TUY_CHINH");
  await p.getByLabel("URL ô ảnh").fill("http://khong-an-toan/{z}/{x}/{y}");
  await expect(p.getByRole("status", { name: "Ghi nguồn ảnh nền" })).toContainText("URL chưa hợp lệ");
  await p.getByLabel("Chọn nguồn ảnh nền").selectOption("ESRI");
  // tắt: không tải thêm, nền sáng lại; lần bật sau không hỏi lại
  await p.getByLabel("Ảnh vệ tinh", { exact: true }).uncheck();
  await p.getByRole("button", { name: "Thu gọn bảng lớp" }).click();
  await p.waitForTimeout(300);
  const sau = ngoai.length;
  const b = (await p.locator(".ban-do canvas").boundingBox())!;
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.wheel(0, -200);
  await p.waitForTimeout(300);
  expect(ngoai.length).toBe(sau);
  expect(await mauTai(p, 0.5, 0.15)).toEqual([251, 252, 251]);
  expect(hoi).toHaveLength(1);
});
