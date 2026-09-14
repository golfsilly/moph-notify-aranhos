import { queryHos } from "@/lib/hosdb";
import {
  XrayCase,
  XrayNotificationLogData,
  XrayNotificationCheckResult,
} from "@/types/xray-portable.type";
import { RowDataPacket } from "mysql2";
import { LineNotifyService } from "../line-notify.service";
import {
  checkExistingNotifications,
  createNotificationLogBatch,
} from "@/lib/xraydb";

// ======================================================
// Helper Functions
// ======================================================

function getThaiTime(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000); // +7 ชั่วโมง (เวลาประเทศไทย)
}

function formatThaiShort(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุวันที่";
  }

  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function formatThaiTimeNow(): string {
  const now = getThaiTime();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} น.`;
}

function formatThaiDateNow(): string {
  const now = getThaiTime();
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${now.getUTCDate()} ${thaiMonths[now.getUTCMonth()]} ${now.getUTCFullYear() + 543}`;
}

function toXrayCases(rows: RowDataPacket[]): XrayCase[] {
  return rows.map((row) => ({
    xn: Number(row.xn),
    vn: row.vn as string,
    hn: row.hn as string,
    order_date: row.order_date as string,
    order_date_time: row.order_date_time as string,
    age: Number(row.age),
    department_name: row.department_name as string,
    xray_list: row.xray_list as string,
    notify_key: row.notify_key as string,
  }));
}

/**
 * Split the raw comma-separated xray_list into a clean bullet list.
 */
function formatXrayItems(xrayList: string): string {
  const items = xrayList
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return "  • ไม่ระบุรายการ";
  }

  return items.map((item) => `  • ${item}`).join("\n");
}

/**
 * Build a single, well-structured LINE alert for one new X-ray case.
 */
function createXrayAlertMessage(xrayCase: XrayCase): string {
  const orderDate = formatThaiShort(xrayCase.order_date);
  const orderTime =
    xrayCase.order_date_time.split(" ")[1]?.substring(0, 5) || "N/A";
  const itemCount = xrayCase.xray_list.split(",").filter(Boolean).length;
  const divider = "━━━━━━━━━━━━━━";

  return [
    "🏥 X-RAY PORTABLE ALERT",
    divider,
    `🏢 แผนก: ${xrayCase.department_name}`,
    `👤 ผู้ป่วย HN: ${xrayCase.hn} (อายุ ${xrayCase.age} ปี)`,
    `📊 VN: ${xrayCase.vn}`,
    `📋 XN: ${xrayCase.xn}`,
    `📅 วันที่สั่ง: ${orderDate}`,
    `🕐 เวลาสั่ง: ${orderTime}`,
    divider,
    `📝 รายการตรวจ (${itemCount} รายการ)`,
    formatXrayItems(xrayCase.xray_list),
    divider,
    `🔔 แจ้งเตือนเมื่อ ${formatThaiTimeNow()}`,
  ].join("\n");
}

// ======================================================
// Daily Stats Accumulator
// ======================================================
// Instead of firing a summary message after every 3-minute cron tick, we
// accumulate counts here across all runs in a day. A separate daily cron
// (registered in index.ts, e.g. 16:00) calls sendDailySummaryAndReset()
// to flush one consolidated report and start counting fresh.

interface DailyStats {
  dateLabel: string;
  runsCount: number;
  totalCasesFound: number;
  newCasesCount: number;
  duplicateCasesCount: number;
  notificationsSent: number;
  failedNotifications: number;
  firstRunAt: string | null;
  lastRunAt: string | null;
}

function emptyDailyStats(): DailyStats {
  return {
    dateLabel: formatThaiDateNow(),
    runsCount: 0,
    totalCasesFound: 0,
    newCasesCount: 0,
    duplicateCasesCount: 0,
    notificationsSent: 0,
    failedNotifications: 0,
    firstRunAt: null,
    lastRunAt: null,
  };
}

let dailyStats: DailyStats = emptyDailyStats();

function accumulateDailyStats(run: {
  totalCasesFound: number;
  newCasesCount: number;
  duplicateCasesCount: number;
  notificationsSent: number;
  failedNotifications: number;
}) {
  const now = formatThaiTimeNow();

  dailyStats.runsCount += 1;
  dailyStats.totalCasesFound += run.totalCasesFound;
  dailyStats.newCasesCount += run.newCasesCount;
  dailyStats.duplicateCasesCount += run.duplicateCasesCount;
  dailyStats.notificationsSent += run.notificationsSent;
  dailyStats.failedNotifications += run.failedNotifications;
  dailyStats.firstRunAt = dailyStats.firstRunAt ?? now;
  dailyStats.lastRunAt = now;
}

