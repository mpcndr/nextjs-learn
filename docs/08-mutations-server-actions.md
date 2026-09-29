# 08 — Mutations & Server Actions

อ่านข้อมูล = Server Component (บท 06) / **เขียนข้อมูล = Server Action** (บทนี้)

## Server Action คืออะไร

ฟังก์ชัน async ที่อยู่บน server แต่ **เรียกจาก browser ได้เหมือนฟังก์ชันธรรมดา**

```ts
// src/app/tasks/actions.ts
"use server";                       // ทุก export ในไฟล์นี้เป็น Server Action
export async function toggleTask(id: string) { ... }
```

```tsx
// src/components/task-toggle.tsx  ("use client")
import { toggleTask } from "@/app/tasks/actions";
<form action={async () => { await toggleTask(id); }}>
```

เบื้องหลัง: Next.js แปลง import นั้นเป็น "reference" (ID) → ตอนเรียก browser ส่ง **HTTP POST** ไปที่ server
พร้อม ID ของ action + arguments → server รัน → ส่งผลลัพธ์ **และ UI ที่อัปเดตแล้ว** กลับมาใน round-trip เดียว

> 🔐 **กฎเหล็ก**: Server Action = public HTTP endpoint ใครก็ยิงได้ด้วย curl
> ต้อง **validate input** และ **เช็คสิทธิ์ (auth)** ในทุก action เสมอ อย่าเชื่อว่า "UI ซ่อนปุ่มแล้ว"

## สูตร 6 ขั้นของทุก action

```ts
export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  // 1. รับ input
  const raw = { title: String(formData.get("title") ?? "") };

  // 2. validate (ห้ามข้าม!)
  const parsed = createTaskInput.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };
  }

  // 3. auth: const user = await requireUser(); if (!canCreate(user)) ...   ← แอปจริงต้องมี

  // 4. แก้ข้อมูล
  const task = await taskRepo.create(parsed.data.title);

  // 5. ล้าง cache ที่เกี่ยวข้อง
  updateTag(TASKS_TAG);

  // 6. ตอบกลับ หรือ redirect
  return { status: "success", message: `เพิ่ม "${task.title}" แล้ว` };
}
```

ท่องให้ขึ้นใจ: **Input → Validate → Authorize → Mutate → Invalidate → Respond**

## ฟอร์มแบบ Progressive Enhancement

```tsx
// src/components/task-form.tsx
const [state, formAction, pending] = useActionState(createTask, initialFormState);

<form action={formAction}>
  <input name="title" defaultValue={state.values?.title} />
  <button disabled={pending}>{pending ? "กำลังบันทึก…" : "เพิ่ม"}</button>
  {state.fieldErrors?.title && <p role="alert">{state.fieldErrors.title[0]}</p>}
</form>
```

- `useActionState` ให้ 3 อย่าง: **state ล่าสุดที่ action คืน**, action ที่ห่อแล้ว, และ **pending**
- action จึงต้องรับ `(prevState, formData)` — prevState คือ state รอบก่อน
- เป็น `<form>` HTML จริง → **ถ้า JS ยังไม่โหลด ก็ยัง submit ได้** (browser POST ตรงๆ)
- React 19 **reset ฟอร์มให้อัตโนมัติ** หลัง action สำเร็จ → เราใช้ `defaultValue` + `key`
  เพื่อเติมค่าเดิมกลับตอน validation fail

### ทำไม validation error "return" แต่ไม่ "throw"?

- Error ที่ **คาดได้** (ผู้ใช้กรอกผิด) → return เป็นข้อมูล แสดงใต้ช่อง input
- Error ที่ **คาดไม่ได้** (DB ล่ม, bug) → throw ให้ `error.tsx` จัดการ

## ส่ง argument เพิ่ม: `.bind`

```tsx
// src/app/tasks/[id]/page.tsx (Server Component)
const deleteThis = deleteTask.bind(null, task.id);
<form action={deleteThis}><button>ลบงานนี้</button></form>
```

ค่า `task.id` ถูกผูกไปกับ action (Next.js เข้ารหัสค่าที่ bind ไว้) — แต่อย่าลืม: ผู้ไม่หวังดียังส่ง id อะไรก็ได้มาเอง ต้องเช็คสิทธิ์ใน action

## Optimistic UI

```tsx
// src/components/task-toggle.tsx
const [optimisticDone, setOptimisticDone] = useOptimistic(done);

<form action={async () => {
  setOptimisticDone(!optimisticDone);   // 1. เปลี่ยนจอทันที
  await toggleTask(id);                 // 2. ค่อยบอก server
}}>                                     // 3. server ส่งข้อมูลจริงกลับ → แทนที่ค่า optimistic
```

ถ้า server พัง ค่า optimistic หายไปเอง (กลับเป็น `done` จาก props) — ไม่ต้องเขียน rollback เอง
ใช้กับ action ที่ **สำเร็จเกือบทุกครั้ง** (like, toggle, reorder) ไม่ใช่การจ่ายเงิน

## `redirect` หลัง mutation

```ts
export async function deleteTask(id: string) {
  await taskRepo.remove(id);
  updateTag(TASKS_TAG);
  redirect("/tasks");     // throw ภายใน → โค้ดหลังนี้ไม่รัน; ล้าง cache "ก่อน" redirect เสมอ
}
```

## Server Action vs Route Handler

| | Server Action | Route Handler (`route.ts`) |
| --- | --- | --- |
| เรียกจาก | UI ของเราเอง | ใครก็ได้ (mobile, webhook, third-party) |
| Method | POST เท่านั้น | GET/POST/PUT/DELETE/… |
| Type-safe | ✅ import ฟังก์ชันตรงๆ | ❌ ต้องกำหนดสัญญาเอง |
| อัปเดต UI ใน round-trip เดียว | ✅ | ❌ |

## แบบฝึกหัด (ใหญ่ — ทำให้ได้!)

**เพิ่ม feature "แก้ไขชื่องาน"** ในหน้า `/tasks/[id]`

1. เพิ่ม `rename(id, title)` ใน `TaskRepository` + เทสต์ใน `repository.test.ts`
2. เพิ่ม `renameTaskInput` ใน `schema.ts` (reuse กฎเดียวกับ create — ทำยังไงไม่ให้ copy?)
3. เขียน action `renameTask` ตามสูตร 6 ขั้น (ล้าง tag ไหนบ้าง?)
4. สร้าง Client Component `RenameForm` ด้วย `useActionState`
5. เพิ่ม E2E test ใน `tests/e2e/tasks.spec.ts`
6. `npm run check && npm run build && npm run test:e2e` ต้องผ่านทั้งหมด

ลองยิง action ตรงๆ โดยไม่ผ่าน UI: DevTools → Network → กด toggle → คลิกขวา request → "Copy as cURL"
แล้วรันใน terminal — นี่คือเหตุผลที่ต้อง validate ทุกครั้ง
