"use client";

import { useState } from "react";

/**
 * Client Component ที่รับ `children` → children จะเป็น Server Component ก็ได้!
 * เพราะ server render children เสร็จแล้วค่อยส่ง "ผลลัพธ์" มาเสียบในช่องนี้
 * (client ไม่ต้องรู้ว่า children ถูกสร้างมายังไง)
 */
export function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-zinc-300 dark:border-zinc-700">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full px-3 py-2 text-left font-medium"
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div className="border-t border-zinc-300 px-3 py-2 dark:border-zinc-700">{children}</div>}
    </div>
  );
}
