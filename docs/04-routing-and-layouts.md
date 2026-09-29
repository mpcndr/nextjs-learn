# 04 — Routing & Layouts

## หลักการ: โฟลเดอร์ = URL

```
src/app/
├── layout.tsx              ห่อทุกหน้า
├── page.tsx                →  /
├── not-found.tsx           →  404 ของทั้งแอป
├── tasks/
│   ├── page.tsx            →  /tasks
│   ├── error.tsx           →  error boundary ของ /tasks/*
│   ├── actions.ts          →  (ไม่ใช่ route — แค่ไฟล์โค้ดวางไว้ใกล้ๆ)
│   └── [id]/
│       ├── page.tsx        →  /tasks/abc, /tasks/123, ...
│       └── not-found.tsx
├── api/tasks/route.ts      →  GET /api/tasks
└── lab/streaming/page.tsx  →  /lab/streaming
```

**กฎ**: โฟลเดอร์จะกลายเป็น URL ที่เข้าได้ ก็ต่อเมื่อมี `page.tsx` (หน้าเว็บ) หรือ `route.ts` (API)
ไฟล์อื่นในโฟลเดอร์ `app/` ไม่ถูกเปิดเป็น URL → วางโค้ดที่เกี่ยวข้องไว้ใกล้กันได้ (colocation)

## ไฟล์พิเศษ (File conventions)

| ไฟล์ | หน้าที่ | ต้องเป็น Client? |
| --- | --- | --- |
| `page.tsx` | UI ของ URL นั้น | ไม่ |
| `layout.tsx` | ห่อ page + ลูกทั้งหมด, **ไม่ re-render ตอนเปลี่ยนหน้า** | ไม่ |
| `loading.tsx` | UI ระหว่างรอ (= ห่อ page ด้วย `<Suspense>` ให้อัตโนมัติ) | ไม่ |
| `error.tsx` | UI เมื่อพัง (= React Error Boundary) | **ใช่** |
| `not-found.tsx` | UI เมื่อเรียก `notFound()` | ไม่ |
| `route.ts` | API endpoint (GET/POST/…) | — |

## ลำดับการซ้อน (สำคัญมาก)

เมื่อเปิด `/tasks/abc` Next.js ประกอบ tree แบบนี้:

```tsx
<RootLayout>                         {/* app/layout.tsx */}
  <ErrorBoundary fallback={<TasksError/>}>   {/* app/tasks/error.tsx */}
    <NotFoundBoundary fallback={<TaskNotFound/>}>  {/* app/tasks/[id]/not-found.tsx */}
      <TaskPage params={...} />      {/* app/tasks/[id]/page.tsx */}
    </NotFoundBoundary>
  </ErrorBoundary>
</RootLayout>
```

ผลที่ตามมา:
- error ใน `/tasks/abc` ถูกจับโดย `tasks/error.tsx` → **header/nav ใน root layout ยังอยู่**
- `error.tsx` จับ error ของ layout ในโฟลเดอร์เดียวกัน**ไม่ได้** (มันอยู่ข้างในของ layout) ต้องไปวางไว้ระดับพ่อ

## Layout ไม่ re-render ตอนเปลี่ยนหน้า

คลิกจาก `/tasks` ไป `/lab/boundary` → เฉพาะส่วน `{children}` เปลี่ยน
`RootLayout` (header, nav) ไม่ถูกสร้างใหม่ → state ใน layout (เช่น sidebar ที่เปิดอยู่) คงอยู่

## Dynamic Route

```tsx
// src/app/tasks/[id]/page.tsx
export default function TaskPage({ params }: PageProps<"/tasks/[id]">) { ... }
async function TaskDetail({ params }) {
  const { id } = await params;    // params เป็น Promise!
}
```

- `PageProps<"/tasks/[id]">` เป็น type ที่ Next.js **สร้างให้อัตโนมัติ** จากโครงสร้างโฟลเดอร์ (`next typegen`)
  พิมพ์ path ผิด → TypeScript ฟ้องทันที
- รูปแบบอื่น: `[...slug]` (จับหลาย segment: `/docs/a/b/c`), `[[...slug]]` (optional)

## Search Params (query string)

```tsx
// /lab/error?crash=1
export default function Page({ searchParams }: PageProps<"/lab/error">) {
  // searchParams: Promise<{ crash?: string | string[] }>
}
```

**หลักคิด**: state ที่ควร "แชร์ลิงก์ได้" (filter, หน้าที่, คำค้น) → เก็บใน URL ไม่ใช่ `useState`

## การเปลี่ยนหน้า: `<Link>`

```tsx
<Link href={`/tasks/${task.id}`}>{task.title}</Link>
```

- ไม่ reload ทั้งหน้า — ดึงแค่ส่วนที่เปลี่ยน (RSC payload, บท 13)
- **Prefetch** อัตโนมัติเมื่อลิงก์โผล่ใน viewport → คลิกแล้วแทบจะทันที
- เปลี่ยนหน้าด้วยโค้ด: `useRouter().push()` (client) หรือ `redirect()` (server)

## Route Groups & อื่นๆ (รู้ไว้)

- `(marketing)/about/page.tsx` → URL คือ `/about` (วงเล็บ = จัดกลุ่มโดยไม่เพิ่ม URL, ใช้แยก layout)
- `_components/` → ขีดล่างนำหน้า = private folder ไม่ใช่ route
- `@modal/` (parallel routes) และ `(.)photo/` (intercepting routes) — ใช้ทำ modal ที่มี URL

## Metadata

```tsx
export const metadata: Metadata = { title: "Tasks" };
// root layout ตั้ง template: "%s · Next.js Learn" → title จริงคือ "Tasks · Next.js Learn"
```

ข้อมูล dynamic ใช้ `export async function generateMetadata({ params })`

## แบบฝึกหัด

1. สร้างหน้า `/about` ที่มี metadata title "เกี่ยวกับ" แล้วเพิ่มลิงก์ใน nav
2. สร้าง `src/app/tasks/loading.tsx` แล้วลองใส่ `await new Promise(r => setTimeout(r, 2000))` ใน `getTasks` — เห็นอะไร?
   (ลบ `'use cache'` ออกชั่วคราวด้วย มิฉะนั้นผลจะถูก cache) — **อย่าลืมคืนค่า**
3. เพิ่ม `generateMetadata` ให้ `/tasks/[id]` เพื่อให้ title ของ tab เป็นชื่องาน
4. ทำไมใน nav ต้องแยก `NavLink` เป็น Client Component แต่ `RootLayout` ไม่ต้อง?
