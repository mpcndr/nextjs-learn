"use client";

import { useActionState } from "react";
import { createTask } from "@/app/tasks/actions";
import { initialFormState, TASK_TITLE_MAX } from "@/lib/tasks/schema";

/**
 * Client Component เพราะต้องใช้ hook (useActionState) เพื่อแสดง pending + error
 * แต่ตัว logic จริงอยู่ที่ server (createTask) — client แค่ "ส่ง" และ "แสดงผล"
 *
 * Progressive enhancement: ถ้า JS ยังโหลดไม่เสร็จ ฟอร์มนี้ก็ยัง submit ได้ เพราะเป็น <form action> จริงๆ
 */
export function TaskForm() {
  const [state, formAction, pending] = useActionState(
    createTask,
    initialFormState,
  );
  const titleError = state.fieldErrors?.title?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="title" className="text-sm font-medium">
        งานใหม่
      </label>
      <div className="flex gap-2">
        <input
          id="title"
          name="title"
          // key เปลี่ยนเมื่อ submit เสร็จ → input ถูกสร้างใหม่ด้วย defaultValue ล่าสุด
          key={`${state.status}-${state.message}`}
          defaultValue={state.values?.title}
          maxLength={TASK_TITLE_MAX}
          placeholder="เช่น อ่านบทที่ 4"
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "title-error" : undefined}
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก…" : "เพิ่ม"}
        </button>
      </div>
      {titleError && (
        <p id="title-error" role="alert" className="text-sm text-red-600">
          {titleError}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="text-sm text-green-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
