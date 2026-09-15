import { queryHos } from "@/lib/hosdb";
import {
  XrayCase,
  XrayNotificationLogData,
  XrayNotificationCheckResult,
} from "@/types/xray-portable.type";
import { RowDataPacket } from "mysql2";
import { XrayLineNotifyService } from "./xray-line-notify.service";
import {
  checkExistingNotifications,
  createNotificationLogBatch,
} from "@/lib/xraydb";

// ======================================================
// Config
// ======================================================
const HOSPITAL_LOGO_URL =
  "https://aranhos.moph.go.th/images/symbol/logo-aranhos.png";

const HOSPITAL_HEADER_IMAGE_URL =
  "https://cdns.yellow-idea.com/moph/20250602/moph-flex-header-1.png";

const HOSPITAL_NAME_LINE_1 = "โรงพยาบาล";
const HOSPITAL_NAME_LINE_2 = "อรัญประเทศ";

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

/**
 * True if a value from the DB is actually usable (not null/undefined,
 * not an empty/whitespace string). Used to decide whether an optional
 * field (bed number, AN, patient name) gets its own line in the alert.
 */
function hasValue(value: unknown): value is string | number {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
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
    // Optional — patient may not be an inpatient / may not have a bed
    // assigned yet, so these can legitimately be null.
    bedno: hasValue(row.bedno) ? (row.bedno as string) : null,
    an: hasValue(row.an) ? String(row.an) : null,
    // Prefix + first + last name combined via CONCAT_WS in SQL (skips
    // NULL parts already), but can still come back empty if the patient
    // record has no name fields set at all.
    patient_name: hasValue(row.patient_name)
      ? (row.patient_name as string)
      : null,
  }));
}

/**
 * Split the raw comma-separated xray_list into a clean, comma joined
 * one-line string suitable for a single Flex text row (kept short so the
 * bubble doesn't stretch too tall — full detail is still in xray_list).
 */
function formatXrayItemsInline(xrayList: string): string {
  const items = xrayList
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return "ไม่ระบุรายการ";
  }

  return items.join(", ");
}

/**
 * A single "label : value" row inside the detail box, matching the
 * template's horizontal box + separator pattern.
 */
function detailRow(label: string, value: string) {
  return {
    contents: [
      {
        align: "start" as const,
        flex: 0,
        gravity: "center" as const,
        size: "sm" as const,
        text: label,
        type: "text" as const,
      },
      {
        align: "start" as const,
        gravity: "center" as const,
        margin: "md" as const,
        size: "sm" as const,
        text: value,
        type: "text" as const,
        weight: "bold" as const,
        wrap: true,
      },
    ],
    layout: "horizontal" as const,
    type: "box" as const,
  };
}

/**
 * Build a LINE Flex Message bubble for one new X-ray case, following the
 * hospital's standard notification template (header banner, rounded
 * title chip, circular hospital logo, hospital name, then a stack of
 * label/value detail rows separated by dividers).
 *
 * Optional fields (patient name, bed number) only get a row when the
 * case actually has that data — no "field: -" placeholders.
 */
