"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { taskRepo } from "@/lib/tasks/repository";
import { TASKS_TAG, taskTag } from "@/lib/tasks/queries";
import { createTaskInput, type FormState } from "@/lib/tasks/schema";

/**
 * Layer 4 — Mutations (Server Actions)
 *
 * ทุก action ทำตามสูตรเดียวกัน:
 *   1. รับ input  →  2. validate  →  3. (auth — แอปนี้ยังไม่มี)  →  4. แก้ข้อมูล  →  5. ล้าง cache  →  6. ตอบกลับ/redirect
 *
 * ⚠️ Server Action = HTTP POST endpoint สาธารณะ ใครก็ยิงตรงได้โดยไม่ผ่าน UI
 *    ดังนั้น validate ทุกครั้ง (และในแอปจริงต้องเช็คสิทธิ์ทุกครั้ง)
 */

export async function createTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = { title: String(formData.get("title") ?? "") };
  const parsed = createTaskInput.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "ข้อมูลไม่ถูกต้อง",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: raw, // ส่งค่าเดิมกลับไป ผู้ใช้จะได้ไม่ต้องพิมพ์ใหม่
    };
  }

  const task = await taskRepo.create(parsed.data.title);
  updateTag(TASKS_TAG); // ล้าง cache ทันที → ผู้ใช้เห็นงานใหม่ของตัวเองเลย (read-your-own-writes)

  return { status: "success", message: `เพิ่ม "${task.title}" แล้ว` };
}

export async function toggleTask(id: string) {
  const task = await taskRepo.toggle(id);
  if (!task) return;
  updateTag(TASKS_TAG);
  updateTag(taskTag(id));
}

export async function deleteTask(id: string) {
  await taskRepo.remove(id);
  updateTag(TASKS_TAG);
  updateTag(taskTag(id));
  redirect("/tasks"); // redirect() throw เพื่อหยุดการทำงาน โค้ดหลังบรรทัดนี้จะไม่รัน
}
