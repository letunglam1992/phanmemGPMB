/** Gửi tỉnh, tổng hợp tỉnh (docs/21): tỉnh tạo khóa → xã nhập khóa, xuất gói mã hóa → tỉnh nhận, tổng hợp, xem chi tiết (chỉ xem). */
import { expect, test, type Page } from "@playwright/test";
import PizZip from "pizzip";
// @ts-expect-error tệp JS của Worker (không có khai báo kiểu)
import worker from "../../../tools/cong-tinh/worker.js";

test.setTimeout(120_000);
test.use({ viewport: { width: 1536, height: 900 } });
const loiTrang: string[] = [];
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
async function tep(p: Page, dau: string): Promise<{ ten: string; buf: Buffer }> {
  await expect.poll(() => p.evaluate((d) => Object.keys((window as unknown as { __tep: Record<string, string> }).__tep).find((k) => k.startsWith(d)), dau)).toBeTruthy();
  const [ten, b64] = await p.evaluate((d) => { const t = (window as unknown as { __tep: Record<string, string> }).__tep; const k = Object.keys(t).find((x) => x.startsWith(d))!; return [k, t[k]!]; }, dau);
  return { ten, buf: Buffer.from(b64, "base64") };
}

test("tỉnh tạo khóa; xã xuất gói mã hóa; tỉnh nhận, tổng hợp theo xã, xem chi tiết chỉ xem rồi trở lại", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" }).click();
  // --- cấp tỉnh: tạo khóa
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Tên đơn vị tổng hợp").fill("Sở Nông nghiệp và Môi trường (thử)");
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauTinh2026");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Tạo khóa cấp tỉnh" }).click();
  const vanTay = (await p.getByLabel("Vân tay khóa cấp tỉnh").textContent())!;
  expect(vanTay).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
  await p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }).click();
  const khoa = await tep(p, "Khoa-cong-khai_");
  expect(khoa.ten).toMatch(/\.gpmbkhoa$/);
  expect(khoa.buf.toString()).not.toContain("biMat");
  // --- cấp xã: nhập khóa, xuất gói
  await p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }).click();
  await p.getByLabel("Chọn tệp khóa của tỉnh").setInputFiles({ name: khoa.ten, mimeType: "application/json", buffer: khoa.buf });
  await expect(p.getByLabel("Vân tay khóa tỉnh")).toHaveText(vanTay);
  await p.getByLabel("Tên đơn vị gửi").fill("UBND xã Chiềng Mung (thử)");
  await p.getByRole("button", { name: /Xuất gói gửi tỉnh/ }).click();
  const goi = await tep(p, "GPMB-gui-tinh_");
  expect(goi.ten).toMatch(/^GPMB-gui-tinh_UBND-xa-Chieng-Mung-thu_.*\.gpmbtinh$/);
  const zip = new PizZip(goi.buf);
  const ngoai = zip.file("thong-tin.json")!.asText();
  expect(ngoai).not.toContain("Hộ mẫu 01");
  expect(JSON.parse(ngoai)).toMatchObject({ donViGui: "UBND xã Chiềng Mung (thử)", soDuAn: 1, soHo: 2 });
  expect(Buffer.from(zip.file("du-lieu.bin")!.asUint8Array()).toString("latin1")).not.toContain("du-lieu.json"); // nội dung đã mã hóa
  await expect(p.getByText(/Lần gửi gần nhất/)).toBeVisible();
  // --- cấp tỉnh: mở khóa, nhận gói
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await expect(p.getByLabel("Chọn gói dữ liệu của xã")).toBeDisabled();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("sai-mat-khau-1");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Mật khẩu khóa không đúng")).toBeVisible();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Đã mở khóa")).toBeVisible();
  await p.getByLabel("Chọn gói dữ liệu của xã").setInputFiles({ name: goi.ten, mimeType: "application/octet-stream", buffer: goi.buf });
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("UBND xã Chiềng Mung (thử): nhận mới");
  // gửi lại cùng gói → bỏ qua
  await p.getByLabel("Chọn gói dữ liệu của xã").setInputFiles({ name: goi.ten, mimeType: "application/octet-stream", buffer: goi.buf });
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("đã có gói này");
  const bang = p.getByRole("table", { name: "Bảng tổng hợp tỉnh" });
  await expect(bang).toContainText("Xã Chiềng Mung · 1 dự án");
  await expect(bang).toContainText("Dự án mẫu – Khu công nghiệp");
  await expect(bang).not.toContainText("Hộ mẫu 01");
  await expect(p.getByLabel("Chỉ số toàn tỉnh")).toContainText("2hộ, tổ chức");
  // Excel tổng hợp
  await p.getByRole("button", { name: "Xuất Excel" }).click();
  await tep(p, "Tong-hop-GPMB-toan-tinh_");
  // --- xem chi tiết như cấp xã (chỉ xem)
  await bang.getByRole("button", { name: /Dự án mẫu – Khu công nghiệp/ }).click();
  await expect(p.getByRole("status").filter({ hasText: "Đang xem dữ liệu" })).toContainText("UBND xã Chiềng Mung (thử)");
  await p.getByRole("tab", { name: /Hộ, cá nhân, tổ chức/ }).click();
  await expect(p.getByText("Hộ mẫu 01").first()).toBeVisible();
  await expect(p.locator(".to-chuc")).toContainText(/Xem dữ liệu: UBND xã Chiềng Mung \(thử\) \(số liệu đến \d\d\/\d\d\/\d{4} \d\d:\d\d\)/);
  await expect(p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" })).toHaveCount(0);
  await p.getByRole("button", { name: "Thoát xem" }).click();
  // trở lại phiên quản trị, đúng màn tổng hợp, không phải đăng nhập lại
  await expect(p.getByRole("table", { name: "Bảng tổng hợp tỉnh" })).toBeVisible();
  await expect(p.locator(".ten-nguoi")).toContainText("Quản trị");
  await expect(p.getByText("Đã mở khóa")).toBeVisible();
  // dữ liệu nghiệp vụ của máy không bị thay
  await p.getByRole("button", { name: "Tổng quan" }).first().click();
  await expect(p.getByText(/Đang theo dõi 1 dự án/)).toBeVisible();
});

