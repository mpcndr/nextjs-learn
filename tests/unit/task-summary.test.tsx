import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TaskSummary } from "@/components/task-summary";

afterEach(cleanup);

describe("<TaskSummary />", () => {
  it("แสดงจำนวนงานและ progress bar", () => {
    render(<TaskSummary tasks={[{ done: true }, { done: false }]} />);
    expect(screen.getByText("เสร็จแล้ว 1 จาก 2 งาน (50%)")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
  });
});
