# 11 — Testing

เทสต์ไม่ได้มีไว้ "พิสูจน์ว่าโค้ดถูก" แต่มีไว้ให้คุณ **กล้าแก้โค้ด** — และเป็นเงื่อนไขของ CI/CD (บท 12)

## Testing Pyramid ของโปรเจกต์นี้

```
          ▲  ช้า, แพง, มั่นใจสูง
         ╱ ╲
        ╱E2E╲        tests/e2e/*.spec.ts        Playwright: browser จริง + build จริง
       ╱─────╲
      ╱Compo- ╲      tests/unit/*.test.tsx      Vitest + Testing Library: render component
     ╱  nent   ╲
    ╱───────────╲
   ╱    Unit     ╲   tests/unit/*.test.ts       Vitest: pure function, schema, repository
  ╱───────────────╲
  ▼  เร็ว, ถูก, เยอะ
```

| ชั้น | เทสต์อะไร | ตัวอย่าง | เวลา |
| --- | --- | --- | --- |
| Unit | logic ล้วน | `summarize`, `createTaskInput`, repository | ms |
| Component | component ที่ไม่ async | `<TaskSummary>` | ms |
| E2E | flow ของผู้ใช้ทั้งเส้น | เพิ่มงาน → เห็นในรายการ → reload ยังอยู่ | วินาที |

> **async Server Component** ยังเทสต์ด้วย unit test ได้ไม่ดีนัก (tool ยังตามไม่ทัน)
> → ให้ย้าย logic ออกมาเป็น pure function (unit test) แล้วครอบทั้งหน้าด้วย E2E
> นี่คืออีกเหตุผลที่การแบ่ง layer (บท 10) สำคัญ

## Unit test (Vitest)

```ts
// tests/unit/repository.test.ts
beforeEach(() => {
  n = 0;
  repo = createInMemoryTaskRepository({
    now: () => new Date(Date.UTC(2026, 0, 1, 0, n)),   // ควบคุมเวลาได้
    newId: () => `id-${++n}`,                          // ควบคุม id ได้
  });
});

it("create แล้ว list เจอ โดยงานใหม่สุดอยู่บนสุด", async () => {
  await repo.create("แรก");
  await repo.create("สอง");
  expect((await repo.list()).map((t) => t.title)).toEqual(["สอง", "แรก"]);
});
```

หลัก **AAA**: Arrange (เตรียม) → Act (ทำ) → Assert (ตรวจ)
เทสต์ที่ดี: **deterministic** (รันกี่ครั้งก็ได้ผลเดิม), **อิสระ** (ไม่พึ่งลำดับ), **ชื่อบอกพฤติกรรม**

```bash
npm test              # รันครั้งเดียว
npm run test:watch    # รันใหม่อัตโนมัติเมื่อแก้ไฟล์ (ใช้ตอนเขียนโค้ด)
```

## Component test (Testing Library)

```tsx
// tests/unit/task-summary.test.tsx
render(<TaskSummary tasks={[{ done: true }, { done: false }]} />);
expect(screen.getByText("เสร็จแล้ว 1 จาก 2 งาน (50%)")).toBeDefined();
expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
```

ปรัชญา: **เทสต์สิ่งที่ผู้ใช้เห็น ไม่ใช่ implementation**
หา element ด้วย role/label/text (แบบที่ผู้ใช้และ screen reader มองเห็น) ไม่ใช่ class/id
→ ได้ accessibility ที่ดีเป็นของแถม

## E2E test (Playwright)

```ts
// tests/e2e/tasks.spec.ts
test("สลับสถานะงาน และสถานะยังอยู่หลัง reload", async ({ page }) => {
  ...
  await checkbox.click();
  await expect(checkbox).toHaveAttribute("aria-checked", "true");
  await page.reload();          // พิสูจน์ว่า server บันทึกจริง ไม่ใช่แค่ optimistic
  ...
});
```

```bash
npm run build          # E2E เทสต์กับ production build เสมอ (ใกล้ของจริงที่สุด)
npm run test:e2e
npx playwright test --ui          # โหมด UI ดูทีละ step
npx playwright show-report        # ดู report หลังรัน
```

- `playwright.config.ts` สั่ง `next start` ให้อัตโนมัติ (`webServer`)
- `expect(...)` ของ Playwright **รอจนกว่าจะจริง** (auto-wait) ไม่ต้องใส่ `sleep`
- ใช้ชื่องานที่ไม่ซ้ำ (`Date.now()`) เพราะข้อมูลแชร์กันระหว่างเทสต์

### เรื่องจริงระหว่างสร้าง repo นี้

เทสต์ "แสดง error เมื่อชื่องานว่าง" พังครั้งแรกด้วย:

```
strict mode violation: getByRole('alert') resolved to 2 elements:
  1) <p role="alert" id="title-error">กรุณาใส่ชื่องาน</p>
  2) <div role="alert" id="__next-route-announcer__"></div>
```

Next.js มี element `role="alert"` ของตัวเองไว้ประกาศการเปลี่ยนหน้าให้ screen reader
แก้โดยกรองด้วยข้อความ: `page.getByRole("alert").filter({ hasText: "กรุณาใส่ชื่องาน" })`
บทเรียน: **locator ต้องเจาะจงพอ** และ Playwright strict mode ช่วยจับความกำกวมให้

## ต้องเทสต์อะไรบ้าง? (เกณฑ์ใช้งานจริง)

1. **กฎทางธุรกิจ** ทุกข้อ (validation, การคำนวณ) → unit
2. **Flow หลักที่ถ้าพังแล้วเสียเงิน/เสียผู้ใช้** (สมัคร, จ่ายเงิน, สร้างงาน) → E2E
3. **Bug ที่เคยเจอ** → เขียนเทสต์ที่ fail ก่อนแก้ แล้วแก้ให้ผ่าน (regression test)
4. ไม่ต้องไล่ coverage 100% — เทสต์ที่ไม่มีใครเชื่อถือแย่กว่าไม่มี

## แบบฝึกหัด

1. เขียนเทสต์ให้ `summarize` กรณีเสร็จทั้งหมด (100%)
2. `TaskForm` เทสต์ด้วย component test ยาก เพราะ import Server Action — ลองใช้ `vi.mock("@/app/tasks/actions", ...)` ดู
3. เพิ่ม E2E: สร้างงาน 2 อัน → ตรวจว่าอันที่สร้างทีหลังอยู่บนกว่า
4. แกล้งทำให้ `summarize` ปัดเศษผิด → รัน `npm test` ดูว่าเทสต์บอกอะไร
