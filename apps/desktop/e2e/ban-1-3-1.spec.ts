/** 1.3.1: tệp cấu hình thẩm quyền (B2), hỏi xác nhận ngoài hiệu lực (B3), số liệu phân cấp ghi tay ở máy tỉnh (A2). */
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



const chu = (b: Buffer | Uint8Array) => new PizZip(b).file("word/document.xml")!.asText().replace(/<w:p[ >]/g, "\n<w:p ").replace(/<[^>]+>/g, "");
const loiThoai: string[] = [];

test("B2, B3: xuất tệp cấu hình, nạp lại văn bản thay thế; ký từ 01/3/2027 phải xác nhận, có văn bản mới thì không hỏi", async ({ page: p }) => {
  await vao(p);
  // B3: QĐ 27 mặc định, ngày ký 05/3/2027 → hộp xác nhận; bấm Hủy → chưa tạo
  p.removeAllListeners("dialog");
  p.on("dialog", (d) => { loiThoai.push(d.message()); void d.dismiss(); });
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T29/ }).click();
  await ngay(p, "Ngày ký", "05/03/2027");
  await p.getByRole("button", { name: /Tạo văn bản cấp dự án/ }).click();
  await expect(p.getByText("Chưa tạo văn bản — kiểm tra thẩm quyền")).toBeVisible();
  expect(loiThoai.at(-1)).toContain("hết hiệu lực từ 01/03/2027");
  // B2: Cài đặt → Thẩm quyền: xuất tệp; sửa thành văn bản thay thế, xuất, dùng lại mặc định, nạp tệp → lưu
  p.removeAllListeners("dialog");
  p.on("dialog", (d) => void d.accept());
  await p.getByRole("button", { name: "Cài đặt chung" }).first().click();
  await p.locator(".tab button", { hasText: "Thẩm quyền phân cấp" }).click();
  const the = p.locator("[data-the-tham-quyen]");
  await the.getByLabel("Số văn bản phân cấp").fill("05/2027/QĐ-UBND");
  await ngay(p, "Văn bản phân cấp có hiệu lực từ", "01/03/2027", the);
  await the.getByLabel("Văn bản phân cấp hết hiệu lực từ").fill("");
  await the.locator("[data-xuat-tep-tham-quyen]").click();
  const t = await tep(p, "Tham-quyen-phan-cap_05-2027-QĐ-UBND");
  expect(t.ten.endsWith(".gpmbtq")).toBe(true);
  expect(JSON.parse(t.buf.toString()).cauHinh.so).toBe("05/2027/QĐ-UBND");
  await the.getByLabel("Số văn bản phân cấp").fill("27/2026/QĐ-UBND");
  await the.getByLabel("Nạp tệp cấu hình thẩm quyền").setInputFiles({ name: t.ten, mimeType: "application/json", buffer: t.buf });
  await expect(p.getByText(/Đã đọc tệp: QĐ 05\/2027\/QĐ-UBND/)).toBeVisible();
  await expect(the.getByLabel("Số văn bản phân cấp")).toHaveValue("05/2027/QĐ-UBND");
  await the.getByRole("button", { name: "Lưu văn bản phân cấp" }).click();
  await expect(the).toContainText("Cập nhật bởi");
  // tệp hỏng → báo lỗi, giữ nguyên
  await the.getByLabel("Nạp tệp cấu hình thẩm quyền").setInputFiles({ name: "hong.gpmbtq", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(p.getByText("Không phải tệp cấu hình thẩm quyền phân cấp của phần mềm.")).toBeVisible();
  await p.keyboard.press("Escape");
  // văn bản mới có hiệu lực từ 01/3/2027 → tạo T29 ngày 05/3/2027 không hỏi
  p.removeAllListeners("dialog");
  p.on("dialog", (d) => { loiThoai.push(`KHÔNG MONG ĐỢI: ${d.message()}`); void d.accept(); });
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T29/ }).click();
  await ngay(p, "Ngày ký", "05/03/2027");
  await p.getByRole("button", { name: /Tạo văn bản cấp dự án/ }).click();
  await tep(p, "Mau-T29");
  expect(loiThoai.filter((x) => x.startsWith("KHÔNG MONG ĐỢI"))).toEqual([]);
});

