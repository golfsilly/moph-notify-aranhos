import { queryHos } from "@/lib/hosdb";
import {
  checkExistingNotifications,
  createNotificationLog,
  getXrayCheckpoint,
  saveXrayCheckpoint,
  withXrayCheckLock,
} from "@/lib/xraydb";
import {
  XrayCase,
  XrayNotificationCheckResult,
} from "@/types/xray-portable.type";
import { RowDataPacket } from "mysql2";
import { XrayLineNotifyService } from "./xray-line-notify.service";
import { processXrayCases } from "./process-xray-cases";

// ======================================================
// Config
// ======================================================
const HOSPITAL_LOGO_URL =
  "https://aranhos.moph.go.th/images/symbol/logo-aranhos.png";
const HOSPITAL_HEADER_BG_COLOR = "#6B3FA0";
const HOSPITAL_NAME = "โรงพยาบาลอรัญประเทศ";
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
    bedno: hasValue(row.bedno) ? (row.bedno as string) : null,
    an: hasValue(row.an) ? String(row.an) : null,
    patient_name: hasValue(row.patient_name)
      ? (row.patient_name as string)
      : null,
  }));
}

/**
 * Split the raw comma-separated xray_list into a clean array of items,
 * one per exam, for rendering as a bulleted list rather than a single
 * inline string.
 */
function parseXrayItems(xrayList: string): string[] {
  const items = xrayList
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : ["ไม่ระบุรายการ"];
}
function examListBlock(xrayList: string) {
  const items = parseXrayItems(xrayList);

  return {
    contents: [
      {
        align: "start" as const,
        size: "sm" as const,
        text: `รายการตรวจ (${items.length})`,
        type: "text" as const,
        weight: "bold" as const,
      },
      ...items.map((item) => ({
        align: "start" as const,
        margin: "sm" as const,
        size: "sm" as const,
        text: `${item}`,
        type: "text" as const,
        wrap: true,
      })),
    ],
    layout: "vertical" as const,
    type: "box" as const,
  };
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
 * hospital's standard notification template: a solid-color header carrying
 * the hospital's own logo + name (no generic MOPH/หมอพร้อม banner image),
 * then a rounded title chip and a stack of label/value detail rows
 * separated by dividers.
 *
 * Optional fields (patient name, bed number) only get a row when the
 * case actually has that data — no "field: -" placeholders.
 */
function createXrayAlertMessage(xrayCase: XrayCase): Record<string, unknown> {
  const orderDate = formatThaiShort(xrayCase.order_date);
  const orderTime =
    xrayCase.order_date_time.split(" ")[1]?.substring(0, 5) || "N/A";

  const detailRows: Record<string, unknown>[] = [
    detailRow("XN", String(xrayCase.xn)),
    { margin: "md", type: "separator" },
    detailRow("HN", xrayCase.hn),
  ];

  if (hasValue(xrayCase.patient_name)) {
    detailRows.push(
      { margin: "md", type: "separator" },
      detailRow("ผู้ป่วย", `${xrayCase.patient_name} (${xrayCase.age} ปี)`),
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
    examListBlock(xrayCase.xray_list),
  );

  const contents = {
    header: {
      backgroundColor: HOSPITAL_HEADER_BG_COLOR,
      contents: [
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
          flex: 0,
          height: "32px",
          layout: "vertical",
          type: "box",
          width: "32px",
        },
        {
          adjustMode: "shrink-to-fit",
          color: "#FFFFFF",
          flex: 1,
          gravity: "center",
          size: "md",
          text: HOSPITAL_NAME,
          type: "text",
          weight: "bold",
        },
      ],
      alignItems: "center",
      layout: "horizontal",
      paddingAll: "12px",
      spacing: "sm",
      type: "box",
    },
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
const MIN_LOOKBACK_MINUTES = 60;
function computeLookbackMinutes(lastSuccessfulCheckAt: Date): number {
  const elapsedMinutes = Math.ceil(
    (Date.now() - lastSuccessfulCheckAt.getTime()) / 60_000,
  );

  return Math.max(MIN_LOOKBACK_MINUTES, elapsedMinutes + 1);
}

// ======================================================
// Main Service
// ======================================================

export class XrayPortableService {
  /** Query X-ray cases from HOSxP, including the persisted checkpoint. */
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
    return withXrayCheckLock(async () => {
      // Store the initial baseline before querying, including during outages.
      const checkpoint = await getXrayCheckpoint();
      const queryStartedAt = new Date();
      const lookbackMinutes = computeLookbackMinutes(checkpoint);
      const rows = await queryHos(this.buildXraySql(lookbackMinutes));
      return processXrayCases(toXrayCases(rows), queryStartedAt, {
        findExisting: checkExistingNotifications,
        send: (item) => XrayLineNotifyService.send(createXrayAlertMessage(item)),
        recordSent: (item) => createNotificationLog({
          notify_key: item.notify_key,
          xn: String(item.xn),
          vn: item.vn,
          hn: item.hn,
          age: item.age,
          department: item.department_name,
          xray_list: item.xray_list,
          order_date: new Date(item.order_date_time),
        }),
        saveCheckpoint: saveXrayCheckpoint,
      });
    });
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
