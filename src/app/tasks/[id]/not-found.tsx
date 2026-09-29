import Link from "next/link";

export default function TaskNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">ไม่พบงานนี้</h1>
      <Link href="/tasks" className="underline">
        กลับไปดูรายการงาน
      </Link>
    </div>
  );
}
