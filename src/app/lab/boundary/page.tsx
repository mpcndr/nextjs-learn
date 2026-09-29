import type { Metadata } from "next";
import { Counter } from "@/components/counter";
import { Collapsible } from "@/components/collapsible";

export const metadata: Metadata = { title: "Lab: Server ↔ Client" };

/** Server Component: อ่านข้อมูลที่มีแค่บน server ได้ (process, env, file system, DB) */
function ServerOnlyInfo() {
  return (
    <ul className="list-disc pl-6 text-sm">
      <li>Node.js บน server: {process.versions.node}</li>
      <li>Platform: {process.platform}</li>
      <li>โค้ดของ component นี้ไม่ถูกส่งไป browser เลยสักบรรทัด</li>
    </ul>
  );
}

export default function BoundaryLab() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lab: เส้นแบ่ง Server ↔ Client</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">1. Client Component ธรรมดา</h2>
        <Counter />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">2. Server Component ซ้อนอยู่ใน Client Component (ผ่าน children)</h2>
        <Collapsible title="ข้อมูลจาก server">
          <ServerOnlyInfo />
        </Collapsible>
      </section>

      <p className="text-sm text-zinc-500">
        ลองเปิด DevTools → Sources: จะเจอโค้ดของ Counter กับ Collapsible แต่ไม่เจอ ServerOnlyInfo
      </p>
    </div>
  );
}
