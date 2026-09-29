"use client";

import { useState } from "react";

/** Client Component คลาสสิก: มี state + event handler → ต้องรันใน browser */
export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button
      onClick={() => setCount((c) => c + 1)}
      className="rounded-md border border-zinc-400 px-3 py-1"
    >
      กดแล้ว {count} ครั้ง
    </button>
  );
}
