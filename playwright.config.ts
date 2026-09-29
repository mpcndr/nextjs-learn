import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * E2E test = เปิด browser จริง คลิกจริง กับแอปที่ build แบบ production จริง
 * ต้อง `npm run build` ก่อน แล้ว Playwright จะสั่ง `next start` ให้เอง
 */
export default defineConfig({
  testDir: "tests/e2e",
  // ข้อมูลอยู่ใน memory ของ server ตัวเดียว → รันทีละไฟล์เพื่อไม่ให้เทสต์เหยียบกัน
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI, // กันเผลอ commit test.only ขึ้น CI
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry", // เทสต์พังบน CI → ดาวน์โหลด trace มาดูย้อนหลังได้ทีละ step
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // ถ้าเครื่องมี Chromium ติดตั้งไว้แล้ว (เช่น container) ชี้ไปตรงนั้นได้
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
