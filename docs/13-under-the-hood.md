# 13 — แก่นแท้: ข้างใน Next.js ทำงานยังไง ★

บทนี้เชื่อมทุกบทเข้าด้วยกัน อ่านหลังจากทำแบบฝึกหัดบท 04–08 แล้ว จะ "คลิก" มากที่สุด

## ภาพใหญ่ในประโยคเดียว

> **Next.js คือระบบที่รัน React component tree บน server เพื่อสร้าง "คำอธิบาย UI" (RSC Payload)
> แล้วส่งคำอธิบายนั้น + HTML ไปให้ browser ซึ่งจะเติม JS เฉพาะส่วนที่ต้อง interactive**

ทุก feature (routing, caching, streaming, server actions) เป็นแค่การต่อยอดจากกลไกนี้

---

## 1. Lifecycle ของการเปิดหน้าครั้งแรก (Hard navigation)

สมมติเปิด `http://localhost:3000/tasks` ครั้งแรก:

```
Browser                         Next.js server
  │  GET /tasks                        │
  │ ─────────────────────────────────▶ │
  │                                    │ ① proxy.ts รัน (เติม x-request-id)
  │                                    │ ② จับคู่ URL กับโฟลเดอร์: app/layout.tsx + app/tasks/page.tsx
  │                                    │ ③ มี static shell ที่ prerender ไว้ไหม?
  │                                    │    /tasks = ○ static → ใช้ของที่ build ไว้ (ถ้า cache ยังไม่หมดอายุ)
  │                                    │ ④ (ถ้าต้อง render) React รัน Server Components
  │                                    │    → ได้ RSC Payload (คำอธิบาย UI)
  │                                    │ ⑤ ใช้ RSC Payload + Client Components render เป็น HTML
  │   HTML (+ RSC Payload ฝังใน <script>)│
  │ ◀───────────────────────────────── │
  │ ⑥ แสดง HTML ทันที (เห็นเนื้อหาแล้ว แต่ยังกดไม่ได้)
  │ ⑦ โหลด JS ของ Client Components (TaskForm, TaskToggle, NavLink)
  │ ⑧ Hydration: React ผูก event handler เข้ากับ HTML ที่มีอยู่ → กดได้แล้ว
```

## 2. RSC Payload — "ภาษากลาง" ระหว่าง server กับ client

ไม่ใช่ HTML ไม่ใช่ JSON ธรรมดา แต่เป็น **stream ของคำอธิบาย React tree** แบบ serialize
นี่คือของจริงจาก repo นี้ (ดึงจาก HTML ของ `/tasks` หลัง `npm run build && npm start`):

```
1:"$Sreact.fragment"
2:I[5589,["/_next/static/chunks/2gg3z7dy6jiz_.js"],"NavLink"]
...
18:I[3260,["/_next/static/chunks/2gg3z7dy6jiz_.js","/_next/static/chunks/021a6t40tlmun.js"],"TaskForm"]
```

อ่านยังไง:
- `I[...]` = **Client Reference**: "ตรงนี้มี Client Component ชื่อ `TaskForm` โค้ดอยู่ในไฟล์ chunk นี้ ไปโหลดมาเอง"
- Server Component **ไม่มี** บรรทัดแบบนี้ — เพราะมันถูกรันเสร็จแล้วบน server เหลือแค่ผลลัพธ์ (div, p, text)
- props ที่ส่งให้ Client Component ถูก serialize อยู่ใน payload → **นี่คือเหตุผลที่ props ต้อง serializable** (บท 02, 05)

ดูเอง:

```bash
npm run build && npm start
curl -s localhost:3000/tasks | grep -o 'self.__next_f.push[^<]*' | head
```

### ทำไมต้องมี RSC Payload ถ้ามี HTML แล้ว?

