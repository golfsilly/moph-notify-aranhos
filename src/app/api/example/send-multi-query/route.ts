import { NextResponse } from "next/server";
import { queryHos } from "@/lib/hosdb";
import { ENV } from "@/config/env";
import { RentIptRow } from "@/types/rent-ipt.type";

// ======================================================
// Config
// ======================================================

const TOKEN = ENV.cronToken;
const SECRET = ENV.cronSecret;

const CONFIG = {
  startDate: "2026-05-01",
  endpoint: "https://morpromt2f.moph.go.th/api/notify/send",
  clientKey: ENV.lineNotify.test.clientKey,
  secretKey: ENV.lineNotify.test.secretKey,
};

// ======================================================
// Circuit Breaker (In-Memory)
// ======================================================

let failCount = 0;
let isOpen = false;
let lastFailTime = 0;

const CIRCUIT_LIMIT = 5;
const RESET_TIME = 60 * 1000;

// ======================================================
// Utils
// ======================================================

function getThaiTime() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

function formatThaiShort(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุวันที่";
  }

  return date
    .toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace("พ.ศ.", "")
    .trim();
}

function getDateRange() {
  const thaiTime = getThaiTime();

  const end = new Date(thaiTime);
  end.setDate(end.getDate() - 5);

  return {
    today: thaiTime.toISOString().split("T")[0]!,
    startDate: CONFIG.startDate,
    endDate: end.toISOString().split("T")[0]!,
  };
}

// ======================================================
// SQL : STAFF
// ======================================================

function buildStaffSql(startDate: string, endDate: string) {
  return `
    SELECT
      ou.NAME AS doctor,
      CAST(COUNT(*) AS UNSIGNED) AS total_rent
    FROM ipdrent o
    LEFT JOIN opduser ou
      ON ou.loginname = o.rent_user
    WHERE
      o.rent_date BETWEEN '${startDate}' AND '${endDate}'
      AND o.checkin='N'
      AND o.rent_user IN (
        'rachade','สรวิศ','ธนา','ชญานัสถ์','ธีรพล','อรสิรี',
        'รสสุคนธ์','sukanya','aaa','อภิชัย','นนท์','ต้อม',
        'd44918','siriwan','54680','ศศิวิมล','52233','onndar',
        'paron','56783','chonlatee','59885','d48218','fasai',
        'Suthinee','d54544','Wisarut','ฐานุปัติ','onco',
        'สมภพ','อุดม'
      )
    GROUP BY
      o.rent_user,
      ou.NAME
    ORDER BY total_rent DESC;
  `;
}

// ======================================================
// SQL : INTERN
// ======================================================

function buildInternSql(startDate: string, endDate: string) {
  return `
    SELECT
      ou.NAME AS doctor,
      CAST(COUNT(*) AS UNSIGNED) AS total_rent
    FROM ipdrent o
    LEFT JOIN opduser ou
      ON ou.loginname = o.rent_user
    WHERE
      o.rent_date BETWEEN '${startDate}' AND '${endDate}'
      AND o.checkin='N'
      AND o.rent_user IN (
        'Kanokporn_s',
        'chalisa',
        'Sorarath',
        '84170',
        '9568',
        '82505',
        '83371',
        '83382'
      )
    GROUP BY
      o.rent_user,
      ou.NAME
    ORDER BY total_rent DESC;
  `;
}

// ======================================================
// Message Builder
// ======================================================

function createSection(title: string, rows: RentIptRow[]) {
  let text = `${title}\n`;

  if (rows.length === 0) {
    text += "ไม่มีข้อมูล";
  } else {
    text += rows
      .map(
        (item, index) =>
          `${index + 1}. ${item.doctor} ${item.total_rent} ชาร์ท`,
      )
      .join("\n");
  }

  return text;
}

function createMessage(
  intern: RentIptRow[],
  staff: RentIptRow[],
  today: string,
  startDate: string,
  endDate: string,
) {
  return `📊 รายงานชาร์ทค้างสรุป

📅 วันที่ ${formatThaiShort(today)}
📆 ช่วง ${formatThaiShort(startDate)} ถึง ${formatThaiShort(endDate)}

${createSection("👩‍⚕️ Staff", staff)}

${createSection("👨‍⚕️ Intern", intern)}

#RentIPTAlert`;
}

// ======================================================
// Circuit Breaker
// ======================================================

function checkCircuit() {
  if (!isOpen) return true;

  const now = Date.now();

  if (now - lastFailTime > RESET_TIME) {
    isOpen = false;
    failCount = 0;
    return true;
  }

  return false;
}

function recordFailure() {
  failCount++;
  lastFailTime = Date.now();

  if (failCount >= CIRCUIT_LIMIT) {
    isOpen = true;
  }
}

function recordSuccess() {
  failCount = 0;
  isOpen = false;
}

// ======================================================
// Notify Retry
// ======================================================

async function sendNotifyWithRetry(
  message: string,
  retry = 3,
): Promise<boolean> {
  if (!checkCircuit()) {
    console.warn("Circuit breaker is OPEN");
    return false;
  }

  for (let i = 1; i <= retry; i++) {
    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client-key": CONFIG.clientKey,
          "secret-key": CONFIG.secretKey,
        },
        body: JSON.stringify({
          messages: [
            {
              type: "text",
              text: message,
            },
          ],
        }),
      });

      if (response.ok) {
        recordSuccess();
        console.log("Notify Success");
        return true;
      }

      console.warn(`Notify Failed (${i}/${retry}) : ${response.status}`);
    } catch (error) {
      console.warn(`Notify Error (${i}/${retry})`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, i * 500));
  }

  recordFailure();

  return false;
}

// ======================================================
// Background Task
// ======================================================

function runInBackground(task: () => Promise<void>) {
  setTimeout(() => {
    task().catch((err) => console.error("Background Error :", err));
  }, 0);
}

// ======================================================
// Core
// ======================================================

async function sendRentIptAlertMultiQuery() {
  const { today, startDate, endDate } = getDateRange();

  const [staffData, internData] = await Promise.all([
    queryHos<RentIptRow[]>(buildStaffSql(startDate, endDate)),
    queryHos<RentIptRow[]>(buildInternSql(startDate, endDate)),
  ]);

  const message = createMessage(
    staffData,
    internData,
    today,
    startDate,
    endDate,
  );

  runInBackground(async () => {
    await sendNotifyWithRetry(message);
  });

  return {
    intern: internData,
    staff: staffData,
  };
}

// ======================================================
// Route
// ======================================================

export async function GET(request: Request) {
  try {
    const token = request.headers.get("x-cron-token");
    const secret = request.headers.get("x-cron-secret");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "CRON_TOKEN is missing" },
        { status: 500 },
      );
    }

    if (!secret) {
      return NextResponse.json(
        { success: false, error: "CRON_SECRET is missing" },
        { status: 500 },
      );
    }

    if (token !== TOKEN || secret !== SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await sendRentIptAlertMultiQuery();

    return NextResponse.json({
      success: true,
      message: "ส่งแจ้งเตือนสำเร็จ",
      meta: {
        internCount: result.intern.length,
        staffCount: result.staff.length,
        total: result.intern.length + result.staff.length,
        timestamp: new Date().toISOString(),
      },
      data: result,
    });
  } catch (error) {
    console.error("Rent IPT Alert Error :", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Error",
      },
      {
        status: 500,
      },
    );
  }
}
