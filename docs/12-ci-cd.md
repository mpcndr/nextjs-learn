# 12 — CI/CD ★

## นิยามที่ถูกต้อง

- **CI (Continuous Integration)**: ทุกการเปลี่ยนแปลงถูก **รวมเข้า main บ่อยๆ** และ**ถูกตรวจอัตโนมัติ**ทุกครั้ง
  เป้าหมาย: รู้ว่าพัง "ภายในไม่กี่นาที" หลัง push ไม่ใช่ "ตอนลูกค้าโทรมา"
- **CD (Continuous Delivery)**: ทุก commit ที่ผ่าน CI **พร้อม deploy** ได้ทันที (กดปุ่มเดียว)
- **CD (Continuous Deployment)**: ผ่าน CI แล้ว **deploy เองอัตโนมัติ** ไม่ต้องมีคนกด

CI/CD ไม่ใช่เครื่องมือ — มันคือ **ข้อตกลงของทีม** ว่า "main ต้องเขียวและ deploy ได้ตลอดเวลา"
GitHub Actions เป็นแค่เครื่องมือที่ทำให้ข้อตกลงนั้นเป็นจริง

## ภาพรวม pipeline ของ repo นี้

```
 dev เขียนโค้ด
     │  npm run check   (ตรวจเองก่อน push: lint + typecheck + unit)
     ▼
 git push / เปิด PR
     │
     ▼
┌─────────────────────── CI (.github/workflows/ci.yml) ───────────────────────┐
│  job: quality (~1 นาที)              job: e2e (~3 นาที)  needs: quality     │
│  ├ npm ci                            ├ npm ci                               │
│  ├ npm run lint                      ├ restore .next/cache                  │
│  ├ npm run typecheck        ──ผ่าน──▶ ├ npm run build                        │
│  └ npm test                          ├ playwright install chromium          │
│                                      ├ npm run test:e2e                     │
│                                      └ (พัง) upload playwright-report        │
└─────────────────────────────────────────────────────────────────────────────┘
     │ ✅ เขียว → merge PR เข้า main ได้  (ตั้ง branch protection ให้บังคับ)
     ▼
┌─────────────────────── CD (.github/workflows/cd.yml) ───────────────────────┐
│  trigger: CI บน main สำเร็จ                                                  │
│  ├ checkout commit ที่ CI ทดสอบแล้ว (head_sha)                               │
│  ├ docker build (multi-stage, cache ด้วย GitHub Actions cache)              │
│  └ push → ghcr.io/<owner>/<repo>:latest และ :sha-<commit>                    │
└─────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
 server/cloud ดึง image ไปรัน (docker pull && docker run)
```

## อ่าน `ci.yml` ทีละส่วน

```yaml
on:
  push:
    branches: [main]      # push เข้า main
  pull_request:           # ทุก PR
```
**เมื่อไหร่** จะรัน

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```
push ติดๆ กันบน branch เดียว → ยกเลิกรอบเก่า (ประหยัดนาทีและได้ผลเร็วขึ้น)

```yaml
permissions:
  contents: read
```
**Least privilege**: workflow อ่านโค้ดได้อย่างเดียว ถ้ามี dependency ที่ถูกแฮ็กมันก็ทำอะไรได้น้อย

```yaml
jobs:
  quality: ...
  e2e:
    needs: quality
```
**Fail fast**: ด่านถูกและเร็ววางก่อน ถ้า lint พังไม่ต้องเสียเวลา build + เปิด browser

```yaml
- uses: actions/setup-node@v7
  with:
    node-version-file: .nvmrc   # Node เวอร์ชันเดียวกับเครื่อง dev → "เครื่องผมรันได้" หมดไป
    cache: npm
- run: npm ci                   # ติดตั้งตาม lockfile เป๊ะ — reproducible
```

```yaml
- uses: actions/cache@v6
  with:
    path: .next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ hashFiles('src/**') }}
    restore-keys: nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
```
Cache key ตาม hash ของไฟล์: dependency ไม่เปลี่ยน → ใช้ cache ได้, source เปลี่ยน → ใช้ cache บางส่วนผ่าน `restore-keys`

```yaml
- uses: actions/upload-artifact@v7
  if: failure()
```
เทสต์พังบน CI → ดาวน์โหลด report + trace มาดูได้ว่าพังตอนคลิกอะไร (ตั้ง `trace: "on-first-retry"` ไว้ใน `playwright.config.ts`)

## อ่าน `cd.yml`

```yaml
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
jobs:
  image:
    if: github.event.workflow_run.conclusion == 'success'
```
**CD ต่อจาก CI เท่านั้น** — ไม่มีทาง deploy โค้ดที่เทสต์ไม่ผ่าน

```yaml
env:
  COMMIT_SHA: ${{ github.event.workflow_run.head_sha || github.sha }}
steps:
  - uses: actions/checkout@v7
    with:
      ref: ${{ env.COMMIT_SHA }}
```
build จาก **commit เดียวกับที่ CI ทดสอบ** (ถ้ามีคน push ใหม่ระหว่างนั้น ก็ไม่หลุดไป)

```yaml
tags: |
  type=raw,value=latest
  type=raw,value=sha-${{ env.COMMIT_SHA }}
