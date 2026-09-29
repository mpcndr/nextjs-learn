# 06 — Data Fetching & Streaming

## ดึงข้อมูลแบบใหม่: แค่ `await` ใน component

```tsx
// src/app/tasks/page.tsx
export default async function TasksPage() {
  const tasks = await getTasks();
  return <ul>{tasks.map(...)}</ul>;
}
```

เทียบกับ SPA แบบเก่า:

```tsx
// ❌ แบบเก่า (client): 3 state, 1 effect, 1 API route, จอขาวระหว่างรอ
function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(d => setTasks(d.tasks)).catch(setError).finally(() => setLoading(false));
  }, []);
  ...
}
```

ทำได้เพราะ Server Component รันบน server — ใกล้ database, ไม่ต้องผ่าน API, ไม่มี JS ส่งไป browser

## ดึงข้อมูลจากไหนได้บ้าง

```tsx
const res = await fetch("https://api.example.com/posts");   // API ภายนอก
const rows = await db.select().from(posts);                 // ORM/database ตรงๆ
const text = await fs.readFile("content.md", "utf8");       // file system
const tasks = await taskRepo.list();                        // repository ของเรา
```

**ห้าม** เรียก Route Handler ของตัวเอง (`fetch("/api/tasks")`) จาก Server Component
— มันเป็นการวิ่งออกไปนอกแล้ววนกลับเข้ามา เรียกฟังก์ชันตรงๆ เลย

## Waterfall vs Parallel

```tsx
// ❌ รอ user เสร็จ แล้วค่อยเริ่มดึง posts (ทั้งที่ไม่เกี่ยวกัน)
const user = await getUser();
const posts = await getPosts();

// ✅ เริ่มพร้อมกัน
const [user, posts] = await Promise.all([getUser(), getPosts()]);
```

Waterfall ที่แย่กว่า: component พ่อ await แล้ว component ลูก await ต่อ — แก้ด้วยการแยก Suspense (ข้างล่าง)

## Streaming ด้วย `<Suspense>`

ปัญหา: ถ้าหน้าหนึ่งมีข้อมูล 3 ก้อน ก้อนนึงช้า 2 วินาที → ทั้งหน้าต้องรอ 2 วินาที?

คำตอบ: **ไม่ต้อง** ถ้าห่อก้อนช้าด้วย `<Suspense>`

```tsx
// src/app/lab/streaming/page.tsx
<h1>Lab: Streaming</h1>                          {/* ส่งทันที */}
<Suspense fallback={<Skeleton label="ข้อมูลเร็ว" />}>
  <Slow ms={500} label="ข้อมูลเร็ว" />            {/* มาใน 0.5s */}
</Suspense>
<Suspense fallback={<Skeleton label="ข้อมูลช้า" />}>
  <Slow ms={2000} label="ข้อมูลช้า" />            {/* มาใน 2s */}
</Suspense>
```

### เกิดอะไรขึ้นจริงๆ ในระดับ HTTP

Server ส่ง response **แบบไม่ปิด connection** (chunked transfer encoding) — หน้าตาโดยประมาณ (ย่อให้อ่านง่าย ของจริงชื่อ id/ฟังก์ชันต่างไปตามเวอร์ชัน):

```html
<!-- chunk 1: t=0ms -->
<h1>Lab: Streaming</h1>
<template id="B:0"></template><p>⏳ รอ ข้อมูลเร็ว…</p>
<template id="B:1"></template><p>⏳ รอ ข้อมูลช้า…</p>

<!-- chunk 2: t=500ms -->
<div hidden id="S:0"><p>✅ ข้อมูลเร็ว มาถึงหลัง 500ms</p></div>
<script>$RC("B:0","S:0")</script>     <!-- สคริปต์เล็กๆ สลับ fallback เป็นของจริง -->

<!-- chunk 3: t=2000ms -->
<div hidden id="S:1">...</div><script>$RC("B:1","S:1")</script>
```

ดูของจริง:

```bash
npm run build && npm start
curl -N http://localhost:3000/lab/streaming    # -N = อย่า buffer จะเห็นข้อความทยอยมา
```

### ออกแบบ Suspense boundary อย่างไร

- วาง boundary ตาม **หน่วยความหมาย** ของ UI (การ์ด 1 ใบ, ตาราง 1 อัน) ไม่ใช่ทุก component
- Skeleton ควรมีขนาดใกล้ของจริง → หน้าไม่กระตุก (layout shift)
- ข้อมูลที่ต้องมาพร้อมกัน (เช่น ชื่อ + ราคาสินค้า) อยู่ boundary เดียวกัน
- `loading.tsx` = Suspense ครอบทั้ง page ให้อัตโนมัติ (หยาบกว่า แต่สะดวก)

## ข้อมูล runtime: params, searchParams, cookies, headers

ทั้งหมดเป็น Promise และเป็น "ข้อมูลที่รู้ได้เฉพาะตอนมี request" ดังนั้นใน Next.js 16
**ต้องอ่านมันภายใน `<Suspense>`** (หรือยอมให้ทั้ง route รอ) — เหตุผลเต็มๆ อยู่ในบท 07

```tsx
// src/app/tasks/[id]/page.tsx
export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <>
      <Link href="/tasks">← กลับ</Link>          {/* static shell */}
      <Suspense fallback={<p>กำลังโหลด…</p>}>
        <TaskDetail params={params} />          {/* await params ข้างใน */}
      </Suspense>
    </>
  );
}
```

สังเกต: page **ไม่ได้** `await params` เอง แต่ส่ง Promise ต่อให้ลูกใน Suspense
→ ส่วนนอก Suspense ยัง prerender ได้

## Client-side fetching ยังจำเป็นไหม?

จำเป็นในบางกรณี: ข้อมูล real-time (polling/websocket), infinite scroll, ข้อมูลที่ขึ้นกับ interaction ถี่ๆ
ใช้ SWR หรือ TanStack Query — แต่ **เริ่มจาก server ก่อนเสมอ** แล้วค่อยย้ายเมื่อมีเหตุผล

## แบบฝึกหัด

1. เพิ่ม `<Slow ms={1000} label="ข้อมูลกลาง" />` แล้วลองเอาไปไว้ใน Suspense เดียวกับอันช้า — ต่างกันยังไง?
2. เอา `<Suspense>` ออกจาก `/lab/streaming` ทั้งหมด แล้ว `npm run build` — อ่าน error แล้วอธิบาย
3. รัน `curl -N` กับ `/lab/streaming` แล้วจับเวลาว่าแต่ละ chunk มาเมื่อไร
4. ออกแบบหน้า dashboard ที่มี: สรุปยอด (เร็ว), กราฟ (ช้า), รายการล่าสุด (ปานกลาง) — จะวาง Suspense กี่อัน ตรงไหน?
