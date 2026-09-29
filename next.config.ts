import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // โมเดล cache/rendering ใหม่ของ Next.js 16: ทุกอย่าง dynamic โดยปริยาย
  // จะ cache อะไรต้องบอกเองด้วย 'use cache' (explicit ดีกว่า implicit) — อ่าน docs/07
  cacheComponents: true,
  // สร้างโฟลเดอร์ .next/standalone ที่มีแค่ไฟล์ที่ต้องใช้รันจริง → Docker image เล็ก (docs/12)
  output: "standalone",
  // ปิด header "X-Powered-By: Next.js" ไม่ต้องบอกใครว่าเราใช้อะไร
  poweredByHeader: false,
};

export default nextConfig;
