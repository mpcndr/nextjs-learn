# 09 — Error Handling, Proxy, Route Handlers, Environment Variables

ของที่ tutorial ส่วนใหญ่ข้าม แต่แอปจริงขาดไม่ได้

## 1. Error Handling — แบ่ง error เป็น 3 แบบ

| แบบ | ตัวอย่าง | จัดการยังไง |
| --- | --- | --- |
| **คาดได้** | กรอกฟอร์มผิด, ไม่มีสิทธิ์ | `return` เป็นข้อมูลจาก action / แสดงข้อความ |
| **ไม่พบ** | `/tasks/ไม่มีอยู่จริง` | `notFound()` → `not-found.tsx` |
| **คาดไม่ได้** | DB ล่ม, bug | `throw` → `error.tsx` ที่ใกล้ที่สุด |

### `error.tsx`

```tsx
// src/app/tasks/error.tsx
"use client";   // ต้องเป็น client เพราะมันคือ React Error Boundary (ใช้ state ภายใน)
export default function TasksError({ error, retry }) {
  useEffect(() => { console.error(error); }, [error]);   // ส่งไประบบ monitoring
  return <button onClick={() => retry()}>ลองใหม่</button>;
}
```

- `retry()` = ดึงข้อมูลใหม่แล้ว render ส่วนนั้นใหม่
- ใน production ข้อความ error จาก server **ถูกซ่อน** เหลือแค่ `digest` (hash) → กันข้อมูลลับรั่ว
  เอา digest ไปค้นใน server log
- `global-error.tsx` จับ error ของ root layout (กรณีเลวร้ายสุด)
- ทดลองที่ `/lab/error?crash=1`

### `notFound()`

```tsx
const task = await getTask(id);
if (!task) notFound();          // throw พิเศษ → หา not-found.tsx ใกล้ที่สุด
```

## 2. Proxy (ชื่อเดิม Middleware) — ด่านหน้าทุก request

```ts
// src/proxy.ts
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/todo") {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }
  const response = NextResponse.next();
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

**เหมาะ**: redirect/rewrite ตามเงื่อนไข, A/B test, เติม header, เช็คว่ามี session cookie ไหม (แบบคร่าวๆ)
**ไม่เหมาะ**: query DB, ตรวจสิทธิ์เต็มรูปแบบ — เพราะรันทุก request ต้องเร็วมาก
และ **ห้ามใช้ proxy เป็นด่านความปลอดภัยด่านเดียว** ต้องเช็คสิทธิ์ซ้ำใกล้ข้อมูลเสมอ (defense in depth)

redirect ง่ายๆ ที่ไม่ต้องมีเงื่อนไข ใช้ `redirects()` ใน `next.config.ts` แทนจะง่ายกว่า

## 3. Route Handlers — API แบบดั้งเดิม

```ts
// src/app/api/tasks/route.ts
export async function GET() {
  const tasks = await getTasks();
  return Response.json({ tasks });
}
```

- export ฟังก์ชันตามชื่อ HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- ใช้ Web standard `Request`/`Response` — ความรู้ใช้ข้ามไป Deno, Bun, Cloudflare Workers ได้
- เมื่อเปิด Cache Components, `GET` ถูก prerender ได้เหมือน page (เห็น `○ /api/tasks 1h` ตอน build)
- ใช้เมื่อ: webhook (Stripe, GitHub), mobile app, public API, ส่งไฟล์/stream

## 4. Environment Variables

```bash
# .env.local  (อย่า commit! .gitignore กันไว้แล้ว)
DATABASE_URL=postgres://...          # server เท่านั้น
NEXT_PUBLIC_SITE_NAME=Next.js Learn  # ถูกฝังลงใน JS ที่ส่งไป browser — ทุกคนเห็น
```

| ขึ้นต้นด้วย | เห็นที่ไหน | ใส่อะไรได้ |
| --- | --- | --- |
| (ไม่มี prefix) | server เท่านั้น | secret, API key, DB URL |
| `NEXT_PUBLIC_` | server + browser | ของที่เปิดเผยได้เท่านั้น |

⚠️ `NEXT_PUBLIC_*` ถูกแทนค่า **ตอน build** → เปลี่ยนค่าต้อง build ใหม่
ลำดับไฟล์: `.env.local` > `.env.production`/`.env.development` > `.env`

**Best practice**: validate env ตอนเริ่มแอปด้วย zod — พังตั้งแต่เริ่ม ดีกว่าพังตอนผู้ใช้กดปุ่ม

```ts
// src/lib/env.ts (ตัวอย่าง)
import "server-only";
import { z } from "zod";
export const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
```

## 5. Security checklist (สั้นๆ)

- [ ] ทุก Server Action / Route Handler: validate input + เช็คสิทธิ์
- [ ] ไฟล์ที่แตะ secret/DB มี `import "server-only"`
- [ ] ส่งให้ Client Component เฉพาะ field ที่จำเป็น (อย่าส่ง user object ทั้งก้อนที่มี passwordHash)
- [ ] ไม่ใช้ `NEXT_PUBLIC_` กับ secret
- [ ] ไม่ `dangerouslySetInnerHTML` กับข้อมูลจากผู้ใช้
- [ ] อ่าน `node_modules/next/dist/docs/01-app/02-guides/data-security.md`

## แบบฝึกหัด

1. เพิ่ม `POST /api/tasks` ที่รับ JSON `{ title }` → validate ด้วย schema เดิม → คืน 201 หรือ 400
   ทดสอบด้วย `curl -X POST -H 'content-type: application/json' -d '{"title":"x"}' localhost:3000/api/tasks`
   (อย่าลืมล้าง cache — ใช้ `revalidateTag` เพราะ `updateTag` ใช้ใน Route Handler ไม่ได้)
2. ใน proxy: ถ้า URL มี `?lang=en` ให้ตั้ง cookie `lang=en`
3. สร้าง `src/lib/env.ts` แล้วลองลบค่า env ที่จำเป็น → ดูว่าพังตอนไหน
