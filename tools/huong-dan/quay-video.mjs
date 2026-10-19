/**
 * Quay video hướng dẫn thao tác (D3, 1.0.20) bằng Playwright trên bản build (vite preview) — dữ liệu mẫu ẩn danh, bản đồ
 * DXF giả lập; con trỏ chuột, vòng bấm và phụ đề từng bước được vẽ chồng trong trang. Ra tệp .webm → đổi .mp4 bằng ffmpeg:
 *   PW_CHROMIUM=... node tools/huong-dan/quay-video.mjs <thư mục ra> [1|2|3]
 */
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ra = process.argv[2] ?? "video";
const chiQuay = process.argv[3];
mkdirSync(ra, { recursive: true });
const URL = process.env.GPMB_URL ?? "http://localhost:4173";
const W = 1366, H = 768;

/** Bản đồ DXF giả lập: 18 thửa (tờ 12), ranh GPMB lớp 30 cắt hàng giữa — như dự án tập huấn (src/tap-huan.ts). */
function banDoDxf() {
  const X0 = 512000, Y0 = 2355000;
  const n = (...c) => c.map(String).join("\r\n");
  const lw = (lop, pts) => n(0, "LWPOLYLINE", 8, lop, 90, pts.length, 70, 1, ...pts.flatMap(([x, y]) => [10, (X0 + x).toFixed(3), 20, (Y0 + y).toFixed(3)]));
  const chu = (lop, s, x, y, cao = 1.8) => n(0, "TEXT", 8, lop, 10, (X0 + x).toFixed(3), 20, (Y0 + y).toFixed(3), 40, cao, 1, s);
  const tt = [];
  for (let hang = 0; hang < 3; hang++)
    for (let cot = 0; cot < 6; cot++) {
      const x = cot * 30, y = (2 - hang) * 25;
      tt.push(lw(10, [[x, y], [x + 30, y], [x + 30, y + 25], [x, y + 25]]), chu(4, String(hang * 6 + cot + 1), x + 12, y + 14), chu(5, "12", x + 12, y + 8, 1.2));
    }
  tt.push(lw(30, [[-5, 30], [185, 30], [185, 45], [-5, 45]]));
  const s = [n(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, "AC1015", 9, "$INSUNITS", 70, 6, 0, "ENDSEC"), n(0, "SECTION", 2, "ENTITIES", ...tt, 0, "ENDSEC", 0, "EOF")].join("\r\n");
  return Buffer.from(s, "latin1");
}

const LOP_PHU = () => {
  const st = document.createElement("style");
  st.textContent = `
  #hd-tro{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .45s cubic-bezier(.4,0,.2,1)}
  .hd-vong{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:3px solid #f5b400;z-index:2147483646;pointer-events:none;animation:hdv .6s ease-out forwards}
  @keyframes hdv{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
  #hd-pd{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:1100px;background:rgba(15,40,28,.92);color:#fff;font:600 21px/1.45 "Segoe UI",Inter,system-ui,sans-serif;padding:12px 26px;border-radius:12px;z-index:2147483645;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.25);text-align:center;transition:opacity .3s}
  #hd-pd b{color:#ffd45a}
  #hd-bia{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 30% 30%,#1f5a3d,#0c2a1c);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Segoe UI",Inter,system-ui,sans-serif;text-align:center;transition:opacity .6s}
  #hd-bia .n{font-size:20px;letter-spacing:.3em;color:#9fd3b2;margin-bottom:18px}#hd-bia .t{font-size:46px;font-weight:700;max-width:1100px;line-height:1.25}#hd-bia .p{font-size:20px;margin-top:22px;color:#d6eadd}`;
  document.head.appendChild(st);
  const tro = document.createElement("div");
  tro.id = "hd-tro";
  tro.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(tro);
  const pd = document.createElement("div");
  pd.id = "hd-pd";
  pd.style.opacity = "0";
  document.body.appendChild(pd);
};