test("cổng Cloudflare: tỉnh cấp mã cho xã; xã gửi gói lên cổng; tỉnh tải về, cổng chỉ giữ dữ liệu đã mã hóa", async ({ page: p }) => {
  // Worker thật (tools/cong-tinh/worker.js) chạy trong tiến trình kiểm thử, R2 trong bộ nhớ
  const kho = new Map<string, Uint8Array>();
  const enc = new TextEncoder();
  const env = {
    MA_QUAN_TRI: "ma-quan-tri-thu-nghiem-0123456789",
    KHO: {
      put: async (k: string, v: string | Uint8Array) => void kho.set(k, typeof v === "string" ? enc.encode(v) : v),
      get: async (k: string) => (kho.has(k) ? { body: kho.get(k)!, json: async () => JSON.parse(new TextDecoder().decode(kho.get(k)!)) } : null),
      list: async (o: { prefix: string }) => ({ objects: [...kho.entries()].filter(([k]) => k.startsWith(o.prefix)).map(([key, v]) => ({ key, size: v.length })), truncated: false }),
      delete: async (k: string) => void kho.delete(k),
    },
  };
  await p.route("https://cong.test/**", async (r) => {
    const q = r.request();
    const body = q.postDataBuffer();
    const res: Response = await worker.fetch(new Request(q.url(), { method: q.method(), headers: q.headers(), body: body && q.method() !== "GET" ? new Uint8Array(body) : undefined }), env);
    await r.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
  });
  await vao(p);
  await p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" }).click();
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Tên đơn vị tổng hợp").fill("Sở (thử)");
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauTinh2026");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Tạo khóa cấp tỉnh" }).click();
  await p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }).click();
  const khoa = await tep(p, "Khoa-cong-khai_");
  // tỉnh: kết nối cổng bằng mã quản trị, cấp mã cho xã
  await p.getByRole("button", { name: /Cổng Cloudflare của tỉnh/ }).click();
  await p.getByLabel("Địa chỉ cổng TINH").fill("https://cong.test/");
  await p.getByLabel("Mã truy cập cổng TINH").fill(env.MA_QUAN_TRI);
  await p.getByRole("button", { name: "Lưu và kiểm tra kết nối" }).click();
  await expect(p.getByText("Đã kết nối cổng với quyền quản trị")).toBeVisible();
  await p.getByLabel("Xã cấp mã").fill("Xã Chiềng Mung");
  await p.getByRole("button", { name: "Cấp mã", exact: true }).click();
  const token = (await p.getByLabel("Mã truy cập vừa cấp").textContent())!;
  expect(token).toMatch(/^chieng-mung\./);
  await expect(p.getByText("Chưa gửi")).toBeVisible();
  // xã: nhập khóa, kết nối cổng bằng mã được cấp, gửi lên
  await p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }).click();
  await p.getByLabel("Chọn tệp khóa của tỉnh").setInputFiles({ name: khoa.ten, mimeType: "application/json", buffer: khoa.buf });
  await p.getByLabel("Tên đơn vị gửi").fill("UBND xã Chiềng Mung (thử)");
  await p.getByRole("button", { name: /Cổng Cloudflare của tỉnh/ }).click();
  await p.getByLabel("Địa chỉ cổng XA").fill("https://cong.test");
  await p.getByLabel("Mã truy cập cổng XA").fill(env.MA_QUAN_TRI);
  await p.getByRole("button", { name: "Lưu và kiểm tra kết nối" }).click();
  await expect(p.getByText(/Đây là mã quản trị của tỉnh/)).toBeVisible();
  await p.getByLabel("Mã truy cập cổng XA").fill(token);
  await p.getByRole("button", { name: "Lưu và kiểm tra kết nối" }).click();
  await expect(p.getByText("Đã kết nối cổng — mã của Xã Chiềng Mung")).toBeVisible();
  await p.getByRole("button", { name: "Gửi lên cổng của tỉnh" }).click();
  await expect(p.getByText(/Đã gửi lên cổng của tỉnh lúc/)).toBeVisible();
  const daLuu = [...kho.entries()].filter(([k]) => k.startsWith("goi/chieng-mung/"));
  expect(daLuu).toHaveLength(1);
  expect(Buffer.from(daLuu[0]![1]).toString("utf8")).not.toContain("Hộ mẫu 01");
  // tỉnh: mở khóa, tải từ cổng
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Mở khóa" }).click(); // mở khóa xong tự tải gói mới từ cổng
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("UBND xã Chiềng Mung (thử): nhận mới");
  await expect(p.getByRole("table", { name: "Bảng tổng hợp tỉnh" })).toContainText("Dự án mẫu – Khu công nghiệp");
  await expect(p.getByRole("table", { name: "Đơn vị đã gửi" })).toContainText("Cổng");
  await p.getByRole("button", { name: "Tải gói mới từ cổng Cloudflare" }).click();
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("Không có gói mới trên cổng");
  // thu hồi mã: xã không gửi được nữa
  await p.getByRole("button", { name: "Thu hồi" }).click();
  await expect(p.getByText(/Đã thu hồi/)).toBeVisible();
  await p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }).click();
  await p.getByRole("button", { name: "Gửi lên cổng của tỉnh" }).click();
  await expect(p.getByText("Mã truy cập không đúng hoặc đã bị thu hồi")).toBeVisible();
});

