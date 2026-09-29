"use client"; // Error boundary ต้องเป็น Client Component (มันคือ React Error Boundary)

import { useEffect } from "react";

export default function TasksError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // แอปจริง: ส่งไป Sentry / Datadog ฯลฯ
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="space-y-2">
      <h2 className="font-semibold">โหลด Tasks ไม่สำเร็จ</h2>
      <button onClick={() => retry()} className="underline">
        ลองใหม่
      </button>
    </div>
  );
}
