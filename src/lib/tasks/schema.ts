import { z } from "zod";

/**
 * Layer 1 — Domain: "ข้อมูลหน้าตาเป็นยังไง และอะไรคือข้อมูลที่ถูกต้อง"
 * ไฟล์นี้ไม่รู้จัก React, ไม่รู้จัก Next.js — เป็น TypeScript ล้วน จึงเทสต์ง่ายที่สุด
 */

export const TASK_TITLE_MAX = 100;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  createdAt: z.string(), // ISO string: serializable ข้าม server → client ได้
});

export type Task = z.infer<typeof taskSchema>;

/** กฎของ input ที่มาจากผู้ใช้ (อย่าเชื่อ input จาก client เด็ดขาด) */
export const createTaskInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "กรุณาใส่ชื่องาน")
    .max(TASK_TITLE_MAX, `ชื่องานต้องไม่เกิน ${TASK_TITLE_MAX} ตัวอักษร`),
});

export type CreateTaskInput = z.infer<typeof createTaskInput>;

/** รูปร่างของ state ที่ Server Action ส่งกลับไปให้ฟอร์ม */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: { title?: string[] };
  values?: { title?: string };
};

export const initialFormState: FormState = { status: "idle" };
