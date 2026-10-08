// Kiểm thử nối thật máy trạm (TypeScript) ↔ máy chủ mạng nội bộ Rust (D11, 1.0.6):
// dựng máy chủ thử (cargo run --example may_chu_thu) trong thư mục tạm, đọc vân tay chứng chỉ, chạy
// apps/desktop/test/mang-that.test.ts với GPMB_MAY_CHU, rồi tắt máy chủ. Chạy: node tools/kiem-may-chu.mjs [cổng]
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const goc = fileURLToPath(new URL("..", import.meta.url));
const cong = process.argv[2] ?? "18443";
const thuMuc = mkdtempSync(join(tmpdir(), "gpmb-may-chu-"));
const mayChu = spawn("cargo", ["run", "--quiet", "--example", "may_chu_thu", "--", thuMuc, cong], { cwd: join(goc, "apps/desktop/src-tauri"), stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" });
const tat = () => {
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(mayChu.pid), "/t", "/f"]);
    else mayChu.kill("SIGINT");
  } catch {
    /* bỏ qua */
  }
};
const vanTay = await new Promise((ok, loi) => {
  let ra = "";
  const hen = setTimeout(() => loi(new Error("Máy chủ thử không khởi động trong 15 phút")), 15 * 60_000);
  mayChu.stdout.on("data", (c) => {
    ra += String(c);
    const m = /VAN_TAY=([0-9A-F:]+)/.exec(ra);
    if (m) {
      clearTimeout(hen);
      ok(m[1]);
    }
  });
  mayChu.on("exit", (ma) => loi(new Error(`Máy chủ thử dừng (mã ${ma}) trước khi sẵn sàng`)));
}).catch((e) => {
  console.error(String(e));
  tat();
  process.exit(1);
});
console.log(`Máy chủ thử ở cổng ${cong}, vân tay ${vanTay}`);
const kt = spawn("npx", ["vitest", "run", "test/mang-that.test.ts"], { cwd: join(goc, "apps/desktop"), stdio: "inherit", env: { ...process.env, GPMB_MAY_CHU: `127.0.0.1:${cong}|${vanTay}` }, shell: process.platform === "win32" });
kt.on("exit", (ma) => {
  tat();
  try {
    rmSync(thuMuc, { recursive: true, force: true });
  } catch {
    /* tệp còn khóa trên Windows — bỏ qua */
  }
  process.exit(ma ?? 1);
});
