import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lab: Error" };

type SearchParams = PageProps<"/lab/error">["searchParams"];

async function MaybeCrash({ searchParams }: { searchParams: SearchParams }) {
  const { crash } = await searchParams;
  if (crash === "1") {
    throw new Error("ตั้งใจพังเพื่อดู error boundary");
  }
  return <p>ทุกอย่างปกติดี 👍</p>;
}

export default function ErrorLab({ searchParams }: PageProps<"/lab/error">) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lab: Error boundary</h1>
      <p>
        <Link className="underline" href="/lab/error?crash=1">กดเพื่อทำให้พัง</Link> — แล้วดูว่า
        error.tsx ที่อยู่โฟลเดอร์เดียวกันมารับช่วงแทน ไม่ใช่ทั้งแอปพัง
      </p>
      {/* searchParams เป็นข้อมูลจาก request → ต้องอยู่ใน Suspense */}
      <Suspense fallback={<p>…</p>}>
        <MaybeCrash searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
