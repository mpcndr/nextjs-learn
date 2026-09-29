import type { Task } from "./schema";

/**
 * Layer 2 — Data Access: "เก็บ/อ่านข้อมูลจากที่ไหน"
 *
 * ตอนนี้เก็บใน memory เพื่อให้รันได้ทันทีโดยไม่ต้องมี database
 * แต่เพราะเราซ่อนไว้หลัง interface `TaskRepository` วันหนึ่งจะเปลี่ยนเป็น
 * Postgres/Prisma/Drizzle ก็แก้แค่ไฟล์นี้ — layer อื่นไม่ต้องรู้เลย
 */
export interface TaskRepository {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task | undefined>;
  create(title: string): Promise<Task>;
  toggle(id: string): Promise<Task | undefined>;
  remove(id: string): Promise<boolean>;
}

type Options = {
  seed?: Task[];
  now?: () => Date;
  newId?: () => string;
};

/** Factory แทน singleton ตรงๆ → ในเทสต์เราสร้าง repo ใหม่ที่สะอาดได้ทุกครั้ง */
export function createInMemoryTaskRepository({
  seed = [],
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
}: Options = {}): TaskRepository {
  const tasks = new Map<string, Task>(seed.map((t) => [t.id, { ...t }]));

  return {
    async list() {
      // คืน copy เสมอ ป้องกันคนข้างนอกแก้ state ภายในโดยไม่ตั้งใจ
      return [...tasks.values()]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((t) => ({ ...t }));
    },
    async get(id) {
      const task = tasks.get(id);
      return task ? { ...task } : undefined;
    },
    async create(title) {
      const task: Task = {
        id: newId(),
        title,
        done: false,
        createdAt: now().toISOString(),
      };
      tasks.set(task.id, task);
      return { ...task };
    },
    async toggle(id) {
      const task = tasks.get(id);
      if (!task) return undefined;
      task.done = !task.done;
      return { ...task };
    },
    async remove(id) {
      return tasks.delete(id);
    },
  };
}

const seed: Task[] = [
  {
    id: "learn-routing",
    title: "เข้าใจ File-system Routing",
    done: true,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "learn-rsc",
    title: "เข้าใจ Server vs Client Components",
    done: false,
    createdAt: "2026-01-02T09:00:00.000Z",
  },
  {
    id: "learn-cicd",
    title: "ตั้ง CI/CD ด้วย GitHub Actions",
    done: false,
    createdAt: "2026-01-03T09:00:00.000Z",
  },
];

/**
 * เก็บ instance ไว้บน globalThis เพื่อไม่ให้ข้อมูลหายตอน dev server ทำ hot reload
 * (Hot reload จะ re-evaluate module ใหม่ แต่ globalThis ยังอยู่)
 */
const globalForRepo = globalThis as unknown as { taskRepo?: TaskRepository };

export const taskRepo: TaskRepository =
  globalForRepo.taskRepo ?? createInMemoryTaskRepository({ seed });

globalForRepo.taskRepo = taskRepo;