async function moi(trinh, ten) {
  const ctx = await trinh.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: join(ra, "_tam", ten), size: { width: W, height: H } }, locale: "vi-VN" });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date("2026-10-19T09:00:00+07:00"));
  p.on("dialog", (d) => void d.accept());
  p.on("pageerror", (e) => console.error("Lỗi trang:", e.message));
  await p.addInitScript(() => {
    const w = window;
    w.__tep = {};
    w.showSaveFilePicker = async (o) => ({ name: o.suggestedName, createWritable: async () => ({ write: async (bl) => { const u = new Uint8Array(await bl.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); w.__tep[o.suggestedName] = btoa(s); }, close: async () => undefined }) });
  });
  const dam = async () => { if (!(await p.evaluate(() => !!document.getElementById("hd-tro")))) await p.evaluate(LOP_PHU); };
  let x = W / 2, y = H / 2;
  const t0 = Date.now();
  const h = {
    p,
    ctx,
    /** giây kể từ đầu bản quay đến lúc hiện trang bìa (cắt bỏ phần đăng nhập, nạp dữ liệu mẫu) */
    cat: null,
    cho: (ms) => p.waitForTimeout(ms),
    async phuDe(html, ms = 2200) {
      await dam();
      await p.evaluate((s) => { const e = document.getElementById("hd-pd"); e.innerHTML = s; e.style.opacity = s ? "1" : "0"; }, html);
      if (ms) await p.waitForTimeout(ms);
    },
    async bia(so, tieuDe, phu, ms = 3200) {
      await dam();
      if (h.cat === null) h.cat = (Date.now() - t0) / 1000 + 0.3;
      await p.evaluate(([a, b, c]) => { const d = document.createElement("div"); d.id = "hd-bia"; d.innerHTML = `<div class="n">${a}</div><div class="t">${b}</div><div class="p">${c}</div>`; document.body.appendChild(d); }, [so, tieuDe, phu]);
      await p.waitForTimeout(ms);
      await p.evaluate(() => { const d = document.getElementById("hd-bia"); d.style.opacity = "0"; setTimeout(() => d.remove(), 700); });
      await p.waitForTimeout(700);
    },
    async den(loc) {
      await dam();
      await loc.scrollIntoViewIfNeeded().catch(() => undefined);
      const b = await loc.boundingBox();
      if (!b) { await p.screenshot({ path: join(ra, "loi.png") }); throw new Error("Không thấy phần tử để bấm"); }
      x = b.x + b.width / 2;
      y = b.y + b.height / 2;
      await p.evaluate(([a, c]) => { const t = document.getElementById("hd-tro"); t.style.transform = `translate(${a}px,${c}px)`; }, [x - 4, y - 3]);
      await p.mouse.move(x, y, { steps: 8 });
      await p.waitForTimeout(550);
    },
    async bam(loc, ms = 900) {
      await h.den(loc);
      await p.evaluate(([a, c]) => { const v = document.createElement("div"); v.className = "hd-vong"; v.style.left = `${a}px`; v.style.top = `${c}px`; document.body.appendChild(v); setTimeout(() => v.remove(), 700); }, [x, y]);
      await loc.click({ timeout: 8000 }).catch(async (e) => { await p.screenshot({ path: join(ra, "loi.png") }); throw e; });
      await p.waitForTimeout(ms);
    },
    async go(loc, chu, ms = 500) {
      await h.bam(loc, 200);
      await loc.fill("");
      await loc.pressSequentially(chu, { delay: 55 });
      await p.waitForTimeout(ms);
    },
    async tep(dau) {
      for (let i = 0; i < 50; i++) {
        const r = await p.evaluate((d) => { const t = window.__tep; const k = Object.keys(t).find((x) => x.startsWith(d)); return k ? [k, t[k]] : null; }, dau);
        if (r) return { name: r[0], mimeType: "application/octet-stream", buffer: Buffer.from(r[1], "base64") };
        await p.waitForTimeout(200);
      }
      throw new Error(`Không thấy tệp ${dau}`);
    },
  };
  return h;
}

async function batDau(h) {
  const { p } = h;
  await p.goto(URL);
  await p.waitForTimeout(700);
  const o = p.locator("form input");
  await o.nth(0).fill("quantri");
  await o.nth(1).fill("Cán bộ hướng dẫn");
  await p.locator("input[type=password]").nth(0).fill("matkhau123");
  await p.locator("input[type=password]").nth(1).fill("matkhau123");
  await p.click("button[type=submit]");
  await p.getByText("Nạp dữ liệu mẫu (ẩn danh)").click();
  await p.getByText(/Đang theo dõi 1 dự án/).waitFor();
  await p.waitForTimeout(500);
}
const the = (p, ten) => p.locator("[role=tablist] button", { hasText: ten }).first();
const nutBen = (p, ten) => p.getByRole("button", { name: ten, exact: true }).first();

async function ket(h, ten) {
  await h.cho(800);
  const v = h.p.video();
  await h.ctx.close();
  const tam = await v.path();
  renameSync(tam, join(ra, `${ten}.webm`));
  writeFileSync(join(ra, `${ten}.cat`), String(h.cat ?? 0));
  console.log("Đã quay", join(ra, `${ten}.webm`));
}

const trinh = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