function createDailySummaryMessage(stats: DailyStats): string {
  const statusIcon = stats.failedNotifications > 0 ? "⚠️" : "✅";
  const divider = "━━━━━━━━━━━━━━";

  return [
    `${statusIcon} X-RAY PORTABLE — สรุปประจำวัน`,
    `📆 ${stats.dateLabel}`,
    divider,
    `🔁 จำนวนรอบตรวจสอบ  : ${stats.runsCount}`,
    `🔎 พบเคสทั้งหมด      : ${stats.totalCasesFound}`,
    `🆕 เคสใหม่           : ${stats.newCasesCount}`,
    `♻️ เคสซ้ำ (ข้าม)      : ${stats.duplicateCasesCount}`,
    `📤 แจ้งเตือนสำเร็จ   : ${stats.notificationsSent}`,
    `❌ แจ้งเตือนล้มเหลว  : ${stats.failedNotifications}`,
    divider,
    `🕐 รอบแรก : ${stats.firstRunAt ?? "-"}   🕓 รอบล่าสุด : ${stats.lastRunAt ?? "-"}`,
  ].join("\n");
}

// ======================================================
// Main Service
// ======================================================

export class XrayPortableService {
  /**
   * Query X-ray cases from hosxp database with a time window
   * @param minutesBack How many minutes back to look (default: 5 for 5-min cron)
   */
  private static buildXraySql(minutesBack: number = 5): string {
    return `
    SELECT
  xh.pt_xn AS xn,
  xh.vn,
  xh.hn,
  DATE_FORMAT( xh.order_date, '%Y-%m-%d %H:%i:%s' ) AS order_date,
  DATE_FORMAT( xh.order_date_time, '%Y-%m-%d %H:%i:%s' ) AS order_date_time,
  xh.age_y AS age,
  COALESCE ( xh.department_name, 'Unknown' ) AS department_name,
  CAST(
  xh.xray_list AS CHAR ( 10000 )) AS xray_list,
  MD5(
    CONCAT(
      COALESCE ( xh.vn, '' ),
      '|',
      COALESCE ( xh.hn, '' ),
      '|',
      COALESCE ( xh.order_date, '' ),
      '|',
      COALESCE ( CAST( xh.xray_list AS CHAR ( 10000 )), '' ) 
    )) AS notify_key 
FROM
  xray_head xh
  LEFT JOIN patient p ON p.hn = xh.hn 
WHERE
  xh.order_date_time >= DATE_SUB(NOW(), INTERVAL ${minutesBack} MINUTE)
  AND xh.xray_list LIKE '%portable%'
ORDER BY
  xh.order_date DESC;
    `;
  }

