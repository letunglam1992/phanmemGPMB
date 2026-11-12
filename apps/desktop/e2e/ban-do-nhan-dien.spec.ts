/**
 * 1.3.6 (BĐ-1, 6, 7, 8, 9, 10): trình nhập bản đồ từng bước — tệp DXF đặt tên lớp (không theo số lớp mặc định) tự dò lớp ở
 * luồng nền; ranh tuyến hai nét khép hai đầu; diện tích ghi ở khung tờ đối chiếu với phạm vi; rà lỗi; lưu và dùng lại mẫu cấu
 * hình. Tệp dựng trong kiểm thử (không dùng bản đồ thật, họ tên giả).
 */
import { expect, test, type Page } from "@playwright/test";

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
test.setTimeout(120_000);
test.use({ viewport: { width: 1536, height: 900 } });
test.beforeEach(async ({ page }) => {
  loiTrang.length = 0;
  page.on("pageerror", (e) => loiTrang.push(e.message));
  page.on("dialog", (d) => d.accept());
});
test.afterEach(() => expect(loiTrang).toEqual([]));

const nhom = (...c: (string | number)[]) => c.map(String).join("\n");
/** 6 thửa 40 × 40 m xếp một hàng trên lớp "RANH_THUA"; nhãn gộp "LUC n/1200.0" lớp "NHAN_THUA"; tên chủ lớp "TEN_CHU"; ranh tuyến hai nét lớp "RANH_GPMB". */
function dxf() {
  const X = 500000, Y = 2350000;
  const ln = (l: string, x1: number, y1: number, x2: number, y2: number) => nhom(0, "LINE", 8, l, 10, X + x1, 20, Y + y1, 11, X + x2, 21, Y + y2);
  const t = (l: string, x: number, y: number, s: string) => nhom(0, "TEXT", 8, l, 10, X + x, 20, Y + y, 40, 1.5, 1, s);
  const ent: string[] = [];
  for (let i = 0; i < 6; i++) {
    const x = i * 40, y = 0;
    ent.push(ln("RANH_THUA", x, y, x + 40, y), ln("RANH_THUA", x + 40, y, x + 40, y + 40), ln("RANH_THUA", x + 40, y + 40, x, y + 40), ln("RANH_THUA", x, y + 40, x, y));
    ent.push(t("NHAN_THUA", x + 5, y + 18, `LUC ${i + 1}/1600.0`), t("TEN_CHU", x + 5, y + 25, `Lò Văn ${"ABCDEF"[i]}`));
  }
  // ranh tuyến: hai mép y = 10 và y = 30 suốt dải thửa (240 m) — thu hồi 240 × 20 = 4.800 m²
  ent.push(ln("RANH_GPMB", 0, 10, 240, 10), ln("RANH_GPMB", 0, 30, 240, 30));
  ent.push(t("KHUNG", 300, 100, "- Diện tích trong phạm vi GPMB: 4.800,0 m2"));
  return Buffer.from([nhom(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, "AC1032", 0, "ENDSEC"), nhom(0, "SECTION", 2, "ENTITIES", ...ent, 0, "ENDSEC", 0, "EOF")].join("\n"), "utf8");
}

test("Trình nhập bản đồ: dò lớp theo nội dung, ranh tuyến khép hai đầu khớp diện tích ghi, số tờ, rà lỗi; lưu mẫu và dùng lại khi nạp lại", async ({ page: p }) => {
  await vao(p);
  await p.keyboard.press("Alt+3");
  await p.locator("[role=tablist] button", { hasText: "Bản đồ" }).click();
  const tep = p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first();
  await tep.setInputFiles({ name: "TD9-2026.dxf", mimeType: "application/octet-stream", buffer: dxf() });
  await expect(p.getByText("Nhập bản đồ: TD9-2026.dxf")).toBeVisible();
  // Bước 1: dựng được 6 thửa nhờ dò lớp RANH_THUA
  const buoc = p.locator("[data-buoc]");
  await expect(buoc).toContainText("Dựng được 6 thửa");
  await expect(buoc).toContainText(/dò theo nội dung: lớp \d+ \(“RANH_THUA”\) là ranh thửa/);
  await p.getByRole("button", { name: /^Tiếp: Nút, nhãn thửa/ }).click();
  await expect(buoc).toContainText("Bản đồ không có nút thuộc tính");
  await expect(buoc).toContainText("6/6");
  await p.getByRole("button", { name: /^Tiếp: Ranh GPMB/ }).click();
  await expect(buoc).toContainText("trong phạm vi GPMB: 4.800,0 m");
  await expect(buoc).toContainText(/Vùng N1 .* 4\.800 m², khớp diện tích ghi/);
  await p.getByRole("button", { name: /^Tiếp: Số tờ, chốt/ }).click();
  await expect(p.getByLabel("Số tờ bản đồ của tệp")).toHaveValue("TĐ9-2026"); // gợi ý theo tên tệp
  await p.getByText("Lưu cấu hình lớp này thành mẫu của đơn vị").click();
  await p.getByLabel("Tên mẫu cấu hình").fill("Mẫu thử đơn vị đo");
  await p.getByRole("button", { name: "Chốt và dựng thửa" }).click();
  await expect(p.getByText("Nhập bản đồ: TD9-2026.dxf")).toBeHidden();
  // Sau khi chốt: phạm vi = vùng N1, đối chiếu diện tích ghi khớp; thẻ rà lỗi có lọc theo phạm vi
  await expect(p.getByText(/Đối chiếu diện tích ghi ở khung tờ/)).toBeVisible();
  await expect(p.locator(".kt-bd li", { hasText: "Đối chiếu diện tích ghi ở khung tờ" })).toContainText("khớp");
  await expect(p.locator("[data-ra-loi]")).toContainText("Chỉ thửa trong phạm vi thu hồi");
  await expect(p.getByText("TĐ9-2026*-1").first()).toBeVisible();
  // Nạp lại cùng tệp: dùng mẫu đã lưu
  await tep.setInputFiles({ name: "TD9-2026.dxf", mimeType: "application/octet-stream", buffer: dxf() });
  await expect(p.getByText("Nhập bản đồ: TD9-2026.dxf")).toBeVisible();
  await expect(p.locator("[data-theo-mau]")).toContainText("Mẫu thử đơn vị đo");
  await p.getByRole("button", { name: "Để sau" }).click();
});
