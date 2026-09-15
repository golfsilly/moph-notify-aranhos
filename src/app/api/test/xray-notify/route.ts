import { NextResponse } from "next/server";
import { XrayPortableService } from "@/services/xray-portable/xray-portable.service";

/**
 * Manual test endpoint for X-ray notification system
 * GET /api/test/xray-notify
 *
 * Returns the result of checking and notifying new X-ray cases
 * This can be used to manually trigger the notification system
 * without waiting for the scheduled cron job (5 minutes)
 */
export async function GET() {
  try {
    console.log("🧪 [Test] Triggering X-ray notification check manually");

    const result = await XrayPortableService.checkAndNotifyNewCases();

    return NextResponse.json(
      {
        success: true,
        data: {
          totalCasesFound: result.totalCasesFound,
          newCasesCount: result.newCases.length,
          duplicateCasesCount: result.duplicateCases.length,
          notificationsSent: result.notificationsSent,
          failedNotifications: result.failedNotifications,
          message: result.message,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ [Test] X-ray notify test endpoint error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
