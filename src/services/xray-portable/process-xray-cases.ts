import type { XrayCase, XrayNotificationCheckResult } from "@/types/xray-portable.type";

type ProcessingDependencies = {
  findExisting: (keys: string[]) => Promise<string[]>;
  send: (item: XrayCase) => Promise<boolean>;
  recordSent: (item: XrayCase) => Promise<unknown>;
  saveCheckpoint: (time: Date) => Promise<void>;
};

/** Only advance the recovery checkpoint after every new case has been sent. */
export async function processXrayCases(
  cases: XrayCase[],
  queryStartedAt: Date,
  dependencies: ProcessingDependencies,
): Promise<XrayNotificationCheckResult> {
  const uniqueCases = Array.from(new Map(cases.map((item) => [item.notify_key, item])).values());
  const existing = new Set(await dependencies.findExisting(uniqueCases.map((item) => item.notify_key)));
  const newCases = uniqueCases.filter((item) => !existing.has(item.notify_key));
  const duplicateCases = uniqueCases.filter((item) => existing.has(item.notify_key));
  let notificationsSent = 0;
  let failedNotifications = 0;

  for (const item of newCases) {
    let sent = false;
    try {
      sent = await dependencies.send(item);
    } catch (error) {
      console.error("[XrayService] Notification request failed:", error);
    }
    if (!sent) {
      failedNotifications++;
      continue;
    }
    // A database error must stop this run and preserve the checkpoint.
    await dependencies.recordSent(item);
    notificationsSent++;
  }

  if (failedNotifications === 0) await dependencies.saveCheckpoint(queryStartedAt);

  return {
    totalCasesFound: uniqueCases.length,
    newCases,
    duplicateCases,
    notificationsSent,
    failedNotifications,
    message: `Processed ${uniqueCases.length} cases | New: ${newCases.length} | Sent: ${notificationsSent} | Failed: ${failedNotifications}`,
  };
}
