import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryTaskRepository, type TaskRepository } from "@/lib/tasks/repository";

describe("InMemoryTaskRepository", () => {
  let repo: TaskRepository;
  let n: number;

  // สร้าง repo ใหม่ทุกเทสต์ + ฉีด clock/id ที่ควบคุมได้ → ผลลัพธ์แน่นอน (deterministic)
  beforeEach(() => {
    n = 0;
    repo = createInMemoryTaskRepository({
      now: () => new Date(Date.UTC(2026, 0, 1, 0, n)),
      newId: () => `id-${++n}`,
    });
  });

  it("create แล้ว list เจอ โดยงานใหม่สุดอยู่บนสุด", async () => {
    await repo.create("แรก");
    await repo.create("สอง");
    const titles = (await repo.list()).map((t) => t.title);
    expect(titles).toEqual(["สอง", "แรก"]);
  });

  it("toggle สลับสถานะ done", async () => {
    const task = await repo.create("งาน");
    expect((await repo.toggle(task.id))?.done).toBe(true);
    expect((await repo.toggle(task.id))?.done).toBe(false);
  });

  it("toggle id ที่ไม่มีอยู่ คืน undefined", async () => {
    expect(await repo.toggle("nope")).toBeUndefined();
  });

  it("remove แล้ว get ไม่เจอ", async () => {
    const task = await repo.create("งาน");
    expect(await repo.remove(task.id)).toBe(true);
    expect(await repo.get(task.id)).toBeUndefined();
  });

  it("ข้อมูลที่คืนออกไปเป็น copy — แก้ข้างนอกไม่กระทบข้างใน", async () => {
    const task = await repo.create("งาน");
    const [listed] = await repo.list();
    listed.title = "โดนแก้";
    expect((await repo.get(task.id))?.title).toBe("งาน");
  });
});
