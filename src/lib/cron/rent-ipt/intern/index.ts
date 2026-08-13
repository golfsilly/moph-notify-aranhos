import { LineNotifyService } from "@/services/line-notify.service";
import { RentIptInternService } from "@/services/rent-ipt/rent-ipt-intern.service";
import cron from "node-cron";

// ======================================================
// Global State
// ======================================================

const initializedCrons = new Set<string>();
const failureCount = new Map<string, number>();
const lastRunTime = new Map<string, Date>();
const isCritical = new Map<string, boolean>();

const FAILURE_THRESHOLD = 3;

// ======================================================
// Cron Manager
// ======================================================

function startCron(name: string, schedule: string, task: () => Promise<void>) {
  if (initializedCrons.has(name)) {
    console.log(`⏭️ Cron "${name}" ถูกเริ่มแล้วก่อนหน้านี้`);
    return;
  }

  initializedCrons.add(name);
  failureCount.set(name, 0);
  lastRunTime.set(name, new Date());
  isCritical.set(name, false);

  // sendStartupNotification(name, schedule);

  cron.schedule(
    schedule,
    async () => {
      const startTime = Date.now();
      lastRunTime.set(name, new Date());

      console.log(`🚀 [Cron] ${name} เริ่มทำงาน`);

      try {
        await task();

        failureCount.set(name, 0);
        isCritical.set(name, false);
      } catch (error) {
        const duration = Date.now() - startTime;
        const currentFailures = (failureCount.get(name) || 0) + 1;

        failureCount.set(name, currentFailures);

        if (currentFailures >= FAILURE_THRESHOLD) {
          isCritical.set(name, true);
        }

        console.error(
          `❌ [Cron] ${name} ล้มเหลว | ครั้งที่ ${currentFailures} | (${duration}ms)`,
          error,
        );

        // await sendCronFailureAlert(name, error, currentFailures);
      }
    },
    { timezone: "Asia/Bangkok" },
  );

  console.log(`เริ่ม Cron "${name}" สำเร็จ`);
}

// ======================================================
// Line Notify
// ======================================================

async function sendStartupNotification(cronName: string, schedule: string) {
  try {
    const message =
      `✅ Cron เริ่มทำงานสำเร็จ\n\n` +
      `📌 ชื่อ: ${cronName}\n` +
      `⏰ Schedule: ${schedule}\n` +
      `🕒 เวลา: ${new Date().toLocaleString("th-TH")}`;

    await LineNotifyService.sendToTest(message);
  } catch (e) {
    console.error("ส่ง Startup Notification ล้มเหลว", e);
  }
}

async function sendCronFailureAlert(
  cronName: string,
  error: unknown,
  failCount: number,
) {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isCriticalNow = failCount >= FAILURE_THRESHOLD;

    let alertMessage =
      `🚨 Cron ล้มเหลว!\n\n` +
      `📌 ชื่อ: ${cronName}\n` +
      `⏰ เวลา: ${new Date().toLocaleString("th-TH")}\n` +
      `🔢 ล้มเหลวติดต่อกัน: ${failCount} ครั้ง\n` +
      `🔍 Error: ${errorMessage}`;

    if (isCriticalNow) {
      alertMessage += `\n\n⚠️ CRITICAL: ล้มเหลวเกิน ${FAILURE_THRESHOLD} ครั้ง!`;
    }

    await LineNotifyService.sendToTest(alertMessage);
  } catch (e) {
    console.error("ส่ง Failure Alert ล้มเหลว", e);
  }
}

// ======================================================
// Status Checker
// ======================================================

export function getCronStatus() {
  const name = "rent-ipt-intern";
  const failures = failureCount.get(name) || 0;
  const critical = isCritical.get(name) || false;
  const lastRun = lastRunTime.get(name);

  let statusText = "OK";
  let statusColor = "🟢";

  if (critical) {
    statusText = "CRITICAL";
    statusColor = "🔴";
  } else if (failures > 0) {
    statusText = "WARNING";
    statusColor = "🟡";
  }

  const rentIptInternStatus = {
    initialized: initializedCrons.has(name),
    lastRun: lastRun ? lastRun.toLocaleString("th-TH") : "ยังไม่เคยรัน",
    failureCount: failures,
    isCritical: critical,
    status: statusText,
    statusColor: statusColor,
    lastRunAgo: lastRun
      ? `${Math.floor((Date.now() - lastRun.getTime()) / 1000 / 60)} นาทีที่แล้ว`
      : "N/A",
  };

  return { "rent-ipt-intern": rentIptInternStatus };
}

// ======================================================
// Main Export
// ======================================================

export function startRentIptInternCron() {
  startCron("rent-ipt-intern", "0 18 * * 1-5", async () => {
    const result = await RentIptInternService.triggerReport();
    console.log(`✅ ส่งรายงานสำเร็จ | Intern: ${result.intern.length}`);
  });
}
