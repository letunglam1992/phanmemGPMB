/**
 * Kiểm thử giao diện (P1-9): chạy trên bản build (vite preview), Chromium. Trong CI: `npx playwright install chromium`;
 * trên máy có Chromium sẵn: đặt PW_CHROMIUM=<đường dẫn chrome>.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1536, height: 864 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "npx vite build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
