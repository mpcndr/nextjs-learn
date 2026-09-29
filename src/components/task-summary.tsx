import { summarize } from "@/lib/tasks/stats";
import type { Task } from "@/lib/tasks/schema";

/**
 * ไม่มี "use client" → เป็น Server Component โดยปริยาย
 * (แต่เพราะไม่ได้ใช้ hook/browser API ใดๆ จะถูก import ไปใช้ฝั่ง client ก็ได้เหมือนกัน)
 */
export function TaskSummary({ tasks }: { tasks: Pick<Task, "done">[] }) {
  const { total, done, percent } = summarize(tasks);
  return (
    <div>
      <p className="text-sm text-zinc-500">
        เสร็จแล้ว {done} จาก {total} งาน ({percent}%)
      </p>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full bg-green-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
