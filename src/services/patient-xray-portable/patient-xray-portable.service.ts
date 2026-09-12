import { randomUUID } from "node:crypto";

export const XRAY_PORTABLE_ITEM_CODE = 10;
export const XRAY_PORTABLE_JOB_NAME = "patient-xray-portable";
export const XRAY_PORTABLE_TARGET_GROUP = "test";

const PROCESSING_LEASE_MS = 5 * 60 * 1000;
const MAX_DELIVERIES_PER_RUN = 100;

const STATUS = {
  pending: "PENDING",
  processing: "PROCESSING",
  failed: "FAILED",
  sent: "SENT",
} as const;

interface MaxXnRow {
  max_xn: string | number | null;
}

interface XrayItemRow {
  xray_items_name: string | null;
  active_status: string | null;
}

interface XrayEventRow {
  source_xn: string | number;
}

interface XrayDetailRow {
  source_xn: string | number;
  patient_name: string | null;
  hn: string | null;
  an: string | null;
  ward_name: string | null;
  item_name: string | null;
  request_date: string | null;
  request_time: string | null;
}

export interface PatientXrayPortableRecord {
  sourceXn: string;
  patientName: string | null;
  hn: string | null;
  an: string | null;
  wardName: string | null;
  itemName: string | null;
  requestDate: string | null;
  requestTime: string | null;
}

export interface PatientXrayPortableRunResult {
  initialized: boolean;
  cursor: string;
  queued: number;
  recovered: number;
  sent: number;
  failed: number;
}

function cleanDisplayValue(value: string | null | undefined): string {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || "ไม่ระบุ";
}

export function formatPortableOrderDateTime(
  requestDate: string | null,
  requestTime: string | null,
): string {
  if (!requestDate) return "ไม่ระบุ";

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(requestDate);
  if (!dateMatch) return "ไม่ระบุ";

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
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
  const monthName = thaiMonths[month - 1];

  if (!monthName || day < 1 || day > 31) return "ไม่ระบุ";

  const timeMatch = /^(\d{2}):(\d{2})/.exec(requestTime ?? "");
  const formattedTime = timeMatch ? ` ${timeMatch[1]}:${timeMatch[2]} น.` : "";

  return `${day} ${monthName} ${year + 543}${formattedTime}`;
}

export function buildPatientXrayPortableMessage(
  record: PatientXrayPortableRecord,
): string {
  return [
    "🩻 แจ้ง X-ray Portable",
    `ชื่อ: ${cleanDisplayValue(record.patientName)}`,
    `HN: ${cleanDisplayValue(record.hn)}`,
    `AN: ${cleanDisplayValue(record.an)}`,
    `หอผู้ป่วย: ${cleanDisplayValue(record.wardName)}`,
    `รายการ: ${cleanDisplayValue(record.itemName)}`,
    `เวลาสั่ง: ${formatPortableOrderDateTime(record.requestDate, record.requestTime)}`,
  ].join("\n");
}

export function getXrayPortableRetryDelayMs(attempts: number): number {
  const exponent = Math.max(0, Math.min(attempts - 1, 5));
  return Math.min(30, 2 ** exponent) * 60 * 1000;
}

function toSafeErrorCode(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message === "LINE_NOTIFY_FAILED" ||
      error.message === "SOURCE_ORDER_NOT_FOUND" ||
      error.message === "UNSUPPORTED_TARGET_GROUP"
    ) {
      return error.message;
    }

    return error.name.slice(0, 500) || "ERROR";
  }

  return "UNKNOWN_ERROR";
}

function mapDetailRow(row: XrayDetailRow): PatientXrayPortableRecord {
  return {
    sourceXn: String(row.source_xn),
    patientName: row.patient_name,
    hn: row.hn,
    an: row.an,
    wardName: row.ward_name,
    itemName: row.item_name,
    requestDate: row.request_date,
    requestTime: row.request_time,
  };
}

export class PatientXrayPortableService {
  private static async validatePortableItem(): Promise<void> {
    const { queryHos } = await import("@/lib/hosdb");
    const rows = await queryHos<XrayItemRow[]>(
      `
        SELECT xray_items_name, active_status
        FROM xray_items
        WHERE xray_items_code = ?
        LIMIT 1
      `,
      [XRAY_PORTABLE_ITEM_CODE],
    );
    const item = rows[0];
    const itemName = item?.xray_items_name?.toLowerCase() ?? "";

    if (
      !item ||
      item.active_status !== "Y" ||
      !itemName.includes("chest") ||
      !itemName.includes("portable")
    ) {
      throw new Error("XRAY_PORTABLE_ITEM_CONFIGURATION_INVALID");
    }
  }