// ---------------- Video 1: bản đồ → hồ sơ ----------------
if (!chiQuay || chiQuay === "1") {
  const h = await moi(trinh, "1");
  const { p } = h;
  await batDau(h);
  await h.bia("HƯỚNG DẪN THAO TÁC · 1/3", "Nạp bản đồ địa chính, xác định thửa thu hồi, tạo hồ sơ", "Phần mềm GPMB Sơn La · bản đồ giả lập để minh họa");
  await h.phuDe("Mở dự án → thẻ <b>Bản đồ</b>", 300);
  await h.bam(nutBen(p, "Hồ sơ"));
  await h.bam(the(p, "Bản đồ"));
  await h.phuDe("Chọn tệp bản đồ <b>DGN (V7, V8)</b> hoặc <b>DXF</b> — xử lý hoàn toàn trên máy", 2400);
  await p.locator('input[type=file][accept=".dgn,.dxf,.dwg"]').first().setInputFiles({ name: "Ban-do-minh-hoa.dxf", mimeType: "application/octet-stream", buffer: banDoDxf() });
  await h.cho(1200);
  await h.phuDe("Phần mềm gợi ý cách gán lớp theo quy chuẩn → <b>Tiếp tục</b>", 1800);
  await h.bam(p.getByRole("button", { name: "Tiếp tục" }));
  await h.cho(1500);
  await h.phuDe("Bản đồ dựng thửa tự động; khung <b>Kiểm tra bản đồ</b> nêu điểm cần xem", 300);
  await h.den(p.getByText("Kiểm tra bản đồ").first());
  await h.cho(2600);
  await h.phuDe("<b>Phạm vi thu hồi</b>: chọn vùng ranh GPMB — phần mềm tính diện tích thu hồi từng thửa", 300);
  await h.bam(p.getByRole("button", { name: /Chọn tất cả \d+ vùng/ }), 1800);
  await h.cho(1500);
  await h.phuDe("Bấm <b>Tạo hồ sơ từ thửa thu hồi</b>", 300);
  await h.bam(p.getByRole("button", { name: "Tạo hồ sơ từ thửa thu hồi" }), 1600);
  const hop = p.locator(".hop-thoai");
  await h.phuDe("Kiểm tra danh sách thửa, xác nhận rồi tạo hồ sơ", 1500);
  const xn = hop.locator("input[type=checkbox]");
  if (await xn.count()) await h.bam(xn.first(), 600);
  await h.bam(hop.getByRole("button", { name: /Tạo \d+ hồ sơ/ }), 1800);
  await h.phuDe("Hồ sơ mới có sẵn tờ, thửa, diện tích thu hồi — nhập tiếp chủ sử dụng, kiểm đếm", 3500);
  await h.phuDe("", 0);
  await h.bia("PHẦN MỀM GPMB SƠN LA", "Tiếp theo: lập, chốt, phê duyệt phương án", "Video 2/3", 2400);
  await ket(h, "1-Ban-do-tao-ho-so");
}

// ---------------- Video 2: phương án ----------------
if (!chiQuay || chiQuay === "2") {
  const h = await moi(trinh, "2");
  const { p } = h;
  await batDau(h);
  await h.bia("HƯỚNG DẪN THAO TÁC · 2/3", "Lập, chốt, phê duyệt phương án bồi thường, hỗ trợ, tái định cư", "Phần mềm GPMB Sơn La · dữ liệu mẫu ẩn danh");
  await h.phuDe("Hồ sơ hộ → <b>Tính toán, giải trình</b>: mỗi khoản có công thức và căn cứ", 300);
  await h.bam(nutBen(p, "Hồ sơ"));
  await h.bam(the(p, "Hộ, cá nhân"));
  await h.bam(p.locator("tr[data-ho-id]").first(), 1200);
  await h.bam(the(p, "Tính toán, giải trình"), 2600);
  await h.phuDe("Về <b>Tổng quan dự án</b> → Phương án – phiên bản → <b>Chốt phương án…</b>", 300);
  await h.bam(nutBen(p, "Hồ sơ"));
  await h.bam(the(p, "Tổng quan dự án"));
  await h.bam(p.getByRole("button", { name: "Chốt phương án…" }), 1400);
  const chot = p.locator("[role=dialog]", { hasText: "Chốt phương án" });
  await h.phuDe("Chọn hộ đủ điều kiện — hộ còn khoản <b>Thiếu căn cứ</b> không chốt được", 300);
  await h.den(chot.getByLabel("Chọn tất cả hộ đủ điều kiện"));
  await chot.getByLabel("Chọn tất cả hộ đủ điều kiện").check();
  await h.cho(1300);
  await h.phuDe("<b>Chốt, đóng băng số liệu</b> — bản phương án có mã băm, không sửa được", 300);
  await h.bam(chot.getByRole("button", { name: "Chốt, đóng băng số liệu" }), 1800);
  await h.phuDe("Có quyết định phê duyệt: bấm <b>Phê duyệt…</b>, nhập số, ngày quyết định", 300);
  await h.bam(p.getByRole("button", { name: "Phê duyệt…" }).first(), 1300);
  const pd = p.locator("[role=dialog]");
  const oSo = pd.locator("input[type=text], input:not([type])").first();
  if (await oSo.count()) await h.go(oSo, "125/QĐ-UBND");
  await h.bam(pd.getByRole("button", { name: "Ghi nhận phê duyệt" }), 1800);
  await h.phuDe("Phần mềm tính các hạn tiếp theo: gửi QĐ đến từng người, chi trả 30 ngày, QĐ thu hồi đất", 3200);
  await h.phuDe("Thẻ <b>Chi trả, kinh phí</b>: theo dõi chi trả theo bản đã phê duyệt, xuất Excel quyết toán", 300);
  await h.bam(the(p, "Chi trả, kinh phí"), 3000);
  await h.phuDe("", 0);
  await h.bia("PHẦN MỀM GPMB SƠN LA", "Tiếp theo: gửi số liệu lên tỉnh", "Video 3/3", 2400);
  await ket(h, "2-Lap-chot-phe-duyet-phuong-an");
}