test("A2 tỉnh: đơn vị chưa có số liệu kỳ → ghi tay theo báo cáo của đơn vị (bắt buộc căn cứ); bảng, Word dùng số ghi tay", async ({ page: p }) => {
  test.setTimeout(120_000);
  await vao(p);
  await p.getByRole("button", { name: "Gửi tỉnh, tổng hợp tỉnh" }).click();
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Tên đơn vị tổng hợp").fill("Sở Nông nghiệp và Môi trường (thử)");
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauTinh2026");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Tạo khóa cấp tỉnh" }).click();
  await p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }).click();
  const khoa = await tep(p, "Khoa-cong-khai_");
  await p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }).click();
  await p.getByLabel("Chọn tệp khóa của tỉnh").setInputFiles({ name: khoa.ten, mimeType: "application/json", buffer: khoa.buf });
  await p.getByLabel("Tên đơn vị gửi").fill("UBND xã Chiềng Mung (thử)");
  await p.getByRole("button", { name: /Xuất gói gửi tỉnh/ }).click();
  const goi = await tep(p, "GPMB-gui-tinh_");
  await p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }).click();
  await p.getByLabel("Mật khẩu khóa cấp tỉnh").fill("MatKhauTinh2026");
  await p.getByRole("button", { name: "Mở khóa" }).click();
  await expect(p.getByText("Đã mở khóa")).toBeVisible();
  await p.getByLabel("Chọn gói dữ liệu của xã").setInputFiles({ name: goi.ten, mimeType: "application/octet-stream", buffer: goi.buf });
  await expect(p.getByLabel("Kết quả nhận gói")).toContainText("nhận mới");
  // kỳ bắt đầu sau ngày gửi gói → đơn vị chưa có số liệu kỳ
  const the = p.locator("[data-phan-cap-tinh]");
  await ngay(p, "Phân cấp từ ngày", "20/10/2026", the);
  await expect(the.locator("[data-chua-gui-phan-cap]")).toContainText("UBND xã Chiềng Mung (thử)");
  await the.locator("[data-ghi-tay-phan-cap='UBND xã Chiềng Mung (thử)']").click();
  const hop = p.locator("[role=dialog]", { hasText: "Số liệu phân cấp — UBND xã Chiềng Mung (thử)" });
  await expect(hop.getByLabel("Xã, phường ghi tay")).toHaveValue("Xã Chiềng Mung");
  await hop.getByLabel("Số văn bản ghi tay: Quyết định thu hồi đất (Điều 78, 79 Luật Đất đai)").fill("4");
  await expect(hop.getByRole("button", { name: "Lưu số liệu" })).toBeDisabled();
  await expect(hop).toContainText("Chưa ghi căn cứ");
  await hop.getByLabel("Căn cứ số liệu ghi tay").fill("Báo cáo số 12/BC-UBND ngày 10/12/2026 (thử)");
  await hop.getByRole("button", { name: "Lưu số liệu" }).click();
  await expect(hop).toHaveCount(0);
  await expect(the.locator("[data-chua-gui-phan-cap]")).toHaveCount(0);
  const dong = the.getByRole("table", { name: "Kết quả phân cấp theo xã" }).locator("tbody tr", { hasText: "Xã Chiềng Mung" });
  await expect(dong).toContainText("ghi tay theo Báo cáo số 12/BC-UBND ngày 10/12/2026 (thử)");
  await expect(dong.locator("td").last()).toHaveText("4");
  await the.locator("[data-bao-cao-phan-cap-tinh]").click();
  const w = p.locator("[role=dialog]", { hasText: "Báo cáo tổng hợp phân cấp toàn tỉnh" });
  await w.getByRole("button", { name: "Tạo tệp Word" }).click();
  const doc = chu((await tep(p, "Bao-cao-phan-cap-toan-tinh_")).buf);
  expect(doc).toContain("Quyết định thu hồi đất (Điều 78, 79 Luật Đất đai): 4 (ghi tay theo Báo cáo số 12/BC-UBND ngày 10/12/2026 (thử))");
  expect(doc).toContain("Các đơn vị đã gửi số liệu trong kỳ.");
});

