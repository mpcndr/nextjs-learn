# 02 — JavaScript / TypeScript ที่ต้องแม่นก่อนเขียน Next.js

ไม่ต้องรู้ทุกอย่าง แต่ 7 เรื่องนี้โผล่ในทุกไฟล์ของ Next.js ถ้าไม่แม่นจะอ่านโค้ดไม่ออก

## 1. Module: `import` / `export`

```ts
// src/lib/tasks/stats.ts
export function summarize(...) {}          // named export

// ที่อื่น
import { summarize } from "@/lib/tasks/stats";   // "@/" = src/ (ตั้งใน tsconfig.json → paths)
```

- Next.js ใช้ **default export** เป็น "สัญญา" ของไฟล์พิเศษ: `export default function Page()` ใน `page.tsx`
- ทุกไฟล์คือ module — ตัวแปรใน module ไม่รั่วไปที่อื่นถ้าไม่ export
- **Module graph** สำคัญมากใน Next.js: `"use client"` ทำงานระดับ module (บท 05)

## 2. Destructuring & spread

```ts
const { id } = await params;                      // ดึง property ออกจาก object
const [state, formAction, pending] = useActionState(...); // ดึงจาก array ตามตำแหน่ง
const copy = { ...task };                         // copy แบบตื้น (shallow)
<ActiveAwareLink {...props} />                    // ส่ง props ทั้งก้อน
```

## 3. Promise และ async/await — สำคัญที่สุด

```ts
// Promise = "ค่าที่จะมาในอนาคต"
const p: Promise<Task[]> = taskRepo.list();

// await = "หยุดรอจนค่ามา" (ใช้ได้ใน async function เท่านั้น)
async function load() {
  const tasks = await taskRepo.list();
}
```

### รอทีละอัน vs รอพร้อมกัน

```ts
// ❌ Waterfall: รวม 2 วินาที
const a = await getA(); // 1s
const b = await getB(); // 1s

// ✅ Parallel: รวม 1 วินาที
const [a, b] = await Promise.all([getA(), getB()]);
```

ใน Next.js 15+ `params`, `searchParams`, `cookies()`, `headers()` เป็น **Promise** ทั้งหมด
เพราะมันคือข้อมูลที่ "ยังไม่มี" จนกว่าจะมี request จริง (ดู `src/app/tasks/[id]/page.tsx`)

## 4. Closure

```ts
const deleteThis = deleteTask.bind(null, task.id);
// หรือ
<form action={async () => { await toggleTask(id); }}>   // ฟังก์ชันนี้ "จำ" id ไว้
```

ฟังก์ชันจำตัวแปรจาก scope ที่มันถูกสร้างได้ — ใช้บ่อยมากใน event handler และ action

## 5. Immutability — อย่าแก้ของเดิม สร้างของใหม่

```ts
// ❌ React จะไม่รู้ว่ามีอะไรเปลี่ยน
tasks.push(newTask);
setTasks(tasks);

// ✅
setTasks([...tasks, newTask]);
```

ดู `src/lib/tasks/repository.ts` — ทุก method คืน `{ ...task }` (copy) ไม่ใช่ตัวจริงที่เก็บไว้
และมีเทสต์พิสูจน์ใน `tests/unit/repository.test.ts`

## 6. TypeScript พื้นฐานที่ใช้ในโปรเจกต์นี้

```ts
type Task = { id: string; title: string; done: boolean };   // รูปร่างของข้อมูล
type Status = "idle" | "success" | "error";                  // union: เป็นได้แค่ 3 ค่านี้
function f(t: Pick<Task, "done">) {}                         // เอาแค่บาง field
interface TaskRepository { list(): Promise<Task[]> }         // สัญญาว่า "ต้องมี method อะไร"
type Task = z.infer<typeof taskSchema>;                      // ดึง type จาก zod schema
```

**Type กับ Runtime validation คนละเรื่องกัน!**
TypeScript ตรวจตอนเขียนโค้ดเท่านั้น — ตอนรันจริง type หายหมด
ข้อมูลจากผู้ใช้/ภายนอกต้อง validate ตอน runtime ด้วย (เราใช้ `zod` ใน `src/lib/tasks/schema.ts`)

## 7. Serializable คืออะไร

ข้อมูลที่แปลงเป็นข้อความแล้วแปลงกลับได้ครบ (เหมือน JSON): string, number, boolean, null, array, plain object, Date*, Map*, …
**ส่งไม่ได้**: function (ยกเว้น Server Action), class instance, Symbol

ทำไมสำคัญ? เพราะ props ที่ Server Component ส่งให้ Client Component ต้องข้ามเครือข่าย
นั่นคือเหตุผลที่ `Task.createdAt` เก็บเป็น ISO string แทน `Date` object

## แบบฝึกหัด

1. เขียนฟังก์ชัน `sleep(ms)` ที่คืน Promise แล้วลองวัดเวลา sequential vs `Promise.all` ด้วย `console.time`
2. อ่าน `src/lib/tasks/schema.ts` แล้วตอบ: ถ้าส่ง `{ title: 123 }` ให้ `createTaskInput.safeParse` จะได้อะไร? ลองเขียนเทสต์พิสูจน์ใน `tests/unit/schema.test.ts`
3. ทำไม `createInMemoryTaskRepository` รับ `now` และ `newId` เป็น parameter? (คำใบ้: ดูเทสต์)