- **HTML** = สำหรับให้ผู้ใช้ "เห็น" เร็วที่สุด (ครั้งแรก)
- **RSC Payload** = สำหรับให้ React "รู้" ว่า tree หน้าตาเป็นยังไง เพื่อ hydrate และเพื่อ **อัปเดตโดยไม่ทำลาย state**

## 3. Soft navigation — คลิก `<Link>` เกิดอะไรขึ้น

คลิกจาก `/tasks` ไป `/tasks/learn-rsc`:

```
Browser                                 Server
  │ (prefetch ไว้แล้วตอนลิงก์โผล่ในจอ)        │
  │ GET /tasks/learn-rsc  (header RSC: 1)  │   ← ขอ "RSC Payload" ไม่ใช่ HTML
  │ ─────────────────────────────────────▶ │
  │ ◀───────────── RSC Payload ──────────── │   เฉพาะ segment ที่เปลี่ยน
  │ React merge tree ใหม่เข้ากับของเดิม
  │ → layout ไม่ถูกสร้างใหม่, state ใน layout อยู่ครบ, ไม่มีจอขาว
```

นี่คือเหตุผลที่ Next.js ให้ความรู้สึกเหมือน SPA แม้ render บน server

## 4. Hydration — และ hydration mismatch

Hydration = React ใน browser render Client Components **อีกรอบ** แล้วเทียบกับ HTML ที่มีอยู่
ถ้า**ไม่ตรงกัน** → warning "Hydration mismatch" และ React ต้องแก้ DOM ใหม่

สาเหตุที่พบบ่อย:

```tsx
"use client";
export function Bad() {
  return <p>{Date.now()}</p>;                 // ❌ server กับ browser ได้ค่าต่างกัน
  return <p>{window.innerWidth}</p>;          // ❌ server ไม่มี window (พังเลย)
  return <p>{Math.random()}</p>;              // ❌
}
```

แก้: ค่าที่ขึ้นกับ browser ให้อ่านใน `useEffect` (รันหลัง hydration เท่านั้น) หรือส่งค่ามาจาก server เป็น props

## 5. Server Action ในระดับเครือข่าย

กด toggle ใน `/tasks` (หน้าตาโดยประมาณ — รายละเอียด header/body ต่างกันตามเวอร์ชันและวิธีเรียก):

```
POST /tasks
Next-Action: 7f3a...c2          ← ID ของ toggleTask (สร้างตอน build, ไม่ใช่ชื่อฟังก์ชัน)
Content-Type: text/plain
Body: ["learn-rsc"]             ← arguments (serialize)

Server: หา action จาก ID → รัน toggleTask("learn-rsc") → updateTag("tasks")
      → เพราะ tag ถูกล้าง, render tree ของหน้าปัจจุบันใหม่
Response: RSC Payload ที่มีทั้ง ผลลัพธ์ของ action + UI ใหม่   ← round-trip เดียว
```

ดูใน DevTools → Network → กด toggle → เลือก request POST → แท็บ Headers/Payload

ข้อสังเกตเชิงลึก:
- ID ของ action ถูกเข้ารหัส และ action ที่ไม่ได้ถูกใช้จะถูกตัดทิ้งตอน build (dead code elimination)
- แต่ endpoint ยังเป็น **public** — ใครมี ID ก็ยิงได้ → validate + auth เสมอ (บท 08)

## 6. Build: จากโค้ดไปเป็นอะไร

`npm run build` ทำสิ่งเหล่านี้:

1. **Compile** (Turbopack): TS/JSX → JS, แยกเป็น 2 กราฟ — server bundle และ client bundle
   `"use client"` คือจุดที่กราฟถูกตัด, `"use server"` คือจุดที่สร้าง action reference
2. **Typecheck** + route types (`PageProps<"/tasks/[id]">`)
3. **Prerender**: รันทุก route เพื่อหาว่าส่วนไหน static/cached ได้
   - ส่วนที่ static → เก็บเป็น HTML + RSC Payload
   - เจอ runtime data นอก `<Suspense>` → **build fail** พร้อมคำแนะนำ (บท 07)
