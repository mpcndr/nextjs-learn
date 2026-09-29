import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { taskRepo } from "./repository";

/**
 * Layer 3 — Queries (อ่านข้อมูล + นโยบาย cache)
 *
 * `'use cache'` บอก Next.js ว่า "ผลลัพธ์ของฟังก์ชันนี้เก็บไว้ใช้ซ้ำได้"
 * `cacheTag` แปะป้ายไว้ เพื่อให้ Server Action สั่ง `updateTag('tasks')` ล้าง cache ได้ทันทีหลังแก้ข้อมูล
 * `cacheLife` บอกอายุของ cache
 *
 * `import "server-only"` = ถ้าเผลอ import ไฟล์นี้ไปใช้ใน Client Component จะ build fail ทันที
 */
export const TASKS_TAG = "tasks";
export const taskTag = (id: string) => `task:${id}`;

export async function getTasks() {
  "use cache";
  cacheLife("hours");
  cacheTag(TASKS_TAG);
  return taskRepo.list();
}

export async function getTask(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(TASKS_TAG, taskTag(id));
  return taskRepo.get(id);
}
