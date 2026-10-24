/** 1.3.0: T29–T31, phiếu kiểm tra (C2), báo cáo phân cấp 06 tháng (A1), văn bản phân cấp trong Cài đặt (A3). */
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

test("A1, A2, A3, C2: T29 Hội đồng BT + phiếu kiểm tra; báo cáo phân cấp đếm T29; Cài đặt đổi văn bản phân cấp", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T29/ }).click();
  await p.locator(".o-nhap", { has: p.locator("label", { hasText: "Thành viên Hội đồng" }) }).locator("textarea").fill("Ông A – Phó Chủ tịch UBND xã, Chủ tịch Hội đồng");
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill("5");
  await ngay(p, "Ngày ký", "19/10/2026");
  await p.locator("[data-phieu-kiem-tra]").click();
  const phieu = chu((await tep(p, "Phieu-kiem-tra_T29")).buf);
  expect(phieu).toContain("PHIẾU KIỂM TRA VĂN BẢN TRƯỚC KHI KÝ");
  expect(phieu).toContain("khoản 1 mục II Phụ lục II");
  await p.getByRole("button", { name: /Tạo văn bản cấp dự án/ }).click();
  expect(chu((await tep(p, "Mau-T29")).buf)).toContain("Ông A – Phó Chủ tịch UBND xã, Chủ tịch Hội đồng");
  // A1: báo cáo phân cấp — kỳ mặc định 30/06–14/12/2026, đếm T29 vừa ghi sổ
  await p.getByRole("button", { name: "Báo cáo tổng hợp" }).first().click();
  await p.locator("[data-mo-bao-cao-phan-cap]").click();
  const hop = p.locator("[role=dialog]", { has: p.locator("[data-bao-cao-phan-cap]") });
  await expect(hop).toContainText("trước 15/12/2026");
  await expect(hop.locator("tr[data-nv=HOI_DONG] td").nth(2)).toHaveText("1"); // cột Số văn bản (cột cuối: Kỳ trước)
  await hop.getByRole("button", { name: "Tạo tệp Word" }).click();
  expect(chu((await tep(p, "Bao-cao-phan-cap_")).buf)).toContain("Quyết định thành lập Hội đồng bồi thường, hỗ trợ, tái định cư đối với từng dự án");
  await hop.getByRole("button", { name: "Đóng" }).last().click();
  // A3: Cài đặt → Thẩm quyền phân cấp: đổi sang văn bản thay thế
  await p.getByRole("button", { name: "Cài đặt chung" }).first().click();
  await p.locator(".tab button", { hasText: "Thẩm quyền phân cấp" }).click();
  const the = p.locator("[data-the-tham-quyen]");
  await the.getByLabel("Số văn bản phân cấp").fill("05/2027/QĐ-UBND");
  await ngay(p, "Văn bản phân cấp có hiệu lực từ", "01/03/2027", the);
  await the.getByLabel("Văn bản phân cấp hết hiệu lực từ").fill("");
  await the.getByRole("button", { name: "Lưu văn bản phân cấp" }).click();
  await expect(the).toContainText("Cập nhật bởi");
  await expect(the.getByRole("button", { name: "Dùng lại QĐ 27/2026 (mặc định)" })).toBeVisible();
});

async function moHo(p: Page, thu = 0) {
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Hộ, cá nhân" }).click();
  await p.locator("tr[data-ho-id]").nth(thu).click();
  await expect(p.locator(".trang-ho h1")).toBeVisible();
}
const oNhap = (p: Page, nhan: string | RegExp) => p.locator(".o-nhap", { has: p.locator("label", { hasText: nhan }) });
async function soNgay(p: Page, so: string) {
  await p.locator(".o-nhap", { has: p.locator("label:text-is('Số văn bản')") }).locator("input").fill(so);
  await ngay(p, "Ngày ký", "19/10/2026");
}

test("B2, T31: quỹ TĐC có căn nhà ở → T31 tự điền bảng giá, căn cứ, địa điểm; Word có giá cán bộ đã nhập", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Tái định cư" }).click();
  await p.getByRole("button", { name: "Thêm lô", exact: true }).click();
  const hop = p.locator("[role=dialog]", { hasText: "Thêm lô tái định cư" });
  await oNhap(p, "Khu, điểm tái định cư").locator("input").fill("Khu TĐC bản Mé (thử)");
  await oNhap(p, "Số lô / số căn").locator("input").fill("N1");
  await oNhap(p, /^Loại$/).locator("select").selectOption("NHA_O");
  await oNhap(p, "Diện tích (m²)").locator("input").fill("60");
  await oNhap(p, "Giá bán nhà ở TĐC (đ/m²)").locator("input").fill("5000000");
  await oNhap(p, "Căn cứ giá").locator("input").fill("Chứng thư thẩm định giá số 01/2026/CT (thử)");
  await hop.getByRole("button", { name: "Lưu" }).click();
  await expect(hop).toHaveCount(0);
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T31/ }).click();
  await expect(oNhap(p, "Bảng giá bán").locator("textarea")).toHaveValue("Khu TĐC bản Mé (thử) – căn N1 | 60 | 300000000");
  await expect(oNhap(p, "Căn cứ xác định giá").locator("textarea")).toHaveValue("Căn cứ Chứng thư thẩm định giá số 01/2026/CT (thử);");
  await expect(oNhap(p, "Địa điểm nhà ở tái định cư").locator("input")).toHaveValue("Khu TĐC bản Mé (thử)");
  await soNgay(p, "6");
  await p.getByRole("button", { name: /Tạo văn bản cấp dự án/ }).click();
  const t31 = chu((await tep(p, "Mau-T31")).buf);
  expect(t31).toContain("Căn cứ Chứng thư thẩm định giá số 01/2026/CT (thử);");
  expect(t31).toContain("Khu TĐC bản Mé (thử) – căn N1");
});

