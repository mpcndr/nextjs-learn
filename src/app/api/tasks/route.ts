import { getTasks } from "@/lib/tasks/queries";

/**
 * Route Handler = API endpoint แบบดั้งเดิม (GET /api/tasks)
 * ใช้เมื่อ "คนอื่น" ต้องเรียก (mobile app, webhook, third-party)
 * ถ้าแค่ UI ของเราเองจะแก้ข้อมูล → ใช้ Server Action ง่ายกว่า
 */
export async function GET() {
  const tasks = await getTasks();
  return Response.json({ tasks });
}
