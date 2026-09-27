import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri: cổng cố định, không xóa màn hình để thấy lỗi Rust
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true, fs: { allow: ["../.."] } },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
});
