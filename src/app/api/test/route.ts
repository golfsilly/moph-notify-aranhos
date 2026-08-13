import { ENV } from "@/config/env";
import { queryHos } from "@/lib/hosdb";
import { RentIptRow } from "@/types/rent-ipt.type";
import { NextResponse } from "next/server";

// ======================================================
// Config
// ======================================================
const TOKEN = ENV.cronToken;
const SECRET = ENV.cronSecret;

const CONFIG = {
  startDate: "2026-07-01",
  endpoint: "https://morpromt2f.moph.go.th/api/notify/send",
  clientKey: ENV.lineNotify.test.clientKey,
  secretKey: ENV.lineNotify.test.secretKey,
};

// ======================================================
// Circuit Breaker (in-memory)
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

  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันที่";

  return date
    .toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace("พ.ศ.", "")
    .trim();
}

function getDateRange(): {
  today: string;
  startDate: string;
  endDate: string;
} {
  const thaiTime = getThaiTime();
  const end = new Date(thaiTime);
  end.setDate(end.getDate() - 5);

  return {
    today: thaiTime.toISOString().split("T")[0] as string,
    startDate: CONFIG.startDate,
    endDate: end.toISOString().split("T")[0] as string,
  };
}

// ======================================================
// SQL Builder
// ======================================================
function buildSql(startDate: string, endDate: string) {
  return `
    SELECT
      ou.NAME AS doctor,
      CAST(COUNT(*) AS UNSIGNED) AS total_rent
    FROM ipdrent o
    LEFT JOIN opduser ou ON ou.loginname = o.rent_user
    WHERE
      o.rent_date BETWEEN '${startDate}' AND '${endDate}'
      AND o.checkin = 'N'
    GROUP BY o.rent_user, ou.NAME
    ORDER BY total_rent DESC;
  `;
}

// ======================================================
// Message Builder
// ======================================================
function createMessage(
  data: RentIptRow[],
  today: string,
  startDate: string,
  endDate: string,
) {
  let text = `📊 รายงานชาร์ทค้างสรุป (ทดสอบ)
📅 ประจำวันที่: ${formatThaiShort(today)}
ช่วง: ${formatThaiShort(startDate)} ถึง ${formatThaiShort(endDate)}

`;

  text += data.length
    ? data
        .map((d, i) => `${i + 1}. ${d.doctor} ${d.total_rent} ชาร์ท`)
        .join("\n")
    : "ไม่มีข้อมูล";

  text += "\n\n#RentIPTAlert";
  return text;
}

function createMessage2(
  data: RentIptRow[],
  today: string,
  startDate: string,
  endDate: string,
) {
  const body = data.length
    ? data
        .map((d, i) => `${i + 1}. ${d.doctor} ${d.total_rent} ชาร์ท`)
        .join("\n")
    : "ไม่มีข้อมูล";

  return `
📊 รายงานชาร์ทค้างสรุป (ทดสอบ)

📅 ประจำวันที่ : ${formatThaiShort(today)}
📆 ช่วงวันที่   : ${formatThaiShort(startDate)} - ${formatThaiShort(endDate)}

${body}

#RentIPTAlert
`.trim();
}

// ======================================================
// Circuit Breaker Logic
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
// Retry Notify (3 times)
// ======================================================
async function sendNotifyWithRetry(message: string, retry = 3) {
  if (!checkCircuit()) {
    console.warn("Circuit open - skip notify");
    return false;
  }

  for (let i = 1; i <= retry; i++) {
    try {
      const res = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client-key": CONFIG.clientKey,
          "secret-key": CONFIG.secretKey,
        },
        body: JSON.stringify({
          messages: [{ type: "text", text: message }],
        }),
      });

      if (res.ok) {
        recordSuccess();
        return true;
      }

      console.warn(`Notify attempt ${i} failed:`, res.status);
    } catch (err) {
      console.warn(`Notify attempt ${i} error:`, err);
    }

    await new Promise((r) => setTimeout(r, 500 * i));
  }

  recordFailure();
  return false;
}

// ======================================================
// Background Runner
// ======================================================
function runInBackground(task: () => Promise<void>) {
  setTimeout(() => {
    task().catch((err) => console.error("Background task error:", err));
  }, 0);
}

// ======================================================
// Core Logic
// ======================================================
async function sendRentIptAlert() {
  const { today, startDate, endDate } = getDateRange();

  const sql = buildSql(startDate, endDate);
  const data = await queryHos<RentIptRow[]>(sql);

  const message = createMessage(data, today, startDate, endDate);

  runInBackground(async () => {
    await sendNotifyWithRetry(message);
  });

  return data;
}

// ======================================================
// API Route
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

    const result = await sendRentIptAlert();

    return NextResponse.json({
      success: true,
      message: "ส่งแจ้งเตือนสำเร็จ (background)",
      meta: {
        count: result.length,
        timestamp: new Date().toISOString(),
      },
      data: result,
    });
  } catch (error: unknown) {
    console.error("Rent IPT Alert Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