```
ทุก image มี tag เป็น commit sha → **rollback** = deploy tag ของ commit ก่อนหน้า

## Dockerfile: multi-stage build

```dockerfile
FROM node:22-alpine AS deps      # 1) ติดตั้ง dependencies
FROM node:22-alpine AS builder   # 2) build
FROM node:22-alpine AS runner    # 3) รันจริง — copy แค่ .next/standalone + static + public
USER nextjs                      #    ไม่รันด้วย root
CMD ["node", "server.js"]
```

- `output: "standalone"` ใน `next.config.ts` ทำให้ Next.js คัดเฉพาะไฟล์ที่ต้องใช้รันจริง → image เล็กลงหลายเท่า
- ลำดับ `COPY package*.json` → `npm ci` → `COPY . .` ทำให้ Docker cache layer ของ dependency ได้
  (แก้โค้ดแต่ไม่แก้ dependency → ไม่ต้อง `npm ci` ใหม่)

ลองเอง:

```bash
docker build -t nextjs-learn .
docker run --rm -p 3000:3000 nextjs-learn
```

## ตั้งค่าบน GitHub (ทำครั้งเดียว)

1. **Branch protection**: Settings → Branches → Add rule สำหรับ `main`
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass → เลือก `Lint · Typecheck · Unit test` และ `Build · E2E test`
   - ผลลัพธ์: **ไม่มีใคร merge โค้ดที่ CI แดงได้** — นี่แหละคือ CI ที่แท้จริง
2. **Package visibility**: หลัง CD รันครั้งแรก ไปที่ Packages → เลือก image → ตั้ง public/private
3. **Dependabot** (แนะนำ): สร้าง `.github/dependabot.yml` ให้เปิด PR อัปเดต dependency อัตโนมัติ — CI จะตรวจให้ว่าอัปเดตแล้วพังไหม

## ทางเลือกในการ deploy

| ทางเลือก | เหมาะกับ | CD ทำยังไง |
| --- | --- | --- |
| **Vercel** | เริ่มต้นเร็วสุด, ทีมเล็ก | เชื่อม repo ในเว็บ Vercel → ได้ preview URL ทุก PR + deploy main อัตโนมัติ (ไม่ต้องเขียน workflow) |
| **Docker + VPS** | คุมเองทั้งหมด, ค่าใช้จ่ายคงที่ | ต่อ step `ssh` เข้า server → `docker pull` + `docker run` |
| **Cloud Run / Fly.io / Railway** | scale อัตโนมัติ ไม่ต้องดูแล server | ต่อ step deploy image จาก ghcr.io |
| **Kubernetes** | องค์กรใหญ่ หลาย service | อัปเดต image tag ใน manifest (GitOps: Argo CD/Flux) |

ตัวอย่างต่อ step deploy ไป VPS (ต่อท้าย job ใน `cd.yml` ต้องตั้ง secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY`):

```yaml
- name: Deploy to VPS
  env:
    SSH_KEY: ${{ secrets.SSH_KEY }}
  run: |
    install -m 600 /dev/null key && echo "$SSH_KEY" > key
    ssh -i key -o StrictHostKeyChecking=accept-new ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} \
      "docker pull ghcr.io/${{ github.repository }}:sha-$COMMIT_SHA && \
       (docker rm -f web || true) && \
       docker run -d --name web -p 80:3000 --restart unless-stopped ghcr.io/${{ github.repository }}:sha-$COMMIT_SHA"
```

> ⚠️ แอปนี้เก็บข้อมูลใน memory — restart แล้วข้อมูลหาย และถ้ารันหลาย instance ข้อมูลจะไม่ตรงกัน
> ก่อน deploy ของจริงต้องเปลี่ยน `repository.ts` ไปใช้ database (Capstone ใน บท 00)

## หลักการ CI/CD ที่ดี (จำไว้ใช้ทุกที่)

1. **เร็ว** — CI ช้ากว่า 10 นาทีคนจะเลิกสนใจ → เรียงด่านเร็วก่อน, cache, ขนาน
2. **เชื่อถือได้** — เทสต์ flaky (บางทีผ่านบางทีพัง) ทำลายความเชื่อใจ ต้องแก้ทันที ห้าม "กด re-run ไปเรื่อยๆ"
3. **Build ครั้งเดียว deploy หลายที่** — image เดียวกันไป staging แล้ว production (config ต่างกันผ่าน env)
4. **ย้อนกลับได้เสมอ** — ทุก deploy มี version (sha tag)
5. **Secret อยู่ใน GitHub Secrets** ไม่ใช่ในโค้ด
6. **Pipeline คือโค้ด** — อยู่ใน repo, review ได้, มีประวัติ

## แบบฝึกหัด

1. สร้าง branch, แก้ให้ lint พัง (เช่น ตัวแปรที่ไม่ได้ใช้), push, เปิด PR → ดู CI แดง → แก้ → เขียว
2. เพิ่ม step `npm audit --audit-level=high` ใน job `quality`
3. ทำ matrix: ให้ job `quality` รันบน Node 22 และ 24 (`strategy.matrix.node`)
4. สร้าง `.github/dependabot.yml` สำหรับ npm และ github-actions รายสัปดาห์
5. เชื่อม repo กับ Vercel แล้วเปิด PR — สังเกต preview URL ที่ได้
