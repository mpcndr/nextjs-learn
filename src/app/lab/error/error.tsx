"use client";

export default function LabError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div role="alert" className="space-y-2 rounded-md border border-red-400 p-4">
      <h2 className="font-semibold text-red-600">Error boundary จับได้!</h2>
      {/* ใน production ข้อความ error จาก server จะถูกซ่อน เหลือแค่ digest (กันข้อมูลลับรั่ว) */}
      <p className="text-sm">{error.message}</p>
      {error.digest && <p className="text-xs text-zinc-500">digest: {error.digest}</p>}
      {/* ใช้ <a> ธรรมดา = โหลดหน้าใหม่ทั้งหน้า → state ของ error boundary ถูกล้างแน่นอน */}
      <a href="/lab/error" className="underline">
        กลับสู่สภาพปกติ
      </a>
    </div>
  );
}
