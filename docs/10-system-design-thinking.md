# 10 — คิดเป็นระบบ: จากโจทย์ → ออกแบบ → โค้ด

> "อยากคิดเป็นระบบและเขียนออกมาเหมือนที่ในหัวออกแบบได้"

ความลับคือ: **คนที่เขียนโค้ดได้ตรงกับที่คิด ไม่ได้เก่งกว่าตอนพิมพ์ — แต่เขาคิดเสร็จก่อนพิมพ์**
บทนี้คือกระบวนการ 6 ขั้นที่ใช้สร้างแอป Tasks ใน repo นี้ เอาไปใช้กับทุกโปรเจกต์ได้

---

## ขั้น 1 — เขียนโจทย์เป็น User Stories + เกณฑ์ผ่าน

อย่าเริ่มจาก "จะใช้ library อะไร" เริ่มจาก "ผู้ใช้ทำอะไรได้"

```
- ในฐานะผู้ใช้ ฉันเห็นรายการงานทั้งหมด เรียงใหม่สุดก่อน
- ฉันเพิ่มงานได้ ชื่อต้องไม่ว่างและไม่เกิน 100 ตัวอักษร
- ฉันติ๊กว่างานเสร็จได้ และหน้าจอตอบสนองทันที
- ฉันดูรายละเอียดงานและลบงานได้
- ถ้าเปิดงานที่ไม่มีอยู่ เห็นหน้า "ไม่พบ" ที่สุภาพ
```

เกณฑ์ผ่านเหล่านี้ **กลายเป็น E2E test ตรงๆ** — เปิด `tests/e2e/tasks.spec.ts` เทียบดู

## ขั้น 2 — ออกแบบข้อมูล (Data Model) ก่อน UI

ข้อมูลคือรากฐาน UI เปลี่ยนง่าย แต่ข้อมูลเปลี่ยนยาก

```ts
Task { id: string; title: string; done: boolean; createdAt: string }
```

ถามตัวเอง:
- อะไรคือ **ตัวตน** (id)? ใครสร้าง?
- อะไรคือ **กฎ** (invariants)? → title ไม่ว่าง, ≤ 100 ตัว
- ข้อมูลต้อง **ข้ามเครือข่าย** ไหม? → ใช่ → ใช้ string แทน Date
- **ความสัมพันธ์**? (Task มี Project? มี User?) — ตอนนี้ไม่มี แต่ถ้ามี ต้องคิดตรงนี้

ผลลัพธ์: `src/lib/tasks/schema.ts`

## ขั้น 3 — ออกแบบ Route (URL) และ Operation

| URL | อ่านอะไร | เขียนอะไร |
| --- | --- | --- |
| `/tasks` | `getTasks()` | `createTask`, `toggleTask` |
| `/tasks/[id]` | `getTask(id)` | `deleteTask` |
| `GET /api/tasks` | `getTasks()` | — |

แยก **อ่าน (queries)** กับ **เขียน (actions)** ออกจากกันตั้งแต่ตอนออกแบบ (แนวคิด CQS)
— เพราะใน Next.js สองอย่างนี้ใช้กลไกต่างกัน (Server Component vs Server Action) และมีนโยบาย cache ต่างกัน

## ขั้น 4 — วาด Component Tree + ระบายสี Server/Client

```
TasksPage (S) ─ await getTasks()
├── TaskSummary (S)
├── TaskForm (C)  ← ต้องใช้ useActionState
└── ul
    └── li × N
        ├── TaskToggle (C)  ← ต้องใช้ useOptimistic
        └── Link (S→C)
```

กฎ: ระบายสี Client เฉพาะใบไม้ที่ **จำเป็น** (บท 05)

## ขั้น 5 — ตัดสินใจเรื่องเวลา: Static / Cached / Dynamic

| ข้อมูล | ประเภท | เหตุผล |
| --- | --- | --- |
| หัวข้อ, nav | Static | ไม่เปลี่ยน |
| รายการงาน | Cached + tag `tasks` | ทุกคนเห็นเหมือนกัน เปลี่ยนเมื่อมี mutation เท่านั้น |
| รายละเอียดงาน | Cached + tag `task:id`, อ่าน params ใน Suspense | id รู้ตอน runtime |
| การ์ดผู้ใช้ (ถ้ามี) | Dynamic ใน Suspense | ต่างกันทุกคน |

