# 07 — Caching & Rendering ★

บทนี้ยากที่สุดและเปลี่ยนบ่อยที่สุดในประวัติ Next.js — แต่ใน Next.js 16 (Cache Components) มันเรียบง่ายขึ้นมาก

## โมเดลความคิด: ทุกส่วนของหน้าเป็น 1 ใน 3 ประเภท

| ประเภท | ตัวอย่าง | สร้างเมื่อไร | เขียนยังไง |
| --- | --- | --- | --- |
| **Static** | หัวข้อ, เมนู, ข้อความคงที่ | ตอน build | เขียนปกติ (ไม่มี async I/O) |
| **Cached** | รายการงาน, บทความ, สินค้า | ตอน build/ครั้งแรก แล้วใช้ซ้ำจนหมดอายุ | `'use cache'` |
| **Dynamic** | ข้อมูลผู้ใช้, cookie, ของที่ต้องสดทุกครั้ง | ทุก request | ห่อ `<Suspense>` |

Next.js จะรวม Static + Cached เป็น **Static Shell** (HTML สำเร็จรูป ส่งได้ทันที)
แล้ว stream ส่วน Dynamic ตามมาทีหลัง → นี่คือ **Partial Prerendering (PPR)** สัญลักษณ์ `◐` ตอน build

```
┌──────────────────────────────────────────┐
│ header / nav                    [static]  │ ─┐
│ ┌──────────────────────────────────────┐ │  │ Static Shell:
│ │ รายการงาน           [cached 'use cache']│ │  │ ส่งทันทีจาก CDN/cache
│ └──────────────────────────────────────┘ │  │
│ ┌──────────────────────────────────────┐ │ ─┘
│ │ ⏳ fallback  → ข้อมูลของคุณ   [dynamic] │ │ ← stream ตามมาตอน request
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## เปิดใช้งาน

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true };
```

หลักการของโหมดนี้: **ไม่มีอะไรถูก cache โดยที่คุณไม่ได้สั่ง** (explicit)
— ต่างจาก Next.js 13–14 ที่ cache `fetch` ให้เองอัตโนมัติจนคนงงว่าทำไมข้อมูลไม่อัปเดต

## `'use cache'` + `cacheLife` + `cacheTag`

```ts
// src/lib/tasks/queries.ts
export async function getTasks() {
  "use cache";              // ผลลัพธ์ของฟังก์ชันนี้เก็บไว้ใช้ซ้ำได้
  cacheLife("hours");       // อายุ: stale 5 นาที, revalidate ทุก 1 ชม., หมดอายุ 1 วัน
  cacheTag(TASKS_TAG);      // แปะป้าย "tasks" ไว้สั่งล้างทีหลัง
  return taskRepo.list();
}
```

- **Cache key** = ตัวฟังก์ชัน + arguments ทั้งหมด → `getTask("a")` กับ `getTask("b")` เก็บคนละช่อง
- ใช้ได้ทั้งระดับ **ข้อมูล** (ฟังก์ชัน) และระดับ **UI** (ใส่ใน component หรือ page ทั้งอัน)
- arguments และค่าที่คืนต้อง serializable

### ความหมายของ `cacheLife`

| ค่า | ความหมาย |
| --- | --- |
| `stale` | browser ใช้ของเดิมได้เลยโดยไม่ถาม server นานเท่านี้ |
| `revalidate` | หลังจากนี้ server ยังส่งของเก่าให้ แต่แอบสร้างของใหม่เบื้องหลัง (stale-while-revalidate) |
| `expire` | เกินนี้ต้องรอสร้างใหม่ (ไม่ส่งของเก่าแล้ว) |

ตอน build จะเห็นคอลัมน์ `Revalidate 1h  Expire 1d` ข้าง `/tasks` — มาจาก `cacheLife("hours")` นี่เอง

## ล้าง cache หลังแก้ข้อมูล

```ts
// src/app/tasks/actions.ts
const task = await taskRepo.create(parsed.data.title);
updateTag(TASKS_TAG);          // ล้างทันที ผู้ใช้เห็นของใหม่ใน response นี้เลย
```

| ฟังก์ชัน | ใช้ที่ไหน | พฤติกรรม | เหมาะกับ |
| --- | --- | --- | --- |
| `updateTag(tag)` | Server Action เท่านั้น | หมดอายุทันที (read-your-own-writes) | ผู้ใช้แก้ของตัวเองแล้วต้องเห็นทันที |
| `revalidateTag(tag, "max")` | Action / Route Handler | stale-while-revalidate | webhook จาก CMS, ของที่ช้าได้นิดหน่อย |
| `revalidatePath(path)` | Action / Route Handler | ล้างทั้ง path | ไม่รู้ว่าใช้ tag อะไร |
| `refresh()` | Server Action | refresh router ฝั่ง client (ไม่ล้าง tag) | ข้อมูลไม่ได้ cache อยู่แล้ว |

