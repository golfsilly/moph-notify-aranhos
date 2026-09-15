import { Prisma, type XrayPortableCursor } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { queryHos } from "@/lib/hosdb";
import { ENV } from "@/config/env";

const JOB_NAME = "patient-xray-portable";
const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

export type AdminHealthStatus = "ok" | "warning" | "error" | "unknown";

export interface AdminDashboardData {
  generatedAt: string;
  connections: {
    hosxp: AdminHealthStatus;
    prisma: AdminHealthStatus;
    lineNotify: AdminHealthStatus;
  };
  xrayPortable: {
    schedule: string;
    timezone: string;
    cursor: string | null;
    heartbeat: {
      status: AdminHealthStatus;
      lastRunAt: string | null;
      lastRunStatus: string | null;
      lastRunDurationMs: number | null;
      lastRunError: string | null;
      lastRunQueued: number | null;
      lastRunSent: number | null;
      lastRunFailed: number | null;
    };
    outbox: {
      pending: number;
      processing: number;
      failed: number;
      sent: number;
      totalAttempts: number;
      oldestPendingAt: string | null;
      latestError: string | null;
    };
  };
}

function asIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

async function checkPrisma(): Promise<AdminHealthStatus> {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    return "ok";
  } catch {
    return "error";
  }
}

async function checkHosxp(): Promise<AdminHealthStatus> {
  try {
    await queryHos<{ ok: number }[]>("SELECT 1 AS ok");
    return "ok";
  } catch {
    return "error";
  }
}

function checkLineNotify(): AdminHealthStatus {
  return ENV.lineNotify.test.clientKey && ENV.lineNotify.test.secretKey
    ? "ok"
    : "warning";
}

function getHeartbeatHealth(cursor: XrayPortableCursor | null): AdminHealthStatus {
  if (!cursor?.lastRunAt || !cursor.lastRunStatus) return "unknown";
  if (cursor.lastRunStatus === "FAILED") return "error";
  if (Date.now() - cursor.lastRunAt.getTime() > HEARTBEAT_STALE_MS) {
    return "warning";
  }
  if (cursor.lastRunStatus === "RUNNING") return "warning";
  return "ok";
}

type OutboxSnapshot = {
  pending: number;
  processing: number;
  failed: number;
  sent: number;
  totalAttempts: number;
  oldestPendingAt: Date | null;
  latestError: string | null;
};

const emptyOutboxSnapshot: OutboxSnapshot = {
  pending: 0,
  processing: 0,
  failed: 0,
  sent: 0,
  totalAttempts: 0,
  oldestPendingAt: null,
  latestError: null,
};

async function getCursorSafe(): Promise<XrayPortableCursor | null> {
  try {
    return await prisma.xrayPortableCursor.findUnique({ where: { jobName: JOB_NAME } });
  } catch {
    return null;
  }
}

async function getOutboxSnapshotSafe(): Promise<OutboxSnapshot> {
  try {
    const [grouped, attempts, oldestPending, latestError] = await Promise.all([
      prisma.xrayPortableNotification.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.xrayPortableNotification.aggregate({ _sum: { attempts: true } }),
      prisma.xrayPortableNotification.findFirst({
        where: { status: { in: ["PENDING", "FAILED"] } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.xrayPortableNotification.findFirst({
        where: { lastError: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { lastError: true },
      }),
    ]);

    const counts = { PENDING: 0, PROCESSING: 0, FAILED: 0, SENT: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;

    return {
      pending: counts.PENDING,
      processing: counts.PROCESSING,
      failed: counts.FAILED,
      sent: counts.SENT,
      totalAttempts: attempts._sum.attempts ?? 0,
      oldestPendingAt: oldestPending?.createdAt ?? null,
      latestError: latestError?.lastError ?? null,
    };
  } catch {
    return emptyOutboxSnapshot;
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [hosxp, prismaStatus, cursor, outbox] = await Promise.all([
    checkHosxp(),
    checkPrisma(),
    getCursorSafe(),
    getOutboxSnapshotSafe(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    connections: {
      hosxp,
      prisma: prismaStatus,
      lineNotify: checkLineNotify(),
    },
    xrayPortable: {
      schedule: "*/2 * * * *",
      timezone: "Asia/Bangkok",
      cursor: cursor?.lastXn.toString() ?? null,
      heartbeat: {
        status: getHeartbeatHealth(cursor),
        lastRunAt: asIso(cursor?.lastRunAt),
        lastRunStatus: cursor?.lastRunStatus ?? null,
        lastRunDurationMs: cursor?.lastRunDurationMs ?? null,
        lastRunError: cursor?.lastRunError ?? null,
        lastRunQueued: cursor?.lastRunQueued ?? null,
        lastRunSent: cursor?.lastRunSent ?? null,
        lastRunFailed: cursor?.lastRunFailed ?? null,
      },
      outbox: {
        pending: outbox.pending,
        processing: outbox.processing,
        failed: outbox.failed,
        sent: outbox.sent,
        totalAttempts: outbox.totalAttempts,
        oldestPendingAt: asIso(outbox.oldestPendingAt),
        latestError: outbox.latestError,
      },
    },
  };
}