test("tạo khóa mới thay khóa cũ (quên mật khẩu): hủy giữ khóa cũ; tạo mới thì vân tay đổi, gói cũ còn số liệu nhưng không xem chi tiết", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" }).click();
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Tên đơn vị tổng hợp").fill("Sở (thử)");
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauTinh2026");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Tạo khóa cấp tỉnh" }).click();
  const vanTayCu = (await p.getByLabel("Vân tay khóa cấp tỉnh").textContent())!;
  await p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }).click();
  const khoa = await tep(p, "Khoa-cong-khai_");
  await p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }).click();
  await p.getByLabel("Chọn tệp khóa của tỉnh").setInputFiles({ name: khoa.ten, mimeType: "application/json", buffer: khoa.buf });
  await p.getByLabel("Tên đơn vị gửi").fill("UBND xã Thử");
  await p.getByRole("button", { name: /Xuất gói gửi tỉnh/ }).click();
  const goi = await tep(p, "GPMB-gui-tinh_");
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Đã mở khóa")).toBeVisible();
  await p.getByLabel("Chọn gói dữ liệu của xã").setInputFiles({ name: goi.ten, mimeType: "application/octet-stream", buffer: goi.buf });
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("nhận mới");
  // quên mật khẩu → tạo khóa mới; hủy thì giữ khóa cũ
  await p.getByRole("button", { name: "Tạo khóa mới (thay khóa cũ)…" }).click();
  await expect(p.getByText("Dùng khi quên mật khẩu khóa")).toBeVisible();
  await p.getByRole("button", { name: "Hủy, giữ khóa cũ" }).click();
  await expect(p.getByLabel("Vân tay khóa cấp tỉnh")).toHaveText(vanTayCu);
  await p.getByRole("button", { name: "Tạo khóa mới (thay khóa cũ)…" }).click();
  await expect(p.getByLabel("Tên đơn vị tổng hợp")).toHaveValue("Sở (thử)");
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauMoi2026x");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauMoi2026x");
  await p.getByRole("button", { name: "Tạo khóa mới", exact: true }).click();
  await expect(p.getByLabel("Vân tay khóa cấp tỉnh")).not.toHaveText(vanTayCu);
  await expect(p.getByText("Đang khóa")).toBeVisible();
  // mật khẩu cũ không mở được khóa mới; mật khẩu mới mở được
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Mật khẩu khóa không đúng")).toBeVisible();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauMoi2026x");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Đã mở khóa")).toBeVisible();
  // gói cũ: còn số liệu tổng hợp; xem chi tiết báo mã hóa cho khóa khác
  const bang = p.getByRole("table", { name: "Bảng tổng hợp tỉnh" });
  await expect(bang).toContainText("Dự án mẫu – Khu công nghiệp");
  await bang.getByRole("button", { name: /Dự án mẫu – Khu công nghiệp/ }).click();
  await expect(p.getByText("Gói được mã hóa cho khóa khác")).toBeVisible();
  // xuất khóa công khai MỚI để gửi lại các xã
  const vanTayMoi = (await p.getByLabel("Vân tay khóa cấp tỉnh").textContent())!.replace(/-/g, "").toLowerCase();
  await p.evaluate(() => { (window as unknown as { __tep: Record<string, string> }).__tep = {}; });
  await p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }).click();
  expect((await tep(p, "Khoa-cong-khai_")).buf.toString()).toContain(vanTayMoi);
});