**หลักคิด**: ตั้งชื่อ tag ตาม "ข้อมูล" ไม่ใช่ตาม "หน้า"
— `tasks`, `task:abc` ไม่ใช่ `tasks-page` เพราะข้อมูลเดียวอาจโผล่หลายหน้า (หน้า list, หน้า detail, API)

## ข้อมูลที่ต้องสดเสมอ: `<Suspense>` + runtime API

```tsx
// src/app/lab/streaming/page.tsx
async function Slow() {
  await connection();   // "รอ request จริงก่อน ห้าม prerender ส่วนนี้"
  ...
}
```

อะไรนับเป็น runtime (ต้องอยู่ใน Suspense ถ้าไม่ได้ cache):
`cookies()`, `headers()`, `params`, `searchParams`, `connection()`,
และ hook ฝั่ง client ที่อ่าน URL: `usePathname()`, `useSearchParams()`, `useParams()`

ถ้าลืม → `npm run build` จะ fail พร้อมบอกวิธีแก้ ซึ่งดีมาก: **พลาดตอน build ดีกว่าพลาดใน production**

## กรณีศึกษาจริง: build พังเพราะ `usePathname`

ตอนสร้าง repo นี้ `NavLink` เดิมเขียนแบบนี้:

```tsx
"use client";
export function NavLink({ href, children }) {
  const pathname = usePathname();
  ...
}
```

แล้ว `npm run build` พัง:

```
Error: Route "/tasks/[id]": Next.js encountered URL data `usePathname()` in a Client
Component outside of `<Suspense>`. This blocks prerendering because the value is only
available at runtime.

Ways to fix this:
  - [stream] Wrap the component in `<Suspense fallback={...}>` ...
  - [block] Set `export const instant = false` to allow a blocking route
```

**วิเคราะห์**: `/tasks/[id]` เป็น dynamic route — ตอน build ยังไม่รู้ว่า URL จริงคืออะไร
แต่ `NavLink` อยู่ใน root layout ซึ่งเป็นส่วนหนึ่งของ static shell ของ**ทุก**หน้า
Next.js จึงถามว่า "ระหว่างที่ยังไม่รู้ URL จะให้แสดงอะไร?"

**แก้**: ให้ fallback เป็นลิงก์แบบไม่ไฮไลต์ ดู `src/components/nav-link.tsx`

```tsx
<Suspense fallback={<Link href={href} className={base}>{children}</Link>}>
  <ActiveAwareLink {...props} />
</Suspense>
```

บทเรียน: **error message ของ Next.js 16 คือครู** อ่านให้จบแล้วมันจะบอกทั้งสาเหตุและทางแก้

## Cache หลายชั้นในระบบจริง (ภาพรวม)

```
Browser ──▶ CDN ──▶ Next.js server ──▶ 'use cache' ──▶ Database
  │          │          │                  │
  │          │          │                  └─ ผลของฟังก์ชัน (cacheLife/cacheTag)
  │          │          └─ static shell ที่ prerender ไว้
  │          └─ HTML/asset ตาม Cache-Control header
  └─ Router cache (หน้าที่เคยเข้า/prefetch ไว้, คุมด้วย stale)
```

เมื่อ "ข้อมูลไม่อัปเดต" ให้ไล่ถามทีละชั้นจากขวาไปซ้าย

## ⚠️ ข้อควรระวังของ in-memory cache

`'use cache'` เก็บใน memory ของ process โดยปริยาย ถ้า deploy แบบ serverless หรือหลาย instance
แต่ละตัวจะมี cache ของตัวเอง → ต้องใช้ `'use cache: remote'` หรือ cache handler ภายนอก (Redis ฯลฯ)
repo นี้เก็บ **ข้อมูล** ใน memory ด้วย จึงเหมาะกับการเรียนเท่านั้น (production ต้องใช้ database จริง)

## แบบฝึกหัด

1. ลบ `updateTag(TASKS_TAG)` ใน `createTask` → `npm run build && npm start` → เพิ่มงาน → เห็นไหม? reload แล้วเห็นไหม? อธิบาย
2. เปลี่ยน `cacheLife("hours")` เป็น `cacheLife("seconds")` → build → ดูว่าสัญลักษณ์ของ `/tasks` เปลี่ยนไหม (อ่าน doc ของ cacheLife เรื่อง short-lived cache)
3. ลบ `<Suspense>` ใน `nav-link.tsx` ออก → build → อ่าน error ด้วยตัวเอง → คืนค่า
4. ทำไม `getTask` ติด tag 2 อัน (`tasks` และ `task:<id>`)? `toggleTask` จำเป็นต้องล้างทั้งคู่ไหม?
