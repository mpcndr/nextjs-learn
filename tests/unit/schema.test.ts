import { describe, expect, it } from "vitest";
import { createTaskInput, TASK_TITLE_MAX } from "@/lib/tasks/schema";

describe("createTaskInput", () => {
  it("ตัดช่องว่างหัวท้ายให้", () => {
    expect(createTaskInput.parse({ title: "  อ่านหนังสือ  " })).toEqual({ title: "อ่านหนังสือ" });
  });

  it("ไม่รับชื่อว่าง (แม้จะเป็นช่องว่างล้วน)", () => {
    const result = createTaskInput.safeParse({ title: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("กรุณาใส่ชื่องาน");
  });

  it(`ไม่รับชื่อยาวเกิน ${TASK_TITLE_MAX} ตัวอักษร`, () => {
    expect(createTaskInput.safeParse({ title: "ก".repeat(TASK_TITLE_MAX) }).success).toBe(true);
    expect(createTaskInput.safeParse({ title: "ก".repeat(TASK_TITLE_MAX + 1) }).success).toBe(false);
  });
});
