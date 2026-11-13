import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/** ทดสอบทั้งระบบกับเซิร์ฟเวอร์ที่รันอยู่ (ฐานข้อมูลต้องว่าง เพราะคนแรกที่สมัครจะเป็นเจ้าของระบบ) */
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1360, height: 950 },
    launchOptions: existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {},
    trace: "off",
  },
});
