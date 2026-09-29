# syntax=docker/dockerfile:1
# Multi-stage build: แยกขั้น "สร้าง" กับ "รัน" → image สุดท้ายมีแค่สิ่งที่ต้องใช้ (เล็ก + ปลอดภัยกว่า)

# ---------- 1) deps: ติดตั้ง dependencies (layer นี้ถูก cache ถ้า package-lock ไม่เปลี่ยน) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) builder: build แอป ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 3) runner: image ที่ใช้รันจริง ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# อย่ารันด้วย root
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# output: "standalone" สร้าง server.js + node_modules ที่จำเป็นเท่านั้น
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# ไฟล์ static (JS/CSS) และ public ไม่ถูกรวมใน standalone ต้อง copy เอง
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
