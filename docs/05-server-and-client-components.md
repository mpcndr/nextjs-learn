# 05 — Server vs Client Components ★ (หัวใจของ Next.js สมัยใหม่)

ถ้าเข้าใจบทนี้จริง จะอ่านโค้ด Next.js ทุกโปรเจกต์ออก

## นิยาม

| | Server Component (ค่าเริ่มต้น) | Client Component (`"use client"`) |
| --- | --- | --- |
| รันที่ไหน | server เท่านั้น (ตอน build หรือตอน request) | server (สร้าง HTML แรก) **และ** browser |
| โค้ดถูกส่งไป browser ไหม | ❌ ไม่เลย | ✅ ส่ง |
| `async/await` ใน component | ✅ | ❌ |
| อ่าน DB, file, secret env | ✅ | ❌ |
| `useState`, `useEffect`, hooks | ❌ | ✅ |
| `onClick`, `onChange` | ❌ | ✅ |
| `window`, `localStorage` | ❌ | ✅ (ใน effect/handler) |

> ⚠️ ความเข้าใจผิดอันดับ 1: "Client Component รันแค่ใน browser"
> **ผิด** — Client Component ก็ถูก render เป็น HTML บน server ด้วย (เพื่อให้เห็นเนื้อหาทันที)
> แล้วค่อยถูก **hydrate** ใน browser ให้กดได้ ดังนั้นห้ามแตะ `window` ตรงๆ ตอน render

## `"use client"` คือ "ประตู" ไม่ใช่ป้ายติดทีละ component

```tsx
"use client";               // ← ประกาศที่บนสุดของไฟล์
import { useState } from "react";
import { helper } from "./helper";   // helper ก็จะกลายเป็นโค้ดฝั่ง client ด้วย!
export function Counter() { ... }
```

`"use client"` ทำงานระดับ **module graph**: ไฟล์นี้ + ทุกอย่างที่ไฟล์นี้ import → ถูก bundle ไป browser
จึงควรวางประตูนี้ให้ **ลึกที่สุด (ใกล้ใบไม้ที่สุด) เท่าที่ทำได้**

```
RootLayout (server)
└── header (server)
    └── NavLink  ← "use client" แค่ตรงนี้ เพราะต้องใช้ usePathname
                    ไม่ใช่ประกาศทั้ง layout
```

ดู `src/app/layout.tsx` กับ `src/components/nav-link.tsx`

## วิธีตัดสินใจ (ใช้ได้ทุกครั้ง)

```
component นี้ต้องการ...
  ├─ state / effect / event handler / browser API?  ── ใช่ ──▶ Client
  └─ ไม่                                            ────────▶ Server (ค่าเริ่มต้น)

ถ้าเป็น Client แต่มีส่วนใหญ่ที่ไม่ต้อง interactive?
  └─▶ แยกเฉพาะส่วนที่ interactive ออกมาเป็น Client ตัวเล็ก
```

ตัวอย่างในแอป Tasks — `src/app/tasks/page.tsx`:

```tsx
export default async function TasksPage() {       // Server: ดึงข้อมูล
  const tasks = await getTasks();
  return (
    <>
      <TaskSummary tasks={tasks} />               // Server: แค่แสดงผล
      <TaskForm />                                // Client: ต้องใช้ useActionState
      {tasks.map((task) => (
        <li>
          <TaskToggle id={...} done={...} />      // Client: ต้องใช้ useOptimistic
          <Link href=...>{task.title}</Link>      // Server
        </li>
      ))}
    </>
  );
}
```

JS ที่ browser ได้รับ = แค่ `TaskForm` + `TaskToggle` + `Link` ไม่ใช่ทั้งหน้า

## กฎการซ้อน 3 ข้อ

### 1. Server → Client: ส่ง props ได้ แต่ต้อง serializable

```tsx
<TaskToggle id={task.id} title={task.title} done={task.done} />   // ✅ string, boolean
<TaskToggle task={task} onChange={() => {}} />                    // ❌ ส่ง function ธรรมดาไม่ได้
<TaskForm action={createTask} />                                   // ✅ Server Action ส่งได้ (พิเศษ)
```

เหตุผล: props ต้องข้ามจาก server ไป browser ผ่านเครือข่าย

### 2. Client import Server Component ไม่ได้

```tsx
"use client";
import { ServerOnlyInfo } from "./server-only-info";   // ❌ จะกลายเป็น client ไปด้วย (และพังถ้าใช้ของ server)
```

### 3. แต่ Client **รับ** Server Component ผ่าน `children`/props ได้ ✅

```tsx
// src/app/lab/boundary/page.tsx (Server)
<Collapsible title="ข้อมูลจาก server">   {/* Client */}
  <ServerOnlyInfo />                    {/* Server — render บน server เสร็จแล้วค่อยเสียบเข้าช่อง */}
</Collapsible>
```

นี่คือ pattern สำคัญที่สุดของบทนี้: **Client เป็น "กรอบ" ที่ interactive, Server เป็น "ไส้" ที่หนัก**
ใช้บ่อยกับ: Modal, Tabs, Accordion, Context Provider

```tsx
// Pattern: Provider ที่ต้องเป็น client แต่ไม่ทำให้ทั้งแอปเป็น client
// app/providers.tsx
"use client";
export function ThemeProvider({ children }) { ... }

// app/layout.tsx (server)
<ThemeProvider>{children}</ThemeProvider>   // children ยังเป็น Server Component ได้
```

## ป้องกันความลับรั่ว: `server-only`

```ts
// src/lib/tasks/queries.ts
import "server-only";
```

ถ้ามีใครเผลอ import ไฟล์นี้ใน Client Component → **build fail ทันที** (ดีกว่าไปรู้ตอน secret หลุด)
Environment variable ที่ไม่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะไม่ถูกส่งไป browser อยู่แล้ว (บท 09)

## ทดลอง

1. เปิด `/lab/boundary` → DevTools → Sources → ค้นหา "Platform" (ข้อความใน `ServerOnlyInfo`)
   จะไม่เจอในไฟล์ JS ใดๆ เพราะโค้ดนี้ไม่เคยถูกส่งไป
2. ลองเพิ่ม `useState` ใน `TaskSummary` โดยไม่ใส่ `"use client"` → อ่าน error
3. ลองย้าย `import { ServerOnlyInfo }` ไปไว้ในไฟล์ `collapsible.tsx` แล้วใช้ตรงๆ → เกิดอะไร?
   (`process.platform` ใน browser จะเป็นอะไร?)

## สรุปเป็นประโยคเดียว

> **ทุกอย่างเป็น Server Component จนกว่าจะต้องการ interactivity แล้วค่อยเปิด "ประตู" `"use client"` ให้เล็กและลึกที่สุด**

## แบบฝึกหัด

1. วาด tree ของหน้า `/tasks` ระบายสี server (สีเทา) กับ client (สีฟ้า)
2. เพิ่มปุ่ม "ซ่อนงานที่เสร็จแล้ว" ในหน้า `/tasks` — ออกแบบก่อนว่าจะทำเป็น client ทั้งหน้า
   หรือเก็บใน URL (`?hide=done`) แล้วให้ server กรอง? แบบไหนดีกว่า เพราะอะไร?
3. ทำไม `TaskSummary` ไม่มี `"use client"` แต่ถ้าถูก import ใน Client Component ก็ยังใช้งานได้?