  /**
   * Check for new X-ray cases and notify
   * Prevents duplicate notifications by checking Prisma database
   */
  static async checkAndNotifyNewCases(): Promise<XrayNotificationCheckResult> {
    const startTime = Date.now();
    let totalCasesFound = 0;
    let newCasesCount = 0;
    let duplicateCasesCount = 0;
    let notificationsSent = 0;
    let failedNotifications = 0;

    try {
      // Query hosxp for recent X-ray cases (last 5 minutes)
      const xrayRows = await queryHos(this.buildXraySql(5));
      const xrayCases = toXrayCases(xrayRows);

      totalCasesFound = xrayCases.length;
      console.log(
        `📊 [XrayService] Found ${totalCasesFound} X-ray cases in last 5 minutes`,
      );

      if (totalCasesFound === 0) {
        accumulateDailyStats({
          totalCasesFound: 0,
          newCasesCount: 0,
          duplicateCasesCount: 0,
          notificationsSent: 0,
          failedNotifications: 0,
        });

        return {
          totalCasesFound: 0,
          newCases: [],
          duplicateCases: [],
          notificationsSent: 0,
          failedNotifications: 0,
          message: "✅ No new X-ray cases found",
        };
      }

      // Get all notify_keys from cases
      const notifyKeys = xrayCases.map((c) => c.notify_key);

      // Check which cases already exist in our notification log
      const existingNotifyKeys = await checkExistingNotifications(notifyKeys);
      const existingNotifyKeysSet = new Set(existingNotifyKeys);

      // Separate new and duplicate cases
      const newCases = xrayCases.filter(
        (c) => !existingNotifyKeysSet.has(c.notify_key),
      );
      const duplicateCases = xrayCases.filter((c) =>
        existingNotifyKeysSet.has(c.notify_key),
      );

      newCasesCount = newCases.length;
      duplicateCasesCount = duplicateCases.length;

      console.log(
        `✨ [XrayService] New cases: ${newCasesCount}, Duplicates: ${duplicateCasesCount}`,
      );

      if (newCasesCount === 0) {
        accumulateDailyStats({
          totalCasesFound,
          newCasesCount: 0,
          duplicateCasesCount,
          notificationsSent: 0,
          failedNotifications: 0,
        });

        return {
          totalCasesFound,
          newCases: [],
          duplicateCases,
          notificationsSent: 0,
          failedNotifications: 0,
          message: `📋 Found ${totalCasesFound} cases but all are duplicates (already notified)`,
        };
      }

      // Send notifications for new cases
      for (const xrayCase of newCases) {
        try {
          const message = createXrayAlertMessage(xrayCase);
          const success = await LineNotifyService.sendToTest(message);

          if (success) {
            notificationsSent++;
            console.log(
              `✅ [XrayService] Notification sent for XN: ${xrayCase.xn}`,
            );
          } else {
            failedNotifications++;
            console.error(
              `❌ [XrayService] Failed to send notification for XN: ${xrayCase.xn}`,
            );
          }
        } catch (error) {
          failedNotifications++;
          console.error(
            `❌ [XrayService] Error sending notification for XN: ${xrayCase.xn}`,
            error,
          );
        }
      }

      // Log all new cases to database
      if (newCasesCount > 0) {
        const logsToCreate = newCases.map(
          (xrayCase): XrayNotificationLogData => ({
            notify_key: xrayCase.notify_key,
            xn: String(xrayCase.xn),
            vn: xrayCase.vn,
            hn: xrayCase.hn,
            age: xrayCase.age,
            department: xrayCase.department_name,
            xray_list: xrayCase.xray_list,
            order_date: new Date(xrayCase.order_date),
          }),
        );

        // Batch insert into database
        const created = await createNotificationLogBatch(logsToCreate);

        console.log(`💾 [XrayService] Logged ${created} cases to database`);
      }

      const duration = Date.now() - startTime;

      // Roll this run's numbers into the daily total instead of sending a
      // per-run LINE summary. The daily cron flushes it at 16:00.
      accumulateDailyStats({
        totalCasesFound,
        newCasesCount,
        duplicateCasesCount,
        notificationsSent,
        failedNotifications,
      });

      return {
        totalCasesFound,
        newCases,
        duplicateCases,
        notificationsSent,
        failedNotifications,
        message: `✅ Processed ${totalCasesFound} cases | New: ${newCasesCount} | Sent: ${notificationsSent} | Failed: ${failedNotifications} | (${duration}ms)`,
      };
    } catch (error) {
      console.error("❌ [XrayService] checkAndNotifyNewCases Error:", error);
      throw error;
    }
  }

  /**
   * Send the accumulated daily summary to LINE, then reset counters for
   * the next day. Intended to be called once per day (e.g. 16:00) by a
   * dedicated cron job in index.ts.
   */
  static async sendDailySummaryAndReset(): Promise<void> {
    const snapshot = dailyStats;

    try {
      const message = createDailySummaryMessage(snapshot);
      await LineNotifyService.sendToTest(message);
      console.log(
        `📨 [XrayService] Sent daily summary | runs=${snapshot.runsCount} new=${snapshot.newCasesCount} failed=${snapshot.failedNotifications}`,
      );
    } catch (error) {
      console.error(
        "⚠️ [XrayService] Failed to send daily summary message:",
        error,
      );
      throw error;
    } finally {
      // Reset regardless of send success so stats don't leak into tomorrow
      // and double-count on the next flush.
      dailyStats = emptyDailyStats();
    }
  }

  /**
   * Legacy method for backward compatibility
   * Now calls checkAndNotifyNewCases internally
   */
  static async triggerReport() {
    try {
      const result = await this.checkAndNotifyNewCases();

      return {
        success: result.failedNotifications === 0,
        newCasesFound: result.newCases.length,
        totalCasesFound: result.totalCasesFound,
        notificationsSent: result.notificationsSent,
        message: result.message,
      };
    } catch (error) {
      console.error("❌ XrayPortableService.triggerReport Error:", error);
      throw error;
    }
  }
}
