import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (ชื่อเดิม: Middleware) — รัน "ก่อน" ทุก request ที่ตรง matcher
 * เหมาะกับงานเบาๆ: redirect, rewrite, เติม header, เช็ค cookie แบบคร่าวๆ
 * ไม่เหมาะกับ: query database, auth เต็มรูปแบบ (ให้ทำใน Server Component/Action)
 */
export function proxy(request: NextRequest) {
  // ตัวอย่าง: URL เก่า /todo → /tasks
  if (request.nextUrl.pathname === "/todo") {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }

  const response = NextResponse.next();
  // ติด request id ทุก response — มีประโยชน์ตอนไล่ log ใน production
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

export const config = {
  // ไม่ต้องรันกับไฟล์ static
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
