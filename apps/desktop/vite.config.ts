import { createReadStream, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const goc = (goi: string) => dirname(require.resolve(`${goi}/package.json`));

/**
 * OCR chạy trên máy: đóng gói bộ nhận dạng Tesseract (WebAssembly) và dữ liệu tiếng Việt vào /ocr/
 * từ node_modules — không tải gì từ Internet khi chạy, không đưa tệp nhị phân vào kho mã.
 */
const TEP_OCR: Record<string, string> = {
  "worker.min.js": join(goc("tesseract.js"), "dist/worker.min.js"),
  ...Object.fromEntries(
    ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"].map((f) => [f, join(goc("tesseract.js-core"), f)]),
  ),
  "vie.traineddata.gz": join(goc("@tesseract.js-data/vie"), "4.0.0_best_int/vie.traineddata.gz"),
};

function ocrTaiNguyen(): Plugin {
  return {
    name: "gpmb-ocr",
    configureServer(server) {
      server.middlewares.use("/ocr/", (req, res, next) => {
        const f = TEP_OCR[(req.url ?? "").replace(/^\//, "").split("?")[0]!];
        if (!f) return next();
        res.setHeader("Content-Type", f.endsWith(".js") ? "text/javascript" : "application/octet-stream");
        createReadStream(f).pipe(res);
      });
    },
    generateBundle() {
      for (const [ten, f] of Object.entries(TEP_OCR)) this.emitFile({ type: "asset", fileName: `ocr/${ten}`, source: readFileSync(f) });
    },
  };
}

// Tauri: cổng cố định, không xóa màn hình để thấy lỗi Rust
export default defineConfig({
  plugins: [react(), ocrTaiNguyen()],
  clearScreen: false,
  server: { port: 5173, strictPort: true, fs: { allow: ["../.."] } },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
});
