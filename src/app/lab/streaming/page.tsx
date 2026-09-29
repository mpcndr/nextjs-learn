import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Lab: Streaming" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** จำลองข้อมูลที่ช้า และต้องสดทุก request (ไม่ cache) */
async function Slow({ ms, label }: { ms: number; label: string }) {
  await connection(); // บอก Next.js: "ส่วนนี้ต้องรอ request จริง ห้าม prerender"
  await sleep(ms);
  return (
    <p className="rounded bg-green-100 px-3 py-2 dark:bg-green-900">
      ✅ {label} มาถึงหลัง {ms}ms
    </p>
  );
}

const Skeleton = ({ label }: { label: string }) => (
  <p className="animate-pulse rounded bg-zinc-200 px-3 py-2 dark:bg-zinc-800">⏳ รอ {label}…</p>
);

export default function StreamingLab() {
  return (
    <div className="space-y-4">
      {/* ส่วนนี้ static → อยู่ใน HTML แรกที่ส่งถึง browser ทันที */}
      <h1 className="text-2xl font-bold">Lab: Streaming</h1>
      <p>หัวข้อนี้โผล่ทันที ส่วนกล่องข้างล่างทยอย “ไหล” ตามมาทีละอันใน HTTP response เดียวกัน</p>

      {/* แต่ละ Suspense = จุดที่ HTML แยกส่งได้อิสระ อันเร็วไม่ต้องรออันช้า */}
      <Suspense fallback={<Skeleton label="ข้อมูลเร็ว" />}>
        <Slow ms={500} label="ข้อมูลเร็ว" />
      </Suspense>
      <Suspense fallback={<Skeleton label="ข้อมูลช้า" />}>
        <Slow ms={2000} label="ข้อมูลช้า" />
      </Suspense>
    </div>
  );
}
