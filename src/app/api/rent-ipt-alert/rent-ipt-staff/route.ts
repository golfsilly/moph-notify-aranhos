import { NextResponse } from "next/server";
import { queryHos } from "@/lib/hosdb";

const RENT_USERS = [
  "rachade",
  "สรวิศ",
  "ธนา",
  "ชญานัสถ์",
  "ธีรพล",
  "อรสิรี",
  "รสสุคนธ์",
  "sukanya",
  "aaa",
  "อภิชัย",
  "นนท์",
  "ต้อม",
  "d44918",
  "siriwan",
  "54680",
  "ศศิวิมล",
  "52233",
  "onndar",
  "paron",
  "56783",
  "chonlatee",
  "59885",
  "d48218",
  "fasai",
  "Suthinee",
  "d54544",
  "Wisarut",
  "ฐานุปัติ",
  "onco",
  "สมภพ",
  "อุดม",
];

interface RentSummary {
  doctor: string;
  total_rent: number;
}

const SECRET_TOKEN = process.env.CRON_SECRET_TOKEN;

function getEnv(name: string): string {
  const value = process.env[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

const CONFIG = {
  startDate: "2026-05-01",
  endpoint: "https://morpromt2f.moph.go.th/api/notify/send",
  clientKey: getEnv("LINE_NOTIFY_TEST_CLIENT_KEY"),
  secretKey: getEnv("LINE_NOTIFY_TEST_SECRET_KEY"),
};

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

function buildSql(startDate: string, endDate: string) {
  return `
SELECT
	ou.NAME AS doctor,
	CAST( COUNT(*) AS UNSIGNED ) AS total_rent 
FROM
	ipdrent o
	LEFT JOIN opduser ou ON ou.loginname = o.rent_user 
WHERE
	o.rent_date       BETWEEN '${startDate}'
      AND '${endDate}' 
	AND o.checkin = 'N' 
	AND o.rent_user IN (
		'rachade',
		'สรวิศ',
		'ธนา',
		'ชญานัสถ์',
		'ธีรพล',
		'อรสิรี',
		'รสสุคนธ์',
		'sukanya',
		'aaa',
		'อภิชัย',
		'นนท์',
		'ต้อม',
		'd44918',
		'siriwan',
		'54680',
		'ศศิวิมล',
		'52233',
		'onndar',
		'paron',
		'56783',
		'chonlatee',
		'59885',
		'd48218',
		'fasai',
		'Suthinee',
		'd54544',
		'Wisarut',
		'ฐานุปัติ',
		'onco',
		'สมภพ',
		'อุดม' 
	) 
GROUP BY
	o.rent_user,
	ou.NAME 
ORDER BY
	total_rent DESC;
  `;
}

function createMessage(
  data: RentSummary[],
  today: string,
  startDate: string,
  endDate: string,
) {
  let text = `📊 รายงานชาร์ทค้างสรุป Staff
📅 ประจำวันที่: ${formatThaiShort(today)}
ช่วง: ${formatThaiShort(startDate)} ถึง ${formatThaiShort(endDate)}

`;

  if (data.length > 0) {
    data.forEach((item, index) => {
      text += `${index + 1}. ${item.doctor} ${item.total_rent} ชาร์ท\n`;
    });
  }

  text += "\n#RentIPTAlert";

  return text;
}

async function sendNotify(message: string) {
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

  if (!response.ok) {
    throw new Error(`Notify error ${response.status}`);
  }
}

export async function sendRentIptStaff() {
  const { today, startDate, endDate } = getDateRange();
  const sql = buildSql(startDate, endDate);
  const data = await queryHos<RentSummary[]>(sql);
  const message = createMessage(data, today, startDate, endDate);

  await sendNotify(message);

  return data;
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get("x-cron-token");

    if (!SECRET_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: "CRON_SECRET_TOKEN is missing",
        },
        {
          status: 500,
        },
      );
    }

    if (token !== SECRET_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const result = await sendRentIptStaff();

    return NextResponse.json({
      success: true,

      message: "ส่งแจ้งเตือนสำเร็จ",

      meta: {
        count: result.length,
        timestamp: new Date(),
      },

      data: result,
    });
  } catch (error: any) {
    console.error("Rent IPT Alert Error:", error);
    return NextResponse.json(
      {
        success: false,

        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