test("B1, T30, C1: thành viên Ban kiểm đếm lưu theo dự án; Mẫu 22 đã ghi số → điền vào hồ sơ cưỡng chế, tính hạn giao QĐ", async ({ page: p }) => {
  await vao(p);
  // T30 hộ thứ nhất: nhập thành viên Ban
  await moHo(p, 0);
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await p.locator(".muc-mau", { hasText: /^T30/ }).click();
  await oNhap(p, "Thành viên Ban").locator("textarea").fill("Ông B – Phó Chủ tịch UBND xã, Trưởng ban\nBà C – công chức địa chính, thành viên");
  await soNgay(p, "7");
  await p.getByRole("button", { name: /Tạo văn bản cho 1 hộ/ }).click();
  const t30 = chu((await tep(p, "Mau-T30")).buf);
  expect(t30).toContain("Ông B – Phó Chủ tịch UBND xã, Trưởng ban");
  expect(t30).toContain("Bà C – công chức địa chính, thành viên");
  // hộ thứ hai: thành viên đã lưu theo dự án, không phải nhập lại
  await moHo(p, 1);
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await p.locator(".muc-mau", { hasText: /^T30/ }).click();
  await expect(oNhap(p, "Thành viên Ban").locator("textarea")).toHaveValue(/Ông B – Phó Chủ tịch UBND xã, Trưởng ban/);
  // C1: hồ sơ cưỡng chế thu hồi chưa ghi số QĐ; Mẫu 22 ghi số 88 → gợi ý trong hồ sơ
  await moHo(p, 0);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await p.getByRole("button", { name: "+ Cưỡng chế thu hồi đất" }).click();
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await p.locator(".tab-gon button", { hasText: "Văn bản" }).click();
  await p.locator(".muc-mau", { hasText: "Quyết định cưỡng chế thu hồi đất" }).click();
  await soNgay(p, "88");
  await p.getByRole("button", { name: /Tạo văn bản cho 1 hộ/ }).click();
  await tep(p, "Mau-22");
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  const cc = p.locator("[data-cc=THU_HOI]");
  await expect(cc.getByLabel("Số QĐ cưỡng chế")).toHaveValue("88/QĐ-UBND");
  await expect(cc.getByLabel("Ngày QĐ cưỡng chế")).toHaveValue("19/10/2026");
  await expect(cc).toContainText("Hạn giao QĐ cưỡng chế cho người bị cưỡng chế (lập biên bản): 22/10/2026");
});

test("D1, D2, C1, C2 tỉnh: gói 1.3.0 có phân cấp — bảng theo xã, Excel hai trang, Word tổng hợp toàn tỉnh", async ({ page: p }) => {
  test.setTimeout(120_000);
  await vao(p);
  // xã: T29 ghi số (nhiệm vụ HOI_DONG), một hồ sơ cưỡng chế có ngày dự kiến
  await p.keyboard.press("Alt+3");
  await p.getByRole("button", { name: "Văn bản dự án, đợt" }).click();
  await p.locator(".muc-mau", { hasText: /^T29/ }).click();
  await soNgay(p, "5");
  await p.getByRole("button", { name: /Tạo văn bản cấp dự án/ }).click();
  await tep(p, "Mau-T29");
  await moHo(p, 0);
  await p.locator("[role=tablist] button", { hasText: "Khiếu nại" }).click();
  await p.getByRole("button", { name: "+ Cưỡng chế thu hồi đất" }).click();
  await ngay(p, "Ngày dự kiến cưỡng chế", "16/11/2026", p.locator("[data-cc=THU_HOI]"));
  await p.getByRole("button", { name: "Lưu hồ sơ" }).click();
  // tỉnh tạo khóa; xã nhập khóa, xuất gói; tỉnh nhận
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
  // thẻ phân cấp: kỳ 30/06–14/12/2026, Xã Chiềng Mung 1 văn bản; lịch cưỡng chế
  const the = p.locator("[data-phan-cap-tinh]");
  await expect(the.getByRole("table", { name: "Kết quả phân cấp theo xã" }).locator("tbody tr", { hasText: "Xã Chiềng Mung" }).locator("td").last()).toHaveText("1");
  await expect(the.locator("[data-lich-cuong-che-tinh]")).toContainText("16/11/2026");
  await expect(the.locator("[data-chua-gui-phan-cap]")).toHaveCount(0);
  await the.getByRole("button", { name: "Excel phân cấp, lịch cưỡng chế" }).click();
  const x = new PizZip((await tep(p, "Phan-cap-lich-cuong-che-toan-tinh_")).buf).file("xl/workbook.xml")!.asText();
  expect(x.match(/<sheet /g)).toHaveLength(2);
  await the.locator("[data-bao-cao-phan-cap-tinh]").click();
  const hop = p.locator("[role=dialog]", { hasText: "Báo cáo tổng hợp phân cấp toàn tỉnh" });
  await hop.getByLabel("Họ tên người ký").fill("Người ký thử");
  await hop.getByRole("button", { name: "Tạo tệp Word" }).click();
  const w = chu((await tep(p, "Bao-cao-phan-cap-toan-tinh_")).buf);
  expect(w).toContain("Xã Chiềng Mung");
  expect(w).toContain("27/2026/QĐ-UBND");
  expect(w).toContain("Trong kỳ, 1/1 xã, phường có văn bản thuộc nhiệm vụ được phân cấp, tổng cộng 1 văn bản.");
  expect(w).not.toContain("Hộ mẫu 01");
});