แล้วเขียน **ตาราง invalidation**: action ไหนต้องล้าง tag ไหน

| Action | ล้าง |
| --- | --- |
| `createTask` | `tasks` |
| `toggleTask` | `tasks`, `task:id` |
| `deleteTask` | `tasks`, `task:id` |

ถ้าเขียนตารางนี้ไม่ได้ = ยังไม่พร้อมเขียนโค้ด

## ขั้น 6 — แบ่ง Layer ตามทิศทางการพึ่งพา

```
          ┌───────────────────────────────┐
  UI      │ app/**/page.tsx, components/  │  รู้จัก: queries, actions, schema(type)
          └──────────────┬────────────────┘
          ┌──────────────▼────────────────┐
  Actions │ app/tasks/actions.ts          │  รู้จัก: schema, repository, tags
  Queries │ lib/tasks/queries.ts          │  รู้จัก: repository, next/cache
          └──────────────┬────────────────┘
          ┌──────────────▼────────────────┐
  Data    │ lib/tasks/repository.ts       │  รู้จัก: schema (type) เท่านั้น
          └──────────────┬────────────────┘
          ┌──────────────▼────────────────┐
  Domain  │ lib/tasks/schema.ts, stats.ts │  ไม่รู้จักใครเลย (TS ล้วน)
          └───────────────────────────────┘
```

**กฎทอง: ลูกศรชี้ลงเท่านั้น** layer ล่างห้าม import layer บน

ผลที่ได้:
- เปลี่ยน in-memory → Postgres = แก้ `repository.ts` ไฟล์เดียว
- Domain กับ Data **เทสต์ได้โดยไม่ต้องมี Next.js/browser** (ดู `tests/unit/`) — เร็วมาก
- อ่านโค้ดแล้วรู้ว่าอะไรอยู่ที่ไหน ไม่ต้องเดา

## เทคนิคให้โค้ดออกมาตรงกับที่คิด

1. **เขียน type/interface ก่อน implementation** — `TaskRepository` interface คือ "สัญญา"
   เขียนสัญญาเสร็จแล้ว implementation แทบจะเขียนตัวเอง
2. **เขียนจากล่างขึ้นบน**: schema → repository (+ test) → queries/actions → UI
   แต่ละชั้นทดสอบได้ก่อนจะไปชั้นถัดไป ไม่ต้อง debug 5 ชั้นพร้อมกัน
3. **Pure function ให้มากที่สุด** (`summarize`) — logic ที่ไม่มี side effect เทสต์ง่าย ใช้ซ้ำง่าย
4. **Dependency injection แบบง่าย** — `createInMemoryTaskRepository({ now, newId })` ทำให้ควบคุมเวลาและ id ในเทสต์ได้
5. **ตั้งชื่อด้วยภาษาของโดเมน** — `toggleTask` ไม่ใช่ `updateItemStatusFlag`
6. **ทำให้สถานะที่ผิดเป็นไปไม่ได้** — `status: "idle" | "success" | "error"` ดีกว่า `isError: boolean; isSuccess: boolean` (ที่อาจเป็น true ทั้งคู่)
7. **Commit ทีละขั้น** — แต่ละ commit = 1 ความคิดที่สมบูรณ์ ย้อนกลับได้

## Template: Design Doc หน้าเดียว (ใช้ก่อนเริ่มทุก feature)

```markdown
# Feature: <ชื่อ>

## User stories + เกณฑ์ผ่าน
-

## Data model (เพิ่ม/เปลี่ยน)
-

## Routes & operations
| URL | read | write |

## Component tree (S/C)

## Static / Cached / Dynamic + invalidation table
| Action | ล้าง tag |

## Error cases
- คาดได้:
- ไม่พบ:
- คาดไม่ได้:

## Tests
- unit:
- e2e:
```

## แบบฝึกหัด

เขียน design doc ด้วย template ข้างบนให้ feature **"Project"**: งานแต่ละอันอยู่ใน project,
มีหน้า `/projects`, `/projects/[id]` แสดงงานใน project นั้น — **ยังไม่ต้องเขียนโค้ด**
เสร็จแล้วค่อย implement ตามลำดับขั้น 6 แล้วเทียบว่าโค้ดตรงกับ design แค่ไหน
