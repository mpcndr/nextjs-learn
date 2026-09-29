"use client";

import { useOptimistic } from "react";
import { toggleTask } from "@/app/tasks/actions";

/**
 * Optimistic UI: เปลี่ยนหน้าจอ "ก่อน" server ตอบ ให้รู้สึกเร็ว
 * ถ้า server ทำสำเร็จ ข้อมูลจริงจะตามมาแทนที่; ถ้าพัง React จะย้อนกลับค่าเดิมให้เอง
 */
export function TaskToggle({
  id,
  title,
  done,
}: {
  id: string;
  title: string;
  done: boolean;
}) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);

  return (
    <form
      action={async () => {
        setOptimisticDone(!optimisticDone);
        await toggleTask(id);
      }}
    >
      <button
        type="submit"
        role="checkbox"
        aria-checked={optimisticDone}
        aria-label={`สลับสถานะ ${title}`}
        className="flex h-5 w-5 items-center justify-center rounded border border-zinc-400 text-xs"
      >
        {optimisticDone ? "✓" : ""}
      </button>
    </form>
  );
}
