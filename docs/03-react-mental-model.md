# 03 — React Mental Model

Next.js คือ React framework ถ้า mental model ของ React ไม่แน่น จะงงกับ Next.js ตลอด

## สมการเดียวที่ต้องจำ

```
UI = f(state)
```

- **Component** คือฟังก์ชันที่รับข้อมูลแล้วคืน "คำอธิบายหน้าตา UI" (JSX)
- เราไม่สั่ง DOM ตรงๆ ("เอา div นี้ไปซ่อน") แต่บอกว่า "ถ้า state เป็นแบบนี้ UI ต้องหน้าตาแบบนี้"
- React จะเทียบของเก่ากับของใหม่ แล้วแก้ DOM เท่าที่จำเป็นให้เอง (reconciliation)

นี่เรียกว่า **declarative** — และเป็นเหตุผลที่ React ขยายไปรันบน server ได้:
เพราะ component เป็นแค่ฟังก์ชันที่คืนคำอธิบาย ใครจะเรียกมันก็ได้

## Component & Props

```tsx
// src/components/task-summary.tsx
export function TaskSummary({ tasks }: { tasks: Pick<Task, "done">[] }) {
  const { total, done, percent } = summarize(tasks);
  return <p>เสร็จแล้ว {done} จาก {total} งาน ({percent}%)</p>;
}
```

- props ไหลจาก **บนลงล่าง** เท่านั้น (one-way data flow)
- component ห้ามแก้ props ของตัวเอง
- component ที่ดีควรเป็น **pure**: props เดิม → UI เดิมเสมอ

## State — ความจำของ component

```tsx
// src/components/counter.tsx
const [count, setCount] = useState(0);
<button onClick={() => setCount((c) => c + 1)}>กดแล้ว {count} ครั้ง</button>
```

- เรียก `setCount` → React **เรียกฟังก์ชัน component ใหม่ทั้งฟังก์ชัน** (re-render) ด้วยค่าใหม่
- ตัวแปรธรรมดา (`let x = 0`) จะถูกรีเซ็ตทุก render — จึงต้องใช้ state
- state เป็นของ "ตำแหน่งใน tree" ถ้า component ถูกถอดออกจาก tree state ก็หาย
- เปลี่ยน `key` = บอก React ว่า "นี่คือตัวใหม่" → state รีเซ็ต (เราใช้เทคนิคนี้ใน `task-form.tsx`)

### ถามตัวเองก่อนสร้าง state ทุกครั้ง

1. ค่านี้คำนวณจาก props/state อื่นได้ไหม? → **ได้ = ไม่ต้องเป็น state** (คำนวณตอน render เลย)
   เช่น `percent` ใน TaskSummary คำนวณจาก `tasks` ไม่ต้อง `useState`
2. ค่านี้มาจาก server ไหม? → ใน Next.js ให้ **Server Component ดึงมาส่งเป็น props** ไม่ต้องเก็บใน state
3. เหลือแค่ UI state จริงๆ (เปิด/ปิด, ค่าที่กำลังพิมพ์, hover) → ถึงจะใช้ `useState`

## Composition — ประกอบ component เหมือนเลโก้

```tsx
// src/components/collapsible.tsx รับ children
<Collapsible title="ข้อมูลจาก server">
  <ServerOnlyInfo />      {/* อะไรก็ได้ที่ใส่เข้ามา */}
</Collapsible>
```

`children` คือ "ช่องว่างให้คนเรียกเติมเอง" — pattern นี้จะกลายเป็นอาวุธสำคัญในบท 05

## Effect — ทางออกไปนอก React

```tsx
useEffect(() => {
  console.error(error);   // sync กับ "โลกภายนอก" (logging, subscription, DOM API)
}, [error]);
```

ใน Next.js App Router คุณจะใช้ `useEffect` **น้อยมาก**:

| เคยใช้ useEffect ทำ | Next.js ทำแบบนี้แทน |
| --- | --- |
| fetch ข้อมูลตอนโหลดหน้า | `await` ใน Server Component (บท 06) |
| ส่งฟอร์มไป API | Server Action (บท 08) |
| คำนวณค่าจาก state | คำนวณตรงๆ ตอน render |

## Hooks ใหม่ใน React 19 ที่ใช้ในโปรเจกต์

| Hook | ใช้ทำอะไร | ดูที่ |
| --- | --- | --- |
| `useActionState` | ผูกฟอร์มกับ action + ได้ state ที่ action คืน + `pending` | `task-form.tsx` |
| `useOptimistic` | แสดงผลลัพธ์ล่วงหน้าก่อน server ตอบ | `task-toggle.tsx` |
| `useTransition` | ทำงานหนักโดยไม่บล็อก UI | — |
| `use` | อ่านค่าจาก Promise/Context | — |

## กฎของ Hooks

1. เรียกที่ top level ของ component เท่านั้น (ห้ามใน if/loop)
2. เรียกได้ใน **Client Component** เท่านั้น (Server Component ไม่มี state ไม่มี effect)

ข้อ 2 คือสะพานไปบท 05 👉

## แบบฝึกหัด

1. เพิ่มปุ่ม "รีเซ็ต" ใน `Counter` ที่ทำให้ count กลับเป็น 0
2. ทำไม `TaskForm` ใช้ `defaultValue` + `key` แทน `value` + `useState`? ลองเปลี่ยนเป็นแบบ controlled ดูแล้วเทียบข้อดีข้อเสีย
3. ลองเอา `key` ออกจาก `<input>` ใน `task-form.tsx` แล้วพิมพ์ชื่อว่าง → กดเพิ่ม → พิมพ์ชื่อ → กดเพิ่ม สังเกตพฤติกรรม