  private static async getCurrentMaxXn(): Promise<bigint> {
    const { queryHos } = await import("@/lib/hosdb");
    const rows = await queryHos<MaxXnRow[]>(
      "SELECT CAST(MAX(xn) AS CHAR) AS max_xn FROM xray_report",
    );

    return BigInt(rows[0]?.max_xn ?? 0);
  }

  private static async getNewEventIds(
    lastXn: bigint,
    highWatermark: bigint,
  ): Promise<bigint[]> {
    const { queryHos } = await import("@/lib/hosdb");
    const rows = await queryHos<XrayEventRow[]>(
      `
        SELECT CAST(xr.xn AS CHAR) AS source_xn
        FROM xray_report xr
        WHERE xr.xn > ?
          AND xr.xn <= ?
          AND xr.xray_items_code = ?
        ORDER BY xr.xn ASC
      `,
      [lastXn.toString(), highWatermark.toString(), XRAY_PORTABLE_ITEM_CODE],
    );

    return rows.map((row) => BigInt(row.source_xn));
  }

  private static async getOrderDetails(
    sourceXn: bigint,
  ): Promise<PatientXrayPortableRecord | null> {
    const { queryHos } = await import("@/lib/hosdb");
    const rows = await queryHos<XrayDetailRow[]>(
      `
        SELECT
          CAST(xr.xn AS CHAR) AS source_xn,
          NULLIF(
            TRIM(CONCAT(
              COALESCE(p.pname, ''),
              COALESCE(p.fname, ''),
              ' ',
              COALESCE(p.lname, '')
            )),
            ''
          ) AS patient_name,
          NULLIF(TRIM(xr.hn), '') AS hn,
          NULLIF(TRIM(xr.an), '') AS an,
          COALESCE(
            NULLIF(TRIM(w.name), ''),
            NULLIF(TRIM(xh.department_name), ''),
            NULLIF(TRIM(xr.request_depcode), '')
          ) AS ward_name,
          NULLIF(TRIM(xi.xray_items_name), '') AS item_name,
          DATE_FORMAT(xr.request_date, '%Y-%m-%d') AS request_date,
          TIME_FORMAT(xr.request_time, '%H:%i:%s') AS request_time
        FROM xray_report xr
        INNER JOIN xray_items xi
          ON xi.xray_items_code = xr.xray_items_code
        LEFT JOIN patient p ON p.hn = xr.hn
        LEFT JOIN ipt i ON i.an = xr.an
        LEFT JOIN ward w ON w.ward = i.ward
        LEFT JOIN xray_head xh ON xh.vn = xr.vn
        WHERE xr.xn = ?
          AND xr.xray_items_code = ?
        LIMIT 1
      `,
      [sourceXn.toString(), XRAY_PORTABLE_ITEM_CODE],
    );

    return rows[0] ? mapDetailRow(rows[0]) : null;
  }

  static async initialize(): Promise<{
    initialized: boolean;
    cursor: string;
  }> {
    await this.validatePortableItem();

    const { prisma } = await import("@/lib/prisma");
    const existing = await prisma.xrayPortableCursor.findUnique({
      where: { jobName: XRAY_PORTABLE_JOB_NAME },
    });

    if (existing) {
      return { initialized: false, cursor: existing.lastXn.toString() };
    }

    const highWatermark = await this.getCurrentMaxXn();
    const cursor = await prisma.xrayPortableCursor.upsert({
      where: { jobName: XRAY_PORTABLE_JOB_NAME },
      create: {
        jobName: XRAY_PORTABLE_JOB_NAME,
        lastXn: highWatermark,
      },
      update: {},
    });

    return { initialized: true, cursor: cursor.lastXn.toString() };
  }

