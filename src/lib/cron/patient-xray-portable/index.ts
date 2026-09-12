import { PatientXrayPortableService } from "@/services/patient-xray-portable/patient-xray-portable.service";
import cron from "node-cron";

declare global {
  var patientXrayPortableCronStarted: boolean | undefined;
}

let isRunning = false;

async function initializeCursor(): Promise<void> {
  try {
    const result = await PatientXrayPortableService.initialize();
    console.log(
      `[Cron] patient-xray-portable cursor ready | initialized=${result.initialized} | cursor=${result.cursor}`,
    );
  } catch (error) {
    console.error(
      "[Cron] patient-xray-portable initialization failed; next run will retry",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

async function runPatientXrayPortableCron(): Promise<void> {
  if (isRunning) {
    console.warn("[Cron] patient-xray-portable skipped overlapping run");
    return;
  }

  isRunning = true;
  const startedAt = Date.now();

  try {
    const result = await PatientXrayPortableService.runOnce();
    console.log(
      `[Cron] patient-xray-portable completed | cursor=${result.cursor} | queued=${result.queued} | recovered=${result.recovered} | sent=${result.sent} | failed=${result.failed} | durationMs=${Date.now() - startedAt}`,
    );
  } catch (error) {
    console.error(
      `[Cron] patient-xray-portable failed | durationMs=${Date.now() - startedAt}`,
      error instanceof Error ? error.name : "UnknownError",
    );
  } finally {
    isRunning = false;
  }
}

export function startPatientXrayPortableCron(): void {
  if (globalThis.patientXrayPortableCronStarted) return;

  globalThis.patientXrayPortableCronStarted = true;
  cron.schedule("*/2 * * * *", runPatientXrayPortableCron, {
    timezone: "Asia/Bangkok",
    name: "patient-xray-portable",
    noOverlap: true,
  });

  void initializeCursor();
  console.log(
    '[Cron] patient-xray-portable scheduled with "*/2 * * * *" (Asia/Bangkok)',
  );
}