function createXrayAlertMessage(xrayCase: XrayCase): Record<string, unknown> {
  const orderDate = formatThaiShort(xrayCase.order_date);
  const orderTime =
    xrayCase.order_date_time.split(" ")[1]?.substring(0, 5) || "N/A";
  const itemCount = xrayCase.xray_list.split(",").filter(Boolean).length;

  const detailRows: Record<string, unknown>[] = [
    detailRow("XN", String(xrayCase.xn)),
    { margin: "md", type: "separator" },
    detailRow("HN", xrayCase.hn),
  ];

  if (hasValue(xrayCase.patient_name)) {
    detailRows.push(
      { margin: "md", type: "separator" },
      detailRow(
        "ผู้ป่วย",
        `${xrayCase.patient_name} (${xrayCase.age} ปี)`,
      ),
    );
  }

  detailRows.push(
    { margin: "md", type: "separator" },
    detailRow("สั่งจาก", xrayCase.department_name),
  );

  if (hasValue(xrayCase.bedno)) {
    detailRows.push(
      { margin: "md", type: "separator" },
      detailRow("เตียง", String(xrayCase.bedno)),
    );
  }

  detailRows.push(
    { margin: "md", type: "separator" },
    detailRow("วันที่สั่ง", orderDate),
    { margin: "md", type: "separator" },
    detailRow("เวลาสั่ง", orderTime),
    { margin: "md", type: "separator" },
    detailRow(`รายการตรวจ (${itemCount})`, formatXrayItemsInline(xrayCase.xray_list)),
  );

  const contents = {
    body: {
      contents: [
        {
          backgroundColor: "#DCE7FF",
          contents: [
            {
              adjustMode: "shrink-to-fit",
              align: "center",
              color: "#2D2D2D",
              size: "lg",
              text: "🏥 X-RAY PORTABLE ALERT",
              type: "text",
              weight: "bold",
            },
          ],
          cornerRadius: "15px",
          layout: "vertical",
          margin: "xs",
          paddingBottom: "lg",
          paddingEnd: "8px",
          paddingStart: "8px",
          paddingTop: "lg",
          type: "box",
        },
        {
          contents: [
            {
              align: "center",
              aspectMode: "cover",
              size: "full",
              type: "image",
              url: HOSPITAL_LOGO_URL,
            },
          ],
          cornerRadius: "100px",
          layout: "vertical",
          margin: "20px",
          maxWidth: "72px",
          offsetStart: "93px",
          type: "box",
        },
        {
          contents: [
            {
              adjustMode: "shrink-to-fit",
              align: "center",
              gravity: "center",
              scaling: true,
              size: "18px",
              text: HOSPITAL_NAME_LINE_1,
              type: "text",
              weight: "bold",
            },
            {
              adjustMode: "shrink-to-fit",
              align: "center",
              gravity: "center",
              margin: "none",
              scaling: true,
              size: "18px",
              text: HOSPITAL_NAME_LINE_2,
              type: "text",
              weight: "bold",
            },
          ],
          layout: "vertical",
          margin: "sm",
          type: "box",
        },
        {
          margin: "18px",
          type: "separator",
        },
        {
          contents: detailRows,
          layout: "vertical",
          margin: "13px",
          type: "box",
        },
        {
          contents: [
            {
              align: "center",
              color: "#8C8C8C",
              size: "xs",
              text: `แจ้งเตือนเมื่อ ${orderDate} ${formatThaiTimeNow()}`,
              type: "text",
            },
          ],
          layout: "vertical",
          margin: "md",
          type: "box",
        },
      ],
      layout: "vertical",
      type: "box",
    },
    header: {
      contents: [
        {
          aspectMode: "cover",
          aspectRatio: "3120:885",
          size: "full",
          type: "image",
          url: HOSPITAL_HEADER_IMAGE_URL,
        },
      ],
      layout: "vertical",
      paddingAll: "0px",
      type: "box",
    },
    size: "mega",
    type: "bubble",
  };

  return {
    altText: `X-RAY PORTABLE ALERT: XN ${xrayCase.xn}${
      hasValue(xrayCase.patient_name) ? ` - ${xrayCase.patient_name}` : ""
    }`,
    contents,
    type: "flex",
  };
}

// ======================================================
// Gap-safe lookback window
// ======================================================
// The cron runs every 60 minutes, so a fixed "look back 60 minutes" window
// normally lines up perfectly. But if a run throws (e.g. a transient HOS
// connection blip) it queries nothing for that tick — and the *next*
// successful run would still only look back 60 minutes, silently skipping
// whatever arrived during the failed window.
//
// Instead, we remember when we last *successfully* queried and look back
// far enough to cover the full gap since then, with a floor (don't look
// back less than the normal window) and a ceiling (don't accidentally
// pull hours of data if the service was down for a long time).

const MIN_LOOKBACK_MINUTES = 60;
const MAX_LOOKBACK_MINUTES = 120;

