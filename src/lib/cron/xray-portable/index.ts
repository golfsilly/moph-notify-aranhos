import { LineNotifyService } from "@/services/line-notify.service";
import { XrayPortableService } from "@/services/xray-portable/xray-portable.service";
import cron from "node-cron";

// ======================================================
// Global State
// ======================================================

const initializedCrons = new Set<string>();
const failureCount = new Map<string, number>();
const lastRunTime = new Map<string, Date>();
const isCritical = new Map<string, boolean>();
const isRunning = new Map<string, boolean>();
const cooldownUntil = new Map<string, number>();

const FAILURE_THRESHOLD = 3;
const TASK_TIMEOUT_MS = 60_000; // hard cap so a stuck query can't hold the slot forever
const COOLDOWN_MS = 2 * 60 * 1000; // pause 2 min after hitting the failure threshold

// ======================================================
// Helpers
// ======================================================

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)),
      ms,
    );

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

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
  isRunning.set(name, false);
  cooldownUntil.set(name, 0);

  // sendStartupNotification(name, schedule);

  cron.schedule(
    schedule,
    async () => {
      // --- Concurrency guard ---
      // If the previous run is still in flight (e.g. stuck retrying a dead
      // HOS connection), skip this tick instead of piling another run on
      // top of it and fighting over the same connection pool.
      if (isRunning.get(name)) {
        console.warn(
          `⏭️ [Cron] ${name} ข้ามรอบนี้ — รอบก่อนหน้ายังทำงานไม่เสร็จ`,
        );
        return;
      }

      // --- Cooldown guard ---
      // After hitting the failure threshold, back off for a while instead
      // of hammering an unstable network every 3 minutes.
      const cooldown = cooldownUntil.get(name) ?? 0;
      if (Date.now() < cooldown) {
        const remainingSec = Math.ceil((cooldown - Date.now()) / 1000);
        console.warn(
          `⏳ [Cron] ${name} อยู่ในช่วง cooldown อีก ${remainingSec}s — ข้ามรอบนี้`,
        );
        return;
      }

      isRunning.set(name, true);
      const startTime = Date.now();
      lastRunTime.set(name, new Date());

      console.log(`🚀 [Cron] ${name} เริ่มทำงาน`);

      try {
        await withTimeout(task(), TASK_TIMEOUT_MS, name);

        failureCount.set(name, 0);
        isCritical.set(name, false);
      } catch (error) {
        const duration = Date.now() - startTime;
        const currentFailures = (failureCount.get(name) || 0) + 1;

        failureCount.set(name, currentFailures);

        console.error(
          `❌ [Cron] ${name} ล้มเหลว | ครั้งที่ ${currentFailures} | (${duration}ms)`,
          error,
        );

        if (currentFailures >= FAILURE_THRESHOLD) {
          isCritical.set(name, true);
          cooldownUntil.set(name, Date.now() + COOLDOWN_MS);
          console.warn(
            `🧊 [Cron] ${name} เข้าสู่ cooldown ${COOLDOWN_MS / 1000}s หลังล้มเหลวติดกัน ${currentFailures} ครั้ง`,
          );
        }

        await sendCronFailureAlert(name, error, currentFailures);
      } finally {
        isRunning.set(name, false);
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
    const icon = isCriticalNow ? "🚨" : "⚠️";

    let alertMessage =
      `${icon} Cron ล้มเหลว\n\n` +
      `📌 ชื่อ: ${cronName}\n` +
      `⏰ เวลา: ${new Date().toLocaleString("th-TH")}\n` +
      `🔢 ล้มเหลวติดต่อกัน: ${failCount} ครั้ง\n` +
      `🔍 Error: ${errorMessage}`;

    if (isCriticalNow) {
      alertMessage +=
        `\n\n🧊 CRITICAL: ล้มเหลวเกิน ${FAILURE_THRESHOLD} ครั้ง — ` +
        `พักการทำงาน ${COOLDOWN_MS / 1000}s ก่อนลองใหม่`;
    }

    await LineNotifyService.sendToTest(alertMessage);
  } catch (e) {
    console.error("ส่ง Failure Alert ล้มเหลว", e);
  }
}

// ======================================================
// Cron Registrations
// ======================================================

export function startXrayPortableCron() {
  // Runs every 1 minute: checks for new portable X-ray orders and sends a
  // per-case LINE alert immediately.
  startCron("xray-portable", "*/1 * * * *", async () => {
    const result = await XrayPortableService.checkAndNotifyNewCases();
    console.log(`✅ [Cron] X-ray check completed | ${result.message}`);
  });
}