4. **Output**: `.next/` (และ `.next/standalone/` เพราะเราตั้ง `output: "standalone"`)

```
Route (app)           Revalidate  Expire
┌ ○ /
├ ○ /tasks                    1h      1d     ← static shell + cache ตาม cacheLife("hours")
├ ◐ /lab/streaming                           ← shell static + ส่วน dynamic stream ตามมา
└ ◐ /tasks/[id]
ƒ Proxy (Middleware)
```

## 7. รวบยอด: ทุกบรรทัดในแอปนี้รันที่ไหน เมื่อไหร่

| โค้ด | Build | Request (server) | Browser |
| --- | :---: | :---: | :---: |
| `src/proxy.ts` | | ✅ ทุก request | |
| `app/layout.tsx`, `app/page.tsx` | ✅ prerender | (ถ้าไม่มี cache) | |
| `getTasks()` (`'use cache'`) | ✅ | เมื่อ cache หมดอายุ/ถูกล้าง | |
| `TaskDetail` (อ่าน `params`) | | ✅ | |
| `TaskForm` render | ✅ (HTML) | ✅ (HTML) | ✅ hydrate + re-render |
| `onClick` ใน `Counter` | | | ✅ |
| `createTask` (Server Action) | | ✅ เมื่อ submit | |
| `summarize()` | ใช้ที่ไหนก็รันที่นั่น (pure function) | | |

**ถ้าเติมตารางนี้ได้เองสำหรับโปรเจกต์ใหม่ใดๆ = คุณเข้าใจแก่นของ Next.js แล้ว**

---

## สรุปแก่นแท้ 7 ข้อ

1. **Server-first**: เริ่มจาก Server Component เสมอ เปิดประตู client ให้เล็กที่สุด
2. **ข้อมูลไหลลง, action ไหลขึ้น**: อ่านผ่าน props จาก server, เขียนผ่าน Server Action
3. **ทุกอย่าง dynamic จนกว่าจะบอกว่า cache ได้** (`'use cache'`) และทุก runtime access ต้องมีที่รอ (`<Suspense>`)
4. **Tag ตามข้อมูล ล้างตาม mutation**: ทุก action รู้ว่าต้องล้าง tag ไหน
5. **Boundary คือเครื่องมือออกแบบ**: Suspense (รอ), Error (พัง), Client (interactive) — วางตามหน่วยความหมายของ UI
6. **Serialize ได้เท่านั้นที่ข้ามเส้น**: props, action arguments, cache arguments
7. **Validate ทุกขอบของระบบ**: input ผู้ใช้, env, ข้อมูลภายนอก — type ไม่ได้ปกป้องคุณตอน runtime

## แบบฝึกหัดสุดท้าย

1. เปิด DevTools → Network → คลิกจาก `/tasks` ไปหน้า detail → หา request ที่มี header `RSC: 1` แล้วดู response
2. เขียน Client Component ที่ render `new Date().toLocaleTimeString()` → เปิดหน้าใน `npm run dev` → อ่านสิ่งที่ Next.js/React เตือน
   (Next.js 16 + Cache Components มักจับได้ตั้งแต่ตอน prerender ก่อนจะเป็น hydration mismatch เสียอีก) → แก้ให้หายด้วย `useEffect`
3. กด toggle แล้วดู request POST: หา header `Next-Action` และ body
4. อธิบายให้เพื่อน (หรือเป็ดยาง 🦆) ฟังว่า "กด เพิ่ม ในหน้า /tasks แล้วเกิดอะไรขึ้นบ้าง ตั้งแต่นิ้วแตะเมาส์จนเห็นงานใหม่" — ครอบคลุม: form, useActionState, POST, validate, repository, updateTag, re-render, RSC payload, reconcile
5. ไปทำ Capstone (บท 00) 🎓
