import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTask } from "@/lib/tasks/queries";
import { deleteTask } from "@/app/tasks/actions";

/**
 * Dynamic route: โฟลเดอร์ [id] → /tasks/อะไรก็ได้
 * `params` เป็น Promise (Next.js 15+) เพราะค่ามันมาจาก request จริง ไม่ใช่ตอน build
 *
 * เนื่องจาก task ถูกสร้างตอน runtime (ไม่รู้ล่วงหน้าตอน build) เราจึงห่อส่วนที่อ่าน params
 * ด้วย <Suspense>: shell ของหน้า (ลิงก์ย้อนกลับ) ส่งไปก่อน, รายละเอียด stream ตามมา
 */
export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/tasks" className="text-sm underline">
        ← กลับไป Tasks
      </Link>
      <Suspense fallback={<p>กำลังโหลด…</p>}>
        <TaskDetail params={params} />
      </Suspense>
    </div>
  );
}

async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound(); // throw → Next.js ไปแสดง not-found.tsx ที่ใกล้ที่สุด

  // .bind() ผูก id เข้าไปใน action (ค่าที่ bind จะถูกเข้ารหัสส่งไปพร้อมฟอร์ม)
  const deleteThis = deleteTask.bind(null, task.id);

  return (
    <article className="space-y-3">
      <h1 className="text-2xl font-bold">{task.title}</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
        <dt className="text-zinc-500">สถานะ</dt>
        <dd>{task.done ? "เสร็จแล้ว ✅" : "ยังไม่เสร็จ"}</dd>
        <dt className="text-zinc-500">สร้างเมื่อ</dt>
        <dd>
          <time dateTime={task.createdAt}>{task.createdAt.slice(0, 10)}</time>
        </dd>
      </dl>
      <form action={deleteThis}>
        <button type="submit" className="rounded-md border border-red-500 px-3 py-1 text-red-600">
          ลบงานนี้
        </button>
      </form>
    </article>
  );
}