test("NQ 28/2026: chọn giá đất kỳ từ 01/11/2026 — tuyến bổ sung (Phụ lục I), TMDV gốc đất ở 90% (k8 Đ7); kỳ trước không có tuyến mới", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").first().click();
  await p.locator("[role=tablist] button", { hasText: "Thửa đất" }).first().click();
  await p.getByRole("button", { name: /^(Đổi|Chọn giá đất…)$/ }).first().click();
  const hop = p.locator("[role=dialog]", { hasText: "Chọn giá đất" });
  // đồng hồ thử 19/10/2026 → mặc định kỳ trước 01/11/2026
  await expect(hop.getByLabel("Kỳ áp dụng bảng giá đất")).toHaveValue("CU");
  await hop.locator(".o-nhap", { has: p.locator("label", { hasText: /^Bảng giá$/ }) }).locator("select").selectOption("DAT_O");
  await hop.locator(".o-nhap", { has: p.locator("label", { hasText: "Xã, phường" }) }).locator("select").selectOption("Xã Chiềng Mung");
  await hop.getByPlaceholder("Tên đường, đoạn…").fill("cai nghiện");
  await expect(hop.getByText("Không có dòng phù hợp.")).toBeVisible();
  await hop.getByLabel("Kỳ áp dụng bảng giá đất").selectOption("MOI");
  await expect(hop.locator("[data-luu-y-nq28]")).toContainText("đã ký ban hành");
  const dong = hop.locator("tbody tr", { hasText: "trung tâm cai nghiện" });
  await expect(dong).toContainText("Bổ sung theo Phụ lục I NQ 28/2026/NQ-HĐND ngày 19/10/2026, áp dụng từ 01/11/2026");
  // Bảng 06 + khoản 8 Điều 7: 90% giá đất ở VT1 1.500 → 1.350
  await hop.locator(".o-nhap", { has: p.locator("label", { hasText: /^Bảng giá$/ }) }).locator("select").selectOption("TMDV");
  await hop.getByLabel("Đất TMDV có nguồn gốc đất ở (khoản 8 Điều 7)").check();
  await hop.locator("tbody tr", { hasText: "trung tâm cai nghiện" }).getByRole("button", { name: "1350", exact: true }).click();
  await expect(hop).toHaveCount(0);
  await expect(p.getByText(/Khoản 8 Điều 7 \(bổ sung bởi khoản 6 Điều 1 NQ 28\/2026\): 90% × Bảng 05, Xã Chiềng Mung/).first()).toBeVisible();
});

test("NQ 28/2026: Tra cứu chọn kỳ bảng giá — giá đất nghĩa trang, tuyến bổ sung chỉ có ở kỳ từ 01/11/2026", async ({ page: p }) => {
  await vao(p);
  await p.getByRole("button", { name: "Tra cứu đơn giá, giá đất" }).first().click();
  await p.locator(".tc-tab button", { hasText: "Bảng giá đất" }).click();
  const ky = p.getByLabel("Kỳ bảng giá đất tra cứu");
  await ky.selectOption("2026-10-31");
  await p.getByLabel("Từ khóa tra cứu").fill("cong vien nghia trang");
  await expect(p.getByText("Không có dòng khớp điều kiện tra cứu.")).toBeVisible();
  await ky.selectOption("2026-11-01");
  await expect(p.getByText(/Công viên nghĩa trang thành phố Sơn La/).first()).toBeVisible();
});
