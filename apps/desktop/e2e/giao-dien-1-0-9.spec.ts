/**
 * Kịch bản giao diện 1.0.9: (1) xuất PDF bản đồ tiến độ có nền ảnh vệ tinh (máy chủ ảnh giả lập, có CORS) — PDF nhúng ảnh
 * JPEG, ghi nguồn ảnh; (2) bấm ra ngoài / Esc đóng ô Tệp đã xuất, Thông báo; (3) chuột phải trên bản đồ khi đang dùng công
 * cụ: kết thúc phép đo, lần nữa thoát lệnh về Chọn, không mở menu chuột phải chung.
 */
import { expect, test, type Page } from "@playwright/test";
import zlib from "node:zlib";
import { writeFileSync } from "node:fs";
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

const loiTrang: string[] = [];
test.setTimeout(90_000);
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => void d.accept());
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

async function moBanDo(p: Page) {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "anh.dgn", mimeType: "application/octet-stream", buffer: banDo() });
  await expect(p.getByText("anh.dgn ·")).toBeVisible();
  await p.getByRole("button", { name: "Để sau" }).click();
}

test("PDF bản đồ tiến độ có nền ảnh vệ tinh: nhúng JPEG, ghi nguồn ảnh; chưa bật ảnh trên bản đồ thì nhắc", async ({ page: p }) => {
  await p.route("https://server.arcgisonline.com/**", (r) => r.fulfill({ status: 200, contentType: "image/png", headers: { "Access-Control-Allow-Origin": "*" }, body: png(256, 256, [20, 160, 60]) }));
  await moBanDo(p);
  await p.getByLabel("Khổ giấy PDF").selectOption("A4");
  await p.getByLabel("Nền ảnh vệ tinh khi xuất PDF").check();
  // chưa bật ảnh vệ tinh trên bản đồ → nhắc, không xuất
  await p.getByRole("button", { name: "Xuất PDF tiến độ" }).click();
  await expect(p.getByText(/Bật “Ảnh vệ tinh \(trực tuyến\)” trên bản đồ/)).toBeVisible();
  await p.getByLabel("Ảnh vệ tinh", { exact: true }).check();
  await p.getByRole("button", { name: "Xuất PDF tiến độ" }).click();
  await expect(p.getByText("Đã xuất PDF bản đồ tiến độ")).toBeVisible({ timeout: 30_000 });
  const teps = await p.evaluate(() => (window as unknown as { __tep: Record<string, string> }).__tep);
  const ten = Object.keys(teps).find((k) => k.endsWith("_A4_ve-tinh.pdf"))!;
  expect(ten).toBeTruthy();
  writeFileSync("test-results/ban-do-tien-do-ve-tinh.pdf", Buffer.from(teps[ten]!, "base64"));
  const pdf = Buffer.from(teps[ten]!, "base64").toString("latin1");
  expect(pdf).toContain("/Subtype /Image");
  expect(pdf).toContain("/DCTDecode");
  expect(pdf).toContain("/XObject << /Im0");
  expect(pdf).toContain("/FontFile2"); // vẫn là PDF vector, chữ thật
});

test("bấm ra ngoài, Esc đóng ô Tệp đã xuất và Thông báo; mở ô này thì ô kia đóng", async ({ page: p }) => {
  await vao(p);
  const tep = p.getByRole("button", { name: "Tệp đã xuất", exact: true });
  const chuong = p.getByRole("button", { name: "Thông báo", exact: true });
  await tep.click();
  await expect(p.getByRole("menu", { name: "Danh sách tệp đã xuất" })).toBeVisible();
  await p.locator("main").click({ position: { x: 20, y: 20 } });
  await expect(p.getByRole("menu", { name: "Danh sách tệp đã xuất" })).toBeHidden();
  await chuong.click();
  await expect(p.locator(".menu-chuong", { hasText: "Thông báo ·" })).toBeVisible();
  await p.locator("main").click({ position: { x: 20, y: 20 } });
  await expect(p.locator(".menu-chuong", { hasText: "Thông báo ·" })).toBeHidden();
  // mở Tệp đã xuất rồi bấm chuông: chỉ còn ô Thông báo
  await tep.click();
  await chuong.click();
  await expect(p.getByRole("menu", { name: "Danh sách tệp đã xuất" })).toBeHidden();
  await expect(p.locator(".menu-chuong", { hasText: "Thông báo ·" })).toBeVisible();
  await p.keyboard.press("Escape");
  await expect(p.locator(".menu-chuong", { hasText: "Thông báo ·" })).toBeHidden();
});

test("chuột phải khi đang đo: kết thúc phép đo, lần nữa về công cụ Chọn; không mở menu chuột phải chung", async ({ page: p }) => {
  await moBanDo(p);
  const cv = p.locator(".ban-do canvas");
  await cv.evaluate((e) => e.scrollIntoView({ block: "start" }));
  await p.getByRole("button", { name: "Thu gọn bảng lớp" }).click();
  await p.getByRole("button", { name: "Đo khoảng cách" }).click();
  await expect(cv).toHaveAttribute("data-cong-cu", "DO_DAI");
  const b = (await cv.boundingBox())!;
  await p.mouse.click(b.x + b.width * 0.4, b.y + b.height * 0.5);
  await p.mouse.click(b.x + b.width * 0.6, b.y + b.height * 0.5);
  await p.mouse.click(b.x + b.width * 0.6, b.y + b.height * 0.6, { button: "right" });
  await expect(p.getByText(/Đã kết thúc — bấm để đo lại/)).toBeVisible();
  await expect(p.locator(".menu-chuot-phai")).toHaveCount(0);
  await expect(cv).toHaveAttribute("data-cong-cu", "DO_DAI");
  await p.mouse.click(b.x + b.width * 0.6, b.y + b.height * 0.6, { button: "right" });
  await expect(cv).toHaveAttribute("data-cong-cu", "CHON");
  await expect(p.locator(".menu-chuot-phai")).toHaveCount(0);
  // công cụ Chọn: chuột phải vẫn mở menu chung như cũ
  await p.mouse.click(b.x + b.width * 0.6, b.y + b.height * 0.6, { button: "right" });
  await expect(p.getByText("Tìm kiếm nhanh")).toBeVisible();
});
