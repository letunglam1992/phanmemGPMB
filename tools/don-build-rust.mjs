/**
 * 1.3.1 (D1) — Dọn thư mục dựng Rust của bản dev/kiểm thử khi đĩa đầy: xóa bản dựng tăng dần (incremental) và ví dụ
 * của target/debug; không đụng target/release (bộ cài). Lần `cargo test` sau sẽ dựng lại phần đã xóa.
 *   node tools/don-build-rust.mjs [--het]   (--het: xóa cả target/debug)
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const goc = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "desktop", "src-tauri", "target", "debug");
const co = (p) => {
  let n = 0;
  const di = (x) => { const s = statSync(x, { throwIfNoEntry: false }); if (!s) return; if (s.isDirectory()) for (const c of readdirSync(x)) di(join(x, c)); else n += s.size; };
  di(p);
  return n;
};
if (!existsSync(goc)) {
  console.log("Không có target/debug — không cần dọn.");
  process.exit(0);
}
const muc = process.argv.includes("--het") ? [goc] : ["incremental", "examples"].map((x) => join(goc, x));
let tong = 0;
for (const m of muc) {
  if (!existsSync(m)) continue;
  const n = co(m);
  rmSync(m, { recursive: true, force: true });
  tong += n;
  console.log(`Đã xóa ${m} (${(n / 1073741824).toFixed(2)} GB)`);
}
console.log(`Tổng giải phóng: ${(tong / 1073741824).toFixed(2)} GB`);
