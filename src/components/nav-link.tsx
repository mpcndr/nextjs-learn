"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { href: string; children: React.ReactNode };

const base = "text-zinc-500 hover:text-foreground";
const active = "font-semibold underline";

/**
 * ต้องเป็น Client Component เพราะ usePathname อ่าน URL ปัจจุบันจาก router ฝั่ง browser
 * สังเกตว่าเราแยกแค่ "ลิงก์" ออกมาเป็น client — ไม่ใช่ทั้ง layout → JS ที่ส่งไป browser น้อยที่สุด
 *
 * ทำไมต้องมี <Suspense>? ในหน้า dynamic เช่น /tasks/[id] ตอน build ยังไม่รู้ URL จริง
 * Next.js จึงบังคับให้บอกว่า "ระหว่างยังไม่รู้ ให้แสดงอะไร" → fallback คือลิงก์แบบไม่ไฮไลต์
 * (ลองลบ Suspense ออกแล้วรัน `npm run build` ดู error ที่ได้ — อธิบายไว้ใน docs/07)
 */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Link href={props.href} className={base}>{props.children}</Link>}>
      <ActiveAwareLink {...props} />
    </Suspense>
  );
}

function ActiveAwareLink({ href, children }: Props) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={isActive ? active : base}
    >
      {children}
    </Link>
  );
}
