import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLink } from "@/components/nav-link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Next.js Learn", template: "%s · Next.js Learn" },
  description: "เรียน Next.js ตั้งแต่พื้นฐานจนถึงแก่น พร้อม CI/CD",
};

/**
 * Root Layout: ห่อทุกหน้า และ "ไม่ re-render" ตอนเปลี่ยนหน้า (state ใน layout จึงคงอยู่)
 * เป็น Server Component — มีแค่ <NavLink> ที่เป็น client
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-2xl gap-4 px-4 py-3 text-sm">
            <NavLink href="/">หน้าแรก</NavLink>
            <NavLink href="/tasks">Tasks</NavLink>
            <NavLink href="/lab/boundary">Lab: Boundary</NavLink>
            <NavLink href="/lab/streaming">Lab: Streaming</NavLink>
            <NavLink href="/lab/error">Lab: Error</NavLink>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
