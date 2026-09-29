import type { Task } from "./schema";

/** Pure function: input เดิม → output เดิมเสมอ ไม่มี side effect → เทสต์ง่ายสุด */
export function summarize(tasks: Pick<Task, "done">[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, remaining: total - done, percent };
}
