import { NextResponse } from "next/server";
import { ExampleService } from "@/services/example.service";
import { ENV } from "@/config/env";

// ====================== Security Configuration ======================

const ALLOWED_IPS = [
  "127.0.0.1",
  "::1",
  "192.168.4.30",        
  // เพิ่ม IP อื่นๆ ที่ต้องการได้
];

const requestLog = new Map<string, number[]>();

// Rate Limiting
function isRateLimited(ip: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  let requests = requestLog.get(ip) || [];
  
  requests = requests.filter(time => now - time < windowMs);
  
  if (requests.length >= limit) {
    return true;
  }

  requests.push(now);
  requestLog.set(ip, requests);
  return false;
}

// ตรวจสอบ IP Whitelist
function isAllowedIP(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  return ALLOWED_IPS.includes(ip);
}

// ====================== Main Handler ======================

export async function GET(request: Request) {
  const token = request.headers.get("x-cron-token");
  const secret = request.headers.get("x-cron-secret");

  // ดึง IP ให้ถูกต้องที่สุด
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = (forwardedFor?.split(",")[0] || realIp || "unknown").trim();

  // === Security Layer 1: Credentials ===
  if (!token || !secret) {
    console.warn(`⚠️ Missing credentials | IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token !== ENV.cronToken || secret !== ENV.cronSecret) {
    console.warn(`⚠️ Invalid credentials | IP: ${clientIp}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // === Security Layer 2: IP Whitelist ===
  if (!isAllowedIP(clientIp)) {
    console.warn(`⛔ Access denied from unauthorized IP: ${clientIp}`);
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // === Security Layer 3: Rate Limiting ===
  if (isRateLimited(clientIp)) {
    console.warn(`⛔ Rate limit exceeded | IP: ${clientIp}`);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // === Execute ===
  try {
    console.log(`🔄 Cron triggered | IP: ${clientIp} | Time: ${new Date().toISOString()}`);

    const result = await ExampleService.triggerReport();

    console.log(`✅ Cron completed successfully | Staff: ${result.staff.length} | Intern: ${result.intern.length}`);

    return NextResponse.json({
      success: true,
      message: "ส่งรายงานชาร์ทค้างสำเร็จ",
      meta: {
        staffCount: result.staff.length,
        internCount: result.intern.length,
        total: result.staff.length + result.intern.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Cron execution failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}