// ---------------- Video 3: gửi tỉnh ----------------
if (!chiQuay || chiQuay === "3") {
  const h = await moi(trinh, "3");
  const { p } = h;
  await batDau(h);
  await h.bia("HƯỚNG DẪN THAO TÁC · 3/3", "Gửi số liệu lên tỉnh và tổng hợp toàn tỉnh", "Gói dữ liệu mã hóa cho khóa của tỉnh — chỉ tỉnh mở được");
  await h.bam(nutBen(p, "Gửi tỉnh, tổng hợp tỉnh"), 1200);
  await h.phuDe("<b>Cấp tỉnh</b> (làm một lần): tạo khóa cấp tỉnh, xuất khóa công khai gửi các xã", 300);
  await h.bam(p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }));
  await h.go(p.getByLabel("Tên đơn vị tổng hợp"), "Sở Nông nghiệp và Môi trường (minh họa)", 200);
  await p.getByLabel("Mật khẩu khóa mới").fill("MatKhauTinh2026");
  await p.getByLabel("Nhập lại mật khẩu khóa").fill("MatKhauTinh2026");
  await h.bam(p.getByRole("button", { name: "Tạo khóa cấp tỉnh" }), 1500);
  await h.bam(p.getByRole("button", { name: "Xuất khóa công khai gửi các xã" }), 1000);
  const khoa = await h.tep("Khoa-cong-khai_");
  await h.cho(600);
  await p.keyboard.press("Escape");
  await h.phuDe("<b>Cấp xã</b>: chọn tệp khóa của tỉnh, nhập tên đơn vị, chọn dự án → <b>Xuất gói gửi tỉnh</b>", 300);
  await h.bam(p.getByRole("tab", { name: "Gửi lên tỉnh (cấp xã)" }));
  await p.getByLabel("Chọn tệp khóa của tỉnh").setInputFiles(khoa);
  await h.cho(800);
  await h.go(p.getByLabel("Tên đơn vị gửi"), "UBND xã Chiềng Mung (minh họa)");
  await h.bam(p.getByRole("button", { name: /Xuất gói gửi tỉnh/ }), 1500);
  const goi = await h.tep("GPMB-gui-tinh_");
  await h.cho(600);
  await p.keyboard.press("Escape");
  await h.phuDe("Gửi tệp .gpmbtinh bằng thư, Zalo, USB hoặc cổng tỉnh — tệp đã mã hóa", 2600);
  await h.phuDe("<b>Tỉnh</b>: mở khóa bằng mật khẩu, chọn gói của các xã", 300);
  await h.bam(p.getByRole("tab", { name: "Tổng hợp tỉnh (cấp tỉnh)" }));
  await h.go(p.getByLabel("Mật khẩu khóa cấp tỉnh"), "MatKhauTinh2026", 200);
  await h.bam(p.getByRole("button", { name: "Mở khóa" }), 1200);
  await p.getByLabel("Chọn gói dữ liệu của xã").setInputFiles(goi);
  await h.cho(1500);
  await h.phuDe("Số liệu toàn tỉnh: tiến độ, khâu quá hạn, khiếu nại, cưỡng chế; xuất báo cáo Word, Excel", 300);
  await h.den(p.locator(".tht-chi-so").first());
  await h.cho(3500);
  await h.phuDe("", 0);
  await h.bia("PHẦN MỀM GPMB SƠN LA", "An toàn · Chính xác · Đúng quy định", "Tài liệu đầy đủ: Hướng dẫn sử dụng (Word, có ảnh) trong phần mềm", 3000);
  await ket(h, "3-Gui-so-lieu-len-tinh");
}
await trinh.close();
