# Next.js Learn — จากศูนย์ถึงแก่น + CI/CD

repo นี้มี 2 อย่างในที่เดียว

1. **บทเรียน** ในโฟลเดอร์ [`docs/`](docs/) — ภาษาไทย ไล่จากพื้นฐานเว็บไปจนถึงกลไกภายในของ Next.js และ CI/CD
2. **แอปจริง** ในโฟลเดอร์ [`src/`](src/) — ทุกบทชี้กลับมาที่โค้ดจริงในนี้ อ่านแล้วเปิดไฟล์ดูประกอบ แก้แล้วรันดูผลได้ทันที

> ใช้ **Next.js 16** + React 19 + TypeScript + Tailwind v4 + Vitest + Playwright + GitHub Actions + Docker

## เริ่มต้น

```bash
nvm use            # Node 22 (ดูไฟล์ .nvmrc)
npm install
npm run dev        # เปิด http://localhost:3000
```

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | dev server + hot reload |
| `npm run build` / `npm start` | build แบบ production แล้วรัน |
| `npm run lint` | ESLint |
| `npm run typecheck` | สร้าง type ของ route แล้วรัน `tsc` |
| `npm test` | unit test (Vitest) |
| `npm run test:e2e` | E2E test (Playwright) — ต้อง `npm run build` ก่อน |
| `npm run check` | lint + typecheck + unit test (รันก่อน push ทุกครั้ง) |

## เส้นทางการเรียน

| บท | หัวข้อ | สิ่งที่จะได้ |
| --- | --- | --- |
| [00](docs/00-roadmap.md) | Roadmap & วิธีเรียน | รู้ว่าจะไปไหน และเรียนยังไงให้ติด |
| [01](docs/01-web-fundamentals.md) | พื้นฐานเว็บ | HTTP, HTML, browser ทำงานยังไง, render ที่ไหน |
| [02](docs/02-js-ts-essentials.md) | JS/TS ที่ต้องแม่น | async/await, module, destructuring, type |
| [03](docs/03-react-mental-model.md) | React mental model | UI = f(state), component, props, state, effect |
| [04](docs/04-routing-and-layouts.md) | Routing & Layout | file-system routing, layout, dynamic route |
| [05](docs/05-server-and-client-components.md) | Server vs Client Components | **หัวใจของ Next.js สมัยใหม่** |
| [06](docs/06-data-fetching-and-streaming.md) | Data fetching & Streaming | async component, Suspense |
| [07](docs/07-caching-and-rendering.md) | Caching & Rendering | `use cache`, static shell, PPR |
| [08](docs/08-mutations-server-actions.md) | Mutations & Server Actions | ฟอร์ม, validation, optimistic UI |
| [09](docs/09-errors-proxy-route-handlers.md) | Error, Proxy, Route Handler, Env | ของที่แอปจริงต้องมี |
| [10](docs/10-system-design-thinking.md) | **คิดเป็นระบบ** | จากโจทย์ → ออกแบบ → โค้ด |
| [11](docs/11-testing.md) | Testing | unit / component / e2e |
| [12](docs/12-ci-cd.md) | **CI/CD** | GitHub Actions, Docker, deploy |
| [13](docs/13-under-the-hood.md) | แก่นแท้: ข้างในทำงานยังไง | request lifecycle, RSC payload, hydration |

## โครงสร้างโปรเจกต์

```
src/
├── app/                      ← Routing (ทุกโฟลเดอร์ = 1 URL segment)
│   ├── layout.tsx            ← ห่อทุกหน้า
│   ├── page.tsx              ← /
│   ├── tasks/
│   │   ├── page.tsx          ← /tasks
│   │   ├── actions.ts        ← Server Actions (แก้ข้อมูล)
│   │   ├── error.tsx         ← error boundary ของ /tasks
│   │   └── [id]/page.tsx     ← /tasks/:id
│   ├── api/tasks/route.ts    ← GET /api/tasks (JSON)
│   └── lab/                  ← หน้าทดลองแนวคิดทีละเรื่อง
├── components/               ← UI ที่ใช้ซ้ำ
├── lib/tasks/                ← Domain + data (ไม่ผูกกับ UI)
│   ├── schema.ts             ← type + validation
│   ├── repository.ts         ← เก็บ/อ่านข้อมูล
│   ├── queries.ts            ← อ่านข้อมูล + นโยบาย cache
│   └── stats.ts              ← pure logic
└── proxy.ts                  ← รันก่อนทุก request
tests/
├── unit/                     ← Vitest
└── e2e/                      ← Playwright
.github/workflows/
├── ci.yml                    ← ตรวจทุก push/PR
└── cd.yml                    ← main ผ่าน CI → build & push Docker image
```
