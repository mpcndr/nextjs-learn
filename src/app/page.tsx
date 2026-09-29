import Link from "next/link";

// หน้านี้ไม่มีข้อมูล dynamic เลย → ถูก prerender เป็น HTML ตอน build (static) ทั้งหน้า
export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Next.js Learn 🚀</h1>
      <p>
        repo นี้คือทั้ง <strong>บทเรียน</strong> (โฟลเดอร์ <code>docs/</code>) และ
        <strong> แอปจริง</strong> ที่ทุกบทอ้างถึง เปิดโค้ดอ่านคู่กับบทเรียนได้เลย
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <Link className="underline" href="/tasks">/tasks</Link> — แอป CRUD ครบวงจร (Server
          Components, Server Actions, Cache, Optimistic UI)
        </li>
        <li>
          <Link className="underline" href="/lab/boundary">/lab/boundary</Link> — เส้นแบ่ง Server ↔
          Client
        </li>
        <li>
          <Link className="underline" href="/lab/streaming">/lab/streaming</Link> — Suspense &
          Streaming
        </li>
        <li>
          <Link className="underline" href="/lab/error">/lab/error</Link> — Error boundary
        </li>
        <li>
          <a className="underline" href="/api/tasks">/api/tasks</a> — Route Handler (JSON API)
        </li>
      </ul>
    </div>
  );
}