let lastSuccessfulCheckAt: Date | null = null;

function computeLookbackMinutes(): number {
  if (!lastSuccessfulCheckAt) {
    return MIN_LOOKBACK_MINUTES;
  }

  const elapsedMinutes = Math.ceil(
    (Date.now() - lastSuccessfulCheckAt.getTime()) / 60_000,
  );

  const lookback = Math.max(MIN_LOOKBACK_MINUTES, elapsedMinutes);

  if (lookback > MAX_LOOKBACK_MINUTES) {
    console.warn(
      `⚠️ [XrayService] Gap since last successful check is ${elapsedMinutes}min — capping lookback to ${MAX_LOOKBACK_MINUTES}min`,
    );
    return MAX_LOOKBACK_MINUTES;
  }

  return lookback;
}

// ======================================================
// Main Service
// ======================================================

export class XrayPortableService {
  /**
   * Query X-ray cases from hosxp database with a time window
   * @param minutesBack How many minutes back to look (default: 5 for 5-min cron)
   */
  private static buildXraySql(minutesBack: number = 60): string {
    return `
    SELECT
  xh.pt_xn AS xn,
  xh.vn,
  xh.hn,
  DATE_FORMAT( xh.order_date, '%Y-%m-%d %H:%i:%s' ) AS order_date,
  DATE_FORMAT( xh.order_date_time, '%Y-%m-%d %H:%i:%s' ) AS order_date_time,
  xh.age_y AS age,
  COALESCE ( xh.department_name, 'Unknown' ) AS department_name,
  CONCAT_WS( ' ', p.pname, p.fname, p.lname ) AS patient_name,
  i.an,
  ia.bedno,
  CAST( xh.xray_list AS CHAR ( 10000 ) ) AS xray_list,
  MD5(
    CONCAT(
      COALESCE ( xh.pt_xn, '' ),
      '|',
      COALESCE ( xh.hn, '' ),
      '|',
      COALESCE ( i.an, '' ),
      '|',
      COALESCE ( xh.order_date, '' ) 
    ) 
  ) AS notify_key 
FROM
  xray_head xh
  LEFT JOIN patient p ON p.hn = xh.hn
  LEFT JOIN ipt i ON i.hn = xh.hn 
  AND xh.order_date_time >= TIMESTAMP ( i.regdate, COALESCE ( i.regtime, '00:00:00' ) ) 
  AND ( i.dchdate IS NULL OR xh.order_date_time <= TIMESTAMP ( i.dchdate, COALESCE ( i.dchtime, '23:59:59' ) ) )
  LEFT JOIN iptadm ia ON ia.an = i.an 
WHERE
  xh.order_date_time >= DATE_SUB( NOW(), INTERVAL ${minutesBack} MINUTE ) 
  AND xh.xray_list LIKE '%portable%' 
ORDER BY
  xh.order_date_time DESC;
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
      // Query hosxp for recent X-ray cases. Window widens automatically if
      // the previous run(s) failed, so a transient DB blip doesn't cause
      // cases to be silently skipped.
      const lookbackMinutes = computeLookbackMinutes();
      const xrayRows = await queryHos(this.buildXraySql(lookbackMinutes));
      const xrayCases = toXrayCases(xrayRows);

      totalCasesFound = xrayCases.length;
      console.log(
        `📊 [XrayService] Found ${totalCasesFound} X-ray cases in last ${lookbackMinutes} minute(s)`,
      );

      // Query succeeded — mark this instant as the new baseline for the
      // next run's lookback calculation.
      lastSuccessfulCheckAt = new Date();

      if (totalCasesFound === 0) {
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
          const success = await XrayLineNotifyService.send(message);

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
            order_date: new Date(xrayCase.order_date_time),
          }),
        );

        // Batch insert into database
        const created = await createNotificationLogBatch(logsToCreate);

        console.log(`💾 [XrayService] Logged ${created} cases to database`);
      }

      const duration = Date.now() - startTime;

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