  private static async ingestNewEvents(): Promise<{
    initialized: boolean;
    cursor: string;
    queued: number;
  }> {
    const initialization = await this.initialize();
    if (initialization.initialized) {
      return { ...initialization, queued: 0 };
    }

    const { prisma } = await import("@/lib/prisma");
    const cursor = await prisma.xrayPortableCursor.findUniqueOrThrow({
      where: { jobName: XRAY_PORTABLE_JOB_NAME },
    });
    const highWatermark = await this.getCurrentMaxXn();

    if (highWatermark <= cursor.lastXn) {
      return {
        initialized: false,
        cursor: cursor.lastXn.toString(),
        queued: 0,
      };
    }

    const sourceXns = await this.getNewEventIds(cursor.lastXn, highWatermark);
    const transactionResult = await prisma.$transaction(async (tx) => {
      const created = sourceXns.length
        ? await tx.xrayPortableNotification.createMany({
            data: sourceXns.map((sourceXn) => ({
              sourceXn,
              itemCode: XRAY_PORTABLE_ITEM_CODE,
              targetGroup: XRAY_PORTABLE_TARGET_GROUP,
            })),
            skipDuplicates: true,
          })
        : { count: 0 };

      await tx.xrayPortableCursor.updateMany({
        where: {
          jobName: XRAY_PORTABLE_JOB_NAME,
          lastXn: { lt: highWatermark },
        },
        data: { lastXn: highWatermark },
      });

      return created.count;
    });

    return {
      initialized: false,
      cursor: highWatermark.toString(),
      queued: transactionResult,
    };
  }

  private static async recoverStaleNotifications(): Promise<number> {
    const { prisma } = await import("@/lib/prisma");
    const staleBefore = new Date(Date.now() - PROCESSING_LEASE_MS);
    const result = await prisma.xrayPortableNotification.updateMany({
      where: {
        status: STATUS.processing,
        processingStartedAt: { lt: staleBefore },
      },
      data: {
        status: STATUS.failed,
        processingToken: null,
        processingStartedAt: null,
        nextAttemptAt: new Date(),
        lastError: "STALE_PROCESSING_LEASE",
      },
    });

    return result.count;
  }

  private static async claimNextNotification() {
    const { prisma } = await import("@/lib/prisma");
    const now = new Date();
    const candidate = await prisma.xrayPortableNotification.findFirst({
      where: {
        status: { in: [STATUS.pending, STATUS.failed] },
        nextAttemptAt: { lte: now },
      },
      orderBy: { sourceXn: "asc" },
    });

    if (!candidate) return null;

    const processingToken = randomUUID();
    const claimed = await prisma.xrayPortableNotification.updateMany({
      where: {
        sourceXn: candidate.sourceXn,
        status: { in: [STATUS.pending, STATUS.failed] },
        nextAttemptAt: { lte: now },
      },
      data: {
        status: STATUS.processing,
        processingToken,
        processingStartedAt: now,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    if (claimed.count !== 1) return null;

    return prisma.xrayPortableNotification.findUniqueOrThrow({
      where: { sourceXn: candidate.sourceXn },
    });
  }

  private static async deliverDueNotifications(): Promise<{
    sent: number;
    failed: number;
  }> {
    const { prisma } = await import("@/lib/prisma");
    const { LineNotifyService } =
      await import("@/services/line-notify.service");
    let sent = 0;
    let failed = 0;

    for (let index = 0; index < MAX_DELIVERIES_PER_RUN; index++) {
      const notification = await this.claimNextNotification();
      if (!notification) break;

      try {
        if (notification.targetGroup !== XRAY_PORTABLE_TARGET_GROUP) {
          throw new Error("UNSUPPORTED_TARGET_GROUP");
        }

        const record = await this.getOrderDetails(notification.sourceXn);
        if (!record) throw new Error("SOURCE_ORDER_NOT_FOUND");

        const notifySuccess = await LineNotifyService.sendToTest(
          buildPatientXrayPortableMessage(record),
        );
        if (!notifySuccess) throw new Error("LINE_NOTIFY_FAILED");

        await prisma.xrayPortableNotification.updateMany({
          where: {
            sourceXn: notification.sourceXn,
            status: STATUS.processing,
            processingToken: notification.processingToken,
          },
          data: {
            status: STATUS.sent,
            sentAt: new Date(),
            processingToken: null,
            processingStartedAt: null,
            lastError: null,
          },
        });
        sent++;
      } catch (error) {
        await prisma.xrayPortableNotification.updateMany({
          where: {
            sourceXn: notification.sourceXn,
            status: STATUS.processing,
            processingToken: notification.processingToken,
          },
          data: {
            status: STATUS.failed,
            nextAttemptAt: new Date(
              Date.now() + getXrayPortableRetryDelayMs(notification.attempts),
            ),
            processingToken: null,
            processingStartedAt: null,
            lastError: toSafeErrorCode(error),
          },
        });
        failed++;
      }
    }

    return { sent, failed };
  }

  static async runOnce(): Promise<PatientXrayPortableRunResult> {
    const ingestion = await this.ingestNewEvents();
    const recovered = await this.recoverStaleNotifications();
    const delivery = await this.deliverDueNotifications();

    return {
      ...ingestion,
      recovered,
      ...delivery,
    };
  }
}
