import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">404 — ไม่พบหน้านี้</h1>
      <Link href="/" className="underline">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
