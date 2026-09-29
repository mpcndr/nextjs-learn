import Link from "next/link";
import type { Metadata } from "next";
import { getTasks } from "@/lib/tasks/queries";
import { TaskForm } from "@/components/task-form";
import { TaskSummary } from "@/components/task-summary";
import { TaskToggle } from "@/components/task-toggle";

export const metadata: Metadata = { title: "Tasks" };

/**
 * Layer 5 — UI (Server Component)
 * async component ได้! await ข้อมูลตรงๆ ใน component ไม่ต้อง useEffect ไม่ต้อง API
 * เพราะโค้ดนี้รันบน server เท่านั้น
 */
export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <TaskSummary tasks={tasks} />
      <TaskForm />

      {tasks.length === 0 ? (
        <p className="text-zinc-500">ยังไม่มีงาน ลองเพิ่มดูสิ</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" aria-label="รายการงาน">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 py-2">
              {/* Server Component ส่ง props (ต้อง serializable) ให้ Client Component */}
              <TaskToggle id={task.id} title={task.title} done={task.done} />
              <Link
                href={`/tasks/${task.id}`}
                className={task.done ? "text-zinc-400 line-through" : ""}
              >
                {task.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
