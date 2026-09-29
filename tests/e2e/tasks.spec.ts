import { expect, test } from "@playwright/test";

test.describe("Tasks", () => {
  test("เพิ่มงานใหม่แล้วเห็นในรายการ", async ({ page }) => {
    const title = `งานจาก e2e ${Date.now()}`;
    await page.goto("/tasks");

    await page.getByLabel("งานใหม่").fill(title);
    await page.getByRole("button", { name: "เพิ่ม" }).click();

    await expect(page.getByRole("status")).toContainText(title);
    await expect(page.getByRole("list", { name: "รายการงาน" })).toContainText(title);
    await expect(page.getByLabel("งานใหม่")).toHaveValue(""); // ฟอร์มเคลียร์ตัวเอง
  });

  test("แสดง error เมื่อชื่องานว่าง", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: "เพิ่ม" }).click();
    // Next.js มี <div role="alert"> ของตัวเอง (route announcer) → กรองด้วยข้อความ
    await expect(page.getByRole("alert").filter({ hasText: "กรุณาใส่ชื่องาน" })).toBeVisible();
  });

  test("สลับสถานะงาน และสถานะยังอยู่หลัง reload", async ({ page }) => {
    const title = `toggle ${Date.now()}`;
    await page.goto("/tasks");
    await page.getByLabel("งานใหม่").fill(title);
    await page.getByRole("button", { name: "เพิ่ม" }).click();

    const checkbox = page.getByRole("checkbox", { name: `สลับสถานะ ${title}` });
    await expect(checkbox).toHaveAttribute("aria-checked", "false");
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-checked", "true");

    await page.reload(); // พิสูจน์ว่า server บันทึกจริง ไม่ใช่แค่ optimistic
    await expect(page.getByRole("checkbox", { name: `สลับสถานะ ${title}` })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("เปิดหน้ารายละเอียดแล้วลบงาน", async ({ page }) => {
    const title = `ลบ ${Date.now()}`;
    await page.goto("/tasks");
    await page.getByLabel("งานใหม่").fill(title);
    await page.getByRole("button", { name: "เพิ่ม" }).click();

    await page.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

    await page.getByRole("button", { name: "ลบงานนี้" }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole("list", { name: "รายการงาน" })).not.toContainText(title);
  });

  test("id ที่ไม่มีอยู่ แสดงหน้า not found", async ({ page }) => {
    await page.goto("/tasks/does-not-exist");
    await expect(page.getByRole("heading", { name: "ไม่พบงานนี้" })).toBeVisible();
  });
});

test.describe("Platform features", () => {
  test("API คืน JSON", async ({ request }) => {
    const res = await request.get("/api/tasks");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body.tasks)).toBe(true);
  });

  test("proxy redirect /todo → /tasks และติด x-request-id", async ({ page }) => {
    const res = await page.goto("/todo");
    await expect(page).toHaveURL(/\/tasks$/);
    expect(res?.headers()["x-request-id"]).toBeTruthy();
  });

  test("error boundary จับ error ได้โดยไม่พังทั้งแอป", async ({ page }) => {
    await page.goto("/lab/error?crash=1");
    await expect(page.getByText("Error boundary จับได้!")).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible(); // layout ยังอยู่
  });

  test("streaming: เนื้อหาช้าทยอยตามมา", async ({ page }) => {
    await page.goto("/lab/streaming");
    await expect(page.getByText(/ข้อมูลช้า มาถึงหลัง/)).toBeVisible({ timeout: 10_000 });
  });
});
