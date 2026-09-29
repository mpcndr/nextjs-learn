# 01 — พื้นฐานเว็บ: เปิดเว็บ 1 ครั้ง เกิดอะไรขึ้นบ้าง

ก่อนเข้าใจ Next.js ต้องเข้าใจว่ามัน "แก้ปัญหาอะไร" และปัญหานั้นมาจากธรรมชาติของเว็บ

## 1. เว็บคือการคุยกันด้วย Request / Response

```
Browser (client)                                Server
     │   GET /tasks  HTTP/1.1                      │
     │ ──────────────────────────────────────────▶ │  ประมวลผล
     │                                             │  (อ่าน DB, สร้าง HTML)
     │   200 OK  Content-Type: text/html           │
     │ ◀────────────────────────────────────────── │
     │   <html>...</html>                          │
```

- **Request** มี: method (`GET` อ่าน, `POST` ส่งข้อมูล/แก้ไข …), URL, headers (รวมถึง cookie), body
- **Response** มี: status code (`200` ok, `307` redirect, `404` ไม่เจอ, `500` server พัง), headers, body
- HTTP **stateless** — server จำอะไรระหว่าง request ไม่ได้เอง ต้องพึ่ง cookie/session

ลองดูของจริง (หลัง `npm run dev`):

```bash
curl -i http://localhost:3000/api/tasks   # เห็น status, headers, JSON body
curl -i http://localhost:3000/todo        # เห็น 307 redirect ที่ proxy.ts ทำ
```

## 2. Browser ทำอะไรกับ HTML ที่ได้มา

1. **Parse HTML** → สร้าง DOM tree
2. เจอ `<link rel=stylesheet>` → โหลด CSS, เจอ `<script>` → โหลด JS
3. **Paint** — วาดหน้าจอ (ตอนนี้ผู้ใช้ "เห็น" แล้ว แต่ยังกดปุ่มที่ต้องใช้ JS ไม่ได้)
4. **รัน JavaScript** → ปุ่มเริ่มตอบสนอง (ตอนนี้ผู้ใช้ "ใช้งาน" ได้)

ช่วงระหว่างข้อ 3 กับ 4 สำคัญมาก และเป็นที่มาของคำว่า **hydration** (บท 13)

## 3. สามยุคของการ render — ทำไม Next.js ถึงเกิดขึ้น

### ยุค 1: Server-side rendering แบบดั้งเดิม (PHP, Rails, Django)
Server สร้าง HTML ทั้งหน้าทุก request
✅ เห็นเนื้อหาเร็ว, SEO ดี  ❌ ทุกคลิกโหลดหน้าใหม่ทั้งหน้า, interactive ยาก

### ยุค 2: Single Page App (SPA — React ล้วน, Create React App, Vite)
Server ส่ง HTML เปล่าๆ + JS ก้อนใหญ่ → browser สร้าง UI เองทั้งหมด → ดึงข้อมูลผ่าน API
✅ ลื่นเหมือนแอป  ❌ จอขาวตอนโหลดแรก, JS ใหญ่, SEO แย่, ต้องสร้าง API แยก, waterfall ของ fetch

### ยุค 3: Hybrid (Next.js App Router)
**ส่วนไหนควรทำบน server ก็ทำบน server ส่วนไหนต้อง interactive ก็ส่ง JS เฉพาะส่วนนั้น**
- HTML มาพร้อมเนื้อหาจริง (เร็ว + SEO)
- เปลี่ยนหน้าแบบไม่ reload (ลื่นเหมือน SPA)
- อ่าน database ได้ตรงๆ ใน component (ไม่ต้องสร้าง API)
- ส่ง JS เฉพาะ component ที่ต้อง interactive

> 💡 **แก่นของ Next.js คือการเลือก "ที่" และ "เวลา" ที่แต่ละส่วนของ UI จะถูกสร้าง**
>
> - **ที่ไหน**: server หรือ browser → บท 05
> - **เมื่อไหร่**: ตอน build (static), ตอน request (dynamic), หรือ cache ไว้ใช้ซ้ำ → บท 07

## 4. Build time vs Request time

| | Build time (`npm run build`) | Request time (ผู้ใช้เปิดหน้า) |
| --- | --- | --- |
| เกิดกี่ครั้ง | ครั้งเดียวตอน deploy | ทุกครั้งที่มีคนเข้า |
| รู้อะไรบ้าง | โค้ด, ข้อมูลที่ดึงได้ล่วงหน้า | cookie, header, URL จริง, ผู้ใช้คนไหน |
| ผลลัพธ์ | HTML สำเร็จรูป (เร็วมาก เสิร์ฟจาก CDN ได้) | HTML สดใหม่เฉพาะคน |

รัน `npm run build` แล้วดูตารางท้าย output:

```
○ /tasks          ← Static: สร้างตอน build
◐ /tasks/[id]     ← Partial: เปลือกสร้างตอน build, เนื้อในสร้างตอน request
ƒ Proxy           ← รันทุก request
```

## แบบฝึกหัด

1. เปิด DevTools → แท็บ **Network** → เข้า `/tasks` → คลิก request แรก (document) → ดู Response
   เห็น "ชื่องาน" อยู่ใน HTML เลยไหม? (ถ้าเห็น = server render แล้ว ไม่ใช่ browser)
2. ใน DevTools กด `Ctrl+Shift+P` → "Disable JavaScript" → reload `/tasks` แล้วลองเพิ่มงาน
   ยังทำงานได้ไหม? ทำไม? (คำใบ้: progressive enhancement, บท 08)
3. `curl -i localhost:3000/tasks | head -20` แล้วหา header `x-request-id` — มาจากไฟล์ไหน?
