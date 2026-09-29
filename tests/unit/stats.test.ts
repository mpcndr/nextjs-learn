import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/tasks/stats";

describe("summarize", () => {
  it("list ว่าง ไม่หารด้วยศูนย์", () => {
    expect(summarize([])).toEqual({ total: 0, done: 0, remaining: 0, percent: 0 });
  });

  it("นับและปัดเปอร์เซ็นต์", () => {
    expect(summarize([{ done: true }, { done: false }, { done: false }])).toEqual({
      total: 3,
      done: 1,
      remaining: 2,
      percent: 33,
    });
  });
});
