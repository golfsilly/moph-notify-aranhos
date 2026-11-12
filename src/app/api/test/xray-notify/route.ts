import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ENV } from "@/config/env";
import { XrayCheckInProgressError } from "@/lib/xraydb";
import { XrayPortableService } from "@/services/xray-portable/xray-portable.service";

function matchesSecret(actual: string | null, expected: string): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// This endpoint sends real notifications. GET is deliberately unsupported.
export async function POST(request: Request) {
  if (
    !matchesSecret(request.headers.get("x-cron-token"), ENV.cronToken) ||
    !matchesSecret(request.headers.get("x-cron-secret"), ENV.cronSecret)
  ) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await XrayPortableService.checkAndNotifyNewCases();
    return NextResponse.json({
      success: result.failedNotifications === 0,
      data: {
        totalCasesFound: result.totalCasesFound,
        newCasesCount: result.newCases.length,
        duplicateCasesCount: result.duplicateCases.length,
        notificationsSent: result.notificationsSent,
        failedNotifications: result.failedNotifications,
      },
    }, { status: result.failedNotifications === 0 ? 200 : 503 });
  } catch (error) {
    if (error instanceof XrayCheckInProgressError) {
      return NextResponse.json({ success: false, error: "A check is already running" }, { status: 409 });
    }
    console.error("[XrayService] Manual check failed:", error);
    return NextResponse.json({ success: false, error: "Notification check failed" }, { status: 500 });
  }
}
