import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const IMG = path.join(__dirname, "..", "tests", "fixtures", "sample.jpg");

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.fill("#f-name", name);
  await page.fill("#f-email", email);
  await page.fill("#f-password", "password123");
  await page.click("button[type=submit]");
}

test("ตั้งแต่สมัครจนเห็นตัวเลขในรายงาน", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await register(owner, "เจ้าของ", "owner-e2e@example.com");
  await expect(owner).toHaveURL(/\/projects$/);
  await owner.fill("input[name=name]", "แบรนด์ทดสอบ");
  await owner.click('button:has-text("สร้างโปรเจกต์")');
  await expect(owner).toHaveURL(/\/settings$/);
  const base = new URL(owner.url()).pathname.replace(/\/settings$/, "");

  // สร้างคอนเทนต์พร้อมรูป
  await owner.goto(`${base}/content/new`);
  await owner.fill("#f-title", "รีวิวกันแดด ใช้จริง 7 วัน");
  await owner.selectOption("#f-format", "image");
  await owner.check("input[value=lemon8]");
  await owner.click('button:has-text("สร้างและเริ่มทำ")');
  await expect(owner).toHaveURL(/\/content\/[0-9a-f-]{36}$/);
  await owner.setInputFiles("input[type=file]", IMG);
  await expect(owner.locator("text=เสร็จแล้ว")).toBeVisible();

  await owner.goto(`${base}/library`);
  await expect(owner.locator(".t-cell .cover img")).toHaveCount(1);
  await owner.goto(`${base}/calendar`);
  await expect(owner.locator(".cal-chip .cover img")).toHaveCount(1);

  // ส่งอนุมัติ → อนุมัติ → เผยแพร่
  await owner.click(".cal-link");
  await owner.click('button:has-text("ส่งให้อนุมัติ")');
  await owner.click('button:has-text("อนุมัติ")');
  await owner.click('button:has-text("เผยแพร่ตอนนี้")');
  await owner.click('button:has-text("ยืนยันเผยแพร่")');
  await expect(owner.locator(".toast", { hasText: "เผยแพร่แล้ว" })).toBeVisible();

  // งานต้องโพสต์เอง → ปิดงานด้วยลิงก์ (Lemon8)
  await owner.goto(`${base}/approvals?tab=manual`);
  const lemon = owner.locator(".pub-row", { hasText: "Lemon8" });
  await lemon.locator("input[name=url]").fill("https://www.lemon8-app.com/p/123");
  await lemon.locator('button:has-text("โพสต์แล้ว")').click();
  await expect(owner.locator(".pub-row", { hasText: "Lemon8" })).toHaveCount(0);

  // กรอกตัวเลข → รายงาน
  await owner.goto(`${base}/reports`);
  await owner.locator('button:has-text("กรอกตัวเลข")').first().click();
  await owner.fill("input[name=views]", "4321");
  await owner.fill("input[name=likes]", "100");
  await owner.click(".metrics-form button[type=submit]");
  await owner.reload();
  await expect(owner.locator(".tile .k-val").first()).toHaveText("4,321");

  // คนที่สองสมัครแล้วเห็นหน้ารอแอดมิน
  const other = await (await browser.newContext()).newPage();
  await register(other, "คนใหม่", "new-e2e@example.com");
  await expect(other).toHaveURL(/\/waiting$/);
  await expect(other.locator("text=รอแอดมินเพิ่มคุณเข้าโปรเจกต์")).toBeVisible();
  await other.goto(base);
  await expect(other.locator("text=404")).toBeVisible();
});
